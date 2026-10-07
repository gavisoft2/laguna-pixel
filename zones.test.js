import {test} from 'node:test';import assert from 'node:assert/strict';import {zones,baitPrice,rollFish,species} from './engine.js';
test('zone weights sum to 100 and prices rise',()=>{zones.forEach((z,i)=>{assert.equal(z.weights.reduce((a,b)=>a+b),100);if(i)assert.ok(z.price>zones[i-1].price);});});
test('11 baits cost 10 for each zone',()=>zones.forEach((z,i)=>{assert.equal(baitPrice(i,11),z.price*10);assert.equal(baitPrice(i,5),z.price*5);}));
test('river never produces legendary, ocean never common',()=>{for(let i=0;i<1000;i++){assert.notEqual(rollFish(0,()=>i/1000),4);assert.notEqual(rollFish(3,()=>i/1000),0);}});
test('saved species indices retain rates',()=>assert.deepEqual(species.slice(0,3).map(s=>s.rate),[13,30,75]));
