import {STEPS,maskFromRGBA,coverage,paint,renderDye,clamp,immersionFrame} from './wax-model.mjs';
import {inspectImageHeader} from './image-engine.mjs';
import {drawWater} from './water.mjs';
import {TEMPLATES as templates,FEATURED_COUNT,templateSource} from './wax-templates.mjs';
import {PALETTES,DEFAULT_PALETTE,paletteById} from './wax-palettes.mjs';
import {KNOWLEDGE,cardForStep,nextCard} from './wax-knowledge.mjs';
import {WaxTrail} from './fluid-trail.mjs';
import {WaxPixelCollapse} from './wax-removal.mjs';
import {WaxAudio} from './wax-audio.mjs';

const $=selector=>document.querySelector(selector);
const N=640,canvas=$('#stage'),ctx=canvas.getContext('2d');
const trail=new WaxTrail($('#fluid-layer'));
const audio=new WaxAudio();
const work=document.createElement('canvas');work.width=work.height=N;
const wc=work.getContext('2d',{willReadFrequently:true});
const result=document.createElement('canvas');result.width=result.height=N;
const rc=result.getContext('2d');
const goldWax=document.createElement('canvas');goldWax.width=goldWax.height=N;
const gc=goldWax.getContext('2d');

let state={step:0,id:templates[0].id,name:templates[0].name,scale:.78,rotation:0,threshold:170,invert:false,brush:18,bleed:.28,strength:.85,fabric:'cotton',paletteId:DEFAULT_PALETTE,preview:false,seed:4729,immersion:0,dyeComplete:false};
let showMore=false,source=null,target=new Uint8Array(N*N),wax=new Uint8Array(N*N),undo=[];
let busy=false,loadVersion=0,drawVersion=0,timer=0,started=0,dyeBefore=0,drag=false,last=null,dirty=true,cached=null;
let goldDirty=true,dewaxProgress=0,dewaxRunning=false;
let artRevision=0,exportCache=new Map(),saveUrl='';

const removal=new WaxPixelCollapse($('#dewax-layer'),{
 onFrame:progress=>{dewaxProgress=progress;},
 onComplete:()=>{if(!dewaxRunning)return;dewaxRunning=false;dewaxProgress=1;$('#canvas-wrap').removeAttribute('aria-busy');go(6);}
});

const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const palette=()=>paletteById(state.paletteId);

function notify(message){
 $('#toast').textContent=message;$('#toast').classList.add('visible');
 clearTimeout(timer);timer=setTimeout(()=>$('#toast').classList.remove('visible'),3500);
}
function modal(html,className=''){
 const dialog=$('#dialog');dialog.className=className;$('#dialog-content').innerHTML=html;
 if(!dialog.open)dialog.showModal();
}
function applyTheme(){
 const p=palette();document.body.dataset.palette=p.id;
 const meta=document.querySelector('meta[name=theme-color]');if(meta)meta.content='#6f3d17';
}
function invalidateResult(){
 dirty=true;cached=null;goldDirty=true;state.immersion=0;state.dyeComplete=false;artRevision++;exportCache.clear();
}
function transition(){
 document.body.classList.remove('turning');void document.body.offsetWidth;
 document.body.classList.add('turning');setTimeout(()=>document.body.classList.remove('turning'),520);
}

$('#close-dialog').onclick=()=>$('#dialog').close();
function updateSoundToggle(){
 const button=$('#sound-toggle'),enabled=audio.isEnabled();
 button.textContent=enabled?'声音 开':'声音 关';button.setAttribute('aria-pressed',String(enabled));button.setAttribute('aria-label',enabled?'关闭背景音乐和交互音效':'开启背景音乐和交互音效');
}
$('#sound-toggle').onclick=()=>{audio.setEnabled(!audio.isEnabled());updateSoundToggle();};
updateSoundToggle();
$('#help').onclick=()=>modal('<div class="sheet-title"><span class="mini-seal">蜡</span><p>一方蜡染</p><h2>描一笔蜡，留一方白。</h2></div><p>把图纸映到布上，沿提示描蜡或辅助填蜡。蜡覆盖的位置会形成防染留白，浸染完成后得到属于你的作品。</p><p>如果不便拖动画布，可以用键盘聚焦“辅助填完图案”并确认，同样可以继续完成作品。</p><p>这是受传统蜡染启发的数字手作，不是实物染色预测。上传图片只在当前设备处理。</p><p class="motion-credit">去蜡动效参考 <a href="https://creativecommons.org/licenses/by-nc-sa/3.0/" target="_blank" rel="noopener">Zaron Chen《Pixel Collapse》· CC BY-NC-SA 3.0</a>。</p>','paper-sheet');
$('#reset').hidden=false;
$('#reset').onclick=()=>modal('<div class="sheet-title"><span class="mini-seal">重</span><h2>重新制作？</h2></div><p>尚未保存的作品会被清空。</p><button id="confirm-reset" class="primary">重新开始</button>','paper-sheet');
$('#mobile-progress').onclick=()=>{
 const open=$('#steps').classList.toggle('mobile-open');
 $('#mobile-progress').setAttribute('aria-expanded',String(open));
 $('#mobile-progress small').textContent=open?'收起步骤':'查看全部步骤';
};
$('#dialog').addEventListener('click',event=>{
 if(event.target.id==='confirm-reset')location.reload();
 if(event.target.closest('[data-close-dialog]'))$('#dialog').close();
 const knowledge=event.target.closest('[data-next-knowledge]');
 if(knowledge)openKnowledge(nextCard(knowledge.dataset.nextKnowledge));
 const previous=event.target.closest('[data-prev-knowledge]');
 if(previous){const index=KNOWLEDGE.findIndex(card=>card.id===previous.dataset.prevKnowledge);openKnowledge(KNOWLEDGE[(index-1+KNOWLEDGE.length)%KNOWLEDGE.length]);}
 const mode=event.target.closest('[data-export-mode]');
 if(mode)openSavePanel(mode.dataset.exportMode);
 if(event.target.id==='download-export')downloadPrepared();
 if(event.target.id==='share-export')sharePrepared();
});

function preloadKnowledge(card){
 const image=new Image();image.src=card.image;if(image.decode)image.decode().catch(()=>{});
}
function openKnowledge(card){
 const index=KNOWLEDGE.findIndex(item=>item.id===card.id),number=String(index+1).padStart(2,'0');
 modal(`<article class="knowledge-card"><header class="knowledge-card-head"><span class="mini-seal">识</span><div><small>蜡染小知识</small><strong>${number} / ${String(KNOWLEDGE.length).padStart(2,'0')}</strong></div></header><figure class="knowledge-illustration" style="--placeholder:url('${card.placeholder}')"><img src="${esc(card.image)}" alt="${esc(card.alt)}" width="640" height="360" decoding="async"></figure><div class="knowledge-copy"><h2>${esc(card.title)}</h2><p>${esc(card.body)}</p><div class="source-row"><span>来源：${esc(card.source)}</span>${card.url?`<a href="${card.url}" target="_blank" rel="noopener">查看来源 ↗</a>`:''}</div></div><div class="knowledge-nav"><button class="secondary knowledge-arrow" data-prev-knowledge="${card.id}" aria-label="上一张">←</button><button class="secondary" data-close-dialog>收起图鉴</button><button class="primary" data-next-knowledge="${card.id}">下一张 →</button></div></article>`,'knowledge-sheet');
 const image=$('#dialog .knowledge-illustration img');
 const reveal=()=>image?.classList.add('loaded');
 if(image?.complete)reveal();else image?.addEventListener('load',reveal,{once:true});
 preloadKnowledge(nextCard(card.id));
}

async function load(template){
 const version=++loadVersion;busy=true;render();
 try{
  const image=await templateSource(template);
  if(version!==loadVersion)return;
  source=image;state.id=template.id;state.name=template.name;state.scale=.78;state.rotation=0;state.invert=false;state.threshold=170;
  rebuild();
 }catch{notify('图纸载入失败，请重试或上传本地图纸。');}
 finally{if(version===loadVersion){busy=false;render();}}
}
function rebuild(){
 wc.fillStyle='white';wc.fillRect(0,0,N,N);
 const width=source.naturalWidth||source.width,height=source.naturalHeight||source.height,ratio=N*state.scale/Math.max(width,height);
 wc.save();wc.translate(N/2,N/2);wc.rotate(state.rotation*Math.PI/180);
 wc.drawImage(source,-width*ratio/2,-height*ratio/2,width*ratio,height*ratio);wc.restore();
 target=maskFromRGBA(wc.getImageData(0,0,N,N).data,state.threshold,false);
 if(state.invert){
  wc.clearRect(0,0,N,N);wc.save();wc.translate(N/2,N/2);wc.rotate(state.rotation*Math.PI/180);
  wc.fillStyle='black';wc.fillRect(-width*ratio/2,-height*ratio/2,width*ratio,height*ratio);wc.restore();
  const bounds=wc.getImageData(0,0,N,N).data;
  for(let i=0;i<target.length;i++)target[i]=bounds[i*4+3]>127?1-target[i]:0;
 }
 wax.fill(0);undo=[];invalidateResult();
}
const slider=(id,label,value,min,max,step,suffix='')=>`<div class="slider-row"><label class="slider-head" for="${id}">${label}<output>${value}${suffix}</output></label><input id="${id}" type="range" value="${value}" min="${min}" max="${max}" step="${step}"></div>`;
function knowledgeEntry(){
 const card=cardForStep(state.step);
 return `<button class="knowledge-entry" data-knowledge="${card.id}"><span class="mini-seal" aria-hidden="true">识</span><span><small>蜡染小知识</small>${esc(card.title)}</span><b aria-hidden="true">›</b></button>`;
}
function paletteChoices(){
 return `<div class="palette-list" role="radiogroup" aria-label="染色颜色">${PALETTES.map(p=>`<button class="palette-button ${p.id===state.paletteId?'selected':''}" data-palette="${p.id}" role="radio" aria-checked="${p.id===state.paletteId}" aria-label="${p.name}"><i style="--swatch:${p.accent}"></i><span>${p.name}</span>${p.id==='indigo'?'<small>传统参考</small>':'<small>创意配色</small>'}</button>`).join('')}</div>`;
}

function render(){
 trail.setEnabled(state.step===2&&!busy);
 applyTheme();document.body.dataset.step='wax-'+state.step;
 $('#steps').innerHTML=STEPS.map((label,index)=>`<button class="step ${index===state.step?'current':''} ${index<state.step?'done':''}" data-step="${index}" aria-current="${index===state.step?'step':'false'}"><span class="step-num">${String(index+1).padStart(2,'0')}</span><span>${label}</span></button>`).join('');
 $('#mobile-progress-label').textContent=`${String(state.step+1).padStart(2,'0')} / 07 · ${STEPS[state.step]}`;
 $('#stage-label').textContent=`${String(state.step+1).padStart(2,'0')} / ${state.name}`;
 $('#stage-meta').textContent=`${state.fabric==='linen'?'棉麻':'细棉布'} · ${palette().name}`;
 $('#canvas-hint').textContent=state.step===2?'按住画布，沿灰色图案描蜡；画布之外仍可上下滚动。':'图案里的每一处细节，都留在这一方布上。';
 const headings=['把喜欢的图案，染进布里。','先看清，哪里会留白。','沿着图案，慢慢描蜡。','调一抹属于你的颜色。','让颜色，慢慢进入纤维。','洗去蜡，留下图案。','这一方蜡染，属于你。'];
 let html=`<h2>${headings[state.step]}</h2><p class="chapter-mark">第 ${String(state.step+1).padStart(2,'0')} 章 · ${STEPS[state.step]}</p>`;
 if(state.step===0){
  const visible=showMore?templates:templates.slice(0,FEATURED_COUNT),remaining=templates.length-FEATURED_COUNT;
  html+=`<p class="description">选一张人物图纸，或带上自己的黑白画。保留内部细节，不自动添加边饰。</p><div class="template-grid wax-gallery">${visible.map(t=>`<button class="template-button ${t.id===state.id?'selected':''}" data-template="${t.id}" aria-pressed="${t.id===state.id}">${t.src?`<img src="${t.src}" alt="">`:`<canvas data-mask-thumb="${t.id}" width="160" height="100" aria-hidden="true"></canvas>`}<span>${t.name}</span><small>${t.kind}</small></button>`).join('')}</div><button id="more-templates" class="more-templates" aria-expanded="${showMore}">${showMore?'收起更多图纸 ↑':`更多图纸 · 还有 ${remaining} 张 →`}</button><button id="upload" class="upload-button">＋ 上传黑白图纸 / 透明 PNG</button><input id="file" type="file" accept="image/png,image/jpeg" hidden><p class="upload-note">PNG / JPG，最多 8 MB、1600 万像素。照片自动转线稿暂未开放。</p>`;
 }
 if(state.step===1)html+=`<p class="description">染色区域使用当前颜色，浅色表示计划涂蜡。眼睛、衣纹和小孔洞都会保留。</p>`+slider('scale','图案大小',Math.round(state.scale*100),45,90,1,'%')+slider('rotation','旋转',state.rotation,-45,45,1,'°')+slider('threshold','黑白分界',state.threshold,50,230,1)+`<button id="invert" class="soft-button">${state.invert?'恢复':'反相'}染色与留白</button><p class="info-note">调整图纸会清空后续描蜡和浸染进度。</p>`;
 if(state.step===2)html+=`<p class="description">金色是已经涂上的蜡。笔触只落在图案区域，细小位置可以辅助完成。</p><div class="big-number"><span id="coverage">${Math.round(coverage(target,wax)*100)}</span><small>%</small></div>`+slider('brush','蜡笔大小',state.brush,5,42,1)+`<div class="tool-row"><button id="undo">撤回上一笔</button><button id="assist">辅助填完图案</button></div><label class="hint-box preview-toggle"><input id="preview" type="checkbox" ${state.preview?'checked':''}> 查看当前涂蜡的染后预览</label><canvas id="mini-preview" class="wax-mini" width="160" height="160" aria-label="当前描蜡的染后小样" hidden></canvas><p class="info-note">可保留没涂满的地方；至少覆盖 5% 图案后才能入染。</p>`;
 if(state.step===3)html+=`<p class="description">每次使用一种颜色。靛蓝是传统视觉参考，其余为数字创意配色。</p>${paletteChoices()}<div class="tool-row fabric-choice"><button data-fabric="cotton" aria-pressed="${state.fabric==='cotton'}">${state.fabric==='cotton'?'✓ ':''}细棉布</button><button data-fabric="linen" aria-pressed="${state.fabric==='linen'}">${state.fabric==='linen'?'✓ ':''}棉麻</button></div><p class="material-note">${state.fabric==='cotton'?'细棉布：纹理细腻、颗粒更轻，适合五官与细线较多的图纸。':'棉麻：表面颗粒更明显，画面更质朴；图案形状与细节保持不变。'}</p>`+slider('strength','颜色浓淡',Math.round(state.strength*100),40,100,1,'%')+slider('bleed','边缘渗色',Math.round(state.bleed*100),0,65,1,'%')+`<p class="material-note">渗色调低，蓝白交界更利落；调高，边沿带入更多浅色并略有斑驳，不改变图案形状。</p><p class="info-note">布料、颜色与渗色均为视觉模拟，不代表实物染色预测。</p>`;
 if(state.step===4)html+=`<p class="description">白布先保持原色。染液完全没过布面后，达到 100% 才显示染色结果。</p><div class="big-number"><span id="dye-progress">${Math.floor(state.immersion*100)}</span><small>%</small></div><button id="start-dye" class="soft-button">${state.immersion>=1?'重新浸染':'开始 / 继续浸染'}</button>`;
 if(state.step===5)html+=`<p class="description">点击布面或按钮，金黄色蜡迹会分解成方形像素并向下崩落。约 2.6 秒后，防染留白完整显现。</p><button id="remove-wax" class="soft-button">洗去蜡 · 显出图案</button>`;
 if(state.step===6)html+=`<span class="result-tag">${palette().name} · ${state.fabric==='linen'?'棉麻':'细棉布'} · 手作体验</span><p class="description">${esc(state.name)}，染好了。保存干净作品图，也可以通过手机系统分享给朋友。</p><div class="completion-actions"><button id="open-save" class="primary">保存作品</button><button id="share-work" class="soft-button" ${navigator.share?'disabled':'hidden'}>${navigator.share?'正在准备分享图片…':'当前浏览器不支持系统分享'}</button></div><div class="result-tools"><button id="redye" class="soft-button">换一种颜色</button><button id="repattern" class="soft-button">换一张图纸</button></div><p class="save-note">默认生成 1600 × 1600 PNG。系统是否提供“保存到相册”或微信，由手机和浏览器决定。</p>`;
 html+=knowledgeEntry();
 $('#panel').innerHTML=html;
 $('#back').hidden=state.step===0;$('#next').hidden=false;
 $('#next').textContent=state.step===6?'保存作品':state.step===5?'洗去蜡 →':'下一步 →';$('#next').disabled=busy||dewaxRunning;
 $('#step-note').textContent=busy?'正在准备图纸…':'数字手作体验 · 作品默认只保存在当前设备';
 bind();draw();
 if(state.step===6)primeExport();
}
function stopAnimation(){cancelAnimationFrame(drawVersion);drawVersion=0;started=0;removal.stop();audio.stopAll();dewaxRunning=false;$('#canvas-wrap').removeAttribute('aria-busy');}
function go(index){
 if(busy)return;
 if(index===6&&state.step===5&&dewaxProgress<1){startDewax();return;}
 if(index>=3&&coverage(target,wax)<.05){notify('先描一点蜡，或使用辅助完成。');return;}
 if(index>=5&&!state.dyeComplete){notify('先完成浸染，再去蜡显图。');return;}
 stopAnimation();dewaxProgress=0;state.step=index;state.preview=false;transition();render();
 $('#panel').scrollTop=0;
 $('#steps').classList.remove('mobile-open');$('#mobile-progress').setAttribute('aria-expanded','false');$('#mobile-progress small').textContent='查看全部步骤';
}
function startDewax(){
 if(dewaxRunning||state.step!==5)return;
 clearTimeout(timer);$('#toast').classList.remove('visible');
 dewaxRunning=true;dewaxProgress=0;$('#canvas-wrap').setAttribute('aria-busy','true');
 const button=$('#remove-wax'),next=$('#next'),back=$('#back');
 if(button){button.disabled=true;button.textContent='金色像素正在崩落…';}if(next)next.disabled=true;if(back)back.disabled=true;
 audio.collapse(removal.duration/1000);
 removal.start(wax,N,state.seed);draw();
}
function bind(){
 const more=$('#more-templates');if(more)more.onclick=()=>{showMore=!showMore;render();};
 document.querySelectorAll('[data-mask-thumb]').forEach(async thumb=>{
  try{
   const image=await templateSource(templates.find(t=>t.id===thumb.dataset.maskThumb));if(!thumb.isConnected)return;
   const g=thumb.getContext('2d'),ratio=Math.min(thumb.width/image.width,thumb.height/image.height);
   g.fillStyle='white';g.fillRect(0,0,thumb.width,thumb.height);
   g.drawImage(image,(thumb.width-image.width*ratio)/2,(thumb.height-image.height*ratio)/2,image.width*ratio,image.height*ratio);
  }catch{thumb.setAttribute('aria-label','图纸缩略图暂未载入');}
 });
 document.querySelectorAll('[data-template]').forEach(button=>button.onclick=()=>load(templates.find(t=>t.id===button.dataset.template)));
 document.querySelectorAll('#steps [data-step]').forEach(button=>button.onclick=()=>go(+button.dataset.step));
 for(const id of ['scale','rotation','threshold','brush','strength','bleed']){
  const element=$('#'+id);if(!element)continue;
  element.oninput=()=>{
   const value=+element.value;state[id]=['scale','strength','bleed'].includes(id)?value/100:value;
   if(['scale','rotation','threshold'].includes(id))rebuild();
   if(['strength','bleed'].includes(id))invalidateResult();
   element.previousElementSibling.querySelector('output').textContent=value+(['scale','strength','bleed'].includes(id)?'%':id==='rotation'?'°':'');
   draw();
  };
 }
 const invert=$('#invert');if(invert)invert.onclick=()=>{state.invert=!state.invert;rebuild();render();};
 const assist=$('#assist');if(assist)assist.onclick=()=>{saveUndo();wax.set(target);invalidateResult();render();};
 const undoButton=$('#undo');if(undoButton)undoButton.onclick=()=>{if(undo.length){wax=undo.pop();invalidateResult();render();}else notify('还没有可以撤回的笔触。');};
 const preview=$('#preview');if(preview)preview.onchange=event=>{state.preview=event.target.checked;draw();};
 document.querySelectorAll('[data-fabric]').forEach(button=>button.onclick=()=>{state.fabric=button.dataset.fabric;invalidateResult();render();});
 document.querySelectorAll('button[data-palette]').forEach(button=>button.onclick=()=>{state.paletteId=button.dataset.palette;invalidateResult();render();});
 const startDye=$('#start-dye');if(startDye)startDye.onclick=()=>{
  stopAnimation();if(state.dyeComplete){state.immersion=0;state.dyeComplete=false;}dyeBefore=state.immersion;started=performance.now();
  audio.immersion(5.5*(1-dyeBefore));
  const animate=now=>{
   state.immersion=clamp(dyeBefore+(now-started)/5500);$('#dye-progress').textContent=Math.floor(state.immersion*100);draw(now);
   if(state.immersion<1)drawVersion=requestAnimationFrame(animate);else{state.dyeComplete=true;started=0;drawVersion=0;notify('浸染完成，可以去蜡了。');}
  };drawVersion=requestAnimationFrame(animate);
 };
 const removeWax=$('#remove-wax');if(removeWax)removeWax.onclick=startDewax;
 const redye=$('#redye');if(redye)redye.onclick=()=>go(3);
 const repattern=$('#repattern');if(repattern)repattern.onclick=()=>go(0);
 const uploadButton=$('#upload');if(uploadButton)uploadButton.onclick=()=>$('#file').click();
 const file=$('#file');if(file)file.onchange=event=>upload(event.target.files[0]);
 document.querySelectorAll('[data-knowledge]').forEach(button=>button.onclick=()=>openKnowledge(cardForStep(state.step)));
 const save=$('#open-save');if(save)save.onclick=()=>openSavePanel('art');
}
$('#back').onclick=()=>go(state.step-1);
$('#next').onclick=()=>state.step===6?openSavePanel('art'):state.step===5?startDewax():go(state.step+1);

async function upload(file){
 if(!file)return;const version=++loadVersion;busy=true;render();
 try{
  if(file.size>8*1024*1024)throw Error('图片超过 8 MB，请缩小后上传。');
  const header=inspectImageHeader(await file.slice(0,262144).arrayBuffer());
  if(header.width*header.height>16000000)throw Error('图片超过 1600 万像素，请缩小后上传。');
  const url=URL.createObjectURL(file),image=new Image();
  try{image.src=url;await image.decode();}finally{URL.revokeObjectURL(url);}
  if(version!==loadVersion)return;source=image;state.name=file.name.replace(/\.[^.]+$/,'').slice(0,48);state.id='upload';state.scale=.78;state.rotation=0;state.invert=false;state.threshold=170;rebuild();state.step=1;
 }catch(error){notify(error.message||'图片读取失败，原图纸已保留。');}
 finally{if(version===loadVersion){busy=false;render();}}
}
function saveUndo(){undo.push(wax.slice());if(undo.length>12)undo.shift();}
function dyed(){
 if(dirty||!cached){cached=renderDye(wax,N,{...state,dye:palette().dye});rc.putImageData(new ImageData(cached,N,N),0,0);dirty=false;}
 return result;
}
function waxLayer(){
 if(goldDirty){
  const image=gc.createImageData(N,N);
  for(let i=0;i<N*N;i++)if(wax[i]){const offset=i*4;image.data[offset]=255;image.data[offset+1]=210;image.data[offset+2]=31;image.data[offset+3]=232;}
  gc.clearRect(0,0,N,N);gc.putImageData(image,0,0);goldDirty=false;
 }
 return goldWax;
}
function draw(time=performance.now()){
 canvas.style.touchAction=state.step===2?'none':'auto';
 ctx.clearRect(0,0,800,800);ctx.fillStyle='#e4e1d8';ctx.fillRect(0,0,800,800);
 const margin=72,size=656;ctx.save();ctx.shadowColor='#27374a25';ctx.shadowBlur=19;ctx.shadowOffsetY=9;ctx.fillStyle='#f1eedf';ctx.fillRect(margin,margin,size,size);ctx.restore();
 if(state.step===1){
  wc.putImageData(new ImageData(renderDye(target,N,{...state,dye:palette().dye}),N,N),0,0);ctx.drawImage(work,margin,margin,size,size);
 }else if(state.step===4&&!immersionFrame(state.immersion).showResult){
  ctx.fillStyle='#fff';ctx.fillRect(margin,margin,size,size);const frame=immersionFrame(state.immersion);
  drawWater(ctx,{x:42,y:frame.waterY,width:716,height:frame.bottom-frame.waterY,color:palette().water,time,opaque:true});
 }else if(state.step>=3)ctx.drawImage(dyed(),margin,margin,size,size);
 else{
  const data=new Uint8ClampedArray(N*N*4);
  for(let i=0;i<N*N;i++){const color=wax[i]?[204,159,67]:target[i]?[164,166,157]:[243,240,225];for(let c=0;c<3;c++)data[i*4+c]=color[c];data[i*4+3]=255;}
  wc.putImageData(new ImageData(data,N,N),0,0);ctx.drawImage(work,margin,margin,size,size);
 }
 if(state.step===5){
  if(!dewaxRunning)ctx.drawImage(waxLayer(),margin,margin,size,size);
  if(!dewaxRunning){ctx.fillStyle='rgba(248,243,232,.88)';ctx.fillRect(240,371,320,58);ctx.fillStyle='#26384c';ctx.font='20px "Songti SC",serif';ctx.textAlign='center';ctx.fillText('点击布面 · 洗去防染的蜡',400,407);}
 }
 const mini=$('#mini-preview');if(mini){mini.hidden=!state.preview;if(state.preview)mini.getContext('2d').drawImage(dyed(),0,0,160,160);}
}
function point(event){const rect=canvas.getBoundingClientRect();return{x:((event.clientX-rect.left)/rect.width*800-72)/656*N,y:((event.clientY-rect.top)/rect.height*800-72)/656*N};}
function trailPoint(point){return{x:(72+point.x/N*656)/800,y:(72+point.y/N*656)/800};}
canvas.addEventListener('pointerdown',event=>{
 if(state.step===5){startDewax();return;}if(state.step!==2||busy)return;
 const p=point(event);if(p.x<0||p.y<0||p.x>=N||p.y>=N)return;
 event.preventDefault();saveUndo();drag=true;last=p;audio.startWax();audio.updateWax(.18,event.pressure||.5);canvas.setPointerCapture(event.pointerId);paint(target,wax,N,p.x,p.y,state.brush);const feedback=trailPoint(p);trail.splat(feedback.x,feedback.y,state.brush,event.timeStamp);invalidateResult();draw();
});
canvas.addEventListener('pointermove',event=>{
 if(!drag)return;const p=point(event),distance=Math.hypot(p.x-last.x,p.y-last.y),steps=Math.max(1,Math.ceil(distance/(state.brush*.45)));
 for(let index=1;index<=steps;index++)paint(target,wax,N,last.x+(p.x-last.x)*index/steps,last.y+(p.y-last.y)*index/steps,state.brush);
 audio.updateWax(Math.min(1,distance/24),event.pressure||.5);const feedback=trailPoint(p);trail.splat(feedback.x,feedback.y,state.brush,event.timeStamp);last=p;dirty=true;cached=null;draw();
});
function finish(){trail.end();audio.stopWax();if(!drag)return;drag=false;last=null;const value=$('#coverage');if(value)value.textContent=Math.round(coverage(target,wax)*100);}
canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);canvas.addEventListener('lostpointercapture',finish);

function artworkCanvas(size=1600){
 const output=document.createElement('canvas');output.width=output.height=size;
 const g=output.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(dyed(),0,0,size,size);return output;
}
function shareCardCanvas(){
 const card=document.createElement('canvas');card.width=1200;card.height=1600;const g=card.getContext('2d'),art=artworkCanvas(1200);
  g.fillStyle='#f5ead4';g.fillRect(0,0,1200,1600);g.fillStyle='#c8a66a';g.fillRect(58,78,1084,1084);g.fillStyle='#ead8b9';g.fillRect(70,90,1060,1060);g.drawImage(art,80,100,1040,1040);
  g.fillStyle='#4b250f';g.textAlign='center';g.font='64px "Ma Shan Zheng","STKaiti","KaiTi",serif';g.fillText('一方蜡染',600,1288);
  g.font='34px "Noto Serif SC","Songti SC",serif';g.fillStyle='#6f3d17';g.fillText('描一笔蜡，留一方白',600,1350);
  g.font='26px "PingFang SC","Microsoft YaHei",sans-serif';g.fillStyle='#806342';g.fillText(`${state.name} · ${palette().name} · ${state.fabric==='linen'?'棉麻':'细棉布'}`,600,1430);
  g.fillStyle='#a34835';g.fillRect(985,1300,72,72);g.fillStyle='#f7ebd8';g.font='42px serif';g.fillText('染',1021,1351);return card;
}
const toBlob=canvas=>new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('图片生成失败')),'image/png'));
function ensureExport(mode='art'){
 const key=`${artRevision}:${mode}`;if(exportCache.has(key))return exportCache.get(key);
 const pending=new Promise(resolve=>setTimeout(resolve,0)).then(()=>toBlob(mode==='card'?shareCardCanvas():artworkCanvas()));
 exportCache.set(key,pending);return pending;
}
async function primeExport(){
 try{
  await ensureExport('art');const share=$('#share-work');
  if(share&&navigator.share){share.disabled=false;share.textContent='打开系统分享';share.onclick=sharePrepared;}
 }catch{const share=$('#share-work');if(share){share.disabled=true;share.textContent='分享图片准备失败';}}
}
async function openSavePanel(mode){
 modal('<div class="save-loading"><span class="mini-seal">存</span><h2>正在准备清晰作品图…</h2><p>作品只在当前设备生成。</p></div>','paper-sheet save-sheet');
 try{
  const blob=await ensureExport(mode);if(saveUrl)URL.revokeObjectURL(saveUrl);saveUrl=URL.createObjectURL(blob);
  const canShare=Boolean(navigator.share&&navigator.canShare&&navigator.canShare({files:[new File([blob],'一方蜡染.png',{type:'image/png'})]}));
  modal(`<section class="save-panel"><div class="sheet-title"><span class="mini-seal">存</span><p>保存作品</p><h2>${mode==='card'?'竖版分享卡':'干净作品图'}</h2></div><div class="export-tabs"><button data-export-mode="art" aria-pressed="${mode==='art'}">纯作品</button><button data-export-mode="card" aria-pressed="${mode==='card'}">分享卡</button></div><img class="save-preview" src="${saveUrl}" alt="${mode==='card'?'带题签的竖版蜡染分享卡':'蜡染作品'}"><p class="save-guidance">手机可长按图片尝试保存；“下载 PNG”可能进入浏览器下载目录。系统是否显示相册或微信，由设备决定。</p><div class="dialog-actions"><button id="download-export" class="primary">下载 PNG</button>${canShare?'<button id="share-export" class="secondary">系统分享</button>':''}</div></section>`,`paper-sheet save-sheet save-sheet-${mode}`);
 }catch{modal('<div class="sheet-title"><span class="mini-seal">歉</span><h2>图片生成失败</h2></div><p>作品仍保留在页面中，请关闭后重试。</p>','paper-sheet');}
}
async function prepared(mode='art'){return {blob:await ensureExport(mode),name:`一方蜡染-${state.name.replace(/[\\/:*?"<>|]/g,'_')}${mode==='card'?'-分享卡':''}.png`};}
async function downloadPrepared(){
 try{const mode=$('[data-export-mode][aria-pressed="true"]')?.dataset.exportMode||'art',item=await prepared(mode),url=URL.createObjectURL(item.blob),link=document.createElement('a');link.href=url;link.download=item.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);notify('已发起 PNG 下载，请查看浏览器下载记录。');}
 catch{notify('下载准备失败，请重试。');}
}
async function sharePrepared(){
 if(!navigator.share){notify('当前浏览器不支持系统分享，请先保存图片。');return;}
 try{const item=await prepared('art'),file=new File([item.blob],item.name,{type:'image/png'});if(navigator.canShare&&!navigator.canShare({files:[file]})){openSavePanel('art');notify('当前浏览器不能分享图片文件，请先下载。');return;}await navigator.share({title:'一方蜡染',text:'描一笔蜡，留一方白',files:[file]});}
 catch(error){if(error.name!=='AbortError')notify('系统分享未完成，作品仍可保存。');}
}

load(templates[0]);
const warmKnowledge=()=>preloadKnowledge(KNOWLEDGE[0]);
if('requestIdleCallback' in window)requestIdleCallback(warmKnowledge,{timeout:1800});else setTimeout(warmKnowledge,600);
