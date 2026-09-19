// A bounded liquid-particle trail inspired by the interaction language of
// Pavel Dobryakov's MIT-licensed WebGL Fluid Simulation. It is deliberately
// separate from the authoritative wax mask and exported artwork.
export const WAX_TRAIL_COLOR='#FFD21F';
export const TRAIL_VISUAL_SCALE=1.5;

const clamp=(value,min=0,max=1)=>Math.min(max,Math.max(min,value));

export function trailRadius(brush,n=640,clothPixels=656,stagePixels=800){
 return clamp(brush/n*clothPixels/stagePixels*1.15,.004,.075);
}

class DOMTrail{
 constructor(layer,reduced=false){this.layer=layer;this.reduced=reduced;this.items=[];}
 splat(item){
  const particle=document.createElement('i'),size=item.radius*200*TRAIL_VISUAL_SCALE;
  particle.className=`fluid-particle${item.terminal?' terminal':''}`;particle.style.left=`${item.point[0]*100}%`;particle.style.top=`${(1-item.point[1])*100}%`;
  particle.style.width=particle.style.height=`${size}%`;particle.style.setProperty('--trail-color',item.color);
  particle.style.setProperty('--trail-duration',this.reduced?'120ms':`${Math.round(item.terminal?360:260+item.speed*60)}ms`);
  particle.style.setProperty('--trail-stretch',String(item.terminal?1.08:1+item.speed*.54));
  particle.style.setProperty('--trail-rotate',`${Math.round((item.seed%9-4)*7)}deg`);
  this.layer.append(particle);this.items.push(particle);
  if(this.reduced)setTimeout(()=>this.remove(particle),120);else particle.addEventListener('animationend',()=>this.remove(particle),{once:true});
  while(this.items.length>56)this.remove(this.items[0]);
 }
 remove(particle){particle.remove();this.items=this.items.filter(item=>item!==particle);}
 clear(){for(const item of this.items)item.remove();this.items=[];}
}

export class WaxTrail{
 constructor(layer){
  this.layer=layer;this.enabled=false;this.sequence=0;this.last=null;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  this.engine=new DOMTrail(layer,reduced);this.mode=reduced?'reduced':'dom';layer.dataset.trailMode=this.mode;
 }
 setEnabled(value){this.enabled=Boolean(value);this.layer.hidden=!this.enabled;if(!this.enabled){this.last=null;this.engine.clear();}}
 splat(x,y,brush,time=performance.now()){
  if(!this.enabled)return;
  const previous=this.last,distance=previous?Math.hypot(x-previous.x,y-previous.y):0,elapsed=Math.max(8,previous?time-previous.time:16),speed=clamp(distance/elapsed*55);
  const radius=trailRadius(brush),steps=previous?Math.max(1,Math.ceil(distance/Math.max(.008,radius*.32))):1;
  for(let index=1;index<=steps;index++){
   const mix=index/steps,px=previous?previous.x+(x-previous.x)*mix:x,py=previous?previous.y+(y-previous.y)*mix:y;
   this.engine.splat({point:[clamp(px),1-clamp(py)],radius:radius*(.48+.52*mix),color:WAX_TRAIL_COLOR,speed,seed:this.sequence+index});
  }
  this.sequence=(this.sequence+steps)%8;this.last={x,y,time,brush};
 }
 end(){
  if(this.enabled&&this.last){
   const {x,y,brush}=this.last;
   this.engine.splat({point:[clamp(x),1-clamp(y)],radius:trailRadius(brush)*.86,color:WAX_TRAIL_COLOR,speed:.2,seed:this.sequence,terminal:true});
  }
  this.last=null;
 }
 clear(){this.last=null;this.engine.clear();}
}

export const IndigoTrail=WaxTrail;
