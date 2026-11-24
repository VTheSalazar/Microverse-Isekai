/* Articulated Ocular: transparent component textures are painted once, never per frame. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MicroverseOcularVisuals=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const POINTS=25,ARMS=6,TAU=Math.PI*2;let cached,artInstalled=false,portraitData;
  function assets(){
    if(cached)return cached;
    const make=paint=>{const c=document.createElement('canvas');c.width=c.height=320;const x=c.getContext('2d');x.translate(160,160);paint(x);return c};
    const radial=(x,cx,cy,r,stops)=>{const g=x.createRadialGradient(cx,cy,0,0,0,r);for(let i=0;i<stops.length;i++)g.addColorStop(stops[i][0],stops[i][1]);return g};
    const membrane=make(x=>{
      x.beginPath();x.moveTo(143,0);x.bezierCurveTo(142,-88,58,-131,-36,-119);x.bezierCurveTo(-103,-113,-145,-71,-147,-12);x.bezierCurveTo(-157,63,-88,127,-11,121);x.bezierCurveTo(70,124,149,81,143,0);
      x.fillStyle=radial(x,48,-64,163,[[0,'#aa5dd0'],[.28,'#613080'],[.58,'#361446'],[.84,'#1c0b28'],[1,'#0c0618']]);x.fill();x.save();x.clip();
      for(let i=0;i<38;i++){const a=i*2.399963,r=80+(i%5)*12,cx=Math.cos(a)*r,cy=Math.sin(a)*r*.83;x.strokeStyle=i%3?'rgba(236,108,212,.19)':'rgba(255,59,46,.65)';x.lineWidth=i%3?1.7:2.6;x.beginPath();x.moveTo(cx,cy);x.quadraticCurveTo(cx*.8+Math.sin(i)*20,cy*.7,Math.cos(a+.12)*48,Math.sin(a+.12)*47);x.stroke()}
      x.strokeStyle='rgba(255,170,233,.6)';x.lineWidth=5;x.beginPath();x.ellipse(0,0,133,108,-.1,Math.PI*.95,Math.PI*1.84);x.stroke();
      for(let i=0;i<13;i++){const a=2+i*.31;x.fillStyle=i%2?'#ffb44e':'#ff233f';x.globalAlpha=.45+(i%3)*.13;x.beginPath();x.ellipse(Math.cos(a)*128,Math.sin(a)*104,3.2,1.9,a,0,TAU);x.fill()}
      x.restore();
    });
    const eyeball=make(x=>{x.fillStyle=radial(x,-39,-52,139,[[0,'#fff4a1'],[.30,'#ffc346'],[.65,'#ed6c16'],[.88,'#a52a14'],[1,'#480d28']]);x.beginPath();x.ellipse(0,0,137,130,0,0,TAU);x.fill();x.strokeStyle='rgba(24,14,44,.9)';x.lineWidth=9;x.stroke();for(let i=0;i<12;i++){const a=i*2.399963;x.strokeStyle='rgba(110,91,150,.25)';x.lineWidth=1.8;x.beginPath();x.moveTo(Math.cos(a)*128,Math.sin(a)*121);x.quadraticCurveTo(Math.cos(a+.1)*108,Math.sin(a+.1)*108,Math.cos(a+.05)*96,Math.sin(a+.05)*96);x.stroke()}});
    const iris=make(x=>{x.fillStyle=radial(x,-13,-18,145,[[0,'#fff4a4'],[.23,'#ffdc4a'],[.48,'#ff9919'],[.72,'#f94c0f'],[.90,'#b72027'],[1,'#4b0924']]);x.beginPath();x.arc(0,0,144,0,TAU);x.fill();for(let i=0;i<112;i++){const a=i/112*TAU,r=51+(i%7)*3;x.lineWidth=i%4?1.9:3.5;x.strokeStyle=i%3?'rgba(255,241,137,.70)':'rgba(160,37,9,.68)';x.beginPath();x.moveTo(Math.cos(a)*r,Math.sin(a)*r);x.quadraticCurveTo(Math.cos(a+.03)*99,Math.sin(a+.03)*99,Math.cos(a+.01)*132,Math.sin(a+.01)*132);x.stroke()}x.strokeStyle='rgba(255,194,58,.90)';x.lineWidth=3;x.beginPath();x.arc(0,0,135,0,TAU);x.stroke()});
    const pupil=make(x=>{x.fillStyle='#030610';x.beginPath();x.moveTo(0,-139);x.bezierCurveTo(80,-83,70,87,0,139);x.bezierCurveTo(-70,87,-80,-83,0,-139);x.fill()});
    const gleam=make(x=>{x.fillStyle='rgba(240,255,253,.88)';x.beginPath();x.ellipse(-42,-55,25,12,-.55,0,TAU);x.fill();x.globalAlpha=.5;x.beginPath();x.arc(44,60,8,0,TAU);x.fill()});
    const glow=make(x=>{x.fillStyle=radial(x,0,0,157,[[0,'rgba(255,146,34,.65)'],[.45,'rgba(255,52,25,.30)'],[1,'rgba(255,28,40,0)']]);x.fillRect(-160,-160,320,320)});
    const tendon=make(x=>{const g=x.createLinearGradient(0,-160,0,160);g.addColorStop(0,'#251239');g.addColorStop(.2,'#803d9c');g.addColorStop(.4,'#d67ac9');g.addColorStop(.51,'#af61bb');g.addColorStop(.70,'#672d90');g.addColorStop(1,'#210f3d');x.fillStyle=g;x.fillRect(-160,-160,320,320);x.strokeStyle='rgba(255,92,32,.8)';x.lineWidth=7;x.beginPath();x.moveTo(-160,-53);x.bezierCurveTo(-50,-74,45,-31,160,-52);x.stroke();for(let i=0;i<20;i++){x.strokeStyle='rgba(255,168,231,.13)';x.lineWidth=2;x.beginPath();x.moveTo(-160+i*17,-160);x.lineTo(-180+i*17,160);x.stroke()}});
    const plate=make(x=>{x.fillStyle=radial(x,-50,-40,165,[[0,'#d178e9'],[.3,'#773899'],[.7,'#351146'],[1,'#13091e']]);x.beginPath();x.moveTo(-110,84);x.quadraticCurveTo(-20,16,26,-143);x.quadraticCurveTo(50,-17,118,41);x.lineTo(24,30);x.lineTo(-18,112);x.closePath();x.fill();x.strokeStyle='#eb4d8a';x.lineWidth=4;x.stroke();x.strokeStyle='#ff7338';x.beginPath();x.moveTo(26,-100);x.lineTo(22,-10);x.lineTo(-3,35);x.stroke()});
    cached={membrane,eyeball,iris,pupil,gleam,glow,tendon,plate,plates:membrane,cracks:glow};return cached;
  }
  function installArt(core,limb){
    if(artInstalled||!core?.naturalWidth||!limb?.naturalWidth)return;
    const a=assets(),prepare=(image,sx,sy,sw,sh,w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(image,sx,sy,sw,sh,0,0,w,h);return c};
    a.plates=prepare(core,42,81,1169,1093,512,512);
    a.tendon=prepare(limb,87,183,2013,370,768,160);
    const cracks=prepare(a.plates,0,0,512,512,512,512),context=cracks.getContext('2d'),pixels=context.getImageData(0,0,512,512),data=pixels.data;
    for(let i=0;i<data.length;i+=4){const red=data[i],green=data[i+1],blue=data[i+2];data[i+3]*=red>blue*1.35&&red>110?Math.min(1,(red-blue)/130):0}
    context.putImageData(pixels,0,0);a.cracks=cracks;artInstalled=true;portraitData=undefined;
  }
  function halfWidth(arm,u){return .135+(arm%2)*.008+.10*Math.sin(u*Math.PI*.75)}
  function fillVertices(vertices,pose,arm,size){
    const start=arm*POINTS;
    for(let j=0;j<POINTS;j++){
      const k=start+j,lo=start+Math.max(0,j-1),hi=start+Math.min(POINTS-1,j+1),dx=pose.pathX[hi]-pose.pathX[lo],dy=pose.pathY[hi]-pose.pathY[lo],length=Math.hypot(dx,dy)||1,w=halfWidth(arm,j/(POINTS-1))*size,nx=-dy/length*w,ny=dx/length*w,x=pose.pathX[k]*size,y=pose.pathY[k]*size;
      vertices[j*4]=x+nx;vertices[j*4+1]=y+ny;vertices[j*4+2]=x-nx;vertices[j*4+3]=y-ny;
    }
    return vertices;
  }
  // Shared component placement keeps the Canvas compatibility path anatomically identical.
  function drawCanvas(ctx,p,size){
    const pose=p.combat.bodyPose;if(!pose.initialized)return;const a=assets();ctx.save();ctx.translate(p.x,p.y);ctx.shadowBlur=0;
    for(let arm=0;arm<ARMS;arm++){
      const base=arm*POINTS;
      for(let j=0;j<POINTS-1;j++){const k=base+j,dx=pose.pathX[k+1]-pose.pathX[k],dy=pose.pathY[k+1]-pose.pathY[k],len=Math.hypot(dx,dy)*size,half=halfWidth(arm,j/24)*size;ctx.save();ctx.translate(pose.pathX[k]*size,pose.pathY[k]*size);ctx.rotate(Math.atan2(dy,dx));if(arm<3)ctx.scale(1,-1);ctx.drawImage(a.tendon,a.tendon.width*j/24,0,a.tendon.width/24,a.tendon.height,-.05*len,-half,len*1.12,half*2);ctx.restore()}
    }
    const draw=(image,x,y,w,h,rotation=0)=>{ctx.save();ctx.translate(x*size,y*size);ctx.rotate(rotation);ctx.drawImage(image,-w*size/2,-h*size/2,w*size,h*size);ctx.restore()};
    const recoil=pose.recoil||0;
    draw(a.membrane,-.055*pose.facingX,-.055*pose.facingY,.86*pose.breath*pose.compress,.81*pose.breath,pose.angle);
    draw(a.plates,-recoil*pose.facingX,-recoil*pose.facingY,.98*pose.breath*pose.compress,.98*pose.breath,pose.angle);
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.18+.07*Math.sin(pose.animTime*2.7)+pose.rayOpen*.70;draw(a.cracks,-recoil*pose.facingX,-recoil*pose.facingY,.98*pose.breath*pose.compress,.98*pose.breath,pose.angle);ctx.restore();
    for(let i=0;i<6;i++){const angle=pose.angle+(i+.5)/6*TAU,breath=.005*Math.sin(pose.swim*.8+i*1.4);draw(a.plate,Math.cos(angle)*.34,Math.sin(angle)*.34,.18,.22,angle+Math.PI/2+breath)}
    const eye=.60*(1+.08*pose.rayOpen);draw(a.eyeball,0,0,eye,eye);draw(a.iris,pose.gazeX,pose.gazeY,.40,.40);
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.12+pose.rayOpen*.65;draw(a.glow,pose.gazeX,pose.gazeY,.56,.56);ctx.restore();
    draw(a.pupil,pose.gazeX,pose.gazeY,.13*(1-.13*pose.rayOpen),.35);draw(a.gleam,0,0,eye,eye);ctx.restore();
  }
  function portrait(combat){if(portraitData)return portraitData;const c=document.createElement('canvas');c.width=400;c.height=300;const state=combat.create('ocular'),p={x:256,y:150,r:35,range:0,facingX:1,facingY:0,combat:state};combat.advance(state,1/60,{playing:true,player:p,enemies:[],hit(){}});drawCanvas(c.getContext('2d'),p,148);portraitData=c.toDataURL('image/png');return portraitData}
  return{POINTS,ARMS,assets,installArt,portrait,halfWidth,fillVertices,drawCanvas};
});
