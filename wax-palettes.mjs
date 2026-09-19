export const PALETTES=[
 {id:'indigo',name:'靛蓝',accent:'#315f7f',dark:'#173a55',soft:'#dce8ed',wash:'#9fbecd',dye:'#163a57',water:'#285d7e',hue:'0deg'},
 {id:'purple',name:'烟紫',accent:'#725c79',dark:'#43344b',soft:'#e8e0e9',wash:'#c6b4ca',dye:'#49374f',water:'#735f80',hue:'48deg'},
 {id:'red',name:'绛红',accent:'#98515a',dark:'#592f38',soft:'#f0dfe0',wash:'#d6aeb2',dye:'#623039',water:'#984f59',hue:'118deg'},
 {id:'green',name:'松绿',accent:'#527363',dark:'#2b493c',soft:'#dce8e1',wash:'#a8c3b5',dye:'#2b4a3c',water:'#527765',hue:'-54deg'},
 {id:'brown',name:'赭棕',accent:'#937154',dark:'#5a402d',soft:'#ebe1d6',wash:'#ccb7a2',dye:'#60442f',water:'#947154',hue:'165deg'}
];
export const DEFAULT_PALETTE='indigo';
export function paletteById(id){return PALETTES.find(p=>p.id===id)||PALETTES[0];}
