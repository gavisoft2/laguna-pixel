export const groupInvite='https://t.me/+yglx16-VGRhkN2Vh';
export class GroupTask {
 constructor(finance,{token,chatId='',fetcher=fetch}){this.finance=finance;this.token=token;this.chatId=chatId;this.fetcher=fetcher;if(chatId&&!/^-[1-9]\d{0,15}$/.test(chatId))throw Error('AQUA_GROUP_CHAT_ID debe ser el ID numérico negativo del grupo.');}
 async init(){await this.finance.pool.query('CREATE TABLE IF NOT EXISTS group_task_claims(player_id BIGINT PRIMARY KEY REFERENCES players(id),claimed_at BIGINT NOT NULL)');}
 async status(id){const r=await this.finance.pool.query('SELECT player_id FROM group_task_claims WHERE player_id=$1',[id]);return {invite:groupInvite,reward:200,configured:Boolean(this.chatId),claimed:r.rows.length>0};}
 async discover(adminId){
  let data;try{const r=await this.fetcher('https://api.telegram.org/bot'+this.token+'/getUpdates',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({limit:100,timeout:0}),signal:AbortSignal.timeout(10000)});data=await r.json();if(!r.ok||data.ok!==true)throw Error();}catch{throw Error('No se pudieron consultar los grupos. Añade el bot al grupo y escribe /grupo@AquaViewGameBot antes de volver a intentar.');}
  const groups=new Map();for(const update of data.result||[]){for(const message of [update.message,update.my_chat_member]){if(String(message?.from?.id)!==adminId||!['group','supergroup'].includes(message?.chat?.type))continue;const chat=message.chat;groups.set(String(chat.id),{id:String(chat.id),title:chat.title||'Grupo'});}}return [...groups.values()];
 }
 async claim(id,now=Date.now()){
  if((await this.status(id)).claimed)return {credited:false,message:'Ya recibiste los 200 VIEW por unirte al grupo.'};
  if(!this.chatId)throw Error('La verificación del grupo está pendiente de configuración.');
  let data;try{const r=await this.fetcher('https://api.telegram.org/bot'+this.token+'/getChatMember',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:this.chatId,user_id:Number(id)}),signal:AbortSignal.timeout(10000)});data=await r.json();if(!r.ok||data.ok!==true)throw Error();}catch{throw Error('No se pudo comprobar la membresía. El bot debe ser administrador del grupo; intenta más tarde.');}
  const m=data.result;if(String(m?.user?.id)!==id||!(['creator','administrator','member'].includes(m.status)||m.status==='restricted'&&m.is_member===true))throw Error('Únete al grupo de Aqua View y vuelve a verificar. Si solicitaste acceso, espera a que te acepten.');
  return this.finance.transaction(async c=>{await this.finance.account(c,id);const r=await c.query('INSERT INTO group_task_claims(player_id,claimed_at) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING player_id',[id,now]);if(!r.rows.length)return {credited:false,message:'Ya recibiste los 200 VIEW por unirte al grupo.'};await c.query('UPDATE finance_accounts SET view_balance=view_balance+200 WHERE player_id=$1',[id]);await this.finance.event(c,id,'task:aqua-group:'+id,'group_task',200,0,0,now);return {credited:true,message:'¡Membresía verificada! Recibiste 200 VIEW.'};});
 }
}
