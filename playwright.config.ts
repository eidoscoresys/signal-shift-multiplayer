import {defineConfig} from '@playwright/test';
const deployed=process.env.SIGNAL_BASE_URL;
if(deployed&&new URL(deployed).protocol!=='https:')throw Error('Published acceptance requires an HTTPS URL.');
export default defineConfig({
 testDir:'tests/browser',
 outputDir:deployed?'test-results/public':'test-results/local',
 testMatch:deployed?['**/credits.spec.ts','**/finale.spec.ts','**/multiplayer.spec.ts','**/public.spec.ts','**/timer.spec.ts','**/reliability.spec.ts','**/accessibility.spec.ts','**/capacity.spec.ts','**/http.spec.ts','**/security.spec.ts']:undefined,
 testIgnore:deployed?undefined:['**/public.spec.ts'],
 timeout:90000,workers:1,
 use:{baseURL:deployed??'http://127.0.0.1:8788',headless:true,trace:'retain-on-failure'},
 reporter:[['list'],['json',{outputFile:deployed?'docs/public-test-results.json':'docs/local-test-results.json'}]],
 webServer:deployed?undefined:{command:'node node_modules/wrangler/bin/wrangler.js dev --port 8788 --inspector-port 9232 --persist-to .wrangler/acceptance-tests',url:'http://127.0.0.1:8788/api/health',reuseExistingServer:false,timeout:120000}
});
