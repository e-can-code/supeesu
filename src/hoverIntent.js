// Deliberate short hover: quick enough for frequent use, cancelable on exit.
// Mouse and pen only. Touch users retain click activation.
export function installHoverIntent(elements,open,{delayMs=380}={}) {
  const cleanup=[];
  for(const element of elements){
    let timer=null;
    const cancel=()=>{if(timer!==null){clearTimeout(timer);timer=null;}};
    const enter=event=>{if(event.pointerType==='touch')return;cancel();timer=setTimeout(()=>{timer=null;if(element.isConnected)open(element.dataset.panel,element);},delayMs);};
    element.addEventListener('pointerenter',enter);
    element.addEventListener('pointerleave',cancel);
    element.addEventListener('pointerdown',cancel);
    element.addEventListener('blur',cancel);
    cleanup.push(()=>{cancel();element.removeEventListener('pointerenter',enter);element.removeEventListener('pointerleave',cancel);element.removeEventListener('pointerdown',cancel);element.removeEventListener('blur',cancel);});
  }
  return ()=>cleanup.forEach(fn=>fn());
}
