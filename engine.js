export const species=[{name:'Trucha común',rarity:'Común',rate:13,color:'#e5b957'},{name:'Pez luna',rarity:'Raro',rate:30,color:'#5ce0e6'},{name:'Dragón coral',rarity:'Épico',rate:75,color:'#df7aff'}];
export function initial(now=Date.now()){return {version:1,fin:6500,cash:0,fish:[0,0,0,0,0],fishCaughtAt:Array(5).fill(now),pending:0,last:now,daily:''};}
export function fishExpiry(caughtAt){const d=new Date(caughtAt),target=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+6,1,d.getUTCHours(),d.getUTCMinutes(),d.getUTCSeconds(),d.getUTCMilliseconds()));const days=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();target.setUTCDate(Math.min(d.getUTCDate(),days));return target.getTime();}
export function accrue(s,now=Date.now()){
 const end=Math.max(now,s.last),fish=[],fishCaughtAt=[];let earned=0;
 s.fish.forEach((id,i)=>{const date=s.fishCaughtAt?.[i],known=Number.isFinite(date)&&date>=0,caughtAt=known?date:end,expires=fishExpiry(caughtAt),start=known?Math.max(s.last,caughtAt):s.last;earned+=species[id].rate*Math.max(0,Math.min(end,expires)-start)/86400000;if(expires>end){fish.push(id);fishCaughtAt.push(caughtAt);}});
 return {...s,fish,fishCaughtAt,pending:s.pending+earned,last:end};
}
export function cast(s,count,random=Math.random,now=Date.now()){if(![1,5,11].includes(count))throw Error('Paquete inválido');const cost=count===11?13000:count*1300;if(s.fin<cost)throw Error('No tienes FIN suficientes');const next=accrue(s,now);const caught=Array.from({length:count},()=>{return rollFish(0,random)});return {state:{...next,fin:s.fin-cost,fish:[...next.fish,...caught],fishCaughtAt:[...next.fishCaughtAt,...caught.map(()=>now)]},caught};}
export function collect(s,now=Date.now()){const next=accrue(s,now);return {...next,cash:next.cash+next.pending,pending:0};}
export function claimDaily(s,now=Date.now()){const day=new Date(now).toISOString().slice(0,10);if(s.daily===day)throw Error('Ya recogiste esta recompensa');return {...accrue(s,now),daily:day,fin:s.fin+300};}


// Keep existing species indices stable for saved collections.
species.push({name:'Carpa jade',rarity:'Poco común',rate:20,color:'#91d58b'},{name:'Leviatán dorado',rarity:'Legendario',rate:180,color:'#ffc65c'});
species.push({name:'Pirarucú',rarity:'Raro',rate:16.25,color:'#a98977'},{name:'Piraña',rarity:'Épico',rate:20,color:'#e77953'});
species.push({name:'Locha',rarity:'Común',rate:65,color:'#a99263'},{name:'Perca',rarity:'Raro',rate:81.25,color:'#91a765'},{name:'Pacú',rarity:'Épico',rate:100,color:'#c58363'},{name:'Esterlete',rarity:'Legendario',rate:260,color:'#9caaa8'});
species.push({name:'Platija',rarity:'Común',rate:130,color:'#b19c77'},{name:'Pez cofre',rarity:'Raro',rate:162.5,color:'#e2c456'},{name:'Dorada',rarity:'Épico',rate:200,color:'#b5c4c8'},{name:'Mero gigante',rarity:'Legendario',rate:520,color:'#817a64'});
species.push({name:'Atún',rarity:'Raro',rate:325,color:'#658ca8'},{name:'Pez espada',rarity:'Raro',rate:325,color:'#777f9c'},{name:'Tiburón tigre',rarity:'Épico',rate:400,color:'#929b9d'},{name:'Tiburón blanco',rarity:'Legendario',rate:1040,color:'#a6b3b5'},{name:'Ballena azul',rarity:'Legendario',rate:1040,color:'#638ca4'});
export const zones=[
 {name:'Río',price:1300,weights:[80,0,0,0,0,15,5,0,0,0,0,0,0,0,0,0,0,0,0,0],speed:1,color:'#37bac5'},
 {name:'Lago',price:6500,weights:[0,0,0,0,0,0,0,60,30,9,1,0,0,0,0,0,0,0,0,0],speed:1.12,color:'#438cc6'},
 {name:'Costa',price:13000,weights:[0,0,0,0,0,0,0,0,0,0,0,30,50,15,5,0,0,0,0,0],speed:1.25,color:'#37bcb2'},
 {name:'Océano',price:26000,weights:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,35,35,22,4,4],speed:1.4,color:'#286ba9'}
];
export function baitPrice(zone,count){if(!zones[zone]||![1,5,11].includes(count))throw Error('Paquete inválido');return zones[zone].price*(count===11?10:count);}
export function rollFish(zone,random=Math.random){const z=zones[zone];if(!z)throw Error('Zona inválida');const roll=random()*100;let total=0;for(let i=0;i<z.weights.length;i++){total+=z.weights[i];if(roll<total)return i;}return 4;}
