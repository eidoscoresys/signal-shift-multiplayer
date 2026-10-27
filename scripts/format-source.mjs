import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
const printer=ts.createPrinter({newLine:ts.NewLineKind.LineFeed});
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const name=path.join(dir,entry.name);if(entry.isDirectory())walk(name);else if(/\.tsx?$/.test(name)){const source=ts.createSourceFile(name,fs.readFileSync(name,'utf8'),ts.ScriptTarget.Latest,true);fs.writeFileSync(name,printer.printFile(source));}}}
for(const dir of ['src','server','shared','tests'])walk(dir);
for(const file of ['package.json','tsconfig.json'])fs.writeFileSync(file,JSON.stringify(JSON.parse(fs.readFileSync(file,'utf8')),null,2)+'\n');
