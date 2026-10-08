export const species=[{name:'Trucha',rarity:'Común',rate:13,color:'#e5b957'},{name:'Pez luna',rarity:'Raro',rate:30,color:'#5ce0e6'},{name:'Dragón coral',rarity:'Épico',rate:75,color:'#df7aff'}];
export function initial(now=Date.now()){return {version:1,fin:6500,cash:0,fish:[0,0,0,0,0],pending:0,last:now,daily:''};}
export function accrue(s,now=Date.now()){const elapsed=Math.max(0,now-s.last);return {...s,pending:s.pending+s.fish.reduce((n,i)=>n+species[i].rate,0)*elapsed/86400000,last:Math.max(now,s.last)};}
export function cast(s,count,random=Math.random,now=Date.now()){if(![1,5,11].includes(count))throw Error('Paquete inválido');const cost=count===11?13000:count*1300;if(s.fin<cost)throw Error('No tienes FIN suficientes');const next=accrue(s,now);const caught=Array.from({length:count},()=>{const r=random();return r<.8?0:r<.95?1:2});return {state:{...next,fin:s.fin-cost,fish:[...s.fish,...caught]},caught};}
export function collect(s,now=Date.now()){const next=accrue(s,now);return {...next,cash:next.cash+next.pending,pending:0};}
export function claimDaily(s,now=Date.now()){const day=new Date(now).toISOString().slice(0,10);if(s.daily===day)throw Error('Ya recogiste esta recompensa');return {...accrue(s,now),daily:day,fin:s.fin+300};}


// Keep existing species indices stable for saved collections.
species.push({name:'Carpa jade',rarity:'Poco común',rate:20,color:'#91d58b'},{name:'Leviatán dorado',rarity:'Legendario',rate:180,color:'#ffc65c'});
export const zones=[
 {name:'Río',price:1300,weights:[65,12,3,20,0],speed:1,color:'#37bac5'},
 {name:'Lago',price:6500,weights:[40,22,7,30,1],speed:1.12,color:'#438cc6'},
 {name:'Costa',price:13000,weights:[20,35,12,30,3],speed:1.25,color:'#37bcb2'},
 {name:'Océano',price:26000,weights:[0,55,25,15,5],speed:1.4,color:'#286ba9'}
];
export function baitPrice(zone,count){if(!zones[zone]||![1,5,11].includes(count))throw Error('Paquete inválido');return zones[zone].price*(count===11?10:count);}
export function rollFish(zone,random=Math.random){const z=zones[zone];if(!z)throw Error('Zona inválida');const roll=random()*100;let total=0;for(let i=0;i<z.weights.length;i++){total+=z.weights[i];if(roll<total)return i;}return 4;}
