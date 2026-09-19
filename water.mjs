import {clamp} from './engine.mjs';

// Canvas adaptation of the supplied 千里江山图: seamless world coordinates,
// silk-wave displacement, depth-dependent drift, quadratic curve interpolation.
// Birds, p5 globals, mountains and multicolour palettes are deliberately absent.
export function waterPalette(hex){
 const rgb=hex.match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16));
 return Array.from({length:8},(_,i)=>{
  const amount=i/7;
  return rgb.map(v=>Math.round(amount<.5?v*.36+(v-v*.36)*(amount*2):v+(245-v)*(amount-.5)*1.32));
 });
}
export function waveY(x,layer,time){
 const speed=.012+layer*.005,world=x+time*speed,phase=time*.00065;
 return Math.sin(world*.009+layer*1.7)*(.012+layer*.0015)+Math.sin(world*.023-phase+layer*.8)*.006+Math.sin(world*.004+phase*.7)*.011;
}
export function drawWater(ctx,{x,y,width,height,color,time=0,opaque=false}){
 if(height<1)return;
 const palette=waterPalette(color),bottom=y+height;
 ctx.save();ctx.beginPath();ctx.rect(x,y-width*.05,width,height+width*.05);ctx.clip();
 for(let layer=0;layer<8;layer++){
  const base=y+height*layer/9,points=[];
  for(let i=-2;i<=34;i++){const px=i*width/32;points.push({x:x+px,y:base+waveY(px/width*800,layer,time)*width});}
  const gradient=ctx.createLinearGradient(0,base-width*.02,0,bottom),rgb=palette[7-layer];
  gradient.addColorStop(0,`rgba(${rgb.join(',')},${.35+layer*.045})`);gradient.addColorStop(1,`rgba(${palette[Math.max(0,5-layer)].join(',')},.28)`);
  ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
  for(let j=1;j<points.length-1;j++)ctx.quadraticCurveTo(points[j].x,points[j].y,(points[j].x+points[j+1].x)/2,(points[j].y+points[j+1].y)/2);
  ctx.lineTo(x+width+50,bottom);ctx.lineTo(x-50,bottom);ctx.closePath();ctx.fillStyle=opaque?`rgb(${palette[7-layer].join(',')})`:gradient;ctx.fill();
  // A thin broken reflection traces each rolling crest, not a rectangular fill.
  ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
  for(let j=1;j<points.length-1;j++)ctx.quadraticCurveTo(points[j].x,points[j].y,(points[j].x+points[j+1].x)/2,(points[j].y+points[j+1].y)/2);
  ctx.strokeStyle=`rgba(${palette[Math.min(7,8-layer)].join(',')},${clamp(.3-layer*.02)})`;ctx.lineWidth=layer===0?1.8:1;ctx.stroke();
 }ctx.restore();
}
