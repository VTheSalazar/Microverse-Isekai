/* Shared, bounded presentation geometry. Never writes to a combat beam or collider. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MicroverseOcularRay=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const SEGMENTS=128,COUNT=SEGMENTS+1,TAU=Math.PI*2;
  function createFrame(){return{outer:new Float32Array(COUNT*4),plasma:new Float32Array(COUNT*4),core:new Float32Array(COUNT*4),white:new Float32Array(COUNT*4),helixA:new Float32Array(COUNT*4),helixB:new Float32Array(COUNT*4),x:0,y:0,ex:0,ey:0,length:0,width:0,visible:false,impact:false,angle:0}}
  function beamView(out,b,pose,size=0){const ux=Math.cos(b.angle),uy=Math.sin(b.angle),offset=pose?Math.min(b.length,Math.max(0,(pose.gazeX*ux+pose.gazeY*uy)*size)):0;out.x=b.x+ux*offset;out.y=b.y+uy*offset;out.length=Math.max(0,b.length-offset);out.width=b.width;out.angle=b.angle;out.visible=b.visible;out.impact=b.impact;return out}
  function strip(buffer,j,x,y,nx,ny,half,offset=0){buffer[j*4]=x+nx*(offset+half);buffer[j*4+1]=y+ny*(offset+half);buffer[j*4+2]=x+nx*(offset-half);buffer[j*4+3]=y+ny*(offset-half)}
  function sample(out,b,time){
    const ux=Math.cos(b.angle),uy=Math.sin(b.angle),nx=-uy,ny=ux,w=b.width;
    out.x=b.x;out.y=b.y;out.ex=b.x+ux*b.length;out.ey=b.y+uy*b.length;out.angle=b.angle;out.length=b.length;out.width=w;out.visible=b.visible&&b.length>0;out.impact=b.impact;
    for(let j=0;j<COUNT;j++){
      const d=b.length*j/SEGMENTS,x=b.x+ux*d,y=b.y+uy*d,edge=Math.max(0,Math.min(1,d/Math.max(1,w),(b.length-d)/Math.max(1,w))),travel=d*.034-time*8;
      const ripple=Math.sin(travel*1.3)*.045+Math.sin(d*.081-time*5)*.025;
      strip(out.outer,j,x,y,nx,ny,w*(.89+ripple)*edge);
      strip(out.plasma,j,x,y,nx,ny,w*(.48+ripple*.45)*(.65+.35*edge));
      strip(out.core,j,x,y,nx,ny,w*.23);strip(out.white,j,x,y,nx,ny,w*.095);
      const phase=d*.036-time*7.5,amp=w*(.70+.09*Math.sin(d*.013-time*2))*edge;
      strip(out.helixA,j,x,y,nx,ny,w*.052*edge,Math.sin(phase)*amp);
      strip(out.helixB,j,x,y,nx,ny,w*.038*edge,Math.sin(phase+Math.PI)*amp);
    }
    return out;
  }
  let canvasFrame;
  function polygon(ctx,v){ctx.beginPath();for(let j=0;j<COUNT;j++){const x=v[j*4],y=v[j*4+1];if(j===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}for(let j=COUNT-1;j>=0;j--)ctx.lineTo(v[j*4+2],v[j*4+3]);ctx.closePath();ctx.fill()}
  function drawCanvas(ctx,b,time){
    if(!b.visible||b.length<=0)return;const f=sample(canvasFrame||(canvasFrame=createFrame()),b,time),w=b.width;
    ctx.save();ctx.shadowBlur=0;ctx.fillStyle='#ff153b';ctx.globalAlpha=.12;polygon(ctx,f.outer);ctx.fillStyle='#ff4919';ctx.globalAlpha=.72;polygon(ctx,f.plasma);ctx.fillStyle='#ffd149';ctx.globalAlpha=.98;polygon(ctx,f.core);ctx.fillStyle='#fffce4';ctx.globalAlpha=1;polygon(ctx,f.white);ctx.fillStyle='#ff6a20';ctx.globalAlpha=.85;polygon(ctx,f.helixA);ctx.fillStyle='#fff19d';ctx.globalAlpha=.92;polygon(ctx,f.helixB);
    ctx.strokeStyle='#ff6b2a';ctx.lineWidth=w*.08;ctx.globalAlpha=.8;ctx.beginPath();ctx.arc(f.x,f.y,w*.45,0,TAU);ctx.stroke();
    if(f.impact){ctx.fillStyle='#fff5bd';ctx.globalAlpha=.95;ctx.beginPath();ctx.arc(f.ex,f.ey,w*.44,0,TAU);ctx.fill();for(let i=0;i<16;i++){const phase=(time*1.8+i*.173)%1,a=i*2.399963,r=w*(.5+phase*2.5),dx=Math.cos(a),dy=Math.sin(a);ctx.globalAlpha=(1-phase)*.85;ctx.strokeStyle=i%3?'#ff5d28':'#ffd87f';ctx.lineWidth=(1-phase)*w*.07+1;ctx.beginPath();ctx.moveTo(f.ex+dx*r,f.ey+dy*r);ctx.lineTo(f.ex+dx*(r+w*.28),f.ey+dy*(r+w*.28));ctx.stroke()}}
    ctx.restore();
  }
  return{SEGMENTS,COUNT,createFrame,beamView,sample,drawCanvas};
});
