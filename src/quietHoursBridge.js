// Boundary adapter: the recovered Helm retains its own views and editor.
// Supeesu2 personal records remain authoritative. Do not import sample data implicitly.
export const SCHEDULE_KEY='supeesu2:wf06:quiet-schedule';
export const PLANNING_KEY='supeesu2:wf06:quiet-planning';
const copy=x=>JSON.parse(JSON.stringify(x));
export function toQuietHours(events){
  return {version:3,title:'Supeesu2 shared activities',settings:{startHour:6,endHour:23},events:events.filter(e=>e.repeat==='weekly').map(e=>({id:e.id,title:e.title,days:copy(e.days),start:e.start,end:e.end,category:e.category||'personal',details:copy(e.details||[]),featured:!!e.featured,...(e.kind?{kind:e.kind}:{}),priority:e.priority??3,minimumMinutes:e.minimumMinutes??30,canMove:e.canMove??true,canSplit:e.canSplit??false,canSkip:e.canSkip??true}))};
}
export function fromQuietHours(quiet,previous){
  if(!quiet||!Array.isArray(quiet.events))throw Error('Invalid Quiet Hours schedule');
  const previousById=new Map(previous.map(e=>[e.id,e]));
  const weekly=quiet.events.filter(e=>typeof e.id==='string'&&typeof e.title==='string'&&Array.isArray(e.days)).map(e=>({id:e.id,title:e.title,repeat:'weekly',days:e.days,start:e.start,end:e.end,category:e.category||'personal',details:e.details||[],featured:!!e.featured,priority:e.priority??3,minimumMinutes:e.minimumMinutes??30,canMove:!!e.canMove,canSplit:!!e.canSplit,canSkip:!!e.canSkip,...(e.kind||previousById.get(e.id)?.kind?{kind:e.kind||previousById.get(e.id).kind}:{})}));
  return [...previous.filter(e=>e.repeat==='once'),...weekly];
}
export function fromQuietPlanning(plan,previous){
  if(!plan||!Array.isArray(plan.exceptions))throw Error('Invalid Quiet Hours planning data');
  const once=plan.exceptions.filter(e=>typeof e.id==='string'&&typeof e.title==='string'&&typeof e.date==='string').map(e=>({id:e.id,title:e.title,repeat:'once',date:e.date,start:e.start,end:e.end,category:e.category||'personal',details:e.details||[],priority:e.priority??3,minimumMinutes:e.minimumMinutes??30,canMove:!!e.canMove,canSplit:!!e.canSplit,canSkip:!!e.canSkip,...(e.kind?{kind:e.kind}:{})}));
  return [...previous.filter(e=>e.repeat==='weekly'),...once];
}
export function syncQuietHours(storage,events){
  const next=JSON.stringify(toQuietHours(events));
  if(storage.getItem(SCHEDULE_KEY)!==next)storage.setItem(SCHEDULE_KEY,next);
  let old={exceptions:[],overrides:{}};
  try{old=JSON.parse(storage.getItem(PLANNING_KEY))||old;}catch{}
  const exceptions=events.filter(e=>e.repeat==='once').map(e=>({id:e.id,title:e.title,date:e.date,start:e.start,end:e.end,category:e.category,details:e.details||[],priority:e.priority??3,minimumMinutes:e.minimumMinutes??30,canMove:!!e.canMove,canSplit:!!e.canSplit,canSkip:!!e.canSkip,...(e.kind?{kind:e.kind}:{})}));
  const nextPlan=JSON.stringify({...old,exceptions});
  if(storage.getItem(PLANNING_KEY)!==nextPlan)storage.setItem(PLANNING_KEY,nextPlan);
}
