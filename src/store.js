import {validateSnapshot,isPlace} from './core.js';
const KEY='supeesu2:wf01:records';const HISTORY='supeesu2:wf01:last-place';
const clone=x=>JSON.parse(JSON.stringify(x));
export class PersonalStore{
 constructor(storage,defaults){this.storage=storage;this.defaults=defaults;this.listeners=new Set();this.data=this.read();}
 read(){try{const saved=JSON.parse(this.storage.getItem(KEY));return validateSnapshot(saved)?saved:clone(this.defaults);}catch{return clone(this.defaults);}}
 snapshot(){return clone(this.data);}
 commit(data){if(!validateSnapshot(data))throw Error('Invalid personal-data snapshot');const encoded=JSON.stringify(data);this.storage.setItem(KEY,encoded);this.data=clone(data);for(const fn of this.listeners)fn(this.snapshot());}
 update(fn){const next=this.snapshot();fn(next);this.commit(next);}
 subscribe(fn){this.listeners.add(fn);return ()=>this.listeners.delete(fn);}
 export(){return JSON.stringify(this.data,null,2);}
 import(text){const parsed=JSON.parse(text);if(!validateSnapshot(parsed))throw Error('Import failed validation; existing data unchanged');this.commit(parsed);}
 lastPlace(world){try{const place=JSON.parse(this.storage.getItem(HISTORY));return isPlace(world,place)&&place.locationId!=='atelier'?place:null;}catch{return null;}}
 saveLastPlace(world,place){if(isPlace(world,place)&&place.locationId!=='atelier')this.storage.setItem(HISTORY,JSON.stringify(place));}
}
export const defaultRecords=destinations=>({schemaVersion:1,notes:[],events:[],destinations:clone(destinations),activeNoteId:null});
