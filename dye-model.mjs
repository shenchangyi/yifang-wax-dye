import {FABRICS,clamp,validatePath} from './engine.mjs';

// A seeded, optical approximation of stitched resist, not a fluid solver.
export function hash(x,y,seed){let n=Math.imul(x+1,374761393)^Math.imul(y+1,668265263)^seed;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
export function noise(x,y,seed){const ix=Math.floor(x),iy=Math.floor(y),tx=smooth(x-ix),ty=smooth(y-iy);return (hash(ix,iy,seed)*(1-tx)+hash(ix+1,iy,seed)*tx)*(1-ty)+(hash(ix,iy+1,seed)*(1-tx)+hash(ix+1,iy+1,seed)*tx)*ty;}

// Propagate the closest contour sample and its arc length through a chamfer field.
// Its normal and arc coordinate orient the feathering instead of blurring a stroke.
export function resistField(points,size){
 if(!validatePath(points)||!Number.isInteger(size)||size<16||size>1600)throw new Error('Invalid dye geometry');
 const count=size*size,dist=new Float32Array(count).fill(1e6),nearest=new Int32Array(count).fill(-1),samples=[];
 let arc=0;
 for(let k=0;k<points.length;k++){
  const a=points[k],b=points[(k+1)%points.length],len=Math.hypot(b.x-a.x,b.y-a.y),steps=Math.max(1,Math.ceil(len*size*2));
  for(let j=0;j<steps;j++){const t=j/steps,x=(a.x+(b.x-a.x)*t)*size,y=(a.y+(b.y-a.y)*t)*size,id=samples.length;
   samples.push({x,y,arc:arc+len*t});const px=Math.min(size-1,Math.round(x)),py=Math.min(size-1,Math.round(y)),at=py*size+px;dist[at]=0;nearest[at]=id;
  }arc+=len;
 }
 const relax=(i,j,cost)=>{if(dist[j]+cost<dist[i]){dist[i]=dist[j]+cost;nearest[i]=nearest[j];}};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=y*size+x;if(x)relax(i,i-1,1);if(y)relax(i,i-size,1);if(x&&y)relax(i,i-size-1,Math.SQRT2);if(x<size-1&&y)relax(i,i-size+1,Math.SQRT2);}
 for(let y=size-1;y>=0;y--)for(let x=size-1;x>=0;x--){const i=y*size+x;if(x<size-1)relax(i,i+1,1);if(y<size-1)relax(i,i+size,1);if(x<size-1&&y<size-1)relax(i,i+size+1,Math.SQRT2);if(x&&y<size-1)relax(i,i+size-1,Math.SQRT2);}
 return {nearest,samples,size,length:arc};
}

export function dyePixels(s,size=600,field=resistField(s.points,size)){
 const f=FABRICS.find(f=>f.id===s.fabricId)??FABRICS[0],rgb=s.color.match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16));
 const out=new Uint8ClampedArray(size*size*4),seed=s.randomSeed>>>0,tension=clamp(s.tension),ground=[242,239,228];
 const absorption=(.45+clamp(s.concentration)*1.4)*(.55+clamp(s.immersion)*.65)*(.7+f.absorption*.45);
 const pigment=rgb.map((v,k)=>Math.max(.022,Math.min(.94,v*f.colorBrightness/ground[k])));
 const stitchCount=Math.max(3,Math.round(field.length*200/clamp(s.spacing,3,9)));
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const idx=y*size+x,p=field.samples[field.nearest[idx]],u=x/size,v=y/size,dx=(x-p.x)/size,dy=(y-p.y)/size,d=Math.hypot(dx,dy);
  const broad=noise(u*5+3,v*5+9,seed),cloud=noise(u*17,v*17,seed+12),grain=hash(x,y,seed+4);
  const along=p.arc,cycle=along/field.length*stitchCount*Math.PI*2;
  const stitch=.5+.5*Math.cos(cycle),pressure=.6+.4*noise(along*55,2,seed+3);
  const width=(.0025+.019*tension)*pressure*(.72+.55*stitch)*(1+(s.spacing-5.5)*.055);
  // Narrow directional fingers follow gathered folds. They end at different depths.
  const fingers=noise(along*480+dy*21,d*37,seed+21),slub=noise(u*150,v*38,seed+8);
  const edgeDist=Math.max(0,d+(slub-.5)*(.0012+f.diffusion*.0025));
  const core=1-smooth((edgeDist/width-.48)/.68);
  const reach=width*(1.3+fingers*2.6+f.diffusion),fringe=(1-smooth(edgeDist/reach))*smooth((fingers-.32)/.39)*(1-core);
  const fold= Math.pow(.5+.5*Math.sin(cycle*2.1+noise(along*33,d*8,seed+7)*3),9);
  const foldResist=fold*Math.pow(1-smooth(d/(width*3.5)),2)*.28*tension;
  const resist=clamp(core*(.76+.235*tension)+fringe*.7+foldResist,0,.992);
  // Lower permeability in the crease; darker accumulation on its exposed shoulders.
  const pooling=.3*Math.exp(-Math.pow((edgeDist-width*1.8)/(width*.8),2))*(1-fringe);
  const uptake=absorption*(.84+broad*.19+cloud*.18+pooling)*(1-resist);
  const warp=Math.sin(x*Math.PI*.84+noise(u*20,v*4,seed)*.8),weft=Math.sin(y*Math.PI*.91);
  const weave=(warp+weft)*(1.2+f.fiberNoise*2.2)+(grain-.5)*(5+f.fiberNoise*13);
  const creases=(noise(u*48+v*8,v*3,seed+61)-.5)*5;
  for(let k=0;k<3;k++)out[idx*4+k]=ground[k]*Math.pow(pigment[k],uptake)+weave+creases;
  out[idx*4+3]=255;
 }return out;
}
