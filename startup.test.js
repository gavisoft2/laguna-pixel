import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=(await readFile(new URL('./online-client.js',import.meta.url),'utf8')).replace(/export /g,'');
function runtime(fetch,location={hostname:'gavisoft2.github.io',protocol:'https:',search:''}){const context=vm.createContext({location,fetch,AbortController,URLSearchParams,Date,crypto:globalThis.crypto,setTimeout:(fn,ms)=>{if(ms===1500)queueMicrotask(fn);return 1;},clearTimeout(){}});vm.runInContext(source,context);return context;}
test('static front end waits through cold-start HTML and transient failures without navigation or local trial fallback',async()=>{
 let attempts=0;const urls=[],messages=[];const c=runtime(async(url,options)=>{urls.push(url);assert.equal(options.headers['Content-Type'],undefined);attempts++;if(attempts===1)throw new TypeError('offline');if(attempts===2)return {headers:new Headers({'content-type':'text/html'}),ok:true};return {headers:new Headers({'content-type':'application/json'}),ok:true,json:async()=>({online:true,official:true,paymentsEnabled:true})};});
 assert.equal(await c.detectOnline(m=>messages.push(m)),true);assert.equal(attempts,3);assert.ok(urls.every(url=>url==='https://aqua-view.onrender.com/api/config'));assert.ok(messages.some(m=>m.includes('automáticamente')));
 c.fetch=async(url,options)=>{assert.equal(url,'https://aqua-view.onrender.com/api/login');assert.equal(options.headers['Content-Type'],'application/json');return {headers:new Headers({'content-type':'application/json'}),ok:true,json:async()=>({token:'signed-session'})};};await c.loginOnline('verified-init-data');
});
test('only explicit local demo skips API; Render uses its own backend',async()=>{
 const demo=runtime(()=>{throw Error('No API');},{hostname:'localhost',protocol:'http:',search:'?demo=1'});assert.equal(await demo.detectOnline(),false);
 const server=runtime(async url=>{assert.equal(url,'/api/config');return {headers:new Headers({'content-type':'application/json'}),ok:true,json:async()=>({online:true})};},{hostname:'aqua-view.onrender.com',protocol:'https:',search:''});assert.equal(await server.detectOnline(),true);
});
