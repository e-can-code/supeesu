// Read-only summary of the shared Quiet Hours projection. The parent Supeesu2
// store remains authoritative; no duplicate schedule is written here.
export const SCHEDULE_KEY='supeesu2:wf06:quiet-schedule';
export const PLANNING_KEY='supeesu2:wf06:quiet-planning';
export function todaySchedule(storage,now=new Date()){
  let schedule={events:[]},planning={exceptions:[],overrides:{}};
  try{schedule=JSON.parse(storage.getItem(SCHEDULE_KEY))||schedule;}catch{}
  try{planning=JSON.parse(storage.getItem(PLANNING_KEY))||planning;}catch{}
  const date=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
  const events=[...(schedule.events||[]).filter(e=>Array.isArray(e.days)&&e.days.includes(now.getDay())),...(planning.exceptions||[]).filter(e=>e.date===date)];
  const overrides=planning.overrides?.[date]||{};
  return events.map(e=>({...e,...(overrides[e.id+'@'+date]||{})})).filter(e=>!e.removed&&/^\d\d:\d\d$/.test(e.start||'')).sort((a,b)=>a.start.localeCompare(b.start));
}
export function currentAndNext(events,now=new Date()){
  const current=now.toTimeString().slice(0,5);
  return {active:events.find(e=>e.start<=current&&e.end>current)||null,next:events.find(e=>e.start>current)||null};
}
