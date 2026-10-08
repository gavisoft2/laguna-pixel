import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHmac} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {Chain,verifyTransfer,treasury,usdtMaster} from './chain.js';
import {validateTonDestination} from './finance.js';
import {CryptoFinance} from './crypto-finance.js';
import {Store} from './store.js';
import {makeServer} from './http.js';
const now=Date.now(),raw=validateTonDestination(treasury),master=validateTonDestination(usdtMaster),hash='a'.repeat(64),jettonWallet='0:'+'b'.repeat(64);
function fixture(network='ton'){const expected={network,destination:treasury,memo:'AquaView:test',units:network==='ton'?'100000000':'1000000',created_at:now-60000};const transfer={sender:{address:'0:'+'c'.repeat(64)},recipient:{address:raw},amount:expected.units,comment:expected.memo,...(network==='usdt'?{recipients_wallet:jettonWallet,jetton:{address:master,decimals:6}}:{})};const event={event_id:hash,in_progress:false,is_scam:false,timestamp:Math.floor((now-40000)/1000),actions:[{type:network==='ton'?'TonTransfer':'JettonTransfer',status:'ok',[network==='ton'?'TonTransfer':'JettonTransfer']:transfer,base_transactions:[hash]}]};const trace={transaction:{hash,account:{address:network==='ton'?raw:jettonWallet},success:true,aborted:false,in_msg:{bounced:false,value:expected.units,decoded_op_name:'jetton_internal_transfer',decoded_body:{text:expected.memo,amount:expected.units}}}};return {event,trace,expected};}
test('blockchain verification rejects wrong memo, asset, receiver, amount, failed or pending settlement',()=>{
 for(const network of ['ton','usdt']){const f=fixture(network);assert.equal(verifyTransfer(f.event,f.trace,f.expected,now).receipt,hash);
  const mutations=[x=>x.event.in_progress=true,x=>x.event.timestamp=Math.floor(now/1000),x=>x.event.timestamp=0,x=>x.trace.transaction.aborted=true,x=>x.trace.transaction.success=false,x=>x.trace.transaction.in_msg.bounced=true,x=>x.event.actions[0].status='failed'];
  const key=network==='ton'?'TonTransfer':'JettonTransfer';mutations.push(x=>x.event.actions[0][key].comment='other',x=>x.event.actions[0][key].amount='1',x=>x.event.actions[0][key].recipient.address='0:'+'d'.repeat(64));if(network==='usdt')mutations.push(x=>x.event.actions[0][key].jetton.address='0:'+'d'.repeat(64),x=>x.trace.transaction.account.address=raw,x=>x.trace.transaction.in_msg.decoded_body.amount='99');
  for(const mutate of mutations){const x=structuredClone(f);mutate(x);assert.throws(()=>verifyTransfer(x.event,x.trace,x.expected,now));}
 }
});
test('official economy starts at zero, preserves trial, credits once, ledger tracks purchases/production and payout receipt',async()=>{
 const db=new PGlite();let gate=Promise.resolve();const pool={query:(...a)=>db.query(...a),async connect(){const previous=gate;let release;gate=new Promise(r=>release=r);await previous;return {query:(...a)=>db.query(...a),release};}};
 let rejectProof=false,receipt=hash;const chain={async verify(h,expected){if(rejectProof)throw Error('Unconfirmed');return {receipt};}};
 const finance=new CryptoFinance(pool,chain),store=new Store(pool,{finance,official:true});await store.init();await finance.init();
 const server=makeServer({store,finance,adminId:'123',paymentsEnabled:true,botToken:'test',root:process.cwd(),clock:()=>now});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 async function api(path,body,token){const r=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
 try{
  const alice=await store.login({id:'123',name:'Alice'},now),bob=await store.login({id:'456',name:'Bob'},now);assert.equal(alice.state.fin,0);assert.equal(alice.state.cash,0);assert.deepEqual(alice.state.fish,[]);assert.equal((await db.query('SELECT state FROM players WHERE id=123')).rows[0].state.fin,6500);
  await assert.rejects(()=>store.act('123',{type:'buy',zone:0,count:1,requestId:randomUUID()},now));
  const order=await finance.createDeposit('123',randomUUID(),'ton','0.1',now);assert.equal(String(order.view_amount),'1300');await assert.rejects(()=>finance.verifyDeposit('456',order.id,hash));rejectProof=true;await assert.rejects(()=>finance.verifyDeposit('123',order.id,hash));assert.equal(String((await finance.balances('123')).view_balance),'0');rejectProof=false;
  const results=await Promise.all([finance.verifyDeposit('123',order.id,hash),finance.verifyDeposit('123',order.id,hash)]);assert.equal(results.filter(x=>x.credited).length,1);assert.equal((await store.read('123',now)).state.fin,1300);
  const duplicate=await finance.createDeposit('123',randomUUID(),'ton','0.1',now);await assert.rejects(()=>finance.verifyDeposit('123',duplicate.id,hash));
  const buy={type:'buy',zone:0,count:1,requestId:randomUUID()};await store.act('123',buy,now);await store.act('123',buy,now);assert.equal(String((await finance.balances('123')).view_balance),'0');assert.equal((await store.read('123',now)).state.baits[0],1);
  // Fixture represents a server-won fish, not client-supplied balances.
  const state=(await db.query('SELECT official_state FROM players WHERE id=123')).rows[0].official_state;state.fish=[0];state.fishCaughtAt=[now];await db.query('UPDATE players SET official_state=$1 WHERE id=123',[JSON.stringify(state)]);
  const collect={type:'collect',requestId:randomUUID()};await store.act('123',collect,now+86400000);await store.act('123',collect,now+86400000);assert.equal(String((await finance.balances('123')).cash_micros),'13000000');
  await db.query('UPDATE finance_accounts SET cash_micros=$1 WHERE player_id=123',['1300000000']);const wid=randomUUID();await finance.requestWithdrawal('123',wid,'ton','0.1',treasury,now);assert.equal(String((await finance.balances('123')).held_cash_micros),'1300000000');
  assert.equal((await api('finance/admin/paid',{requestId:wid,hash},bob.token)).status,403);rejectProof=true;await assert.rejects(()=>finance.paidWithdrawal(wid,hash));assert.equal((await finance.pending()).length,1);rejectProof=false;receipt='e'.repeat(64);await finance.paidWithdrawal(wid,receipt);assert.equal(String((await finance.balances('123')).held_cash_micros),'0');await assert.rejects(()=>finance.rejectWithdrawal('123',wid));await assert.rejects(()=>finance.paidWithdrawal(wid,receipt));
  assert.equal((await api('finance/admin',null,bob.token)).status,404);assert.equal((await api('finance/admin',null,alice.token)).status,200);
  // Test mode is checked on the server, not just hidden in the UI.
  assert.equal((await api('admin/test/state',null,bob.token)).status,403);
  const topup={type:'topup',requestId:randomUUID()};
  assert.equal((await api('admin/test/action',topup,bob.token)).status,403);
  assert.equal((await api('action',{...topup,testMode:true},alice.token)).status,400);
  const sandbox=(await api('admin/test/state',null,alice.token));assert.equal(sandbox.status,200);assert.equal(sandbox.data.state.fin,1000000);
  await api('admin/test/action',topup,alice.token);await api('admin/test/action',topup,alice.token);
  assert.equal((await api('admin/test/state',null,alice.token)).data.state.fin,2000000);
  const testBuy={type:'buy',zone:3,count:11,requestId:randomUUID()};await api('admin/test/action',testBuy,alice.token);
  assert.equal((await api('admin/test/state',null,alice.token)).data.state.baits[3],11);
  assert.equal((await api('state',null,alice.token)).data.state.baits[3],0);
  const sandboxState=(await db.query('SELECT admin_test_state FROM players WHERE id=123')).rows[0].admin_test_state;sandboxState.cash=99999999;sandboxState.pending=100000;await db.query('UPDATE players SET admin_test_state=$1 WHERE id=123',[JSON.stringify(sandboxState)]);
  await api('admin/test/action',{type:'collect',requestId:randomUUID()},alice.token);
  assert.equal(String((await finance.balances('123')).cash_micros),'0');assert.equal(String((await finance.balances('123')).view_balance),'0');
  assert.equal((await api('finance/withdraw',{requestId:randomUUID(),network:'ton',amount:'0.1',address:treasury},alice.token)).status,400);
 }finally{await new Promise(r=>server.close(r));await db.close();}
});
