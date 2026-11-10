import {adaptQuietHours,validateEvent} from './core.js';
// Historical records are evidence, not the user's current commitments.
export function previewHistorical(quiet,current){
 const existing=new Set(current.map(e=>e.id));
 const source=adaptQuietHours(quiet).filter(validateEvent);
 const additions=source.filter(e=>!existing.has(e.id));
 return {sourceCount:source.length,collisionCount:source.length-additions.length,additions};
}
