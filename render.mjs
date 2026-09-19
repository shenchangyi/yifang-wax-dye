import {dyePixels,resistField} from './dye-model.mjs';
import {drawWater} from './water.mjs';
import {FABRICS,clamp,random,samplePath} from './engine.mjs';
const canvas=(size)=>{const c=document.createElement('canvas');c.width=c.height=size;return c;};
const hash=(x,y,seed)=>{let n=Math.imul(x+1,374761393)^Math.imul(y+1,668265263)^seed;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
const smooth=t=>t*t*(3-2*t);
function noise(x,y,seed){const ix=Math.floor(x),iy=Math.floor(y),tx=smooth(x-ix),ty=smooth(y-iy);return (hash(ix,iy,seed)*(1-tx)+hash(ix+1,iy,seed)*tx)*(1-ty)+(hash(ix,iy+1,seed)*(1-tx)+hash(ix+1,iy+1,seed)*tx)*ty;}
export function path(ctx,points,size,offset=0){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(offset+p.x*size,offset+p.y*size):ctx.moveTo(offset+p.x*size,offset+p.y*size));ctx.closePath();}
export function drawThumbnail(c,points){const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.strokeStyle='#325496';ctx.lineWidth=2.2;path(ctx,points,c.width*.85,c.width*.075);ctx.stroke();}
export function makeCloth(fabricId='cotton',size=600){const c=canvas(size),ctx=c.getContext('2d'),im=ctx.createImageData(size,size),fabric=FABRICS.find(f=>f.id===fabricId);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const fine=hash(x,y,91),grain=(fine-.5)*(8+fabric.fiberNoise*16),warp=(x%4===0?-2:0)+(y%4===0?-3:0),i=(y*size+x)*4;im.data[i]=242+grain+warp;im.data[i+1]=239+grain+warp;im.data[i+2]=228+grain+warp;im.data[i+3]=255;}ctx.putImageData(im,0,0);return c;}
export function makeDye(s,size=600,field){const c=canvas(size),ctx=c.getContext('2d'),im=ctx.createImageData(size,size);im.data.set(dyePixels(s,size,field));ctx.putImageData(im,0,0);return c;}
export function makeSwatch(c,id){const ctx=c.getContext('2d'),cloth=makeCloth(id,80);ctx.drawImage(cloth,0,0,c.width,c.height);ctx.fillStyle='#244cb014';ctx.fillRect(0,0,c.width,c.height);}
function deform(p,t){const x=p.x-.5,y=p.y-.5,r=Math.hypot(x,y),a=Math.atan2(y,x);return {x:.5+x*(1-t*.6)+Math.sin(a*13+r*22)*t*.025*r,y:.5+y*(1-t*.5)+Math.cos(a*11+r*19)*t*.024*r};}
function textureTriangle(ctx,img,src,dst){ctx.save();ctx.beginPath();ctx.moveTo(dst[0].x,dst[0].y);ctx.lineTo(dst[1].x,dst[1].y);ctx.lineTo(dst[2].x,dst[2].y);ctx.closePath();ctx.clip();const [a,b,c]=src,[A,B,C]=dst;const det=(b.x-a.x)*(c.y-a.y)-(c.x-a.x)*(b.y-a.y);if(Math.abs(det)>1e-8){const m11=((B.x-A.x)*(c.y-a.y)-(C.x-A.x)*(b.y-a.y))/det,m12=((B.y-A.y)*(c.y-a.y)-(C.y-A.y)*(b.y-a.y))/det,m21=((C.x-A.x)*(b.x-a.x)-(B.x-A.x)*(c.x-a.x))/det,m22=((C.y-A.y)*(b.x-a.x)-(B.y-A.y)*(c.x-a.x))/det;ctx.transform(m11,m12,m21,m22,A.x-m11*a.x-m21*a.y,A.y-m12*a.x-m22*a.y);const minX=Math.min(...src.map(p=>p.x)),minY=Math.min(...src.map(p=>p.y)),maxX=Math.max(...src.map(p=>p.x)),maxY=Math.max(...src.map(p=>p.y));ctx.drawImage(img,minX,minY,maxX-minX,maxY-minY,minX,minY,maxX-minX,maxY-minY);}ctx.restore();}
export class StageRenderer{
 constructor(c){this.canvas=c;this.ctx=c.getContext('2d');this.cloths=new Map;this.result=null;this.resultKey='';}
 getCloth(id){if(!this.cloths.has(id))this.cloths.set(id,makeCloth(id));return this.cloths.get(id);}
 dye(s,size=600){const key=JSON.stringify([size,s.points,s.spacing,s.tension,s.fabricId,s.color,s.concentration,s.immersion,s.randomSeed]);if(key!==this.resultKey){const geometry=JSON.stringify([size,s.points]);if(geometry!==this.geometryKey){this.field=resistField(s.points,size);this.geometryKey=geometry;}this.result=makeDye(s,size,this.field);this.resultKey=key;}return this.result;}
 draw(s,options={}){const ctx=this.ctx,N=this.canvas.width,pad=N*.09,W=N-2*pad;ctx.clearRect(0,0,N,N);ctx.fillStyle='#e5e5df';ctx.fillRect(0,0,N,N);
  // A quiet measuring grid belongs to the working surface, not the textile.
  ctx.strokeStyle='#b9c0b33b';ctx.lineWidth=.7;for(let i=0;i<20;i++){const at=i*N/20;ctx.beginPath();ctx.moveTo(at,0);ctx.lineTo(at,N);ctx.moveTo(0,at);ctx.lineTo(N,at);ctx.stroke();}
  const editing=s.immersion>=.5&&['gathering','material'].includes(s.step);
  const finished=editing||['intro','result'].includes(s.step)||(s.step==='reveal'&&options.reveal>.85);
  const resultState=s.step==='intro'?{...s,immersion:.7,tension:.65,concentration:.7}:s;
  let img=finished?this.dye(resultState,editing?360:600):this.getCloth(s.fabricId);
  let t=!editing&&['gathering','material','dyeing'].includes(s.step)?s.tension:0;
  if(s.step==='reveal'){img=this.dye(s);t=s.tension*(1-clamp(options.reveal??0));}
  ctx.save();ctx.shadowColor='#24332a29';ctx.shadowBlur=18;ctx.shadowOffsetY=10;ctx.fillStyle='#eae6db';ctx.fillRect(pad+t*W*.3,pad+t*W*.25,W*(1-t*.6),W*(1-t*.5));ctx.restore();
  if(t>.01){const count=18;for(let y=0;y<count;y++)for(let x=0;x<count;x++){const uv=[{x:x/count,y:y/count},{x:(x+1)/count,y:y/count},{x:(x+1)/count,y:(y+1)/count},{x:x/count,y:(y+1)/count}];const src=uv.map(p=>({x:p.x*img.width,y:p.y*img.height})),dst=uv.map(p=>{const d=deform(p,t);return {x:pad+d.x*W,y:pad+d.y*W};});textureTriangle(ctx,img,[src[0],src[1],src[3]],[dst[0],dst[1],dst[3]]);textureTriangle(ctx,img,[src[1],src[2],src[3]],[dst[1],dst[2],dst[3]]);const gradient=ctx.createLinearGradient(dst[0].x,dst[0].y,dst[1].x,dst[1].y);for(let k=0;k<=4;k++){const shade=(Math.sin((x+k/4)*1.65)*.14+.025)*t;gradient.addColorStop(k/4,shade>0?`rgba(32,43,61,${shade})`:`rgba(255,255,248,${-shade})`);}ctx.fillStyle=gradient;ctx.beginPath();dst.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();}}else ctx.drawImage(img,pad,pad,W,W);
  if(s.step==='dyeing'){const level=pad+W*(.78-.65*clamp(s.immersion*2));drawWater(ctx,{x:pad-W*.045,y:level,width:W*1.09,height:pad+W*1.06-level,color:s.color,time:options.time??0});}
  if(!finished&&!['dyeing','reveal'].includes(s.step)){
   const pts=s.points.map(p=>{const d=deform(p,t);return {x:pad+d.x*W,y:pad+d.y*W};});ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.strokeStyle='#31568666';ctx.lineWidth=1.7;ctx.setLineDash(['pattern','contour'].includes(s.step)?[]:[3,5]);ctx.stroke();ctx.setLineDash([]);
   if(['spacing','stitching','gathering','material'].includes(s.step)){const needles=samplePath(s.points,s.spacing),done=new Set(s.stitched);for(let i=0;i<needles.length;i++){const a=deform(needles[i],t),b=deform(needles[(i+1)%needles.length],t);const isDone=s.step==='stitching'?done.has(i):s.step==='spacing'?false:true;if(isDone&&i%2===0){ctx.beginPath();ctx.moveTo(pad+a.x*W,pad+a.y*W);ctx.lineTo(pad+b.x*W,pad+b.y*W);ctx.strokeStyle='#bd7839';ctx.lineWidth=3.6;ctx.stroke();}ctx.fillStyle=isDone?'#b57436':'#274b9b';ctx.beginPath();ctx.arc(pad+a.x*W,pad+a.y*W,s.step==='spacing'?2.7:2.3,0,Math.PI*2);ctx.fill();}
    if(s.step==='stitching'&&s.stitched.length<needles.length){const next=needles.find((_,i)=>!done.has(i));ctx.strokeStyle='#c58a45';ctx.lineWidth=2;ctx.beginPath();ctx.arc(pad+next.x*W,pad+next.y*W,11,0,Math.PI*2);ctx.stroke();}
   }
  }
  if(!editing&&['gathering','material'].includes(s.step)){const p=deform(s.points[0],t);ctx.beginPath();ctx.moveTo(pad+p.x*W,pad+p.y*W);ctx.bezierCurveTo(N*.62,N*.2,N*.7,N*.6,N*.93,N*.51);ctx.strokeStyle='#b77a3e';ctx.lineWidth=2.7;ctx.stroke();}
  // Frayed edge marks provide a modest textile boundary without external assets.
  if(!t){ctx.strokeStyle='#c3bfb38a';ctx.lineWidth=1;for(let j=0;j<110;j++){const x=pad+j*W/110;ctx.beginPath();ctx.moveTo(x,pad+W-2);ctx.lineTo(x+(j%3-1),pad+W+2+(j%4));ctx.stroke();}}
 }
 pointFromEvent(event){const r=this.canvas.getBoundingClientRect();return {x:((event.clientX-r.left)/r.width-.09)/.82,y:((event.clientY-r.top)/r.height-.09)/.82};}
}
