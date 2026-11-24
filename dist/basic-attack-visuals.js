(function(root){
'use strict';
const path='assets/combat/basic-attacks.png';
const ids=['warrior','archer','mage','cleric','assassin','defender','lancer'];
let image;
function rect(i){const x=Math.floor(i%4*1774/4),y=Math.floor(Math.floor(i/4)*887/2);return [x,y,Math.floor((i%4+1)*1774/4)-x,Math.floor((Math.floor(i/4)+1)*887/2)-y]}
function shotIndex(s){if(s.archerBasic&&!s.burstRadius)return 1;if(s.kind==='arcane'&&!s.explosionRadius)return 2;if(s.kind==='holy')return 3;return -1}
function each(party,draw){
 for(const s of party.projectiles){if(!s.active)continue;const i=shotIndex(s);if(i>=0)draw(i,s.x,s.y,i===1?74:65,s.angle,1)}
 for(const fx of party.effects){if(!fx.basicClass||fx.life<=0)continue;const i=ids.indexOf(fx.basicClass),progress=1-fx.life/fx.duration;
  const reach=fx.size*(.36+progress*.23);
  draw(i,fx.x+Math.cos(fx.angle)*reach,fx.y+Math.sin(fx.angle)*reach,fx.size*.9,fx.angle,Math.min(1,fx.life/.09));
 }
}
async function createPixi(PIXI,parent){
 const atlas=await PIXI.Assets.load(path);
 const textures=ids.map((_,i)=>new PIXI.Texture(atlas.baseTexture,new PIXI.Rectangle(...rect(i))));
 const sprites=Array.from({length:144},()=>{const sprite=new PIXI.Sprite(textures[0]);sprite.anchor.set(.5);sprite.visible=false;parent.addChild(sprite);return sprite});
 return {textures,sprites};
}
function drawPixi(rig,party){
 let used=0;
 each(party,(i,x,y,size,angle,alpha)=>{const s=rig.sprites[used++];s.texture=rig.textures[i];s.position.set(x,y);s.width=s.height=size*2*1.15*1.20**2;s.rotation=angle;s.alpha=alpha;s.visible=true});
 for(let i=used;i<rig.sprites.length;i++)rig.sprites[i].visible=false;
}
const rects=ids.map((_,i)=>rect(i));
function drawCanvas(ctx,party){
 if(!image?.naturalWidth)return;
 each(party,(i,x,y,size,angle,alpha)=>{const side=size*2*1.15*1.20**2;ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha=alpha;ctx.drawImage(image,...rects[i],-side/2,-side/2,side,side);ctx.restore()});
}
root.MicroverseBasicVisuals={path,configure:resources=>{image=resources.get(path)},shotIndex,createPixi,drawPixi,drawCanvas};
})(globalThis);
