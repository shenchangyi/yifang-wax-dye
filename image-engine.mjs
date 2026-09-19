import {validatePath} from './engine.mjs';
// Narrow local prototype: dark, connected subject on a light background.
// No model, no network and no promise to extract arbitrary photographs.
export function inspectImageHeader(buffer){const b=new Uint8Array(buffer),v=new DataView(buffer);
 if(b.length>=24&&b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71)return {type:'image/png',width:v.getUint32(16),height:v.getUint32(20)};
 if(b[0]===255&&b[1]===216){let p=2;while(p+8<b.length){if(b[p]!==255){p++;continue;}const marker=b[p+1];p+=2;if(marker===0xD9||marker===0xDA)break;if(marker===0xD8||(marker>=0xD0&&marker<=0xD7))continue;const len=v.getUint16(p);if(len<2||p+len>b.length)break;if([0xC0,0xC1,0xC2,0xC3,0xC5,0xC6,0xC7,0xC9,0xCA,0xCB,0xCD,0xCE,0xCF].includes(marker))return {type:'image/jpeg',height:v.getUint16(p+3),width:v.getUint16(p+5)};p+=len;}}
 throw new Error('请使用有效的 PNG 或 JPEG 图片。');
}
function simplify(points,eps){if(points.length<=3)return points;const a=points[0],b=points.at(-1),dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);let max=0,index=0;for(let i=1;i<points.length-1;i++){const p=points[i],d=len?Math.abs(dy*p.x-dx*p.y+b.x*a.y-b.y*a.x)/len:Math.hypot(p.x-a.x,p.y-a.y);if(d>max){max=d;index=i;}}if(max>eps)return [...simplify(points.slice(0,index+1),eps).slice(0,-1),...simplify(points.slice(index),eps)];return [a,b];}
export function extractContour(gray,width,height,threshold=170){if(gray.length!==width*height||width<3||height<3)throw new Error('图片尺寸无效。');const binary=Uint8Array.from(gray,v=>v<threshold?1:0),visited=new Uint8Array(binary.length),queue=new Int32Array(binary.length);let largest=[],dark=0;
 for(let i=0;i<binary.length;i++){if(binary[i])dark++;if(!binary[i]||visited[i])continue;let head=0,tail=1;queue[0]=i;visited[i]=1;const part=[];while(head<tail){const at=queue[head++];part.push(at);const x=at%width,y=Math.floor(at/width),neighbors=[];if(x)neighbors.push(at-1);if(x<width-1)neighbors.push(at+1);if(y)neighbors.push(at-width);if(y<height-1)neighbors.push(at+width);for(const next of neighbors)if(binary[next]&&!visited[next]){visited[next]=1;queue[tail++]=next;}}if(part.length>largest.length)largest=part;}
 if(dark<12||dark/binary.length>.72||largest.length<12)throw new Error('没有找到清楚的主体。请试试白底黑线或剪影，也可以选一个模板。');
 if(largest.length/dark<.4)throw new Error('图里的细节比较分散。请换一张主体连贯、背景干净的线稿。');
 const mask=new Set(largest),edges=new Map;let edgeCount=0;const key=(x,y)=>y*(width+1)+x;
 const add=(x1,y1,x2,y2)=>{const k=key(x1,y1),edge={from:{x:x1,y:y1},to:{x:x2,y:y2},used:false};if(!edges.has(k))edges.set(k,[]);edges.get(k).push(edge);edgeCount++;};
 for(const i of largest){const x=i%width,y=Math.floor(i/width);if(!y||!mask.has(i-width))add(x,y,x+1,y);if(x===width-1||!mask.has(i+1))add(x+1,y,x+1,y+1);if(y===height-1||!mask.has(i+width))add(x+1,y+1,x,y+1);if(!x||!mask.has(i-1))add(x,y+1,x,y);}
 const loops=[];for(const group of edges.values())for(const first of group){if(first.used)continue;let current=first,loop=[],guard=0;while(current&&!current.used&&guard++<=edgeCount){current.used=true;loop.push(current.from);if(current.to.x===first.from.x&&current.to.y===first.from.y){loops.push(loop);break;}current=(edges.get(key(current.to.x,current.to.y))??[]).find(e=>!e.used);}}
 const area=pts=>Math.abs(pts.reduce((sum,p,i)=>{const q=pts[(i+1)%pts.length];return sum+p.x*q.y-p.y*q.x;},0));loops.sort((a,b)=>area(b)-area(a));let points=loops[0];if(!points||points.length<6)throw new Error('轮廓还不够完整，请换一张线条连贯的图片。');
 const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x)),minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y)),extent=Math.max(maxX-minX,maxY-minY);if(extent<8)throw new Error('图案太小了，请先放大主体再选择。');
 // Split the closed loop in two for RDP, so coincident endpoints do not collapse it.
 const half=Math.floor(points.length/2);points=[...simplify(points.slice(0,half+1),.8).slice(0,-1),...simplify([...points.slice(half),points[0]],.8).slice(0,-1)];
 points=points.map(p=>({x:.5+(p.x-(minX+maxX)/2)/extent*.7,y:.5+(p.y-(minY+maxY)/2)/extent*.7}));
 if(!validatePath(points))throw new Error('轮廓太细或太复杂，换一个简单图案会更好。');
 return {points,warning:'仅保留最大主体的外轮廓，内部细节未提取。',coverage:largest.length/dark};
}
