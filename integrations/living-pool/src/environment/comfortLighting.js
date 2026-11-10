// The real-time presentation policy never changes the ecological World Clock.
export function minuteOfDay(date) { return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60; }
export function interpolateComfort(points, minute) {
  const entries = points.map(p => ({ minute: Number(p.time.slice(0,2))*60+Number(p.time.slice(3,5)), value:p.illumination })).sort((a,b)=>a.minute-b.minute);
  const at = ((minute % 1440)+1440)%1440;
  let left = entries[entries.length-1], right = entries[0];
  for(let i=0;i<entries.length;i++){ if(entries[i].minute>at){right=entries[i];left=entries[(i+entries.length-1)%entries.length];break;} if(i===entries.length-1){left=entries[i];right=entries[0];} }
  const span = (right.minute-left.minute+1440)%1440 || 1440;
  const position = (at-left.minute+1440)%1440 / span;
  const smooth = position*position*(3-2*position);
  return left.value+(right.value-left.value)*smooth;
}
export function comfortState(config, date) {
  const minute = minuteOfDay(date);
  const brightness = interpolateComfort(config.points,minute);
  const deep = minute >= 23*60 || minute < 330;
  const descent = minute >= 21*60+30 || minute < 330;
  return { brightness, deep, warmth: deep ? 1 : descent ? Math.min(1, Math.max(0,(minute-(21*60+30))/90)) : 0 };
}
