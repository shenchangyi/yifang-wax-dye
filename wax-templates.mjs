export const TEMPLATES=[
 ...[1,2,3].map(i=>({id:'portrait-'+i,name:['圆框 · 鹿野师姐','圆框 · 罗小黑','圆框 · 无限师父'][i-1],kind:'人物',src:`templates/portrait-${i}.jpg`})),
 {id:'pair',name:'圆框 · 君清99',kind:'双人',mask:'templates/pair.mask.json'},
 {id:'cat-friend',name:'和小猫坐一会',kind:'无限',src:'templates/cat-friend.png'},
 {id:'calm-friend',name:'今天很淡定',kind:'鹿野',src:'templates/calm-friend.png'},
 {id:'cup-friend',name:'举杯的小快乐',kind:'哪吒',src:'templates/cup-friend.png'},
 {id:'snack-friend',name:'吃点好吃的',kind:'罗小黑',src:'templates/snack-friend.png'},
 {id:'poster',name:'罗小黑战记',kind:'复杂图纸',mask:'templates/poster.mask.json'}
];
export const FEATURED_COUNT=6;
const cache=new Map();
export async function templateSource(t){
 if(cache.has(t.id))return cache.get(t.id);
 const pending=(async()=>{
  if(t.src){const img=new Image();img.src=t.src;await img.decode();return img;}
  const response=await fetch(t.mask);if(!response.ok)throw Error('图纸读取失败');const {width,height,bits}=await response.json();
  const packed=atob(bits),c=document.createElement('canvas');c.width=width;c.height=height;const g=c.getContext('2d'),pixels=g.createImageData(width,height);
  for(let i=0;i<width*height;i++){const value=(packed.charCodeAt(i>>3)&(1<<(i&7)))?0:255;pixels.data[i*4]=pixels.data[i*4+1]=pixels.data[i*4+2]=value;pixels.data[i*4+3]=255;}
  g.putImageData(pixels,0,0);return c;
 })();cache.set(t.id,pending);try{return await pending;}catch(e){cache.delete(t.id);throw e;}
}
