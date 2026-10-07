import {test} from 'node:test';import assert from 'node:assert/strict';import {initial,accrue,cast,collect,claimDaily} from './engine.js';
test('cinco truchas producen 65 diarios y 32.5 en 12 horas',()=>assert.equal(accrue(initial(0),43200000).pending,32.5));
test('nuevos peces no reciben producción anterior',()=>{const {state}=cast(initial(0),1,()=>.96,86400000);assert.equal(state.pending,65);assert.equal(state.fish.at(-1),2);assert.equal(state.fin,5200);});
test('recogida no se duplica',()=>{const s=collect(initial(0),86400000);assert.equal(collect(s,86400000).cash,65);});
test('saldo insuficiente y paquete inválido',()=>{assert.throws(()=>cast(initial(0),11));assert.throws(()=>cast(initial(0),2));});
test('recompensa diaria solo una vez',()=>{const s=claimDaily(initial(0),0);assert.throws(()=>claimDaily(s,0));assert.equal(claimDaily(s,86400000).fin,7100);});
test('reloj atrasado no crea ni descuenta producción',()=>assert.equal(accrue(initial(100),0).pending,0));
