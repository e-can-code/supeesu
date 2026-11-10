// Quiet Hours calendar projection. No writes, clock mutation or day/session assumptions.
export const dateISO = d => [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
export function fromISO(value){ if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error('Invalid civil date');const [y,m,d]=value.split('-').map(Number);const result=new Date(y,m-1,d,12);if(dateISO(result)!==value)throw Error('Invalid civil date');return result; }
export function shiftCivil(date,days){const d=new Date(date.getFullYear(),date.getMonth(),date.getDate(),12);d.setDate(d.getDate()+days);return d;}
export function monthCells(year,month){ // month 0-11, six fixed calendar rows, Monday-first
 const first=new Date(year,month,1,12);const offset=(first.getDay()+6)%7;
 return Array.from({length:42},(_,i)=>shiftCivil(first,i-offset));
}
export function dayEvents(schedule,planning,date){
 const key=dateISO(date),day=date.getDay(),override=planning?.overrides?.[key]||{};
 const recurring=(schedule?.events||[]).filter(e=>Array.isArray(e.days)&&e.days.includes(day));
 const oneOff=(planning?.exceptions||[]).filter(e=>e.date===key);
 return [...recurring,...oneOff].map(e=>({...e,...(override[e.id+'@'+key]||{}),originId:e.id,date:key})).filter(e=>!e.removed).sort((a,b)=>(a.start||'').localeCompare(b.start||''));
}
export function scheduleKinds(events){return {rituals:events.filter(e=>e.kind==='ritual'||e.category==='ritual'),modes:events.filter(e=>e.kind==='mode'),routines:events.filter(e=>e.kind==='routine'||(Array.isArray(e.days)&&!['ritual','mode'].includes(e.kind)&&e.category!=='ritual'))};}
