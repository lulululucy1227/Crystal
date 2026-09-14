import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright-core';

// Own-process lifecycle only: never adopts or stops another Workbench.
export async function withStudioSession({root=process.cwd(),launchBrowser=true,executablePath=process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',timeoutMs=15000,serverArgs=['workbench/server.mjs'],onStart=()=>{}},run){
 const parent=path.join(root,'work/dual-mode');await fs.mkdir(parent,{recursive:true});
 const directory=await fs.mkdtemp(path.join(parent,'final-qa-'));
 const info={directory,stateDir:path.join(directory,'state'),exportDir:path.join(directory,'exports'),port:null,stopped:false};
 let browser,child;
 try{
  child=spawn(process.execPath,serverArgs,{cwd:root,env:{...process.env,WORKBENCH_PORT:'0',WORKBENCH_STATE_DIR:info.stateDir,WORKBENCH_EXPORT_DIR:info.exportDir},stdio:['ignore','pipe','pipe'],windowsHide:true});
  info.pid=child.pid;onStart(info);
  const base=await new Promise((resolve,reject)=>{
   let stdout='',stderr='';const timer=setTimeout(()=>finish(Error('Workbench readiness timeout: '+stderr)),timeoutMs);
   const finish=(error,value)=>{clearTimeout(timer);child.off('error',onError);child.off('exit',onExit);child.stdout.off('data',onData);error?reject(error):resolve(value);};
   const onError=e=>finish(e),onExit=code=>finish(Error(`Workbench exited before readiness (${code}): ${stderr}`));
   const onData=chunk=>{stdout+=chunk;const match=stdout.match(/Crystal Workbench (http:\/\/127\.0\.0\.1:(\d+))/);if(match){info.port=Number(match[2]);finish(null,match[1]);}};
   child.stderr.on('data',chunk=>stderr+=chunk);child.stdout.on('data',onData);child.once('error',onError);child.once('exit',onExit);
  });
  const response=await fetch(base+'/api/local-assets',{signal:AbortSignal.timeout(timeoutMs)});if(!response.ok)throw Error('Workbench readiness HTTP '+response.status);
  if(launchBrowser)browser=await chromium.launch({executablePath,headless:true,timeout:timeoutMs});
  return await run({base,browser,info});
 }finally{
  try{await browser?.close();}finally{
   if(child&&child.exitCode===null&&child.signalCode===null){
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('QA child did not exit after termination')),5000);child.once('exit',()=>{clearTimeout(timer);resolve();});child.kill();});
   }
   info.stopped=!child||child.exitCode!==null||child.signalCode!==null;
  }
 }
}
