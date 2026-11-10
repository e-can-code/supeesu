export const INSTRUMENTS=Object.freeze(['today','map','month','rituals','patterns','create','operations']);
export function instrumentPath(view){
 if(!INSTRUMENTS.includes(view))throw Error('Unknown Helm instrument');
 return '../index.html?instrument='+encodeURIComponent(view);
}
