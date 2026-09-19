export const DEWAX_COLOR='#FFD21F';
export const DEWAX_DURATION=2600;

const clamp01=value=>Math.max(0,Math.min(1,value));
export const dewaxFront=progress=>72+656*(1-Math.pow(1-clamp01(progress),1.55));

export class WaxRemovalRain{
 constructor(canvas,{onFrame,onComplete,duration=DEWAX_DURATION,reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches}={}){
  this.canvas=canvas;this.ctx=canvas.getContext('2d');this.onFrame=onFrame;this.onComplete=onComplete;
  this.duration=reducedMotion?320:duration;this.reducedMotion=reducedMotion;this.frame=0;this.particles=[];this.last=0;this.started=0;
 }
 start(){
  this.stop();this.canvas.hidden=false;this.canvas.classList.add('active');this.started=performance.now();this.last=this.started;
  if(this.reducedMotion){this.frame=requestAnimationFrame(now=>{this.onFrame?.(1,now);this.finish();});return;}
  const tick=now=>{
   const progress=clamp01((now-this.started)/this.duration),delta=Math.min(34,now-this.last);this.last=now;
   this.spawn(progress,delta);this.update(progress,delta,now);this.onFrame?.(progress,now);
   if(progress<1)this.frame=requestAnimationFrame(tick);else this.finish();
  };
  this.frame=requestAnimationFrame(tick);
 }
 spawn(progress,delta){
  const count=Math.max(2,Math.round(delta/3.4));
  for(let i=0;i<count&&this.particles.length<520;i++){
   const seed=Math.random(),x=72+seed*656;
   this.particles.push({x,y:64-Math.random()*28,vx:(Math.random()-.5)*.16,vy:.13+Math.random()*.13,size:1.6+Math.random()*2.5,life:0,phase:Math.random()*Math.PI*2,progress});
  }
 }
 update(progress,delta,now){
  const g=this.ctx;g.clearRect(0,0,800,800);g.save();g.beginPath();g.rect(72,72,656,656);g.clip();
  g.lineCap='round';g.lineJoin='round';g.strokeStyle=DEWAX_COLOR;g.fillStyle=DEWAX_COLOR;g.shadowColor='rgba(255,210,31,.58)';g.shadowBlur=5;
  for(const p of this.particles){
   p.life+=delta;p.vy+=delta*.00042;p.x+=p.vx*delta+Math.sin(now*.003+p.phase)*.22;p.y+=p.vy*delta;
   const alpha=Math.max(0,1-p.life/1500)*Math.min(1,p.life/100);if(alpha<=0||p.y>748)continue;
   g.globalAlpha=alpha*.9;g.lineWidth=p.size;g.beginPath();g.moveTo(p.x-p.vx*34,p.y-p.vy*17);g.lineTo(p.x,p.y);g.stroke();
   if((p.life|0)%7<3){g.globalAlpha=alpha*.48;g.beginPath();g.arc(p.x+Math.sin(p.phase)*7,p.y-5,p.size*.58,0,Math.PI*2);g.fill();}
  }
  this.particles=this.particles.filter(p=>p.life<1500&&p.y<748);
  const front=dewaxFront(progress);g.globalAlpha=.24*(1-progress);g.filter='blur(7px)';g.fillRect(72,front-9,656,18);g.restore();g.filter='none';g.globalAlpha=1;
 }
 finish(){
  cancelAnimationFrame(this.frame);this.frame=0;this.ctx.clearRect(0,0,800,800);this.canvas.classList.remove('active');this.canvas.hidden=true;this.onComplete?.();
 }
 stop(){
  cancelAnimationFrame(this.frame);this.frame=0;this.particles.length=0;this.ctx.clearRect(0,0,800,800);this.canvas.classList.remove('active');this.canvas.hidden=true;
 }
}
