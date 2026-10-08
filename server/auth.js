import {createHmac,timingSafeEqual} from 'node:crypto';
export function verifyTelegram(initData,botToken,now=Date.now()){
 if(typeof initData!=='string'||initData.length>16384)throw Error('Abre el juego de nuevo desde Telegram.');
 const fields=new URLSearchParams(initData),seen=new Set();
 for(const [key] of fields){if(seen.has(key))throw Error('Datos de Telegram inválidos.');seen.add(key);}
 const hash=fields.get('hash');if(!/^[a-f0-9]{64}$/i.test(hash||''))throw Error('Firma de Telegram inválida.');fields.delete('hash');
 const check=[...fields].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>`${k}=${v}`).join('\n');
 const secret=createHmac('sha256','WebAppData').update(botToken).digest();
 const expected=createHmac('sha256',secret).update(check).digest();
 if(!timingSafeEqual(expected,Buffer.from(hash,'hex')))throw Error('Firma de Telegram inválida.');
 const date=Number(fields.get('auth_date')),age=now/1000-date;
 if(!Number.isInteger(date)||age>300||age< -30)throw Error('Sesión inicial caducada. Cierra y vuelve a abrir el juego.');
 let user;try{user=JSON.parse(fields.get('user'));}catch{}
 if(!user||!Number.isSafeInteger(user.id)||user.id<=0||typeof user.first_name!=='string')throw Error('Cuenta de Telegram inválida.');
 return {id:String(user.id),name:user.first_name.slice(0,100)};
}
