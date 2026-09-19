/*
 * Pixel-collapse motion inspired by “Pixel Collapse” © 2023 Zaron Chen,
 * licensed under CC BY-NC-SA 3.0. This self-contained implementation adds
 * original local WebGL2 shaders and a Canvas 2D fallback; no CDN is required.
 * https://creativecommons.org/licenses/by-nc-sa/3.0/
 */
export const DEWAX_COLOR='#FFD21F';
export const DEWAX_DURATION=2600;
export const DEWAX_PIXEL_SIZE=6;

const MARGIN=72,ART_SIZE=656,CANVAS_SIZE=800;
const clamp01=value=>Math.max(0,Math.min(1,value));
const randomSource=seed=>{let value=seed>>>0;return()=>((value=Math.imul(value,1664525)+1013904223>>>0)/4294967296);};
export const collapseSampleStep=(sourceSize,canvasCssWidth)=>Math.max(4,Math.round(DEWAX_PIXEL_SIZE*sourceSize/(Math.max(1,canvasCssWidth)*ART_SIZE/CANVAS_SIZE)));

export function buildPixelParticles(mask,size,step=DEWAX_PIXEL_SIZE,seed=4729){
 const random=randomSource(seed),positions=[],offsets=[],delays=[];
 for(let top=0;top<size;top+=step)for(let left=0;left<size;left+=step){
  let count=0,sumX=0,sumY=0;
  for(let y=top;y<Math.min(size,top+step);y++)for(let x=left;x<Math.min(size,left+step);x++)if(mask[y*size+x]){count++;sumX+=x;sumY+=y;}
  if(!count)continue;
  const px=MARGIN+((sumX/count+.5)/size)*ART_SIZE,py=MARGIN+((sumY/count+.5)/size)*ART_SIZE;
  positions.push(px/(CANVAS_SIZE/2)-1,1-py/(CANVAS_SIZE/2));
  offsets.push(random()*2-1,.65+random()*.75);delays.push(random()*.18);
 }
 return{positions:new Float32Array(positions),offsets:new Float32Array(offsets),delays:new Float32Array(delays),count:delays.length};
}

const VERTEX=`#version 300 es
precision highp float;
in vec2 aPosition;
in vec2 aOffset;
in float aDelay;
uniform float uTime;
uniform float uPointSize;
out float vAlpha;
void main(){
 float t=clamp((uTime-aDelay)/(1.0-aDelay),0.0,1.0);
 float gravity=t*t;
 float flutter=sin((aPosition.x*91.7+aPosition.y*57.3)*19.0+uTime*22.0)*0.006*t;
 vec2 fall=vec2(aOffset.x*0.16*t+flutter,-(0.10*t+(1.90+0.35*aOffset.y)*gravity));
 gl_Position=vec4(aPosition+fall,0.0,1.0);
 gl_PointSize=max(1.0,uPointSize*(1.0-0.62*smoothstep(0.55,1.0,t)));
 vAlpha=1.0-smoothstep(0.70,1.0,t);
}`;
const FRAGMENT=`#version 300 es
precision highp float;
uniform vec4 uColor;
in float vAlpha;
out vec4 outColor;
void main(){outColor=vec4(uColor.rgb,uColor.a*vAlpha);}`;

function shader(gl,type,source){
 const item=gl.createShader(type);gl.shaderSource(item,source);gl.compileShader(item);
 if(!gl.getShaderParameter(item,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(item);gl.deleteShader(item);throw Error(message);}
 return item;
}
function program(gl){
 const item=gl.createProgram(),vert=shader(gl,gl.VERTEX_SHADER,VERTEX),frag=shader(gl,gl.FRAGMENT_SHADER,FRAGMENT);
 gl.attachShader(item,vert);gl.attachShader(item,frag);gl.linkProgram(item);gl.deleteShader(vert);gl.deleteShader(frag);
 if(!gl.getProgramParameter(item,gl.LINK_STATUS)){const message=gl.getProgramInfoLog(item);gl.deleteProgram(item);throw Error(message);}
 return item;
}
function attribute(gl,programObject,name,data,size){
 const location=gl.getAttribLocation(programObject,name),buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,size,gl.FLOAT,false,0,0);return buffer;
}

export class WaxPixelCollapse{
 constructor(canvas,{onFrame,onComplete,duration=DEWAX_DURATION,reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches}={}){
  this.canvas=canvas;this.onFrame=onFrame;this.onComplete=onComplete;this.duration=reducedMotion?320:duration;this.frame=0;this.started=0;this.particles=null;
  this.gl=canvas.getContext('webgl2',{alpha:true,antialias:false,premultipliedAlpha:true,preserveDrawingBuffer:false});
  if(this.gl){this.mode='webgl2';this.setupWebGL();}else{this.mode='canvas2d';this.ctx=canvas.getContext('2d');}
  canvas.dataset.renderer=this.mode;
 }
 setupWebGL(){
  const gl=this.gl;this.program=program(gl);this.vao=gl.createVertexArray();gl.bindVertexArray(this.vao);
  this.uniformTime=gl.getUniformLocation(this.program,'uTime');this.uniformPointSize=gl.getUniformLocation(this.program,'uPointSize');this.uniformColor=gl.getUniformLocation(this.program,'uColor');
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.DEPTH_TEST);
 }
 upload(){
  const gl=this.gl;gl.bindVertexArray(this.vao);for(const buffer of this.buffers||[])gl.deleteBuffer(buffer);
  this.buffers=[attribute(gl,this.program,'aPosition',this.particles.positions,2),attribute(gl,this.program,'aOffset',this.particles.offsets,2),attribute(gl,this.program,'aDelay',this.particles.delays,1)];
 }
 start(mask,size,seed=4729){
  this.stop();this.canvas.hidden=false;this.canvas.classList.add('active');const sampleStep=collapseSampleStep(size,this.canvas.getBoundingClientRect().width);this.particles=buildPixelParticles(mask,size,sampleStep,seed);this.canvas.dataset.sampleStep=String(sampleStep);this.started=performance.now();
  if(this.gl)this.upload();this.render(0);this.onFrame?.(0,this.started);
  const tick=now=>{const progress=clamp01((now-this.started)/this.duration);this.render(progress);this.onFrame?.(progress,now);if(progress<1)this.frame=requestAnimationFrame(tick);else this.finish();};
  this.frame=requestAnimationFrame(tick);
 }
 render(progress){if(this.gl)this.renderWebGL(progress);else this.renderCanvas(progress);}
 renderWebGL(progress){
  const gl=this.gl;gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);if(!this.particles?.count)return;
  const pixelScale=this.canvas.width/Math.max(1,this.canvas.getBoundingClientRect().width);
  gl.useProgram(this.program);gl.bindVertexArray(this.vao);gl.uniform1f(this.uniformTime,progress);gl.uniform1f(this.uniformPointSize,DEWAX_PIXEL_SIZE*pixelScale);gl.uniform4f(this.uniformColor,1,210/255,31/255,.96);gl.drawArrays(gl.POINTS,0,this.particles.count);
 }
 renderCanvas(progress){
  const g=this.ctx;g.clearRect(0,0,CANVAS_SIZE,CANVAS_SIZE);if(!this.particles?.count)return;g.fillStyle=DEWAX_COLOR;const pixelScale=this.canvas.width/Math.max(1,this.canvas.getBoundingClientRect().width);
  for(let index=0;index<this.particles.count;index++){
   const delay=this.particles.delays[index],t=clamp01((progress-delay)/(1-delay)),gravity=t*t,px=(this.particles.positions[index*2]+1)*(CANVAS_SIZE/2),py=(1-this.particles.positions[index*2+1])*(CANVAS_SIZE/2);
   const x=px+this.particles.offsets[index*2]*64*t+Math.sin((px+py)*.07+progress*22)*2.4*t,y=py+(40*t+(760+140*this.particles.offsets[index*2+1])*gravity),alpha=1-clamp01((t-.7)/.3),size=DEWAX_PIXEL_SIZE*pixelScale*(1-.62*clamp01((t-.55)/.45));
   if(y>CANVAS_SIZE||alpha<=0)continue;g.globalAlpha=alpha*.96;g.fillRect(x-size/2,y-size/2,size,size);
  }g.globalAlpha=1;
 }
 clear(){if(this.gl){this.gl.clearColor(0,0,0,0);this.gl.clear(this.gl.COLOR_BUFFER_BIT);}else this.ctx.clearRect(0,0,CANVAS_SIZE,CANVAS_SIZE);}
 finish(){cancelAnimationFrame(this.frame);this.frame=0;this.clear();this.canvas.classList.remove('active');this.canvas.hidden=true;this.onComplete?.();}
 stop(){cancelAnimationFrame(this.frame);this.frame=0;this.clear();this.particles=null;this.canvas.classList.remove('active');this.canvas.hidden=true;}
}
