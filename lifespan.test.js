import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initial,accrue,cast,collect,fishExpiry} from './engine.js';
test('six calendar months, offline expiry and saved fish migration',()=>{

const born=Date.parse('2026-08-31T15:30:00Z'),expires=fishExpiry(born);
assert.equal(new Date(expires).toISOString(),'2027-02-28T15:30:00.000Z');
assert.equal(new Date(fishExpiry(Date.parse('2023-08-31T00:00:00Z'))).toISOString(),'2024-02-29T00:00:00.000Z');
const s={...initial(born),fish:[0],fishCaughtAt:[born],last:expires-86400000,pending:2};
const exact=accrue(s,expires);assert.deepEqual(exact.fish,[]);assert.equal(exact.pending,15);assert.equal(accrue(exact,expires+86400000).pending,15);
assert.equal(accrue(s,expires+100*86400000).pending,15);
assert.equal(accrue(s,expires-43200000).pending,8.5);
const mixed=accrue({...s,fish:[0,5],fishCaughtAt:[born,expires-1000]},expires);assert.deepEqual(mixed.fish,[5]);assert.deepEqual(mixed.fishCaughtAt,[expires-1000]);
const old={...initial(born),last:born,fish:[0,0]};delete old.fishCaughtAt;const migrated=accrue(old,born+86400000);assert.equal(migrated.pending,26);assert.deepEqual(migrated.fishCaughtAt,[born+86400000,born+86400000]);assert.deepEqual(accrue(migrated,born+86400000).fishCaughtAt,migrated.fishCaughtAt);
const castResult=cast(initial(born),1,()=>.9,born+1000).state;assert.equal(castResult.fish.at(-1),5);assert.equal(castResult.fishCaughtAt.at(-1),born+1000);
assert.equal(collect(s,expires).cash,15);
assert.equal(accrue({...initial(born),fish:[0],fishCaughtAt:[born+1000]},born+500).pending,0);

});
