export const byId=(world,id)=>world.locations.find(x=>x.id===id);
export const isPlace=(world,place)=>Boolean(byId(world,place?.locationId)?.views.includes(place?.viewpointId));
export const initialPlace=world=>({...world.arrival});
export function travel(world,current,destination){
 const target=byId(world,destination);if(!target)throw Error('Unknown destination');
 if(current.locationId!==target.id&&!byId(world,current.locationId)?.connections.includes(target.id))throw Error('Unconnected destination');
 return {locationId:target.id,viewpointId:target.views[0]};
}
export function look(world,current,view){if(!byId(world,current.locationId)?.views.includes(view))throw Error('Unknown viewpoint');return {...current,viewpointId:view};}
export function sessionDay(date){const d=new Date(date);if(d.getHours()<5||(d.getHours()===5&&d.getMinutes()<30))d.setDate(d.getDate()-1);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
export function dateKey(date){return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');}
export const validTime=t=>/^([01]\d|2[0-3]):[0-5]\d$/.test(t);
export function validateEvent(e){return !!(e&&typeof e.id==='string'&&e.id.length>0&&typeof e.title==='string'&&e.title.trim()&&validTime(e.start)&&validTime(e.end)&&e.end>e.start&&(['once','weekly'].includes(e.repeat))&&(e.repeat==='once'?/^\d{4}-\d{2}-\d{2}$/.test(e.date):Array.isArray(e.days)&&e.days.length>0&&e.days.every(d=>Number.isInteger(d)&&d>=0&&d<=6)));}
export function eventsOn(events,date){const day=date.getDay(),key=dateKey(date);return events.filter(e=>e.repeat==='once'?e.date===key:e.days.includes(day)).sort((a,b)=>a.start.localeCompare(b.start));}
export function nextEvents(events,now,count=3){const found=[];for(let d=0;d<15;d++){const date=new Date(now.getFullYear(),now.getMonth(),now.getDate()+d);for(const event of eventsOn(events,date)){const [h,m]=event.start.split(':').map(Number);const at=new Date(date.getFullYear(),date.getMonth(),date.getDate(),h,m);if(at>now)found.push({...event,at});}}return found.sort((a,b)=>a.at-b.at).slice(0,count);}
export function adaptQuietHours(seed){return (seed.events||[]).map(e=>({...e,repeat:'weekly',days:e.days||[],details:e.details||[]}));}
export function validateSnapshot(x){return !!(x&&x.schemaVersion===1&&Array.isArray(x.notes)&&Array.isArray(x.events)&&Array.isArray(x.destinations)&&x.events.every(validateEvent)&&x.notes.every(n=>typeof n.id==='string'&&typeof n.text==='string')&&x.destinations.every(d=>typeof d.id==='string'&&typeof d.label==='string'&&/^https?:\/\//.test(d.url)));}
