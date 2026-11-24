(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MicroverseParty=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const CONFIG=Object.freeze({tacticalInterval:.11,reviveSeconds:10,projectileLimit:96,effectLimit:48,formationDistance:165,engageDistance:450,companionLeash:560,companionReturnDistance:270,catchupDistance:1150,heroRadius:49,heroVisualSize:180});
const PROTAGONISTS=Object.freeze(['kael','lyra']);
const isProtagonist=id=>PROTAGONISTS.includes(id);
let playerName='';
function setPlayerName(value){
 const name=String(value || '').trim();
 if(!/^[\p{L}\p{N}][\p{L}\p{N}\p{M} '’-]{0,23}$/u.test(name))return false;
 playerName=name;return true;
}
const traveler=(id)=>Object.freeze({
 id,get name(){return playerName || 'Protagonista'},title:'Viajero dimensional',role:'Combatiente de señal y resonancia',
 description:'Convierte el teléfono y sus audífonos gamer en focos de energía: dispara ondas musicales, distorsiona el espacio y levanta una barrera de señal.',
 basic:'Nota de frecuencia',legacy:'tentacular',color:'#c78aff',hp:135,damage:22,rate:1.05,
 range:560,speed:310,crit:.10,armor:.04,kind:'traveler_note',arc:0
});
const CLASSES=Object.freeze({
 kael:traveler('kael'),lyra:traveler('lyra'),
 warrior:Object.freeze({id:'warrior',name:'Ivo',title:'Guerrero',role:'Daño cuerpo a cuerpo',description:'Espadachín equilibrado que abre espacio con cortes frontales.',basic:'Espadazo',legacy:'tentacular',color:'#c77a61',hp:135,damage:22,rate:1.05,range:190,speed:310,crit:.10,armor:.04,kind:'arc',arc:1.02}),
 archer:Object.freeze({id:'archer',name:'Nara',title:'Arquero',role:'Daño físico a distancia',description:'Busca blancos cercanos y mantiene distancia mientras dispara.',basic:'Flecha',legacy:'flagellate',color:'#89ad71',hp:90,damage:17,rate:1.30,range:660,speed:335,crit:.13,armor:0,kind:'arrow',arc:0}),
 mage:Object.freeze({id:'mage',name:'Liria',title:'Mago',role:'Magia y daño de área',description:'Proyectiles arcanos y explosiones que castigan grupos de enemigos.',basic:'Proyectil Arcano',legacy:'plasmatic',color:'#9e91dd',hp:82,damage:26,rate:.85,range:590,speed:295,crit:.08,armor:0,kind:'arcane',arc:0}),
 cleric:Object.freeze({id:'cleric',name:'Alba',title:'Clérigo',role:'Apoyo y curación',description:'Luz sagrada contra los enemigos y curación automática del aliado herido.',basic:'Luz Sagrada',legacy:'infectious',color:'#e1ca81',hp:100,damage:14,rate:1,range:510,speed:305,crit:.05,armor:.02,kind:'holy',arc:0}),
 assassin:Object.freeze({id:'assassin',name:'Vera',title:'Asesino',role:'Velocidad y críticos',description:'Dagas rápidas, golpes críticos y heridas persistentes.',basic:'Dagas',legacy:'flagellate',color:'#ae6ba4',hp:90,damage:12,rate:2.3,range:150,speed:370,crit:.30,armor:0,kind:'dagger',arc:.68}),
 defender:Object.freeze({id:'defender',name:'Orso',title:'Defensor',role:'Protección y control',description:'Escudo pesado que repele amenazas y protege a los aliados próximos.',basic:'Golpe de Escudo',legacy:'membrane',color:'#729fb8',hp:175,damage:16,rate:.85,range:165,speed:270,crit:.05,armor:.16,kind:'shield',arc:.85}),
 lancer:Object.freeze({id:'lancer',name:'Teo',title:'Lancero',role:'Penetración y alcance',description:'Estocadas en línea que mantienen a raya al enemigo.',basic:'Estocada',legacy:'tentacular',color:'#cda77d',hp:115,damage:23,rate:1.08,range:290,speed:315,crit:.10,armor:.03,kind:'thrust',arc:0})
});
const IDS=Object.freeze(Object.keys(CLASSES)),DEFAULT_FORMATION=Object.freeze(['warrior','mage','cleric']),FORMATION_KEY='microverse_fantasy_formation_v1';
const ULTIMATES=Object.freeze(Object.fromEntries(IDS.map(id=>[id,Object.freeze([Object.freeze({id:id+'_ultimate_1',implemented:false}),Object.freeze({id:id+'_ultimate_2',implemented:false})])])));
// Manual skills use the run's existing limited mana pool. Cooldowns belong to heroes.
const portalSkill=Object.freeze({name:'Barrera de Frecuencia',icon:'shield',cost:20,cooldown:24,description:'Despliega una cúpula violeta amplia durante 9 s. Bloquea proyectiles y expulsa a los enemigos que intentan cruzarla.'});
const UNIQUE_ABILITIES=Object.freeze({
 kael:portalSkill,lyra:portalSkill,
 warrior:Object.freeze({name:'Torbellino',icon:'sweep',cost:18,cooldown:10,description:'Giro de espada: 220% de daño en un radio de 260.'}),
 archer:Object.freeze({name:'Salva Perforante',icon:'pierce',cost:16,cooldown:8,description:'Cinco flechas en abanico: 130% de daño y al menos tres impactos por flecha.'}),
 mage:Object.freeze({name:'Orbe de Ruptura',icon:'arcane',cost:22,cooldown:12,description:'Orbe de 270% de daño y explosión de 140% en un radio de 240.'}),
 cleric:Object.freeze({name:'Santuario Repulsor',icon:'shield',cost:20,cooldown:24,description:'Definitiva. Levanta un campo de fuerza durante 7 s en el lugar de lanzamiento. Repele enemigos y bloquea proyectiles.'}),
 assassin:Object.freeze({name:'Marca Mortal',icon:'dagger',cost:15,cooldown:8,description:'Golpea al enemigo próximo por 400% de daño y causa sangrado durante 3 s.'}),
 defender:Object.freeze({name:'Bastión',icon:'ward',cost:18,cooldown:12,description:'Otorga escudos al equipo próximo y repele a los enemigos con un impacto.'}),
 lancer:Object.freeze({name:'Lanza Fantasma',icon:'spear',cost:17,cooldown:9,description:'Estocada de 300% de daño y 180% de alcance que atraviesa enemigos.'})
});
const LEGACY_UPGRADES=Object.freeze([
 ['warrior_edge','Filo Reforzado','warrior','Daño de espada +18% por nivel.','sword'],['warrior_arc','Barrido Amplio','warrior','Arco del espadazo +16° por nivel.','sweep'],['warrior_heavy','Golpe Pesado','warrior','Retroceso +28 y daño +5% por nivel.','impact'],
 ['archer_aim','Puntería','archer','Daño de flechas +18% por nivel.','arrow'],['archer_speed','Disparo Rápido','archer','Frecuencia de disparo +14% por nivel.','haste'],['archer_pierce','Flecha Perforadora','archer','Las flechas alcanzan un enemigo adicional por nivel.','pierce'],
 ['mage_power','Poder Arcano','mage','Daño mágico +18% por nivel.','arcane'],['mage_blast','Explosión Arcana','mage','Explosión al impacto: radio 85–145 y daño 35–75%.','fire'],['mage_focus','Concentración','mage','Velocidad de lanzamiento +14% por nivel.','haste'],
 ['cleric_bless','Bendición','cleric','Curación +5 PV y alcance de apoyo +20 por nivel.','heal'],['cleric_light','Luz Purificadora','cleric','Daño sagrado +20% por nivel.','holy'],['cleric_aura','Aura Protectora','cleric','Escudo de 10 PV por nivel para aliados próximos cada 12 s.','ward'],
 ['assassin_crit','Filo Mortal','assassin','Daño crítico +35% por nivel.','dagger'],['assassin_speed','Ataque Veloz','assassin','Velocidad de ataque +16% por nivel.','haste'],['assassin_wound','Herida Profunda','assassin','Los golpes causan sangrado durante 3 s.','bleed'],
 ['defender_armor','Escudo Reforzado','defender','Resistencia personal +5% por nivel.','shield'],['defender_impact','Impacto Defensivo','defender','Retroceso del escudo +32 por nivel.','impact'],['defender_guard','Guardia','defender','Reduce un 4% por nivel el daño de aliados a 290 unidades.','guard'],
 ['lancer_range','Lanza Larga','lancer','Alcance de estocada +32 por nivel.','spear'],['lancer_pierce','Perforación','lancer','La estocada atraviesa un enemigo adicional por nivel.','pierce'],['lancer_speed','Estocada Rápida','lancer','Frecuencia de estocada +14% por nivel.','haste'],
 ['team_health','Vitalidad del Equipo','universal','Vida máxima de los tres héroes +12% por nivel.','heart'],['team_speed','Velocidad de Movimiento','universal','Velocidad de los tres héroes +5% por nivel.','boots'],['team_mana','Reserva de Maná','universal','Reserva máxima del protagonista +20 MP por nivel.','mana'],['team_pickup','Alcance de Recogida de Experiencia','universal','Atracción de experiencia +45 unidades por nivel.','xp'],
 ['flaming_arrows','Flechas Ígneas','synergy','Mago + Arquero: encanta flechas durante 1,8 s cada 5 s. Sus impactos explotan.','fire']
].map(([id,name,owner,effect,icon])=>Object.freeze({id,name,owner,effect,icon,max:owner==='synergy'?3:5,requires:owner==='synergy'?Object.freeze(['mage','archer']):null})));
const SLOT_LIMITS=Object.freeze({active:4,passive:2});
const WARRIOR_SKILLS=Object.freeze([
 ['warrior_orbit','Espadas Giratorias','active','orbit','Espadas metálicas orbitales; cada espada puede dañar al mismo enemigo cada 0,6 s.'],
 ['warrior_wave','Onda Cortante','active','wave','Media luna automática de alcance 450, detenida por paredes.'],
 ['warrior_quake','Golpe Sísmico','active','quake','Onda circular con retroceso; se activa si detecta enemigos. Recarga: 7 s.'],
 ['warrior_ghost','Espada Fantasma','active','ghost','Una espada espectral busca, golpea y regresa. Alcance de búsqueda: 320.'],
 ['warrior_mastery','Maestría de Espada','passive','mastery','Daño del Guerrero +10% de la base por nivel.'],
 ['warrior_fury','Furia de Batalla','passive','fury','Frecuencia del ataque básico +5% por nivel; no altera recargas de habilidades.'],
 ['warrior_armor','Armadura de Guerra','passive','armor','Resistencia personal +3 puntos porcentuales por nivel.']
].map(([id,name,category,art,effect])=>Object.freeze({id,name,owner:'warrior',category,art,effect,icon:art,max:5,requires:null})));
const ORBIT_LEVELS=Object.freeze([{count:1,damage:.55,speed:1,radius:110},{count:1,damage:.70,speed:1.1,radius:110},{count:2,damage:.70,speed:1.1,radius:110},{count:2,damage:.85,speed:1.1,radius:126.5},{count:3,damage:.85,speed:1.1,radius:126.5}].map(Object.freeze));
const WAVE_LEVELS=Object.freeze([{damage:1,cooldown:5,hits:1,width:1},{damage:1.15,cooldown:5,hits:1,width:1},{damage:1.30,cooldown:5,hits:2,width:1},{damage:1.45,cooldown:5,hits:2,width:1.2},{damage:1.60,cooldown:4,hits:2,width:1.2}].map(Object.freeze));
const QUAKE_LEVELS=Object.freeze([{radius:180,damage:1},{radius:200,damage:1.1},{radius:220,damage:1.2},{radius:240,damage:1.3},{radius:260,damage:1.5}].map(Object.freeze));
const GHOST_LEVELS=Object.freeze([{damage:.6,interval:1.8,hits:1},{damage:.75,interval:1.8,hits:1},{damage:.9,interval:1.5,hits:1},{damage:1.05,interval:1.5,hits:2},{damage:1.2,interval:1.5,hits:3}].map(Object.freeze));
const ARCHER_SKILLS=Object.freeze([
 ['archer_multi','Multiflecha','active','multi','Modifica la descarga básica con un abanico estrecho; máximo dos impactos por enemigo y descarga.'],
 ['archer_explosive','Flechas Explosivas','active','explosive','Encanta una sola flecha básica cuando está listo. Una explosión por flecha, sin recursión.'],
 ['archer_rain','Lluvia de Flechas','active','rain','Zona de radio 170 con aviso previo. Selección a 600; máximo dos impactos por enemigo y lluvia.'],
 ['archer_bounce','Disparo Rebotante','active','bounce','Disparo independiente cada 5 s; saltos de hasta 210 y sin repetir objetivos.'],
 ['archer_precision','Puntería','passive','aim','Daño del Arquero +8% de la base por nivel.'],
 ['archer_cadence','Cadencia','passive','cadence','Frecuencia del autoataque +6% por nivel; no reduce recargas.'],
 ['archer_hawk','Ojo de Halcón','passive','hawk','Autoataque: alcance +4% y crítico +2 puntos porcentuales por nivel.']
].map(([id,name,category,art,effect])=>Object.freeze({id,name,owner:'archer',category,art,effect,icon:art,max:5,requires:null})));
const MULTI_LEVELS=Object.freeze([{count:2,damage:.65},{count:2,damage:.75},{count:3,damage:.65},{count:3,damage:.75},{count:4,damage:.75}].map(Object.freeze));
const EXPLOSIVE_LEVELS=Object.freeze([{interval:5,radius:80,damage:.45},{interval:5,radius:90,damage:.55},{interval:5,radius:100,damage:.65},{interval:5,radius:110,damage:.75},{interval:4.5,radius:120,damage:.85}].map(Object.freeze));
const RAIN_LEVELS=Object.freeze([{count:6,damage:.65,cooldown:8},{count:7,damage:.65,cooldown:8},{count:8,damage:.70,cooldown:8},{count:9,damage:.75,cooldown:8},{count:10,damage:.80,cooldown:7}].map(Object.freeze));
const BOUNCE_LEVELS=Object.freeze([{targets:2,damage:.70},{targets:3,damage:.70},{targets:4,damage:.75},{targets:5,damage:.75},{targets:6,damage:.80}].map(Object.freeze));
const ARCHER_CONFIG=Object.freeze({rainRange:600,rainRadius:170,rainWarning:.45,rainImpactRadius:30,bounceRange:660,bounceJump:210,bounceCooldown:5,criticalCap:1,volleyLimit:24});
const MAGE_SKILLS=Object.freeze([
 ['mage_orbits','Órbitas Arcanas','active','orbits','Orbes violetas independientes; intervalo de 0,7 s por orbe y enemigo.'],
 ['mage_meteors','Meteoritos','active','meteors','Impactos de radio 85, aviso de 0,6 s y recarga de 8 s. Máximo dos impactos por enemigo y activación.'],
 ['mage_lightning','Rayos Encadenados','active','lightning','Descarga automática cada 5 s; saltos de hasta 200 sin repetir enemigos.'],
 ['mage_gravity','Campo Gravitacional','active','gravity','Campo de 3 s que daña y ralentiza movimiento. Recarga: 9 s; jefes: máximo 10% de ralentización.'],
 ['mage_potency','Poder Arcano','passive','potency','Daño del Mago +10% de la base por nivel.'],
 ['mage_concentration','Concentración','passive','concentration','Frecuencia del autoataque +6% por nivel; no reduce recargas de habilidades.'],
 ['mage_resonance','Resonancia Arcana','passive','resonance','Alcance de las activas adquiridas +4% por nivel: recorrido orbital y selección de las otras activas; radios de área y manual sin cambios.']
].map(([id,name,category,art,effect])=>Object.freeze({id,name,owner:'mage',category,art,effect,icon:art,max:5,requires:null})));
const ARCANE_ORBIT_LEVELS=Object.freeze([{count:1,damage:.55,speed:1,radius:125},{count:1,damage:.70,speed:1.1,radius:125},{count:2,damage:.70,speed:1.1,radius:125},{count:2,damage:.85,speed:1.1,radius:143.75},{count:3,damage:.85,speed:1.1,radius:143.75}].map(Object.freeze));
const METEOR_LEVELS=Object.freeze([{count:2,damage:.9},{count:3,damage:.9},{count:3,damage:1.05},{count:4,damage:1.05},{count:4,damage:1.2}].map(Object.freeze));
const LIGHTNING_LEVELS=Object.freeze([{targets:6,damage:.65},{targets:6,damage:.8},{targets:8,damage:.8},{targets:10,damage:.85},{targets:12,damage:.9}].map(Object.freeze));
const MAX_LIGHTNING_TARGETS=LIGHTNING_LEVELS[LIGHTNING_LEVELS.length-1].targets;
const GRAVITY_LEVELS=Object.freeze([{radius:150,dps:.30,slow:.15},{radius:170,dps:.35,slow:.20},{radius:190,dps:.40,slow:.25},{radius:210,dps:.45,slow:.30},{radius:230,dps:.50,slow:.35}].map(Object.freeze));
const MAGE_CONFIG=Object.freeze({orbHitInterval:.7,orbHitRadius:40,meteorCooldown:8,meteorRadius:85,meteorRange:550,meteorWarning:.6,lightningCooldown:5,lightningRange:480,lightningJump:200,fieldRange:500,fieldDuration:3,fieldCooldown:9,fieldTick:.25,bossSlowCap:.1});
const CLERIC_SKILLS=Object.freeze([
 ['cleric_regen','Aura de Regeneración','active','regen','Aura centrada en el Clérigo: cura a aliados heridos cada 3 s, sin revivir ni sobrecurar.'],
 ['cleric_hammer','Martillo Sagrado','active','hammer','Martillos de radio 90, aviso de 0,5 s, selección 480 y recarga 7 s. Máximo dos impactos por enemigo.'],
 ['cleric_purify','Círculo de Purificación','active','purify','Círculo de 4 s: daño una vez por segundo y elimina veneno. Selección 450, recarga 10 s. No cura vida.'],
 ['cleric_guardian','Ángel Guardián','active','guardian','Protege a un aliado operativo por debajo del 40% de vida y a 500 de distancia. Escudo de 5 s, recarga 16 s.'],
 ['cleric_divine','Bendición Divina','passive','divine','Curaciones del Clérigo +10% de la base por nivel. No mejora escudos ni vida máxima.'],
 ['cleric_faith','Fe Inquebrantable','passive','faith','Potencia de los escudos del Clérigo +8% de la base por nivel; sin ampliar duración ni acumularlos.'],
 ['cleric_sacred','Poder Sagrado','passive','sacred','Daño sagrado del Clérigo +8% de la base por nivel. No mejora curación ni escudos.']
].map(([id,name,category,art,effect])=>Object.freeze({id,name,owner:'cleric',category,art,effect,icon:art,max:5,requires:null})));
const TRAVELER_SKILLS=Object.freeze([
 ['traveler_radio','Onda de Radio','active','radio','Campo violeta alrededor del viajero que daña enemigos cada medio segundo. El alcance y el daño crecen con cada nivel.'],
 ['traveler_echo','Partitura Resonante','active','score','Lanza una ráfaga de notas de energía que atraviesa enemigos.'],
 ['traveler_decoy','Proyección Fantasma','active','hologram','Despliega un señuelo holográfico que estalla y empuja a los enemigos cercanos.'],
 ['traveler_feedback','Ruptura de Graves','active','bass','Una descarga de los audífonos libera un pulso de graves que golpea y aparta a los enemigos.'],
 ['traveler_amplifier','Amplificador','passive','amplifier','Aumenta el daño de todas las fuentes del viajero un 8% por nivel.'],
 ['traveler_battery','Batería de Emergencia','passive','battery','Reduce la recarga de sus habilidades automáticas un 5% por nivel.'],
 ['traveler_signal','Señal Extendida','passive','signal','Amplía un 6% por nivel el alcance de Onda de Radio y la barrera definitiva.']
].map(([id,name,category,art,effect])=>Object.freeze({id,name,owner:'traveler',category,art,effect,icon:art,max:5,requires:null})));
const REGEN_LEVELS=Object.freeze([{radius:220,heal:.02},{radius:240,heal:.025},{radius:260,heal:.03},{radius:280,heal:.035},{radius:300,heal:.04}].map(Object.freeze));
const HAMMER_LEVELS=Object.freeze([{count:1,damage:1},{count:1,damage:1.2},{count:2,damage:1},{count:2,damage:1.2},{count:3,damage:1.2}].map(Object.freeze));
const PURIFY_LEVELS=Object.freeze([{radius:150,dps:.30},{radius:170,dps:.35},{radius:190,dps:.40},{radius:210,dps:.45},{radius:230,dps:.50}].map(Object.freeze));
const GUARDIAN_LEVELS=Object.freeze([.10,.12,.14,.17,.20]);
const CLERIC_CONFIG=Object.freeze({regenInterval:3,hammerCooldown:7,hammerRadius:90,hammerRange:480,hammerWarning:.5,purifyDuration:4,purifyCooldown:10,purifyRange:450,purifyTick:1,guardianDuration:5,guardianCooldown:16,guardianRange:500,guardianThreshold:.40,clusterCandidates:6});
// Keep other classes' existing mechanics; classify them for the shared slots.
const ACTIVE_LEGACY_IDS=new Set(['mage_blast','cleric_aura','assassin_wound','flaming_arrows']);
const UPGRADES=Object.freeze([...WARRIOR_SKILLS,...ARCHER_SKILLS,...MAGE_SKILLS,...CLERIC_SKILLS,...TRAVELER_SKILLS,...LEGACY_UPGRADES.filter(d=>d.owner!=='warrior'&&d.owner!=='archer'&&d.owner!=='mage'&&d.owner!=='cleric').map(d=>Object.freeze({...d,category:ACTIVE_LEGACY_IDS.has(d.id)?'active':'passive'}))]);
const RESERVES=Object.freeze([
 Object.freeze({id:'reserve_power',name:'Disciplina del Equipo',owner:'universal',effect:'Daño de todo el equipo +2%.',icon:'sword',category:'passive',max:5}),
 Object.freeze({id:'reserve_health',name:'Fortaleza del Equipo',owner:'universal',effect:'Vida máxima +4 PV para cada héroe.',icon:'heart',category:'passive',max:5}),
 Object.freeze({id:'reserve_haste',name:'Ritmo de Combate',owner:'universal',effect:'Frecuencia de ataque del equipo +1%.',icon:'haste',category:'passive',max:5})
]);
// Consumable supplies fill an otherwise short choice screen; they never equip skills or add permanent stats.
const SUPPLIES=Object.freeze([
 {id:'supply_recovery',name:'Vendajes de Campo',owner:'universal',category:'supply',icon:'heal',max:Infinity,effect:'Restaura 20% de vida al héroe controlado; el exceso concede hasta 8 PV de escudo.'},
 {id:'supply_team',name:'Provisiones del Equipo',owner:'universal',category:'supply',icon:'heart',max:Infinity,effect:'Restaura 8% de vida a cada aliado operativo; el exceso concede hasta 3 PV de escudo.'},
 {id:'supply_guard',name:'Protección de Emergencia',owner:'universal',category:'supply',icon:'ward',max:Infinity,effect:'Concede 12 PV de escudo al héroe controlado.'}
].map(Object.freeze));
const BY_UPGRADE=Object.freeze(Object.fromEntries([...LEGACY_UPGRADES,...UPGRADES,...RESERVES,...SUPPLIES].map(d=>[d.id,d])));
function ensureLoadout(party){if(!party.loadout)party.loadout={active:[],passive:[]};return party.loadout}
function equipped(party,category){return ensureLoadout(party)[category]||[]}
function freeSlots(party,category){return Math.max(0,(SLOT_LIMITS[category]||0)-equipped(party,category).length)}
function createWarriorState(){return {orbitAngle:0,waveClock:0,quakeClock:0,quakeDetectClock:0,pruneClock:1,orbits:Array.from({length:3},()=>({active:false,initialized:false,x:0,y:0,prevX:0,prevY:0,angle:0,nextHit:new Map()})),ghost:{visible:false,phase:'idle',initialized:false,x:0,y:0,prevX:0,prevY:0,angle:0,clock:0,target:null,visited:new Array(3).fill(null),hitCount:0,trail:new Float32Array(12),trailHead:0},quake:{life:0,duration:.85,x:0,y:0,radius:0,serial:0,rays:new Float32Array(32)}}}

function createArcherState(){return {explosiveClock:0,rainClock:0,bounceClock:0,detectClock:0,volleys:Array.from({length:ARCHER_CONFIG.volleyLimit},()=>({pending:0,hits:new Map()})),rain:{active:false,age:0,x:0,y:0,originX:0,originY:0,count:0,damage:0,serial:0,hits:new Map(),rays:new Float32Array(32),drops:Array.from({length:10},()=>({x:0,y:0,delay:0,done:true,valid:false,life:0}))},bounce:{active:false,x:0,y:0,prevX:0,prevY:0,startX:0,startY:0,angle:0,remaining:0,target:null,count:0,maxHits:0,damage:0,visited:new Array(6).fill(null),segments:Array.from({length:6},()=>({ax:0,ay:0,bx:0,by:0,life:0}))}}}
function createMageState(){return {suspended:false,orbitAngle:0,pruneClock:1,meteorClock:0,lightningClock:0,fieldClock:0,detectClock:0,orbits:Array.from({length:3},()=>({active:false,initialized:false,x:0,y:0,prevX:0,prevY:0,angle:0,nextHit:new Map()})),meteors:{active:false,age:0,count:0,originX:0,originY:0,damage:0,serial:0,selected:new Array(4).fill(null),hits:new Map(),drops:Array.from({length:4},()=>({x:0,y:0,delay:0,valid:false,done:true,life:0}))},lightning:{active:false,clock:0,count:0,maxHits:0,damage:0,x:0,y:0,target:null,visited:new Array(MAX_LIGHTNING_TARGETS).fill(null),segments:Array.from({length:MAX_LIGHTNING_TARGETS},()=>({ax:0,ay:0,bx:0,by:0,life:0}))},field:{active:false,x:0,y:0,originX:0,originY:0,radius:0,remaining:0,dps:0,slow:0,tickClock:0,slowFrame:-1,serial:0,rays:new Float32Array(32),affected:new Set()}}}
function createClericState(){return {suspended:false,regenClock:3,regenPulse:0,hammerClock:0,purifyClock:0,guardianClock:0,detectClock:0,healMarks:Array.from({length:3},()=>({classId:'',life:0})),hammers:{active:false,age:0,count:0,originX:0,originY:0,damage:0,selected:new Array(3).fill(null),hits:new Map(),drops:Array.from({length:3},()=>({x:0,y:0,delay:0,done:true,valid:false,life:0}))},purify:{active:false,x:0,y:0,originX:0,originY:0,radius:0,remaining:0,dps:0,tickClock:0,pulse:0,serial:0,rays:new Float32Array(32),candidates:new Array(CLERIC_CONFIG.clusterCandidates).fill(null)}}}
function createTravelerState(){return {radioClock:0,noteClock:1.4,decoyClock:2.8,feedbackClock:4.2}}
function validFormation(f){return Array.isArray(f)&&f.length===3&&f.every(id=>!!CLASSES[id])&&new Set(f).size===3&&!f.slice(1).some(isProtagonist)}
function readFormation(storage){try{const f=JSON.parse(storage.getItem(FORMATION_KEY));if(validFormation(f))return f.slice()}catch{}return DEFAULT_FORMATION.slice()}
function writeFormation(storage,f){if(!validFormation(f))return false;try{storage.setItem(FORMATION_KEY,JSON.stringify(f));return true}catch{return false}}
function alive(e){return e&&e.alive!==false&&e.hp>0&&!e.cellDevourCaptured}
function level(party,id){return party.levels[id]||0}
function has(party,id){return id==='traveler'?party.classIds.some(isProtagonist):party.classIds.includes(id)}
function actor(id,index,reference,bonuses){
 const d=CLASSES[id],p=reference||{},b=bonuses||{health:0,damage:1,rate:1,speed:1,armor:0,pickup:0};
 Object.assign(p,{classId:id,partyIndex:index,isCompanion:index>0,base:d,permanent:b,x:p.x||0,y:p.y||0,hp:d.hp+(b.health||0),maxHp:d.hp+(b.health||0),damage:d.damage,damageBonus:b.damage||1,rate:d.rate*(b.rate||1),speed:d.speed*(b.speed||1),range:d.range,crit:d.crit,critMultiplier:2,armor:d.armor,bodyRadius:CONFIG.heroRadius,portalCapable:true,portalExitSide:'',portalFlash:0,alive:true,incapacitated:0,uniqueCooldown:0,poisonedRemaining:0,poisonDamageClock:0,poisonColor:null,shield:0,guardianShield:0,guardianRemaining:0,attackClock:index*.17,attackTime:0,attackDuration:.24,attackAngle:0,hurtTime:0,healClock:1+index*.15,auraClock:1,contactClock:0,tacticClock:index*.06,dodge:null,target:null,goalX:p.x||0,goalY:p.y||0,motionX:0,motionY:0,facingX:p.facingX||0,facingY:p.facingY??1,returning:false,followBoost:1,animTime:0,walkPhase:0,animState:'idle',direction:0,stuck:0,navSide:index%2?1:-1,damageDealt:0,healingDone:0,hitTargets:new Array(12).fill(null),hitDistances:new Float64Array(12)});
 return p;
}
function create(formation,leader,bonuses=()=>({})){if(!validFormation(formation))throw Error('Selecciona tres clases diferentes');const members=formation.map((id,i)=>actor(id,i,i===0?leader:null,bonuses(CLASSES[id].legacy,id)));const party={classIds:formation.slice(),controlIndex:0,members,revive:null,dashTrail:[],loadout:{active:[],passive:[]},warrior:createWarriorState(),archer:createArcherState(),mage:createMageState(),cleric:createClericState(),traveler:createTravelerState(),levels:{},time:0,teamLevel:1,enchantClock:0,enchantRemaining:0,offerAge:Object.fromEntries(formation.map(id=>[id,0])),projectiles:Array.from({length:CONFIG.projectileLimit},()=>({active:false,hits:new Array(8).fill(null),hitCount:0})),effects:Array.from({length:CONFIG.effectLimit},()=>({life:0})),effectCursor:0,shotCursor:0,offers:[],rng:Math.random};members[1].x=leader.x-145;members[1].y=leader.y+130;members[2].x=leader.x+145;members[2].y=leader.y+130;for(const m of members)recompute(party,m);return party}
const HERO_STATE_FIELDS=('classId base permanent x y hp maxHp damage damageBonus rate speed range crit critMultiplier armor alive incapacitated uniqueCooldown shield guardianShield guardianRemaining attackClock attackTime attackDuration attackAngle hurtTime healClock auraClock contactClock tacticClock dodge target goalX goalY motionX motionY facingX facingY returning followBoost animTime walkPhase animState direction stuck navSide damageDealt healingDone hitTargets hitDistances portalExitSide portalFlash poisonedRemaining poisonDamageClock poisonColor').split(' ');
function nextLeader(party){if(!party||party.members[0].combat?.dash.active)return null;for(let step=1;step<party.classIds.length;step++){const index=(party.controlIndex+step)%party.classIds.length,m=party.members.find(a=>a.classId===party.classIds[index]);if(m&&m.incapacitated<=0&&m.hp>0)return m}return null}
function canSwitchLeader(party){return !!nextLeader(party)}
function switchLeader(party,ctx){if(!ctx.playing)return false;const other=nextLeader(party);if(!other)return false;const leader=party.members[0];for(const key of HERO_STATE_FIELDS){const value=leader[key];leader[key]=other[key];other[key]=value}party.controlIndex=party.classIds.indexOf(leader.classId);
 for(const shot of party.projectiles)if(shot.active){if(shot.owner===leader)shot.owner=other;else if(shot.owner===other)shot.owner=leader}
 for(const e of ctx.enemies){if(e.rpgBleedOwner===leader)e.rpgBleedOwner=other;else if(e.rpgBleedOwner===other)e.rpgBleedOwner=leader}
 leader.labDamageMultiplier=leader.damageBonus;leader.labArmor=leader.permanent.armor||0;leader.labPickupRange=(leader.permanent.pickup||0)+level(party,'team_pickup')*45;
 leader.motionX=leader.motionY=other.motionX=other.motionY=0;other.tacticClock=0;other.returning=false;other.followBoost=1;return true;
}
function recompute(party,m){const d=m.base,b=m.permanent,old=m.maxHp,u=id=>level(party,id),prefix=m.classId;
 m.maxHp=(d.hp+(b.health||0))*(1+u('team_health')*.12)+u('reserve_health')*4;m.hp=m.incapacitated>0?0:clamp(m.hp+Math.max(0,m.maxHp-old),0,m.maxHp);
 const power=u(prefix==='warrior'?'':prefix==='archer'?'archer_precision':prefix==='mage'?'mage_potency':prefix==='cleric'?'cleric_sacred':'');
 m.damage=d.damage*(1+power*(prefix==='cleric'?.08:prefix==='archer'?.08:prefix==='mage'?.10:.18)+(isProtagonist(prefix)?u('traveler_amplifier')*.08:0)+u('reserve_power')*.02+(prefix==='warrior'?(u('warrior_mastery')?u('warrior_mastery')*.10:u('warrior_edge')*.18)+u('warrior_heavy')*.05:0));
 m.rate=d.rate*(b.rate||1)*(1+u(prefix==='archer'?'archer_cadence':prefix==='mage'?'mage_concentration':prefix==='assassin'?'assassin_speed':prefix==='lancer'?'lancer_speed':'')*(prefix==='assassin'?.16:prefix==='archer'||prefix==='mage'?.06:.14)+u('reserve_haste')*.01+(prefix==='warrior'?u('warrior_fury')*.05:0));
 m.speed=d.speed*(b.speed||1)*(1+u('team_speed')*.05);m.range=d.range*(prefix==='archer'?1+u('archer_hawk')*.04:1)+(prefix==='lancer'?u('lancer_range')*32:0);m.crit=prefix==='archer'?clamp(d.crit+u('archer_hawk')*.02,0,ARCHER_CONFIG.criticalCap):d.crit;m.critMultiplier=2+(prefix==='assassin'?u('assassin_crit')*.35:0);m.armor=Math.min(.60,d.armor+(prefix==='defender'?u('defender_armor')*.05:prefix==='warrior'?u('warrior_armor')*.03:0));
 if(m.partyIndex===0){m.labPickupRange=(b.pickup||0)+u('team_pickup')*45;const c=m.combat;if(c){const max=(c.manaBase||100)+(c.manaPermanentBonus||0)+u('team_mana')*20;c.mana=Math.min(max,c.mana+Math.max(0,max-c.manaMax));c.manaMax=max;c.manaMutationBonus=u('team_mana')*20}}
}
function eligible(party,d){if(!d||d.owner==='warrior'&&!WARRIOR_SKILLS.some(skill=>skill.id===d.id)||d.owner==='archer'&&!ARCHER_SKILLS.some(skill=>skill.id===d.id)||d.owner==='mage'&&!MAGE_SKILLS.some(skill=>skill.id===d.id)||d.owner==='cleric'&&!CLERIC_SKILLS.some(skill=>skill.id===d.id)||d.owner==='traveler'&&!TRAVELER_SKILLS.some(skill=>skill.id===d.id))return false;const allowed=d.owner==='universal'||d.owner==='synergy'&&d.requires.every(id=>has(party,id))||has(party,d.owner);if(!allowed||level(party,d.id)>=d.max)return false;if(d.category==='supply')return true;return level(party,d.id)>0||freeSlots(party,d.category)>0}
function offers(party,teamLevel,random=party.rng){party.teamLevel=teamLevel;let pool=UPGRADES.filter(d=>eligible(party,d));if(pool.length<3)pool=pool.concat(RESERVES.filter(d=>eligible(party,d)));if(pool.length<3)pool=pool.concat(SUPPLIES);const result=[];for(const id of party.classIds)party.offerAge[id]++;
 const overdue=party.classIds.filter(id=>party.offerAge[id]>=4&&pool.some(d=>d.owner===id)).sort((a,b)=>party.offerAge[b]-party.offerAge[a]);if(overdue.length){const own=pool.filter(d=>d.owner===overdue[0]),pick=own[Math.min(own.length-1,Math.floor(random()*own.length))];result.push(pick);pool.splice(pool.indexOf(pick),1)}
 while(result.length<3&&pool.length){let total=0;for(const d of pool)total+=d.owner==='universal'?.8:d.owner==='synergy'?1.15:1+(party.offerAge[d.owner]||0)*.55;let r=random()*total,index=0;for(;index<pool.length-1;index++){const d=pool[index];r-=d.owner==='universal'?.8:d.owner==='synergy'?1.15:1+(party.offerAge[d.owner]||0)*.55;if(r<0)break}result.push(pool.splice(index,1)[0])}
 for(const d of result)if(party.offerAge[d.owner]!==undefined)party.offerAge[d.owner]=0;party.offers=result;return result;
}
function apply(party,id){const d=BY_UPGRADE[id];if(!d||!eligible(party,d))return false;
 if(d.category==='supply'){for(const m of party.members){if(m.incapacitated>0||id!=='supply_team'&&m.partyIndex!==0)continue;if(id==='supply_guard')m.shield+=12;else{const desired=m.maxHp*(id==='supply_team'?.08:.20),restored=heal(party,m,desired);if(restored<desired)m.shield+=id==='supply_team'?3:8}}return true}
 if(!level(party,id))ensureLoadout(party)[d.category].push(id);party.levels[id]=level(party,id)+1;for(const m of party.members)recompute(party,m);return true}
function upgradePreview(party,id){const d=BY_UPGRADE[id],n=level(party,id),m=party.members.find(a=>a.classId===d.owner),fmt=x=>Number(x.toFixed(1)),step=(label,a,b,suffix='')=>label+': '+fmt(a)+suffix+' → '+fmt(b)+suffix;
 if(d.owner==='cleric'&&d.category){const at=Math.min(n,4);if(id==='cleric_regen'){const t=REGEN_LEVELS[at];return 'Radio '+t.radius+' · cura '+Number((t.heal*100).toFixed(1))+'% de vida máxima cada 3 s · recibe Bendición Divina'}if(id==='cleric_hammer'){const t=HAMMER_LEVELS[at];return t.count+' martillo(s) · '+Math.round(t.damage*100)+'% cada uno · radio 90 · 7 s · máximo 2 impactos por enemigo'}if(id==='cleric_purify'){const t=PURIFY_LEVELS[at];return 'Radio '+t.radius+' · '+Math.round(t.dps*100)+'% de daño cada 1 s · elimina veneno · duración 4 s / recarga 10 s'}if(id==='cleric_guardian')return 'Escudo del '+Math.round(GUARDIAN_LEVELS[at]*100)+'% de vida máxima · 1 aliado por debajo del 40% · duración 5 s / recarga 16 s';if(id==='cleric_divine')return 'Curación realizada: +'+n*10+'% → +'+(n+1)*10+'% · automática, Plegaria y aura';if(id==='cleric_faith')return 'Escudos propios: +'+n*8+'% → +'+(n+1)*8+'% · Plegaria y Ángel · duración sin cambios';if(id==='cleric_sacred')return 'Daño sagrado base: +'+n*8+'% → +'+(n+1)*8+'% · no aumenta curaciones ni escudos'}
 if(d.owner==='mage'&&d.category){const at=Math.min(n,4),range=mageRangeMultiplier(party);if(id==='mage_orbits'){const t=ARCANE_ORBIT_LEVELS[at];return t.count+' orbe(s) · '+Math.round(t.damage*100)+'% · radio orbital '+fmt(t.radius*range)+' · velocidad '+Math.round(t.speed*100)+'% · 0,7 s por enemigo'}if(id==='mage_meteors'){const t=METEOR_LEVELS[at];return t.count+' meteoritos · '+Math.round(t.damage*100)+'% cada uno · 8 s · explosión 85 · selección '+fmt(550*range)+' · máximo 2 impactos por enemigo'}if(id==='mage_lightning'){const t=LIGHTNING_LEVELS[at];return t.targets+' objetivos únicos · '+Math.round(t.damage*100)+'% · 5 s · selección '+fmt(480*range)+' · salto máximo 200'}if(id==='mage_gravity'){const t=GRAVITY_LEVELS[at];return 'Radio '+t.radius+' · '+Math.round(t.dps*100)+'% de daño/s · ralentiza '+Math.round(t.slow*100)+'% · 3 s / recarga 9 s · selección '+fmt(500*range)}if(id==='mage_potency')return 'Daño base adicional: +'+n*10+'% → +'+(n+1)*10+'%';if(id==='mage_concentration')return 'Frecuencia básica adicional: +'+n*6+'% → +'+(n+1)*6+'%';if(id==='mage_resonance')return 'Alcance adquirido: +'+n*4+'% → +'+(n+1)*4+'%; recorrido orbital y selección. Áreas y Orbe de Ruptura sin cambios.'}
 if(d.owner==='archer'&&d.category){const at=Math.min(n,4);if(id==='archer_multi'){const t=MULTI_LEVELS[at];return t.count+' flechas · '+Math.round(t.damage*100)+'% cada una · máximo 2 impactos por objetivo/descarga'}if(id==='archer_explosive'){const t=EXPLOSIVE_LEVELS[at];return 'Una flecha cada '+t.interval+' s · radio '+t.radius+' · '+Math.round(t.damage*100)+'% de explosión'}if(id==='archer_rain'){const t=RAIN_LEVELS[at];return t.count+' flechas · '+Math.round(t.damage*100)+'% por impacto · '+t.cooldown+' s · radio 170 · máximo 2 impactos por enemigo'}if(id==='archer_bounce'){const t=BOUNCE_LEVELS[at];return t.targets+' objetivos diferentes · '+Math.round(t.damage*100)+'% por impacto · 5 s · saltos de hasta 210'}if(id==='archer_precision')return 'Daño base adicional: +'+n*8+'% → +'+(n+1)*8+'%';if(id==='archer_cadence')return 'Frecuencia básica adicional: +'+n*6+'% → +'+(n+1)*6+'%';if(id==='archer_hawk')return 'Autoataque: alcance +'+(n+1)*4+'% · crítico +'+(n+1)*2+' puntos porcentuales'}
 if(d.owner==='warrior'&&d.category){const at=Math.min(n,4);if(id==='warrior_orbit'){const t=ORBIT_LEVELS[at];return t.count+' espada(s) · '+Math.round(t.damage*100)+'% de daño · radio '+t.radius+' · velocidad '+Math.round(t.speed*100)+'% · intervalo por enemigo 0,6 s'}if(id==='warrior_wave'){const t=WAVE_LEVELS[at];return Math.round(t.damage*100)+'% de daño · '+t.cooldown+' s · '+t.hits+' objetivo(s) · anchura '+Math.round(t.width*100)+'% · alcance 450'}if(id==='warrior_quake'){const t=QUAKE_LEVELS[at];return 'Radio '+t.radius+' · '+Math.round(t.damage*100)+'% de daño · recarga 7 s'}if(id==='warrior_ghost'){const t=GHOST_LEVELS[at];return '1 espada · '+Math.round(t.damage*100)+'% de daño · '+t.interval+' s · hasta '+t.hits+' objetivo(s)'}if(id==='warrior_mastery')return 'Daño base adicional: +'+n*10+'% → +'+(n+1)*10+'%';if(id==='warrior_fury')return 'Frecuencia básica adicional: +'+n*5+'% → +'+(n+1)*5+'%';if(id==='warrior_armor')return 'Resistencia adicional: +'+n*3+' → +'+(n+1)*3+' puntos porcentuales'}
 if(d.category==='supply')return d.effect;
 if(id==='team_health')return 'Vida máxima del equipo +12% de la base.';
 if(id==='team_speed')return step('Velocidad',party.members[0].speed,party.members[0].base.speed*(party.members[0].permanent.speed||1)*(1+(n+1)*.05));
 if(id==='team_mana')return step('Reserva máxima',party.members[0].combat.manaMax,party.members[0].combat.manaMax+20,' MP');
 if(id==='team_pickup')return step('Atracción adicional',party.members[0].labPickupRange,party.members[0].labPickupRange+45);
 if(id==='flaming_arrows')return step('Daño de explosión',35+n*20,35+(n+1)*20,'% de flecha');
 if(id==='reserve_power')return step('Daño adicional',n*2,(n+1)*2,'%');if(id==='reserve_health')return 'Cada héroe gana 4 PV máximos.';if(id==='reserve_haste')return step('Frecuencia adicional',n,n+1,'%');
 if(!m)return d.effect;const c=m.classId;
 if(['warrior_edge','archer_aim','mage_power','cleric_light','warrior_heavy'].includes(id))return step('Daño',m.damage*m.damageBonus,(m.damage+m.base.damage*(id==='warrior_heavy'?.05:c==='cleric'?.20:.18))*m.damageBonus);
 if(['archer_speed','mage_focus','assassin_speed','lancer_speed'].includes(id))return step('Ataques/s',m.rate,m.rate+m.base.rate*(m.permanent.rate||1)*(c==='assassin'?.16:.14));
 if(id==='warrior_arc')return step('Arco total',(m.base.arc+n*.14)*360/Math.PI,(m.base.arc+(n+1)*.14)*360/Math.PI,'°');
 if(id==='warrior_heavy')return step('Retroceso',12+n*28,12+(n+1)*28);
 if(id==='archer_pierce'||id==='lancer_pierce')return step('Enemigos alcanzados',1+n,2+n);
 if(id==='mage_blast')return step('Radio de explosión',n?70+n*15:0,70+(n+1)*15);
 if(id==='cleric_bless')return step('Curación cada 2,6 s',8+n*5,8+(n+1)*5,' PV');
 if(id==='cleric_aura')return step('Escudo cada 12 s',n*10,(n+1)*10,' PV');
 if(id==='assassin_crit')return step('Multiplicador crítico',m.critMultiplier,m.critMultiplier+.35,'×');
 if(id==='assassin_wound')return step('Sangrado/s durante 3 s',m.damage*.16*n,m.damage*.16*(n+1));
 if(id==='defender_armor')return step('Resistencia',m.armor*100,Math.min(.6,m.armor+.05)*100,'%');
 if(id==='defender_impact')return step('Retroceso',45+n*32,45+(n+1)*32);
 if(id==='defender_guard')return step('Reducción próxima',n*4,(n+1)*4,'%');
 if(id==='lancer_range')return step('Alcance',m.range,m.range+32);return d.effect;
}
function hostileTouches(m,shot){const dx=m.x-shot.x,dy=m.y-shot.y,d=Math.hypot(dx,dy);if(shot.kind!=='arc')return d<m.bodyRadius+(shot.r||6);const angle=Math.atan2(dy,dx)-Math.atan2(shot.dy,shot.dx);return Math.abs(d-(shot.arcRadius||0))<=m.bodyRadius+(shot.r||6)&&Math.abs(Math.atan2(Math.sin(angle),Math.cos(angle)))<=(shot.arcHalfAngle||1.04)}
function bossTouches(m,e,ctx){const dx=m.x-e.x,dy=m.y-e.y,d=Math.hypot(dx,dy);if(d<ctx.radius(e)+m.bodyRadius)return true;if(!e.hybridBoss)return false;if(e.bossRuptureAge>=0&&e.bossRuptureAge<.20&&(m.x-e.bossRuptureX)**2+(m.y-e.bossRuptureY)**2<(e.bossRuptureRadius+m.bodyRadius)**2)return true;if(e.bossAction!=='sweep'||e.bossActionTime<.20||e.bossActionTime>.45||d>(e.bossReach||520)+m.bodyRadius)return false;const a=Math.atan2(dy,dx)-e.bossAim;return Math.abs(Math.atan2(Math.sin(a),Math.cos(a)))<=(e.bossSweepHalf||1.45)+Math.asin(Math.min(1,(m.bodyRadius+15)/(d||1)))}
function effect(party,kind,x,y,angle=0,size=1,color='#e5d29c',life=.32){const f=party.effects[party.effectCursor++%party.effects.length];Object.assign(f,{kind,x,y,angle,size,color,life,duration:life,basicClass:null});return f}
function nearest(m,enemies,ctx,party,range=m.range){let best=null,score=Infinity;for(let i=0;i<enemies.length;i++){const e=enemies[i];if(!alive(e))continue;const dx=e.x-m.x,dy=e.y-m.y,d=dx*dx+dy*dy;if(d>(range+ctx.radius(e))**2)continue;let value=d;if(m.classId==='defender'){const p=party.members[0];value=d*.35+((e.x-p.x)**2+(e.y-p.y)**2)*.65}if(value<score&&!ctx.lineBlocked(m.x,m.y,e.x,e.y)){best=e;score=value}}return best}
function move(m,dx,dy,dt,ctx){const length=Math.hypot(dx,dy);if(length<3){m.motionX=m.motionY=0;return}let ux=dx/length,uy=dy/length,step=Math.min(length,m.speed*(m.followBoost||1)*dt),look=Math.max(45,step+12);if(ctx.blocked(m.x+ux*look,m.y+uy*look,m.bodyRadius)){
 const a=Math.atan2(uy,ux);let found=false;for(let i=0;i<6;i++){const turn=(i%2?-1:1)*m.navSide*(.65+Math.floor(i/2)*.6),x=Math.cos(a+turn),y=Math.sin(a+turn);if(!ctx.blocked(m.x+x*look,m.y+y*look,m.bodyRadius)){ux=x;uy=y;found=true;break}}if(!found){m.motionX=m.motionY=0;return}}
 const x=m.x,y=m.y;ctx.move(m,ux*step,uy*step);m.motionX=ux;m.motionY=uy;m.facingX=ux;m.facingY=uy;if(Math.hypot(m.x-x,m.y-y)<step*.18)m.stuck+=dt;else m.stuck=0;if(m.stuck>.8){m.navSide*=-1;m.stuck=0}
}
function decide(party,m,ctx){const leader=party.members[0],fx=leader.facingX||0,fy=leader.facingY??1,side=m.partyIndex===1?-1:1,spacing=CONFIG.formationDistance,distance=Math.hypot(m.x-leader.x,m.y-leader.y);
 // Follow loosely. Distinct return/engage thresholds prevent repeated changes of direction.
 if(distance>CONFIG.companionLeash)m.returning=true;else if(distance<CONFIG.companionReturnDistance)m.returning=false;
 m.goalX=leader.x-fx*spacing-fy*spacing*.72*side;m.goalY=leader.y-fy*spacing+fx*spacing*.72*side;
 m.followBoost=distance>340?Math.max(1,leader.speed*1.2/m.speed):1;
 const e=m.returning?null:nearest(m,ctx.enemies,ctx,party,m.range+200);m.target=e;
 if(e){const dx=e.x-m.x,dy=e.y-m.y,d=Math.hypot(dx,dy)||1,fromLeader=Math.hypot(e.x-leader.x,e.y-leader.y),ranged=m.base.kind==='arrow'||m.base.kind==='arcane'||m.base.kind==='holy';
  if(ranged){const safe=m.classId==='cleric'?240:210;if(d<safe){m.goalX=m.x-dx/d*(safe-d+60);m.goalY=m.y-dy/d*(safe-d+60)}else if(d<m.range&&distance<350){m.goalX=m.x;m.goalY=m.y}}
  else if(fromLeader<CONFIG.engageDistance){const stop=m.range*.68+ctx.radius(e);m.goalX=e.x-dx/d*stop;m.goalY=e.y-dy/d*stop}
 }
 for(const ally of party.members){if(ally===m||ally.incapacitated>0)continue;let ax=m.x-ally.x,ay=m.y-ally.y,ad=Math.hypot(ax,ay);if(ad<100){if(ad<.01){ax=side;ay=1;ad=Math.SQRT2}m.goalX+=ax/ad*(100-ad);m.goalY+=ay/ad*(100-ad)}}
 const gx=m.goalX-leader.x,gy=m.goalY-leader.y,d=Math.hypot(gx,gy);if(d>CONFIG.companionLeash){m.goalX=leader.x+gx/d*CONFIG.companionLeash;m.goalY=leader.y+gy/d*CONFIG.companionLeash}
}

function segmentDistance(x,y,ax,ay,bx,by){
 const dx=bx-ax,dy=by-ay,t=clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1),0,1);
 return Math.hypot(x-ax-dx*t,y-ay-dy*t);
}
function dodgeGoal(party,m,ctx){
 const threats=[],radius=m.bodyRadius,leader=party.members[0];
 const nearby=(x,y,reach)=>Math.abs(x-m.x)<reach&&Math.abs(y-m.y)<reach;
 const area=(x,y,r,weight)=>{if(nearby(x,y,r+250))threats.push({x,y,r,weight})};
 const lane=(x,y,dx,dy,length,r,weight)=>{
  const bx=x+dx*length,by=y+dy*length;
  if(segmentDistance(m.x,m.y,x,y,bx,by)<r+250)threats.push({x,y,bx,by,r,weight});
 };
 for(const e of ctx.enemies){
  if(!alive(e)||!nearby(e.x,e.y,1140))continue;
  const body=ctx.radius(e)+radius;
  if(e.spearState==='windup'||e.spearState==='dash')lane(e.x,e.y,e.spearDirX,e.spearDirY,e.spearState==='dash'?(e.spearDashDistance||0):(ctx.lancerReach||690),body+24,6);
  const action=e.bossAction;
  if(action==='windupLunge'||action==='dash')lane(e.x,e.y,Math.cos(e.bossAim),Math.sin(e.bossAim),action==='dash'?e.bossDashRemaining:820,body+26,7);
  if(action==='windupSlam'||action==='slam')area(e.x,e.y,(e.bossSlamRadius||360)+radius,7);
  if(action==='windupSweep'||action==='sweep'){
   const r=(e.bossReach||520)+radius;
   if(nearby(e.x,e.y,r+250))threats.push({x:e.x,y:e.y,r,aim:e.bossAim,half:(e.bossSweepHalf||1.45)+.19,weight:7});
  }
  const padding=e.meleePulse>0?45:25;
  if(!e.paralysisRemaining)lane(e.x,e.y,e.facingX||0,e.facingY||0,Math.min(75,(e.speed||0)*.24),body+padding,2.5);
 }
 for(const h of ctx.hazards||[])if(h.phase==='active'||h.phase==='warning')area(h.x,h.y,h.radius+radius*.45,5);
 for(const pool of ctx.slimeTrails||[])if(pool.remaining>0)lane(pool.ax,pool.ay,pool.bx-pool.ax,pool.by-pool.ay,1,pool.r+radius,4);
 for(const shot of ctx.hostileProjectiles||[]){
  if(!(shot.life>0))continue;
  const travel=(shot.speed||0)*Math.min(.56,shot.life);
  if(shot.kind==='arc'){
   // Sample the moving crescent rather than treating its whole circle as solid.
   const heading=Math.atan2(shot.dy,shot.dx),half=shot.arcHalfAngle||1;
   for(let i=-2;i<=2;i++){
    const angle=heading+i*half*.5,reach=shot.arcRadius||30,edge=Math.min(148,reach+travel*.24);
    lane(shot.x+Math.cos(angle)*reach,shot.y+Math.sin(angle)*reach,
     shot.dx*travel+Math.cos(angle)*(edge-reach),shot.dy*travel+Math.sin(angle)*(edge-reach),1,radius+(shot.r||6)+18,5);
   }
  }else lane(shot.x,shot.y,shot.dx||0,shot.dy||0,travel,radius+(shot.r||6)+21,6);
 }
 if(!threats.length)return null;
 const risk=(x,y)=>{
  let score=0;
  for(const t of threats){
   const dx=x-t.x,dy=y-t.y,d=t.bx===undefined?Math.hypot(dx,dy):segmentDistance(x,y,t.x,t.y,t.bx,t.by);
   if(d>=t.r)continue;
   if(t.aim!==undefined){
    const angle=Math.atan2(dy,dx)-t.aim;
    if(Math.abs(Math.atan2(Math.sin(angle),Math.cos(angle)))>t.half)continue;
   }
   score+=t.weight*(.4+.6*(1-d/t.r));
  }
  return score;
 };
 const angle=Math.atan2(m.goalY-m.y,m.goalX-m.x),travel=Math.min(132,Math.hypot(m.goalX-m.x,m.goalY-m.y));
 const safe=risk(m.x,m.y),forward=risk(m.x+Math.cos(angle)*travel,m.y+Math.sin(angle)*travel);
 if(!safe&&!forward)return null;
 let best= safe? safe*1.55:.6,point=null;
 for(let i=0;i<8;i++){
  const direction=angle+(i===7?Math.PI:(i%2?-1:1)*Math.ceil(i/2)*Math.PI/4);
  const dx=Math.cos(direction)*132,dy=Math.sin(direction)*132,x=m.x+dx,y=m.y+dy;
  if(ctx.blocked(x,y,radius)||ctx.blocked(m.x+dx*.5,m.y+dy*.5,radius)||ctx.lineBlocked(m.x,m.y,x,y))continue;
  const leash=Math.max(0,Math.hypot(x-leader.x,y-leader.y)-CONFIG.companionLeash);
  const score=risk(x,y)+.45*risk(m.x+dx*.5,m.y+dy*.5)+leash/1400+(1-Math.cos(direction-angle))*.2;
  if(score<best){point={x,y};best=score}
 }
 return point?{...point,evading:true}:{x:m.x,y:m.y,evading:false};
}

function incoming(party,m,n){let reduction=m.armor||0;for(const a of party.members)if(a.classId==='defender'&&a.incapacitated<=0&&Math.hypot(a.x-m.x,a.y-m.y)<290)reduction+=level(party,'defender_guard')*.04;n*=1-Math.min(.72,reduction);const absorb=Math.min(shieldValue(m),n);m.shield=Math.max(0,(m.shield||0)-absorb);m.guardianShield=Math.max(0,(m.guardianShield||0)-absorb);return Math.max(0,n-absorb)}
function hurt(party,m,n){if(m.incapacitated>0||n<=0)return;const hit=incoming(party,m,n)*(1-(m.permanent.armor||0));m.hp=Math.max(0,m.hp-hit);m.hurtTime=.22;if(m.hp<=0&&m.isCompanion){m.incapacitated=1;clearExistingPoison(m);m.target=null;m.motionX=m.motionY=0;m.attackTime=0;m.shield=0;m.guardianShield=0;m.guardianRemaining=0;effect(party,'down',m.x,m.y,0,70,'#a99386',.55)}}
function enemyTarget(party,enemy,leader){
 let target=leader,best=(leader.x-enemy.x)**2+(leader.y-enemy.y)**2;
 for(const m of party?.members||[]){if(m===leader||m.incapacitated>0||m.hp<=0)continue;const distance=(m.x-enemy.x)**2+(m.y-enemy.y)**2;if(distance<best){target=m;best=distance}}
 return target;
}
function reviveTarget(party){
 const leader=party.members[0];if(leader.hp<=0||leader.combat?.dash.active)return null;
 let target=null,best=Infinity;
 for(const m of party.members){const distance=(m.x-leader.x)**2+(m.y-leader.y)**2;if(m.incapacitated>0&&distance<=m.bodyRadius**2&&distance<best){target=m;best=distance}}
 return target;
}
function startRevive(party){
 if(party.revive)return false;
 const target=reviveTarget(party);if(!target)return false;
 const leader=party.members[0];party.revive={target,classId:leader.classId,x:leader.x,y:leader.y,elapsed:0};return true;
}
function advanceRevive(party,dt){
 const r=party.revive;if(!r)return;
 const leader=party.members[0],m=r.target;
 if(leader.hp<=0||leader.classId!==r.classId||leader.combat?.dash.active||Math.hypot(leader.motionX||0,leader.motionY||0)>.02||Math.hypot(leader.x-r.x,leader.y-r.y)>.01||m.incapacitated<=0||Math.hypot(leader.x-m.x,leader.y-m.y)>m.bodyRadius){party.revive=null;return}
 r.elapsed+=dt;if(r.elapsed+1e-9<CONFIG.reviveSeconds)return;
 party.revive=null;m.incapacitated=0;m.hp=m.maxHp*.5;m.contactClock=1.5;m.hurtTime=0;m.tacticClock=0;effect(party,'heal',m.x,m.y,0,65,'#d2e5a2',.6);
}
function reviveProgress(party,m){return party.revive?.target===m?Math.min(1,party.revive.elapsed/CONFIG.reviveSeconds):0}
function heal(party,m,amount,source){if(m.incapacitated>0)return 0;const n=Math.min(amount,m.maxHp-m.hp);if(n>0){m.hp+=n;if(source)source.healingDone+=n;effect(party,'heal',m.x,m.y,0,50,'#d2e5a2',.5)}return n}
function strike(party,m,e,multiplier,ctx,criticalChance=m.crit){const critical=party.rng()<criticalChance,n=m.damage*multiplier*(critical?m.critMultiplier:1);ctx.hit(e,n,m);m.damageDealt+=n;
 if(m.classId==='assassin'&&level(party,'assassin_wound')){e.rpgBleedRemaining=3;e.rpgBleedDps=m.damage*.16*level(party,'assassin_wound');e.rpgBleedOwner=m}
 const push=m.classId==='defender'?45+level(party,'defender_impact')*32:m.classId==='warrior'?12+level(party,'warrior_heavy')*28:0;
 if(push&&alive(e)){const dx=e.x-m.x,dy=e.y-m.y,d=Math.hypot(dx,dy)||1;ctx.push(e,dx/d*push*(e.isBoss?.15:1),dy/d*push*(e.isBoss?.15:1))}
}
function blast(party,m,x,y,radius,multiplier,ctx,color){effect(party,'blast',x,y,0,radius,color,.38);for(let i=ctx.enemies.length-1;i>=0&&ctx.playing;i--){const e=ctx.enemies[i];if(alive(e)&&(e.x-x)**2+(e.y-y)**2<=(radius+ctx.radius(e))**2&&!ctx.lineBlocked(x,y,e.x,e.y))strike(party,m,e,multiplier,ctx)}}
function attack(party,m,target,ctx){const a=Math.atan2(target.y-m.y,target.x-m.x);m.attackAngle=a;m.attackTime=m.attackDuration;m.facingX=Math.cos(a);m.facingY=Math.sin(a);
 if(isProtagonist(m.classId)){const shot=openSkillShot(party);if(shot){launchSkillShot(shot,m,a,'traveler_note',700,m.range,13,1,1);effect(party,'travelerNote',m.x,m.y,a,65,'#dba4ff',.25)}return}
 if(m.classId==='archer'){archerBasicAttack(party,m,a,ctx);return}
 if(['arrow','arcane','holy'].includes(m.base.kind)){
  let shot=null;for(let i=0;i<party.projectiles.length;i++){const at=(party.shotCursor+i)%party.projectiles.length;if(!party.projectiles[at].active){shot=party.projectiles[at];party.shotCursor=(at+1)%party.projectiles.length;break}}if(!shot)return;
  const fire=m.classId==='archer'&&level(party,'flaming_arrows')>0&&party.enchantRemaining>0;Object.assign(shot,{active:true,x:m.x,y:m.y,prevX:m.x,prevY:m.y,vx:Math.cos(a)*(m.classId==='archer'?820:660),vy:Math.sin(a)*(m.classId==='archer'?820:660),angle:a,remaining:m.range,owner:m,kind:fire?'firearrow':m.base.kind,r:m.classId==='archer'?7:11,maxHits:1+(m.classId==='archer'?level(party,'archer_pierce'):0),hitCount:0,fire,damageMultiplier:1,explosionRadius:0,explosionMultiplier:0});resetArcherShot(shot);shot.hits.fill(null);return;
 }
 const ux=Math.cos(a),uy=Math.sin(a),half=m.base.arc+(m.classId==='warrior'?level(party,'warrior_arc')*.14:0),isLine=m.classId==='lancer',limit=isLine?1+level(party,'lancer_pierce'):12;let count=0;
 for(const e of ctx.enemies){if(!alive(e))continue;const dx=e.x-m.x,dy=e.y-m.y,dist=Math.hypot(dx,dy),radius=ctx.radius(e);if(dist>m.range+radius||ctx.lineBlocked(m.x,m.y,e.x,e.y))continue;const forward=dx*ux+dy*uy,side=dx*uy-dy*ux;if(isLine?(forward<0||Math.abs(side)>28+radius):Math.abs(Math.atan2(Math.sin(Math.atan2(dy,dx)-a),Math.cos(Math.atan2(dy,dx)-a)))>half)continue;let at=count;while(at>0&&m.hitDistances[at-1]>dist)at--;if(at>=12)continue;for(let j=Math.min(count,11);j>at;j--){m.hitTargets[j]=m.hitTargets[j-1];m.hitDistances[j]=m.hitDistances[j-1]}m.hitTargets[at]=e;m.hitDistances[at]=dist;count=Math.min(12,count+1)}
 for(let i=0;i<Math.min(limit,count)&&ctx.playing;i++){const e=m.hitTargets[i];if(alive(e))strike(party,m,e,1,ctx)}
 effect(party,isLine?'thrust':m.classId==='defender'?'shield':'slash',m.x,m.y,a,m.range,m.base.color,m.attackDuration).basicClass=isProtagonist(m.classId)?null:m.classId;
}
function projectiles(party,dt,ctx){for(const s of party.projectiles){if(!s.active)continue;if(s.kind==='crescent'&&(s.owner.incapacitated>0||s.owner.hp<=0)){retireShot(s);continue}const speed=Math.hypot(s.vx,s.vy),travel=Math.min(s.remaining,speed*dt),fraction=travel/speed,nx=s.x+s.vx*fraction,ny=s.y+s.vy*fraction;s.prevX=s.x;s.prevY=s.y;
 if(s.kind==='crescent'&&ctx.blocked(nx,ny,s.r)||ctx.lineBlocked(s.x,s.y,nx,ny)){retireShot(s);continue}s.x=nx;s.y=ny;s.remaining-=travel;
 for(let i=ctx.enemies.length-1;i>=0&&s.active&&ctx.playing;i--){const e=ctx.enemies[i];if(!alive(e)||s.hits.includes(e))continue;const dx=s.x-s.prevX,dy=s.y-s.prevY,length=dx*dx+dy*dy,t=length?clamp(((e.x-s.prevX)*dx+(e.y-s.prevY)*dy)/length,0,1):0,x=s.prevX+dx*t,y=s.prevY+dy*t;if((e.x-x)**2+(e.y-y)**2>(ctx.radius(e)+s.r)**2)continue;
  s.hits[s.hitCount++]=e;
  if(s.archerBasic){if(volleyAllows(s.volley,e)){volleyRecord(s.volley,e);strike(party,s.owner,e,s.damageMultiplier||1,ctx,s.criticalChance??s.owner.crit)}if(s.burstRadius>0&&!s.burstSpent){s.burstSpent=true;archerExplosion(party,s.owner,x,y,s.burstRadius,s.burstMultiplier,s.volley,ctx,s.fire)}}
  else{strike(party,s.owner,e,s.damageMultiplier||1,ctx,s.criticalChance??s.owner.crit);
   if(s.explosionRadius>0)blast(party,s.owner,x,y,s.explosionRadius,s.explosionMultiplier,ctx,'#c0a5ff');
   if(s.kind==='arcane'&&level(party,'mage_blast'))blast(party,s.owner,x,y,70+15*level(party,'mage_blast'),.25+.1*level(party,'mage_blast'),ctx,'#a69fe8');
   if(s.fire)blast(party,s.owner,x,y,80+12*level(party,'flaming_arrows'),.35+.2*level(party,'flaming_arrows'),ctx,'#ff9b45');
  }
  if(s.hitCount>=s.maxHits)retireShot(s);
 }
 if(s.remaining<=0)retireShot(s);
}}
function canUseAbility(party,ctx){const m=party?.members[0],skill=UNIQUE_ABILITIES[m?.classId];return !!(ctx.playing&&skill&&m.hp>0&&m.incapacitated<=0&&m.uniqueCooldown<=0&&m.combat?.mana>=skill.cost)}
function launchSkillShot(shot,m,a,kind,speed,range,r,multiplier,maxHits,explosionRadius=0,explosionMultiplier=0){Object.assign(shot,{active:true,x:m.x,y:m.y,prevX:m.x,prevY:m.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,angle:a,remaining:range,owner:m,kind,r,maxHits:Math.min(8,maxHits),hitCount:0,fire:false,damageMultiplier:multiplier,explosionRadius,explosionMultiplier});resetArcherShot(shot);shot.hits.fill(null)}
function advanceTravelerSkills(party,dt,ctx){const m=party.members.find(member=>isProtagonist(member.classId));if(!m||m.incapacitated>0)return;const battery=level(party,'traveler_battery'),clockScale=1+battery*.05,state=party.traveler;state.radioClock=Math.max(0,state.radioClock-dt);state.noteClock-=dt*clockScale;state.decoyClock-=dt*clockScale;state.feedbackClock-=dt*clockScale;
 const radio=level(party,'traveler_radio');if(radio){const radius=250*(1+level(party,'traveler_signal')*.06);if(state.radioClock<=0){state.radioClock=.5;let visuals=0;for(const e of ctx.enemies){if(!alive(e)||(e.x-m.x)**2+(e.y-m.y)**2>(radius+ctx.radius(e))**2||ctx.lineBlocked(m.x,m.y,e.x,e.y))continue;strike(party,m,e,.16*radio,ctx,0);if(visuals++<6)effect(party,'travelerHit',e.x,e.y,0,22,'#dd8bff',.2)}effect(party,'travelerRadio',m.x,m.y,0,radius,'#bd61ff',.28)}}else state.radioClock=0;
 const echo=level(party,'traveler_echo');if(echo&&state.noteClock<=0){state.noteClock=6.5;const target=nearest(m,ctx.enemies,ctx,party,m.range),a=target?Math.atan2(target.y-m.y,target.x-m.x):Math.atan2(m.facingY??1,m.facingX||0),count=Math.min(5,2+Math.floor((echo-1)/2));for(let i=0;i<count;i++){const shot=openSkillShot(party);if(!shot)break;launchSkillShot(shot,m,a+(i-(count-1)/2)*.16,'traveler_note',760,m.range,12,.75+echo*.1,1)}effect(party,'travelerBurst',m.x,m.y,a,100,'#e8b2ff',.42)}
 const decoy=level(party,'traveler_decoy');if(decoy&&state.decoyClock<=0){state.decoyClock=10;const radius=185+decoy*18;blast(party,m,m.x,m.y,radius,.45+decoy*.12,ctx,'#a773ff');for(const e of ctx.enemies){if(!alive(e)||(e.x-m.x)**2+(e.y-m.y)**2>(radius+ctx.radius(e))**2)continue;const dx=e.x-m.x,dy=e.y-m.y,d=Math.hypot(dx,dy)||1;ctx.push(e,dx/d*240,dy/d*240)}effect(party,'travelerHolo',m.x,m.y,0,radius,'#ad82ff',.65)}
 const feedback=level(party,'traveler_feedback');if(feedback&&state.feedbackClock<=0){state.feedbackClock=9.5;const radius=240;blast(party,m,m.x,m.y,radius,.7+feedback*.16,ctx,'#f486ff');for(const e of ctx.enemies){if(!alive(e)||(e.x-m.x)**2+(e.y-m.y)**2>(radius+ctx.radius(e))**2)continue;const dx=e.x-m.x,dy=e.y-m.y,d=Math.hypot(dx,dy)||1;ctx.push(e,dx/d*360,dy/d*360)}effect(party,'travelerBass',m.x,m.y,0,radius,'#ef7aff',.52)}
}
function useAbility(party,ctx){if(!canUseAbility(party,ctx))return false;const m=party.members[0],skill=UNIQUE_ABILITIES[m.classId];let target=null;
 if(['archer','mage','assassin','lancer'].includes(m.classId))target=nearest(m,ctx.enemies,ctx,party,m.classId==='archer'?CLASSES.archer.range:m.range*(m.classId==='assassin'?1.8:1));
 if(m.classId==='assassin'&&!target)return false;
 const needed=m.classId==='archer'?5:m.classId==='mage'?1:0;if(needed){let free=0;for(const shot of party.projectiles)if(!shot.active)free++;if(free<needed)return false}
 const a=target?Math.atan2(target.y-m.y,target.x-m.x):Math.atan2(m.facingY??1,m.facingX||0),ux=Math.cos(a),uy=Math.sin(a);
 m.combat.mana=Math.max(0,m.combat.mana-skill.cost);m.combat.drainedTotal=(m.combat.drainedTotal||0)+skill.cost;m.uniqueCooldown=skill.cooldown;m.attackAngle=a;m.attackTime=m.attackDuration;m.facingX=ux;m.facingY=uy;
 if(isProtagonist(m.classId)){
  ctx.sanctuary(m);
  effect(party,'travelerUlt',m.x,m.y,a,410,'#cf83ff',1);
 }
 else if(m.classId==='warrior'){blast(party,m,m.x,m.y,260,2.2,ctx,'#e9b18a');effect(party,'whirl',m.x,m.y,a,260,'#ffe0b2',.55)}
 else if(m.classId==='archer'){let n=0;for(const shot of party.projectiles){if(shot.active)continue;launchSkillShot(shot,m,a+(n-2)*.12,'arrow',950,CLASSES.archer.range*1.15,9,1.3,3+level(party,'archer_pierce'));shot.criticalChance=m.base.crit;if(++n===5)break}effect(party,'enchant',m.x,m.y,a,80,'#b5d49c',.4)}
 else if(m.classId==='mage'){const shot=party.projectiles.find(s=>!s.active);launchSkillShot(shot,m,a,'arcane',520,m.range,24,2.7,1,240,1.4);effect(party,'enchant',m.x,m.y,a,90,'#b5a2f1',.5)}
 else if(m.classId==='cleric'){ctx.sanctuary(m)}
 else if(m.classId==='assassin'){strike(party,m,target,4,ctx);target.rpgBleedRemaining=3;target.rpgBleedDps=Math.max(target.rpgBleedDps||0,m.damage*.3);target.rpgBleedOwner=m;effect(party,'slash',target.x,target.y,a,120,'#e6a0d4',.5)}
 else if(m.classId==='defender'){for(const ally of party.members)if(ally.incapacitated<=0&&Math.hypot(ally.x-m.x,ally.y-m.y)<=500){ally.shield=Math.max(ally.shield,45+ally.maxHp*.15);effect(party,'ward',ally.x,ally.y,0,90,'#9ec9e8',.7)}blast(party,m,m.x,m.y,210,1,ctx,'#9ec9e8')}
 else if(m.classId==='lancer'){const reach=m.range*1.8;for(let i=ctx.enemies.length-1;i>=0&&ctx.playing;i--){const e=ctx.enemies[i];if(!alive(e))continue;const dx=e.x-m.x,dy=e.y-m.y,forward=dx*ux+dy*uy;if(forward>=0&&forward<=reach+ctx.radius(e)&&Math.abs(dx*uy-dy*ux)<=35+ctx.radius(e)&&!ctx.lineBlocked(m.x,m.y,e.x,e.y))strike(party,m,e,3,ctx)}let visible=reach;for(let d=35;d<=reach;d+=35)if(ctx.lineBlocked(m.x,m.y,m.x+ux*d,m.y+uy*d)){visible=Math.max(0,d-35);break}effect(party,'thrust',m.x,m.y,a,visible,'#f1d4a8',.5)}
 return true;
}
// All persistent learned entities are allocated with the party, never on each attack/frame.
function warriorMember(party){for(const m of party.members)if(m.classId==='warrior')return m;return null}
function sweptNear(ax,ay,bx,by,e,r){const dx=bx-ax,dy=by-ay,len=dx*dx+dy*dy,t=len?clamp(((e.x-ax)*dx+(e.y-ay)*dy)/len,0,1):0;return (e.x-ax-dx*t)**2+(e.y-ay-dy*t)**2<=r*r}
function openSkillShot(party){for(let i=0;i<party.projectiles.length;i++){const at=(party.shotCursor+i)%party.projectiles.length,s=party.projectiles[at];if(!s.active){party.shotCursor=(at+1)%party.projectiles.length;return s}}return null}
function quakeCast(party,m,spec,ctx){const f=party.warrior.quake;f.life=f.duration;f.x=m.x;f.y=m.y;f.radius=spec.radius;f.serial++;
 // Clip the cached decal and shock ring to the same obstacles as their damage.
 for(let j=0;j<f.rays.length;j++){const a=j/f.rays.length*TAU,ux=Math.cos(a),uy=Math.sin(a);let lo=0,hi=spec.radius;if(!ctx.lineBlocked(m.x,m.y,m.x+ux*hi,m.y+uy*hi))lo=hi;else for(let k=0;k<7;k++){const mid=(lo+hi)/2;if(ctx.lineBlocked(m.x,m.y,m.x+ux*mid,m.y+uy*mid))hi=mid;else lo=mid}f.rays[j]=lo}
 for(let i=ctx.enemies.length-1;i>=0&&ctx.playing;i--){const e=ctx.enemies[i];if(!alive(e)||Math.hypot(e.x-m.x,e.y-m.y)>spec.radius+ctx.radius(e)||ctx.lineBlocked(m.x,m.y,e.x,e.y))continue;strike(party,m,e,spec.damage,ctx);if(alive(e)){const dx=e.x-m.x,dy=e.y-m.y,d=Math.hypot(dx,dy)||1,push=e.isBoss||e.hybridBoss?6:40;ctx.push(e,dx/d*push,dy/d*push)}}
}
function ghostTarget(g,m,ctx){let best=null,score=Infinity;for(const e of ctx.enemies){if(!alive(e)||g.visited.includes(e)||Math.hypot(e.x-m.x,e.y-m.y)>320+ctx.radius(e)||ctx.lineBlocked(m.x,m.y,e.x,e.y)||ctx.lineBlocked(g.x,g.y,e.x,e.y))continue;const d=(e.x-g.x)**2+(e.y-g.y)**2;if(d<score){score=d;best=e}}return best}
function ghostMove(g,x,y,speed,dt,ctx){const dx=x-g.x,dy=y-g.y,d=Math.hypot(dx,dy);if(d<.01)return true;const step=Math.min(d,speed*dt),nx=g.x+dx/d*step,ny=g.y+dy/d*step;if(ctx.blocked(nx,ny,8)||ctx.lineBlocked(g.x,g.y,nx,ny))return false;g.angle=Math.atan2(dy,dx)+Math.PI/2;g.x=nx;g.y=ny;return true}
function advanceGhost(party,m,spec,dt,ctx){const g=party.warrior.ghost;let homeX=m.x+Math.cos(party.time*.85)*45,homeY=m.y-65;if(ctx.blocked(homeX,homeY,8)||ctx.lineBlocked(m.x,m.y,homeX,homeY)){homeX=m.x;homeY=m.y}
 if(!g.initialized){g.x=homeX;g.y=homeY;g.initialized=true;g.trail.fill(0)}g.visible=true;g.prevX=g.x;g.prevY=g.y;g.clock=Math.max(0,g.clock-dt);
 if(g.phase==='idle'){if(!ghostMove(g,homeX,homeY,640,dt,ctx)){g.visible=false;g.initialized=false;return}g.angle=Math.sin(party.time*1.5)*.12;if(g.clock<=0){g.visited.fill(null);g.hitCount=0;g.target=ghostTarget(g,m,ctx);if(g.target){g.phase='outbound';g.clock=spec.interval}else g.clock=.18}}
 else if(g.phase==='outbound'){const e=g.target;if(!alive(e)||Math.hypot(e.x-m.x,e.y-m.y)>420+ctx.radius(e)||ctx.lineBlocked(g.x,g.y,e.x,e.y)){g.phase='return';g.target=null}
  else if(!ghostMove(g,e.x,e.y,900,dt,ctx)){g.phase='return';g.target=null}
  else if(Math.hypot(e.x-g.x,e.y-g.y)<=ctx.radius(e)+16){g.visited[g.hitCount++]=e;strike(party,m,e,spec.damage,ctx);effect(party,'ghostHit',g.x,g.y,g.angle,55,'#90e4ff',.24);g.target=g.hitCount<spec.hits?ghostTarget(g,m,ctx):null;if(!g.target)g.phase='return'}
 }
 else if(g.phase==='return'){if(!ghostMove(g,homeX,homeY,760,dt,ctx)){g.visible=false;g.initialized=false;g.phase='idle';return}if(Math.hypot(g.x-homeX,g.y-homeY)<12){g.phase='idle';g.target=null}}
 const head=g.trailHead;g.trail[head*2]=g.prevX;g.trail[head*2+1]=g.prevY;g.trailHead=(head+1)%6;
}
function advanceWarriorSkills(party,dt,ctx){const state=party.warrior,m=warriorMember(party);if(!state)return;state.quake.life=Math.max(0,state.quake.life-dt);
 if(!m||m.hp<=0||m.incapacitated>0){for(const sword of state.orbits){sword.active=false;sword.initialized=false}suspendGhost(state.ghost);return}
 const orbitLevel=level(party,'warrior_orbit'),waveLevel=level(party,'warrior_wave'),quakeLevel=level(party,'warrior_quake'),ghostLevel=level(party,'warrior_ghost');
 state.pruneClock-=dt;if(state.pruneClock<=0){state.pruneClock=1;for(const sword of state.orbits)for(const [e,until] of sword.nextHit)if(until<party.time||!alive(e))sword.nextHit.delete(e)}
 if(orbitLevel){const spec=ORBIT_LEVELS[orbitLevel-1],previousAngle=state.orbitAngle;state.orbitAngle=(previousAngle+dt*2.4*spec.speed)%TAU;
  for(let j=0;j<3;j++){const sword=state.orbits[j];sword.active=false;if(j>=spec.count){sword.initialized=false;continue}const a=state.orbitAngle+j*TAU/spec.count,nx=m.x+Math.cos(a)*spec.radius,ny=m.y+Math.sin(a)*spec.radius;
   // Sample along the real arc so large delta steps cannot cut through a wall or enemy.
   const steps=Math.max(1,Math.min(32,Math.ceil((dt*2.4*spec.speed*spec.radius+Math.hypot(m.motionX||0,m.motionY||0)*m.speed*dt)/20))),oldX=sword.initialized?sword.x:nx,oldY=sword.initialized?sword.y:ny;let px=oldX,py=oldY,clear=true;
   for(let k=1;k<=steps;k++){const t=k/steps,angle=previousAngle+dt*2.4*spec.speed*t+j*TAU/spec.count,ownerX=m.x+(oldX-Math.cos(previousAngle+j*TAU/spec.count)*spec.radius-m.x)*(1-t),ownerY=m.y+(oldY-Math.sin(previousAngle+j*TAU/spec.count)*spec.radius-m.y)*(1-t),x=ownerX+Math.cos(angle)*spec.radius,y=ownerY+Math.sin(angle)*spec.radius;
    if(ctx.blocked(x,y,12)||ctx.blocked(x+Math.cos(angle)*40,y+Math.sin(angle)*40,6)||ctx.lineBlocked(x,y,x+Math.cos(angle)*40,y+Math.sin(angle)*40)||ctx.lineBlocked(m.x,m.y,x,y)||ctx.lineBlocked(px,py,x,y)){clear=false;break}
    for(let i=ctx.enemies.length-1;i>=0&&ctx.playing;i--){const e=ctx.enemies[i];if(!alive(e)||(sword.nextHit.get(e)||0)>party.time||!sweptNear(px,py,x,y,e,ctx.radius(e)+27)||ctx.lineBlocked(x,y,e.x,e.y))continue;strike(party,m,e,spec.damage,ctx);sword.nextHit.set(e,party.time+.6)}px=x;py=y;
   }
   sword.prevX=oldX;sword.prevY=oldY;sword.x=nx;sword.y=ny;sword.angle=a+Math.PI/2;sword.initialized=true;sword.active=clear;
  }
 }else for(const sword of state.orbits)sword.active=false;
 if(waveLevel){state.waveClock=Math.max(0,state.waveClock-dt);if(state.waveClock<=0){const shot=openSkillShot(party);if(shot){const spec=WAVE_LEVELS[waveLevel-1],e=nearest(m,ctx.enemies,ctx,party,450),a=e?Math.atan2(e.y-m.y,e.x-m.x):m.attackAngle;launchSkillShot(shot,m,a,'crescent',540,450,32*spec.width,spec.damage,spec.hits);shot.visualWidth=spec.width;state.waveClock=spec.cooldown}}}
 if(quakeLevel){state.quakeClock=Math.max(0,state.quakeClock-dt);state.quakeDetectClock=Math.max(0,state.quakeDetectClock-dt);if(state.quakeClock<=0&&state.quakeDetectClock<=0){state.quakeDetectClock=CONFIG.tacticalInterval;const spec=QUAKE_LEVELS[quakeLevel-1];if(nearest(m,ctx.enemies,ctx,party,spec.radius)){quakeCast(party,m,spec,ctx);state.quakeClock=7}}}
 if(ghostLevel)advanceGhost(party,m,GHOST_LEVELS[ghostLevel-1],dt,ctx);else suspendGhost(state.ghost);
}
function suspendGhost(g){g.visible=false;g.phase='idle';g.target=null;g.initialized=false;g.clock=Math.max(g.clock,.2)}

function archerMember(party){for(const m of party.members)if(m.classId==='archer')return m;return null}
function resetArcherShot(s){if(s.volley){s.volley.pending=Math.max(0,s.volley.pending-1);s.volley=null}s.archerBasic=false;s.archerVisual=false;s.criticalChance=null;s.burstRadius=0;s.burstMultiplier=0;s.burstSpent=false}
function retireShot(s){if(s.volley){s.volley.pending=Math.max(0,s.volley.pending-1);s.volley=null}s.active=false}
function volleyAllows(volley,e){return !volley||(volley.hits.get(e)||0)<2}
function volleyRecord(volley,e){if(volley)volley.hits.set(e,(volley.hits.get(e)||0)+1)}
function archerExplosion(party,m,x,y,radius,multiplier,volley,ctx,fire){effect(party,'archerExplosion',x,y,0,radius,fire?'#ff9b45':'#ffdd8c',.42);for(let i=ctx.enemies.length-1;i>=0&&ctx.playing;i--){const e=ctx.enemies[i];if(!alive(e)||!volleyAllows(volley,e)||(e.x-x)**2+(e.y-y)**2>(radius+ctx.radius(e))**2||ctx.lineBlocked(x,y,e.x,e.y))continue;volleyRecord(volley,e);strike(party,m,e,multiplier,ctx,m.base.crit)}}
function archerBasicAttack(party,m,a,ctx){const state=party.archer,multi=level(party,'archer_multi'),spec=multi?MULTI_LEVELS[multi-1]:null,count=spec?.count||1;let free=0;for(const s of party.projectiles)if(!s.active)free++;if(free<count)return;
 let volley=null;for(const batch of state.volleys)if(batch.pending===0){volley=batch;break}if(!volley)return;volley.hits.clear();
 const explosiveLevel=level(party,'archer_explosive'),timed=explosiveLevel&&state.explosiveClock<=0,explosive=timed?EXPLOSIVE_LEVELS[explosiveLevel-1]:null,synergy=level(party,'flaming_arrows')>0&&party.enchantRemaining>0,synergyDamage=synergy ? .35+.2*level(party,'flaming_arrows'):0;
 let burstDamage=explosive?.damage||0,burstRadius=explosive?.radius||0,fire=false;if(synergy&&(synergyDamage>burstDamage||synergyDamage===burstDamage&&80+12*level(party,'flaming_arrows')>burstRadius)){burstDamage=synergyDamage;burstRadius=80+12*level(party,'flaming_arrows');fire=true}
 const center=Math.floor(count/2);for(let i=0;i<count;i++){const index=i===0?center:i<=center?i-1:i,angle=a+(index-(count-1)/2)*.10,shot=openSkillShot(party);if(!shot)break;launchSkillShot(shot,m,angle,'arrow',820,m.range,7,spec?.damage||1,1);shot.archerBasic=true;shot.archerVisual=true;shot.criticalChance=m.crit;shot.volley=volley;volley.pending++;
  // A discharge carries at most one explosive arrow, even with both enchantments.
  if(i===0&&burstDamage>0){shot.burstMultiplier=burstDamage;shot.burstRadius=burstRadius;shot.fire=fire;shot.kind=fire?'firearrow':'arrow';if(timed)state.explosiveClock=explosive.interval}
 }
}
function archerNearest(m,ctx,range){let best=null,score=range*range;for(const e of ctx.enemies){if(!alive(e))continue;const d=(e.x-m.x)**2+(e.y-m.y)**2;if(d<=score&&!ctx.lineBlocked(m.x,m.y,e.x,e.y)){score=d;best=e}}return best}
function rainPrepare(party,m,target,spec,ctx){const r=party.archer.rain;r.active=true;r.age=0;r.x=target.x;r.y=target.y;r.originX=m.x;r.originY=m.y;r.count=spec.count;r.damage=spec.damage;r.serial++;r.hits.clear();const rotation=party.rng()*TAU;
 for(let i=0;i<10;i++){const drop=r.drops[i];drop.done=i>=spec.count;drop.life=0;drop.valid=false;if(i>=spec.count)continue;const radius=i?ARCHER_CONFIG.rainRadius*.9*Math.sqrt(i/(spec.count-1)):0,angle=rotation+i*2.39996323;drop.x=r.x+Math.cos(angle)*radius;drop.y=r.y+Math.sin(angle)*radius;drop.delay=ARCHER_CONFIG.rainWarning+i*.07;drop.valid=!ctx.blocked(drop.x,drop.y,4)&&!ctx.lineBlocked(m.x,m.y,drop.x,drop.y)&&!ctx.lineBlocked(r.x,r.y,drop.x,drop.y)}
 for(let i=0;i<r.rays.length;i++){const a=i/r.rays.length*TAU,ux=Math.cos(a),uy=Math.sin(a);let lo=0,hi=ARCHER_CONFIG.rainRadius;if(!ctx.lineBlocked(r.x,r.y,r.x+ux*hi,r.y+uy*hi))lo=hi;else for(let k=0;k<7;k++){const d=(lo+hi)/2;if(ctx.lineBlocked(r.x,r.y,r.x+ux*d,r.y+uy*d))hi=d;else lo=d}r.rays[i]=lo}
}
function advanceRain(party,m,dt,ctx){const rain=party.archer.rain;if(!rain.active)return;rain.age+=dt;for(let j=0;j<rain.count;j++){const drop=rain.drops[j];drop.life=Math.max(0,drop.life-dt);if(drop.done||rain.age<drop.delay)continue;drop.done=true;if(!drop.valid||ctx.blocked(drop.x,drop.y,4)||ctx.lineBlocked(rain.originX,rain.originY,drop.x,drop.y))continue;drop.life=.25;
  for(let i=ctx.enemies.length-1;i>=0&&ctx.playing;i--){const e=ctx.enemies[i],hits=rain.hits.get(e)||0;if(!alive(e)||hits>=2||Math.hypot(e.x-drop.x,e.y-drop.y)>ctx.radius(e)+ARCHER_CONFIG.rainImpactRadius||ctx.lineBlocked(drop.x,drop.y,e.x,e.y))continue;rain.hits.set(e,hits+1);strike(party,m,e,rain.damage,ctx,m.base.crit)}
 }if(rain.age>ARCHER_CONFIG.rainWarning+(rain.count-1)*.07+.3)rain.active=false;
}
function bounceTarget(b,ctx){let best=null,score=ARCHER_CONFIG.bounceJump**2;for(const e of ctx.enemies){if(!alive(e)||b.visited.includes(e))continue;const d=(e.x-b.x)**2+(e.y-b.y)**2;if(d<=score&&!ctx.lineBlocked(b.x,b.y,e.x,e.y)){score=d;best=e}}return best}
function startBounce(party,m,target,spec){const b=party.archer.bounce;b.active=true;b.x=b.prevX=b.startX=m.x;b.y=b.prevY=b.startY=m.y;b.remaining=4.5;b.target=target;b.count=0;b.maxHits=spec.targets;b.damage=spec.damage;b.visited.fill(null);for(const segment of b.segments)segment.life=0}
function advanceBounce(party,m,dt,ctx){const b=party.archer.bounce;if(!b.active)return;b.remaining-=dt;const e=b.target;if(!alive(e)||b.remaining<=0){b.active=false;return}const limit=b.count?ARCHER_CONFIG.bounceJump:ARCHER_CONFIG.bounceRange;if(Math.hypot(e.x-b.startX,e.y-b.startY)>limit||ctx.lineBlocked(b.x,b.y,e.x,e.y)){b.active=false;return}
 const dx=e.x-b.x,dy=e.y-b.y,d=Math.hypot(dx,dy)||1,step=Math.min(d,1000*dt),nx=b.x+dx/d*step,ny=b.y+dy/d*step;b.prevX=b.x;b.prevY=b.y;b.angle=Math.atan2(dy,dx);if(ctx.blocked(nx,ny,6)||ctx.lineBlocked(b.x,b.y,nx,ny)){b.active=false;return}b.x=nx;b.y=ny;
 if(Math.hypot(e.x-b.x,e.y-b.y)<=ctx.radius(e)+8){const segment=b.segments[b.count];segment.ax=b.startX;segment.ay=b.startY;b.x=e.x;b.y=e.y;segment.bx=b.x;segment.by=b.y;segment.life=.36;b.visited[b.count++]=e;strike(party,m,e,b.damage,ctx,m.base.crit);b.startX=b.x;b.startY=b.y;
  // No other spell is dispatched here: a bounce is a direct damage event only.
  b.target=b.count<b.maxHits?bounceTarget(b,ctx):null;if(!b.target)b.active=false;
 }
}
function advanceArcherSkills(party,dt,ctx){const state=party.archer,m=archerMember(party);if(!state)return;for(const segment of state.bounce.segments)segment.life=Math.max(0,segment.life-dt);
 if(!m||m.hp<=0||m.incapacitated>0){state.rain.active=false;state.bounce.active=false;return}state.explosiveClock=Math.max(0,state.explosiveClock-dt);state.rainClock=Math.max(0,state.rainClock-dt);state.bounceClock=Math.max(0,state.bounceClock-dt);state.detectClock=Math.max(0,state.detectClock-dt);
 advanceRain(party,m,dt,ctx);if(ctx.playing)advanceBounce(party,m,dt,ctx);if(!ctx.playing||state.detectClock>0)return;state.detectClock=CONFIG.tacticalInterval;
 const rainLevel=level(party,'archer_rain');if(rainLevel&&state.rainClock<=0&&!state.rain.active){const target=archerNearest(m,ctx,ARCHER_CONFIG.rainRange);if(target){const spec=RAIN_LEVELS[rainLevel-1];rainPrepare(party,m,target,spec,ctx);state.rainClock=spec.cooldown}}
 const bounceLevel=level(party,'archer_bounce');if(bounceLevel&&state.bounceClock<=0&&!state.bounce.active){const target=archerNearest(m,ctx,ARCHER_CONFIG.bounceRange);if(target){startBounce(party,m,target,BOUNCE_LEVELS[bounceLevel-1]);state.bounceClock=ARCHER_CONFIG.bounceCooldown}}
}

function mageMember(party){for(const m of party.members)if(m.classId==='mage')return m;return null}
function mageRangeMultiplier(party){return 1+level(party,'mage_resonance')*.04}
function mageTarget(x,y,range,ctx,skip){let best=null,score=range*range;for(const e of ctx.enemies){if(!alive(e)||skip?.includes(e))continue;const d=(e.x-x)**2+(e.y-y)**2;if(d<=score&&!ctx.lineBlocked(x,y,e.x,e.y)){score=d;best=e}}return best}
function mageBoss(e){return !!(e.isBoss||e.hybridBoss||e.miniBoss)}
function enemyMovementScale(party,e){const state=party?.mage,f=state?.field;if(!state||state.suspended||f.slowFrame!==party.time||!f.affected.has(e))return 1;return 1-(mageBoss(e)?Math.min(MAGE_CONFIG.bossSlowCap,f.slow):f.slow)}
function advanceArcaneOrbits(party,m,spec,dt,ctx){const state=party.mage,oldAngle=state.orbitAngle,turn=dt*2.2*spec.speed,radius=spec.radius*mageRangeMultiplier(party);state.orbitAngle=(oldAngle+turn)%TAU;
 for(let j=0;j<3;j++){const orb=state.orbits[j];orb.active=false;if(j>=spec.count){orb.initialized=false;continue}const angle=state.orbitAngle+j*TAU/spec.count,nx=m.x+Math.cos(angle)*radius,ny=m.y+Math.sin(angle)*radius;if(orb.initialized&&Math.hypot(orb.x-nx,orb.y-ny)>Math.max(100,m.speed*dt*2+50))orb.initialized=false;
  const ox=orb.initialized?orb.x:nx,oy=orb.initialized?orb.y:ny,steps=Math.max(1,Math.min(32,Math.ceil((turn*radius+Math.hypot(m.motionX||0,m.motionY||0)*m.speed*dt)/18)));let px=ox,py=oy,clear=true;
  for(let k=1;k<=steps;k++){const t=k/steps,a=oldAngle+turn*t+j*TAU/spec.count,ownerX=m.x+(ox-Math.cos(oldAngle+j*TAU/spec.count)*radius-m.x)*(1-t),ownerY=m.y+(oy-Math.sin(oldAngle+j*TAU/spec.count)*radius-m.y)*(1-t),x=ownerX+Math.cos(a)*radius,y=ownerY+Math.sin(a)*radius;if(ctx.blocked(x,y,15)||ctx.lineBlocked(m.x,m.y,x,y)||ctx.lineBlocked(px,py,x,y)){clear=false;break}
   for(let i=ctx.enemies.length-1;i>=0&&ctx.playing;i--){const e=ctx.enemies[i];if(!alive(e)||(orb.nextHit.get(e)||0)>party.time+1e-9||!sweptNear(px,py,x,y,e,ctx.radius(e)+MAGE_CONFIG.orbHitRadius)||ctx.lineBlocked(x,y,e.x,e.y))continue;strike(party,m,e,spec.damage,ctx);orb.nextHit.set(e,party.time+MAGE_CONFIG.orbHitInterval)}px=x;py=y;
  }orb.prevX=ox;orb.prevY=oy;orb.x=nx;orb.y=ny;orb.angle=angle;orb.active=clear;orb.initialized=true;
 }
}
function prepareMeteors(party,m,spec,ctx){const state=party.mage.meteors,range=MAGE_CONFIG.meteorRange*mageRangeMultiplier(party);state.selected.fill(null);let selectedCount=0;for(let i=0;i<spec.count;i++){const e=mageTarget(m.x,m.y,range,ctx,state.selected);if(!e)break;state.selected[selectedCount++]=e}if(!selectedCount)return false;
 state.active=true;state.age=0;state.count=spec.count;state.damage=spec.damage;state.originX=m.x;state.originY=m.y;state.serial++;state.hits.clear();
 for(let i=0;i<4;i++){const drop=state.drops[i];drop.done=i>=spec.count;drop.valid=false;drop.life=0;if(i>=spec.count)continue;const e=state.selected[i%selectedCount];let x=e.x,y=e.y;if(i>=selectedCount)for(let attempt=0;attempt<12;attempt++){const a=(i*2.39996+attempt*Math.PI/6),r=35+10*i;x=e.x+Math.cos(a)*r;y=e.y+Math.sin(a)*r;if(!ctx.blocked(x,y,4)&&!ctx.lineBlocked(m.x,m.y,x,y))break;if(attempt===11){x=e.x;y=e.y}}drop.x=x;drop.y=y;drop.delay=MAGE_CONFIG.meteorWarning+i*.10;drop.valid=!ctx.blocked(x,y,4)&&!ctx.lineBlocked(m.x,m.y,x,y)}return true;
}
function advanceMeteors(party,m,dt,ctx){const state=party.mage.meteors;if(!state.active)return;state.age+=dt;for(let j=0;j<state.count;j++){const drop=state.drops[j];drop.life=Math.max(0,drop.life-dt);if(drop.done||state.age+1e-9<drop.delay)continue;drop.done=true;if(!drop.valid||ctx.blocked(drop.x,drop.y,4)||ctx.lineBlocked(state.originX,state.originY,drop.x,drop.y))continue;drop.life=.45;
  for(let i=ctx.enemies.length-1;i>=0&&ctx.playing;i--){const e=ctx.enemies[i],hits=state.hits.get(e)||0;if(!alive(e)||hits>=2||Math.hypot(e.x-drop.x,e.y-drop.y)>MAGE_CONFIG.meteorRadius+ctx.radius(e)||ctx.lineBlocked(drop.x,drop.y,e.x,e.y))continue;state.hits.set(e,hits+1);strike(party,m,e,state.damage,ctx)}
 }if(state.age>MAGE_CONFIG.meteorWarning+(state.count-1)*.1+.5)state.active=false;
}
function startLightning(party,m,target,spec){const r=party.mage.lightning;r.active=true;r.clock=0;r.count=0;r.maxHits=spec.targets;r.damage=spec.damage;r.x=m.x;r.y=m.y;r.target=target;r.visited.fill(null);for(const segment of r.segments)segment.life=0}
function advanceLightning(party,m,dt,ctx){const r=party.mage.lightning;for(const segment of r.segments)segment.life=Math.max(0,segment.life-dt);if(!r.active)return;r.clock-=dt;
 while(r.active&&r.clock<=0&&ctx.playing){const e=r.target,range=r.count?MAGE_CONFIG.lightningJump:MAGE_CONFIG.lightningRange*mageRangeMultiplier(party);if(!alive(e)||r.visited.includes(e)||Math.hypot(e.x-r.x,e.y-r.y)>range||ctx.lineBlocked(r.x,r.y,e.x,e.y)){r.active=false;break}const segment=r.segments[r.count];segment.ax=r.x;segment.ay=r.y;segment.bx=e.x;segment.by=e.y;segment.life=.34;r.x=e.x;r.y=e.y;r.visited[r.count++]=e;strike(party,m,e,r.damage,ctx);r.clock+=.075;r.target=r.count<r.maxHits?mageTarget(r.x,r.y,MAGE_CONFIG.lightningJump,ctx,r.visited):null;if(!r.target)r.active=false}
}
function prepareGravity(party,m,target,spec,ctx){const f=party.mage.field;f.active=true;f.x=target.x;f.y=target.y;f.originX=m.x;f.originY=m.y;f.radius=spec.radius;f.remaining=MAGE_CONFIG.fieldDuration;f.dps=spec.dps;f.slow=spec.slow;f.tickClock=0;f.slowFrame=-1;f.affected.clear();f.serial++;
 for(let i=0;i<f.rays.length;i++){const a=i/f.rays.length*TAU,ux=Math.cos(a),uy=Math.sin(a);let lo=0,hi=f.radius;if(!ctx.lineBlocked(f.x,f.y,f.x+ux*hi,f.y+uy*hi))lo=hi;else for(let k=0;k<7;k++){const d=(lo+hi)/2;if(ctx.lineBlocked(f.x,f.y,f.x+ux*d,f.y+uy*d))hi=d;else lo=d}f.rays[i]=lo}
}
function advanceGravity(party,m,dt,ctx){const f=party.mage.field;f.affected.clear();f.slowFrame=-1;if(!f.active)return;const activeDt=Math.min(dt,f.remaining);f.remaining=Math.max(0,f.remaining-activeDt);f.tickClock+=activeDt;f.slowFrame=party.time;
 if(!ctx.lineBlocked(f.originX,f.originY,f.x,f.y))for(const e of ctx.enemies)if(alive(e)&&Math.hypot(e.x-f.x,e.y-f.y)<=f.radius+ctx.radius(e)&&!ctx.lineBlocked(f.x,f.y,e.x,e.y))f.affected.add(e);
 // Fixed quarter-second ticks avoid FPS-dependent critical rolls and excess damage-number creation.
 while(f.tickClock+1e-9>=MAGE_CONFIG.fieldTick&&ctx.playing){f.tickClock=Math.max(0,f.tickClock-MAGE_CONFIG.fieldTick);for(const e of f.affected){if(!ctx.playing)break;if(alive(e)){const amount=m.damage*f.dps*MAGE_CONFIG.fieldTick;ctx.hit(e,amount,m);m.damageDealt+=amount}}}if(f.remaining<=1e-9)f.active=false;
}
function advanceMageSkills(party,dt,ctx){const state=party.mage,m=mageMember(party);if(!state)return;if(!m||m.hp<=0||m.incapacitated>0){state.suspended=true;state.field.affected.clear();state.field.slowFrame=-1;for(const orb of state.orbits){orb.active=false;orb.initialized=false}return}state.suspended=false;
 state.meteorClock=Math.max(0,state.meteorClock-dt);state.lightningClock=Math.max(0,state.lightningClock-dt);state.fieldClock=Math.max(0,state.fieldClock-dt);state.detectClock=Math.max(0,state.detectClock-dt);state.pruneClock-=dt;if(state.pruneClock<=0){state.pruneClock=1;for(const orb of state.orbits)for(const [e,until] of orb.nextHit)if(until<party.time||!alive(e))orb.nextHit.delete(e)}
 const orbitLevel=level(party,'mage_orbits');if(orbitLevel)advanceArcaneOrbits(party,m,ARCANE_ORBIT_LEVELS[orbitLevel-1],dt,ctx);else for(const orb of state.orbits)orb.active=false;
 if(ctx.playing)advanceMeteors(party,m,dt,ctx);if(ctx.playing)advanceLightning(party,m,dt,ctx);if(ctx.playing)advanceGravity(party,m,dt,ctx);if(!ctx.playing||state.detectClock>0)return;state.detectClock=CONFIG.tacticalInterval;const range=mageRangeMultiplier(party),meteorLevel=level(party,'mage_meteors'),rayLevel=level(party,'mage_lightning'),fieldLevel=level(party,'mage_gravity');
 if(meteorLevel&&state.meteorClock<=0&&!state.meteors.active&&prepareMeteors(party,m,METEOR_LEVELS[meteorLevel-1],ctx))state.meteorClock=MAGE_CONFIG.meteorCooldown;
 if(rayLevel&&state.lightningClock<=0&&!state.lightning.active){const target=mageTarget(m.x,m.y,MAGE_CONFIG.lightningRange*range,ctx);if(target){startLightning(party,m,target,LIGHTNING_LEVELS[rayLevel-1]);state.lightningClock=MAGE_CONFIG.lightningCooldown}}
 if(fieldLevel&&state.fieldClock<=0&&!state.field.active){const target=mageTarget(m.x,m.y,MAGE_CONFIG.fieldRange*range,ctx);if(target){prepareGravity(party,m,target,GRAVITY_LEVELS[fieldLevel-1],ctx);state.fieldClock=MAGE_CONFIG.fieldCooldown}}
}

function clericMember(party){for(const m of party.members)if(m.classId==='cleric')return m;return null}
function clericHealingMultiplier(party){return 1+level(party,'cleric_divine')*.10}
function clericShieldMultiplier(party){return 1+level(party,'cleric_faith')*.08}
function shieldValue(m){return Math.max(m.shield||0,m.guardianRemaining>0?m.guardianShield||0:0)}
function advanceGuardianShield(m,dt){if(m.guardianRemaining>0){m.guardianRemaining=Math.max(0,m.guardianRemaining-dt);if(m.guardianRemaining<1e-9){m.guardianRemaining=0;m.guardianShield=0}}}
function clearExistingPoison(m){const had=m.poisonedRemaining>0;m.poisonedRemaining=0;m.poisonDamageClock=0;m.poisonColor=null;return had}
function clericHeal(party,m,base,source){const n=heal(party,m,base*clericHealingMultiplier(party),source);if(n>0){const marks=party.cleric?.healMarks;if(marks){let mark=marks[0];for(const at of marks)if(at.classId===m.classId){mark=at;break}else if(at.life<mark.life)mark=at;mark.classId=m.classId;mark.life=.65}}return n}
function clericTarget(x,y,range,ctx,skip){let best=null,score=range*range;for(const e of ctx.enemies){if(!alive(e)||skip?.includes(e))continue;const d=(e.x-x)**2+(e.y-y)**2;if(d<=score&&!ctx.lineBlocked(x,y,e.x,e.y)){score=d;best=e}}return best}
function prepareHammers(party,m,spec,ctx){const h=party.cleric.hammers;h.selected.fill(null);let count=0;for(let i=0;i<spec.count;i++){const target=clericTarget(m.x,m.y,CLERIC_CONFIG.hammerRange,ctx,h.selected);if(!target)break;h.selected[count++]=target}if(!count)return false;h.active=true;h.age=0;h.count=spec.count;h.damage=spec.damage;h.originX=m.x;h.originY=m.y;h.hits.clear();
 for(let i=0;i<3;i++){const d=h.drops[i];d.done=i>=spec.count;d.valid=false;d.life=0;if(i>=spec.count)continue;const target=h.selected[i%count];d.x=target.x;d.y=target.y;if(i>=count){for(let k=0;k<12;k++){const a=i*2.39996+k*Math.PI/6,x=target.x+Math.cos(a)*35,y=target.y+Math.sin(a)*35;if(!ctx.blocked(x,y,4)&&!ctx.lineBlocked(m.x,m.y,x,y)){d.x=x;d.y=y;break}}}d.delay=CLERIC_CONFIG.hammerWarning+i*.10;d.valid=!ctx.blocked(d.x,d.y,4)&&!ctx.lineBlocked(m.x,m.y,d.x,d.y)}return true;
}
function advanceHammers(party,m,dt,ctx){const h=party.cleric.hammers;if(!h.active)return;h.age+=dt;for(let j=0;j<h.count;j++){const d=h.drops[j];d.life=Math.max(0,d.life-dt);if(d.done||h.age+1e-9<d.delay)continue;d.done=true;if(!d.valid||ctx.blocked(d.x,d.y,4)||ctx.lineBlocked(h.originX,h.originY,d.x,d.y))continue;d.life=.4;
  for(let i=ctx.enemies.length-1;i>=0&&ctx.playing;i--){const e=ctx.enemies[i],hits=h.hits.get(e)||0;if(!alive(e)||hits>=2||Math.hypot(e.x-d.x,e.y-d.y)>CLERIC_CONFIG.hammerRadius+ctx.radius(e)||ctx.lineBlocked(d.x,d.y,e.x,e.y))continue;h.hits.set(e,hits+1);strike(party,m,e,h.damage,ctx)}
 }if(h.age>CLERIC_CONFIG.hammerWarning+(h.count-1)*.1+.45)h.active=false;
}
function purifyTarget(party,m,spec,ctx){const candidates=party.cleric.purify.candidates;candidates.fill(null);let count=0;for(let i=0;i<candidates.length;i++){const e=clericTarget(m.x,m.y,CLERIC_CONFIG.purifyRange,ctx,candidates);if(!e)break;candidates[count++]=e}let best=null,bestCount=-1;for(let j=0;j<count;j++){const candidate=candidates[j];let score=0;for(const e of ctx.enemies)if(alive(e)&&(e.x-candidate.x)**2+(e.y-candidate.y)**2<=spec.radius**2&&!ctx.lineBlocked(candidate.x,candidate.y,e.x,e.y))score++;if(score>bestCount){bestCount=score;best=candidate}}return best}
function preparePurify(party,m,target,spec,ctx){const f=party.cleric.purify;f.active=true;f.x=target.x;f.y=target.y;f.originX=m.x;f.originY=m.y;f.radius=spec.radius;f.remaining=CLERIC_CONFIG.purifyDuration;f.dps=spec.dps;f.tickClock=0;f.pulse=0;f.serial++;
 for(let i=0;i<f.rays.length;i++){const a=i/f.rays.length*TAU,ux=Math.cos(a),uy=Math.sin(a);let lo=0,hi=f.radius;if(!ctx.lineBlocked(f.x,f.y,f.x+ux*hi,f.y+uy*hi))lo=hi;else for(let k=0;k<7;k++){const d=(lo+hi)/2;if(ctx.lineBlocked(f.x,f.y,f.x+ux*d,f.y+uy*d))hi=d;else lo=d}f.rays[i]=lo}
}
function advancePurify(party,m,dt,ctx){const f=party.cleric.purify;f.pulse=Math.max(0,f.pulse-dt);if(!f.active)return;const activeDt=Math.min(dt,f.remaining),open=!ctx.lineBlocked(f.originX,f.originY,f.x,f.y);f.remaining=Math.max(0,f.remaining-activeDt);f.tickClock+=activeDt;
 if(open)for(const ally of party.members)if(ally.hp>0&&ally.incapacitated<=0&&Math.hypot(ally.x-f.x,ally.y-f.y)<=f.radius&&!ctx.lineBlocked(f.x,f.y,ally.x,ally.y)&&clearExistingPoison(ally))f.pulse=.35;
 while(f.tickClock+1e-9>=CLERIC_CONFIG.purifyTick&&ctx.playing){f.tickClock=Math.max(0,f.tickClock-CLERIC_CONFIG.purifyTick);if(open)for(let i=ctx.enemies.length-1;i>=0&&ctx.playing;i--){const e=ctx.enemies[i];if(alive(e)&&Math.hypot(e.x-f.x,e.y-f.y)<=f.radius+ctx.radius(e)&&!ctx.lineBlocked(f.x,f.y,e.x,e.y)){const amount=m.damage*f.dps*CLERIC_CONFIG.purifyTick;ctx.hit(e,amount,m);m.damageDealt+=amount}}}if(f.remaining<=1e-9)f.active=false;
}
function guardianTarget(party,m,ctx){let best=null,ratio=CLERIC_CONFIG.guardianThreshold;for(const ally of party.members){if(ally.hp<=0||ally.incapacitated>0||Math.hypot(ally.x-m.x,ally.y-m.y)>CLERIC_CONFIG.guardianRange)continue;const value=ally.hp/ally.maxHp;if(value<ratio&&!ctx.lineBlocked(m.x,m.y,ally.x,ally.y)){ratio=value;best=ally}}return best}
function advanceClericSkills(party,dt,ctx){const state=party.cleric,m=clericMember(party);if(!state)return;for(const mark of state.healMarks)mark.life=Math.max(0,mark.life-dt);state.regenPulse=Math.max(0,state.regenPulse-dt);
 if(!m||m.hp<=0||m.incapacitated>0){state.suspended=true;return}state.suspended=false;state.hammerClock=Math.max(0,state.hammerClock-dt);state.purifyClock=Math.max(0,state.purifyClock-dt);state.guardianClock=Math.max(0,state.guardianClock-dt);state.detectClock=Math.max(0,state.detectClock-dt);
 const regenLevel=level(party,'cleric_regen');if(regenLevel){state.regenClock-=dt;while(state.regenClock<=1e-9&&ctx.playing){state.regenClock+=CLERIC_CONFIG.regenInterval;const spec=REGEN_LEVELS[regenLevel-1];let healed=false;for(const ally of party.members)if(ally.hp>0&&ally.incapacitated<=0&&ally.hp<ally.maxHp&&Math.hypot(ally.x-m.x,ally.y-m.y)<=spec.radius&&!ctx.lineBlocked(m.x,m.y,ally.x,ally.y))healed=clericHeal(party,ally,ally.maxHp*spec.heal,m)>0||healed;if(healed)state.regenPulse=.6}}
 if(ctx.playing)advanceHammers(party,m,dt,ctx);if(ctx.playing)advancePurify(party,m,dt,ctx);if(!ctx.playing||state.detectClock>0)return;state.detectClock=CONFIG.tacticalInterval;const hammerLevel=level(party,'cleric_hammer'),purifyLevel=level(party,'cleric_purify'),guardianLevel=level(party,'cleric_guardian');
 if(hammerLevel&&state.hammerClock<=0&&!state.hammers.active&&prepareHammers(party,m,HAMMER_LEVELS[hammerLevel-1],ctx))state.hammerClock=CLERIC_CONFIG.hammerCooldown;
 if(purifyLevel&&state.purifyClock<=0&&!state.purify.active){const target=purifyTarget(party,m,PURIFY_LEVELS[purifyLevel-1],ctx);if(target){preparePurify(party,m,target,PURIFY_LEVELS[purifyLevel-1],ctx);state.purifyClock=CLERIC_CONFIG.purifyCooldown}}
 if(guardianLevel&&state.guardianClock<=0){const ally=guardianTarget(party,m,ctx);if(ally){ally.guardianShield=Math.max(ally.guardianShield||0,ally.maxHp*GUARDIAN_LEVELS[guardianLevel-1]*clericShieldMultiplier(party));ally.guardianRemaining=CLERIC_CONFIG.guardianDuration;state.guardianClock=CLERIC_CONFIG.guardianCooldown}}
}

function support(party,m,dt){if(m.classId!=='cleric')return;m.healClock-=dt;m.auraClock-=dt;if(m.healClock<=1e-9){let ally=null,ratio=1;const reach=500;for(const a of party.members){const r=a.hp/a.maxHp;if(a.incapacitated<=0&&r<ratio&&Math.hypot(a.x-m.x,a.y-m.y)<=reach){ally=a;ratio=r}}if(ally)clericHeal(party,ally,4,m);m.healClock+=5}
 if(level(party,'cleric_aura')&&m.auraClock<=0){for(const a of party.members)if(a.incapacitated<=0&&Math.hypot(a.x-m.x,a.y-m.y)<420)a.shield=Math.max(a.shield,level(party,'cleric_aura')*10);m.auraClock=12;effect(party,'ward',m.x,m.y,0,80,'#e5d39d',.6)}
}
function animate(m,dt){m.animTime+=dt;m.attackTime=Math.max(0,m.attackTime-dt);m.hurtTime=Math.max(0,m.hurtTime-dt);const speed=Math.hypot(m.motionX||0,m.motionY||0);m.walkPhase+=dt*(m.combat?.dash.active?22:9)*Math.min(1,speed+.15);const fx=m.attackTime>0?Math.cos(m.attackAngle):m.facingX||0,fy=m.attackTime>0?Math.sin(m.attackAngle):m.facingY??1;m.direction=Math.abs(fx)>Math.abs(fy)?fx<0?1:2:fy<0?3:0;m.animState=m.incapacitated>0?'down':m.hurtTime>0?'hurt':m.combat?.dash.active?'dash':m.attackTime>0?'attack':speed>.08?'walk':'idle'}
function advance(party,dt,ctx){if(!ctx.playing||!(dt>0))return;party.time+=dt;while(party.dashTrail.length&&party.dashTrail[0].until<=party.time)party.dashTrail.shift();
 for(const f of party.effects)f.life=Math.max(0,f.life-dt);
 if(level(party,'flaming_arrows')){party.enchantClock-=dt;party.enchantRemaining=Math.max(0,party.enchantRemaining-dt);if(party.enchantClock<=0){party.enchantClock=5;party.enchantRemaining=1.8;const mage=party.members.find(m=>m.classId==='mage');if(mage&&mage.incapacitated<=0)effect(party,'enchant',mage.x,mage.y,0,70,'#ff9b45',.55);else party.enchantRemaining=0}}
 for(let i=ctx.enemies.length-1;i>=0&&ctx.playing;i--){const e=ctx.enemies[i];if(alive(e)&&e.rpgBleedRemaining>0){const active=Math.min(dt,e.rpgBleedRemaining);e.rpgBleedRemaining-=active;ctx.hit(e,e.rpgBleedDps*active,e.rpgBleedOwner)}}
 for(const m of party.members){if(!ctx.playing)break;m.uniqueCooldown=Math.max(0,m.uniqueCooldown-dt);advanceGuardianShield(m,dt);
  if(m.incapacitated>0){animate(m,dt);continue}
  if(m.isCompanion){const leader=party.members[0];if(Math.hypot(m.x-leader.x,m.y-leader.y)>CONFIG.catchupDistance)ctx.recover(m,leader);m.tacticClock-=dt;if(m.tacticClock<=0){m.tacticClock=CONFIG.tacticalInterval;decide(party,m,ctx);m.dodge=dodgeGoal(party,m,ctx)}
   if(m.dodge?.evading)m.followBoost=Math.max(m.followBoost,1.32);
   move(m,(m.dodge?.x??m.goalX)-m.x,(m.dodge?.y??m.goalY)-m.y,dt,ctx);
   m.contactClock=Math.max(0,m.contactClock-dt);if(!ctx.invulnerable&&m.contactClock<=0){for(const e of ctx.enemies)if(alive(e)&&bossTouches(m,e,ctx)){hurt(party,m,e.damage||5);m.contactClock=.65;break}
    if(m.incapacitated<=0)for(const pool of ctx.slimeTrails||[]){const vx=pool.bx-pool.ax,vy=pool.by-pool.ay,t=clamp(((m.x-pool.ax)*vx+(m.y-pool.ay)*vy)/(vx*vx+vy*vy||1),0,1);if((m.x-pool.ax-vx*t)**2+(m.y-pool.ay-vy*t)**2<(pool.r+m.bodyRadius)**2&&!(m.poisonedRemaining>0))m.poisonedRemaining=5}if(m.poisonedRemaining>0){const active=Math.min(dt,m.poisonedRemaining);m.poisonedRemaining=Math.max(0,m.poisonedRemaining-dt);hurt(party,m,active*3)}
    if(m.contactClock<=0)for(const hazard of ctx.hazards||[])if(hazard.phase==='active'&&(hazard.x-m.x)**2+(hazard.y-m.y)**2<(hazard.radius+m.bodyRadius*.3)**2){hurt(party,m,8);m.contactClock=.8;break}
   }
  }
  if(m.incapacitated<=0){support(party,m,dt);m.attackClock-=dt;if(m.attackClock<=0){const target=nearest(m,ctx.enemies,ctx,party);if(target){attack(party,m,target,ctx);m.attackClock=Math.max(.12,1/m.rate)}else m.attackClock=.09}}
  animate(m,dt);
 }
 if(ctx.playing){advanceRevive(party,dt);advanceWarriorSkills(party,dt,ctx);if(ctx.playing)advanceArcherSkills(party,dt,ctx);if(ctx.playing)advanceMageSkills(party,dt,ctx);if(ctx.playing)advanceClericSkills(party,dt,ctx);if(ctx.playing)advanceTravelerSkills(party,dt,ctx);if(ctx.playing)projectiles(party,dt,ctx)}
}
return{setPlayerName,PROTAGONISTS,isProtagonist,dodgeGoal,TRAVELER_SKILLS,CLERIC_SKILLS,REGEN_LEVELS,HAMMER_LEVELS,PURIFY_LEVELS,GUARDIAN_LEVELS,CLERIC_CONFIG,shieldValue,clericHealingMultiplier,clericShieldMultiplier,MAGE_SKILLS,ARCANE_ORBIT_LEVELS,METEOR_LEVELS,LIGHTNING_LEVELS,GRAVITY_LEVELS,MAGE_CONFIG,mageRangeMultiplier,enemyMovementScale,ARCHER_SKILLS,MULTI_LEVELS,EXPLOSIVE_LEVELS,RAIN_LEVELS,BOUNCE_LEVELS,ARCHER_CONFIG,SLOT_LIMITS,WARRIOR_SKILLS,ORBIT_LEVELS,WAVE_LEVELS,QUAKE_LEVELS,GHOST_LEVELS,SUPPLIES,equipped,freeSlots,CONFIG,CLASSES,UNIQUE_ABILITIES,canSwitchLeader,nextLeader,switchLeader,canUseAbility,useAbility,IDS,DEFAULT_FORMATION,FORMATION_KEY,ULTIMATES,UPGRADES,RESERVES,BY_UPGRADE,validFormation,readFormation,writeFormation,create,recompute,offers,apply,eligible,level,has,incoming,hurt,heal,advance,animate,upgradePreview,enemyTarget,hostileTouches,reviveTarget,startRevive,reviveProgress};
});
