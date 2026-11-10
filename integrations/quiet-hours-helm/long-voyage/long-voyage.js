// The Long Voyage is the authoritative Helm scene. Quiet Hours owns schedule
// views and editor behavior; the bridge shares storage with the Supeesu2 shell.
import { instrumentPath, INSTRUMENTS } from './voyage-instruments.js';
import { todaySchedule,currentAndNext,SCHEDULE_KEY,PLANNING_KEY } from './voyage-schedule.js';
const ui=window.LongVoyageUI;
if(!ui) throw Error('Long Voyage interface bridge not installed');
const parent=document.getElementById('ui');
const nav=document.createElement('nav');nav.id='helmExtra';nav.setAttribute('aria-label','Helm scheduling instruments');
const buttons=[['today','Today'],['map','Star Map'],['month','Month'],['patterns','Constellations'],['rituals','Rituals'],['create','Make Room']];
for(const [view,label] of buttons){const b=document.createElement('button');b.textContent=label;b.dataset.instrument=view;b.addEventListener('click',()=>openInstrument(view));nav.append(b)}
parent.append(nav);
const pulse=document.createElement('div');pulse.id='statusPulse';pulse.setAttribute('aria-hidden','true');parent.append(pulse);
function openInstrument(view){
 if(!INSTRUMENTS.includes(view))return;
 const names={today:'A day aboard',map:'The star map',month:'The month ahead',rituals:'Rituals & modes',patterns:'Constellations',create:'Make room',operations:'Planning instruments'};
 const tag=['map','month'].includes(view)?'THE LONG VIEW':view==='create'?'THE PLANNING CRYSTAL':'THE INSTRUMENTS OF TIME';
 ui.show(names[view],tag,`<iframe class="schedule-instrument" title="${names[view]}" src="${instrumentPath(view)}"></iframe>`);
}
// Preserve the original material and layout, but make the original three
// instruments operate on the recovered functional scheduling system.
document.getElementById('date').onclick=()=>openInstrument('today');
document.getElementById('mapBtn').onclick=()=>openInstrument('map');
document.getElementById('crystalBtn').onclick=()=>openInstrument('create');
document.addEventListener('keydown',event=>{if(event.key==='Escape')ui.close()});
// The slow voyage continues; independent small-scale activity is deliberately
// restrained and reduced-motion settings disable the additional pulse.

function refreshScheduleInstrument(){
 const {active,next}=currentAndNext(todaySchedule(localStorage));
 const info=document.querySelector('.hud .info');
 if(!info)return;
 const title=info.querySelector('strong');
 const details=info.querySelector('.sub');
 const label=info.querySelector('.eyebrow');
 label.textContent=active?'Current activity':'Next activity';
 title.textContent=active?.title||next?.title||'A moment between things';
 const e=active||next;
 details.textContent=e?`${e.start}–${e.end} · ${e.category||'Activity'}`:'Nothing scheduled at present';
}
refreshScheduleInstrument();
// Historical schedule is an optional starter, never silently imported.
const recover=document.createElement('button');recover.id='recoverQuietHours';recover.textContent='Recover historical week';recover.title='Review the older Quiet Hours schedule; existing data will be kept';recover.addEventListener('click',()=>{
 ui.show('The remembered week','OPTIONAL SCHEDULE RECOVERY',`<p>The original Quiet Hours archive contains a previously authored weekly routine. Its entries may be outdated. Importing will add missing historical records without replacing current appointments or notes.</p><p>Review the dates and times afterward. An existing record with the same ID remains unchanged.</p><div class="actions"><button type="button" id="confirmRecover">Add historical activities</button><button type="button" id="cancelRecover">Not now</button></div>`);
 document.getElementById('confirmRecover').onclick=()=>window.parent.postMessage({type:'supeesu:request-historical-import'},location.origin);
 document.getElementById('cancelRecover').onclick=()=>ui.close();
});
parent.append(recover);
function updateRecoverVisibility(){try{recover.hidden=!!(JSON.parse(localStorage.getItem(SCHEDULE_KEY))?.events?.length);}catch{recover.hidden=false}}
updateRecoverVisibility();
window.addEventListener('message',e=>{if(e.origin!==location.origin)return;if(e.data?.type==='supeesu:historical-import-result'){
 if(e.data.success){ui.close();updateRecoverVisibility();refreshScheduleInstrument();}else alert(e.data.message||'Import not completed');
}});
setInterval(refreshScheduleInstrument,30000);
window.addEventListener('storage',event=>{if([SCHEDULE_KEY,PLANNING_KEY].includes(event.key)){refreshScheduleInstrument();updateRecoverVisibility()};});
