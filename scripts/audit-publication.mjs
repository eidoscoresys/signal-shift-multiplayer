import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=process.cwd();
function git(args){const r=spawnSync('git',args,{encoding:'utf8',maxBuffer:64*1024*1024,windowsHide:true});if(r.status!==0)throw Error('Git inspection failed: '+args[0]);return r.stdout;}
const rules=[
 ['github-credential',/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/g],
 ['openai-credential',/\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{35,}\b/g],
 ['aws-access-key',/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
 ['google-api-key',/\bAIza[A-Za-z0-9_-]{30,}\b/g],
 ['private-key-material',/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
 ['jwt-or-session-material',/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\b/g],
 ['credential-bearing-url',/https?:\/\/[^\s/"']+:[^\s/"']+@/g],
 ['credential-assignment',/(?:api[_-]?key|oauth[_-]?token|access[_-]?token|refresh[_-]?token|client[_-]?secret|password)\s*[=:]\s*["'][A-Za-z0-9_./+=-]{16,}["']/gi],
 ['cookie-value',/(?:Cookie|Set-Cookie)\s*:\s*["']?[^\s;"']+=[A-Za-z0-9_%.-]{24,}/gi],
 ['personal-machine-path',/(?:[A-Z]:[\\/](?:Users|Documents and Settings)[\\/][^\s"'<>]+|\/(?:Users|home)\/[^\s"'<>]+)/g],
 ['cloudflare-account-id',/"account_id"\s*:\s*"[a-f0-9]{32}"/g]
];
const findings=[];
function inspect(data,location,scope){const text=data.toString('utf8');for(const [category,pattern] of rules){pattern.lastIndex=0;for(const hit of text.matchAll(pattern)){findings.push({scope,location,category,line:text.slice(0,hit.index).split('\n').length});}}}
const excludedRoots=new Set(['.git','node_modules','.wrangler','dist','test-results','playwright-report','.tools','release','publication','coverage']);
const excludedInventory=[];const sourceFiles=[];let worktreeFiles=0;
async function walk(dir=''){for(const entry of await fs.readdir(path.join(root,dir),{withFileTypes:true})){const rel=path.posix.join(dir,entry.name);if(!dir&&excludedRoots.has(entry.name)){excludedInventory.push({path:rel,reason:'Local cache, dependencies, generated artifacts, private audit or Git internals; excluded from publication'});continue;}if(entry.isSymbolicLink()){excludedInventory.push({path:rel,reason:'Symbolic link requires review'});continue;}if(entry.isDirectory())await walk(rel);else if(entry.isFile()){worktreeFiles++;const data=await fs.readFile(path.join(root,rel));inspect(data,rel,'working-tree');const ignored=spawnSync('git',['check-ignore','--quiet','--',rel],{windowsHide:true}).status===0;if(!ignored)sourceFiles.push({path:rel,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});}}}
await walk();
const objects=git(['cat-file','--batch-all-objects','--batch-check=%(objectname) %(objecttype) %(objectsize)']).trim().split('\n').filter(Boolean).map(line=>{const [oid,type,size]=line.split(' ');return {oid,type,size:Number(size)};});
for(const object of objects.filter(o=>['blob','commit','tag'].includes(o.type))){const data=spawnSync('git',['cat-file',object.type,object.oid],{maxBuffer:64*1024*1024,windowsHide:true});if(data.status!==0)throw Error('Cannot inspect Git object');inspect(data.stdout,object.oid,'git-object');}
const refs=git(['for-each-ref','--format=%(refname) %(objecttype)']).trim().split('\n').filter(Boolean).map(line=>{const at=line.lastIndexOf(' ');return {name:line.slice(0,at),type:line.slice(at+1)};});
const forbidden=/(^|\/)(?:node_modules|\.wrangler|\.tools|\.git|test-results|publication|release|dist|\.auth)(?:\/|$)|(^|\/)\.env(?:\.|$)|(^|\/)\.dev\.vars(?:\.|$)|^docs\/(?:[^/]*-test-results\.json|[^/]*\.png)$|\.(?:har|sqlite|db|pem|key|pfx|p12|zip)$/i;
const candidatePaths=new Set(sourceFiles.map(f=>f.path));
const forbiddenCandidates=sourceFiles.filter(f=>forbidden.test(f.path)).map(f=>f.path);
const historicalProhibitedPaths=[];
for(const ref of refs){
    if(!['tree','commit','tag'].includes(ref.type))continue;
    for(const name of git(['ls-tree','-r','--name-only',ref.name]).split('\n').filter(Boolean))if(forbidden.test(name))historicalProhibitedPaths.push({ref:ref.name,path:name});
}
const stagedPaths=git(['ls-files','--cached','-z']).split('\0').filter(Boolean);
const stagedForbiddenPaths=stagedPaths.filter(name=>forbidden.test(name));
for(const name of stagedPaths){const content=spawnSync('git',['show',':'+name],{maxBuffer:64*1024*1024,windowsHide:true});if(content.status!==0)throw Error('Cannot inspect staged file');inspect(content.stdout,name,'git-index');}
const unstagedTrackedPaths=git(['diff','--name-only']).trim().split('\n').filter(Boolean);
const report={generatedUtc:new Date().toISOString(),headExists:spawnSync('git',['rev-parse','--verify','HEAD'],{windowsHide:true,stdio:'ignore'}).status===0,userCommitCount:Number(git(['rev-list','--all','--count']).trim()),refs,historicalProhibitedPaths,stagedPaths,stagedForbiddenPaths,unstagedTrackedPaths,gitObjects:{total:objects.length,blobs:objects.filter(o=>o.type==='blob').length,commits:objects.filter(o=>o.type==='commit').length,tags:objects.filter(o=>o.type==='tag').length},worktreeFilesInspected:worktreeFiles,excludedInventory,publicationCandidates:sourceFiles,forbiddenCandidates,findings,limitations:['Pattern scan and manual review are complementary; this is not a guarantee that every possible secret is detectable.','Generated dependency/cache/runtime directories were inventoried and excluded, not published or exhaustively interpreted.','All Git blobs and commit metadata, including unreachable objects, were scanned; private checkpoint refs must never be pushed.']};
await fs.mkdir('publication',{recursive:true});await fs.writeFile('publication/audit-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({headExists:report.headExists,userCommitCount:report.userCommitCount,gitObjects:report.gitObjects,worktreeFilesInspected:worktreeFiles,publicationCandidates:sourceFiles.length,forbiddenCandidates,stagedFiles:stagedPaths.length,stagedForbiddenPaths,unstagedTrackedPaths,findingsByScope:Object.fromEntries(['working-tree','git-index','git-object'].map(scope=>[scope,findings.filter(f=>f.scope===scope).length])),candidateSensitiveFindings:findings.filter(f=>f.scope==='working-tree'&&candidatePaths.has(f.location)).length,report:'publication/audit-report.json'},null,2));
if(forbiddenCandidates.length||stagedForbiddenPaths.length||findings.some(f=>f.scope==='git-index'||(f.scope==='working-tree'&&candidatePaths.has(f.location))||(f.scope==='git-object'&&!['cloudflare-account-id','personal-machine-path'].includes(f.category))))process.exitCode=1;
