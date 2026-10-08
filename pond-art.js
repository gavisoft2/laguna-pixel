import {drawFish} from './fish-art.js?v=species-art-27';
export function drawPond(c,fish,t=0,aspect=1){
 const oval=(x,y,rx,ry,color,angle=0)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,angle,0,Math.PI*2);c.fill();};
 const curve=(points,color,width=1)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(points[0],points[1]);c.bezierCurveTo(...points.slice(2));c.stroke();};
 const water=c.createLinearGradient(0,0,0,220);water.addColorStop(0,'#6dd5d0');water.addColorStop(.28,'#279fb1');water.addColorStop(.7,'#146c92');water.addColorStop(1,'#174b64');c.fillStyle=water;c.fillRect(0,0,240,220);
 const glow=c.createRadialGradient(72,6,3,80,60,140);glow.addColorStop(0,'#e6ffe947');glow.addColorStop(1,'#ddffef00');c.fillStyle=glow;c.fillRect(0,0,240,220);
 for(let i=0;i<5;i++){const sway=Math.sin(t*.18+i)*5;c.fillStyle='#e8ffe30c';c.beginPath();c.moveTo(20+i*49+sway,0);c.lineTo(33+i*49+sway,0);c.lineTo(2+i*49,210);c.lineTo(-23+i*49,210);c.fill();}
 // Distant stone banks, softened by water.
 for(let side=0;side<2;side++)for(let i=0;i<5;i++){const x=side?235+i%2*7:5-i%2*7,y=115+i*15;oval(x,y,21-i,10,'#164b6366',side?.2:-.2);oval(x,y-2,18-i,8,'#50918b55',side?.2:-.2);}
 const sand=c.createLinearGradient(0,169,0,220);sand.addColorStop(0,'#527f7e');sand.addColorStop(.5,'#9eae91');sand.addColorStop(1,'#d4c79c');c.fillStyle=sand;c.beginPath();c.moveTo(0,188);c.bezierCurveTo(42,177,66,194,118,189);c.bezierCurveTo(166,180,207,178,240,186);c.lineTo(240,220);c.lineTo(0,220);c.closePath();c.fill();
 for(let i=0;i<6;i++)curve([0,196+i*4,65,191+i*4,142,204+i*3,240,191+i*5],'#ede2b92b',.6);
 for(let i=0;i<90;i++){const x=i*47%240,y=194+i*13%26;oval(x,y,.3+i%3*.15,.2,i%2?'#e9dfbd66':'#526f7166');}
 // Soft moving caustics across the bottom.
 c.save();c.beginPath();c.rect(0,190,240,30);c.clip();
 for(let i=0;i<10;i++)curve([i*28-16,189,i*28+Math.sin(t*.45+i)*8,203,i*28-11,216,i*28+15,225],'#e4f6d126',.8);c.restore();
 function stone(x,y,rx,ry){
 oval(x+2,y+4,rx+2,ry*.7,'#173f4a44');
 const g=c.createLinearGradient(x,y-ry,x+3,y+ry);g.addColorStop(0,'#b0c2ac');g.addColorStop(.45,'#7f9d95');g.addColorStop(1,'#466779');oval(x,y,rx,ry,g,-.17);
 curve([x-rx*.7,y-ry*.1,x-rx*.3,y-ry*.7,x+rx*.2,y-ry*.6,x+rx*.55,y-ry*.2],'#e2e5c955',.7);
 oval(x-rx*.2,y-ry*.35,rx*.5,ry*.25,'#668d6670');for(let j=0;j<3;j++)oval(x-rx*.5+j*rx*.4,y+ry*.2,1,.4,'#3e677455');
 }
 for(const rock of [[7,182,18,10],[23,191,15,8],[2,203,22,10],[37,202,10,5],[235,176,21,12],[220,188,14,8],[237,199,22,11],[208,203,9,5]])stone(...rock);
 function plant(x,y,height,seed,front=false){
 const wave=Math.sin(t*.65+seed)*3.5,tip=x+wave;const greens=front?['#31856c','#57ac83','#79c29a']:['#287d77','#40998c','#67ae98'];curve([x,y,x-3,y-height*.35,tip+3,y-height*.8,tip,y-height],greens[seed%3],front?1.4:.9);
 for(let j=1;j<5;j++){const ly=y-height*j/5,lx=x+wave*j/5,dir=j%2?1:-1,leaf=4+j*.6;c.fillStyle=greens[(seed+j)%3];c.beginPath();c.moveTo(lx,ly);c.quadraticCurveTo(lx+dir*leaf,ly-6,lx+dir*(leaf+1),ly-8);c.quadraticCurveTo(lx+dir*2,ly-6,lx,ly);c.fill();curve([lx,ly,lx+dir*2,ly-3,lx+dir*3,ly-5,lx+dir*leaf,ly-7],'#b8d79b44',.35);}
 }
 for(let i=0;i<15;i++){const x=i<8?i*5:208+(i-8)*5;plant(x,203+i%3*4,22+i%5*8,i);}
 // Three clusters of rounded aquatic leaves.
 for(const [x,y] of [[47,207],[193,200],[104,217]])for(let j=0;j<4;j++){const a=-1.9+j*.4;c.fillStyle=j%2?'#7fae82':'#4e967e';c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+Math.cos(a)*17,y+Math.sin(a)*20,x+Math.cos(a)*22,y+Math.sin(a)*27);c.quadraticCurveTo(x+Math.cos(a)*8-3,y-15,x,y);c.fill();}
 // Natural shells and a small starfish on the sand.
 for(const [x,y] of [[80,204],[151,209],[181,218]]){oval(x,y,3.3,1.8,'#d9c6aa',-.3);curve([x-2,y,x-1,y-2,x+1,y-2,x+2,y],'#a9958177',.5);}
 c.fillStyle='#c78e73';c.beginPath();for(let j=0;j<10;j++){const a=j*Math.PI/5-.5,s=j%2?1.7:4.5;const x=129+Math.cos(a)*s,y=211+Math.sin(a)*s;j?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.fill();
 // Fish use different paths, depths and speeds; turns narrow the silhouette.
 fish.slice(0,40).forEach((id,i)=>{
 const phase=t*(.065+i%5*.009)+i*2.399,dir=Math.cos(phase),x=120+Math.sin(phase)*(66+i%4*5),y=62+i*31%103+Math.sin(t*.3+i*1.7)*6,depth=.8+(i%4)*.1;
 c.save();c.translate(x,y);c.rotate(Math.sin(t*.4+i)*.035);c.scale((dir<0?-1:1)*(.16+.84*Math.min(1,Math.abs(dir)*2))*depth,aspect*depth);c.globalAlpha=.8+i%3*.1;drawFish(c,id,t+i);c.restore();
 });
 // Foreground vegetation gives the aquarium depth.
 for(let i=0;i<8;i++)plant(i<4?i*6:221+(i-4)*6,224,29+i%3*10,i+20,true);
 for(let i=0;i<16;i++){const x=18+i*43%207+Math.sin(t*.6+i)*2,y=219-(t*(7+i%3*2)+i*17)%206,size=.45+i%3*.35;c.strokeStyle='#d0f7e16b';c.lineWidth=.45;c.beginPath();c.arc(x,y,size,0,Math.PI*2);c.stroke();oval(x-size*.25,y-size*.35,.2,.2,'#e9fff4bb');}
 // Surface ripples and a gentle vignette.
 for(let i=0;i<13;i++){c.strokeStyle='#c7f9e62b';c.lineWidth=.6;c.beginPath();c.ellipse(i*23%240,7+i%4*4,8+i%3*4,1.5,Math.sin(t*.2+i)*.1,0,Math.PI);c.stroke();}
 const shade=c.createLinearGradient(0,0,240,0);shade.addColorStop(0,'#06314b55');shade.addColorStop(.15,'#06314b00');shade.addColorStop(.85,'#06314b00');shade.addColorStop(1,'#06314b55');c.fillStyle=shade;c.fillRect(0,0,240,220);
}
