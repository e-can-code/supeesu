import test from 'node:test';
import assert from 'node:assert/strict';
import { PondWebAudioSoundscape } from '../src/audio/pondWebAudio.js';
import { initialPersistentSound, setPersistentSound } from '../src/audio/persistencePreference.js';
import { visibilityPolicy } from '../src/app/visibilityPolicy.js';

const memory = (entries=[]) => { const map=new Map(entries);return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),map};};
class FakeAudioContext {
  state='suspended';
  destination={};
  created=[];
  async resume(){this.state='running';}
  async suspend(){this.state='suspended';}
  async close(){this.state='closed';}
  async decodeAudioData(){return {duration:8};}
  createBufferSource(){const a={loop:false,connect(){return this;},start(){this.playing=true;},stop(){this.playing=false;},disconnect(){}};this.created.push(a);return a;}
  createGain(){return {gain:{value:0},connect(){return this;},disconnect(){}};}
}
function makeAudio(){
  const context=new FakeAudioContext();let owns=false;let releases=0;
  const mixer=new PondWebAudioSoundscape({sources:{ambience:'pond.wav',music:'theme.wav',splash:'drop.wav'},
    audioContextFactory:()=>context, fetcher:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(10)}),
    ownership:{acquire:async()=>{owns=true;return true;},release:()=>{owns=false;releases++;},isOwner:()=>owns}});
  return {mixer,context,get releases(){return releases;}};
}
test('background audio is on by default; explicit opt-out survives load',()=>{
  const storage=memory();
  assert.equal(initialPersistentSound(storage),true);
  assert.equal(initialPersistentSound(storage,{laboratory:true}),false);
  setPersistentSound(storage,false);
  assert.equal(initialPersistentSound(storage),false);
  setPersistentSound(storage,true);
  assert.equal(initialPersistentSound(storage),true);
});
test('laboratory mode cannot change stored persistence',()=>{
  const storage=memory();
  assert.equal(setPersistentSound(storage,false,{laboratory:true}),false);
  assert.equal(storage.map.size,0);
});
test('real Web Audio mixer keeps context running while hidden with persistence',async()=>{
  const {mixer,context}=makeAudio();
  assert.equal(await mixer.start(),true);
  const policy=visibilityPolicy({hidden:true,persistentSound:true,audioActive:mixer.active});
  assert.equal(policy.audioAction,'keep');
  assert.equal(context.state,'running');
  assert.deepEqual(mixer.diagnostics.channels,['ambience']);
  await mixer.stop();
});
test('hidden opt-out suspends, return to visible resumes same looping source',async()=>{
  const {mixer,context}=makeAudio();
  await mixer.start();
  const original=context.created[0];
  const hidden=visibilityPolicy({hidden:true,persistentSound:false,audioActive:mixer.active});
  assert.equal(hidden.audioAction,'pause');
  await mixer.pause();
  assert.equal(context.state,'suspended');
  await mixer.resume();
  assert.equal(context.state,'running');
  assert.equal(context.created[0],original);
  await mixer.stop();
});
test('music remains independent of the ambience channel',async()=>{
  const {mixer,context}=makeAudio();
  await mixer.start();
  await mixer.toggleMusic();
  assert.deepEqual(mixer.diagnostics.channels,['ambience','music']);
  await mixer.toggleMusic();
  assert.deepEqual(mixer.diagnostics.channels,['ambience']);
  assert.equal(context.state,'running');
  await mixer.stop();
});
test('blocked context never claims active playback or keeps audio lock',async()=>{
  const {mixer,context}=makeAudio();
  context.resume=async()=>{context.state='suspended';};
  assert.equal(await mixer.start(),false);
  assert.equal(mixer.active,false);
  assert.equal(mixer.diagnostics.ownsLock,false);
});
