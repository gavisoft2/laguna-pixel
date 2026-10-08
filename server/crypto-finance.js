import {randomUUID} from 'node:crypto';
import {Finance,withdrawalQuote} from './finance.js';
import {treasury} from './chain.js';
export class CryptoFinance extends Finance {
 constructor(pool,chain){super(pool);this.chain=chain;}
 async init(){await super.init();const schema=`
 CREATE TABLE IF NOT EXISTS crypto_deposits(id UUID PRIMARY KEY,player_id BIGINT NOT NULL REFERENCES players(id),network TEXT NOT NULL,units NUMERIC(30,0) NOT NULL,view_amount BIGINT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',created_at BIGINT NOT NULL);
 CREATE TABLE IF NOT EXISTS crypto_receipts(hash TEXT PRIMARY KEY,reference UUID UNIQUE NOT NULL,kind TEXT NOT NULL,created_at BIGINT NOT NULL);
 ALTER TABLE finance_withdrawals DROP CONSTRAINT IF EXISTS finance_withdrawals_status_check;
 ALTER TABLE finance_withdrawals ADD CONSTRAINT finance_withdrawals_status_check CHECK(status IN ('pending','rejected','paid'));
 `;for(const sql of schema.split(';').filter(x=>x.trim()))await this.pool.query(sql);}
 async createDeposit(id,requestId,network,amount,now=Date.now()){
  if(!/^[a-f0-9-]{36}$/.test(requestId||''))throw Error('Identificador inválido.');
  const q=withdrawalQuote(network,amount),view=BigInt(q.cashMicros)/1000000n;
  if(view>100000000n||BigInt(q.cashMicros)%1000000n!==0n)throw Error('El importe debe equivaler a VIEW enteros y no superar 100 millones VIEW.');
  return this.transaction(async c=>{await this.account(c,id);await c.query('INSERT INTO crypto_deposits(id,player_id,network,units,view_amount,created_at) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',[requestId,id,network,q.requestedUnits,String(view),now]);const r=await c.query('SELECT * FROM crypto_deposits WHERE id=$1',[requestId]),d=r.rows[0];if(String(d.player_id)!==id||d.network!==network||String(d.units)!==q.requestedUnits)throw Error('Pedido asociado a otros datos.');return {...d,memo:'AquaView:'+d.id,destination:treasury};});
 }
 async verifyDeposit(id,orderId,hash,now=Date.now()){
  const r=await this.pool.query('SELECT * FROM crypto_deposits WHERE id=$1 AND player_id=$2',[orderId,id]),d=r.rows[0];if(!d)throw Error('Pedido no disponible.');if(d.status==='paid')return {credited:false};
  const proof=await this.chain.verify(hash,{...d,destination:treasury,memo:'AquaView:'+d.id});
  return this.transaction(async c=>{await this.account(c,id);const locked=await c.query('SELECT status FROM crypto_deposits WHERE id=$1 FOR UPDATE',[orderId]);if(locked.rows[0].status==='paid')return {credited:false};
   await c.query('INSERT INTO crypto_receipts(hash,reference,kind,created_at) VALUES($1,$2,$3,$4)',[proof.receipt,orderId,'deposit',now]);
   await c.query('UPDATE finance_accounts SET view_balance=view_balance+$2 WHERE player_id=$1',[id,String(d.view_amount)]);
   await c.query("UPDATE crypto_deposits SET status='paid' WHERE id=$1",[orderId]);await this.event(c,id,'crypto:'+proof.receipt,'crypto_deposit',d.view_amount,0,0,now);return {credited:true};});
 }
 async history(id){const deposits=await this.pool.query('SELECT * FROM crypto_deposits WHERE player_id=$1 ORDER BY created_at DESC LIMIT 30',[id]);const withdrawals=await this.pool.query('SELECT * FROM finance_withdrawals WHERE player_id=$1 ORDER BY created_at DESC LIMIT 30',[id]);return {deposits:deposits.rows,withdrawals:withdrawals.rows};}
 async pending(){const r=await this.pool.query("SELECT * FROM finance_withdrawals WHERE status='pending' ORDER BY created_at LIMIT 100");return r.rows;}
 async paidWithdrawal(requestId,hash,now=Date.now()){
  const r=await this.pool.query('SELECT * FROM finance_withdrawals WHERE id=$1',[requestId]),w=r.rows[0];if(!w||w.status!=='pending')throw Error('Retiro no disponible.');
  const proof=await this.chain.verify(hash,{network:w.network,units:String(w.net_units),destination:w.destination,sender:treasury,memo:'AquaView:withdraw:'+w.id,created_at:Number(w.created_at)});
  return this.transaction(async c=>{await this.account(c,String(w.player_id));const r=await c.query('SELECT status FROM finance_withdrawals WHERE id=$1 FOR UPDATE',[requestId]);if(r.rows[0].status!=='pending')throw Error('Retiro ya procesado.');
   await c.query('INSERT INTO crypto_receipts(hash,reference,kind,created_at) VALUES($1,$2,$3,$4)',[proof.receipt,requestId,'withdrawal',now]);await c.query('UPDATE finance_accounts SET held_cash_micros=held_cash_micros-$2 WHERE player_id=$1',[String(w.player_id),String(w.cash_micros)]);await c.query("UPDATE finance_withdrawals SET status='paid' WHERE id=$1",[requestId]);await this.event(c,String(w.player_id),'payout:'+proof.receipt,'withdrawal_paid',0,0,-BigInt(w.cash_micros),now);return {paid:true};});
 }
}
