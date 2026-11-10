import {initialPlace,travel,look,isPlace} from './core.js';
// Arrival, travel and looking are separate state transitions. The most recent
// non-Atelier viewpoint is durable; the Atelier never overwrites it.
export class NavigationSession {
 constructor(world,last=null){this.world=world;this.current=initialPlace(world);this.last=isPlace(world,last)&&last.locationId!=='atelier'?{...last}:null;}
 arrive(){this.current=initialPlace(this.world);return this.current;}
 travel(destination){this.current=travel(this.world,this.current,destination);if(this.current.locationId!=='atelier')this.last={...this.current};return this.current;}
 look(view){this.current=look(this.world,this.current,view);if(this.current.locationId!=='atelier')this.last={...this.current};return this.current;}
 returnLast(){if(!this.last||!isPlace(this.world,this.last))return false;this.current={...this.last};return true;}
 setLast(place){this.last=isPlace(this.world,place)&&place.locationId!=='atelier'?{...place}:null;}
}
