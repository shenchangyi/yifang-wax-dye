export const STEPS = ['intro','pattern','contour','spacing','stitching','gathering','material','dyeing','reveal','result'];
export const clamp = (v, lo=0, hi=1) => Math.max(lo, Math.min(hi, Number.isFinite(Number(v)) ? Number(v) : lo));
export const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
export function random(seed) { let a=seed>>>0; return () => {a=(a+0x6D2B79F5)>>>0;let t=Math.imul(a^(a>>>15),1|a);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;}; }
export function seed() { return globalThis.crypto?.getRandomValues(new Uint32Array(1))[0] ?? (Date.now()>>>0); }
const point=(x,y)=>({x,y});
function curves(start, commands) {
  const out=[point(...start)]; let p=out[0];
  for(const c of commands){const [x1,y1,x2,y2,x3,y3]=c;
    for(let i=1;i<=16;i++){const t=i/16,u=1-t;out.push(point(u*u*u*p.x+3*u*u*t*x1+3*u*t*t*x2+t*t*t*x3,u*u*u*p.y+3*u*u*t*y1+3*u*t*t*y2+t*t*t*y3));}p=point(x3,y3);}
  if(distance(out[0],out.at(-1))<0.00001)out.pop();return out;
}
function polar(count, fn) {return Array.from({length:count},(_,i)=>{const a=i/count*Math.PI*2;const r=fn(a);return point(.5+Math.cos(a)*r,.5+Math.sin(a)*r);});}
const whale=curves([.2,.48],[[.18,.29,.43,.25,.58,.39],[.68,.48,.71,.51,.78,.44],[.78,.38,.86,.32,.9,.35],[.86,.47,.85,.53,.9,.58],[.82,.62,.77,.59,.75,.55],[.68,.68,.56,.74,.4,.7],[.34,.78,.27,.73,.29,.65],[.2,.61,.15,.55,.2,.48]]);
const flower=polar(180,a=>.235+.085*Math.cos(5*a-Math.PI/2));
const butterfly=curves([.5,.39],[[.36,.11,.13,.2,.2,.46],[.1,.57,.26,.79,.47,.6],[.49,.78,.51,.78,.53,.6],[.74,.79,.9,.57,.8,.46],[.87,.2,.64,.11,.5,.39]]);
const cat=curves([.28,.36],[[.27,.3,.23,.18,.28,.19],[.34,.2,.4,.28,.42,.29],[.48,.26,.54,.26,.6,.29],[.63,.25,.7,.18,.75,.19],[.8,.19,.75,.33,.75,.39],[.89,.68,.7,.79,.51,.79],[.28,.79,.12,.62,.28,.36]]);
const cloud=curves([.24,.64],[[.05,.6,.15,.37,.31,.41],[.34,.19,.64,.2,.68,.41],[.89,.35,.94,.64,.77,.66],[.6,.69,.4,.67,.24,.64]]);
export const TEMPLATES=[{id:'whale',name:'鲸鱼',hint:'把海留在布上',points:whale},{id:'flower',name:'花朵',hint:'开一朵不会谢的花',points:flower},{id:'butterfly',name:'蝴蝶',hint:'留住轻轻一振',points:butterfly},{id:'cat',name:'猫',hint:'一只靛蓝小伙伴',points:cat},{id:'cloud',name:'云朵',hint:'染一小片晴空',points:cloud}];
export const FABRICS=[
 {id:'cotton',name:'细棉布',description:'吸色均衡，留白轮廓清楚',diffusion:.35,fiberNoise:.2,softness:.5,absorption:.7,colorBrightness:1},
 {id:'gauze',name:'棉纱布',description:'布面疏松，色晕轻柔地散开',diffusion:.8,fiberNoise:.35,softness:.9,absorption:.8,colorBrightness:1.08},
 {id:'cotton_linen',name:'棉麻布',description:'细小颗粒，留下自然的织纹',diffusion:.5,fiberNoise:.6,softness:.45,absorption:.65,colorBrightness:.96},
 {id:'linen',name:'亚麻布',description:'粗织纹，颜色有深有浅',diffusion:.55,fiberNoise:1,softness:.25,absorption:.6,colorBrightness:.92},
 {id:'silk',name:'真丝',description:'柔软微亮，染色更鲜明',diffusion:.3,fiberNoise:.1,softness:1,absorption:.6,colorBrightness:1.12}
];
export const COLORS=[{name:'靛蓝',hex:'#244D73'},{name:'远山',hex:'#3C7370'},{name:'茜红',hex:'#A84050'},{name:'栀子',hex:'#BD8834'},{name:'紫藤',hex:'#755695'},{name:'墨灰',hex:'#454D5A'},{name:'天青',hex:'#377AA6'},{name:'茶褐',hex:'#846246'}];
export function pathLength(points) { return points.reduce((sum,p,i)=>sum+distance(p,points[(i+1)%points.length]),0); }
export function validatePath(points,spacing=5.5) {
 if(!Array.isArray(points)||points.length<3||points.length>2048)return false;
 if(points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>1||p.y<0||p.y>1))return false;
 const area=points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p.x*q.y-p.y*q.x;},0)/2;
 return Math.abs(area)>.0001&&pathLength(points)*200>=2*spacing;
}
export function samplePath(points,spacingMm=5.5) {
 if(!validatePath(points,spacingMm))return [];
 const total=pathLength(points),count=Math.min(4096,Math.max(3,Math.round(total*200/clamp(spacingMm,3,9)))),gap=total/count;
 const out=[];let seg=0,passed=0;
 for(let i=0;i<count;i++){const target=i*gap;let len=distance(points[seg],points[(seg+1)%points.length]);while(seg<points.length-1&&passed+len<target){passed+=len;seg++;len=distance(points[seg],points[(seg+1)%points.length]);}const a=points[seg],b=points[(seg+1)%points.length],t=len?clamp((target-passed)/len):0;out.push(point(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t));}return out;
}
export function transform(points,scale=1,rotation=0) {const c=Math.cos(rotation),s=Math.sin(rotation);return points.map(p=>{const x=(p.x-.5)*scale,y=(p.y-.5)*scale;return point(clamp(.5+x*c-y*s,.06,.94),clamp(.5+x*s+y*c,.06,.94));});}
export function newProject(template=TEMPLATES[0]) {return {version:1,rendererVersion:'preview-2',step:'intro',revision:0,patternId:template.id,name:template.name,points:structuredClone(template.points),basePoints:structuredClone(template.points),scale:1,rotation:0,spacing:5.5,stitched:[],strokeHistory:[],tension:.5,stability:.7,speed:.5,fabricId:'cotton',color:COLORS[0].hex,concentration:.5,immersion:0,randomSeed:seed()};}
export function invalidate(s,field){s.revision++; if(['pattern','contour','spacing'].includes(field)){s.stitched=[];s.strokeHistory=[];s.tension=.5;} if(['pattern','contour','spacing','stitching'].includes(field))s.immersion=0;}
export function stepBlockedReason(s,target){
 const index=STEPS.indexOf(target);if(index<1)return '请选择制作步骤。';
 if(index===1)return '';
 if(!validatePath(s.points,s.spacing))return '请先选择有效的图案轮廓。';
 if(index>=5){const count=samplePath(s.points,s.spacing).length,ids=new Set(s.stitched);if(ids.size!==count||[...ids].some(i=>!Number.isInteger(i)||i<0||i>=count))return '请先完成走针；修改图案或针距后，需要重新缝线。';}
 if(index>=8&&s.immersion<.5)return '请先浸染至少 5 秒，再查看展开和成品。';
 return '';
}
export function navigateTo(s,target){if(stepBlockedReason(s,target))return false;s.step=target;return true;}
export function setTemplate(s,id){const t=TEMPLATES.find(t=>t.id===id);if(!t)return false;Object.assign(s,{patternId:t.id,name:t.name,points:structuredClone(t.points),basePoints:structuredClone(t.points),scale:1,rotation:0});invalidate(s,'pattern');return true;}
export function canNext(s){if(s.step!=='intro'&&!validatePath(s.points,s.spacing))return false;switch(s.step){case 'pattern':case 'contour':case 'spacing':return true;case 'stitching':return new Set(s.stitched).size===samplePath(s.points,s.spacing).length;case 'dyeing':return s.immersion>=.5;case 'result':return false;default:return true;}}
export function goNext(s){if(!canNext(s))return false;const n=STEPS.indexOf(s.step);s.step=STEPS[Math.min(n+1,STEPS.length-1)];return true;}
export function goBack(s){const n=STEPS.indexOf(s.step);if(n<1)return false;s.step=STEPS[n-1];return true;}
export function snapshot(s){return {version:1,rendererVersion:s.rendererVersion,patternId:s.patternId,source:{kind:s.patternId==='upload'?'upload':'template',processingVersion:'preview-1'},canvas:{widthMm:200,heightMm:200},contourPaths:[{id:'main',closed:true,points:structuredClone(s.points)}],stitch:{spacingMm:s.spacing,pathAccuracy:1,sewnPaths:[{contourId:'main',points:structuredClone(s.points)}]},gathering:{tension:s.tension,stability:s.stability,speed:s.speed},fabric:{...FABRICS.find(f=>f.id===s.fabricId),presetVersion:'preview-1'},dye:{color:s.color,concentration:s.concentration,immersion:s.immersion},randomSeed:s.randomSeed};}
