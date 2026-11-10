import {previewHistorical} from './historicalImport.js';

// An explicit first-run marker prevents deleted activities from resurrecting.
// Existing records always win. This marker is scoped to the browser origin.
export const WEEK_RESTORE_KEY='supeesu2:daily-living:week-initialized-v1';
export function restoreHistoricalWeekOnce(storage,store,reference){
 if(storage.getItem(WEEK_RESTORE_KEY)!==null)return {status:'previously-initialized',added:0};
 if(store.data.events.length){
  storage.setItem(WEEK_RESTORE_KEY,'existing-schedule');
  return {status:'existing-schedule',added:0};
 }
 const preview=previewHistorical(reference,store.data.events);
 if(!preview.additions.length){
  storage.setItem(WEEK_RESTORE_KEY,'no-valid-reference-events');
  return {status:'no-valid-reference-events',added:0};
 }
 // Commit before marking success: failed storage writes remain retryable.
 store.update(records=>{const ids=new Set(records.events.map(e=>e.id));
  records.events.push(...preview.additions.filter(e=>!ids.has(e.id)));
 });
 storage.setItem(WEEK_RESTORE_KEY,'historical-week-restored');
 return {status:'restored',added:preview.additions.length};
}
export function markWeekInitialized(storage){
 if(storage.getItem(WEEK_RESTORE_KEY)===null)storage.setItem(WEEK_RESTORE_KEY,'user-managed');
}
