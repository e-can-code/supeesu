import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {interpolateComfort,comfortState} from '../src/environment/comfortLighting.js';
const cfg=JSON.parse(readFileSync(new URL('../shared/lighting/comfort-policy.json',import.meta.url)));
const minute=s=>Number(s.slice(0,2))*60+Number(s.slice(3,5));
for(const entry of cfg.points){
 test(`Comfort target ${entry.time}`,()=>assert.ok(Math.abs(interpolateComfort(cfg.points,minute(entry.time))-entry.illumination)<1e-9));
}
test('No morning release before 05:30',()=>assert.ok(interpolateComfort(cfg.points,329)<=.10));
test('Morning release starts after 05:30',()=>assert.ok(interpolateComfort(cfg.points,360)>interpolateComfort(cfg.points,330)));
test('Principal interval darkens',()=>assert.ok(interpolateComfort(cfg.points,23*60)<interpolateComfort(cfg.points,21*60+30)));
test('Deep night classification',()=>assert.equal(comfortState(cfg,new Date(2026,10,9,2,0)).deep,true));
test('Midday is not deep night',()=>assert.equal(comfortState(cfg,new Date(2026,10,9,12,0)).deep,false));
