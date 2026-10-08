// Internal accounting foundation. No HTTP endpoint or live payment activation yet.
// Call recordVerifiedPayment only after authenticating a Telegram payment update.
import {randomUUID} from 'node:crypto';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const networks={ton:{decimals:9,minimum:100000000n,cashMicrosPerUnit:13n},usdt:{decimals:6,minimum:1000000n,cashMicrosPerUnit:10000n}};
function units(amount,decimals){
 if(typeof amount!=='string'||!/^\d{1,12}(\.\d+)?$/.test(amount))throw Error('Importe inválido.');
 const [whole,fraction='']=amount.split('.');if(fraction.length>decimals)throw Error('Demasiados decimales.');
 return BigInt(whole)*10n**BigInt(decimals)+BigInt(fraction.padEnd(decimals,'0'));
}
export function withdrawalQuote(network,amount){
 const n=networks[network];if(!n)throw Error('Red no admitida.');const requested=units(amount,n.decimals);
 if(requested<n.minimum)throw Error('Importe inferior al mínimo de retiro.');
 const fee=(requested*5n+99n)/100n;
 return {network,requestedUnits:requested.toString(),feeUnits:fee.toString(),netUnits:(requested-fee).toString(),cashMicros:(requested*n.cashMicrosPerUnit).toString()};
}
export function validateTonDestination(address){
 if(typeof address!=='string'||! /^[A-Za-z0-9_+\/-]{48}$/.test(address))throw Error('Usa una dirección TON de 48 caracteres.');
 const bytes=Buffer.from(address.replaceAll('-','+').replaceAll('_','/'),'base64');
 if(bytes.length!==36||![0x11,0x51].includes(bytes[0])||![0,255].includes(bytes[1]))throw Error('Dirección TON de mainnet inválida.');
 let crc=0;for(const byte of bytes.subarray(0,34)){crc^=byte<<8;for(let bit=0;bit<8;bit++)crc=((crc<<1)^((crc&0x8000)?0x1021:0))&0xffff;}
 if(bytes.readUInt16BE(34)!==crc)throw Error('La dirección TON tiene un error de checksum.');
 return (bytes[1]===255?-1:0)+':'+bytes.subarray(2,34).toString('hex');
}
function playerId(id){if(typeof id!=='string'||! /^[1-9]\d{0,15}$/.test(id))throw Error('Cuenta inválida.');return id;}
function operationId(id){if(typeof id!=='string'||!uuid.test(id))throw Error('Identificador de operación inválido.');return id;}
export class Finance {
 constructor(pool){this.pool=pool;}
 async init(){
  const schema=`
  CREATE TABLE IF NOT EXISTS finance_accounts (
    player_id BIGINT PRIMARY KEY REFERENCES players(id),
    view_balance NUMERIC(30,0) NOT NULL DEFAULT 0 CHECK(view_balance>=0),
    cash_micros NUMERIC(30,0) NOT NULL DEFAULT 0 CHECK(cash_micros>=0),
    held_cash_micros NUMERIC(30,0) NOT NULL DEFAULT 0 CHECK(held_cash_micros>=0));
  CREATE TABLE IF NOT EXISTS finance_orders (
    id UUID PRIMARY KEY, player_id BIGINT NOT NULL REFERENCES players(id),
    stars INTEGER NOT NULL CHECK(stars>0), view_amount BIGINT NOT NULL CHECK(view_amount>0),
    status TEXT NOT NULL CHECK(status IN ('created','paid')), expires_at BIGINT NOT NULL);
  CREATE TABLE IF NOT EXISTS finance_receipts (
    charge_id TEXT PRIMARY KEY, order_id UUID UNIQUE NOT NULL REFERENCES finance_orders(id),
    player_id BIGINT NOT NULL REFERENCES players(id), stars INTEGER NOT NULL, received_at BIGINT NOT NULL);
  CREATE TABLE IF NOT EXISTS finance_withdrawals (
    id UUID PRIMARY KEY, player_id BIGINT NOT NULL REFERENCES players(id), network TEXT NOT NULL,
    requested_units NUMERIC(30,0) NOT NULL, fee_units NUMERIC(30,0) NOT NULL,
    net_units NUMERIC(30,0) NOT NULL, cash_micros NUMERIC(30,0) NOT NULL,
    destination TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('pending','rejected')), created_at BIGINT NOT NULL);
  CREATE TABLE IF NOT EXISTS finance_events (
    id UUID PRIMARY KEY, player_id BIGINT NOT NULL REFERENCES players(id),
    reference TEXT NOT NULL UNIQUE, kind TEXT NOT NULL, view_delta NUMERIC(30,0) NOT NULL,
    cash_delta NUMERIC(30,0) NOT NULL, held_delta NUMERIC(30,0) NOT NULL, created_at BIGINT NOT NULL);
  `;for(const sql of schema.split(';').filter(x=>x.trim()))await this.pool.query(sql);
 }
 async transaction(fn){const c=await this.pool.connect();try{await c.query('BEGIN');const result=await fn(c);await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
 async account(c,id){playerId(id);await c.query('INSERT INTO finance_accounts(player_id) VALUES($1) ON CONFLICT DO NOTHING',[id]);const r=await c.query('SELECT * FROM finance_accounts WHERE player_id=$1 FOR UPDATE',[id]);return r.rows[0];}
 async balances(id){return this.transaction(async c=>this.account(c,id));}
 async event(c,id,reference,kind,view,cash,held,now){await c.query('INSERT INTO finance_events(id,player_id,reference,kind,view_delta,cash_delta,held_delta,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[randomUUID(),id,reference,kind,String(view),String(cash),String(held),now]);}
 async createOrder(id,pack,now=Date.now()){
  playerId(id);if(!Number.isSafeInteger(pack?.stars)||pack.stars<=0||pack.stars>1000000||!Number.isSafeInteger(pack?.view)||pack.view<=0)throw Error('Paquete de Stars inválido.');
  const order=randomUUID();await this.pool.query('INSERT INTO finance_orders(id,player_id,stars,view_amount,status,expires_at) VALUES($1,$2,$3,$4,$5,$6)',[order,id,pack.stars,pack.view,'created',now+900000]);return {id:order,stars:pack.stars,view:pack.view,payload:'aqua-view:'+order};
 }
 async recordVerifiedPayment({orderId,buyerId,currency,stars,chargeId},now=Date.now()){
  operationId(orderId);playerId(buyerId);if(currency!=='XTR'||!Number.isSafeInteger(stars)||stars<=0||typeof chargeId!=='string'||chargeId.length<1||chargeId.length>512)throw Error('Recibo de Telegram inválido.');
  return this.transaction(async c=>{
   // Lock the account first for a consistent lock order across financial operations.
   await this.account(c,buyerId);const r=await c.query('SELECT * FROM finance_orders WHERE id=$1 FOR UPDATE',[orderId]),o=r.rows[0];
   if(!o||String(o.player_id)!==buyerId||o.stars!==stars)throw Error('El pago no coincide con el pedido.');
   const old=await c.query('SELECT order_id FROM finance_receipts WHERE charge_id=$1',[chargeId]);
   if(old.rows[0]){if(old.rows[0].order_id!==orderId)throw Error('Recibo asociado a otro pedido.');return {credited:false};}
   if(o.status!=='created')throw Error('Pedido ya pagado con otro recibo.');
   // Never discard a genuinely received payment just because checkout completed late.
   await c.query('INSERT INTO finance_receipts(charge_id,order_id,player_id,stars,received_at) VALUES($1,$2,$3,$4,$5)',[chargeId,orderId,buyerId,stars,now]);
   await c.query('UPDATE finance_orders SET status=$2 WHERE id=$1',[orderId,'paid']);
   await c.query('UPDATE finance_accounts SET view_balance=view_balance+$2 WHERE player_id=$1',[buyerId,String(o.view_amount)]);
   await this.event(c,buyerId,'payment:'+chargeId,'stars_purchase',o.view_amount,0,0,now);return {credited:true};
  });
 }
 async requestWithdrawal(id,requestId,network,amount,address,now=Date.now()){
  playerId(id);operationId(requestId);const quote=withdrawalQuote(network,amount),destination=validateTonDestination(address);
  return this.transaction(async c=>{
   const account=await this.account(c,id),old=await c.query('SELECT * FROM finance_withdrawals WHERE id=$1',[requestId]);
   if(old.rows[0]){const w=old.rows[0];if(String(w.player_id)!==id||w.network!==network||String(w.requested_units)!==quote.requestedUnits||w.destination!==destination)throw Error('La solicitud ya existe con otros datos.');return w;}
   if(BigInt(account.cash_micros)<BigInt(quote.cashMicros))throw Error('CASH real insuficiente. Los saldos de prueba no son retirables.');
   await c.query('UPDATE finance_accounts SET cash_micros=cash_micros-$2, held_cash_micros=held_cash_micros+$2 WHERE player_id=$1',[id,quote.cashMicros]);
   const r=await c.query('INSERT INTO finance_withdrawals(id,player_id,network,requested_units,fee_units,net_units,cash_micros,destination,status,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',[requestId,id,network,quote.requestedUnits,quote.feeUnits,quote.netUnits,quote.cashMicros,destination,'pending',now]);
   await this.event(c,id,'withdrawal:'+requestId,'withdrawal_requested',0,-BigInt(quote.cashMicros),quote.cashMicros,now);return r.rows[0];
  });
 }
 // Internal operation only; a future authenticated operator endpoint must call it.
 async rejectWithdrawal(id,requestId,now=Date.now()){
  playerId(id);operationId(requestId);return this.transaction(async c=>{
   await this.account(c,id);const r=await c.query('SELECT * FROM finance_withdrawals WHERE id=$1 AND player_id=$2 FOR UPDATE',[requestId,id]),w=r.rows[0];if(!w)throw Error('Solicitud no disponible.');if(w.status==='rejected')return {released:false};
   await c.query('UPDATE finance_accounts SET cash_micros=cash_micros+$2,held_cash_micros=held_cash_micros-$2 WHERE player_id=$1',[id,String(w.cash_micros)]);
   await c.query('UPDATE finance_withdrawals SET status=$2 WHERE id=$1',[requestId,'rejected']);await this.event(c,id,'rejection:'+requestId,'withdrawal_rejected',0,w.cash_micros,-BigInt(w.cash_micros),now);return {released:true};
  });
 }
}
