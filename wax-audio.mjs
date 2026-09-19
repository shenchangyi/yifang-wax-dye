const Context=globalThis.AudioContext||globalThis.webkitAudioContext;
const clamp=value=>Math.max(0,Math.min(1,value));

export class WaxAudio{
 constructor(){
  this.enabled=localStorage.getItem('wax-sound')!=='off';
  this.context=null;this.effectsBus=null;this.wax=null;this.active=[];
  this.music=null;this.musicIndex=0;this.musicUnlocked=false;this.musicLevel=.18;this.duckLevel=.10;this.fadeFrame=0;this.duckTimer=0;
  this.musicSources=['assets/audio/background.mp3','assets/audio/background.m4a','assets/audio/background.ogg'];
  document.documentElement.dataset.sound=this.enabled?'on':'off';
  document.documentElement.dataset.music='waiting';
  const unlock=()=>{this.musicUnlocked=true;this.ensure();this.startMusic();};
  document.addEventListener('pointerdown',unlock,{once:true,capture:true});
  document.addEventListener('keydown',unlock,{once:true,capture:true});
  document.addEventListener('visibilitychange',()=>{
   if(document.hidden){this.stopEffects();if(this.music&&!this.music.paused)this.music.pause();}
   else if(this.enabled&&this.musicUnlocked)this.startMusic();
  });
 }
 isEnabled(){return this.enabled;}
 setEnabled(value){
  this.enabled=Boolean(value);localStorage.setItem('wax-sound',this.enabled?'on':'off');document.documentElement.dataset.sound=this.enabled?'on':'off';
  if(this.enabled){this.musicUnlocked=true;this.ensure();this.startMusic();}else{this.stopEffects();this.pauseMusic();}
  return this.enabled;
 }
 ensure(){
  if(!this.enabled||!Context)return null;
  if(!this.context){this.context=new Context();this.effectsBus=this.context.createGain();this.effectsBus.gain.value=.55;this.effectsBus.connect(this.context.destination);}
  if(this.context.state==='suspended')this.context.resume().catch(()=>{});return this.context;
 }
 createMusic(){
  if(this.music||this.musicIndex>=this.musicSources.length)return this.music;
  const music=new Audio(this.musicSources[this.musicIndex]);music.loop=true;music.preload='auto';music.playsInline=true;music.volume=0;
  music.addEventListener('canplay',()=>{document.documentElement.dataset.music='ready';},{once:true});
  music.addEventListener('error',()=>{
   if(this.music!==music)return;this.music=null;this.musicIndex++;
   if(this.musicIndex<this.musicSources.length){this.createMusic();if(this.enabled&&this.musicUnlocked)this.startMusic();}
   else document.documentElement.dataset.music='missing';
  },{once:true});
  this.music=music;return music;
 }
 startMusic(){
  if(!this.enabled||!this.musicUnlocked)return;const music=this.createMusic();if(!music)return;
  document.documentElement.dataset.music='loading';const result=music.play();
  if(result?.then)result.then(()=>{document.documentElement.dataset.music='playing';this.fadeMusic(this.musicLevel,1200);}).catch(()=>{if(this.music===music)document.documentElement.dataset.music='blocked';});
 }
 pauseMusic(){
  cancelAnimationFrame(this.fadeFrame);this.fadeFrame=0;if(this.music){this.music.pause();this.music.volume=0;}
  document.documentElement.dataset.music=this.music?'paused':'waiting';
 }
 fadeMusic(target,duration=320){
  if(!this.music)return;cancelAnimationFrame(this.fadeFrame);const start=this.music.volume,started=performance.now(),end=clamp(target);
  const tick=now=>{if(!this.music)return;const t=Math.min(1,(now-started)/duration),eased=1-Math.pow(1-t,3);this.music.volume=start+(end-start)*eased;if(t<1)this.fadeFrame=requestAnimationFrame(tick);};
  this.fadeFrame=requestAnimationFrame(tick);
 }
 duck(seconds){
  if(!this.music||this.music.paused)return;clearTimeout(this.duckTimer);this.fadeMusic(this.duckLevel,140);
  this.duckTimer=setTimeout(()=>{if(this.enabled)this.fadeMusic(this.musicLevel,520);},Math.max(260,seconds*1000));
 }
 cue(name){document.documentElement.dataset.lastSound=name;}
 noise(seconds){
  const context=this.context,length=Math.max(1,Math.ceil(context.sampleRate*seconds)),buffer=context.createBuffer(1,length,context.sampleRate),data=buffer.getChannelData(0);let last=0;
  for(let index=0;index<length;index++){const white=Math.random()*2-1;last=(last+.055*white)/1.055;data[index]=last*2.8;}
  return buffer;
 }
 track(source){this.active.push(source);source.addEventListener('ended',()=>{this.active=this.active.filter(item=>item!==source);},{once:true});}
 startWax(){
  const context=this.ensure();if(!context)return;this.stopWax();this.cue('wax');this.duck(.35);
  const source=context.createBufferSource(),band=context.createBiquadFilter(),high=context.createBiquadFilter(),gain=context.createGain();source.buffer=this.noise(.7);source.loop=true;
  band.type='bandpass';band.frequency.value=1350;band.Q.value=.7;high.type='highpass';high.frequency.value=280;gain.gain.value=.0001;
  source.connect(high).connect(band).connect(gain).connect(this.effectsBus);source.start();gain.gain.exponentialRampToValueAtTime(.017,context.currentTime+.045);this.wax={source,band,gain};this.track(source);
 }
 updateWax(speed=.3,pressure=.5){
  if(!this.wax||!this.context)return;clearTimeout(this.duckTimer);this.duckTimer=setTimeout(()=>{if(this.enabled)this.fadeMusic(this.musicLevel,520);},480);
  const now=this.context.currentTime,energy=clamp(speed*.72+pressure*.28);this.wax.gain.gain.setTargetAtTime(.009+energy*.027,now,.025);this.wax.band.frequency.setTargetAtTime(900+energy*1550,now,.035);
 }
 stopWax(){
  if(!this.wax||!this.context)return;const {source,gain}=this.wax,now=this.context.currentTime;gain.gain.cancelScheduledValues(now);gain.gain.setTargetAtTime(.0001,now,.028);try{source.stop(now+.12);}catch{}this.wax=null;
  clearTimeout(this.duckTimer);this.duckTimer=setTimeout(()=>{if(this.enabled)this.fadeMusic(this.musicLevel,520);},220);
 }
 immersion(seconds=5.5){
  const context=this.ensure();if(!context)return;this.cue('immersion');this.duck(seconds+.35);const now=context.currentTime,source=context.createBufferSource(),low=context.createBiquadFilter(),band=context.createBiquadFilter(),gain=context.createGain();source.buffer=this.noise(seconds+.15);
  low.type='lowpass';low.frequency.value=980;band.type='bandpass';band.frequency.value=360;band.Q.value=.55;gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.055,now+.08);gain.gain.exponentialRampToValueAtTime(.017,now+.7);gain.gain.setValueAtTime(.014,now+seconds-.35);gain.gain.exponentialRampToValueAtTime(.0001,now+seconds);
  source.connect(low).connect(band).connect(gain).connect(this.effectsBus);source.start(now);source.stop(now+seconds+.05);this.track(source);
  for(let index=0;index<14;index++){const at=now+.28+index*(seconds-.6)/14+Math.random()*.16,bubble=context.createOscillator(),bubbleGain=context.createGain();bubble.type='sine';bubble.frequency.setValueAtTime(115+Math.random()*80,at);bubble.frequency.exponentialRampToValueAtTime(220+Math.random()*110,at+.11);bubbleGain.gain.setValueAtTime(.0001,at);bubbleGain.gain.exponentialRampToValueAtTime(.012+Math.random()*.012,at+.025);bubbleGain.gain.exponentialRampToValueAtTime(.0001,at+.14);bubble.connect(bubbleGain).connect(this.effectsBus);bubble.start(at);bubble.stop(at+.15);this.track(bubble);}
 }
 collapse(seconds=2.6){
  const context=this.ensure();if(!context)return;this.cue('collapse');this.duck(seconds+.3);const now=context.currentTime,source=context.createBufferSource(),high=context.createBiquadFilter(),low=context.createBiquadFilter(),gain=context.createGain();source.buffer=this.noise(seconds+.12);
  high.type='highpass';high.frequency.value=720;low.type='lowpass';low.frequency.value=4300;gain.gain.setValueAtTime(.0001,now);gain.gain.linearRampToValueAtTime(.052,now+.07);
  for(let time=.14;time<seconds-.12;time+=.09)gain.gain.linearRampToValueAtTime(.014+Math.random()*.045,now+time);
  gain.gain.exponentialRampToValueAtTime(.0001,now+seconds);source.connect(high).connect(low).connect(gain).connect(this.effectsBus);source.start(now);source.stop(now+seconds+.03);this.track(source);
 }
 stopEffects(){this.stopWax();for(const source of this.active){try{source.stop();}catch{}}this.active.length=0;}
 stopAll(){this.stopEffects();}
}
