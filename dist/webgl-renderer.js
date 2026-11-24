(() => {
  const hooks = window.__MICROVERSE_LAB_HOOKS__;
  const combatVisuals=window.__MICROVERSE_COMBAT_VISUALS__,enemyBarLayout={},toxicTrailPose={};
  const startupLog = window.__MICROVERSE_DIAGNOSTICS__;
  startupLog?.log('info', 'Renderer', 'Se cargó webgl-renderer.js');
  const production = !!window.__MICROVERSE_PRODUCTION_WEBGL2__;
  const status = document.querySelector('#labRendererStatus') || document.querySelector('#loadingStatus');
  const runHud = document.querySelector('#labRunHud') || { classList: { toggle() {}, remove() {} } };
  const canvas = document.querySelector('#game');
  const textureBySource = new WeakMap();
  const frameTextures = new Map();
  const TENTACLE_PATH_POINTS = 17, TENTACLE_RENDER_POINTS = 33;
  const TENTACLE_LASH_VISUAL = Object.freeze([
    { width: 1, opacity: .9, outer: 0x9c47ff, middle: 0xc96cff, core: 0xf2d5ff, trailStart: 7 },
    { width: 1.12, opacity: .93, outer: 0xa33dff, middle: 0xd75cff, core: 0xf5d8ff, trailStart: 6 },
    { width: 1.25, opacity: .96, outer: 0xa933ff, middle: 0xe14cff, core: 0xffdfff, trailStart: 5 },
    { width: 1.4, opacity: .98, outer: 0xb32cff, middle: 0xeb42ff, core: 0xffe7ff, trailStart: 4 },
    { width: 1.58, opacity: 1, outer: 0xbe22ff, middle: 0xf13aff, core: 0xffedff, trailStart: 3 },
    { width: 1.78, opacity: 1, outer: 0xc51dff, middle: 0xf83cff, core: 0xfff2ff, trailStart: 2 }
  ]);
  const rendererState = { mode: 'canvas', app: null, context: null, floorTexture: null, alcoholPuddleTexture: null, tentacleLashTextures: [], enemyTextures: {}, shieldBarrierTexture: null, crimsonSweepTexture:null, chimeraTendrilTexture:null, lootTextures: {}, error: '', dpr: 1, size: [0, 0], cameraTime: 0, timerExt: null, gpuQuery: null, gpuQueryStartedAt: 0, measureGpuNext: false, gpuResult: { status: 'consulta GPU no iniciada', ms: null, queryLatencyMs: null, textureUploadCalls: 0, textureUploadCpuMs: 0, pixiRenderCpuMs: null }, uploadProbe: null, firstPixiRender: true };
  function reportStatus(text, running = false) { if (status) status.textContent = production ? 'Cargando…' : text; runHud.textContent = text; runHud.classList.toggle('on', running); }

  const scene = {
    stage: null, world: null, cameraZoom: 1, cameraFollowX: null, cameraFollowY: null, background: null, terrain: null, terrainObstacles: null, mapObstacleLayer: null, mapObstacleSprites: [], doorGraphics: null, alcoholPuddleLayer: null, alcoholPuddleSprites: [], alcoholHazardGraphics: null, terrainKey: '', grid: null,
    infection: null, infectionGlow: null, infectionClouds: [], infectionVesicles: [], infectionSpores: [],
    repulsor: null, repulsorHex: null, shieldBarrierLayer: null, shieldBarrierSprites: [], enemyLayer: null, enemyBars: null, infectionLayer: null, trailLayer: null,
    particleLayer: null, playerLayer: null, damageLayer: null, playerMutationBack: null, playerMutationFront: null, playerTentacleLayer: null, tentacleSlashLayer: null, tentacleSlashSprites: [], tentacleSlashTextures: [], tentacleMeshes: [], tentacleTexture: null, extraOrgs: [], nucleusGlow: null,
    enemySprites: [], infectionSprites: [], trailGraphics: [], flashSprites: [], particles: [], damageSprites: [], bossGlow: null,
    orbSprites: [], orbGlows: [], orbTextures: {}, shotSprites: [], shotVesicles: [], shotTrails: [], predatorLashGraphics: [], playerBody: null, bodyGlow: null, spines: [], phaseGhosts: [], orbital: null, orbitalThorns: null,
    infectionTexture: null, orbGlowTexture: null, sporeTexture: null, vesicleTextures: [], hexTextures: new Map(), sparkTextures: new Map(), ringTextures: new Map(), playerOrbit: null, enemyProjectileSprites: [], lootTextures: {}, lootSprites: []
  };

  function getTexture(source) {
    if (!source) return PIXI.Texture.EMPTY;
    if (source instanceof PIXI.Texture) return source;
    let texture = textureBySource.get(source);
    if (!texture) {
      texture = PIXI.Texture.from(source);
      textureBySource.set(source, texture);
    }
    return texture;
  }
  function makeSprite(parent, texture = PIXI.Texture.EMPTY) {
    const sprite = new PIXI.Sprite(texture);
    sprite.anchor.set(.5);
    parent.addChild(sprite);
    return sprite;
  }
  function getPool(pool, parent, index) {
    if (!pool[index]) pool[index] = makeSprite(parent);
    pool[index].visible = true;
    return pool[index];
  }
  function hidePool(pool, start) {
    for (let i = start; i < pool.length; i++) pool[i].visible = false;
  }
  function setTexture(sprite, source) {
    const next = getTexture(source);
    if (sprite.texture !== next) sprite.texture = next;
  }
  function sourcePixels(source, dpr = 1) {
    return source && source.width ? source.width / dpr : 0;
  }

  function initLayers(g) {
    scene.stage = new PIXI.Container();
    scene.background = new PIXI.Graphics();
    scene.stage.addChild(scene.background);
    scene.world = new PIXI.Container();
    scene.stage.addChild(scene.world);
    scene.floorTexture = new PIXI.TilingSprite(rendererState.floorTexture || PIXI.Texture.WHITE, 1, 1); scene.floorTexture.tint = 0xffffff; scene.floorTexture.alpha = 1; scene.world.addChild(scene.floorTexture);
    scene.terrain = new PIXI.Graphics(); scene.world.addChild(scene.terrain);
    scene.grid = new PIXI.Graphics(); scene.world.addChild(scene.grid);
    scene.rayScarLayer=new PIXI.Container();scene.world.addChild(scene.rayScarLayer);scene.rayScarTexture=getTexture(combatVisuals.getRayScarCanvas());scene.rayScarSprites=Array.from({length:96},()=>{const s=makeSprite(scene.rayScarLayer,scene.rayScarTexture);s.visible=false;return s});
    scene.terrainObstacles = new PIXI.Graphics(); scene.world.addChild(scene.terrainObstacles);
    scene.mapObstacleLayer = new PIXI.Container(); scene.world.addChild(scene.mapObstacleLayer);
    scene.mapObstacleSprites = [];
    scene.containmentGraphics=new PIXI.Graphics();scene.world.addChild(scene.containmentGraphics);scene.doorGraphics = new PIXI.Graphics(); scene.world.addChild(scene.doorGraphics);
    scene.alcoholPuddleLayer = new PIXI.Container(); scene.world.addChild(scene.alcoholPuddleLayer);
    scene.alcoholPuddleSprites = Array.from({ length: 2 }, () => makeSprite(scene.alcoholPuddleLayer));
    scene.lancerSlimeSprites=[];scene.lancerSlimeTexture=getTexture(combatVisuals.getToxicTrailCanvas());
    scene.alcoholHazardGraphics = new PIXI.Graphics(); scene.world.addChild(scene.alcoholHazardGraphics);
    scene.infectionGlow = makeSprite(scene.world); scene.infectionGlow.blendMode = PIXI.BLEND_MODES.ADD;
    scene.infection = new PIXI.Graphics(); scene.infection.blendMode = PIXI.BLEND_MODES.ADD; scene.world.addChild(scene.infection);
    scene.infectionCloudLayer = new PIXI.Container(); scene.world.addChild(scene.infectionCloudLayer);
    scene.repulsorHex = makeSprite(scene.world); scene.repulsorHex.blendMode = PIXI.BLEND_MODES.ADD;
    scene.repulsor = new PIXI.Graphics(); scene.repulsor.blendMode = PIXI.BLEND_MODES.ADD; scene.world.addChild(scene.repulsor);
    scene.shieldBarrierLayer = new PIXI.Container(); scene.world.addChild(scene.shieldBarrierLayer); scene.shieldBarrierSprites=[];scene.shieldLinks=new PIXI.Graphics();scene.shieldBarrierLayer.addChild(scene.shieldLinks);scene.bossArmLayer=new PIXI.Container();scene.world.addChild(scene.bossArmLayer);scene.bossArmMeshes=[];scene.bossArmUsed=0;scene.chimeraPose={};
    scene.enemyLayer = new PIXI.Container(); scene.world.addChild(scene.enemyLayer);scene.chimeraFxLayer=new PIXI.Container();scene.world.addChild(scene.chimeraFxLayer);scene.chimeraFxSprites=[];scene.chimeraFxUsed=0;scene.chimeraFxPose={};
    scene.enemyCoreTexture = makeRadialTexture(48, ['rgba(255,255,255,.8)','rgba(255,255,255,.34)','rgba(255,255,255,.08)','rgba(255,255,255,0)']);
    scene.enemyBars = new PIXI.Graphics(); scene.world.addChild(scene.enemyBars);
    scene.enemyProjectileLayer = new PIXI.Container(); scene.world.addChild(scene.enemyProjectileLayer);
    scene.lootItemLayer = new PIXI.Container(); scene.world.addChild(scene.lootItemLayer);
    scene.lootTextures = rendererState.lootTextures;
    scene.lootSprites = Array.from({length:128},()=>{const sprite=makeSprite(scene.lootItemLayer);sprite.visible=false;return sprite});
    scene.bossGlow = makeSprite(scene.world, makeRadialTexture(128, ['rgba(255,120,220,.2)','rgba(210,42,210,.17)','rgba(133,52,255,.1)','rgba(110,70,255,0)'])); scene.bossGlow.blendMode = PIXI.BLEND_MODES.ADD;
    scene.infectionLayer = new PIXI.Container(); scene.world.addChild(scene.infectionLayer);
    scene.trailLayer = new PIXI.Container(); scene.world.addChild(scene.trailLayer);
    scene.particleLayer = new PIXI.Container(); scene.world.addChild(scene.particleLayer);
    scene.orbLayer = new PIXI.Container(); scene.world.addChild(scene.orbLayer);
    scene.shotLayer = new PIXI.Container(); scene.world.addChild(scene.shotLayer);
    scene.shotTrails = Array.from({ length: 256 }, () => { const g = new PIXI.Graphics(); scene.shotLayer.addChild(g); return g; });
    scene.predatorLashSprites = Array.from({length:8},()=>{const sprite=makeSprite(scene.shotLayer);sprite.anchor.set(.5);sprite.blendMode=PIXI.BLEND_MODES.ADD;sprite.visible=false;return sprite});
    scene.ocularRayLayer=new PIXI.Container();scene.world.addChild(scene.ocularRayLayer);scene.ocularRayRig=createOcularRayRig();scene.ocularAutoView={};scene.ocularRayView={};scene.combatBeamGraphics=new PIXI.Graphics();scene.world.addChild(scene.combatBeamGraphics);scene.rayLightTexture=getTexture(combatVisuals.getRayLightCanvas());scene.rayLights=Array.from({length:2},()=>{const s=makeSprite(scene.world,scene.rayLightTexture);s.blendMode=PIXI.BLEND_MODES.ADD;s.visible=false;return s});scene.ocularMeshes=[];scene.playerLayer = new PIXI.Container(); scene.world.addChild(scene.playerLayer);
    scene.damageLayer = new PIXI.Container(); scene.world.addChild(scene.damageLayer);
    scene.infectionClouds = Array.from({ length: 10 }, () => makeSprite(scene.infectionCloudLayer));
    scene.infectionVesicles = Array.from({ length: 16 }, () => makeSprite(scene.infectionCloudLayer));
    scene.infectionSpores = Array.from({ length: 16 }, () => makeSprite(scene.infectionCloudLayer));
    scene.trailGraphics = Array.from({ length: 100 }, () => { const g = new PIXI.Graphics(); scene.trailLayer.addChild(g); return g; });
    scene.particleGraphics = Array.from({ length: 80 }, () => { const g = new PIXI.Graphics(); scene.particleLayer.addChild(g); return g; });
    scene.flashSprites = Array.from({ length: 100 }, () => makeSprite(scene.trailLayer));
    scene.tentacleMeshes.length = 0;
    scene.playerMutationBack = new PIXI.Graphics(); scene.playerLayer.addChild(scene.playerMutationBack);
    scene.tentacleSlashLayer = new PIXI.Container(); scene.tentacleSlashLayer.interactiveChildren = false; scene.playerLayer.addChild(scene.tentacleSlashLayer);
    scene.tentacleSlashTextures = rendererState.tentacleLashTextures;
    scene.tentacleSlashSprites = Array.from({length:4},()=>{const sprite=makeSprite(scene.tentacleSlashLayer);sprite.anchor.set(.02,.5);sprite.blendMode=PIXI.BLEND_MODES.ADD;sprite.visible=false;return sprite});
    scene.playerTentacleLayer = new PIXI.Container(); scene.playerTentacleLayer.interactiveChildren = false; scene.playerLayer.addChild(scene.playerTentacleLayer);
    scene.tentacleTexture = makeTentacleTissueTexture();
    const tentacleUvs = new Float32Array(TENTACLE_RENDER_POINTS * 4), tentacleIndices = new Uint16Array((TENTACLE_RENDER_POINTS - 1) * 6);
    for (let i = 0; i < TENTACLE_RENDER_POINTS; i++) { const u = i / (TENTACLE_RENDER_POINTS - 1); tentacleUvs[i * 4] = u; tentacleUvs[i * 4 + 1] = 0; tentacleUvs[i * 4 + 2] = u; tentacleUvs[i * 4 + 3] = 1; if (i < TENTACLE_RENDER_POINTS - 1) { const v = i * 2, k = i * 6; tentacleIndices.set([v, v + 1, v + 2, v + 1, v + 3, v + 2], k); } }
    for (let i = 0; i < 4; i++) { const mesh = new PIXI.SimpleMesh(scene.tentacleTexture, new Float32Array(TENTACLE_RENDER_POINTS * 4), new Float32Array(tentacleUvs), new Uint16Array(tentacleIndices)); mesh.autoUpdate = false; mesh.alpha = .97; mesh.visible = false; scene.playerTentacleLayer.addChild(mesh); scene.tentacleMeshes.push(mesh); }
    scene.spines = Array.from({ length: 24 }, () => makeSprite(scene.playerLayer));
    scene.phaseGhosts = Array.from({ length: 2 }, () => makeSprite(scene.playerLayer));
    scene.bodyGlow = makeSprite(scene.playerLayer); scene.bodyGlow.blendMode = PIXI.BLEND_MODES.ADD;
    scene.playerBody = makeSprite(scene.playerLayer);
    scene.playerOrbit = new PIXI.Graphics(); scene.playerLayer.addChild(scene.playerOrbit);
    scene.orbital = makeSprite(scene.playerLayer); scene.orbitalThorns = makeSprite(scene.playerLayer);
    scene.playerMutationFront = new PIXI.Graphics(); scene.playerLayer.addChild(scene.playerMutationFront);
    scene.extraOrgs = Array.from({ length: 72 }, () => makeSprite(scene.playerLayer));
    scene.nucleusGlow = makeSprite(scene.playerLayer, makeRadialTexture(96, ['rgba(222,200,255,.22)','rgba(157,76,255,.16)','rgba(100,225,255,.08)','rgba(100,225,255,0)'])); scene.nucleusGlow.blendMode = PIXI.BLEND_MODES.ADD;
    scene.infectionTexture = makeRadialTexture(128, ['rgba(80,255,18,0)', 'rgba(77,245,24,.11)', 'rgba(91,248,22,.18)', 'rgba(80,255,12,0)']);
    scene.orbGlowTexture = makeRadialTexture(96, ['rgba(110,245,255,0)', 'rgba(90,220,255,.14)', 'rgba(90,220,255,.25)', 'rgba(90,220,255,0)']);
    scene.orbTextures={green:makeExperienceOrbTexture('green'),purple:makeExperienceOrbTexture('purple'),red:makeExperienceOrbTexture('red')};
    scene.sporeTexture = getTexture(hooks.getSnapshot().infectionFx.spore);
    scene.vesicleTextures = hooks.getSnapshot().infectionFx.vesicles.map(getTexture);
  }

  function makeExperienceOrbTexture(variant) { const texture=getTexture(combatVisuals.getDnaCanvas(variant));texture.baseTexture.scaleMode=PIXI.SCALE_MODES.NEAREST;return texture; }

  function makeRadialTexture(size, colors) {
    // This small, static source texture is uploaded once; all live particles/effects are Pixi sprites.
    const source = document.createElement('canvas'); source.width = source.height = size;
    const context = source.getContext('2d');
    const gradient = context.createRadialGradient(size / 2, size / 2, size * .08, size / 2, size / 2, size * .49);
    gradient.addColorStop(0, colors[0]); gradient.addColorStop(.38, colors[1]); gradient.addColorStop(.74, colors[2]); gradient.addColorStop(1, colors[3]);
    context.fillStyle = gradient; context.fillRect(0, 0, size, size);
    return getTexture(source);
  }

  function makeTentacleTissueTexture() {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 64;
    const c = canvas.getContext('2d');
    const edge = c.createLinearGradient(0, 0, 0, 64); edge.addColorStop(0, 'rgba(33,10,71,0)'); edge.addColorStop(.12, 'rgba(91,23,171,.82)'); edge.addColorStop(.32, 'rgba(198,63,255,.98)'); edge.addColorStop(.52, 'rgba(77,20,158,.97)'); edge.addColorStop(.76, 'rgba(151,39,232,.98)'); edge.addColorStop(.9, 'rgba(70,17,135,.86)'); edge.addColorStop(1, 'rgba(33,10,71,0)');
    const length = c.createLinearGradient(0, 0, 256, 0); length.addColorStop(0, '#6517b8'); length.addColorStop(.16, '#a52be8'); length.addColorStop(.42, '#48118d'); length.addColorStop(.7, '#8524d2'); length.addColorStop(.9, '#d43cf2'); length.addColorStop(1, '#ff9cf6');
    c.fillStyle = edge; c.fillRect(0, 0, 256, 64); c.globalCompositeOperation = 'source-atop'; c.fillStyle = length; c.fillRect(0, 0, 256, 64);
    c.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 14; i++) { const x = 8 + i * 18, y = 23 + Math.sin(i * 1.7) * 7; c.beginPath(); c.ellipse(x, y, 5 + (i % 3), 1.1, Math.sin(i * 1.3) * .18, 0, Math.PI * 2); c.fillStyle = i % 2 ? 'rgba(255,190,255,.38)' : 'rgba(92,216,255,.30)'; c.fill(); }
    for (let i = 0; i < 9; i++) { const x = 18 + i * 28; for (const y of [10, 54]) { const r = 3.5 + (i % 2) * .8, g = c.createRadialGradient(x - 1, y - 1, .4, x, y, r * 1.7); g.addColorStop(0, 'rgba(255,239,255,.98)'); g.addColorStop(.3, 'rgba(255,123,250,.96)'); g.addColorStop(.72, 'rgba(177,38,238,.92)'); g.addColorStop(1, 'rgba(72,18,140,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 1.7, 0, Math.PI * 2); c.fill(); } }
    c.globalCompositeOperation = 'source-atop'; const shine = c.createLinearGradient(0, 0, 0, 64); shine.addColorStop(.15, 'rgba(255,255,255,.03)'); shine.addColorStop(.35, 'rgba(255,232,255,.38)'); shine.addColorStop(.44, 'rgba(255,255,255,.03)'); shine.addColorStop(.72, 'rgba(91,220,255,.18)'); shine.addColorStop(.82, 'rgba(255,255,255,.02)'); c.fillStyle = shine; c.fillRect(0, 0, 256, 64); c.globalCompositeOperation = 'source-over';
    return getTexture(canvas);
  }

  async function createApp() {
    if (rendererState.app) return rendererState.app;
    startupLog?.log('info', 'WebGL 2', `Creando PixiJS ${window.PIXI?.VERSION || 'sin versión detectada'}`);
    if (!window.PIXI || !PIXI.Application) throw new Error('PixiJS no cargó. Comprueba la conexión al CDN y vuelve a intentar.');
    const g = hooks.getSnapshot();
    const app = new PIXI.Application({
      width: Math.max(1, g.W), height: Math.max(1, g.H), resolution: g.DPR,
      autoDensity: true, antialias: false, backgroundColor: 0x06101b, backgroundAlpha: 1,
      autoStart: false, sharedTicker: false, powerPreference: 'high-performance', clearBeforeRender: true,
      preference: 'webgl'
    });
    const gl = app.renderer && (app.renderer.gl || app.renderer.context?.gl);
    let version = ''; try { version = String(gl?.getParameter(gl.VERSION) || ''); } catch {}
    startupLog?.log(gl && version.includes('WebGL 2') ? 'info' : 'error', 'WebGL 2', `Contexto: ${version || 'no creado'} · tipo de PixiJS ${app.renderer?.type ?? 'desconocido'}`);
    if (!gl || app.renderer.type !== PIXI.RENDERER_TYPE.WEBGL || !version.includes('WebGL 2')) {
      app.destroy(true, { children: true, texture: false, baseTexture: false });
      throw new Error('WebGL 2 no está disponible en este navegador o dispositivo.');
    }
    const [floorTexture, wallFreeFloorTexture, alcoholPuddleTexture, ...tentacleLashTextures] = await Promise.all([
      PIXI.Assets.load('assets/map/laboratory-scene-3d.jpg').catch(() => PIXI.Texture.WHITE),
      PIXI.Assets.load('assets/map/laboratory-scene-no-walls.png').catch(() => PIXI.Texture.WHITE),
      PIXI.Assets.load('assets/map/alcohol-puddle.png').catch(() => PIXI.Texture.WHITE),
      ...Array.from({length:6},(_,i)=>PIXI.Assets.load(`assets/effects/tentacle-lash-${i+1}.png`).catch(() => PIXI.Texture.EMPTY))
    ]);
    const enemyAssetEntries=Object.entries(g.enemyAssetPaths||{}).filter(([key])=>!key.startsWith('ocular-crimson-')),enemyAssetTextures=await Promise.all(enemyAssetEntries.map(([,path])=>PIXI.Assets.load(path).catch(()=>PIXI.Texture.EMPTY))),enemyTextures=Object.fromEntries(enemyAssetEntries.map(([key],i)=>[key,enemyAssetTextures[i]]));
    const [lootHealth,lootMagnet,lootPulse,lootGold]=await Promise.all([
      'assets/collectibles/loot-health.webp','assets/collectibles/loot-magnet.webp','assets/collectibles/loot-pulse.webp','assets/materials/gold.png'
    ].map(path=>PIXI.Assets.load(path).catch(()=>PIXI.Texture.EMPTY)));
    rendererState.enemyTextures=enemyTextures;rendererState.shieldBarrierTexture=enemyTextures['shield-barrier-full']||PIXI.Texture.EMPTY;rendererState.crimsonSweepTexture=enemyTextures['crimson-sweep']||PIXI.Texture.EMPTY;rendererState.chimeraTendrilTexture=enemyTextures['boss-chimera-tendril']||PIXI.Texture.EMPTY;
    rendererState.lootTextures={health:lootHealth,experience:lootMagnet,nova:lootPulse,gold:lootGold};
    rendererState.floorTexture = floorTexture;
    rendererState.wallFreeFloorTexture = wallFreeFloorTexture;
    rendererState.alcoholPuddleTexture = alcoholPuddleTexture;
    rendererState.tentacleLashTextures = tentacleLashTextures;
    startupLog?.log('info', 'Texturas PixiJS', `Suelo ${floorTexture.width}×${floorTexture.height}; efectos de látigo cargados: ${tentacleLashTextures.filter(texture => texture !== PIXI.Texture.EMPTY).length}/6`);
    const view = app.view;
    view.id = 'microversePixiCanvas';
    view.setAttribute('aria-label', 'MICROVERSE, renderizado PixiJS WebGL 2');
    Object.assign(view.style, { position: 'fixed', inset: '0', width: '100vw', height: '100dvh', zIndex: '0', pointerEvents: 'none', display: 'none' });
    canvas.insertAdjacentElement('afterend', view);
    rendererState.app = app;
    rendererState.context = gl;
    rendererState.timerExt = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    const heroVisuals=window.MicroverseFantasyVisuals;
    const heroPaths=heroVisuals.paths();
    const heroSheets=await Promise.all(heroPaths.map(path=>PIXI.Assets.load(path)));
    const {COLUMNS}=heroVisuals;
    rendererState.heroFrames=Object.fromEntries(heroPaths.map((path,i)=>{
      const id=path.slice('assets/heroes/'.length,-4), sheet=heroSheets[i], cell=heroVisuals.sheetCell(id);
      sheet.baseTexture.scaleMode=PIXI.SCALE_MODES.NEAREST;
      const frames=Array.from({length:COLUMNS*heroVisuals.sheetRows(id)},(_,f)=>
        new PIXI.Texture(sheet.baseTexture,new PIXI.Rectangle((f%COLUMNS)*cell,Math.floor(f/COLUMNS)*cell,cell,cell)));
      return [id,frames];
    }));
    initLayers(g);
    scene.fantasyRoot=new PIXI.Container();scene.playerLayer.addChild(scene.fantasyRoot);scene.fantasyShadows=new PIXI.Graphics();scene.fantasyRoot.addChild(scene.fantasyShadows);scene.fantasySprites=Array.from({length:3},()=>makeSprite(scene.fantasyRoot));scene.fantasyEffects=new PIXI.Graphics();scene.fantasyRoot.addChild(scene.fantasyEffects);scene.fantasyPose={};scene.basicFx=await window.MicroverseBasicVisuals.createPixi(PIXI,scene.fantasyRoot);scene.warriorFx=await window.MicroverseWarriorVisuals.createPixi(PIXI,scene.fantasyRoot);scene.archerFx=await window.MicroverseArcherVisuals.createPixi(PIXI,scene.fantasyRoot);scene.mageFx=await window.MicroverseMageVisuals.createPixi(PIXI,scene.fantasyRoot);scene.clericFx=await window.MicroverseClericVisuals.createPixi(PIXI,scene.fantasyRoot);
    app.stage.addChild(scene.stage);
    return app;
  }

  async function setMode(mode) {
    rendererState.error = '';
    if (mode === 'webgl') {
      try {
        await createApp();
        rendererState.mode = 'webgl';
        rendererState.app.view.style.display = 'block';
        canvas.style.opacity = '0';
        canvas.style.pointerEvents = 'auto';
        reportStatus(`Renderizador principal: ${backendInfo().api} · ${backendInfo().resolution} · escena de juego en WebGL 2`);
        return true;
      } catch (error) {
        rendererState.mode = 'canvas';
        rendererState.error = error.message || String(error);
        canvas.style.opacity = '1';
        canvas.style.pointerEvents = 'auto';
        if (rendererState.app) rendererState.app.view.style.display = 'none';
        reportStatus(`Modo compatible Canvas 2D · WebGL 2 no disponible: ${rendererState.error}`);
        return false;
      }
    }
    rendererState.mode = 'canvas';
    canvas.style.opacity = production ? '0' : '1';
    if (rendererState.app) rendererState.app.view.style.display = 'none';
    reportStatus(`API activa: Canvas 2D · ${canvas.width}×${canvas.height}`);
    return true;
  }


  async function prewarmTextures(sources) {
    if (!rendererState.app || !Array.isArray(sources)) return;
    const step = 12;
    for (let i = 0; i < sources.length; i += step) {
      const warm = new PIXI.Container();
      for (let j = i; j < Math.min(sources.length, i + step); j++) { const source = sources[j]; if (!source || !source.width || !source.height) continue; const sprite = new PIXI.Sprite(getTexture(source)); sprite.alpha = .001; sprite.width = 1; sprite.height = 1; warm.addChild(sprite); }
      // Upload a small batch each frame so initialization cannot monopolize the UI thread.
      rendererState.app.renderer.render(warm); warm.destroy({ children: true, texture: false, baseTexture: false });
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    if (scene.tentacleTexture) { const warm = new PIXI.Container(), sprite = new PIXI.Sprite(scene.tentacleTexture); sprite.alpha = .001; sprite.width = 1; sprite.height = 1; warm.addChild(sprite); rendererState.app.renderer.render(warm); warm.destroy({ children: true, texture: false, baseTexture: false }); await new Promise(resolve => requestAnimationFrame(resolve)); }
  }

  function backendInfo() {
    if (rendererState.mode !== 'webgl' || !rendererState.app || !rendererState.context) return { api: production ? 'WebGL 2 no disponible' : 'Canvas 2D', width: canvas.width, height: canvas.height, resolution: `${canvas.width}×${canvas.height}` };
    const gl = rendererState.context;
    const version = 'WebGL 2';
    return { api: `PixiJS ${version}`, width: rendererState.app.view.width, height: rendererState.app.view.height, resolution: `${rendererState.app.view.width}×${rendererState.app.view.height}`, renderer: (() => { try { return gl.getParameter(gl.RENDERER) } catch { return 'WebGL' } })() };
  }

  function armFirstGpuMeasurement() {
    rendererState.gpuQuery = null;
    rendererState.measureGpuNext = false;
    rendererState.firstPixiRender = true;
    rendererState.gpuResult = rendererState.mode !== 'webgl'
      ? { status: 'no aplica a Canvas 2D', ms: null, queryLatencyMs: null, textureUploadCalls: null, textureUploadCpuMs: null, pixiRenderCpuMs: null }
      : rendererState.timerExt
        ? { status: 'esperando primer render WebGL', ms: null, queryLatencyMs: null, textureUploadCalls: 0, textureUploadCpuMs: 0, pixiRenderCpuMs: null }
        : { status: 'EXT_disjoint_timer_query_webgl2 no disponible', ms: null, queryLatencyMs: null, textureUploadCalls: 0, textureUploadCpuMs: 0, pixiRenderCpuMs: null };
    if (rendererState.mode === 'webgl' && rendererState.timerExt) rendererState.measureGpuNext = true;
    if (rendererState.mode === 'webgl' && rendererState.context) {
      const probe = rendererState.uploadProbe = { calls: 0, cpuMs: 0, originals: [] };
      for (const name of ['texImage2D', 'texSubImage2D']) {
        const original = rendererState.context[name];
        if (typeof original !== 'function') continue;
        const wrapped = function (...args) { const start = performance.now(); try { return original.apply(this, args); } finally { probe.calls++; probe.cpuMs += performance.now() - start; } };
        try { rendererState.context[name] = wrapped; probe.originals.push([name, original, wrapped]); } catch {}
      }
    }
    hooks.setPhaseGpu(rendererState.gpuResult);
  }

  function pollGpuMeasurement() {
    const { gpuQuery: query, context: gl, timerExt: ext } = rendererState;
    if (!query || !gl || !ext) return;
    try {
      if (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) return;
      const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
      if (disjoint) {
        rendererState.gpuResult = { ...rendererState.gpuResult, status: 'muestra GPU descartada por indicador disjoint', ms: null, queryLatencyMs: performance.now() - rendererState.gpuQueryStartedAt };
      } else {
        const ns = gl.getQueryParameter(query, gl.QUERY_RESULT);
        rendererState.gpuResult = { ...rendererState.gpuResult, status: 'tiempo GPU del primer render medido; sin espera forzada', ms: Number(ns) / 1e6, queryLatencyMs: performance.now() - rendererState.gpuQueryStartedAt };
      }
      gl.deleteQuery(query);
      rendererState.gpuQuery = null;
      hooks.setPhaseGpu(rendererState.gpuResult);
    } catch (error) {
      rendererState.gpuResult = { status: `consulta GPU no disponible: ${error.message || error}`, ms: null, queryLatencyMs: null };
      rendererState.gpuQuery = null;
      hooks.setPhaseGpu(rendererState.gpuResult);
    }
  }

  function updateSize(g) {
    const app = rendererState.app;
    if (!app) return;
    if (g.W !== rendererState.size[0] || g.H !== rendererState.size[1] || g.DPR !== rendererState.dpr) {
      rendererState.size = [g.W, g.H]; rendererState.dpr = g.DPR;
      app.renderer.resolution = g.DPR;
      app.renderer.resize(Math.max(1, g.W), Math.max(1, g.H));
    }
    scene.background.clear().beginFill(0x06101b, 1).drawRect(0, 0, g.W, g.H).endFill();
  }

  function drawWorldMap(g, time) {
    const map=g.worldMap;if(!map)return;const texture=map.wallsRemoved?(rendererState.wallFreeFloorTexture||rendererState.floorTexture):rendererState.floorTexture||PIXI.Texture.WHITE,key=`laboratory:${map.width}:${map.height}:${map.wallsRemoved?1:0}`;if(scene.terrainKey===key&&scene.floorTexture.texture===texture)return;scene.terrainKey=key;scene.terrain.clear();scene.grid.clear();scene.terrainObstacles.clear();
    if(scene.floorTexture.texture!==texture)scene.floorTexture.texture=texture;
    scene.floorTexture.position.set(-map.width/2,-map.height/2);scene.floorTexture.width=map.width;scene.floorTexture.height=map.height;
    scene.floorTexture.tileScale.set(map.width/Math.max(1,texture.width),map.height/Math.max(1,texture.height));scene.floorTexture.tilePosition.set(0,0);
    for(const sprite of scene.mapObstacleSprites)sprite.visible=false;
  }
  function drawContainment(g){const graphics=scene.containmentGraphics,b=g.containment;graphics.clear();graphics.visible=!!b;if(!b)return;const zoom=Math.max(.001,scene.cameraZoom),alpha=b.alpha??1,w=b.right-b.left,h=b.bottom-b.top;graphics.lineStyle(16/zoom,0xc05fff,.15*alpha).drawRect(b.left,b.top,w,h);graphics.lineStyle(3/zoom,0xc989ff,.9*alpha).drawRect(b.left,b.top,w,h);graphics.lineStyle(1/zoom,0xeff1ff,.8*alpha);for(let x=b.left;x<b.right;x+=46/zoom){const end=Math.min(x+28/zoom,b.right);graphics.moveTo(x,b.top).lineTo(end,b.top).moveTo(x,b.bottom).lineTo(end,b.bottom)}for(let y=b.top;y<b.bottom;y+=46/zoom){const end=Math.min(y+28/zoom,b.bottom);graphics.moveTo(b.left,y).lineTo(b.left,end).moveTo(b.right,y).lineTo(b.right,end)}}
  function drawMapPortals(g,time){const graphics=scene.doorGraphics,doors=g.worldMap?.doors||[];graphics.clear();const pulse=.72+.22*Math.sin(time*.006);for(const door of doors){const x=door.x,y=door.portal==='upper'?door.y+36:door.y-36;graphics.lineStyle(2,0x61efff,.52*pulse).drawEllipse(x,y,door.width*.34,22);graphics.lineStyle(1,0xd6a4ff,.6*pulse).drawEllipse(x,y,door.width*.25,14);graphics.beginFill(0x5cecff,.48*pulse).drawCircle(x,y,3.4);for(let i=0;i<4;i++){const a=time*.0012+i*Math.PI/2;graphics.beginFill(i%2?0xb879ff:0x79edff,.55*pulse).drawCircle(x+Math.cos(a)*door.width*.18,y+Math.sin(a)*11,1.8)}}const flash=g.player?.portalFlash||0;if(flash>0)graphics.lineStyle(2,0xb5f8ff,.82*flash/.32).drawCircle(g.player.x,g.player.y,22+(1-flash/.32)*52)}
  function drawLootDrops(g,time){let index=0;for(const drop of g.lootDrops||[]){const sprite=getPool(scene.lootSprites,scene.lootItemLayer,index++),fade=Math.min(1,drop.life/2),pulse=.93+.07*Math.sin(time*.006+drop.phase);setTexture(sprite,scene.lootTextures[drop.kind]||scene.lootTextures.nova);sprite.position.set(drop.x,drop.y);sprite.width=sprite.height=(drop.kind==='gold'?37:74)*pulse;sprite.alpha=fade;sprite.rotation=drop.kind==='nova'?time*.00045:0;sprite.blendMode=PIXI.BLEND_MODES.NORMAL}hidePool(scene.lootSprites,index);for(let i=index;i<scene.lootSprites.length;i++)scene.lootSprites[i].visible=false}
  function drawAlcoholHazards(g,time){
    const hazards=g.alcoholHazards||[],p=g.player,map=g.worldMap;if(!p||!map)return;const graphics=scene.alcoholHazardGraphics;graphics.clear();let activeCount=0;
    let slimeCount=0;for(const pool of g.lancerSlimeTrails||[]){const pose=combatVisuals.toxicSegmentPose(toxicTrailPose,pool),sprite=getPool(scene.lancerSlimeSprites,scene.alcoholPuddleLayer,slimeCount++);setTexture(sprite,scene.lancerSlimeTexture);sprite.position.set(pose.x,pose.y);sprite.rotation=pose.rotation;sprite.width=pose.width;sprite.height=pose.height;sprite.alpha=pose.alpha;sprite.tint=0xffffff}hidePool(scene.lancerSlimeSprites,slimeCount);
    for(let i=0;i<hazards.length&&i<2;i++){
      const hazard=hazards[i],x=hazard.x,y=hazard.y,radius=hazard.radius||48,rx=radius*1.28,ry=radius*.82,pulse=.5+.5*Math.sin(time*.009+hazard.id),warning=hazard.phase==='warning';
      if(!warning){const sprite=scene.alcoholPuddleSprites[activeCount++],texture=rendererState.alcoholPuddleTexture||PIXI.Texture.WHITE;if(sprite.texture!==texture)sprite.texture=texture;sprite.position.set(x,y);sprite.rotation=hazard.rotation||0;sprite.width=radius*2.55;sprite.height=radius*1.72;sprite.alpha=Math.min(.94,.58+Math.min(1,(hazard.timer||0)*1.2)*.36);sprite.tint=0xe9f7ff;sprite.visible=true}
      const color=warning?0xff243d:0xff805f,alpha=warning?.48+pulse*.42:.24+pulse*.2;
      if(warning){const warningRadius=radius*1.28;graphics.beginFill(color,.065+pulse*.045).drawCircle(x,y,warningRadius).endFill();graphics.lineStyle(2.6,color,alpha).drawCircle(x,y,warningRadius);graphics.lineStyle(1,0xff8995,.48+pulse*.34).drawCircle(x,y,warningRadius*.76);for(let j=0;j<12;j++){const a=j/12*Math.PI*2,inner=warningRadius*(j%3===0?1.05:1.13),outer=warningRadius*(j%3===0?1.24:1.19),ca=Math.cos(a),sa=Math.sin(a);graphics.lineStyle(j%3===0?2:1,color,j%3===0?.86:.55).moveTo(x+ca*inner,y+sa*inner).lineTo(x+ca*outer,y+sa*outer)}}
      else{graphics.beginFill(color,.045).drawEllipse(x,y,rx,ry).endFill();graphics.lineStyle(1.5,color,alpha).drawEllipse(x,y,rx,ry);graphics.lineStyle(1,0xbdf6ff,.36).drawEllipse(x,y,rx*.76,ry*.76)}
    }
    hidePool(scene.alcoholPuddleSprites,activeCount);
  }
  function drawGrid(){}

  function drawWave(graphics, x, y, radius, time, color, width, alpha, amplitude = 2) {
    if (radius <= 1 || alpha <= 0) return;
    graphics.lineStyle(width, color, alpha);
    for (let i = 0; i <= 28; i++) {
      const a = i / 28 * Math.PI * 2, wave = Math.sin(a * 7 + time * .01) * amplitude + Math.sin(a * 11 - time * .008) * amplitude * .32;
      const r = radius + wave, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i === 0) graphics.moveTo(px, py); else graphics.lineTo(px, py);
    }
    graphics.closePath();
  }

  function drawInfection(g, t) {
    const level = Math.max(0, Math.min(5, g.upgradeLevels.infection || 0));
    if (!level || !g.player) { scene.infection.clear(); scene.infectionGlow.visible = false; hidePool(scene.infectionClouds, 0); hidePool(scene.infectionVesicles, 0); hidePool(scene.infectionSpores, 0); return; }
    const stage = g.INFECTION_LEVELS[level - 1], p = g.player, r = stage.radius, lx = -(p.motionX || 0), ly = -(p.motionY || 0);
    scene.infection.clear(); scene.infectionGlow.visible = true; scene.infectionGlow.texture = scene.infectionTexture; scene.infectionGlow.position.set(p.x, p.y); scene.infectionGlow.width = scene.infectionGlow.height = r * 2.5; scene.infectionGlow.alpha = .7; scene.infectionGlow.blendMode = PIXI.BLEND_MODES.ADD;
    drawWave(scene.infection, p.x, p.y, r * .9, t, 0x71ff1f, 2.3 + level * .45, .58, 1.8 + level * .38);
    scene.infection.lineStyle(1 + level * .25, 0xaaff52, .22 + level * .035);
    scene.infection.arc(p.x, p.y, r * .78, t * .00017 + .18, t * .00017 + Math.PI * 1.82);
    scene.infection.arc(p.x, p.y, r * .82, -t * .00013 + Math.PI * 1.08, -t * .00013 + Math.PI * 2.75);
    const cloudCount = level >= 3 ? 8 : 0;
    for (let i = 0; i < cloudCount; i++) {
      const a = i / cloudCount * Math.PI * 2 + t * .00012, rr = r * (.67 + .045 * Math.sin(t * .002 + i * 2)), size = r * (level === 3 ? .17 : level === 4 ? .2 : .23) * (1 + .12 * Math.sin(t * .004 + i * 1.7));
      const s = scene.infectionClouds[i]; setTexture(s, g.infectionFx.cloud); s.position.set(p.x + Math.cos(a) * rr + lx * 5, p.y + Math.sin(a) * rr + ly * 5); s.width = size * 2 * g.scaleConfig.visual.infectionEffect; s.height = size * 1.5 * g.scaleConfig.visual.infectionEffect; s.rotation = a; s.alpha = .72; s.visible = true;
    }
    hidePool(scene.infectionClouds, cloudCount);
    if (level >= 4) {
      const n = level === 5 ? 8 : 5, leanX = lx, leanY = ly;
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + t * .00016, root = r * (.79 + .035 * Math.sin(t * .003 + i)), len = r * (level === 5 ? .22 : .15) * g.scaleConfig.visual.infectionEffect, sx = p.x + Math.cos(a) * root, sy = p.y + Math.sin(a) * root, bx = sx + Math.cos(a + .45) * len * .42 + leanX * len * .2 + Math.sin(t * .004 + i * 1.9) * len * .13, by = sy + Math.sin(a + .45) * len * .42 + leanY * len * .2 - Math.sin(t * .004 + i * 1.9) * len * .13, ex = sx + Math.cos(a + .12 * Math.sin(t * .003 + i)) * len + leanX * len * .3, ey = sy + Math.sin(a + .12 * Math.sin(t * .003 + i)) * len + leanY * len * .3;
        scene.infection.lineStyle((3.4 + Math.sin(t * .006 + i) * .4) * g.scaleConfig.visual.infectionEffect, 0x68ef28, .92).moveTo(sx, sy).quadraticCurveTo(bx, by, ex, ey); scene.infection.lineStyle(.8, 0xbeff57, .72).moveTo(sx, sy).quadraticCurveTo(bx, by, ex, ey); scene.infection.beginFill(0xb5ff53, .8).drawCircle(ex, ey, (2.2 + Math.sin(t * .007 + i) * .6) * g.scaleConfig.visual.infectionEffect).endFill();
      }
    }
    const vN = level === 1 ? 0 : level === 2 ? 7 : level === 3 ? 9 : level === 4 ? 11 : 14;
    for (let i = 0; i < vN; i++) { const a = i / vN * Math.PI * 2 - t * .0002, rr = r * (.78 + .025 * Math.sin(t * .004 + i)), size = (2.3 + level * .52) * g.scaleConfig.visual.infectionEffect * (1 + .18 * Math.sin(t * .006 + i * 1.4)), s = scene.infectionVesicles[i]; setTexture(s, g.infectionFx.vesicles[i % 3]); s.position.set(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr); s.width = size * 2.7; s.height = size * 2.7; s.rotation = a + t * .001; s.alpha = .58 + .28 * Math.sin(t * .005 + i) ** 2; s.visible = true; }
    hidePool(scene.infectionVesicles, vN);
    const sporeN = [5, 7, 9, 11, 13][level - 1];
    for (let i = 0; i < sporeN; i++) { const a = t * .00031 + i * 2.399, rr = r * (.42 + .48 * (.5 + .5 * Math.sin(t * .0016 + i * 1.7))), size = (level === 1 ? 1.25 : 1.35 + level * .17) * g.scaleConfig.visual.infectionEffect, s = scene.infectionSpores[i]; s.texture = scene.sporeTexture; s.position.set(p.x + Math.cos(a) * rr - lx * 4, p.y + Math.sin(a) * rr - ly * 4); s.width = size * 2.8; s.height = size * 1.6; s.rotation = a; s.alpha = .58 + .35 * Math.sin(t * .006 + i * 2) ** 2; s.visible = true; }
    hidePool(scene.infectionSpores, sporeN);
  }

  function drawRepulsor(g, t) {
    const wave = g.repulsorWave, p = g.player;
    scene.repulsor.clear(); scene.repulsorHex.visible = false;
    if (!wave || !p) return;
    const stage = g.REPULSOR_LEVELS[wave.level - 1], level = wave.level, legendary = level === 8;
    const charge = wave.phase === 'charge', expand = wave.phase === 'expand', duration = wave.duration || stage.duration;
    const progress = charge ? Math.max(0, Math.min(1, wave.time / .5)) : expand ? Math.max(0, Math.min(1, wave.time / .2)) : Math.max(0, Math.min(1, wave.time / duration));
    const cx = wave.cx, cy = wave.cy;
    const radius = charge ? Math.max((g.playerHitRadius || p.r) + 8, stage.radius * .32) * (1 - .2 * progress) : expand ? wave.radius : stage.radius;
    const alpha = charge ? .22 + .64 * progress : expand ? 1 - .12 * progress : progress > .92 ? (1 - progress) / .08 : 1;
    if (alpha <= 0) return;
    const primary = legendary ? 0xffd76a : 0x63eaff, secondary = legendary ? 0xffb832 : 0xb18aff, core = legendary ? 0xfff3bf : 0xc4a0ff;
    if (level >= 3) {
      const source = g.repulsorHexTextures[level - 1];
      if (source) { scene.repulsorHex.visible = true; setTexture(scene.repulsorHex, source); scene.repulsorHex.position.set(cx, cy); scene.repulsorHex.width = radius * 2; scene.repulsorHex.height = radius * 2; scene.repulsorHex.alpha = alpha * (charge ? .18 + .2 * progress : legendary ? .94 : .62); scene.repulsorHex.rotation = t * (legendary ? .00014 : .00008); }
    }
    const rings = level === 1 ? 1 : level === 2 ? 3 : level >= 4 ? (legendary ? 5 : 3) : 2;
    for (let i = 0; i < rings; i++) {
      const offset = i * (level === 2 ? 22 : level >= 4 ? 17 : 12), rr = Math.max(4, radius - offset - progress * (expand ? i * 5 : 0));
      const color = legendary ? (i % 2 ? secondary : primary) : (i % 2 ? secondary : primary);
      scene.repulsor.lineStyle((legendary ? 2.6 : level >= 4 ? 2 : 1.35) + (level === 5 ? .65 : 0), color, alpha * (level === 1 ? .72 : level === 2 ? .68 - i * .12 : level >= 4 ? .48 - i * .06 : .53 - i * .11)).drawCircle(cx, cy, rr);
    }
    if (level >= 3) {
      const n = legendary ? 16 : level === 3 ? 5 : level === 4 ? 7 : 9;
      scene.repulsor.lineStyle(legendary ? 2.4 : level === 5 ? 2 : 1.4, legendary ? primary : level === 5 ? core : 0x91edff, alpha * .88);
      for (let i = 0; i < n; i++) { const a = t * (legendary ? .001 : .0007) + i * Math.PI * 2 / n, span = .12 + level * .012; scene.repulsor.arc(cx, cy, radius * (.91 + .025 * Math.sin(t * .004 + i)), a, a + span); }
    }
    if (level >= 4) {
      scene.repulsor.lineStyle(legendary ? 3 : level === 5 ? 2.2 : 1.6, legendary ? primary : 0xba85ff, alpha * .78).drawEllipse(cx, cy, radius * .94, radius * .38);
      scene.repulsor.lineStyle(legendary ? 1.8 : 1.2, legendary ? core : 0x65eaff, alpha * .58).drawEllipse(cx, cy, radius * .88, radius * .34);
    }
    if (level === 5 || legendary) {
      const sparks = legendary ? 8 : 4;
      for (let i = 0; i < sparks; i++) {
        const a = t * (legendary ? .00042 : .00028) + i * Math.PI * 2 / sparks, root = radius * .68, tip = radius * .98;
        const x1 = cx + Math.cos(a) * root, y1 = cy + Math.sin(a) * root, x2 = cx + Math.cos(a + .48) * tip, y2 = cy + Math.sin(a + .48) * tip;
        const bx = cx + Math.cos(a + .32) * radius * .86, by = cy + Math.sin(a + .32) * radius * .86;
        scene.repulsor.lineStyle(legendary ? 7 : 5, legendary ? primary : i % 2 ? 0xaa7cff : 0x75efff, alpha * .84).moveTo(x1, y1).quadraticCurveTo(bx, by, x2, y2);
        scene.repulsor.lineStyle(legendary ? 1.8 : 1.1, legendary ? core : 0xe3f8ff, alpha * .9).moveTo(x1, y1).quadraticCurveTo(bx, by, x2, y2);
      }
    }
    if (charge) {
      const pulse = 1 + .12 * Math.sin(t * .018), coreRadius = Math.min((g.playerHitRadius || p.r) + 5, radius * .48);
      scene.repulsor.lineStyle(legendary ? 2.8 : 1.4 + progress, legendary ? core : 0xc7fbff, alpha).drawCircle(cx, cy, coreRadius * pulse);
      scene.repulsor.beginFill(legendary ? primary : 0x44b0ff, (legendary ? .14 : .07) * alpha).drawCircle(cx, cy, coreRadius * 1.35).endFill();
    }
  }

  // One small, reusable GPU mesh per visible organism. The center breathes
  // while the outer membrane/appendages undulate independently; no filters,
  // generated textures, or per-frame mesh allocations are needed.
  function getLivingEnemy(index,pool=scene.enemySprites,layer=scene.enemyLayer) {
    let mesh=pool[index];
    if(!mesh){
      const side=9,total=side*side,vertices=new Float32Array(total*2),uvs=new Float32Array(total*2),indices=new Uint16Array((side-1)*(side-1)*6),rest=new Float32Array(total*5);
      let at=0;
      for(let y=0;y<side;y++)for(let x=0;x<side;x++){
        const i=y*side+x,u=x/(side-1),v=y/(side-1),px=u-.5,py=v-.5,r=Math.hypot(px,py),angle=Math.atan2(py,px);
        vertices[i*2]=px;vertices[i*2+1]=py;uvs[i*2]=u;uvs[i*2+1]=v;
        rest[i*5]=px;rest[i*5+1]=py;rest[i*5+2]=Math.max(0,Math.min(1,(r-.13)/.30));rest[i*5+3]=angle;rest[i*5+4]=r;
        if(x<side-1&&y<side-1){indices[at++]=i;indices[at++]=i+1;indices[at++]=i+side;indices[at++]=i+1;indices[at++]=i+side+1;indices[at++]=i+side}
      }
      mesh=new PIXI.SimpleMesh(PIXI.Texture.EMPTY,vertices,uvs,indices,PIXI.DRAW_MODES.TRIANGLES);mesh.autoUpdate=true;mesh.livingRest=rest;layer.addChild(mesh);pool[index]=mesh;
      if(scene.enemyCoreTexture){mesh.livingCores=[makeSprite(mesh,scene.enemyCoreTexture),makeSprite(mesh,scene.enemyCoreTexture)];for(const core of mesh.livingCores){core.blendMode=PIXI.BLEND_MODES.ADD;core.visible=false}}
    }
    mesh.visible=true;return mesh;
  }
  function animateEnemyBody(mesh,texture,e,width) {
    if(mesh.texture!==texture)mesh.texture=texture;
    const phase=e.phase||0,time=e.animTime||0,stunned=(e.paralysisRemaining||0)>0,kind=e.isBoss?'boss':e.type,rigid=kind==='armored'||kind==='shielded',lancer=kind==='lancer';
    // Keep the early purple organism's already-established movement.
    const originalPurple=kind==='virus'&&!e.miniBoss&&!e.anomaly;
    const beat=time*(rigid?4:6)+phase,breath=Math.sin(time*3.8+phase),stroke=Math.sin(beat),attack=Math.sin(Math.PI*Math.min(1,(e.meleePulse||0)/.32)),cast=Math.sin(Math.PI*Math.min(1,(e.castPulse||0)/.32)),charge=e.castCharge||0,impact=Math.min(1,(e.flash||0)/.09),activity=stunned?.12:1;
    let stretch=originalPurple?1+stroke*.055+attack*.14+cast*.12-charge*.07-impact*.08:1+breath*.012+attack*.045+cast*.025-impact*.045;
    let squash=originalPurple?1-breath*.025-attack*.09+charge*.10+impact*.06:1-breath*.012-attack*.025+impact*.035;
    if(lancer){if(e.spearState==='windup'){stretch*=.96;squash*=1.035}else if(e.spearState==='dash'){stretch*=1.055;squash*=.965}else if(e.spearState==='recover'){stretch*=.985;squash*=1.015}}
    if(kind==='boss'){const action=e.bossAction||'stalk',progress=Math.min(1,(e.bossActionTime||0)/(e.bossActionDuration||1));stretch*=1+Math.sin(time*4.1)*.025;squash*=1-Math.sin(time*4.1)*.025;if(action.startsWith('windup')){stretch*=1-.08*progress;squash*=1+.10*progress}else if(action==='dash'){stretch*=1.14;squash*=.90}else if(action==='slam'){stretch*=1+.09*Math.sin(progress*Math.PI);squash*=1+.09*Math.sin(progress*Math.PI)}}
    const vertices=mesh.vertices,rest=mesh.livingRest,flex=stunned?.006:rigid?.014:lancer?.035:.055;
    for(let i=0;i<vertices.length/2;i++){
      const at=i*5,x=rest[at],y=rest[at+1],edge=rest[at+2],angle=rest[at+3],r=rest[at+4];
      let px=x*stretch,py=y*squash;
      if(originalPurple){
        const wave=Math.sin(beat*1.6+angle*3-r*9)*flex*edge,curl=Math.sin(beat*1.2-angle*4)*flex*edge*.65;
        px=x*(stretch+breath*.024)+x*wave-y*curl;py=y*squash+y*wave+x*curl;
      }else{
        const tail=Math.max(0,Math.min(1,(.10-x)*2.5)),front=Math.max(0,Math.min(1,(x-.05)*3)),side=Math.max(0,Math.min(1,(Math.abs(y)-.075)*3.5)),sign=y<0?-1:1;
        let dx=0,dy=0;
        if(kind==='ocular'){
          const u=x+.5,v=y+.5;
          // Leading eye stays round. Wave displacement grows only behind it.
          px=x-.32;py=y-.03+window.MicroverseCombat.ocularWave(u,v,time);
          dx=0;dy=0;
        }else if(kind==='bacteria'){
          // Traveling flagellar wave, opposed cilia strokes, and a localized
          // mouth contraction. The head is not stretched along with the tail.
          dy+=.058*tail*tail*Math.sin(beat*1.35-x*9+sign*.55);
          dx+=.016*side*Math.sin(beat*1.7-x*13+sign*1.1);
          dy+=sign*.027*side*Math.sin(beat*1.7-x*13+sign*1.1)*(1-front*.75);
          dy+=y*front*(charge*.14+attack*.18+Math.sin(beat*.8)*.045);
          dx-=front*(charge*.013+attack*.018);
        }else if(kind==='armored'){
          // Armored plates rock around a quiet, breathing core. Adjacent
          // plates have different phases instead of making the armor rubbery.
          const hinge=side*side,plate=Math.sin(beat*.9+x*12+sign*1.9);
          dx+=.022*hinge*plate;dy+=sign*.032*hinge*plate;
          dx+=x*.012*Math.sin(beat*.45);dy+=y*.012*Math.sin(beat*.45);
        }else if(kind==='shielded'){
          // The shield face stays firm; the rear organelles propel the body.
          const rear=1-front;
          dy+=.044*tail*Math.sin(beat*1.3-x*10)*rear;
          dx+=.012*side*rear*Math.sin(beat*1.4+sign*2+x*10);
          dy+=sign*.025*side*rear*Math.sin(beat*1.4+sign*2+x*10);
          dx-=front*Math.min(1,(e.blockFlash||0)/.18)*.018;
        }else if(kind==='lancer'){
          const finMotion=e.spearState==='dash'?.34:1,fin=side*(1-front*.8),wave=Math.sin(beat*1.2-x*11+sign*1.7);
          dx+=.020*fin*wave*finMotion;dy+=sign*.038*fin*wave*finMotion;
          dy+=.032*tail*tail*Math.sin(beat-x*7)*finMotion;
          // Only the tip leads/retracts; the spear remains straight.
          dx+=front*(e.spearState==='windup'?-.018:e.spearState==='dash'?.018:0);
        }else if(kind==='boss'){
          const left=Math.max(0,Math.min(1,(.16-x)*2.2)),limb=edge*left;
          dx+=.032*limb*Math.sin(beat*.75+angle*4-r*6);
          dy+=.044*limb*Math.sin(beat*.9-angle*3+r*5);
          dx+=.014*side*Math.sin(beat*.8+x*11+sign*1.8);
          dy+=sign*.020*side*Math.sin(beat*.8+x*11+sign*1.8);
          dy+=y*front*(charge*.10+attack*.09);
        }else{
          // Viral bosses and anomalies retain radial, independent lobes.
          const radial=Math.sin(beat*.9+angle*4-r*6)*.036*edge,tangent=Math.sin(beat*1.15-angle*3)*.025*edge;
          dx+=x*radial*2-y*tangent*2;dy+=y*radial*2+x*tangent*2;
        }
        px+=dx*activity;py+=dy*activity;
      }
      vertices[i*2]=px;vertices[i*2+1]=py;
    }
    const aspect=(texture?.height||1)/Math.max(1,texture?.width||1),devour=e.cellDevourScale??1,shock=stunned?Math.sin(time*58+phase)*.035:0;
    mesh.scale.set(width*devour*(1+shock),width*aspect*devour*(1-shock));
    const facing=Math.atan2(e.facingY||0,e.facingX??1),lunge=attack*width*.025;
    mesh.position.set(e.x+Math.cos(facing)*lunge,e.y+Math.sin(facing)*lunge);
    mesh.rotation=facing+(kind==='ocular'?0:Math.sin(beat*.7)*(originalPurple?.045:rigid?.008:.018))+(lancer&&e.spearState==='recover'?Math.sin(time*60+phase)*Math.min(.12,(e.spearShakeTime||0)*.16):0);
    mesh.tint=e.flash>0?0xffd6da:0xffffff;mesh.alpha=e.cellDevouring?.78:1;
    if(mesh.livingCores){
      const core=mesh.livingCores[0],secondary=mesh.livingCores[1];core.visible=!originalPurple;secondary.visible=!originalPurple&&(kind==='lancer'||kind==='boss'||kind==='bacteria');
      if(!originalPurple){
        const cx=kind==='bacteria'?.24:kind==='shielded'?.08:kind==='boss'?-.08:0,cy=kind==='boss'?-.02:0,size=kind==='ocular'?.10:kind==='boss'?.24:kind==='armored'?.21:.18,pulse=.8+.2*Math.sin(time*4.6+phase);
        core.position.set(cx+Math.sin(beat*.7)*.006,cy+Math.cos(beat*.6)*.006);core.width=size*pulse;core.height=size*pulse/aspect;core.alpha=(.18+.075*breath+charge*.18+cast*.12)*activity;
        core.tint=kind==='ocular'?0x62ffdc:kind==='shielded'?0x63ffb9:kind==='virus'||kind==='boss'?0xd783ff:0xffb54e;
        if(secondary.visible){const small=size*.58,pulse2=.85+.15*Math.sin(time*5.1+phase+2);secondary.position.set(kind==='bacteria'?-.18:kind==='lancer'?.33:.20,kind==='boss'?-.12:.015);secondary.width=small*pulse2;secondary.height=small*pulse2/aspect;secondary.alpha=(.14+.07*Math.sin(time*5.1+phase+2))*activity;secondary.tint=kind==='bacteria'?0x65e7ff:0xffc76b}
      }
    }
  }

  function drawEnemyHealthBar(g,e,texture){
    if(e.encounterHealthHud||e.isBoss)return;
    const aspect=(texture?.height||1)/Math.max(1,texture?.width||1),scale=e.isBoss?g.scaleConfig.reference.bossSprite:g.scaleConfig.reference.enemySprite*(e.type==='lancer'?g.scaleConfig.reference.lancerSpriteScale:1)*(e.elite||e.miniBoss||e.anomaly?1:g.scaleConfig.reference.normalEnemyVisualScale),bar=combatVisuals.healthBarLayout(enemyBarLayout,e,scene.cameraZoom,scale,aspect),graphics=scene.enemyBars,border=bar.border;
    graphics.lineStyle(0).beginFill(0x030c17,.98).drawRoundedRect(bar.x-border,bar.y-border,bar.width+border*2,bar.height+border*2,border*1.4).endFill();
    graphics.beginFill(0x23344a,.98).drawRect(bar.x,bar.y,bar.width,bar.height).endFill();
    if(bar.ratio>0){graphics.beginFill(colorToHex(bar.color)).drawRect(bar.x,bar.y,bar.width*bar.ratio,bar.height).endFill();graphics.beginFill(0xffffff,.3).drawRect(bar.x,bar.y,bar.width*bar.ratio,border).endFill()}
  }

  function drawGuardianShields(g){
    let count=0;scene.shieldLinks.clear();const texture=rendererState.shieldBarrierTexture;if(!texture||texture===PIXI.Texture.EMPTY){hidePool(scene.shieldBarrierSprites,0);return}
    for(const guard of g.enemies){const target=guard.shieldTarget;if(guard.type!=='shielded'||guard.alive===false||guard.hp<=0||guard.shieldBarrierTime<=0||!target||target.alive===false||target.hp<=0)continue;
      const radius=g.functions.guardianShieldRadius(target),s=getPool(scene.shieldBarrierSprites,scene.shieldBarrierLayer,count++),age=guard.shieldLinkAge||0;
      setTexture(s,texture);s.position.set(target.x,target.y);s.width=s.height=radius*2;s.rotation=0;s.alpha=(.74+.05*Math.sin((guard.animTime||0)*4))*Math.min(1,age/.25);s.blendMode=PIXI.BLEND_MODES.NORMAL;
      scene.shieldLinks.lineStyle(1.5/scene.cameraZoom,0x76eec1,.55).moveTo(guard.x,guard.y).lineTo(target.x,target.y);
      scene.shieldLinks.beginFill(0xb0ffdf,.9).drawCircle(guard.x,guard.y,4/scene.cameraZoom).endFill();
    }hidePool(scene.shieldBarrierSprites,count);
  }
  function getChimeraArm(index){let mesh=scene.bossArmMeshes[index];if(!mesh){const columns=13,rows=3,vertices=new Float32Array(columns*rows*2),uvs=new Float32Array(vertices.length),indices=new Uint16Array((columns-1)*(rows-1)*6);let n=0;for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){const at=y*columns+x;uvs[at*2]=x/(columns-1);uvs[at*2+1]=y/(rows-1);if(x<columns-1&&y<rows-1){indices[n++]=at;indices[n++]=at+1;indices[n++]=at+columns;indices[n++]=at+1;indices[n++]=at+columns+1;indices[n++]=at+columns}}mesh=new PIXI.SimpleMesh(rendererState.chimeraTendrilTexture,vertices,uvs,indices,PIXI.DRAW_MODES.TRIANGLES);mesh.autoUpdate=true;mesh.chimeraUvs=uvs;scene.bossArmLayer.addChild(mesh);scene.bossArmMeshes[index]=mesh}mesh.visible=true;return mesh}
  function animateChimeraArm(mesh,pose,e){const vertices=mesh.vertices,uvs=mesh.chimeraUvs;for(let j=0;j<vertices.length/2;j++){const u=uvs[j*2],v=uvs[j*2+1]-.5,slope=Math.PI*pose.bend*Math.cos(u*Math.PI)/pose.length,angle=Math.atan(slope);vertices[j*2]=u*pose.length-Math.sin(angle)*v*pose.thickness;vertices[j*2+1]=Math.sin(u*Math.PI)*pose.bend+Math.cos(angle)*v*pose.thickness}mesh.position.set(pose.x,pose.y);mesh.rotation=pose.angle;mesh.tint=e.flash>0?0xffc3d0:0xffffff;mesh.alpha=1}
  function drawChimeraArms(e,width){if(!rendererState.chimeraTendrilTexture||rendererState.chimeraTendrilTexture===PIXI.Texture.EMPTY)return;for(let i=0;i<6;i++){const pose=window.MicroverseChimera.armPose(scene.chimeraPose,e,i,width),mesh=getChimeraArm(scene.bossArmUsed++);animateChimeraArm(mesh,pose,e)}}
  function chimeraFxSprite(key,x,y,size,rotation,alpha,add=false){
    const texture=rendererState.enemyTextures[key],sprite=getPool(scene.chimeraFxSprites,scene.chimeraFxLayer,scene.chimeraFxUsed++);
    if(!texture||texture===PIXI.Texture.EMPTY||alpha<=0){sprite.visible=false;return}setTexture(sprite,texture);sprite.position.set(x,y);sprite.rotation=rotation;sprite.width=size;sprite.height=size*texture.height/Math.max(1,texture.width);sprite.alpha=alpha;sprite.tint=0xffffff;sprite.blendMode=add?PIXI.BLEND_MODES.ADD:PIXI.BLEND_MODES.NORMAL;
  }
  function drawChimeraEffects(g,e){
    const v=window.MicroverseChimera.effectPose(scene.chimeraFxPose,e),gfx=scene.enemyBars,zoom=scene.cameraZoom,phase=v.phase,time=v.time;
    if(v.action==='dash'){const angle=e.bossAim||0,size=(e.r*2+40)*g.scaleConfig.reference.bossSprite;for(let i=3;i>0;i--)chimeraFxSprite('boss-chimera-core',e.x-Math.cos(angle)*i*74,e.y-Math.sin(angle)*i*74,size*(1-i*.06),angle,.12*(1-i*.15),true)}
    if(v.shield>0){const size=v.shieldRadius*2.15;chimeraFxSprite('chimera-aegis',e.x,e.y,size,Math.sin(time*.8)*.045,v.shield,false);chimeraFxSprite('chimera-aegis',e.x,e.y,size*1.035,-Math.sin(time*.8)*.045,.20*v.shield+v.shieldFlash*.25,true);for(let i=0;i<8;i++){const angle=i*Math.PI/4+time*.16,r=v.shieldRadius*.84;gfx.lineStyle(1.7/zoom,0xf4a9ff,.65*v.shield).moveTo(e.x+Math.cos(angle)*r,e.y+Math.sin(angle)*r).lineTo(e.x+Math.cos(angle+.08)*(r+14),e.y+Math.sin(angle+.08)*(r+14))}}
    if(v.enrage>0){const size=(230+(1-v.enrage)*240)*2.15;chimeraFxSprite('chimera-aegis',e.x,e.y,size,time*.12,v.enrage*.25,true)}
    if(v.sweep>0){const size=v.sweepRadius*2.3;for(let i=2;i>=0;i--)chimeraFxSprite('chimera-cleave',v.sweepX,v.sweepY,size*(1-i*.055),v.sweepAngle-i*.13,v.sweep*(i===0?.96:i===1?.26:.12),i>0);const impact=v.action==='sweep'&&v.progress>=.20/.72&&v.progress<=.45/.72;if(impact)gfx.lineStyle(2/zoom,0xffb4e1,.65*v.sweep).beginFill(0xff3d95,.10*v.sweep).moveTo(e.x,e.y).arc(e.x,e.y,e.bossReach,e.bossAim-e.bossSweepHalf,e.bossAim+e.bossSweepHalf).closePath().endFill()}
    if(v.charge>0){const angle=time*.95,outer=e.bossSlamRadius*(1-v.charge*.86),inner=35+20*v.charge;for(let i=0;i<8;i++){const a=angle+i*Math.PI/4;gfx.lineStyle((1+v.charge)/zoom,phase===1?0xcb8cff:0xff6dab,.24+.45*v.charge).moveTo(e.x+Math.cos(a)*outer,e.y+Math.sin(a)*outer).lineTo(e.x+Math.cos(a+.32)*inner,e.y+Math.sin(a+.32)*inner)}chimeraFxSprite('chimera-rupture',e.x,e.y,(95+v.charge*160)*2.4,-time*.35,.18+v.charge*.38,true)}
    if(v.rupture>0){const radius=v.ruptureRadius*(.18+.82*v.ruptureProgress),size=radius*2.4;chimeraFxSprite('chimera-rupture',v.ruptureX,v.ruptureY,size,time*.06,v.rupture*.92,true);chimeraFxSprite('chimera-rupture',v.ruptureX,v.ruptureY,size*.82,-time*.14,v.rupture*.35,true);gfx.lineStyle((2+v.rupture*3)/zoom,0xffa5df,.9*v.rupture).drawCircle(v.ruptureX,v.ruptureY,radius);if(v.impactFlash>0)gfx.lineStyle(0).beginFill(0xff62b9,v.impactFlash*.22).drawCircle(v.ruptureX,v.ruptureY,v.ruptureRadius).endFill();for(let i=0;i<18+phase*2;i++){const a=i*Math.PI*2/(18+phase*2)+phase*.23,r=radius*(.87+.12*Math.sin(i*2.1)),x=v.ruptureX+Math.cos(a)*r,y=v.ruptureY+Math.sin(a)*r,len=(18+i%4*8)*v.rupture;gfx.lineStyle(0).beginFill(i%2?0xff79c3:0xc783ff,.82*v.rupture).moveTo(x+Math.cos(a)*len,y+Math.sin(a)*len).lineTo(x-Math.sin(a)*len*.22,y+Math.cos(a)*len*.22).lineTo(x+Math.sin(a)*len*.22,y-Math.cos(a)*len*.22).closePath().endFill()}}
  }
  function drawChimeraWarnings(g,e){
    const gfx=scene.enemyBars,action=e.bossAction||'',progress=Math.max(0,Math.min(1,(e.bossActionTime||0)/(e.bossActionDuration||1))),angle=e.bossAim||0,zoom=scene.cameraZoom;
    if(action==='windupLunge'){const length=620+(e.chimeraPhase||1)*65,tx=e.x+Math.cos(angle)*length,ty=e.y+Math.sin(angle)*length,radius=e.r*g.scaleConfig.reference.bossSprite+(g.playerHitRadius||0)+5;gfx.lineStyle(radius*2,0xff3569,.12+.08*progress).moveTo(e.x,e.y).lineTo(tx,ty);gfx.lineStyle(2.5/zoom,0xff8aa4,.92);for(let at=0;at<length;at+=45){const end=Math.min(length,at+27);gfx.moveTo(e.x+Math.cos(angle)*at,e.y+Math.sin(angle)*at).lineTo(e.x+Math.cos(angle)*end,e.y+Math.sin(angle)*end)}}
    else if(action==='windupSweep'){const half=e.bossSweepHalf;gfx.lineStyle(2.5/zoom,0xff7ead,.9).beginFill(0xff2a77,.10+progress*.08).moveTo(e.x,e.y).arc(e.x,e.y,e.bossReach,angle-half,angle+half).closePath().endFill();gfx.lineStyle(2/zoom,0xe391ff,.7).arc(e.x,e.y,e.bossReach*(.2+.8*progress),angle-half,angle+half)}
    else if(action==='windupSlam'){const radius=e.bossSlamRadius;gfx.lineStyle(3/zoom,0xff6388,.95).beginFill(0xff2a57,.08+progress*.06).drawCircle(e.x,e.y,radius).endFill();gfx.lineStyle((1.5+progress)/zoom,0xffb0e0,.8).drawCircle(e.x,e.y,Math.max(1,radius*progress));for(let i=0;i<16;i++){const a=i*Math.PI/8,r=radius-15;gfx.lineStyle(2/zoom,0xff8db8,.9).moveTo(e.x+Math.cos(a)*r,e.y+Math.sin(a)*r).lineTo(e.x+Math.cos(a)*(r+25),e.y+Math.sin(a)*(r+25))}}
  }
  function drawEnemies(g, t) {
    const p = g.player, enemyTime = p?.predatorArcState !== 'idle' ? (p?.predatorArcFrozenAt || t) : t, count = g.enemies.length,zoom=Math.max(.001,scene.cameraZoom),viewLeft=-scene.world.position.x/zoom-110,viewTop=-scene.world.position.y/zoom-110,viewRight=viewLeft+g.W/zoom+220,viewBottom=viewTop+g.H/zoom+220; let shown = 0, infected = 0, trails = 0, flashes = 0, barrierCount=0;
    scene.bossArmUsed=0;scene.chimeraFxUsed=0;drawGuardianShields(g);
    scene.enemyBars.clear(); scene.bossGlow.visible = false;for(const enemy of g.enemies)if(enemy.hybridBoss&&enemy.alive!==false){drawChimeraEffects(g,enemy);drawChimeraWarnings(g,enemy)}
    for (const arc of g.synapticArcs || []) { const dx=arc.x2-arc.x1,dy=arc.y2-arc.y1,length=Math.hypot(dx,dy)||1,nx=-dy/length,ny=dx/length,fade=Math.max(0,Math.min(1,arc.life/arc.duration)),color=arc.blocked?0xb1dfff:0x72cfff,segments=8; scene.enemyBars.lineStyle(3.2,color,.18*fade); for(let q=0;q<=segments;q++){const u=q/segments,wave=q===0||q===segments?0:Math.sin(arc.phase+enemyTime*.035+q*2.4)*5,px=arc.x1+dx*u+nx*wave,py=arc.y1+dy*u+ny*wave;if(!q)scene.enemyBars.moveTo(px,py);else scene.enemyBars.lineTo(px,py)} scene.enemyBars.lineStyle(1.15,arc.blocked?0xe4f6ff:0xbdf7ff,.86*fade); for(let q=0;q<=segments;q++){const u=q/segments,wave=q===0||q===segments?0:Math.sin(arc.phase+enemyTime*.035+q*2.4)*5,px=arc.x1+dx*u+nx*wave,py=arc.y1+dy*u+ny*wave;if(!q)scene.enemyBars.moveTo(px,py);else scene.enemyBars.lineTo(px,py)} }
    for (let i = 0; i < count; i++) { const e = g.enemies[i]; if (!e || e.alive === false||e.x<viewLeft-e.r*3||e.x>viewRight+e.r*3||e.y<viewTop-e.r*3||e.y>viewBottom+e.r*3) continue;
      if (e.isBoss || e.type === 'boss') { const key=g.functions.enemySpriteAssetKey(e),img=rendererState.enemyTextures['boss-chimera-core']||rendererState.enemyTextures[key]||rendererState.enemyTextures['boss-chimera'],s=getLivingEnemy(shown++),stunned=(e.paralysisRemaining||0)>0,shock=Math.max(stunned?.6+.3*Math.sin(enemyTime*.05+e.phase):0,Math.max(0,Math.min(1,(e.synapticFlash||0)/.24)));drawChimeraArms(e,(e.r*2+40)*g.scaleConfig.reference.bossSprite);animateEnemyBody(s,img,e,(e.r*2+40)*g.scaleConfig.reference.bossSprite);drawEnemyHealthBar(g,e,img); scene.bossGlow.visible = true; scene.bossGlow.position.set(e.x, e.y); scene.bossGlow.width = scene.bossGlow.height = e.r * 4.1; scene.bossGlow.alpha = .6 + .08 * Math.sin(enemyTime * .002); if(shock>0){scene.enemyBars.lineStyle(1.3,0x9be5ff,.86*shock);for(let q=0;q<4;q++){const a=enemyTime*.012+e.phase+q*Math.PI/2,ca=Math.cos(a),sa=Math.sin(a),r1=e.r*.62,r2=e.r*1.03,kink=(q%2?1:-1)*e.r*.1;scene.enemyBars.moveTo(e.x+ca*r1,e.y+sa*r1).lineTo(e.x+ca*e.r*.82-sa*kink,e.y+sa*e.r*.82+ca*kink).lineTo(e.x+ca*r2,e.y+sa*r2)}} continue; }
      const key=g.functions.enemySpriteAssetKey(e),img=rendererState.enemyTextures[key]||rendererState.enemyTextures['boss-lancer'],s=getLivingEnemy(shown++),renderScale=g.scaleConfig.reference.enemySprite*(e.type==='lancer'?g.scaleConfig.reference.lancerSpriteScale:1)*(e.elite||e.miniBoss||e.anomaly?1:g.scaleConfig.reference.normalEnemyVisualScale),stunned=(e.paralysisRemaining||0)>0;animateEnemyBody(s,img,e,(e.r*2+40)*renderScale);
      if(e.elite&&!e.anomaly){const scale=g.scaleConfig.reference.enemySprite*(e.type==='lancer'?g.scaleConfig.reference.lancerSpriteScale:1)*(e.elite||e.miniBoss||e.anomaly?1:g.scaleConfig.reference.normalEnemyVisualScale),pulse=.72+.2*Math.sin(enemyTime*.006+e.phase),ring=e.r*scale+7;scene.enemyBars.lineStyle(e.miniBoss?5:3,e.miniBoss?0xffb832:0xffc84f,pulse).drawCircle(e.x,e.y,ring);scene.enemyBars.lineStyle(e.miniBoss?2:1.2,0xfff0a3,pulse*.74).drawCircle(e.x,e.y,ring+(e.miniBoss?9:5))}
      if(e.cellDevouring){scene.enemyBars.lineStyle(2,0xb4ff70,.9).drawCircle(e.x,e.y,e.r*g.scaleConfig.reference.enemySprite+5);if(e.cellDevourCaptured)scene.enemyBars.lineStyle(1.2,0xe5ffc8,.75).drawCircle(e.x,e.y,e.r*g.scaleConfig.reference.enemySprite+8)}
      const synaptic=Math.max(stunned?.58+.32*Math.sin(enemyTime*.05+e.phase):0,Math.max(0,Math.min(1,(e.synapticFlash||0)/.24)));if(synaptic>0){scene.enemyBars.lineStyle(1.15,0x87dcff,.82*synaptic);for(let q=0;q<3;q++){const a=enemyTime*.014+e.phase+q*Math.PI*2/3,ca=Math.cos(a),sa=Math.sin(a),r1=e.r*.58,r2=e.r*1.04,kink=(q%2?1:-1)*e.r*.13,x1=e.x+ca*r1,y1=e.y+sa*r1,xm=e.x+ca*e.r*.8-sa*kink,ym=e.y+sa*e.r*.8+ca*kink,x2=e.x+ca*r2,y2=e.y+sa*r2;scene.enemyBars.moveTo(x1,y1).lineTo(xm,ym).lineTo(x2,y2)}}
      drawEnemyHealthBar(g,e,img);if(e.disintegrationMark>0)scene.enemyBars.lineStyle(1.5/zoom,0x7affe2,Math.min(1,e.disintegrationMark/.3)).drawCircle(e.x,e.y,e.r*g.scaleConfig.reference.enemySprite+14);
      if ((e.type === 'lancer'||e.hybridBoss) && e.spearState === 'windup') { const cfg=g.scaleConfig.visual.lancerTelegraph,a=Math.atan2(e.spearDirY,e.spearDirX),hitRadius=e.r*g.scaleConfig.reference.enemySprite*(e.hybridBoss?1:g.scaleConfig.reference.lancerSpriteScale),start=hitRadius,end=cfg.dashLength,pulse=.55+.4*Math.sin(enemyTime*.025),dangerWidth=Math.min(e.hybridBoss?150:999,2*((g.playerHitRadius||0)+hitRadius+5));scene.enemyBars.lineStyle(dangerWidth,0xff4d42,cfg.dangerOpacity*pulse).moveTo(e.x+Math.cos(a)*start,e.y+Math.sin(a)*start).lineTo(e.x+Math.cos(a)*end,e.y+Math.sin(a)*end);scene.enemyBars.lineStyle(cfg.glowWidth,0xff663f,.42*pulse).moveTo(e.x+Math.cos(a)*start,e.y+Math.sin(a)*start).lineTo(e.x+Math.cos(a)*end,e.y+Math.sin(a)*end);scene.enemyBars.lineStyle(cfg.dashWidth,0xfff0ca,.95*pulse);for(let at=start;at<end;at+=cfg.dashMark+cfg.dashGap){const stop=Math.min(end,at+cfg.dashMark);scene.enemyBars.moveTo(e.x+Math.cos(a)*at,e.y+Math.sin(a)*at).lineTo(e.x+Math.cos(a)*stop,e.y+Math.sin(a)*stop)}const tipX=e.x+Math.cos(a)*end,tipY=e.y+Math.sin(a)*end,side=a+Math.PI*.82;scene.enemyBars.moveTo(tipX,tipY).lineTo(tipX+Math.cos(side)*cfg.arrowHead,tipY+Math.sin(side)*cfg.arrowHead).moveTo(tipX,tipY).lineTo(tipX+Math.cos(side+Math.PI*.36)*cfg.arrowHead,tipY+Math.sin(side+Math.PI*.36)*cfg.arrowHead); }
      if (e.infection && e.infection.remaining > 0) { const fx = getPool(scene.infectionSprites, scene.infectionLayer, infected++), infectedImg = g.functions.getInfectedSprite(e.infection.level, true), scale = e.r / 20, pulse = .8 + .2 * Math.sin(t * .009 + e.phase); setTexture(fx, infectedImg); fx.position.set(e.x, e.y); const d = sourcePixels(infectedImg, g.DPR) * scale * pulse * g.scaleConfig.visual.infectionMark; fx.width = fx.height = d; fx.rotation = Math.sin(t * .001 + e.phase) * .08 + (e.infection.level === 5 ? t * .002 : 0); fx.alpha = e.infection.remaining < .5 ? Math.max(0, e.infection.remaining / .5) : 1; }
      const vx = e.repulsorVx || 0, vy = e.repulsorVy || 0, speed = Math.hypot(vx, vy), flash = e.repulsorFlash || 0;
      if (speed >= 24 || flash > 0) { const gfx = scene.trailGraphics[trails++]; gfx.clear(); gfx.visible = true; gfx.alpha = Math.min(.65, Math.max(flash * 1.5, speed / 480)); if (speed >= 24) { gfx.lineStyle(Math.max(1.5, e.r * .13), 0x70dcff, .9).moveTo(e.x - vx * .075, e.y - vy * .075).lineTo(e.x, e.y); gfx.lineStyle(.8, 0xd8faff, .9).moveTo(e.x - vx * .075, e.y - vy * .075).lineTo(e.x, e.y); } if (flash > 0) { const ring = g.functions.getFlashRing('repulsor', e.r + 3 + (1 - flash) * 8, true), rs = getPool(scene.flashSprites, scene.trailLayer, flashes++); setTexture(rs, ring?.image); rs.position.set(e.x, e.y); rs.width = rs.height = ring?.size || 20; rs.alpha = flash * 1.5; rs.blendMode = PIXI.BLEND_MODES.ADD; } }
    }
    const hostileShots=g.enemyProjectiles||[];let projectileSpriteIndex=0;
    for(const shot of hostileShots){
      if(shot.kind==='thorn'){
        const {x,y,dx,dy}=shot;
        scene.enemyBars.lineStyle(1,0xffe7a0,1).beginFill(0xe59738,1)
          .moveTo(x+dx*13,y+dy*13).lineTo(x-dx*10-dy*4,y-dy*10+dx*4)
          .lineTo(x-dx*6,y-dy*6).lineTo(x-dx*10+dy*4,y-dy*10-dx*4).closePath().endFill();
      }else if(shot.kind==='arc'){
        const texture=rendererState.crimsonSweepTexture;
        for(let layer=2;layer>=0;layer--){const sprite=getPool(scene.enemyProjectileSprites,scene.enemyProjectileLayer,projectileSpriteIndex++);if(texture&&texture!==PIXI.Texture.EMPTY){setTexture(sprite,texture);const size=Math.max(94,(shot.arcRadius||15)*3.25)*(1-layer*.05),trail=layer*(shot.speed||205)*.09;sprite.anchor.set(.5);sprite.position.set(shot.x-shot.dx*trail,shot.y-shot.dy*trail);sprite.rotation=Math.atan2(shot.dy,shot.dx)-layer*.035;sprite.width=size;sprite.height=size*(texture.height/Math.max(1,texture.width))*1.42;sprite.tint=0xffffff;sprite.alpha=layer===0?.96:layer===1?.22:.10;sprite.blendMode=layer===0?PIXI.BLEND_MODES.NORMAL:PIXI.BLEND_MODES.ADD;sprite.visible=true}else sprite.visible=false}
        for(let i=0;i<3;i++){const a=(shot.travelled||0)*.04+i*2.1,r=(shot.arcRadius||15)*.72;scene.enemyBars.lineStyle(2,0xff4962,.65).moveTo(shot.x+Math.cos(a)*r,shot.y+Math.sin(a)*r).lineTo(shot.x+Math.cos(a)*r-shot.dx*28,shot.y+Math.sin(a)*r-shot.dy*28)}
      }else{
        const scale=shot.visualScale||1;scene.enemyBars.lineStyle(5*scale,0xc484ff,.18).moveTo(shot.x-shot.dx*19*scale,shot.y-shot.dy*19*scale).lineTo(shot.x,shot.y);scene.enemyBars.beginFill(0xbd71ff,.22).drawCircle(shot.x,shot.y,shot.r*1.8*scale).endFill();scene.enemyBars.beginFill(0xf1c8ff,.95).drawCircle(shot.x,shot.y,shot.r*.72*scale).endFill()
      }
    }
    hidePool(scene.enemyProjectileSprites,projectileSpriteIndex);
    hidePool(scene.chimeraFxSprites,scene.chimeraFxUsed);hidePool(scene.bossArmMeshes,scene.bossArmUsed);hidePool(scene.enemySprites, shown); hidePool(scene.infectionSprites, infected); hidePool(scene.flashSprites, flashes); for (let i = trails; i < scene.trailGraphics.length; i++) { scene.trailGraphics[i].clear(); scene.trailGraphics[i].visible = false; }
    // Keep particle/ring render objects pooled separately; avoid allocating in the frame loop.
    return { shown, infected };
  }

  function drawParticles(g, t) {
    let drawn = 0, special = 0;
    for (let i = 0; i < g.sparks.length; i++) {
      const p = g.sparks[i]; if (!p || p.life <= 0) continue;
      const color = p.color || '#66eaff', progress = Math.max(0, Math.min(1, 1 - p.life / (p.duration || .22))), specialKind = ['blast','storm','infectionBurst','repulsorHit','synaptic','tentacleLash'].includes(p.kind);
      const s = getPool(scene.particles, scene.particleLayer, drawn++);
      if (p.kind?.startsWith('material:')) {
        const image = g.functions.getItemSprite(p.kind.slice(9));
        setTexture(s, image); s.position.set(p.x, p.y - progress * 85); s.width = s.height = 32 / scene.cameraZoom; s.alpha = Math.min(1, p.life / .22); s.rotation = 0; s.blendMode = PIXI.BLEND_MODES.NORMAL; s.visible = !!image; continue;
      }
      s.rotation = 0;
      const ring = g.functions.getSparkRing(color, Math.min(24, p.radius || 5), true);
      setTexture(s, ring?.image); s.position.set(p.x, p.y); const base = p.kind === 'diagnostic' ? (p.radius || 5) * 2.4 : Math.max(5, (p.radius || 6) * progress * 1.8); s.width = s.height = base + 18; s.alpha = p.kind === 'diagnostic' ? .7 : Math.max(0, 1 - progress); s.blendMode = PIXI.BLEND_MODES.ADD;
      if (specialKind && special < scene.particleGraphics.length) {
        const gfx = scene.particleGraphics[special++], rays = p.kind === 'storm' ? 16 : p.kind === 'infectionBurst' ? 8 : p.kind === 'repulsorHit' ? 6 : p.kind === 'synaptic' ? 7 : p.kind === 'tentacleLash' ? 8 : 10, rings = p.kind === 'storm' ? 4 : p.kind === 'repulsorHit' || p.kind === 'synaptic' ? 2 : p.kind === 'tentacleLash' ? 2 : 3, radius = p.radius || 12;
        gfx.clear(); gfx.visible = true;
        for (let r = 0; r < rings; r++) { const rr = radius * progress * (.72 + r * .14), alpha = (1 - progress) * (.78 - r * .12), amp = 2 + r * .8; gfx.lineStyle(p.kind === 'storm' ? 2.3 : p.kind === 'repulsorHit' || p.kind === 'synaptic' ? 1.4 : 1.9, colorToHex(color), alpha); for (let q = 0; q <= 28; q++) { const a = q / 28 * Math.PI * 2, rad = rr + Math.sin(a * 7 + (t + r * 28) * .01) * amp + Math.sin(a * 11 - (t + r * 28) * .008) * amp * .32, x = p.x + Math.cos(a) * rad, y = p.y + Math.sin(a) * rad; if (!q) gfx.moveTo(x,y); else gfx.lineTo(x,y); } gfx.closePath(); }
        for (let q = 0; q < rays; q++) { const a = q / rays * Math.PI * 2 + progress * .2, inner = radius * progress * .35, outer = radius * progress * (.76 + (q % 3) * .08); gfx.lineStyle(q % 2 ? 1 : 1.6, colorToHex(color), (1 - progress) * .75).moveTo(p.x + Math.cos(a) * inner, p.y + Math.sin(a) * inner).lineTo(p.x + Math.cos(a) * outer, p.y + Math.sin(a) * outer); }
      }
    }
    hidePool(scene.particles, drawn);
    for (let i = special; i < scene.particleGraphics.length; i++) { scene.particleGraphics[i].clear(); scene.particleGraphics[i].visible = false; }
  }

  function colorToHex(value) { return Number.parseInt(String(value).replace('#',''), 16) || 0x66eaff; }

  function drawOrbsAndShots(g) {
    let n = 0;
    for (const o of g.orbs) { const glow=getPool(scene.orbGlows,scene.orbLayer,n),s=getPool(scene.orbSprites,scene.orbLayer,n++),variant=o.dnaType||'purple',tint=variant==='green'?0x50ed83:variant==='red'?0xff526e:0xb56bff,size=(o.r||5)*3*g.scaleConfig.visual.experienceOrb,time=g.player?.tentacleAnimTime||0,phase=o.x*.017+o.y*.011,bob=Math.sin(time*.0025+phase)*2;setTexture(glow,scene.orbGlowTexture);glow.position.set(o.x,o.y+bob);glow.width=size*1.15;glow.height=size*1.9;glow.alpha=o.magnetized?.40:.18;glow.tint=tint;glow.blendMode=PIXI.BLEND_MODES.ADD;setTexture(s,scene.orbTextures[variant]);s.tint=0xffffff;s.position.set(o.x,o.y+bob);s.width=s.height=size*1.12;s.rotation=Math.sin(time*.0014+phase)*.12;s.alpha=o.magnetized?1:.94; }
    hidePool(scene.orbGlows, n); hidePool(scene.orbSprites, n);
    n = 0; let vesicles = 0, trails = 0; const vesicleLevel = g.upgradeLevels.explosive_vesicles || 0;
    for (const shot of g.shots) {
      if(shot.kind==='predatorLash')continue;
      const isVesicle = !!vesicleLevel && !shot.kind, line = getPool(scene.shotSprites, scene.shotLayer, n++);
      if (isVesicle) { line.visible = false; const v = getPool(scene.shotVesicles, scene.shotLayer, vesicles++), sizeLevel = 2.4 + vesicleLevel * .48, info = g.functions.getCellOrganelleSprite(sizeLevel, '#ffd39a', '#ed633e'), size = info ? info.image.width / g.DPR * sizeLevel / info.nominal : 9; setTexture(v, info?.image); v.position.set(shot.x, shot.y); v.width = v.height = size * g.scaleConfig.visual.projectile; v.rotation = Math.atan2(shot.dy, shot.dx); v.visible = true; const trail = scene.shotTrails[trails++]; if (trail) { trail.clear(); trail.visible = true; trail.lineStyle(1.4, 0xffac66, .65).moveTo(shot.x - shot.dx * 8, shot.y - shot.dy * 8).lineTo(shot.x - shot.dx * 2, shot.y - shot.dy * 2); } }
      else { const info = g.functions.getShotGlowSprite(shot.kind, shot.baseRadius, shot.divisionLevel || 0); setTexture(line, info?.image); line.position.set(shot.x, shot.y); line.width = (info?.width || 16) * g.scaleConfig.visual.projectile; line.height = (info?.height || 8) * g.scaleConfig.visual.projectile; line.rotation = Math.atan2(shot.dy, shot.dx); line.visible = true; }
    }
    hidePool(scene.shotSprites, n); hidePool(scene.shotVesicles, vesicles); for (let i = trails; i < scene.shotTrails.length; i++) { scene.shotTrails[i].clear(); scene.shotTrails[i].visible = false; } let lashIndex=0;const lashTexture=rendererState.tentacleLashTextures[5]||rendererState.tentacleLashTextures[4];for(const shot of g.shots){if(shot.kind!=='predatorLash')continue;const sprite=getPool(scene.predatorLashSprites,scene.shotLayer,lashIndex++);if(!lashTexture||lashTexture===PIXI.Texture.EMPTY){sprite.visible=false;continue}setTexture(sprite,lashTexture);const radius=shot.arcRadius||15,size=Math.max(94,radius*3.25);sprite.anchor.set(.5);sprite.position.set(shot.x,shot.y);sprite.rotation=Math.atan2(shot.dy,shot.dx);sprite.width=size;sprite.height=size*(lashTexture.height/Math.max(1,lashTexture.width))*1.42;sprite.tint=0xffffff;sprite.alpha=.94;sprite.blendMode=PIXI.BLEND_MODES.ADD;sprite.visible=true}hidePool(scene.predatorLashSprites,lashIndex)
  }

  function drawCombatBeam(graphics,b,color,alpha){if(!b?.visible||b.length<=0)return;const ux=Math.cos(b.angle),uy=Math.sin(b.angle),nx=-uy*b.width/2,ny=ux*b.width/2,ex=b.x+ux*b.length,ey=b.y+uy*b.length;graphics.lineStyle(0).beginFill(color,alpha).moveTo(b.x+nx,b.y+ny).lineTo(ex+nx,ey+ny).lineTo(ex-nx,ey-ny).lineTo(b.x-nx,b.y-ny).closePath().drawCircle(b.x,b.y,b.width/2).drawCircle(ex,ey,b.width/2).endFill();graphics.lineStyle(b.width*.24,0xecfffa,Math.min(1,alpha+.3)).moveTo(b.x,b.y).lineTo(ex,ey);graphics.lineStyle(0).beginFill(0xeaffff,alpha).drawCircle(ex,ey,b.width*.24).endFill()}
  function createOcularRayRig(){
    const V=window.MicroverseOcularRay,rig={root:new PIXI.Container(),frame:V.createFrame(),meshes:[]},uv=new Float32Array(V.COUNT*4),indices=new Uint16Array(V.SEGMENTS*6);
    for(let j=0;j<V.COUNT;j++){const u=j/V.SEGMENTS;uv.set([u,0,u,1],j*4);if(j<V.SEGMENTS){const k=j*2;indices.set([k,k+1,k+2,k+1,k+3,k+2],j*6)}}
    const names=['outer','plasma','core','white','helixA','helixB'],colors=[0xff1738,0xff4a16,0xffd451,0xfffce8,0xff6324,0xffe09b],alphas=[.16,.83,.98,1,.88,.92];
    for(let i=0;i<names.length;i++){const mesh=new PIXI.SimpleMesh(PIXI.Texture.WHITE,rig.frame[names[i]],new Float32Array(uv),new Uint16Array(indices));mesh.autoUpdate=false;mesh.tint=colors[i];mesh.alpha=alphas[i];rig.root.addChild(mesh);rig.meshes.push(mesh)}
    rig.root.visible=false;scene.ocularRayLayer.addChild(rig.root);return rig;
  }
  function updateOcularRayRig(b,time){const rig=scene.ocularRayRig;if(!rig)return;rig.root.visible=b.visible&&b.length>0;if(!rig.root.visible)return;window.MicroverseOcularRay.sample(rig.frame,b,time);for(let i=0;i<rig.meshes.length;i++){const mesh=rig.meshes[i];mesh.geometry.getBuffer('aVertexPosition').update(mesh.vertices)}}
  function drawEpicRay(graphics,b,time){
    updateOcularRayRig(b,time);if(!b.visible||b.length<=0)return;const ux=Math.cos(b.angle),uy=Math.sin(b.angle),ex=b.x+ux*b.length,ey=b.y+uy*b.length,w=b.width;
    graphics.lineStyle(w*.065,0xff7c2d,.7).drawCircle(b.x,b.y,w*.43);
    if(!b.impact)return;graphics.lineStyle(0).beginFill(0xfff1bd,.96).drawCircle(ex,ey,w*.46).endFill();
    for(let i=0;i<16;i++){const a=i*2.399963,travel=(time*1.8+i*.173)%1,r=w*(.5+travel*2.5),dx=Math.cos(a),dy=Math.sin(a);graphics.lineStyle((1-travel)*w*.07+1,i%3===0?0xffd87f:0xff5d28,(1-travel)*.85).moveTo(ex+dx*r,ey+dy*r).lineTo(ex+dx*(r+w*.28),ey+dy*(r+w*.28))}
  }
  function drawRayScars(g){const c=g.player?.combat,pool=scene.rayScarSprites;for(let i=0;i<pool.length;i++){const s=pool[i],scar=c?.scars[i];s.visible=!!scar&&scar.life>0;if(!s.visible)continue;s.position.set(scar.x,scar.y);s.width=scar.size;s.height=scar.size*.78;s.rotation=scar.angle;s.alpha=Math.min(1,scar.life/.8)*.88}}
  function drawOcularAimGuide(graphics,p,pose,size){
    if(!pose?.initialized)return;const distance=size*1.72,ex=p.x+Math.cos(pose.gazeAngle)*distance,ey=p.y+Math.sin(pose.gazeAngle)*distance,r=size*.075+3;
    // Floating HUD reticle: clear space around the organism, with no shaft or spike.
    graphics.lineStyle(2.5,0xffd5af,.58).drawCircle(ex,ey,r).moveTo(ex-r*1.8,ey).lineTo(ex-r*1.25,ey).moveTo(ex+r*1.25,ey).lineTo(ex+r*1.8,ey).moveTo(ex,ey-r*1.8).lineTo(ex,ey-r*1.25).moveTo(ex,ey+r*1.25).lineTo(ex,ey+r*1.8);
  }
  function drawPlayerCombat(g){
    const graphics=scene.combatBeamGraphics,c=g.player?.combat;graphics.clear();if(g.party){if(scene.ocularRayRig)scene.ocularRayRig.root.visible=false;for(const light of scene.rayLights||[])light.visible=false;return}if(!c){if(scene.ocularRayRig)scene.ocularRayRig.root.visible=false;for(const light of scene.rayLights||[])light.visible=false;return}
    const p=g.player,V=window.MicroverseOcularRay,size=((p.r||0)*2+20)*(g.scaleConfig?.reference.organismSprite||1),pose=c.organism==='ocular'?c.bodyPose:null;
    const auto=V.beamView(scene.ocularAutoView||(scene.ocularAutoView={}),c.auto.beam,pose,size*.765),ray=V.beamView(scene.ocularRayView||(scene.ocularRayView={}),c.ray,pose,size*.765);
    drawCombatBeam(graphics,auto,0xff8849,.78);drawEpicRay(graphics,ray,c.time);
    for(let i=0;i<(scene.rayLights?.length||0);i++){const light=scene.rayLights[i],b=ray;light.visible=b.visible&&(i===0||b.impact);if(!light.visible)continue;light.position.set(b.x+Math.cos(b.angle)*b.length*i,b.y+Math.sin(b.angle)*b.length*i);light.width=light.height=b.width*(i?6:3.4);light.alpha=(i?.65:.42)*(.96+.04*Math.sin(c.time*7))}
    if(pose)drawOcularAimGuide(graphics,p,pose,size*.765);
    const trail=pose?pose.dashStretch:c.dash.active?1:0;if(trail>.035){for(let i=1;i<=3;i++){const distance=i*30;graphics.lineStyle((5-i)/Math.max(.01,scene.cameraZoom),pose?(i%2?0xff3157:0x973ae3):0x9affeb,.28*trail/i).moveTo(p.x-c.dash.x*distance,p.y-c.dash.y*distance).lineTo(p.x-c.dash.x*(distance+22),p.y-c.dash.y*(distance+22))}}
  }
  function createOcularRig(){
    const V=window.MicroverseOcularVisuals,a=V.assets(),rig={root:new PIXI.Container(),arms:[],plates:[]};
    rig.root.interactiveChildren=false;scene.playerLayer.addChild(rig.root);const texture=getTexture(a.tendon);
    for(let arm=0;arm<V.ARMS;arm++){
      const uv=new Float32Array(V.POINTS*4),indices=new Uint16Array((V.POINTS-1)*6);
      for(let j=0;j<V.POINTS;j++){const u=j/(V.POINTS-1);uv.set([u,arm<3?1:0,u,arm<3?0:1],j*4);if(j<V.POINTS-1){const k=j*2;indices.set([k,k+1,k+2,k+1,k+3,k+2],j*6)}}
      const mesh=new PIXI.SimpleMesh(texture,new Float32Array(V.POINTS*4),uv,indices);mesh.autoUpdate=false;rig.root.addChild(mesh);rig.arms.push(mesh);
    }
    for(const name of ['membrane','carapace','cracks'])rig[name]=makeSprite(rig.root,getTexture(a[name==='carapace'?'plates':name]));
    rig.cracks.blendMode=PIXI.BLEND_MODES.ADD;
    for(let i=0;i<6;i++)rig.plates.push(makeSprite(rig.root,getTexture(a.plate)));
    for(const name of ['eyeball','iris','glow','pupil','gleam'])rig[name]=makeSprite(rig.root,getTexture(a[name]));
    rig.glow.blendMode=PIXI.BLEND_MODES.ADD;return rig;
  }
  function placeOcularPart(sprite,x,y,w,h,angle,size){sprite.position.set(x*size,y*size);sprite.width=w*size;sprite.height=h*size;sprite.rotation=angle}
  function drawOcular(g,size){
    const rig=scene.ocularRig||(scene.ocularRig=createOcularRig()),p=g.player,pose=p.combat.bodyPose,V=window.MicroverseOcularVisuals;
    rig.root.visible=pose.initialized;if(!pose.initialized)return;rig.root.position.set(p.x,p.y);
    for(let arm=0;arm<V.ARMS;arm++){const mesh=rig.arms[arm];V.fillVertices(mesh.vertices,pose,arm,size);mesh.geometry.getBuffer('aVertexPosition').update(mesh.vertices)}
    const recoil=pose.recoil||0;
    placeOcularPart(rig.membrane,-.055*pose.facingX,-.055*pose.facingY,.86*pose.breath*pose.compress,.81*pose.breath,pose.angle,size);
    placeOcularPart(rig.carapace,-recoil*pose.facingX,-recoil*pose.facingY,.98*pose.breath*pose.compress,.98*pose.breath,pose.angle,size);
    placeOcularPart(rig.cracks,-recoil*pose.facingX,-recoil*pose.facingY,.98*pose.breath*pose.compress,.98*pose.breath,pose.angle,size);rig.cracks.alpha=.18+.07*Math.sin(pose.animTime*2.7)+pose.rayOpen*.70;
    for(let i=0;i<6;i++){const angle=pose.angle+(i+.5)/6*Math.PI*2,breath=.005*Math.sin(pose.swim*.8+i*1.4);placeOcularPart(rig.plates[i],Math.cos(angle)*.34,Math.sin(angle)*.34,.18,.22,angle+Math.PI/2+breath,size)}
    const eye=.60*(1+.08*pose.rayOpen);placeOcularPart(rig.eyeball,0,0,eye,eye,0,size);
    placeOcularPart(rig.iris,pose.gazeX,pose.gazeY,.40,.40,0,size);placeOcularPart(rig.glow,pose.gazeX,pose.gazeY,.56,.56,0,size);rig.glow.alpha=.12+pose.rayOpen*.65;
    placeOcularPart(rig.pupil,pose.gazeX,pose.gazeY,.13*(1-.13*pose.rayOpen),.35,0,size);placeOcularPart(rig.gleam,0,0,eye,eye,0,size);
  }
  function drawFantasyParty(g){
    const V=window.MicroverseFantasyVisuals,graphics=scene.fantasyShadows;graphics.clear();V.drawPixiDashTrail(graphics,g.party);scene.fantasyRoot.visible=true;scene.playerLayer.alpha=1;scene.playerBody.visible=false;scene.bodyGlow.visible=false;scene.orbital.visible=false;scene.orbitalThorns.visible=false;scene.playerOrbit.clear();hidePool(scene.spines,0);hidePool(scene.phaseGhosts,0);if(scene.ocularRig)scene.ocularRig.root.visible=false;
    for(let i=0;i<3;i++){const m=g.party.members[i],sprite=scene.fantasySprites[i],pose=V.spritePose(scene.fantasyPose,m),frames=rendererState.heroFrames[V.spriteKey(m.classId)]||rendererState.heroFrames[m.classId];sprite.texture=frames[pose.frame];sprite.position.set(pose.x,pose.y);sprite.rotation=pose.rotation;sprite.width=pose.size*pose.scaleX;sprite.height=pose.size*pose.scaleY;sprite.alpha=pose.alpha;sprite.tint=pose.tint;graphics.lineStyle(0).beginFill(0x000000,.24).drawEllipse(m.x,m.y+48,39,14).endFill();if(i){graphics.beginFill(0x12121c,.85).drawRect(m.x-35,m.y-91,70,6).endFill().beginFill(m.incapacitated>0?0xa79388:0x8ab195,1).drawRect(m.x-35,m.y-91,70*(m.incapacitated>0?window.MicroverseParty.reviveProgress(g.party,m):m.hp/m.maxHp),6).endFill()}}
    V.drawPixiEffects(scene.fantasyEffects,g.party);window.MicroverseBasicVisuals.drawPixi(scene.basicFx,g.party);window.MicroverseWarriorVisuals.drawPixi(scene.warriorFx,g.party);window.MicroverseArcherVisuals.drawPixi(scene.archerFx,g.party);window.MicroverseMageVisuals.drawPixi(scene.mageFx,g.party);window.MicroverseClericVisuals.drawPixi(scene.clericFx,g.party);
  }
  function drawPlayer(g, t) {if(g.party){drawFantasyParty(g);return}if(scene.fantasyRoot)scene.fantasyRoot.visible=false;
    const p = g.player; if (!p) return;
    const count = id => Math.max(0, g.upgradeLevels[id] || 0), stage = Math.max(0, Math.min(9, g.level - 1)), f = g.EVOLUTION_FRAMES[stage], liquidLevel = count('liquid_phase'), phaseActive = p.phaseActive > 0, phaseVisual = liquidLevel ? (phaseActive ? Math.min(1, (p.phaseElapsed || 0) / .22) : Math.min(1, (p.phaseReform || 0) / .42)) : 0, motion = Math.hypot(p.motionX || 0, p.motionY || 0), bodyTime = g.organismId === 'tentacular' ? (p.tentacleAnimTime || t) : t, attackPhase = p.tentacleAttackPhase || 'idle', phaseTime = p.tentaclePhaseTime || 0, windup = attackPhase === 'windup' ? Math.max(0, Math.min(1, phaseTime / .10)) : 0, release = attackPhase === 'sweep' ? Math.max(0, Math.min(1, phaseTime / .16)) : 0, recovery = attackPhase === 'recover' ? Math.max(0, Math.min(1, phaseTime / .12)) : 0, attackScale = g.organismId === 'tentacular' ? attackPhase === 'windup' ? 1 - .08 * windup : attackPhase === 'sweep' ? .92 + .08 * (release * release * (3 - 2 * release)) : attackPhase === 'recover' ? 1 + .018 * Math.sin(recovery * Math.PI) : 1 : 1, target = (p.r * 2 + 20) * (1 + Math.sin(bodyTime * .0032) * .018) * attackScale * g.scaleConfig.reference.organismSprite, scale = target / Math.max(f.sw, f.sh), squeeze = 1 - .09 * phaseVisual + Math.sin(bodyTime * .014) * .018 * phaseVisual, stretch = phaseVisual && motion > .05 ? 1 + Math.min(.18, motion * .12) * phaseVisual : g.organismId === 'tentacular' && motion > .05 ? 1 + Math.min(.12, motion * .07) : 1, dw = f.sw * scale * squeeze * stretch, dh = f.sh * scale * squeeze / Math.sqrt(stretch), radius = dw * .44;
    const sheetTexture = getTexture(g.evolutionSpriteSheet), frameKey = `${stage}|${f.sx}|${f.sy}|${f.sw}|${f.sh}`;
    let frameTexture = frameTextures.get(frameKey);
    if (!frameTexture && sheetTexture.baseTexture) { frameTexture = new PIXI.Texture(sheetTexture.baseTexture, new PIXI.Rectangle(f.sx, f.sy, f.sw, f.sh)); frameTextures.set(frameKey, frameTexture); }
    const bodyTexture = frameTexture;
    if (bodyTexture && g.organismId !== 'tentacular') setTexture(scene.playerBody, bodyTexture);
    scene.playerBody.visible = g.organismId !== 'tentacular'&&g.organismId!=='ocular';if(scene.ocularRig)scene.ocularRig.root.visible=false;if(g.organismId==='ocular')drawOcular(g,(p.r*2+20)*g.scaleConfig.reference.organismSprite*.765);
    const organismTint = ({ membrane: 0xffffff, flagellate: 0xd1fff1, tentacular: 0xcbbaff, plasmatic: 0xffd8ff, infectious: 0xd6ffd0 }[g.organismId] || 0xffffff);
    scene.playerBody.position.set(p.x, p.y); scene.playerBody.width = dw; scene.playerBody.height = dh; scene.playerBody.rotation = phaseVisual && motion > .05 ? Math.atan2(p.motionY || 0, p.motionX || 0) : g.organismId === 'tentacular' ? Math.atan2(p.facingY || 0, p.facingX || 1) : 0; scene.playerBody.tint = phaseVisual ? 0xd8ffff : organismTint;
    const dashActive = p.flagellaDashTime > 0||!!p.combat?.dash.active, ghostActive = (p.phaseActive > 0 || dashActive) && bodyTexture && g.organismId !== 'tentacular'&&g.organismId!=='ocular';
    if (ghostActive) { for (let i = 0; i < 2; i++) { const ghost = scene.phaseGhosts[i], angle = dashActive ? Math.atan2(p.combat?.dash.active?p.combat.dash.y:p.flagellaDashY,p.combat?.dash.active?p.combat.dash.x:p.flagellaDashX) : Math.atan2(p.facingY??0, p.facingX??1), dx = dashActive ? (p.combat?.dash.active?p.combat.dash.x:p.flagellaDashX) : (p.motionX || Math.cos(angle)), dy = dashActive ? (p.combat?.dash.active?p.combat.dash.y:p.flagellaDashY) : (p.motionY || Math.sin(angle)), offset = (i + 1) * (dashActive ? 14 : 4); setTexture(ghost, bodyTexture); ghost.position.set(p.x - dx * offset, p.y - dy * offset); ghost.anchor.set(g.organismId==='ocular'?.82:.5,g.organismId==='ocular'?.53:.5);ghost.width = g.organismId==='ocular'?target*1.8:dw; ghost.height = g.organismId==='ocular'?target*1.8*bodyTexture.height/Math.max(1,bodyTexture.width):dh; ghost.rotation = g.organismId==='ocular'?p.combat.bodyPose.angle:scene.playerBody.rotation; ghost.tint = dashActive ? 0x66ffd0 : phaseVisual ? 0x58eaff : organismTint; ghost.alpha = dashActive ? .34 / (i + 1) : .16 * phaseVisual / (i + 1); ghost.visible = true; } } else hidePool(scene.phaseGhosts, 0);
    const hasApex = ['nucleus','division','spines','flagella','membrane','explosive_vesicles','orbital','laser','infection','regen','reinforced_shield','spiny_membrane','impulse','liquid_phase','mitochondria','absorption','resistance','explosion','plasma_storm','enzymes','chemotaxis','vesicles','repair','reserve_damage','reserve_atp','reserve_cytoplasm'].some(id => count(id) >= 5), nucleus = count('nucleus'), mito = count('mitochondria'), blur = hasApex ? 28 : 14 + nucleus * 2 + mito, glowColor = hasApex ? '#b684ff' : nucleus >= 5 ? '#ffd875' : '#4feaff';
    const tintGlow = g.organismId === 'infectious' ? '#78ff68' : g.organismId === 'plasmatic' ? '#d578ff' : g.organismId === 'tentacular' ? '#a773ff' : g.organismId === 'flagellate' ? '#46ffe0' : glowColor;
    const halo = g.organismId==='ocular'?null:g.functions.getBodyGlowSprite(f, stage, tintGlow, blur, dw, dh);
    if (halo) { setTexture(scene.bodyGlow, halo.image); scene.bodyGlow.position.set(p.x, p.y); scene.bodyGlow.width = halo.w * dw / halo.bodyW; scene.bodyGlow.height = halo.h * dh / halo.bodyH; scene.bodyGlow.alpha = .72 + .2 * phaseVisual; scene.bodyGlow.tint = phaseVisual ? 0x45eaff : 0xffffff; scene.bodyGlow.visible = true; } else scene.bodyGlow.visible = false;
    scene.playerBody.alpha = phaseVisual ? .78 : 1;if(g.organismId==='ocular')scene.bodyGlow.visible=false;
    const spikeLevel = count('spines') + count('spiny_membrane'), spineCount = spikeLevel && phaseVisual < .35 ? Math.min(22, 7 + spikeLevel * 3) : 0;
    for (let i = 0; i < spineCount; i++) { const a = i / spineCount * Math.PI * 2 + t * .00012, root = radius * .77, len = (5 + spikeLevel * 2.2) * (1 + Math.sin(t * .005 + i) * .045), bx = p.x + Math.cos(a) * root, by = p.y + Math.sin(a) * root, bend = Math.sin(t * .004 + i * 1.6) * 1.4, purple = !(i % 2), image = g.functions.getSpineGlowSprite(spikeLevel, purple, Math.round(bend * Math.cos(a)), Math.round(-bend * Math.sin(a))), s = scene.spines[i];
      setTexture(s, image?.image); const width = image ? image.width / g.DPR * len / image.len : len + 52, height = image ? image.height / g.DPR : 70; s.anchor.set(image ? image.pad / (image.width / g.DPR) : .5, image ? (image.top + image.pad) / (image.height / g.DPR) : .5); s.position.set(bx, by); s.rotation = a; s.width = width; s.height = height; s.alpha = .78; s.visible = true; }
    hidePool(scene.spines, spineCount);
    const orbitLevel = count('orbital');
    if (orbitLevel && phaseVisual < .55) { const orbitX = radius + 13 + orbitLevel * 3.2, orbitY = radius + 10 + orbitLevel * 2.5, angle = t * (.0012 + orbitLevel * .00008), px = p.x + Math.cos(angle) * orbitX, py = p.y + Math.sin(angle) * orbitY, size = 3.4 + orbitLevel * .38, apex = orbitLevel >= 5, cell = g.functions.getCellOrganelleSprite(size, apex ? '#ff887e' : '#d08cff', apex ? '#c91e4d' : '#7138c5');
      scene.playerOrbit.clear().lineStyle(.7 + orbitLevel * .06, apex ? 0xff746f : 0x72ddff, .22 + orbitLevel * .035).drawEllipse(p.x, p.y, orbitX, orbitY);
      scene.orbital.position.set(px, py); setTexture(scene.orbital, cell?.image); scene.orbital.width = scene.orbital.height = cell ? cell.image.width / g.DPR * size / cell.nominal : size * 3; scene.orbital.rotation = angle + t * .001; scene.orbital.alpha = .9; scene.orbital.visible = true;
      const thorn = g.functions.getOrbitalThornSprite(orbitLevel, size); if (orbitLevel >= 3 && thorn) { setTexture(scene.orbitalThorns, thorn.image); scene.orbitalThorns.position.set(px, py); scene.orbitalThorns.width = scene.orbitalThorns.height = thorn.image.width / g.DPR * size / thorn.nominal; scene.orbitalThorns.rotation = angle * .45; scene.orbitalThorns.visible = true; } else scene.orbitalThorns.visible = false;
    } else { scene.playerOrbit.clear(); scene.orbital.visible = false; scene.orbitalThorns.visible = false; }
    scene.playerLayer.alpha = p.invuln > 0 && Math.floor(t / 75) % 2 === 0 ? .45 : 1;
  }

  function tentacleCatmullRom(a,b,c,d,t){return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)}
  function updateTentacleMesh(mesh,pathX,pathY,base,halfWidth,growth=1,sizeScale=1){const vertices=mesh.vertices,rootX=pathX[base],rootY=pathY[base];for(let i=0;i<TENTACLE_RENDER_POINTS;i++){const u=i/(TENTACLE_RENDER_POINTS-1),sample=u*(TENTACLE_PATH_POINTS-1),lo=Math.floor(sample),f=sample-lo,hi=Math.min(TENTACLE_PATH_POINTS-1,lo+1),before=Math.max(0,lo-1),after=Math.min(TENTACLE_PATH_POINTS-1,hi+1),x0=pathX[base+lo],y0=pathY[base+lo],x1=pathX[base+hi],y1=pathY[base+hi],x2=pathX[base+after],y2=pathY[base+after],x_1=pathX[base+before],y_1=pathY[base+before],x=tentacleCatmullRom(x_1,x0,x1,x2,f),y=tentacleCatmullRom(y_1,y0,y1,y2,f);let dx=x2-x_1,dy=y2-y_1,length=Math.hypot(dx,dy)||1;dx/=length;dy/=length;const half=(2.6+halfWidth*Math.pow(1-u,1.4))*growth*sizeScale,nx=-dy*half,ny=dx*half,px=rootX+(x-rootX)*growth,py=rootY+(y-rootY)*growth;vertices[i*4]=px+nx;vertices[i*4+1]=py+ny;vertices[i*4+2]=px-nx;vertices[i*4+3]=py-ny}mesh.geometry.getBuffer('aVertexPosition').update(vertices)}

  function drawPlayerMutations(g, t) {
    if(g.party){scene.playerMutationBack.clear();scene.playerMutationFront.clear();scene.nucleusGlow.visible=false;hidePool(scene.extraOrgs,0);hidePool(scene.tentacleSlashSprites,0);for(const mesh of scene.tentacleMeshes)mesh.visible=false;scene.playerTentacleLayer.visible=false;return}scene.playerTentacleLayer.visible=true;
    const p = g.player, back = scene.playerMutationBack, front = scene.playerMutationFront;
    back.clear(); front.clear(); scene.nucleusGlow.visible = false;
    hidePool(scene.tentacleSlashSprites, 0);
    if (!p) { hidePool(scene.extraOrgs, 0); return; }
    const u = g.upgradeLevels, count = id => Math.max(0, u[id] || 0), liquidVisual = count('liquid_phase') ? (p.phaseActive > 0 ? Math.min(1, (p.phaseElapsed || 0) / .22) : Math.min(1, (p.phaseReform || 0) / .42)) : 0, radius = (p.r * 2 + 20) * .44 * g.scaleConfig.reference.organismSprite * (g.organismId === 'tentacular' && p.tentacleAttackPhase === 'windup' ? 1 - .08 * Math.max(0, Math.min(1, (p.tentaclePhaseTime || 0) / .10)) : g.organismId === 'tentacular' && p.tentacleAttackPhase === 'sweep' ? .92 + .08 * Math.max(0, Math.min(1, (p.tentaclePhaseTime || 0) / .16)) : 1), tentacleScale = (.68 + .32 * Math.max(0, Math.min(1, (g.level - 1) / 9))) * g.scaleConfig.reference.tentacle;
    let organelles = 0;
    const cell = (x, y, size, membrane, core, phase = 0, alpha = 1) => {
      const data = g.functions.getCellOrganelleSprite(size, membrane, core), s = getPool(scene.extraOrgs, scene.playerLayer, organelles++);
      setTexture(s, data?.image); const side = data ? data.image.width / g.DPR * size / data.nominal : size * 2.2;
      s.position.set(x, y); s.width = s.height = side; s.rotation = phase; s.alpha = alpha; s.visible = true;
    };
    const glow = Math.sin(t * .006), bodyPulse = Math.sin(t * .0024), synapticPulse = count('synaptic_discharge') && p.synapticPulse > 0 ? Math.min(1,p.synapticPulse/.26) : 0;
    if(g.organismId==='tentacular'&&p.tentacleAttackPhase==='windup'){const charge=Math.max(0,Math.min(1,(p.tentaclePhaseTime||0)/.10)),fx=p.facingX||1,fy=p.facingY||0,sx=-fy,sy=fx,frontX=p.x+fx*radius*.66,frontY=p.y+fy*radius*.66;front.lineStyle(1.2+charge,0xe7a0ff,.18+.34*charge).moveTo(frontX-sx*radius*.16,frontY-sy*radius*.16).quadraticCurveTo(frontX+fx*radius*.12,frontY+fy*radius*.12,p.x+fx*radius*.94,p.y+fy*radius*.94).quadraticCurveTo(frontX+fx*radius*.12+sx*radius*.16,frontY+fy*radius*.12+sy*radius*.16,frontX+sx*radius*.16,frontY+sy*radius*.16);for(let i=0;i<3;i++){const d=radius*(.7+i*.09),offset=(i-1)*radius*.075,size=(1.1+charge*.8)*(1+i*.12);front.beginFill(i===2?0xffd9ff:0xc96cff,.35+.5*charge).drawCircle(p.x+fx*d+sx*offset,p.y+fy*d+sy*offset,size).endFill()}}
    if(synapticPulse>0){const progress=1-synapticPulse,phase=t*.018;back.lineStyle(2.2,0x57aaff,.62*synapticPulse);for(let i=0;i<=28;i++){const a=i/28*Math.PI*2,r=radius+2+Math.sin(a*6+phase)*2.4+Math.sin(a*11-phase*.7)*1.2,x=p.x+Math.cos(a)*r,y=p.y+Math.sin(a)*r;if(!i)back.moveTo(x,y);else back.lineTo(x,y)}back.closePath();front.lineStyle(1.3,0xc2f7ff,.8*synapticPulse);for(let i=0;i<5;i++){const a=phase+i*Math.PI*2/5,r=radius+4+progress*3;front.moveTo(p.x+Math.cos(a)*r,p.y+Math.sin(a)*r).lineTo(p.x+Math.cos(a+.18)* (r+3),p.y+Math.sin(a+.18)*(r+3)).lineTo(p.x+Math.cos(a-.08)*(r+6),p.y+Math.sin(a-.08)*(r+6))}}
    if (g.organismId === 'membrane') {
      const breathe = 1 + bodyPulse * .018, motionLean = Math.min(2.4, Math.hypot(p.motionX || 0, p.motionY || 0) * 1.8);
      for (let layer = 0; layer < 2; layer++) {
        const rr = radius * (layer ? .91 : 1.02) * breathe, wave = layer ? 1.8 : 2.6;
        front.lineStyle(layer ? .75 : 1.35, layer ? 0xe4ffff : 0x5ceaff, layer ? .38 : .62);
        for (let i = 0; i <= 32; i++) { const a = i / 32 * Math.PI * 2, r = rr + Math.sin(a * 5 + t * .003) * wave + Math.cos(a * 3 - t * .002) * motionLean, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r; if (!i) front.moveTo(x, y); else front.lineTo(x, y); }
        front.closePath();
      }
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + t * .00012, r = radius * .98, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r, sz = 1.2 + .35 * Math.sin(t * .004 + i); front.lineStyle(.55, 0xd6ffff, .54).beginFill(0x55dff5, .48).drawCircle(x, y, sz).endFill(); }
    }
    if (g.organismId === 'plasmatic') {
      front.lineStyle(.8, 0xe6a0ff, .34).drawEllipse(p.x, p.y, radius * .88, radius * .58);
      front.lineStyle(.65, 0x73eaff, .28).drawEllipse(p.x, p.y, radius * .65, radius * .96);
      for (let i = 0; i < 3; i++) { const a = t * .0011 + i * Math.PI * 2 / 3, x = p.x + Math.cos(a) * radius * .88, y = p.y + Math.sin(a) * radius * .58; front.lineStyle(.6, 0xf2caff, .65).beginFill(0xd45dff, .7).drawCircle(x, y, 1.35 + .25 * Math.sin(t * .006 + i)).endFill(); }
    }
    if (g.organismId === 'tentacular') {
      const arms=p.tentacleArms||[],breath=1+bodyPulse*.022,motionLean=Math.hypot(p.motionX||0,p.motionY||0),facing=Math.atan2(p.facingY??0,p.facingX??1),anchorOffsets=[facing,facing+Math.PI/3,facing-Math.PI/3,facing+Math.PI];let prep=0,strike=0;for(const arm of arms){if(arm.phase==='windup')prep=Math.max(prep,arm.phaseTime||0);if(arm.phase==='sweep')strike=1}prep=Math.min(1,prep/.12);const squashX=1+strike*.025+motionLean*.0005,squashY=1-strike*.018;
      const radiusAt=a=>{let lobe=1+.052*Math.sin(a*3+bodyPulse)+.035*Math.sin(a*5-t*.0021)+.019*Math.cos(a*8+t*.0017)+Math.max(0,Math.cos(a-facing))*.12;for(let j=0;j<Math.min(4,p.tentacleCount||1);j++){let d=a-anchorOffsets[j];while(d>Math.PI)d-=Math.PI*2;while(d< -Math.PI)d+=Math.PI*2;lobe+=Math.max(0,1-Math.abs(d)/.34)*.105}return lobe};
      // Deep violet cytoplasm and a bright, flexible membrane rim echo the reference creature.
      const drawMantle=(scale,fill,stroke,width,alpha)=>{front.beginFill(fill,alpha);for(let i=0;i<=56;i++){const a=i/56*Math.PI*2,lobe=radiusAt(a),x=p.x+Math.cos(a)*radius*breath*squashX*lobe*scale,y=p.y+Math.sin(a)*radius*breath*squashY*lobe*scale;if(!i)front.moveTo(x,y);else front.lineTo(x,y)}front.closePath().endFill();if(stroke){front.lineStyle(width,stroke,alpha);for(let i=0;i<=56;i++){const a=i/56*Math.PI*2,lobe=radiusAt(a),x=p.x+Math.cos(a)*radius*breath*squashX*lobe*scale,y=p.y+Math.sin(a)*radius*breath*squashY*lobe*scale;if(!i)front.moveTo(x,y);else front.lineTo(x,y)}front.closePath()}};
      front.lineStyle(4.2,0x922bff,.25);for(let i=0;i<=56;i++){const a=i/56*Math.PI*2,lobe=radiusAt(a),x=p.x+Math.cos(a)*radius*breath*squashX*lobe*1.08,y=p.y+Math.sin(a)*radius*breath*squashY*lobe*1.08;if(!i)front.moveTo(x,y);else front.lineTo(x,y)}front.closePath();
      drawMantle(1,0x140d36,0xd54cff,2.4,.99);
      drawMantle(.88,0x30205f,0x7e65ff,1.05,.74);
      // Soft raised attachment collars blend the four roots into the membrane.
      for(let i=0;i<Math.min(4,p.tentacleCount||1);i++){const a=anchorOffsets[i],x=p.x+Math.cos(a)*radius*.96,y=p.y+Math.sin(a)*radius*.96,size=radius*(i===0?.16:.145);front.beginFill(0x35165f,.96).lineStyle(1.15,0xe35bff,.88).drawCircle(x,y,size).endFill();front.beginFill(0xb52dff,.52).drawCircle(x,y,size*.61).endFill();front.beginFill(0xffadff,.8).drawCircle(x-Math.cos(a)*size*.12,y-Math.sin(a)*size*.12,size*.22).endFill()}
      // Layered membrane folds and a cool blue glint give the body a gelatinous depth.
      front.beginFill(0x7130ba,.34).drawEllipse(p.x-radius*.1,p.y-radius*.11,radius*.73,radius*.64).endFill();
      front.beginFill(0x3f2b92,.28).drawEllipse(p.x+radius*.08,p.y-radius*.02,radius*.47,radius*.67).endFill();
      front.beginFill(0xa92ce7,.16).drawEllipse(p.x-radius*.14,p.y-radius*.19,radius*.44,radius*.36).endFill();
      // A raised leading membrane crest makes the cell's facing follow its movement vector.
      const fx=Math.cos(facing),fy=Math.sin(facing),sx=-fy,sy=fx,crestX=p.x+fx*radius*.61,crestY=p.y+fy*radius*.61,crestW=radius*.23,crestTipX=p.x+fx*radius*.99,crestTipY=p.y+fy*radius*.99;
      front.beginFill(0xb42bea,.72).lineStyle(1.15,0xf2a0ff,.92).moveTo(crestX-sx*crestW,crestY-sy*crestW).quadraticCurveTo(crestX+fx*radius*.17-sx*crestW*.45,crestY+fy*radius*.17-sy*crestW*.45,crestTipX,crestTipY).quadraticCurveTo(crestX+fx*radius*.17+sx*crestW*.45,crestY+fy*radius*.17+sy*crestW*.45,crestX+sx*crestW,crestY+sy*crestW).quadraticCurveTo(crestX-fx*radius*.12,crestY-fy*radius*.12,crestX-sx*crestW,crestY-sy*crestW).closePath().endFill();
      front.lineStyle(1.7,0x82eaff,.82);for(let i=0;i<=18;i++){const a=facing-.72+i/18*1.44,r=radius*radiusAt(a)*.95,x=p.x+Math.cos(a)*r,y=p.y+Math.sin(a)*r;if(!i)front.moveTo(x,y);else front.lineTo(x,y)}
      front.lineStyle(.9,0xf0a4ff,.62).drawEllipse(p.x-radius*.08,p.y-radius*.1,radius*.78,radius*.71);
      // Bright pink-violet nucleus with a cool halo, surrounded by suspended organelles.
      front.beginFill(0x274ba5,.42).lineStyle(1,0x76eaff,.76).drawCircle(p.x-radius*.02,p.y-radius*.01,radius*.51).endFill();
      front.beginFill(0x28104f,.98).lineStyle(1.8,0xff83f8,.98).drawCircle(p.x,p.y,radius*.43).endFill();
      front.beginFill(0x8a22df,.98).lineStyle(.9,0xd75bff,.9).drawCircle(p.x-radius*.015,p.y-radius*.015,radius*.34).endFill();
      front.beginFill(0xee61fa,.96).drawCircle(p.x-radius*.055,p.y-radius*.065,radius*.22).endFill();
      front.lineStyle(.9,0xffc8ff,.88).drawEllipse(p.x-radius*.015,p.y-radius*.015,radius*.25,radius*.17);
      front.beginFill(0xffecff,.94).drawCircle(p.x-radius*.14,p.y-radius*.17,Math.max(1.15,radius*.075)).endFill();
      const organelles=[[-.62,-.22,.105,0x69eaff],[-.43,.56,.09,0x8cddff],[.64,-.42,.105,0xe760ff],[.57,.48,.09,0x54dfff],[-.7,.37,.07,0xe24dff],[.2,-.68,.07,0x74eaff],[.15,.72,.065,0xf274ff]];
      for(let i=0;i<organelles.length;i++){const[oX,oY,size,color]=organelles[i],x=p.x+oX*radius,y=p.y+oY*radius,rx=radius*size*(1+.08*Math.sin(t*.004+i));front.beginFill(color,.24).lineStyle(.65,color,.84).drawEllipse(x,y,rx*1.35,rx*.9).endFill();front.beginFill(0xeafaff,.78).drawCircle(x-rx*.28,y-rx*.25,Math.max(.7,rx*.24)).endFill()}
      for(let i=0;i<7;i++){const a=i*Math.PI*2/7+.24,rr=radius*.59,x=p.x+Math.cos(a)*rr,y=p.y+Math.sin(a)*rr,pr=1.3+.3*Math.sin(t*.005+i);front.beginFill(i%2?0x61eaff:0xfa6bff,.94).drawCircle(x,y,pr).endFill();front.beginFill(0xf6f3ff,.88).drawCircle(x-pr*.24,y-pr*.26,pr*.32).endFill()}
      if(prep>0)front.lineStyle(1.1,0xf3aaff,.16+prep*.16).drawCircle(p.x,p.y,radius*(1.08+prep*.025));
      const devour=p.cellDevour||{},devouring=devour.phase&&devour.phase!=='idle';if(devouring){const angle=devour.angle||facing,mx=p.x+Math.cos(angle)*radius*.62,my=p.y+Math.sin(angle)*radius*.62,pulse=.5+.5*Math.sin(t*.025);front.beginFill(0x06131a,.72).lineStyle(1.5,0xb2ff68,.72+pulse*.24).drawEllipse(mx,my,radius*.22,radius*.15).endFill();front.lineStyle(2.2+pulse,0xaaff66,.52+pulse*.35).drawEllipse(mx,my,radius*.27,radius*.19);const travel=devour.phase==='drag'?Math.max(0,Math.min(1,(devour.elapsed||0)/.48)):devour.phase==='devour'?Math.max(0,Math.min(1,(devour.elapsed||0)/.32)):devour.phase==='return'?1-Math.max(0,Math.min(1,(devour.elapsed||0)/.3)):.08,pulseX=p.x+Math.cos(angle)*(radius*.62*(1-travel)+radius*.08),pulseY=p.y+Math.sin(angle)*(radius*.62*(1-travel)+radius*.08);front.lineStyle(1.4,0xbaff78,.22+pulse*.4).moveTo(mx,my).lineTo(p.x+Math.cos(angle)*radius*.08,p.y+Math.sin(angle)*radius*.08);front.beginFill(0xe5ff9a,.7).drawCircle(pulseX,pulseY,1.2+pulse*1.2).endFill()}
      const arcState=p.predatorArcState||'idle',arcDx=p.predatorArcDirX??Math.cos(facing),arcDy=p.predatorArcDirY??Math.sin(facing),arcSideX=-arcDy,arcSideY=arcDx,arcLevel=Math.max(1,Math.min(5,u.predator_arc||1)),arcRange=[142,174,174,218,250][arcLevel-1];
      if(arcState==='tension'){
        const tension=Math.max(0,Math.min(1,p.predatorArcTension||0)),guideStart=radius*.8,guideEnd=guideStart+arcRange*(.38+.12*tension),alpha=.22+.34*tension;
        front.lineStyle(1.2+tension*1.3,0xf090ff,alpha).moveTo(p.x+arcDx*guideStart,p.y+arcDy*guideStart).lineTo(p.x+arcDx*guideEnd,p.y+arcDy*guideEnd);
        for(let k=0;k<5;k++){const d=guideStart+(guideEnd-guideStart)*(k+1)/6;front.beginFill(0xf4a3ff,alpha).drawCircle(p.x+arcDx*d,p.y+arcDy*d,1.2+tension).endFill()}
        const barW=58,barY=p.y+radius+24;front.beginFill(0x130b28,.84).drawRoundedRect(p.x-barW/2,barY,barW,5,2.5).endFill();front.beginFill(0xe45cff,.96).drawRoundedRect(p.x-barW/2,barY,barW*tension,5,2.5).endFill();front.lineStyle(.7,0xffbcff,.78).drawRoundedRect(p.x-barW/2,barY,barW,5,2.5);
      } else if(arcState==='fire'){
        const progress=Math.max(0,Math.min(1,(p.predatorArcElapsed||0)/(p.predatorArcTravel||.34))),tipDistance=radius+p.predatorArcRange*progress,tipX=p.x+arcDx*tipDistance,tipY=p.y+arcDy*tipDistance,spread=7+arcLevel*1.5;
        front.lineStyle(5+arcLevel,0xc535ff,.22).moveTo(p.x+arcDx*radius*.6,p.y+arcDy*radius*.6).lineTo(tipX,tipY);
        front.lineStyle(1.25+arcLevel*.25,0xffc8ff,.8).moveTo(p.x+arcDx*radius*.8,p.y+arcDy*radius*.8).lineTo(tipX,tipY);
        front.beginFill(0xffb4ff,.96).lineStyle(1,0xf5e6ff,.98).moveTo(tipX+arcDx*spread,tipY+arcDy*spread).lineTo(tipX+arcSideX*spread*.72,tipY+arcSideY*spread*.72).lineTo(tipX-arcSideX*spread*.72,tipY-arcSideY*spread*.72).closePath().endFill();
        for(let i=0;i<3;i++){const start=tipDistance*(.45+i*.12);front.lineStyle(1.1,0xd767ff,.32-i*.06).moveTo(p.x+arcDx*start+arcSideX*(i-1)*4,p.y+arcDy*start+arcSideY*(i-1)*4).lineTo(p.x+arcDx*(start-14),p.y+arcDy*(start-14))}
      }

    }
    if (g.organismId === 'infectious') {
      const rr = radius * (1 + bodyPulse * .022); front.lineStyle(1.35, 0x9eff72, .56);
      for (let i = 0; i <= 36; i++) { const a = i / 36 * Math.PI * 2, r = rr + Math.sin(a * 7 + t * .0034) * 2.3 + Math.sin(a * 11 - t * .002) * .9, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r; if (!i) front.moveTo(x, y); else front.lineTo(x, y); }
      front.closePath();
      for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + .18, r = radius * .63, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r; front.lineStyle(.55, 0xe1ffb0, .52).beginFill(i % 3 ? 0x48c95f : 0xb9ff64, .55).drawCircle(x, y, 1 + (i % 2) * .55).endFill(); }
    }
    if (g.organismId === 'infectious') { for (let i = 0; i < 5; i++) { const a = t * .00018 + i * Math.PI * 2 / 5, r = radius * .82, pulse = 1 + .16 * Math.sin(t * .007 + i); cell(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 2.2 * pulse, '#9aff72', '#38a536', a, .88); } }
    if (g.organismId === 'plasmatic') { const angle = t * .00042, orbitR = radius * .73; for (let i = 0; i < 3; i++) { const a = angle + i * Math.PI * 2 / 3; cell(p.x + Math.cos(a) * orbitR, p.y + Math.sin(a) * orbitR, 2.1 + .25 * Math.sin(t * .008 + i), '#e2a0ff', '#8b37db', a, .9); } }
    const flagella = count('flagella');
    if (flagella && liquidVisual < .45) {
      const isFlagellate = g.organismId === 'flagellate', n = isFlagellate ? 3 : Math.min(9, 3 + flagella), leanX = -(p.motionX || 0), leanY = -(p.motionY || 0), speedMotion = Math.hypot(p.motionX || 0, p.motionY || 0), stretch = 1 + (p.attackStretch > 0 ? .3 * p.attackStretch / .18 : 0), facing = Math.atan2(p.facingY || 0, p.facingX || 1);
      for (let i = 0; i < n; i++) { const a = isFlagellate ? facing + Math.PI + (i - 1) * .38 : i / n * Math.PI * 2 + t * .00012, root = radius * .78, sx = p.x + Math.cos(a) * root, sy = p.y + Math.sin(a) * root, waveSpeed = .004 + speedMotion * .008, angle = a + Math.sin(t * waveSpeed + i * 1.73) * (.08 + flagella * .012 + speedMotion * .09), len = (isFlagellate ? 29 + flagella * 4 + (i === 1 ? 7 : 0) : 12 + flagella * 4.2) * stretch, dx = leanX * len * (isFlagellate ? .62 : .38), dy = leanY * len * (isFlagellate ? .62 : .38), wave = Math.sin(t * (.005 + speedMotion * .012) + i * 1.7) * (isFlagellate ? 4.5 + speedMotion * 5 : 1.8 + flagella * .62), bx = sx + Math.cos(angle) * len * .35 + dx * .2 + wave, by = sy + Math.sin(angle) * len * .35 + dy * .2 + wave * .35, ex = sx + Math.cos(angle) * len + dx + wave, ey = sy + Math.sin(angle) * len + dy - wave;
        back.lineStyle(isFlagellate ? 5.2 : 3 + flagella * .3, isFlagellate ? 0x159d9e : i % 2 ? 0x49cbe9 : 0x7868ff, .82).moveTo(sx, sy).quadraticCurveTo(bx, by, ex, ey); back.lineStyle(isFlagellate ? 2.3 : .85, 0xe4ffff, .82).moveTo(sx, sy).quadraticCurveTo(bx, by, ex, ey); if (isFlagellate) { const tx = (sx + 2 * bx + ex) / 4, ty = (sy + 2 * by + ey) / 4; back.lineStyle(1, 0x74ffe1, .7).beginFill(0x46e5c7, .7).drawCircle(tx, ty, 1.15).endFill(); }
      }
    }
    for (const mesh of scene.tentacleMeshes) mesh.visible = false;
    if (g.organismId === 'tentacular' && count('tentacle_strike')) {
      const total = Math.max(1, Math.min(4, p.tentacleCount || 1)), arcState = p.predatorArcState || 'idle', lashLevel = Math.max(1, Math.min(10, u.tentacle_strike || 1)), lashVisual = TENTACLE_LASH_VISUAL[Math.min(5,lashLevel - 1)];
      for (let arm = 0; arm < total; arm++) {
        const armState = p.tentacleArms?.[arm], phase = armState?.phase || 'idle', arcActive = arcState === 'tension' || arcState === 'fire' || arcState === 'retract', devouring = phase === 'devouring';
        const slashSprite = scene.tentacleSlashSprites[arm];
        if (!arcActive && !devouring) {
          if (lashLevel < 10 && (phase === 'sweep' || phase === 'recover' || (phase === 'idle' && (armState?.sweepVisualFade || 0) > 0)) && slashSprite) {
            const texture = scene.tentacleSlashTextures[Math.min(5,lashLevel - 1)];
            if (texture) {
              setTexture(slashSprite, texture);
              const aim = armState.aim ?? p.attackAngle ?? Math.atan2(p.facingY || 0, p.facingX || 1);
              const reach = armState.sweepReach || radius * (1 + [1.5, 1.7, 1.9, 2.1, 2.3, 2.5][lashLevel - 1] * (g.scaleConfig.physics.tentacleSweepReach || 1));
              const inner = armState.sweepInner || radius * 1.05;
              const fullLength = Math.max(1, reach - inner);
              const impactAt = armState.sweepImpactAt || .72;
              const elapsed = phase === 'sweep' ? (armState.sweepElapsed || 0) / .24 : .24;
              const progress = Math.max(0, Math.min(1, elapsed / impactAt));
              const smooth = progress * progress * (3 - 2 * progress);
              const expansion = .2 + .8 * smooth;
              const tailFade = phase === 'recover' || phase === 'idle'
                ? Math.max(0, (armState.sweepVisualFade || 0) / (armState.sweepVisualFadeDuration || .8))
                : elapsed <= impactAt ? .92 : Math.max(.72, 1 - (elapsed - impactAt) / Math.max(.01, .24 - impactAt));
              const finalSize = phase === 'sweep' ? expansion : 1;
              const length = fullLength * finalSize;
              const originX = armState.sweepOriginX ?? p.x, originY = armState.sweepOriginY ?? p.y;
              slashSprite.position.set(originX + Math.cos(aim) * inner, originY + Math.sin(aim) * inner);
              slashSprite.rotation = aim;
              slashSprite.width = length;
              slashSprite.height = length * (texture.height / Math.max(1, texture.width)) * (g.scaleConfig.physics.tentacleSweepWidth || 1) * 1.95;
              slashSprite.alpha = tailFade * (lashLevel === 1 ? .78 : 1);
              slashSprite.visible = slashSprite.alpha > .01;
            }
          }
          continue;
        }
        if (slashSprite) slashSprite.visible = false;
        if (!(phase === 'windup' || phase === 'sweep' || phase === 'recover' || devouring || arcActive)) continue;
        const progress = Math.max(0, Math.min(1, p.tentacleArmProgress?.[arm] || 0)), windup = phase === 'windup', recovering = phase === 'recover';
        const fade = windup ? .35 + .55 * Math.max(progress, Math.min(1, (armState?.phaseTime || 0) / .12)) : recovering ? Math.max(.15, progress) : arcState === 'tension' ? .42 + .48 * (p.predatorArcTension || 0) : .94;
        const pathX = p.tentaclePointsX, pathY = p.tentaclePointsY, base = arm * TENTACLE_PATH_POINTS;
        if (!pathX || !pathY) continue;
        const electric = (p.synapticPulse || 0) > 0 && p.synapticArm === arm, normalLash = !electric && !devouring && !arcActive, glow = electric ? 0x62dcff : devouring ? 0x9cff64 : arcActive ? 0xc277ff : lashVisual.outer, core = electric ? 0xd9ffff : devouring ? 0xeaffbf : arcActive ? 0xffe8fb : lashVisual.middle, halfWidth = 14.5 * tentacleScale * (normalLash ? lashVisual.width : 1) * (phase === 'sweep' || arcState === 'fire' ? 1.1 : 1);
        const tipX = pathX[base + TENTACLE_PATH_POINTS - 1], tipY = pathY[base + TENTACLE_PATH_POINTS - 1];
        // Each afterimage is copied from an earlier physical tentacle centerline, never from a separate crescent path.
        if (normalLash && p.tentacleTrailX && p.tentacleTrailY && p.tentacleTrailLife) {
          const trailHead = p.tentacleTrailHead?.[arm] ?? -1;
          for (let age = 0; age < 6; age++) {
            const slot = (trailHead - age + 6) % 6, trailIndex = arm * 6 + slot, life = p.tentacleTrailLife[trailIndex];
            if (life <= 0) continue;
            const trailBase = trailIndex * TENTACLE_PATH_POINTS, alpha = Math.min(1, life / (p.tentacleTrailDuration || .08)) * (lashLevel === 1 ? .24 : .44);
            for (let layer = 0; layer < (lashLevel >= 4 ? 3 : 2); layer++) {
              const width = layer === 0 ? 12 : layer === 1 ? 6.2 : 2.5, color = layer === 0 ? lashVisual.outer : layer === 1 ? lashVisual.middle : lashVisual.core, opacity = layer === 0 ? .18 : layer === 1 ? .56 : .72;
              front.lineStyle(width * tentacleScale * lashVisual.width, color, alpha * opacity);
              for (let k = lashVisual.trailStart; k < TENTACLE_PATH_POINTS; k++) { const x = p.tentacleTrailX[trailBase + k], y = p.tentacleTrailY[trailBase + k]; if (k === lashVisual.trailStart) front.moveTo(x, y); else front.lineTo(x, y); }
            }
          }
        }
        front.beginFill(glow, .82 * fade);
        for (let k = 0; k < TENTACLE_PATH_POINTS; k++) {
          const prev = Math.max(0, k - 1), next = Math.min(TENTACLE_PATH_POINTS - 1, k + 1), dx = pathX[base + next] - pathX[base + prev], dy = pathY[base + next] - pathY[base + prev], length = Math.hypot(dx, dy) || 1, nx = -dy / length, ny = dx / length, u = k / (TENTACLE_PATH_POINTS - 1), width = 1.15 * tentacleScale + halfWidth * Math.pow(1 - u, .9), x = pathX[base + k] + nx * width, y = pathY[base + k] + ny * width;
          if (k === 0) front.moveTo(x, y); else front.lineTo(x, y);
        }
        for (let k = TENTACLE_PATH_POINTS - 1; k >= 0; k--) {
          const prev = Math.max(0, k - 1), next = Math.min(TENTACLE_PATH_POINTS - 1, k + 1), dx = pathX[base + next] - pathX[base + prev], dy = pathY[base + next] - pathY[base + prev], length = Math.hypot(dx, dy) || 1, nx = -dy / length, ny = dx / length, u = k / (TENTACLE_PATH_POINTS - 1), width = 1.15 * tentacleScale + halfWidth * Math.pow(1 - u, .9), x = pathX[base + k] - nx * width, y = pathY[base + k] - ny * width;
          front.lineTo(x, y);
        }
        front.closePath(); front.endFill();
        front.lineStyle(halfWidth * .78, normalLash ? 0x1a1019 : glow, (normalLash ? .94 : .34) * fade).moveTo(pathX[base], pathY[base]);
        for (let k = 1; k < TENTACLE_PATH_POINTS; k++) front.lineTo(pathX[base + k], pathY[base + k]);
        front.lineStyle(normalLash ? Math.max(3.4, halfWidth * .3) : Math.max(1.7, halfWidth * .16), core, .98 * fade).moveTo(pathX[base], pathY[base]);
        for (let k = 1; k < TENTACLE_PATH_POINTS; k++) front.lineTo(pathX[base + k], pathY[base + k]);
        if (normalLash) {
          front.lineStyle(Math.max(1.2, halfWidth * .105), lashVisual.core, (.58 + lashLevel * .08) * fade).moveTo(pathX[base + 1], pathY[base + 1]);
          for (let k = 2; k < TENTACLE_PATH_POINTS; k++) front.lineTo(pathX[base + k], pathY[base + k]);
          if (lashLevel >= 3) for (const k of [4, 8, 12, 15]) { const x = pathX[base + k], y = pathY[base + k], size = (2.15 + lashLevel * .14 - k * .045) * tentacleScale; front.beginFill(0x35133e, .96 * fade).drawCircle(x, y, size * 1.55).endFill(); front.beginFill(lashVisual.middle, .98 * fade).drawCircle(x, y, size).endFill(); front.beginFill(lashVisual.core, .92 * fade).drawCircle(x - size * .2, y - size * .2, size * .36).endFill(); }
        }
        front.beginFill(core, .98 * fade).drawCircle(tipX, tipY, (normalLash ? 2.5 + lashLevel * .34 : 2.4) * tentacleScale).endFill();
      }
    }
    const membrane = count('membrane') + count('reinforced_shield') + count('resistance'), impact = Math.max(p.impactFlash || 0, p.shieldActive > 0 ? .8 : 0);
    if (membrane || impact > 0) {
      const base = radius + 4 + Math.max(0, membrane - 1) * .45, amp = 1 + membrane * .16 + impact * 2.1; back.lineStyle(1.2 + membrane * .17 + impact, p.shieldActive > 0 ? 0xeaffff : membrane >= 3 ? 0x62cfff : 0x70efff, Math.min(1, .38 + membrane * .12 + impact * .55));
      for (let i = 0; i <= 36; i++) { const a = i / 36 * Math.PI * 2, r = base + Math.sin(a * 5 + t * .008) * amp + Math.sin(a * 9 - t * .006) * amp * .32, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r; if (!i) back.moveTo(x, y); else back.lineTo(x, y); } back.closePath();
      if (membrane) { const spacing = Math.max(7, radius * .42); front.beginFill(0x4adfff, Math.min(.105, .035 + membrane * .014)); front.drawCircle(p.x, p.y, radius * .92); front.endFill(); front.lineStyle(.7, 0xb8f6ff, .13 + Math.min(.18, membrane * .02)); for (let row = -2; row <= 2; row++) for (let col = -2; col <= 2; col++) { const hx = p.x + col * spacing + (row % 2) * spacing * .5, hy = p.y + row * spacing * .86; if (Math.hypot(hx - p.x, hy - p.y) < radius * .88) front.drawPolygon([hx,hy-spacing*.26,hx+spacing*.22,hy-spacing*.13,hx+spacing*.22,hy+spacing*.13,hx,hy+spacing*.26,hx-spacing*.22,hy+spacing*.13,hx-spacing*.22,hy-spacing*.13]); } }
    }
    const nucleus = count('nucleus') + count('mitochondria');
    if (nucleus) { scene.nucleusGlow.visible = true; scene.nucleusGlow.position.set(p.x, p.y); scene.nucleusGlow.width = scene.nucleusGlow.height = radius * (1.1 + nucleus * .055); scene.nucleusGlow.alpha = .42 + .08 * glow; }
    const vesicles = count('explosive_vesicles'); if (vesicles) { const n = Math.min(10, 2 + vesicles * 2); for (let i = 0; i < n; i++) { const a = t * .00045 + i / n * Math.PI * 2, r = radius * .81 + 2, pulse = 1 + .12 * Math.sin(t * .008 + i * 2); cell(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, (2.2 + vesicles * .4) * g.scaleConfig.visual.explosiveVesicle * pulse, '#ffb87f', '#e75b3d', a, .82); } }
    const laser = count('laser'); if (laser) { let target = null, best = Infinity; for (const e of g.enemies) { const dx = e.x - p.x, dy = e.y - p.y, d = dx * dx + dy * dy; if (e.alive !== false && d < best) { best = d; target = e; } } if (target) { const dx = target.x - p.x, dy = target.y - p.y, dist = Math.hypot(dx, dy) || 1, beamScale = g.scaleConfig.visual.laserBeam, sx = p.x + dx / dist * radius * .8, sy = p.y + dy / dist * radius * .8, pulse = .5 + .5 * Math.sin(t * .012); back.lineStyle((4 + laser * .45) * beamScale, 0xa936ff, .2 + pulse * .3).moveTo(sx, sy).lineTo(target.x, target.y); front.lineStyle((1.4 + laser * .28) * beamScale, 0xf1dcff, .6 + pulse * .3).moveTo(sx, sy).lineTo(target.x, target.y); cell(sx, sy, (4 + laser * .45) * beamScale, '#e5b8ff', '#7435d8', Math.atan2(dy, dx), .92); } }
    const healing = count('regen') + count('repair'); if (healing) for (let i = 0, n = Math.min(10, 2 + healing * 2); i < n; i++) { const rise = (t * .022 + i * 8) % 24, a = -t * .0012 + i / n * Math.PI * 2; cell(p.x + Math.cos(a) * (radius + 5 + rise * .15), p.y + Math.sin(a) * (radius + 5 + rise * .15) - rise, 1.5 + healing * .16, '#b4ffc4', '#31b66d', a, .5); }
    const chem = count('chemotaxis'); if (chem) { const n = Math.min(12, 4 + chem * 2); front.lineStyle(1 + chem * .1, 0x77eaff, .7); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + t * .00022, sx = p.x + Math.cos(a) * radius * .83, sy = p.y + Math.sin(a) * radius * .83, len = 4 + chem * .7; front.moveTo(sx, sy).lineTo(sx + Math.cos(a) * len, sy + Math.sin(a) * len); cell(sx + Math.cos(a) * len, sy + Math.sin(a) * len, 1.6 + chem * .12, '#d1ffff', '#2d9dbf', a, .8); } }
    const conductive = count('vesicles'); if (conductive) for (let i = 0, n = Math.min(12, conductive * 2); i < n; i++) { const a = -t * .00055 + i / n * Math.PI * 2; cell(p.x + Math.cos(a) * radius * .85, p.y + Math.sin(a) * radius * .85, 1.8 + conductive * .2, '#8fffff', '#167daf', a, .85); }
    const enzymes = count('enzymes') + count('reserve_atp'); if (enzymes) for (let i = 0, n = Math.min(12, enzymes * 2); i < n; i++) { const a = t * .00042 + i / n * Math.PI * 2; cell(p.x + Math.cos(a) * radius * .54, p.y + Math.sin(a) * radius * .54, 1.8 + enzymes * .16, '#ffe29a', count('enzymes') >= 5 ? '#d88224' : '#a96825', a, .9); }
    const reserve = count('reserve_damage') + count('reserve_cytoplasm'); if (reserve) for (let i = 0, n = Math.min(10, reserve * 2); i < n; i++) { const a = -t * .0007 + i / n * Math.PI * 2, purple = i % 2; cell(p.x + Math.cos(a) * radius * .67, p.y + Math.sin(a) * radius * .67, 1.5 + reserve * .13, purple ? '#d99bff' : '#b2ffe0', purple ? '#803acb' : '#25865f', a, .8); }
    const absorption = count('absorption'); for (const orb of g.orbs) { const dx = p.x - orb.x, dy = p.y - orb.y, distance = Math.hypot(dx, dy) || 1, reach = orb.magnetized?Infinity:65 + absorption * 42; if ((!absorption&&!orb.magnetized)||distance>=reach) continue; const bend = Math.sin(t * .004 + orb.x) * Math.min(10, distance * .08), mx = (p.x + orb.x) / 2 - dy / distance * bend, my = (p.y + orb.y) / 2 + dx / distance * bend, alpha = orb.magnetized?.8:(1-distance/reach)*(.26+absorption*.09); front.lineStyle(orb.magnetized?2.8:2.2+absorption*.24,orb.magnetized?0xaafaff:0x62dfff,alpha).moveTo(orb.x,orb.y).quadraticCurveTo(mx,my,p.x,p.y);front.lineStyle(.8,0xeaffff,alpha*.8).moveTo(orb.x,orb.y).quadraticCurveTo(mx,my,p.x,p.y); }
    if (p.growthTimer > 0) { const reveal = 1 - Math.min(1, p.growthTimer / .78), colors = { nucleus:'#72ecff', division:'#be8cff', spines:'#8bdfff', flagella:'#6feaff', membrane:'#a5f7ff', explosive_vesicles:'#ffb36f', orbital:'#c28bff', laser:'#d58cff', infection:'#9aff76', regen:'#83ffad', reinforced_shield:'#78ccff', spiny_membrane:'#a5a0ff', repulsor:'#61dcff', impulse:'#fff08c', mitochondria:'#ffc869', absorption:'#69e5ff', resistance:'#b9cfff', explosion:'#ffad75', plasma_storm:'#d58cff', enzymes:'#ffd879', chemotaxis:'#7eeaff', vesicles:'#8defff', repair:'#91ffae', synaptic_discharge:'#69c8ff', reserve_damage:'#cc91ff', reserve_atp:'#ffe078', reserve_cytoplasm:'#86ffb0' }, color = colors[p.growthId] || '#7aeaff'; for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + t * .0006, rr = radius + 4 + reveal * 6, size = (.8 + reveal * 2.2) * (.3 + .7 * Math.sin(reveal * Math.PI)); cell(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr, size, color, '#176492', a + t * .001, .35 + .55 * Math.sin(reveal * Math.PI)); } }
    const impulse = count('impulse'); if (impulse && p.impulseActive > 0) { const n = Math.min(8, 3 + impulse), backAngle = Math.atan2(p.facingY??0, p.facingX??1) + Math.PI; front.lineStyle(1 + impulse * .1, impulse >= 5 ? 0xfff4b0 : 0x8af3ff, .55); for (let i = 0; i < n; i++) { const a = backAngle + (i - (n - 1) / 2) * .13, len = 6 + impulse * 1.5 + (i % 3) * 2; front.moveTo(p.x + Math.cos(a) * radius * .88, p.y + Math.sin(a) * radius * .88).quadraticCurveTo(p.x + Math.cos(a) * (radius + len * .55), p.y + Math.sin(a) * (radius + len * .55), p.x + Math.cos(a) * (radius + len), p.y + Math.sin(a) * (radius + len)); } }
    const liquid = p.phaseActive > 0 ? Math.min(1, (p.phaseElapsed || 0) / .22) : Math.min(1, (p.phaseReform || 0) / .42);
    if (liquid > .005 && count('liquid_phase')) {
      const phaseLevel = count('liquid_phase'), moving = Math.hypot(p.motionX || 0, p.motionY || 0), direction = moving > .05 ? Math.atan2(p.motionY || 0, p.motionX || 0) : 0, stretch = moving > .05 ? 1 + Math.min(.16, moving * .1) : 1, rx = radius * (.91 + .035 * Math.sin(t * .011 * (1 + phaseLevel * .08))) * stretch, ry = radius * (.92 - .035 * Math.sin(t * .009)) / Math.sqrt(stretch), sides = 28;
      front.lineStyle(0); front.beginFill(0x25dff4, .12 * liquid); for (let i = 0; i <= sides; i++) { const a = i / sides * Math.PI * 2, ripple = 1 + .035 * Math.sin(a * 4 + t * .008) + .022 * Math.sin(a * 7 - t * .006), lx = Math.cos(a) * rx * ripple, ly = Math.sin(a) * ry * ripple, px = p.x + Math.cos(direction) * lx - Math.sin(direction) * ly, py = p.y + Math.sin(direction) * lx + Math.cos(direction) * ly; if (!i) front.moveTo(px, py); else front.lineTo(px, py); } front.closePath(); front.endFill();
      front.lineStyle(1.35 + phaseLevel * .12, phaseLevel >= 4 ? 0x92ffff : 0x45ecff, .64 * liquid); for (let i = 0; i <= sides; i++) { const a = i / sides * Math.PI * 2, ripple = 1 + .035 * Math.sin(a * 4 + t * .008) + .022 * Math.sin(a * 7 - t * .006), lx = Math.cos(a) * rx * ripple, ly = Math.sin(a) * ry * ripple, px = p.x + Math.cos(direction) * lx - Math.sin(direction) * ly, py = p.y + Math.sin(direction) * lx + Math.cos(direction) * ly; if (!i) front.moveTo(px, py); else front.lineTo(px, py); } front.closePath();
      const currents = Math.min(4, Math.max(0, phaseLevel - 1)); for (let i = 0; i < currents; i++) { const offset = (i - (currents - 1) / 2) * 4, wave = Math.sin(t * .004 + i * 1.7) * radius * .16; front.lineStyle(1 + phaseLevel * .12, i % 2 ? 0x75ffff : 0x5caeff, (.28 + .05 * phaseLevel) * liquid); front.moveTo(p.x - rx * .48, p.y + offset + wave); front.bezierCurveTo(p.x - rx * .12, p.y - offset - wave, p.x + rx * .12, p.y + offset + wave, p.x + rx * .48, p.y - offset - wave); }
      const bubbles = Math.min(5, 1 + phaseLevel); for (let i = 0; i < bubbles; i++) { const a = t * (.0015 + i * .00011) + i * Math.PI * 2 / bubbles, distance = radius * (.18 + .28 * ((i % 3) / 2)), bx = p.x + Math.cos(a) * distance, by = p.y + Math.sin(a * 1.2) * distance * .7, br = 1.05 + (i % 2) * .55; front.lineStyle(.75, 0xc8ffff, .66 * liquid); front.beginFill(0x63eaff, .16 * liquid); front.drawCircle(bx, by, br); front.endFill(); }
      if (phaseLevel >= 4) { const drops = phaseLevel === 5 ? 4 : 2; for (let i = 0; i < drops; i++) { const a = t * .0008 + i * Math.PI * 2 / drops, reach = radius * (1.13 + .08 * Math.sin(t * .006 + i)), bx = p.x + Math.cos(a) * reach, by = p.y + Math.sin(a) * reach; front.lineStyle(.8, 0x75f7ff, .55 * liquid); front.beginFill(0x42dfff, .28 * liquid); front.drawEllipse(bx, by, 1.3, 2.1 + phaseLevel * .12); front.endFill(); front.lineStyle(.65, 0xc9ffff, .4 * liquid).moveTo(bx, by).lineTo(p.x + Math.cos(a) * radius, p.y + Math.sin(a) * radius); } }
      if (!p.phaseActive && p.phaseReform > 0) { const reform = 1 - p.phaseReform / .42, waveRadius = radius + reform * 16; front.lineStyle(1.5, 0x8dffff, (1 - reform) * .6).drawEllipse(p.x, p.y, waveRadius, waveRadius * .92); }
    }
    hidePool(scene.extraOrgs, organelles);
  }

  function drawDamage(g) {
    let n = 0;
    for (const d of g.damageNumbers) { if (!d.target) continue; const value = g.functions.damageNumberFormat.format(Math.round(d.value * 10) / 10), label = d.playerDamage ? `−${value}` : value, image = g.functions.getDamageTextSprite(label, true, !!d.playerDamage), s = getPool(scene.damageSprites, scene.damageLayer, n++), progress = 1 - d.life / d.duration, targetRadius=d.playerDamage?(g.playerHitRadius||0):(d.target.r||0)*(d.target.isBoss?g.scaleConfig.reference.bossSprite:g.scaleConfig.reference.enemySprite); setTexture(s, image); s.position.set(d.target.x, d.target.y - targetRadius - 12 - progress * 32); s.width = g.scaleConfig.visual.damageNumberScreenPx * (d.playerDamage ? 1.15 : 1) / scene.cameraZoom; s.height = s.width * 40 / 128; s.alpha = Math.max(0, Math.min(1, Math.min(d.life / .2, 1))); }
    hidePool(scene.damageSprites, n);
  }

  function renderFrame() {
    if (rendererState.mode !== 'webgl' || !rendererState.app || !rendererState.context) return;
    const g = hooks.getSnapshot(), t = performance.now(); updateSize(g);
    const p = g.player, map=g.worldMap, fitZoom=map?Math.max(g.W/map.width,g.H/map.height):0, targetZoom = Math.max(g.scaleConfig.camera.minimumZoom, fitZoom)*g.scaleConfig.camera.viewScale, cameraDelta = rendererState.cameraTime ? Math.max(0, t - rendererState.cameraTime) : 1000;
    rendererState.cameraTime = t; scene.cameraZoom += (targetZoom - scene.cameraZoom) * (1 - Math.exp(-cameraDelta / 220));
    scene.world.scale.set(scene.cameraZoom);
    const mapHalfW=(map?.width||0)*scene.cameraZoom/2,mapHalfH=(map?.height||0)*scene.cameraZoom/2;
    const minCameraX=Math.min(g.W/2,g.W-mapHalfW),maxCameraX=Math.max(g.W/2,mapHalfW),minCameraY=Math.min(g.H/2,g.H-mapHalfH),maxCameraY=Math.max(g.H/2,mapHalfH);
    const targetCameraX=Math.max(minCameraX,Math.min(maxCameraX,g.W/2-(p?.x||0)*scene.cameraZoom)),targetCameraY=Math.max(minCameraY,Math.min(maxCameraY,g.H/2-(p?.y||0)*scene.cameraZoom));
    // Ease ordinary movement; portal crossings intentionally snap to the paired doorway.
    const portalJump=Math.abs(targetCameraX-(scene.cameraFollowX??targetCameraX))>g.W*.75||Math.abs(targetCameraY-(scene.cameraFollowY??targetCameraY))>g.H*.75;
    if(scene.cameraFollowX==null||scene.cameraFollowY==null||!p||portalJump){scene.cameraFollowX=targetCameraX;scene.cameraFollowY=targetCameraY}
    else{const follow=1-Math.exp(-cameraDelta/125);scene.cameraFollowX+=(targetCameraX-scene.cameraFollowX)*follow;scene.cameraFollowY+=(targetCameraY-scene.cameraFollowY)*follow}
    // Keep subpixel camera motion continuous; snapping to physical pixels made the whole map step and shake while walking.
    scene.world.position.set(scene.cameraFollowX,scene.cameraFollowY);
    drawWorldMap(g,t);drawContainment(g);drawMapPortals(g,t);drawAlcoholHazards(g,t);drawGrid(g,t);drawRayScars(g);drawInfection(g,t);drawRepulsor(g,t);drawEnemies(g,t);drawLootDrops(g,t);drawParticles(g,t);drawOrbsAndShots(g);drawPlayerCombat(g);drawPlayer(g,t);drawPlayerMutations(g,t);drawDamage(g);
    const gl = rendererState.context, ext = rendererState.timerExt;
    const first = rendererState.firstPixiRender, pixiStart = performance.now();
    if (rendererState.measureGpuNext && gl && ext) {
      rendererState.measureGpuNext = false;
      try {
        const query = gl.createQuery();
        gl.beginQuery(ext.TIME_ELAPSED_EXT, query);
        rendererState.app.renderer.render(scene.stage);
        gl.endQuery(ext.TIME_ELAPSED_EXT);
        rendererState.gpuQuery = query;
        rendererState.gpuQueryStartedAt = performance.now();
      } catch (error) {
        rendererState.measureGpuNext = false;
        rendererState.gpuResult = { status: `consulta GPU no disponible: ${error.message || error}`, ms: null, queryLatencyMs: null };
        hooks.setPhaseGpu(rendererState.gpuResult);
      }
    } else {
      rendererState.app.renderer.render(scene.stage);
    }
    if (first) {
      rendererState.firstPixiRender = false;
      rendererState.gpuResult.pixiRenderCpuMs = performance.now() - pixiStart;
      if (rendererState.uploadProbe) {
        rendererState.gpuResult.textureUploadCalls = rendererState.uploadProbe.calls;
        rendererState.gpuResult.textureUploadCpuMs = rendererState.uploadProbe.cpuMs;
        for (const [name, original, wrapped] of rendererState.uploadProbe.originals) if (gl[name] === wrapped) gl[name] = original;
        rendererState.uploadProbe = null;
      }
      hooks.setPhaseGpu(rendererState.gpuResult);
    }
    pollGpuMeasurement();
  }

  function readTrials() { try { return JSON.parse(sessionStorage.getItem('microverseRendererTrials_v1') || '[]'); } catch { return []; } }
  function writeTrials(items) { try { sessionStorage.setItem('microverseRendererTrials_v1', JSON.stringify(items.slice(-12))); } catch {} }
  function average(samples) {
    if (!samples.length) return null;
    const keys = ['fps','drawP50Ms','drawP95Ms','rafP50Ms','rafP95Ms','rafP99Ms','gapP50Ms','gapP95Ms','gapP99Ms','callbackP50Ms','callbackP95Ms','cacheBuilds'];
    const result = { ...samples[samples.length - 1] };
    for (const key of keys) result[key] = samples.reduce((sum, item) => sum + (Number(item[key]) || 0), 0) / samples.length;
    result.minFps = Math.min(...samples.map(item => Number(item.minFps) || 0));
    result.trials = samples.length;
    return result;
  }
  function drawTrialTable(items, means = null) {
    const target = document.querySelector('#labTrialResults');
    if (!items.length) { target.textContent = 'Sin mediciones guardadas en esta pestaña.'; return; }
    const rows = items.map((item, i) => `<tr><td>${item.label || `Prueba ${i + 1}`}</td><td>${item.fps.toFixed(1)}</td><td>${item.minFps.toFixed(1)}</td><td>${item.rafP95Ms.toFixed(1)}</td><td>${item.gapP95Ms.toFixed(1)}</td><td>${item.drawP95Ms.toFixed(2)}</td><td>${item.renderer?.api || '?'}</td><td>${item.renderer?.resolution || '?'}</td></tr>`).join('');
    const meanRows = means ? `<tr style="font-weight:800;color:#aafaff"><td>Media A ×3</td><td>${means.A.fps.toFixed(1)}</td><td>${means.A.minFps.toFixed(1)}</td><td>${means.A.rafP95Ms.toFixed(1)}</td><td>${means.A.gapP95Ms.toFixed(1)}</td><td>${means.A.drawP95Ms.toFixed(2)}</td><td>${means.A.renderer?.api || '?'}</td><td>${means.A.renderer?.resolution || '?'}</td></tr><tr style="font-weight:800;color:#d2b4ff"><td>Media B ×3</td><td>${means.B.fps.toFixed(1)}</td><td>${means.B.minFps.toFixed(1)}</td><td>${means.B.rafP95Ms.toFixed(1)}</td><td>${means.B.gapP95Ms.toFixed(1)}</td><td>${means.B.drawP95Ms.toFixed(2)}</td><td>${means.B.renderer?.api || '?'}</td><td>${means.B.renderer?.resolution || '?'}</td></tr>` : '';
    target.innerHTML = `<table style="width:100%;border-collapse:collapse;white-space:nowrap"><thead><tr>${['Ronda','FPS','mín','RAF p95','hueco p95','Draw p95','API','resolución'].map(x=>`<th style="padding:4px;border-bottom:1px solid #69efff66;text-align:left">${x}</th>`).join('')}</tr></thead><tbody>${rows}${meanRows}</tbody></table>`;
  }
  async function measureByPhase(mode, thermal) {
    const webgl = mode === 'B · PixiJS WebGL 2';
    const game = window.__MICROVERSE_LAB_HOOKS__;
    game.beginPhaseCapture(mode, thermal);
    const modeStart = performance.now();
    if (!await setMode(webgl ? 'webgl' : 'canvas')) throw new Error(rendererState.error || 'No se pudo activar el renderizador solicitado.');
    const setupMs = performance.now() - modeStart;
    const api = backendInfo();
    if (webgl && api.api !== 'PixiJS WebGL 2') throw new Error(`Se solicitó WebGL 2 pero el contexto activo es ${api.api}. No se aceptó como una prueba WebGL 2.`);
    armFirstGpuMeasurement();
    game.finishPhaseSetup(setupMs, api);
    game.startDiagnosticScenario(webgl ? 'phaseWebgl' : 'phaseCanvas');
    reportStatus(`${mode} · ${thermal} · inicialización y primer fotograma`, true);
    const deadline = performance.now() + 30000;
    while (!game.getPhaseState().complete && performance.now() < deadline) await new Promise(resolve => setTimeout(resolve, 100));
    const state = game.getPhaseState();
    if (!state.complete || !state.latest) throw new Error('La captura por fases no terminó. Mantén la pestaña visible y vuelve a ejecutar.');
    return state.latest;
  }
  async function runPhasedBench(plan) {
    const ids = ['phaseColdCanvas','phaseColdWebgl','phaseHotCanvas','phaseHotWebgl','phaseABCold','phaseABHot','labCanvasRun','labWebglRun','labCompareRun'];
    const buttons = ids.map(id => document.getElementById(id)).filter(Boolean);
    buttons.forEach(button => button.disabled = true);
    try {
      if (plan === 'coldPair' || plan === 'hotPair') {
        const thermal = plan === 'coldPair' ? 'primera ejecución de esta carga, sin precalentamiento intencional' : 'repetición caliente; cachés/contexto ya usados';
        for (const mode of ['A · Canvas 2D', 'B · PixiJS WebGL 2']) {
          const key = mode.startsWith('A') ? 'canvas' : 'webgl';
          const prior = gamePageRunCount('any');
          const label = prior ? `${thermal} · escena/cachés compartidas ya generadas en esta carga` : thermal;
          const run = await measureByPhase(mode, label);
          incrementPageRun(key);
          reportStatus(`${mode}: sostenido ${run.phases[2]?.fps.toFixed(1) || '—'} FPS; inicialización ${run.phases[0]?.durationMs.toFixed(0) || '—'} ms`, true);
        }
        reportStatus('Par A/B por fases completado. Revisa tabla, gráfica y conclusión por renderizador.');
      } else {
        const mode = plan.toLowerCase().includes('webgl') ? 'B · PixiJS WebGL 2' : 'A · Canvas 2D';
        const key = mode.startsWith('A') ? 'canvas' : 'webgl';
        const cold = plan.startsWith('cold');
        const prior = gamePageRunCount('any');
        const thermal = cold && prior === 0 ? 'primera ejecución de esta carga' : cold ? 'sin precalentamiento intencional; escenario/cachés ya usados antes' : 'repetición caliente; cachés/contexto ya usados';
        const run = await measureByPhase(mode, thermal);
        incrementPageRun(key);
        reportStatus(`${mode}: sostenido ${run.phases[2]?.fps.toFixed(1) || '—'} FPS · mínimo ${run.phases[2]?.minFps.toFixed(1) || '—'} · ${run.renderer?.resolution || '?'}`);
      }
    } catch (error) {
      gameHooks().cancelPhaseCapture(`Prueba por fases detenida: ${error.message || error}`);
      reportStatus(`Prueba por fases detenida: ${error.message || error}`);
    } finally {
      buttons.forEach(button => button.disabled = false);
      runHud.classList.remove('on');
    }
  }
  function gameHooks() { return window.__MICROVERSE_LAB_HOOKS__; }
  function gamePageRunCount(key) { return gameHooks().getPageRunCount(key); }
  function incrementPageRun(key) { gameHooks().incrementPageRun(key); }
  async function measureOne(mode, round) {
    const webgl = mode === 'webgl';
    if (!await setMode(webgl ? 'webgl' : 'canvas')) throw new Error(rendererState.error || 'No se pudo activar el renderizador solicitado.');
    const game = window.__MICROVERSE_LAB_HOOKS__;
    game.startDiagnosticScenario(webgl ? 'rendererWebgl' : 'rendererCanvas');
    // Prewarm the same cached sprites and GPU pipelines before opening the 10-second sample window.
    for (let i = 0; i < 30; i++) { if (webgl) renderFrame(); else game.warmupCanvas(); }
    game.beginMeasurement();
    reportStatus(`Ronda ${round} · ${webgl ? 'B · PixiJS WebGL' : 'A · Canvas 2D'} · 10 s de medición · ${backendInfo().resolution}`, true);
    const deadline = performance.now() + 20000;
    while (!game.getSnapshot().diagnostic.abCaptured && performance.now() < deadline) await new Promise(resolve => setTimeout(resolve, 250));
    const snap = game.getSnapshot();
    if (!snap.diagnostic.abCaptured) throw new Error('La ventana de 10 segundos no terminó. Mantén la pestaña visible y ejecuta de nuevo.');
    const key = webgl ? 'B' : 'A';
    return JSON.parse(JSON.stringify(snap.diagnostic.abResults[key]));
  }
  async function runBenchmark(mode) {
    const buttons = [document.querySelector('#labCanvasRun'), document.querySelector('#labWebglRun'), document.querySelector('#labCompareRun')];
    buttons.forEach(button => button.disabled = true);
    const measurements = [];
    try {
      if (mode === 'compare') {
        for (let round = 1; round <= 3; round++) {
          const a = await measureOne('canvas', round); a.label = `A · ${round}`; measurements.push(a); writeTrials(measurements);
          const b = await measureOne('webgl', round); b.label = `B · ${round}`; measurements.push(b); writeTrials(measurements);
          drawTrialTable(measurements);
        }
        const meanA = average(measurements.filter(item => item.label.startsWith('A'))), meanB = average(measurements.filter(item => item.label.startsWith('B')));
        window.__MICROVERSE_LAB_HOOKS__.saveABResults({ A: meanA, B: meanB });
        drawTrialTable(measurements, { A: meanA, B: meanB });
        reportStatus(`3 rondas completadas · media A ${meanA.fps.toFixed(1)} FPS · B ${meanB.fps.toFixed(1)} FPS · diferencia ${(meanB.fps - meanA.fps).toFixed(1)} FPS. Revisa la tabla y el monitor.`);
      } else {
        const item = await measureOne(mode, 1); item.label = mode === 'webgl' ? 'B · WebGL' : 'A · Canvas'; measurements.push(item);
        writeTrials([...readTrials(), ...measurements]); drawTrialTable(readTrials());
        reportStatus(`Medición terminada · ${item.renderer?.api || '?'} · ${item.fps.toFixed(1)} FPS · ${item.renderer?.resolution || '?'}`);
      }
    } catch (error) { reportStatus(`Prueba detenida: ${error.message || error}`); }
    finally { buttons.forEach(button => button.disabled = false); runHud.classList.remove('on'); }
  }

  function destroyRenderer() { if (rendererState.gpuQuery && rendererState.context) { try { rendererState.context.deleteQuery(rendererState.gpuQuery); } catch {} } if (rendererState.app) { try { rendererState.app.destroy(true, { children: true, texture: true, baseTexture: true }); } catch {} } rendererState.app = null; rendererState.context = null; rendererState.mode = 'unavailable'; }
  window.__MICROVERSE_RENDERER__ = { get mode() { return rendererState.mode; }, renderFrame, backendInfo, destroy: destroyRenderer };
  window.addEventListener('resize', () => { if (rendererState.app) { const g = hooks.getSnapshot(); updateSize(g); renderFrame(); } });
  window.addEventListener('pagehide', destroyRenderer, { once: true });
  if (production) {
    (async () => {
      try {
        startupLog?.log('info', 'WebGL 2', 'Esperando lámina del organismo');
        const artReady = await hooks.waitForAssets();
        if (!artReady) throw new Error('No se pudo cargar la lámina de evolución del microorganismo.');
        // Wait for the shared sprite cache to finish before uploading it. The
        // hook is asynchronous; passing its Promise to prewarmTextures skipped
        // the GPU warm-up and let its progress label overwrite the ready/error
        // state in the menu.
        await createApp();
        rendererState.mode = 'webgl';
        rendererState.app.view.style.display = 'block';
        canvas.style.opacity = '0';
        canvas.style.pointerEvents = 'auto';
        renderFrame();
        startupLog?.log('info', 'WebGL 2', `Renderizador listo · ${backendInfo().resolution}`);
        window.__MICROVERSE_RENDERER_READY_RESOLVE__?.(true);
        reportStatus(`WebGL 2 preparado · ${backendInfo().resolution} · PixiJS ${PIXI.VERSION}`);
        // Preparing and uploading cached art is an optimization, not a startup
        // requirement. Let the game start first; a failed warm-up must not be
        // reported as a missing WebGL 2 context.
        hooks.prepareGameResources()
          .then(sources => {startupLog?.log('info','Texturas PixiJS',`Preparando ${sources.length} recursos precargados`);return prewarmTextures(sources)})
          .then(()=>startupLog?.log('info','Texturas PixiJS','Preparación gráfica terminada'))
          .catch(error => {startupLog?.log('error','Texturas PixiJS',String(error?.stack||error));reportStatus(`WebGL 2 activo · carga gráfica progresiva (${error.message || error})`)});
      } catch (error) {
        rendererState.mode = 'canvas'; rendererState.error = error.message || String(error);
        canvas.style.opacity = '1'; canvas.style.pointerEvents = 'auto';
        if (rendererState.app) rendererState.app.view.style.display = 'none';
        window.__MICROVERSE_RENDERER_READY_RESOLVE__?.(false);
        startupLog?.log('error', 'Inicialización WebGL', String(error?.stack || error));
        reportStatus(`Modo compatible Canvas 2D · WebGL 2 no disponible: ${rendererState.error}`);
      }
    })();
  } else {
    document.querySelector('#labCanvasRun')?.addEventListener('click', () => runBenchmark('canvas'));
    document.querySelector('#labWebglRun')?.addEventListener('click', () => runBenchmark('webgl'));
    document.querySelector('#labCompareRun')?.addEventListener('click', () => runBenchmark('compare'));
    document.querySelector('#phaseColdCanvas')?.addEventListener('click', () => runPhasedBench('coldCanvas'));
    document.querySelector('#phaseColdWebgl')?.addEventListener('click', () => runPhasedBench('coldWebGL'));
    document.querySelector('#phaseHotCanvas')?.addEventListener('click', () => runPhasedBench('hotCanvas'));
    document.querySelector('#phaseHotWebgl')?.addEventListener('click', () => runPhasedBench('hotWebGL'));
    document.querySelector('#phaseABCold')?.addEventListener('click', () => runPhasedBench('coldPair'));
    document.querySelector('#phaseABHot')?.addEventListener('click', () => runPhasedBench('hotPair'));
    if (status) reportStatus(`API activa: Canvas 2D · ${canvas.width}×${canvas.height} · PixiJS ${window.PIXI ? PIXI.VERSION : 'no cargó'}`);
    if (document.querySelector('#labTrialResults')) drawTrialTable(readTrials());
  }
})();
