import test from 'node:test';
import assert from 'node:assert/strict';
import {installHoverIntent} from '../src/hoverIntent.js';
class MockElement {
 constructor(){this.dataset={panel:'notes'};this.isConnected=true;this.handlers=new Map();}
 addEventListener(name,fn){this.handlers.set(name,fn)}
 removeEventListener(name){this.handlers.delete(name)}
 emit(name,event={pointerType:'mouse'}){this.handlers.get(name)?.(event)}
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
test('hover intent opens after dwell',async()=>{const el=new MockElement();let calls=[];const dispose=installHoverIntent([el],v=>calls.push(v),{delayMs:12});el.emit('pointerenter');await sleep(28);assert.deepEqual(calls,['notes']);dispose()});
test('hover intent cancels when pointer leaves',async()=>{const el=new MockElement();let calls=[];const dispose=installHoverIntent([el],v=>calls.push(v),{delayMs:15});el.emit('pointerenter');el.emit('pointerleave');await sleep(30);assert.deepEqual(calls,[]);dispose()});
test('touch does not trigger hover intent',async()=>{const el=new MockElement();let calls=[];const dispose=installHoverIntent([el],v=>calls.push(v),{delayMs:10});el.emit('pointerenter',{pointerType:'touch'});await sleep(20);assert.deepEqual(calls,[]);dispose()});
