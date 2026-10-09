import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {Store} from './store.js';
import {CryptoFinance} from './crypto-finance.js';
import {makeServer} from './http.js';
import {adminReport} from './admin.js';
import {newPlayer} from './game.js';
test('admin reports deny other accounts, preserve old unknown dates, paginate, and separate confirmed crypto and trial balances',async()=>{
 const db=new PGlite(),now=Date.now();let gate=Promise.resolve();const pool={query:(...a)=>db.query(...a),async connect(){const previous=gate;let release;gate=new Promise(r=>release=r);await previous;return {query:(...a)=>db.query(...a),release};}};
 await db.query('CREATE TABLE players(id BIGINT PRIMARY KEY,name TEXT NOT NULL,state JSONB NOT NULL)');await db.query('INSERT INTO players VALUES(99,$1,$2)',['Old',JSON.stringify(newPlayer(now))]);
 const finance=new CryptoFinance(pool,{async verify(){return {receipt:'f'.repeat(64)};}}),store=new Store(pool,{finance,official:true});await store.init();await finance.init();await store.init();
 const admin=await store.login({id:'1',name:'Admin'},now),other=await store.login({id:'2',name:'<img onerror=alert(1)>'},now);await store.login({id:'2',name:'Player'},now+1000);
 await store.identify(other.token,now+90000);await store.identify(other.token,now+91000);
 const before=(await db.query('SELECT * FROM players WHERE id=2')).rows[0];assert.equal(Number(before.registered_at),now);assert.equal(Number(before.last_login_at),now+1000);assert.equal(Number(before.last_seen_at),now+90000);
 await store.read('1',now,true);await db.query('UPDATE players SET admin_test_state=$1 WHERE id=1',[JSON.stringify({...newPlayer(now),fin:999999,cash:999999,testSetup:2})]);
 const confirmed=await finance.createDeposit('2',randomUUID(),'ton','0.1',now);await finance.verifyDeposit('2',confirmed.id,'f'.repeat(64),now+31000);await finance.createDeposit('2',randomUUID(),'usdt','1',now+1000);
 await db.query('UPDATE finance_accounts SET cash_micros=1300000000 WHERE player_id=2');await finance.requestWithdrawal('2',randomUUID(),'ton','0.1','UQAGxytQ9Fk1yo8N7ilb_AL39wsmeTOehefvVCpfDf4oA1Mt',now+50000);
 const summary=await adminReport(pool,'summary',0,now+100000);assert.equal(Number(summary.players.total),3);assert.equal(summary.deposits.find(x=>x.network==='ton').units,'100000000');assert.equal(summary.deposits.find(x=>x.network==='usdt').status,'pending');assert.equal(summary.withdrawals[0].status,'pending');
 const players=await adminReport(pool,'players');assert.equal(players.rows.find(p=>p.id==='1').view_balance,'0');assert.equal(players.rows.find(p=>p.id==='1').cash_micros,'0');assert.equal(players.rows.find(p=>p.id==='99').registered_at,null);assert.equal(players.rows.find(p=>p.id==='2').confirmed_deposits,1);
 const deposits=await adminReport(pool,'deposits');assert.equal(deposits.rows.find(d=>d.id===confirmed.id).hash,'f'.repeat(64));assert.equal(Number(deposits.rows.find(d=>d.id===confirmed.id).confirmed_at),now+31000);
 const logins=await adminReport(pool,'logins');assert.equal(logins.rows.length,3);assert.equal(JSON.stringify(logins).includes(admin.token),false);
 for(let i=3;i<=28;i++)await store.login({id:String(i),name:'Player'},now);
 assert.equal((await adminReport(pool,'players',0)).rows.length,25);assert.equal((await adminReport(pool,'players',0)).hasMore,true);assert.equal((await adminReport(pool,'players',1)).rows.length,4);
 const server=makeServer({store,finance,botToken:'test',adminId:'1',root:process.cwd(),clock:()=>now+100000});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 async function get(token,query=''){const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/admin/reports'+query,{headers:token?{Authorization:'Bearer '+token}:{}});return {status:r.status,data:await r.json()};}
 try{const base='http://127.0.0.1:'+server.address().port;
 const preflight=await fetch(base+'/api/login',{method:'OPTIONS',headers:{Origin:'https://gavisoft2.github.io','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'Content-Type'}});assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-origin'),'https://gavisoft2.github.io');
 const publicConfig=await fetch(base+'/api/config',{headers:{Origin:'https://gavisoft2.github.io'}});assert.equal(publicConfig.headers.get('access-control-allow-origin'),'https://gavisoft2.github.io');
 const bad=await fetch(base+'/api/login',{method:'OPTIONS',headers:{Origin:'https://untrusted.example'}});assert.equal(bad.status,403);assert.equal(bad.headers.get('access-control-allow-origin'),null);
 assert.equal((await get()).status,401);assert.equal((await get(other.token)).status,403);assert.equal((await get(admin.token)).status,200);assert.equal((await get(admin.token,'?section=players&page=-1')).status,400);assert.equal((await get(admin.token,'?section=sessions')).status,400);const r=await get(admin.token,'?section=players');assert.equal(JSON.stringify(r.data).includes('digest'),false);assert.equal(JSON.stringify(r.data).includes('admin_test_state'),false);}
 finally{await new Promise(r=>server.close(r));await db.close();}
});
