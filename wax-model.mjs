// A2 visual proxy: fixed masks preserve every connected component and hole.
export const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
export const STEPS=['图纸','排版','描蜡','染色设置','浸染','去蜡','完成'];
export function immersionFrame(progress){const p=clamp(progress);return {showResult:p>=1,waterY:760-736*clamp(p/.98),bottom:780};}
export function maskFromRGBA(rgba,threshold=170,invert=false){
 const out=new Uint8Array(rgba.length/4);
 for(let i=0;i<out.length;i++){const p=i*4,a=rgba[p+3]/255;const gray=(rgba[p]*.2126+rgba[p+1]*.7152+rgba[p+2]*.0722)*a+255*(1-a);out[i]=(gray<threshold)!==invert?1:0;}
 return out;
}
export function coverage(mask,wax){let total=0,covered=0;for(let i=0;i<mask.length;i++)if(mask[i]){total++;if(wax[i])covered++;}return total?covered/total:0;}
export function paint(mask,wax,n,x,y,r){for(let yy=Math.max(0,Math.floor(y-r));yy<=Math.min(n-1,Math.ceil(y+r));yy++)for(let xx=Math.max(0,Math.floor(x-r));xx<=Math.min(n-1,Math.ceil(x+r));xx++)if((xx-x)**2+(yy-y)**2<=r*r&&mask[yy*n+xx])wax[yy*n+xx]=1;}
export function hash(x,y,seed){let k=Math.imul(x+seed,374761393)^Math.imul(y+17,668265263);k=Math.imul(k^(k>>>13),1274126177);return ((k^(k>>>16))>>>0)/4294967295;}
function noise(x,y,seed){const ix=Math.floor(x),iy=Math.floor(y);let tx=x-ix,ty=y-iy;tx=tx*tx*(3-2*tx);ty=ty*ty*(3-2*ty);return (hash(ix,iy,seed)*(1-tx)+hash(ix+1,iy,seed)*tx)*(1-ty)+(hash(ix,iy+1,seed)*(1-tx)+hash(ix+1,iy+1,seed)*tx)*ty;}
function hexRgb(hex){const value=String(hex).replace('#','');if(!/^[0-9a-f]{6}$/i.test(value))return [19,49,88];return [0,2,4].map(i=>parseInt(value.slice(i,i+2),16));}
export function renderDye(mask,n,{seed=4729,strength=.8,bleed=.3,fabric='cotton',dye='#133158'}={}){
 const out=new Uint8ClampedArray(n*n*4),color=hexRgb(dye),paper=[241,238,221],unit=640/n,edge=Math.max(1,Math.round(n/640));
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const i=y*n+x,isWhite=mask[i];let neighbors=0;
  for(const [dx,dy] of [[-edge,0],[edge,0],[0,-edge],[0,edge]])neighbors+=mask[clamp(y+dy,0,n-1)*n+clamp(x+dx,0,n-1)];
  const gx=x*unit,gy=y*unit,grain=hash(x,y,seed),cloud=noise(gx/60,gy/60,seed),fine=noise(gx/6,gy/6,seed+9);
  let uptake=isWhite?(1-neighbors/4)*bleed*.7+bleed*.045*fine:.88+.10*cloud;
  uptake=clamp(uptake*strength);
  const weave=(Math.sin(gx*Math.PI*.8)*Math.sin(gy*Math.PI*.8)*1.3+(grain-.5)*(fabric==='linen'?10:6));
  for(let c=0;c<3;c++)out[i*4+c]=clamp(paper[c]*(1-uptake)+color[c]*uptake+weave,0,255);
  out[i*4+3]=255;
 }
 return out;
}
