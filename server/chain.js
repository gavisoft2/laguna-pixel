import {validateTonDestination} from './finance.js';
export const treasury='UQAGxytQ9Fk1yo8N7ilb_AL39wsmeTOehefvVCpfDf4oA1Mt';
export const usdtMaster='EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs';
const raw=a=>/^(-1|0):[a-f0-9]{64}$/.test(a||'')?a:validateTonDestination(a);
export function verifyTransfer(event,trace,expected,now=Date.now()){
 if(event.in_progress!==false||event.is_scam||!Number.isSafeInteger(event.timestamp)||event.timestamp*1000>now-30000||event.timestamp*1000<expected.created_at-1000)throw Error('Transferencia pendiente o anterior al pedido. Espera 30 segundos y vuelve a verificar.');
 const transactions=new Map();function visit(t){if(t?.transaction)transactions.set(t.transaction.hash,t.transaction);for(const child of t?.children||[])visit(child);}visit(trace);
 const matches=[];
 for(const action of event.actions||[]){
  const transfer=expected.network==='ton'?action.TonTransfer:action.JettonTransfer;
  if(action.type!==(expected.network==='ton'?'TonTransfer':'JettonTransfer')||action.status!=='ok'||!transfer||transfer.refund)continue;
  if(raw(transfer.recipient?.address)!==raw(expected.destination)||transfer.comment!==expected.memo||String(transfer.amount)!==String(expected.units))continue;
  if(expected.sender&&raw(transfer.sender?.address)!==raw(expected.sender))continue;
  if(expected.network==='usdt'&&(raw(transfer.jetton?.address)!==raw(usdtMaster)||transfer.jetton?.decimals!==6))continue;
  const hashes=action.base_transactions;
  if(!Array.isArray(hashes)||!hashes.length||hashes.some(h=>{const t=transactions.get(h);return !t||t.success!==true||t.aborted!==false||t.in_msg?.bounced===true;}))continue;
  if(expected.network==='ton'&&!hashes.some(h=>{const t=transactions.get(h);return t.account.address===raw(expected.destination)&&String(t.in_msg?.value)===String(expected.units)&&t.in_msg?.decoded_body?.text===expected.memo;}))continue;
  if(expected.network==='usdt'&&![...transactions.values()].some(t=>t.account.address===raw(transfer.recipients_wallet)&&t.success===true&&t.aborted===false&&t.in_msg?.bounced===false&&t.in_msg?.decoded_op_name==='jetton_internal_transfer'&&String(t.in_msg?.decoded_body?.amount)===String(expected.units)))continue;
  matches.push({receipt:hashes[0],event:event.event_id});
 }
 if(matches.length!==1)throw Error('No se encontró un pago confirmado con la moneda, dirección, importe y comentario de este pedido.');
 return matches[0];
}
export class Chain {
 constructor(key='',fetcher=fetch){this.key=key;this.fetcher=fetcher;}
 async get(path){const r=await this.fetcher('https://tonapi.io/v2'+path,{headers:this.key?{Authorization:'Bearer '+this.key}:{},signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('La verificación blockchain no está disponible. Intenta más tarde.');return r.json();}
 async verify(hash,expected){if(typeof hash!=='string'||! /^[a-f0-9]{64}$/i.test(hash))throw Error('Introduce el hash de la transacción: 64 caracteres hexadecimales.');const event=await this.get('/events/'+hash);const trace=await this.get('/traces/'+event.event_id);return verifyTransfer(event,trace,expected);}
}
