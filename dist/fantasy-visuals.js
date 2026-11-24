(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MicroverseFantasyVisuals=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const HERO_SIZE=210,COLUMNS=4,COMMON_ROWS=11;
const images={},portraits={},WALK_FRAMES=Object.freeze([1,2,3,2]);
const HERO_IDS=['warrior','archer','mage','cleric','assassin','defender','lancer'];
const PROTAGONISTS=['kael','lyra'];
const SKIN_KEY='microverse_hero_skins_v1';
const skins=Object.create(null);
try {
 const saved=JSON.parse(globalThis.localStorage.getItem(SKIN_KEY)||'{}');
 for(const id of HERO_IDS)if(saved?.[id]==='common')skins[id]='common';
} catch {}
function activeSkin(id){return PROTAGONISTS.includes(id)?'common':skins[id]||'basic'}
function commonSpriteKey(id){return id==='archer'?'archer-common-redesign':id+'-common-v4'}
function applySkin(id,skin){
 if(!HERO_IDS.includes(id)||!['basic','common'].includes(skin))return false;
 if(skin==='common'&&!images[commonSpriteKey(id)])return false;
 skins[id]=skin;
 try {globalThis.localStorage.setItem(SKIN_KEY,JSON.stringify(skins))} catch {}
 return true;
}
function spriteKey(id,skin=activeSkin(id)){return PROTAGONISTS.includes(id)?id:skin==='common'?commonSpriteKey(id):id}
function paths(){return HERO_IDS.flatMap(id=>[id,commonSpriteKey(id)]).concat(PROTAGONISTS).map(key=>'assets/heroes/'+key+'.png').concat(['assets/heroes/protagonist/phone-fx-atlas.webp'])}
function iconPath(id){return PROTAGONISTS.includes(id)?'assets/heroes/protagonist/skill-score.png':'assets/combat/basic-'+id+'-v3.png'}
function isCommonSheet(key){return key.endsWith('-common-v4')}
function sheetRows(key){return isCommonSheet(key)?COMMON_ROWS:4}
function sheetCell(){return 128}
function configure(resources){
 for(const path of paths()){
  const key=path.slice('assets/heroes/'.length).replace(/\.(?:png|webp)$/,''),image=resources.get(path);
  if(image?.naturalWidth){images[key]=image;for(let d=0;d<4;d++)delete portraits[key+':'+d]}
 }
}
function frame(m,skin=activeSkin(m.classId)){
 const direction=m.direction;
 if(skin==='common'&&!PROTAGONISTS.includes(m.classId)&&m.classId!=='archer'){
  if(m.incapacitated>0||m.animState==='down')return 10*COLUMNS+direction;
  if(m.hurtTime>0||m.animState==='hurt')return 9*COLUMNS+direction;
  if(m.animState==='dash')return (7+Math.floor(m.walkPhase)%2)*COLUMNS+direction;
  if(m.animState==='attack'){
   const progress=Math.max(0,1-m.attackTime/(m.attackDuration||1));
   return (4+Math.min(2,Math.floor(progress*3)))*COLUMNS+direction;
  }
 }
 return (m.animState==='walk'||m.animState==='dash'?WALK_FRAMES[Math.floor(m.walkPhase)%4]:m.animState==='attack'?2:0)*COLUMNS+direction;
}
function portrait(id,direction=0,skin=activeSkin(id)){
 const sprite=spriteKey(id,skin),key=sprite+':'+direction;
 if(portraits[key])return portraits[key];
 const image=images[sprite]||images[id],cell=sheetCell(images[sprite]?sprite:id);
 if(!image)return 'assets/heroes/'+sprite+'.png';
 const canvas=document.createElement('canvas');canvas.width=canvas.height=112;
 const context=canvas.getContext('2d');context.imageSmoothingEnabled=false;
 context.drawImage(image,direction*cell,0,cell,cell,0,0,112,112);
 return portraits[key]=canvas.toDataURL('image/png');
}
function spritePose(out,m,size=HERO_SIZE,skin=activeSkin(m.classId)){
 const down=m.incapacitated>0,specialSheet=skin==='common'&&!PROTAGONISTS.includes(m.classId)&&m.classId!=='archer';
 const attack=!down&&m.attackTime>0?Math.sin(Math.PI*m.attackTime/m.attackDuration):0;
 out.x=m.x+Math.cos(m.attackAngle)*attack*7;
 out.y=m.y+Math.sin(m.attackAngle)*attack*7;
 out.rotation=down&&!specialSheet?Math.PI/2:m.animState==='dash'&&!specialSheet?Math.sin(m.animTime*18)*.035:0;
 out.scaleX=1;out.scaleY=down&&!specialSheet?.72:1;
 out.alpha=down?(specialSheet?.75:.38):m.hurtTime>0?.55+.45*Math.sin(m.animTime*80)**2:1;
 out.tint=down?(specialSheet?0xc1b4be:0x958a91):m.hurtTime>0?0xffa9a2:0xffffff;
 out.size=size;out.frame=frame(m,skin);
 return out;
}
const DASH_TRAILS={
 warrior:{color:0xff875d,lanes:[[0,19,.64],[26,6,.32]]},
 archer:{color:0xb5f66c,lanes:[[-16,6,.48],[0,4,.66],[16,6,.48]]},
 mage:{color:0xc48aff,lanes:[[-17,10,.42],[17,10,.42],[0,4,.68]],wave:8},
 cleric:{color:0xffdf89,lanes:[[-27,4,.44],[0,12,.64],[27,4,.44]],wave:4},
 assassin:{color:0xec69bd,lanes:[[-10,7,.58],[10,7,.58]],wave:12},
 defender:{color:0x78cfff,lanes:[[-24,15,.55],[24,15,.55]]},
 lancer:{color:0xffba6f,lanes:[[0,7,.78],[-10,3,.33],[10,3,.33]]}
};
function eachDashRibbon(party,draw){
 let distance=0;
 for(const s of party.dashTrail){
  const style=DASH_TRAILS[s.classId]||DASH_TRAILS.mage,dx=s.bx-s.ax,dy=s.by-s.ay,length=Math.hypot(dx,dy);
  const nx=-dy/length,ny=dx/length,fade=Math.max(0,(s.until-party.time)/.30);
  for(const [offset,width,opacity] of style.lanes){
   const a=offset+Math.sin(distance*.055+offset)*(style.wave||0),b=offset+Math.sin((distance+length)*.055+offset)*(style.wave||0),w=width*fade;
   draw(style.color,fade*opacity,[s.ax+nx*(a-w),s.ay+ny*(a-w),s.bx+nx*(b-w),s.by+ny*(b-w),s.bx+nx*(b+w),s.by+ny*(b+w),s.ax+nx*(a+w),s.ay+ny*(a+w)]);
  }
  distance+=length;
 }
}
function drawPixiDashTrail(graphics,party){
 eachDashRibbon(party,(color,alpha,points)=>graphics.lineStyle(0).beginFill(color,alpha).drawPolygon(points).endFill());
}
function drawTravelerFxCanvas(ctx,f){
 const atlas=images['protagonist/phone-fx-atlas'];
 const cells={travelerRadio:[3,0],travelerUlt:[3,1],travelerBurst:[0,2],travelerHolo:[1,2],travelerBass:[2,2]};
 const cell=cells[f.kind],q=Math.max(0,Math.min(1,f.life/f.duration));
 if(cell&&atlas){const radius=Math.max(18,f.size*1.3225);ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.angle||0);ctx.globalAlpha*=Math.min(.9,q);ctx.globalCompositeOperation='screen';ctx.drawImage(atlas,cell[0]*256,cell[1]*256,256,256,-radius,-radius,radius*2,radius*2);ctx.restore();return true}
 if(f.kind==='travelerNote'){ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.angle);ctx.globalAlpha*=q;ctx.strokeStyle=f.color;ctx.lineWidth=2.5;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(-22,-8+i*5);ctx.lineTo(18,-8+i*5);ctx.stroke()}ctx.fillStyle='#fff';for(const x of [-10,9]){ctx.beginPath();ctx.ellipse(x,0,4,3,-.4,0,Math.PI*2);ctx.fill();ctx.fillRect(x+3,-15,2,15)}ctx.restore();return true}
 if(f.kind==='travelerHit'){ctx.save();ctx.globalAlpha*=q;ctx.strokeStyle=f.color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(f.x,f.y,Math.max(3,f.size*(1-q)),0,Math.PI*2);ctx.stroke();ctx.restore();return true}
 return false;
}
function drawCanvas(ctx,party){
 ctx.save();ctx.shadowBlur=0;ctx.imageSmoothingEnabled=false;
 eachDashRibbon(party,(color,alpha,points)=>{
  ctx.fillStyle='#'+color.toString(16);ctx.globalAlpha=alpha;ctx.beginPath();ctx.moveTo(points[0],points[1]);
  for(let i=2;i<points.length;i+=2)ctx.lineTo(points[i],points[i+1]);ctx.closePath();ctx.fill();
 });ctx.globalAlpha=1;
 const pose={};
 for(const m of party.members){
  const key=spriteKey(m.classId),image=images[key]||images[m.classId];
  if(!image)continue;
  const down=m.incapacitated>0,cell=sheetCell(images[key]?key:m.classId);
  spritePose(pose,m,HERO_SIZE,images[key]?activeSkin(m.classId):'basic');
  ctx.save();ctx.translate(m.x,m.y);ctx.fillStyle='rgba(0,0,0,.24)';ctx.beginPath();ctx.ellipse(0,48,39,14,0,0,Math.PI*2);ctx.fill();
  ctx.translate(pose.x-m.x,pose.y-m.y);ctx.rotate(pose.rotation);ctx.scale(pose.scaleX,pose.scaleY);
  ctx.globalAlpha=pose.alpha;
  ctx.drawImage(image,(pose.frame%COLUMNS)*cell,Math.floor(pose.frame/COLUMNS)*cell,cell,cell,-pose.size/2,-pose.size/2,pose.size,pose.size);
  ctx.restore();
  if(m.isCompanion){ctx.fillStyle='#12121ccc';ctx.fillRect(m.x-35,m.y-91,70,6);ctx.fillStyle=down?'#a79388':'#8ab195';ctx.fillRect(m.x-35,m.y-91,70*(down?globalThis.MicroverseParty.reviveProgress(party,m):m.hp/m.maxHp),6)}
  if(Math.max(m.shield||0,m.guardianRemaining>0?m.guardianShield||0:0)>0){ctx.strokeStyle='#e6d19a';ctx.globalAlpha=.4;ctx.lineWidth=2;ctx.beginPath();ctx.arc(m.x,m.y,58*1.15,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1}
 }
 for(const s of party.projectiles){if(!s.active||s.kind==='crescent'||s.archerVisual||(globalThis.MicroverseBasicVisuals?.shotIndex(s)??-1)>=0)continue;ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.angle);ctx.lineCap='round';if(s.kind==='arrow'||s.kind==='firearrow')ctx.scale(1.3225,1.3225);if(s.kind==='traveler_note'){ctx.strokeStyle='#bd65ff';ctx.shadowColor='#df9cff';ctx.shadowBlur=9;ctx.lineWidth=2.3;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(-25,-8+i*5);ctx.lineTo(17,-8+i*5);ctx.stroke()}ctx.fillStyle='#fff0ff';for(const x of [-11,8]){ctx.beginPath();ctx.ellipse(x,0,5,3.5,-.35,0,Math.PI*2);ctx.fill();ctx.fillRect(x+3,-16,2,17)}ctx.shadowBlur=0}else if(s.kind==='arrow'||s.kind==='firearrow'){ctx.strokeStyle=s.fire?'#f4a34e':'#e8d0a3';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-25,0);ctx.lineTo(10,0);ctx.stroke();ctx.fillStyle=s.fire?'#ffd68b':'#d4e4e9';ctx.beginPath();ctx.moveTo(15,0);ctx.lineTo(3,-5);ctx.lineTo(3,5);ctx.closePath();ctx.fill()}else{ctx.fillStyle=s.kind==='holy'?'#f2dda2':'#a9a8f5';ctx.beginPath();ctx.ellipse(0,0,(s.r||11)*1.3225,((s.r||11)*1.3225)*.7,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.25;ctx.fillRect(-30,-4,24,8)}ctx.restore()}
 drawEffectsCanvas(ctx,party);globalThis.MicroverseBasicVisuals?.drawCanvas(ctx,party);globalThis.MicroverseWarriorVisuals?.drawCanvas(ctx,party);globalThis.MicroverseArcherVisuals?.drawCanvas(ctx,party);globalThis.MicroverseMageVisuals?.drawCanvas(ctx,party);globalThis.MicroverseClericVisuals?.drawCanvas(ctx,party);ctx.restore();
}
function drawEffectsCanvas(ctx,party){for(const f of party.effects){if(f.life<=0||f.kind==='archerExplosion'||(f.basicClass&&globalThis.MicroverseBasicVisuals))continue;if(f.kind.startsWith('traveler')&&drawTravelerFxCanvas(ctx,f))continue;const q=f.life/f.duration,progress=1-q;ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.angle);ctx.strokeStyle=f.color;ctx.fillStyle=f.color;ctx.globalAlpha=Math.min(.8,q);ctx.lineCap='round';if(f.kind==='whirl'){ctx.lineWidth=4+q*7;for(let j=0;j<3;j++){ctx.beginPath();const a=progress*5+j*Math.PI*2/3;ctx.arc(0,0,(f.size*1.3225)*(.6+progress*.35),a,a+1.35);ctx.stroke()}}else if(f.kind==='slash'){ctx.lineWidth=10*q+2;ctx.beginPath();ctx.arc(0,0,(f.size*1.3225)*.72,-.85+progress*.25,.85+progress*.25);ctx.stroke();ctx.lineWidth=2;ctx.strokeStyle='#f7edda';ctx.stroke()}else if(f.kind==='thrust'){ctx.lineWidth=6*q+1;ctx.beginPath();ctx.moveTo((f.size*1.3225)*.2,0);ctx.lineTo((f.size*1.3225)*(.65+.35*progress),0);ctx.stroke()}else if(f.kind==='heal'){ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-14,-progress*30);ctx.lineTo(14,-progress*30);ctx.moveTo(0,-14-progress*30);ctx.lineTo(0,14-progress*30);ctx.stroke()}else{ctx.lineWidth=3+q*4;ctx.beginPath();ctx.arc(0,0,(f.size*1.3225)*(.35+progress*.65),0,Math.PI*2);ctx.stroke()}ctx.restore()}}
function drawPixiEffects(graphics,party){graphics.clear();for(const f of party.effects){if(f.life<=0||f.kind==='archerExplosion'||(f.basicClass&&globalThis.MicroverseBasicVisuals))continue;const q=f.life/f.duration,progress=1-q,color=parseInt(f.color.slice(1),16),ca=Math.cos(f.angle),sa=Math.sin(f.angle);graphics.lineStyle(3+q*4,color,Math.min(.85,q));if(f.kind==='travelerRadio'||f.kind==='travelerUlt'){const radius=f.size*1.3225*(.72+progress*.28),rings=f.kind==='travelerUlt'?5:4;for(let i=0;i<rings;i++)graphics.lineStyle(f.kind==='travelerUlt'?2.3:1.4,0xc768ff,Math.min(.8,q)*(1-i*.11)).drawCircle(f.x,f.y,radius-i*(f.kind==='travelerUlt'?22:15));if(f.kind==='travelerUlt'){const count=12;graphics.lineStyle(2,0xe5b2ff,.7*q);for(let i=0;i<count;i++){const a=i/count*Math.PI*2+performance.now()*.0005;graphics.moveTo(f.x+Math.cos(a)*radius*.78,f.y+Math.sin(a)*radius*.78).lineTo(f.x+Math.cos(a+.18)*radius,f.y+Math.sin(a+.18)*radius)}}continue}else if(f.kind==='travelerHolo'){const radius=f.size*1.3225*(.5+progress*.5);graphics.lineStyle(2,0xb889ff,.75*q).drawEllipse(f.x,f.y,radius*.44,radius*.16);graphics.lineStyle(1.7,0xe0c4ff,.8*q).moveTo(f.x,f.y-radius*.65).lineTo(f.x,f.y+radius*.48).moveTo(f.x-radius*.24,f.y-radius*.28).lineTo(f.x+radius*.24,f.y-radius*.28).moveTo(f.x-radius*.28,f.y+radius*.25).lineTo(f.x+radius*.28,f.y+radius*.25);continue}else if(f.kind==='travelerBass'||f.kind==='travelerBurst'){const radius=f.size*1.3225*(.38+progress*.62);for(let i=0;i<4;i++){const r=radius-i*17;graphics.lineStyle(i===0?3:1.5, i%2?0xe6b2ff:0xf276ff,Math.min(.85,q)*(1-i*.14));graphics.drawCircle(f.x,f.y,r)}for(let i=0;i<8;i++){const a=i*Math.PI/4+performance.now()*.0007;graphics.lineStyle(1.5,0xf3caff,.8*q).moveTo(f.x+Math.cos(a)*radius*.55,f.y+Math.sin(a)*radius*.55).lineTo(f.x+Math.cos(a)*radius,f.y+Math.sin(a)*radius)}continue}else if(f.kind==='whirl'){const r=(f.size*1.3225)*(.6+progress*.35);for(let j=0;j<3;j++)for(let k=0;k<=10;k++){const a=progress*5+j*Math.PI*2/3+k*.135,x=f.x+Math.cos(a)*r,y=f.y+Math.sin(a)*r;if(!k)graphics.moveTo(x,y);else graphics.lineTo(x,y)}}else if(f.kind==='slash'){graphics.lineStyle(2+q*10,color,q);const r=(f.size*1.3225)*.72;for(let j=0;j<=18;j++){const a=f.angle-.85+progress*.25+j/18*1.7,x=f.x+Math.cos(a)*r,y=f.y+Math.sin(a)*r;if(!j)graphics.moveTo(x,y);else graphics.lineTo(x,y)}}else if(f.kind==='thrust')graphics.moveTo(f.x+ca*(f.size*1.3225)*.2,f.y+sa*(f.size*1.3225)*.2).lineTo(f.x+ca*(f.size*1.3225)*(.65+.35*progress),f.y+sa*(f.size*1.3225)*(.65+.35*progress));else if(f.kind==='heal')graphics.moveTo(f.x-14,f.y-progress*30).lineTo(f.x+14,f.y-progress*30).moveTo(f.x,f.y-14-progress*30).lineTo(f.x,f.y+14-progress*30);else graphics.drawCircle(f.x,f.y,(f.size*1.3225)*(.35+progress*.65))}
 for(const s of party.projectiles){if(!s.active||s.kind==='crescent'||s.archerVisual||(globalThis.MicroverseBasicVisuals?.shotIndex(s)??-1)>=0)continue;const color=s.fire?0xffa34e:s.kind==='traveler_note'?0xdb8bff:s.kind==='arrow'?0xe6c796:s.kind==='holy'?0xf3dfa4:0xb0aff7,ca=Math.cos(s.angle),sa=Math.sin(s.angle);if(s.kind==='traveler_note'){graphics.lineStyle(1.8,0xe9b8ff,.85);for(let i=0;i<4;i++)graphics.moveTo(s.x-ca*24+sa*(-8+i*5),s.y-sa*24-ca*(-8+i*5)).lineTo(s.x+ca*17+sa*(-8+i*5),s.y+sa*17-ca*(-8+i*5));graphics.lineStyle(0).beginFill(0xffefff,1).drawCircle(s.x-ca*9,s.y-sa*9,4).drawCircle(s.x+ca*8,s.y+sa*8,4).endFill()}else if(s.kind==='arrow'||s.kind==='firearrow'){graphics.lineStyle(4,color,1).moveTo(s.x-ca*(28.75*1.15),s.y-sa*(28.75*1.15)).lineTo(s.x+ca*(12.65*1.15),s.y+sa*(12.65*1.15));graphics.lineStyle(0).beginFill(s.fire?0xffd68b:0xd4e4e9,1).moveTo(s.x+ca*(18.4*1.15),s.y+sa*(18.4*1.15)).lineTo(s.x+ca*3-sa*(5.75*1.15),s.y+sa*3+ca*(5.75*1.15)).lineTo(s.x+ca*3+sa*(5.75*1.15),s.y+sa*3-ca*(5.75*1.15)).closePath().endFill()}else graphics.lineStyle((s.r||10)*1.2,color,.22).moveTo(s.x-ca*30,s.y-sa*30).lineTo(s.x,s.y).lineStyle(0).beginFill(color,1).drawCircle(s.x,s.y,(s.r||10)*1.3225).endFill()}
 for(const m of party.members){if(Math.max(m.shield||0,m.guardianRemaining>0?m.guardianShield||0:0)>0)graphics.lineStyle(2,0xe6d19a,.4).drawCircle(m.x,m.y,58*1.15)}
}
return{COLUMNS,sheetCell,sheetRows,iconPath,paths,configure,activeSkin,applySkin,spriteKey,frame,portrait,spritePose,drawCanvas,drawPixiEffects,drawPixiDashTrail};
});
