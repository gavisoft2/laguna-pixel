const profiles=[
 // Height, length, dorsal height, tail spread, palette, distinctive markings.
 [6.5,19,8,8,['#344e42','#91aa7a','#e5eacb'],'trout'],
 [11,15,12,6,['#304e69','#71bdc9','#e7f0d9'],'moon'],
 [8,18,12,10,['#5c355f','#bf87ba','#f2d7d1'],'coral'],
 [9,18,7,7,['#32553f','#91ad77','#e7eac6'],'carp'],
 [9,22,13,12,['#775522','#e8bc57','#fff0bd'],'gold'],
 [5.5,24,5,6,['#494b38','#9a9f74','#e5d3b3'],'arapaima'],
 [12,15,10,8,['#344441','#ac795e','#efad88'],'piranha'],
 [4,23,3,4,['#675a3e','#b4a477','#e6dbb7'],'loach'],
 [9,18,13,7,['#3c5434','#a2b86e','#ecdfba'],'perch'],
 [12,17,6,7,['#4c5050','#a29e86','#e8ad83'],'pacu'],
 [4.5,24,8,7,['#415452','#a9b5a2','#eff0d7'],'sturgeon'],
 [11,18,4,5,['#695d48','#b6a077','#e2d2af'],'flat'],
 [10,15,3,4,['#8c762b','#f1cf5e','#f9e4a0'],'box'],
 [9,18,10,9,['#455d68','#bacad0','#f4ebcc'],'bream'],
 [11,22,9,8,['#414b38','#89967c','#d8d3ac'],'grouper'],
 [8,22,12,11,['#203e58','#7ba7b6','#e3e9dd'],'tuna'],
 [5.5,20,13,11,['#29394c','#8498a7','#e2e5da'],'sword'],
 [6,24,13,12,['#47504d','#98a39e','#e1e4d4'],'tiger'],
 [7,25,14,12,['#344a54','#849ba6','#f0eee0'],'white'],
 [10,25,5,9,['#284a61','#648da4','#c8d9dc'],'whale']
];
export function drawFish(c,id,time=0){
 const p=profiles[id]||profiles[0],h=p[0],len=p[1],dorsal=p[2],tail=p[3],pal=p[4],kind=p[5],head=len-2,rear=-len+2,wave=Math.sin(time*3)*1.2;
 const shape=(points,color)=>{c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
 const stroke=(points,color,width=.6)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();};
 const ellipse=(x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
 c.save();
 ellipse(0,h+6,len,1.6,'#06344626');
 const shark=['tiger','white'].includes(kind);
 c.globalAlpha=.9;
 if(kind==='whale'){shape([[rear,0],[rear-7,-tail+wave],[rear-4,-2],[rear,1],[rear-5,tail+wave],[rear-7,tail-1]],pal[1]);}
 else if(shark){shape([[rear,0],[rear-7,-tail-4+wave],[rear-4,-1],[rear-7,tail/2+wave],[rear-1,3]],pal[0]);}
 else if(['arapaima','loach','grouper','box','flat'].includes(kind)){c.fillStyle=pal[1];c.beginPath();c.moveTo(rear+1,0);c.quadraticCurveTo(rear-10,-tail+wave,rear-7,0);c.quadraticCurveTo(rear-10,tail+wave,rear+1,0);c.fill();}
 else shape([[rear+2,0],[rear-8,-tail+wave],[rear-5,wave],[rear-8,tail+wave]],pal[1]);
 if(kind==='flat'){shape([[rear+2,-3],[-4,-h-4],[10,-h-2],[head,-3]],pal[1]);shape([[rear+2,3],[-4,h+4],[10,h+2],[head,3]],pal[1]);}
 else if(kind==='box'){shape([[-2,-h],[2,-h-dorsal],[6,-h]],pal[1]);}
 else if(kind==='sturgeon'){shape([[-9,-h],[-5,-h-dorsal],[0,-h],[8,-h+1]],pal[1]);}
 else{shape([[-10,-h/2],[-4,-h-dorsal*.65],[1,-h-dorsal*.4],[10,-h/2]],pal[1]);}
 shape([[-2,h/2],[shark?-8:2,h+(shark?10:5)],[11,h/2]],pal[1]);c.globalAlpha=1;
 const gradient=c.createLinearGradient(0,-h,0,h);gradient.addColorStop(0,pal[0]);gradient.addColorStop(.3,pal[1]);gradient.addColorStop(.58,pal[1]);gradient.addColorStop(1,pal[2]);
 c.beginPath();
 if(kind==='box'){c.moveTo(rear,-h*.6);c.quadraticCurveTo(-8,-h-2,head-3,-h);c.quadraticCurveTo(head+2,-h,head+2,0);c.quadraticCurveTo(head+2,h,head-3,h);c.lineTo(rear+3,h*.8);c.quadraticCurveTo(rear-1,0,rear,-h*.6);}
 else{c.moveTo(rear,0);c.bezierCurveTo(rear+4,-h,head-7,-h*1.25,head,-h*.3);c.quadraticCurveTo(head+4,0,head+1,h*.3);c.bezierCurveTo(head-5,h*1.15,rear+7,h,rear,0);}
 c.closePath();c.fillStyle=gradient;c.fill();c.strokeStyle=pal[0];c.lineWidth=.65;c.stroke();
 c.save();c.clip();
 if(!shark&&kind!=='whale'){
 for(let row=0;row<5;row++)for(let j=0;j<10;j++){c.strokeStyle=row<2?'#142e3233':'#fff5ce44';c.lineWidth=.35;c.beginPath();c.arc(rear+4+j*3+(row%2)*1.5,-h+row*h*.45,1.7,-.8,.8);c.stroke();}
 }
 if(['trout','flat','box','grouper'].includes(kind)){for(let j=0;j<24;j++)ellipse(rear+4+(j*7)%(len*1.6),-h*.7+(j*11)%(h*1.5),kind==='box'?1.35:.65,kind==='flat'?1.1:.7,pal[0]+'a0');}
 if(['perch','tiger','loach'].includes(kind)){for(let j=0;j<6;j++){const x=rear+5+j*5;stroke([[x,-h],[x+2,0],[x+1,h*.6]],pal[0]+'99',kind==='loach'?1.2:2.4);}}
 if(kind==='trout')stroke([[rear,1],[0,.5],[head-6,1]],'#cf9c9988',1.2);
 if(kind==='arapaima')for(let j=0;j<10;j++)stroke([[rear+j*1.6,-h],[rear+j*1.6+2,h]],'#bd735d99',.7);
 if(kind==='piranha'||kind==='pacu')ellipse(4,h*.9,16,h*.45,kind==='piranha'?'#df694a99':'#d3886499');
 if(kind==='bream')stroke([[head-5,-h],[head-3,-h/2],[head-1,-h*.1]],'#dbbd5599',2);
 if(kind==='tuna'){stroke([[rear+4,0],[head-5,0]],'#8ec2cb77',.5);}
 if(kind==='whale')for(let j=0;j<5;j++)stroke([[head-8-j*2,4],[head-9-j*2,h]],'#496c7d99',.5);
 c.restore();
 if(kind==='sturgeon'){for(let j=0;j<7;j++)shape([[rear+5+j*4,-h*.8],[rear+6+j*4,-h-2],[rear+8+j*4,-h*.8]],'#d2d9bf');shape([[head-2,-1],[head+7,-2],[head+3,1]],pal[1]);}
 if(kind==='sword'){shape([[head-1,-1],[head+15,-2],[head+13,0],[head,2]],pal[1]);stroke([[head+2,-1],[head+13,-1]],'#d3e2df',.35);}
 const eyeX=head-3,eyeY=-h*.3;
 if(kind==='flat'){ellipse(eyeX-3,-h*.4,1.6,1.6,'#d9c99b');ellipse(eyeX-3,-h*.4,1,1,'#182e29');}
 ellipse(eyeX,eyeY,kind==='whale'?.95:1.6,kind==='whale'?.95:1.6,'#c9c69e');ellipse(eyeX+.2,eyeY,kind==='whale'?.65:1,kind==='whale'?.65:1,'#132831');ellipse(eyeX+.5,eyeY-.35,.3,.3,'#fff9df');
 if(shark){for(let j=0;j<4;j++)stroke([[head-9-j*1.8,-h*.35],[head-9-j*1.8+.5,h*.45]],pal[0],.6);}
 else if(kind!=='whale'){c.strokeStyle=pal[0]+'bb';c.lineWidth=.65;c.beginPath();c.moveTo(head-7,-h*.65);c.quadraticCurveTo(head-11,0,head-7,h*.7);c.stroke();}
 shape([[head-10,1],[head-7,3],[head-13,h+3+wave/2],[head-14,h*.5]],pal[1]);
 stroke([[head,2],[head+2,1]],pal[0],.6);
 if(kind==='carp'||kind==='loach')stroke([[head+1,2],[head+3,5],[head,7]],pal[0],.4);
 if(kind==='piranha'){shape([[head-1,3],[head-4,4],[head-2,5]],'#e8e3bd');}
 if(kind==='tuna')for(let j=0;j<5;j++)shape([[rear+4+j*2,-3],[rear+5+j*2,-6],[rear+6+j*2,-3]],'#d8bf58');
 if(kind==='whale'){c.strokeStyle='#cadfe3aa';c.lineWidth=.5;c.beginPath();c.moveTo(head-3,3);c.quadraticCurveTo(head-10,6,head-13,3);c.stroke();}
 c.globalAlpha=.65;stroke([[rear+4,-h*.3],[-2,-h*.6],[head-7,-h*.35]],'#e9f2dc',.65);c.globalAlpha=1;
 for(let j=0;j<5;j++)stroke([[rear+1,0],[rear-6,-tail+2+j*tail*.4+wave]],pal[2]+'77',.3);
 c.restore();
}
const portraits=new Map();
export function fishPortrait(id){
 if(!portraits.has(id)){const canvas=document.createElement('canvas');canvas.width=210;canvas.height=108;const c=canvas.getContext('2d');c.translate(103,53);c.scale(2.35,2.35);drawFish(c,id);portraits.set(id,canvas.toDataURL('image/png'));}
 return '<img class="fish-portrait" src="'+portraits.get(id)+'" alt="" aria-hidden="true">';
}
