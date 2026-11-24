(() => {
  const dnaCanvases = new Map();
  let toxicCanvas,rayScarCanvas,rayLightCanvas;
  function getRayLightCanvas(){if(rayLightCanvas)return rayLightCanvas;const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d'),g=c.createRadialGradient(64,64,5,64,64,63);g.addColorStop(0,'rgba(255,243,180,.8)');g.addColorStop(.38,'rgba(255,92,32,.32)');g.addColorStop(.74,'rgba(255,36,44,.07)');g.addColorStop(1,'rgba(255,24,39,0)');c.fillStyle=g;c.fillRect(0,0,128,128);rayLightCanvas=canvas;return canvas}
  function getRayScarCanvas(){
    if(rayScarCanvas)return rayScarCanvas;
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d');
    const halo=c.createRadialGradient(64,64,8,64,64,62);halo.addColorStop(0,'rgba(27,8,38,.96)');halo.addColorStop(.45,'rgba(11,9,24,.86)');halo.addColorStop(.7,'rgba(255,75,26,.26)');halo.addColorStop(1,'rgba(255,30,40,0)');c.fillStyle=halo;c.fillRect(0,0,128,128);c.lineCap='round';
    for(let i=0;i<8;i++){const a=i*2.399963,ux=Math.cos(a),uy=Math.sin(a),mx=64+ux*(20+i%3*3),my=64+uy*(20+i%3*3),ex=64+Math.cos(a+.3)*(38+i%3*6),ey=64+Math.sin(a+.3)*(38+i%3*6);c.beginPath();c.moveTo(64+ux*4,64+uy*4);c.lineTo(mx,my);c.lineTo(ex,ey);c.strokeStyle='#020611';c.lineWidth=8;c.stroke();c.strokeStyle=i%2?'#ff742a':'#ff3354';c.lineWidth=1.6;c.stroke();c.beginPath();c.moveTo(mx,my);c.lineTo(mx+Math.cos(a-.65)*15,my+Math.sin(a-.65)*15);c.lineWidth=1;c.stroke();c.fillStyle='#39101b';c.beginPath();c.moveTo(ex,ey);c.lineTo(ex+7,ey-3);c.lineTo(ex+5,ey+5);c.closePath();c.fill()}
    rayScarCanvas=canvas;return canvas;
  }
  const XP_PALETTES={
    green:['#12332e','#16776a','#35c69f','#86ffd1','#e3fff2'],
    purple:['#241745','#583998','#9e68e7','#d6a8ff','#fbecff'],
    red:['#47192d','#a83058','#f75c81','#ff9fb0','#fff1ed']
  };
  const XP_PIXELS=[
    '......0.....','.....032....','....04320...',
    '...0433220..','..043322210.','.04333222110',
    '.04332221110','..043222110.','...0422110..',
    '....02110...','.....010....','......0.....'
  ];
  function getDnaCanvas(variant='purple'){
    if(dnaCanvases.has(variant))return dnaCanvases.get(variant);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=12;
    const ctx=canvas.getContext('2d'),palette=XP_PALETTES[variant]||XP_PALETTES.purple;
    XP_PIXELS.forEach((row,y)=>[...row].forEach((pixel,x)=>{
      if(pixel!=='.'){ctx.fillStyle=palette[Number(pixel)];ctx.fillRect(x,y,1,1)}
    }));
    dnaCanvases.set(variant,canvas);return canvas;
  }

  function getToxicTrailCanvas() {
    if (toxicCanvas) return toxicCanvas;
    const canvas = document.createElement('canvas'); canvas.width = 160; canvas.height = 80;
    const c = canvas.getContext('2d');
    const fluid = c.createLinearGradient(0, 15, 0, 65);
    fluid.addColorStop(0, '#6cff9c00'); fluid.addColorStop(.15, '#258e6088'); fluid.addColorStop(.38, '#145f4fe8'); fluid.addColorStop(.62, '#145145e8'); fluid.addColorStop(.85, '#8be97090'); fluid.addColorStop(1, '#77ef8c00');
    c.fillStyle = fluid; c.beginPath(); c.moveTo(0, 35);
    c.bezierCurveTo(17, 20, 31, 20, 49, 24); c.bezierCurveTo(77, 13, 103, 24, 124, 22); c.bezierCurveTo(142, 25, 154, 30, 160, 36);
    c.lineTo(160, 45); c.bezierCurveTo(140, 59, 123, 53, 103, 57); c.bezierCurveTo(78, 66, 59, 52, 39, 58); c.bezierCurveTo(21, 57, 8, 49, 0, 45); c.closePath(); c.fill();
    c.strokeStyle = '#a0f4a67a'; c.lineWidth = 1.7; c.beginPath(); c.moveTo(6, 34); c.bezierCurveTo(41, 19, 53, 28, 77, 24); c.bezierCurveTo(112, 20, 136, 25, 153, 36); c.stroke();
    c.strokeStyle = '#65d59970'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(8, 47); c.bezierCurveTo(40, 61, 65, 53, 91, 57); c.bezierCurveTo(118, 56, 139, 52, 153, 45); c.stroke();
    // Small suspended cells, cached together with the fluid texture.
    for (let i = 0; i < 14; i++) {
      const x = 11 + (i * 43 % 137), y = 31 + Math.sin(i * 2.7) * 13, r = 1 + i % 3;
      c.strokeStyle = i % 2 ? '#bdffb2a0' : '#7cf4d376'; c.lineWidth = .8; c.beginPath(); c.ellipse(x, y, r * 1.2, r * .8, i, 0, Math.PI * 2); c.stroke();
    }
    c.globalCompositeOperation = 'destination-in';
    const taper = c.createLinearGradient(0, 0, 160, 0); taper.addColorStop(0, '#ffffff00'); taper.addColorStop(.22, '#ffffffff'); taper.addColorStop(.78, '#ffffffff'); taper.addColorStop(1, '#ffffff00'); c.fillStyle = taper; c.fillRect(0, 0, 160, 80);
    toxicCanvas = canvas; return canvas;
  }

  function healthBarLayout(out, enemy, zoom, renderScale, aspect = 1) {
    const z = Math.max(.05, zoom), boss = enemy.isBoss || enemy.type === 'boss';
    const screenWidth = boss ? 104 : enemy.miniBoss ? 48 : enemy.elite ? 48 : 36;
    const screenHeight = boss ? 9 : enemy.miniBoss ? 5 : enemy.elite ? 6.5 : 5.5;
    out.width = screenWidth / z; out.height = screenHeight / z; out.border = 1 / z;
    out.x = enemy.x - out.width / 2;
    const halfBody = (enemy.r * 2 + 40) * renderScale * aspect * .45;
    out.y = enemy.y - Math.max(enemy.r * renderScale, halfBody) - (screenHeight + 7) / z;
    out.ratio = Math.max(0, Math.min(1, enemy.hp / Math.max(1, enemy.maxHp)));
    out.color = boss || enemy.miniBoss ? '#ffb86c' : enemy.anomaly ? '#f6d46b' : enemy.type === 'virus' ? '#cf9cff' : enemy.type === 'bacteria' ? '#ff819a' : enemy.type === 'shielded' ? '#7ee6bf' : '#ffc16e';
    return out;
  }

  function toxicSegmentPose(out, pool) {
    const ax = pool.ax ?? pool.x, ay = pool.ay ?? pool.y, bx = pool.bx ?? pool.x, by = pool.by ?? pool.y;
    out.x = (ax + bx) / 2; out.y = (ay + by) / 2; out.rotation = Math.atan2(by - ay, bx - ax);
    out.width = Math.hypot(bx - ax, by - ay) + pool.r * 2.8; out.height = pool.r * 3.0;
    out.alpha = Math.min(1, Math.max(0, pool.remaining / .85)) * .84;
    return out;
  }
  window.__MICROVERSE_COMBAT_VISUALS__ = { getDnaCanvas, getToxicTrailCanvas, getRayScarCanvas, getRayLightCanvas, healthBarLayout, toxicSegmentPose };
})();
