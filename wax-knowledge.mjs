const PLACEHOLDERS={
 difference:'data:image/webp;base64,UklGRnAAAABXRUJQVlA4IGQAAABwBACdASogABIAP0WMvFSwKaYjMAgCACiJZQAAUf5VZL7LKsZ6A46v5Mz0AADa1GbdU6yWrycreRv4mDTeNOdRJ2hO8L4UJx7tLSgekqfSfyHBk0BOjtPg8+RUZtC9SEgNaAAA',
 resist:'data:image/webp;base64,UklGRn4AAABXRUJQVlA4IHIAAABQBQCdASogABIAP0WKwFewKKajsBgIAgAoiWMArhw0JhqA2vcZhG0m7Dskyj3r0YqygYAA/sOHTPMgraTFPkgaP8tu3Ldi4bfSW+KFzCVvJL1XWHxumUzPe0Oe5jwp1pKhIiPtVfjTqUacnI+b0xlOgAA=',
 colors:'data:image/webp;base64,UklGRnAAAABXRUJQVlA4IGQAAACQBACdASogABIAP0WSvVawKqYjsBgIAgAoiWUAygAPH59AzOgHGJj29uQD/AAA/lP8fF69rn1YFH5X63PPk+WV3ZUrCmVOxcP33NDLCmCi+6xNUYZg3WRYaW2HI5dX8+ngAAAA',
 time:'data:image/webp;base64,UklGRnYAAABXRUJQVlA4IGoAAADQBACdASogABIAP0WOv1cwKaajsBgIAgAoiWMArAAEgFHWpcJcS/cIUHowLPsmgADwGZOjT3rdIKhcgBK8jRo3W4dS8qeD6bT1oyn/IzwtBMSme++4zDPF73zVyRB7YWQAW0iSshLlsYAA',
 crackle:'data:image/webp;base64,UklGRpAAAABXRUJQVlA4IIQAAAAwBQCdASogABIAP0WaxFqwKyckKAgCACiJYwC+SFbSsdKKpGvTE0eyQBn+CKKEY59wYAD+6oIAa858XwtQ24etkf4cHC7aN/s+k5PtXwDLy61Wp1yHF2fo/Y8zphIapuYBaYr7GPZY7GdjjBvo1jFrQBWuau4xm3pE56JKxM1c0AGpHgA=',
 heritage:'data:image/webp;base64,UklGRoAAAABXRUJQVlA4IHQAAACwBACdASogABIAP0WMu1SwKaYjMAgCACiJYwDDNAs7LP8SZrDlvTDwZ6fK+5nAAOjHjp6Oz3xJvCLQ410VyKHf01jdIuGWHSAbIxk2GZs93S9KCgPRubmc6qq8EJqMenaDlgSGW4i9ZjlgtuN3oNBwHKxAAA=='
};

const BASE_KNOWLEDGE=[
 {id:'difference',steps:[0],title:'蜡染和扎染有什么不同？',image:'assets/knowledge/difference.webp',alt:'东方工笔淡彩画面：左侧描蜡工具与布面，右侧扎结布料，表现蜡染与扎染的区别',body:'两者都利用防染形成图案。蜡染以蜡覆盖需要保护的部位；扎染借助扎结等方式限制染液进入。这次体验围绕“描蜡—浸染—去蜡”展开，角色图纸是当代创作题材。',source:'中国非物质文化遗产网',url:'https://www.ihchina.cn/active_detail/25198.html'},
 {id:'resist',steps:[1,2],title:'为什么涂过蜡的地方会留白？',image:'assets/knowledge/resist.webp',alt:'东方工笔淡彩画面：蜡刀在白布上留下金色蜡线，染液绕开蜡层形成留白',body:'蜡在布面形成防染区域，阻挡染液进入；去蜡后，受到保护的区域显露出来。在这次数字体验里，你涂蜡的位置决定留白，反相则会交换准备防染的区域。',source:'中国非物质文化遗产网',url:'https://www.ihchina.cn/active_detail/25198.html'},
 {id:'colors',steps:[3],title:'蓝之外，也能创作吗？',image:'assets/knowledge/colors.webp',alt:'东方工笔淡彩画面：五块蜡染布呈靛蓝、紫、红、绿与棕色的创意配色',body:'这里以蓝白蜡染为视觉参考，也提供紫、红、绿、棕的创意配色。它们是数字作品的美术选择，不是天然植物染料配方；屏幕颜色也不等于真实布料的染色结果。',source:'本项目说明',url:''},
 {id:'time',steps:[4],title:'真实蜡染也只要几秒吗？',image:'assets/knowledge/time.webp',alt:'东方工笔淡彩画面：蜡染工序从描蜡、浸染到去蜡依次展开',body:'这里把浸染压缩成短动画，方便体验防染原理。实际制作还包含画蜡、染色、去蜡等工序；动画百分比是游戏进度，不能换算成真实操作时间。',source:'中国非物质文化遗产网',url:'https://www.ihchina.cn/active_detail/25198.html'},
 {id:'crackle',steps:[5],title:'冰纹从哪里来？',image:'assets/knowledge/crackle.webp',alt:'东方工笔淡彩画面：蓝白蜡染布上呈现自然细密的冰纹裂隙',body:'蜡层折叠开裂或自然龟裂后，染液进入裂隙，会留下细细的纹路，常被称为“冰纹”。这里优先保护角色细节，不会为了手作感强行在每张脸上叠加裂纹。',source:'中国非物质文化遗产网',url:'https://www.ihchina.cn/active_detail/25198.html'},
 {id:'heritage',steps:[6],title:'认识苗族蜡染技艺',image:'assets/knowledge/heritage.webp',alt:'东方工笔淡彩画面：苗族蜡染手艺人在布面上描绘传统纹样',body:'贵州省丹寨县的“苗族蜡染技艺”列入了2006年第一批国家级非物质文化遗产名录。这个网页通过轻量体验帮助认识蜡防染；卡通图案与创意配色属于本项目的创作选择。',source:'第一批国家级非物质文化遗产名录',url:'https://www.ihchina.cn/zhengce_details/11546'}
];
export const KNOWLEDGE=BASE_KNOWLEDGE.map(card=>({...card,placeholder:PLACEHOLDERS[card.id]}));
export function cardForStep(step){return KNOWLEDGE.find(card=>card.steps.includes(step))||KNOWLEDGE[0];}
export function nextCard(id){const index=KNOWLEDGE.findIndex(card=>card.id===id);return KNOWLEDGE[(index+1)%KNOWLEDGE.length];}
