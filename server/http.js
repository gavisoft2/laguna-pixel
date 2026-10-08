import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {verifyTelegram} from './auth.js';
const files=new Set(['index.html','style.css','app.js','engine.js','online-client.js','fish-art.js','pond-art.js','payments.js','wallet.js','tasks.js','referrals.js']);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
export function makeServer({store,botToken,root,appUrl,finance=null,groupTask=null,referrals=null,paymentsEnabled=false,adminId='',clock=Date.now}){
 const limits=new Map();const limiter=setInterval(()=>limits.clear(),60000);limiter.unref();
 const server=createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  const json=(code,body)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
  try{
   const url=new URL(req.url,'http://localhost'),path=url.pathname;
   if(path.startsWith('/api/')||path==='/healthz'){
    if(path==='/healthz'){await store.pool.query('SELECT 1');return json(200,{ok:true});}
    const origin=req.headers.origin,expected=appUrl?new URL(appUrl).origin:null;
    if(origin&&expected&&origin!==expected)return json(403,{error:'Origen no permitido.'});
    if(path==='/api/login'){const bucket='login:'+req.socket.remoteAddress,n=(limits.get(bucket)||0)+1;limits.set(bucket,n);if(n>100)return json(429,{error:'Demasiadas solicitudes. Espera un minuto.'});}
    if(path==='/api/config'&&req.method==='GET')return json(200,{online:true,official:store.official,paymentsEnabled:Boolean(paymentsEnabled&&finance&&adminId)});
    let body={};if(req.method==='POST'){
     if(!String(req.headers['content-type']).startsWith('application/json'))return json(415,{error:'Formato no permitido.'});
     let bytes=0,chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>20000)return json(413,{error:'Solicitud demasiado grande.'});chunks.push(chunk);}
     try{body=JSON.parse(Buffer.concat(chunks).toString());}catch{return json(400,{error:'Solicitud inválida.'});}
     if(!body||typeof body!=='object'||Array.isArray(body))return json(400,{error:'Solicitud inválida.'});
    }
    if(path==='/api/login'&&req.method==='POST'){
     let user;try{user=verifyTelegram(body.initData,botToken,clock());}catch(e){return json(401,{error:e.message});}
     return json(200,{...await store.login(user,clock()),admin:user.id===adminId});
    }
    const token=req.headers.authorization?.replace(/^Bearer /,''),id=await store.identify(token,clock());if(!id)return json(401,{error:'Sesión caducada. Cierra y vuelve a abrir el juego.'});
    const count=(limits.get('player:'+id)||0)+1;limits.set('player:'+id,count);if(count>600)return json(429,{error:'Demasiadas solicitudes. Espera un minuto.'});
    if(path.startsWith('/api/referrals')){
     if(!store.official||!referrals)return json(503,{error:'Referidos no disponibles.'});
     try{if(path==='/api/referrals'&&req.method==='GET')return json(200,await referrals.summary(id));if(path==='/api/referrals/collect'&&req.method==='POST')return json(200,await referrals.collect(id,clock()));return json(404,{error:'Operación no disponible.'});}catch(e){if(e.code)throw e;return json(400,{error:e.message});}
    }
    if(path.startsWith('/api/tasks/group')){
     if(!store.official||!groupTask)return json(503,{error:'Tarea no disponible.'});
     try{
      if(path==='/api/tasks/group/discover'&&req.method==='GET'){if(!adminId||id!==adminId)return json(403,{error:'Acceso exclusivo del administrador.'});return json(200,{groups:await groupTask.discover(id)});}
      if(path==='/api/tasks/group'&&req.method==='GET')return json(200,await groupTask.status(id));
      if(path==='/api/tasks/group/claim'&&req.method==='POST'){const key='group:'+id,n=(limits.get(key)||0)+1;limits.set(key,n);if(n>6)return json(429,{error:'Espera un minuto antes de volver a verificar.'});return json(200,await groupTask.claim(id,clock()));}
      return json(404,{error:'Operación no disponible.'});
     }catch(e){if(e.code)throw e;return json(400,{error:e.message});}
    }
    if(path.startsWith('/api/admin/test/')){
     if(!adminId||id!==adminId)return json(403,{error:'Modo de pruebas exclusivo del administrador.'});
     try{
      if(path==='/api/admin/test/state'&&req.method==='GET')return json(200,await store.read(id,clock(),true));
      if(path==='/api/admin/test/action'&&req.method==='POST')return json(200,await store.act(id,body,clock(),true));
      return json(404,{error:'Operación no disponible.'});
     }catch(e){if(e.code)throw e;return json(400,{error:e.message});}
    }
    if(path.startsWith('/api/finance/')){
     if(!store.official||!finance)return json(503,{error:'Billetera oficial no disponible.'});
     try{
      if(path==='/api/finance/wallet'&&req.method==='GET')return json(200,{playerId:id,admin:id===adminId,enabled:Boolean(paymentsEnabled&&adminId),balances:await finance.balances(id),...await finance.history(id)});
      if(id===adminId&&path==='/api/finance/admin'&&req.method==='GET')return json(200,{withdrawals:await finance.pending()});
      if(req.method!=='POST')return json(404,{error:'Operación no disponible.'});
      if(!paymentsEnabled||!adminId)return json(503,{error:'Los pagos están pendientes de activación por el administrador.'});
      const moneyBucket='money:'+id,n=(limits.get(moneyBucket)||0)+1;limits.set(moneyBucket,n);if(n>12)return json(429,{error:'Espera un minuto antes de verificar otra operación.'});
      if(path==='/api/finance/deposit')return json(200,await finance.createDeposit(id,body.requestId,body.network,body.amount,clock()));
      if(path==='/api/finance/verify')return json(200,await finance.verifyDeposit(id,body.orderId,body.hash,clock()));
      if(path==='/api/finance/withdraw')return json(200,await finance.requestWithdrawal(id,body.requestId,body.network,body.amount,body.address,clock()));
      if(path.startsWith('/api/finance/admin/')){
       if(id!==adminId)return json(403,{error:'Acceso exclusivo del administrador.'});
       if(path==='/api/finance/admin/paid')return json(200,await finance.paidWithdrawal(body.requestId,body.hash,clock()));
       if(path==='/api/finance/admin/reject')return json(200,await finance.rejectWithdrawal(String(body.playerId),body.requestId,clock()));
      }
      return json(404,{error:'Operación no disponible.'});
     }catch(e){if(e.code){if(e.code==='23505')return json(400,{error:'Esta transferencia ya fue utilizada.'});if(e.code==='22P02')return json(400,{error:'Identificador inválido.'});throw e;}return json(400,{error:e.message});}
    }
    if(path==='/api/state'&&req.method==='GET')return json(200,await store.read(id,clock()));
    if(path==='/api/logout'&&req.method==='POST'){await store.logout(token);return json(200,{ok:true});}
    if(path==='/api/action'&&req.method==='POST'){
     try{return json(200,await store.act(id,body,clock()));}catch(e){if(e.code)throw e;return json(400,{error:e.message});}
    }
    return json(404,{error:'Operación no disponible.'});
   }
   if(!['GET','HEAD'].includes(req.method))return json(405,{error:'Método no permitido.'});
   const name=path==='/'?'index.html':path.slice(1);
   if(!files.has(name)&&! /^assets\/[a-zA-Z0-9_-]+\.(webp|png|svg)$/.test(name))return json(404,{error:'Archivo no encontrado.'});
   const data=await readFile(resolve(root,name));res.writeHead(200,{'Content-Type':mime[extname(name)]||'application/octet-stream','Cache-Control':name==='index.html'?'no-cache':'public, max-age=300'});res.end(req.method==='HEAD'?undefined:data);
  }catch(e){if(e.code==='ENOENT')return json(404,{error:'Archivo no encontrado.'});console.error('Request failed:',e.code||e.name);json(503,{error:'Servidor temporalmente no disponible. Inténtalo de nuevo.'});}
 });server.on('close',()=>clearInterval(limiter));return server;
}
