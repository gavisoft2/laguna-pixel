import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHmac} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {Store} from './store.js';
import {CryptoFinance} from './crypto-finance.js';
import {Referrals} from './referrals.js';
import {verifyTelegram} from './auth.js';
import {makeServer} from './http.js';
test('referral attribution requires signed Telegram start parameter',()=>{
 const now=Date.now(),bot='TEST',p=new URLSearchParams({user:JSON.stringify({id:123,first_name:'Test'}),auth_date:String(Math.floor(now/1000)),start_param:'ref_456'}),secret=createHmac('sha256','WebAppData').update(bot).digest();p.set('hash',createHmac('sha256',secret).update([...p].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n')).digest('hex'));
 assert.equal(verifyTelegram(p.toString(),bot,now).startParam,'ref_456');p.set('start_param','ref_789');assert.throws(()=>verifyTelegram(p.toString(),bot,now));
});
test('three production commission levels are atomic, unique, isolated from sandbox, and collected into own official wallet',async()=>{
 const now=Date.now(),db=new PGlite();let gate=Promise.resolve();const pool={query:(...a)=>db.query(...a),async connect(){const old=gate;let release;gate=new Promise(r=>release=r);await old;return {query:(...a)=>db.query(...a),release};}};
 const finance=new CryptoFinance(pool,{}),referrals=new Referrals(finance),store=new Store(pool,{finance,referrals,official:true});await store.init();await finance.init();await referrals.init();
 const server=makeServer({store,finance,referrals,botToken:'test',root:process.cwd(),adminId:'4',clock:()=>now});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 async function api(path,token,body){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
 try{
  const sessions=[];for(let i=1;i<=4;i++)sessions.push(await store.login({id:String(i),name:'P'+i,startParam:i>1?'ref_'+(i-1):''},now));
  await store.login({id:'2',name:'P2',startParam:'ref_4'},now);assert.equal(String((await db.query('SELECT referrer_id FROM players WHERE id=2')).rows[0].referrer_id),'1');
  for(const [id,param] of [['5','ref_5'],['6','ref_999'],['7','invalid']]){await store.login({id,name:'P',startParam:param},now);assert.equal((await db.query('SELECT referrer_id FROM players WHERE id=$1',[id])).rows[0].referrer_id,null);}
  const root=await referrals.summary('1');assert.deepEqual(root.levels.map(x=>x.count),[1,1,1]);
  await assert.rejects(()=>referrals.collect('3',now));
  const state=(await db.query('SELECT official_state FROM players WHERE id=4')).rows[0].official_state;state.pending=20000;await db.query('UPDATE players SET official_state=$1 WHERE id=4',[JSON.stringify(state)]);
  const collect={type:'collect',requestId:randomUUID()};await store.act('4',collect,now);await store.act('4',collect,now);
  assert.equal(String((await finance.balances('4')).cash_micros),'20000000000');
  for(const [id,expected] of [['3','1000000000'],['2','600000000'],['1','400000000']]){const summary=await referrals.summary(id);assert.equal(summary.pendingMicros,expected);assert.equal(String((await finance.balances(id)).cash_micros),'0');}
  assert.equal((await db.query('SELECT count(*) FROM referral_rewards')).rows[0].count,3);
  // Sandbox collection cannot reach official referral ledgers.
  await store.read('4',now,true);const sandbox=(await db.query('SELECT admin_test_state FROM players WHERE id=4')).rows[0].admin_test_state;sandbox.pending=999999;await db.query('UPDATE players SET admin_test_state=$1 WHERE id=4',[JSON.stringify(sandbox)]);await store.act('4',{type:'collect',requestId:randomUUID()},now,true);assert.equal((await referrals.summary('3')).pendingMicros,'1000000000');
  const daily={type:'daily',requestId:randomUUID()};await store.act('4',daily,now);assert.equal((await referrals.summary('3')).pendingMicros,'1000000000');
  assert.equal((await api('/api/referrals',null)).status,401);
  // A supplied destination ID is ignored; a session can only collect its own earnings.
  assert.equal((await api('/api/referrals/collect',sessions[1].token,{playerId:'3'})).status,400);
  const results=await Promise.all([api('/api/referrals/collect',sessions[2].token,{}),api('/api/referrals/collect',sessions[2].token,{})]);assert.equal(results.filter(x=>x.status===200).length,1);
  assert.equal(String((await finance.balances('3')).cash_micros),'1000000000');assert.equal((await referrals.summary('3')).pendingMicros,'0');assert.equal((await referrals.summary('3')).totalMicros,'1000000000');assert.equal((await referrals.summary('2')).pendingMicros,'600000000');
 }finally{await new Promise(r=>server.close(r));await db.close();}
});
