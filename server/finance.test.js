import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {Finance,withdrawalQuote,validateTonDestination} from './finance.js';
const address='UQAGxytQ9Fk1yo8N7ilb_AL39wsmeTOehefvVCpfDf4oA1Mt';
test('exact withdrawal minimums and 5% commission in TON and USDT units',()=>{
 assert.deepEqual(withdrawalQuote('ton','0.1'),{network:'ton',requestedUnits:'100000000',feeUnits:'5000000',netUnits:'95000000',cashMicros:'1300000000'});
 assert.deepEqual(withdrawalQuote('usdt','1'),{network:'usdt',requestedUnits:'1000000',feeUnits:'50000',netUnits:'950000',cashMicros:'10000000000'});
 for(const [network,amount] of [['ton','0.09'],['usdt','0.99'],['usdt','-1'],['ton','1e3'],['usdt','1.0000001'],['fake','1']])assert.throws(()=>withdrawalQuote(network,amount));
});
test('TON destination checksum, mainnet and network validation',()=>{
 assert.match(validateTonDestination(address),/^0:[a-f0-9]{64}$/);
 assert.throws(()=>validateTonDestination(address.slice(0,-1)+'A'));assert.throws(()=>validateTonDestination('0x'+'0'.repeat(40)));
 assert.throws(()=>validateTonDestination('0QDKbjIcfM6ezt8KjKJJLshZJJSqX7XOA4ff-W72r5gqPleK'));
});
test('payment ledger separates trial money, validates receipts, prevents duplicate credit and reserve/release',async()=>{
 const db=new PGlite();let gate=Promise.resolve();const pool={query:(...args)=>db.query(...args),async connect(){const old=gate;let release;gate=new Promise(r=>release=r);await old;return {query:(...args)=>db.query(...args),release};}};
 try{
  await db.query('CREATE TABLE players(id BIGINT PRIMARY KEY,state JSONB NOT NULL)');await db.query('INSERT INTO players(id,state) VALUES($1,$2)',[123,JSON.stringify({fin:99999999,cash:99999999})]);await db.query('INSERT INTO players(id,state) VALUES($1,$2)',[456,'{}']);
  const f=new Finance(pool);await f.init();assert.equal(String((await f.balances('123')).cash_micros),'0');
  await assert.rejects(()=>f.requestWithdrawal('123',randomUUID(),'ton','0.1',address),/CASH real insuficiente/);
  const order=await f.createOrder('123',{stars:10,view:1000}),payment={orderId:order.id,buyerId:'123',currency:'XTR',stars:10,chargeId:'trusted-test-charge'};
  await assert.rejects(()=>f.recordVerifiedPayment({...payment,buyerId:'456'}));await assert.rejects(()=>f.recordVerifiedPayment({...payment,stars:9}));await assert.rejects(()=>f.recordVerifiedPayment({...payment,currency:'USDT'}));
  const receipts=await Promise.all([f.recordVerifiedPayment(payment),f.recordVerifiedPayment(payment)]);assert.equal(receipts.filter(x=>x.credited).length,1);assert.equal(String((await f.balances('123')).view_balance),'1000');
  // Explicit test fixture: there is no public endpoint to add real CASH.
  await db.query('UPDATE finance_accounts SET cash_micros=$2 WHERE player_id=$1',['123','2000000000']);
  const requestId=randomUUID();await f.requestWithdrawal('123',requestId,'ton','0.1',address);await f.requestWithdrawal('123',requestId,'ton','0.1',address);
  let balance=await f.balances('123');assert.equal(String(balance.cash_micros),'700000000');assert.equal(String(balance.held_cash_micros),'1300000000');
  await assert.rejects(()=>f.requestWithdrawal('456',requestId,'ton','0.1',address));await assert.rejects(()=>f.requestWithdrawal('123',randomUUID(),'ton','0.1',address));
  await f.rejectWithdrawal('123',requestId);assert.equal((await f.rejectWithdrawal('123',requestId)).released,false);balance=await f.balances('123');assert.equal(String(balance.cash_micros),'2000000000');assert.equal(String(balance.held_cash_micros),'0');
 }finally{await db.close();}
});
