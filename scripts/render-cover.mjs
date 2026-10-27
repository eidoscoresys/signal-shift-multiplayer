import {chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const browser=await chromium.launch();
try{const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});await page.setContent('<style>html,body{margin:0;background:#070e1b;overflow:hidden}svg{display:block;width:100vw;height:100vh}</style>'+await readFile(new URL('../assets/signal-shift-cover.svg',import.meta.url),'utf8'));await page.screenshot({path:'assets/signal-shift-cover.png',animations:'disabled'});await page.setViewportSize({width:640,height:360});await page.screenshot({path:'assets/signal-shift-thumbnail.png',animations:'disabled'});console.log('Exported competition cover (1600x900) and thumbnail (640x360).');}finally{await browser.close();}
