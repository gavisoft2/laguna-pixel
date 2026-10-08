import {randomInt} from 'node:crypto';
import {initial,accrue,collect,claimDaily,baitPrice,rollFish,zones} from '../engine.js';
const speeds=[.85,1.15,1.45,1,1.7,1.15,1.45,.85,1.15,1.45,1.7,.85,1.15,1.45,1.7,1.15,1.15,1.45,1.7,1.7];
export function newPlayer(now=Date.now()){return {...initial(now),baits:[0,0,0,0],fishing:null};}
export function advance(input,now=Date.now()){
 const s=accrue(input,now),f=s.fishing;if(!f)return s;
 if(f.phase==='waiting'&&now>=f.biteAt)f.phase=now>f.biteAt+5000?'escaped':'bite';
 if(f.phase==='bite'&&now>f.biteAt+5000)f.phase='escaped';
 if(f.phase==='fight'){
  let remaining=Math.max(0,Math.min((now-f.updatedAt)/1000,31));
  while(remaining>0&&f.phase==='fight'){
   const dt=Math.min(.025,remaining);remaining-=dt;f.time+=dt;
   f.pos=.5+.36*Math.sin(f.time*speeds[f.id]*zones[f.zone].speed)+.04*Math.sin(f.time*2);
   // A lost connection cannot keep the button held indefinitely.
   const held=f.held&&now-remaining*1000<=f.heldUntil;
   f.v=Math.max(-.65,Math.min(.65,f.v+(held?1.6:-1.35)*dt));
   f.green=Math.max(.14,Math.min(.86,f.green+f.v*dt));if(f.green===.14||f.green===.86)f.v=0;
   f.inside=Math.abs(f.pos-f.green)<=.14;
   f.progress=Math.max(0,Math.min(100,f.progress+(f.inside?23:-6)*dt));
   if(f.progress>=100){f.phase='won';s.fish.push(f.id);s.fishCaughtAt.push(now);}
   else if(f.progress<=0||f.time>=30)f.phase='escaped';
  }
  f.updatedAt=now;
 }
 return s;
}
export function applyAction(input,body,now=Date.now(),random=()=>randomInt(1000000)/1000000){
 let s=advance(structuredClone(input),now),message='';const f=s.fishing;
 switch(body.type){
 case 'buy':{if(!Number.isInteger(body.zone))throw Error('Zona inválida.');const cost=baitPrice(body.zone,body.count);if(s.fin<cost)throw Error('VIEW insuficientes.');s.fin-=cost;s.baits[body.zone]+=body.count;message='Cebos comprados.';break;}
 case 'daily':s=claimDaily(s,now);message='Recibiste 300 VIEW.';break;
 case 'collect':s=collect(s,now);message='CASH acumulado recogido.';break;
 case 'start':{
  if(f&&['waiting','bite','fight'].includes(f.phase))throw Error('Ya tienes una pesca en curso.');
  if(!Number.isInteger(body.zone)||!zones[body.zone])throw Error('Zona inválida.');
  if(s.baits[body.zone]<1)throw Error('Sin cebos. Compra cebos en la tienda.');
  s.baits[body.zone]--;s.fishing={round:body.requestId,phase:'waiting',zone:body.zone,id:rollFish(body.zone,random),biteAt:now+1800+Math.floor(random()*2400)};break;
 }
 case 'capture':{
  if(!f||f.round!==body.round||f.phase!=='bite')throw Error('Espera la picada o vuelve a tirar.');
  Object.assign(f,{phase:'fight',green:.22,v:0,held:false,heldUntil:0,progress:35,time:0,pos:.5,updatedAt:now});break;
 }
 case 'hold':{
  if(f&&f.round===body.round&&['won','escaped'].includes(f.phase))break;
  if(!f||f.round!==body.round||f.phase!=='fight'||typeof body.held!=='boolean')throw Error('Combate no disponible.');
  f.held=body.held;f.heldUntil=body.held?now+2000:now;break;
 }
 case 'cancel':if(f&&f.round===body.round&&['waiting','bite','fight'].includes(f.phase))f.phase='escaped';break;
 default:throw Error('Operación no disponible.');
 }
 return {state:s,message};
}
export function publicState(s){const next=structuredClone(s);if(next.fishing){delete next.fishing.biteAt;delete next.fishing.heldUntil;delete next.fishing.updatedAt;if(next.fishing.phase==='waiting')delete next.fishing.id;}return next;}
