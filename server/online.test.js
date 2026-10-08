import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,randomUUID} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PGlite} from '@electric-sql/pglite';
import {verifyTelegram} from './auth.js';
import {newPlayer,advance,applyAction} from './game.js';
import {Store} from './store.js';
import {makeServer} from './http.js';
const now=Date.UTC(2026,9,8),bot='123456:TEST_ONLY';
function signed(id=123,time=now){const p=new URLSearchParams({user:JSON.stringify({id,first_name:'Pescador'}),auth_date:String(Math.floor(time/1000)),query_id:'test',signature:'test-signature'});const secret=createHmac('sha256','WebAppData').update(bot).digest();p.set('hash',createHmac('sha256',secret).update([...p].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n')).digest('hex'));return p.toString();}
test('Telegram rejects forged, expired, future and duplicate data',()=>{
 assert.equal(verifyTelegram(signed(),bot,now).id,'123');
 for(const data of [signed().replace('Pescador','Falso'),signed(123,now-301000),signed(123,now+31000),signed()+'&user=bad'])assert.throws(()=>verifyTelegram(data,bot,now));
 assert.throws(()=>verifyTelegram(signed(),bot+'wrong',now));
});
test('server consumes one bait, controls bite timing, rejects invented captures',()=>{
 let s=newPlayer(now);s.baits[0]=1;
 const start={type:'start',zone:0,requestId:randomUUID()};s=applyAction(s,start,now,()=>0).state;
 assert.equal(s.baits[0],0);assert.throws(()=>applyAction(s,start,now));
 assert.throws(()=>applyAction(s,{type:'capture',round:s.fishing.round},now+1000));
 s=applyAction(s,{type:'capture',round:s.fishing.round},now+1800).state;assert.equal(s.fishing.phase,'fight');
 assert.throws(()=>applyAction(s,{type:'win',fish:19,fin:999999},now+1800));
 assert.throws(()=>applyAction(s,{type:'hold',round:'wrong',held:true},now+1800));
 const missed=newPlayer(now);missed.baits[0]=1;const waiting=applyAction(missed,start,now,()=>0).state;assert.equal(advance(waiting,now+8000).fishing.phase,'escaped');assert.equal(waiting.fish.length,5);
});
test('held control can win and repeated advance never duplicates a fish',()=>{
 let s=newPlayer(now);s.baits[0]=1;s=applyAction(s,{type:'start',zone:0,requestId:randomUUID()},now,()=>0).state;
 s=applyAction(s,{type:'capture',round:s.fishing.round},now+1800).state;
 // A tracking player anticipates inertia; all input uses server time.
 for(let ms=25;ms<=30000&&s.fishing.phase==='fight';ms+=25){const f=s.fishing,t=f.time+.3,target=.5+.36*Math.sin(t*.85)+.04*Math.sin(t*2);s=applyAction(s,{type:'hold',round:f.round,held:f.green+f.v*.3<target},now+1800+ms).state;}
 assert.equal(s.fishing.phase,'won');assert.equal(s.fish.length,6);assert.equal(advance(s,now+100000).fish.length,6);
});
function poolFor(db){let gate=Promise.resolve();return {query:(...a)=>db.query(...a),async connect(){const previous=gate;let release;gate=new Promise(r=>{release=r;});await previous;return {query:(...a)=>db.query(...a),release};}};}
test('HTTP + PostgreSQL: authenticated accounts, duplicate retries, concurrent daily, restart durability',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'aqua-db-'));let db=new PGlite(dir),store=new Store(poolFor(db));await store.init();
 const server=makeServer({store,botToken:bot,root:process.cwd(),appUrl:'https://test.example',clock:()=>now});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 async function api(path,body,token){const response=await fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,data:await response.json()};}
 try{
  assert.equal((await api('/api/state')).status,401);assert.equal((await api('/api/login',{initData:'forged'})).status,401);
  const alice=(await api('/api/login',{initData:signed(123)})).data,bob=(await api('/api/login',{initData:signed(456)})).data;
  const buy={type:'buy',zone:0,count:1,requestId:randomUUID(),fin:9999999};
  assert.equal((await api('/api/action',buy,alice.token)).status,200);assert.equal((await api('/api/action',buy,alice.token)).data.state.fin,5200);
  assert.equal((await api('/api/state',null,bob.token)).data.state.fin,6500);
  const daily=await Promise.all([1,2].map(()=>api('/api/action',{type:'daily',requestId:randomUUID()},alice.token)));
  assert.deepEqual(daily.map(x=>x.status).sort(),[200,400]);assert.equal((await api('/api/state',null,alice.token)).data.state.fin,5500);
  const headers={Origin:'https://evil.example','Content-Type':'application/json'};assert.equal((await fetch(base+'/api/login',{method:'POST',headers,body:JSON.stringify({initData:signed()})})).status,403);
  assert.equal((await fetch(base+'/server/auth.js')).status,404);assert.equal((await fetch(base+'/.env')).status,404);
  await new Promise(r=>server.close(r));await db.close();db=new PGlite(dir);store=new Store(poolFor(db));await store.init();
  const saved=await store.read('123',now+86400000);assert.equal(saved.state.fin,5500);assert.equal(saved.state.pending,65);assert.equal(saved.state.baits[0],1);
  assert.equal((await store.read('456',now+86400000)).state.fin,6500);
 }finally{if(server.listening)await new Promise(r=>server.close(r));await db.close();await rm(dir,{recursive:true,force:true});}
});
