(function(root){'use strict';
const ICON_PATHS={sword:'M5 19 18 6m-5-2 7 0 0 7M4 15l5 5m-6 1 3-3',arrow:'M3 12h17m-6-6 6 6-6 6M4 8l4 4-4 4',arcane:'m12 2 8 10-8 10L4 12 12 2Zm-8 10h16',heal:'M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7Z',shield:'m12 2 9 4-2 10-7 6-7-6L3 6Z',dagger:'m14 3 7-1-1 7-10 10-5-5L14 3ZM3 21l4-4',spear:'M3 21 17 7m-2-3 7-2-2 7-5-5Z',heart:'M12 21 3 12C-1 4 9 1 12 7c3-6 13-3 9 5Z',boots:'M7 3h8v10l6 4v4H4V8h3Z',mana:'M12 2S4 11 4 16a8 8 0 0 0 16 0C20 11 12 2 12 2Z',fire:'M13 2c4 7-3 7 1 11l3-4c8 12-4 16-9 12C0 16 7 11 8 7c0 4 6 4 5-5Z',rotate:'M5 7h14m-4-4 4 4-4 4M19 17H5m4-4-4 4 4 4',xp:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z',haste:'m13 2-8 12h7l-1 8 8-12h-7Z',guard:'m12 2 9 4-2 10-7 6-7-6L3 6Zm0 5v10m-5-5h10',impact:'M12 2v5m10 5h-5M2 12h5m5 10v-5m-6-11 3 3m9-3-3 3m3 9-3-3M6 18l3-3',pierce:'M2 12h20m-6-6 6 6-6 6M8 4v16',sweep:'M3 18C3 3 18 0 22 9M4 19l6-3m-6 3 1-7',ward:'m12 2 9 4-2 10-7 6-7-6L3 6Zm0 5 2 4 4 1-4 2-2 4-2-4-4-2 4-1Z',holy:'M12 2v20M4 8h16m-9 6h2',bleed:'M12 2S5 11 5 16a7 7 0 0 0 14 0C19 11 12 2 12 2Zm-3 14 3 3 3-5'};
function icon(name){return '<svg class="rpg-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="'+(ICON_PATHS[name]||ICON_PATHS.xp)+'"/></svg>'}
function skillIcon(d){if(d.owner==='traveler'&&d.art)return '<img class="rpg-icon" src="assets/heroes/protagonist/skill-'+d.art+'.png" alt="">';if(d.owner==='cleric'&&d.art)return window.MicroverseClericVisuals.icon(d.art);if(d.owner==='mage'&&d.art)return window.MicroverseMageVisuals.icon(d.art);if(d.owner==='archer'&&d.art)return window.MicroverseArcherVisuals.icon(d.art);return d.art?window.MicroverseWarriorVisuals.icon(d.art):icon(d.icon)}
function basicAttackIcon(id){return '<img class="rpg-icon basic-attack-icon" src="'+window.MicroverseFantasyVisuals.iconPath(id)+'" alt="">'}
function categoryLabel(d){return d.category==='active'?'ACTIVA AUTOMÁTICA':d.category==='passive'?'PASIVA':'SUMINISTRO'}
function mount(api){const R=window.MicroverseParty,V=window.MicroverseFantasyVisuals,$=s=>document.querySelector(s);let activeSlot=0,selected=api.formation[0],returnView='levels',hudClock=0;
 document.body.classList.add('fantasy-rpg');
 const home=$('#menuHome'),brand=home.querySelector('h1'),wallet=$('#metaWallet'),teamButton=$('#hubSpecimen'),play=$('#play'),shortcuts=home.querySelector('.hub-shortcuts'),options=$('#menuOptions'),loading=$('#loadingState'),startup=$('#startupLog'),record=$('#bestline');
 home.innerHTML='<header class="hub-header"><div id="hubBrand"></div><div id="hubResources"></div><button id="hubFullscreen" class="secondary" aria-label="Activar pantalla completa horizontal">PANTALLA COMPLETA</button></header><figure class="isekai-hero"><img alt=""><figcaption></figcaption></figure><div class="hub-layout"><section class="hub-party-stage"><div class="hub-section-title"><span>COMPAÑÍA ACTIVA</span><span id="hubTeamReady">3 / 3</span></div><div id="hubTeamPreview"></div><div id="hubTeamSummary" hidden></div></section><aside class="hub-expedition"><div class="expedition-art" aria-hidden="true"></div><h2>Laboratorio</h2><p>Supervivencia · 10 oleadas</p><div id="hubLaunch"></div></aside></div><nav id="hubNavigation" aria-label="Menú principal"></nav><footer class="hub-footer"><div id="hubSettings"></div><div id="hubRecord"></div></footer><div id="hubLoading"></div><div id="hubDebug"></div>';
 $('#hubBrand').appendChild(brand);$('#hubResources').appendChild(wallet);$('#hubNavigation').appendChild(shortcuts);$('#hubTeamSummary').appendChild(teamButton);$('#hubLaunch').appendChild(play);$('#hubSettings').appendChild(options);$('#hubRecord').appendChild(record);$('#hubLoading').appendChild(loading);$('#hubDebug').appendChild(startup);
 $('#hubResources').after($('#menuOptions'));
 $('#hubFullscreen').addEventListener('click',()=>api.fullscreen());
 const rotate=document.createElement('button');rotate.id='rotateHeroesButton';rotate.className='combat-touch';rotate.type='button';rotate.setAttribute('aria-label','Cambiar héroe controlado');rotate.innerHTML=icon('rotate')+'<span>CAMBIAR</span><small>SIGUIENTE HÉROE</small>';
 const ability=document.createElement('button');ability.id='heroAbilityButton';ability.className='combat-touch';ability.type='button';ability.innerHTML='<span class="ability-icon"></span><span class="ability-name"></span><small></small><i class="ability-cooldown"></i>';$('#actionDock').prepend(rotate,ability);
 function actionInput(button,action){let lastPointer=-Infinity;button.addEventListener('pointerdown',event=>{if(event.pointerType==='mouse'&&event.button!==0)return;event.preventDefault();event.stopPropagation();lastPointer=performance.now();if(!button.disabled)action()});button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();if(!button.disabled&&(event.detail===0||performance.now()-lastPointer>500))action()})}
 actionInput(rotate,()=>api.switchHero());actionInput(ability,()=>api.useAbility());
 const screen=document.createElement('section');screen.id='formationScreen';screen.className='screen hidden';screen.setAttribute('aria-labelledby','formationTitle');screen.innerHTML='<div class="formation-shell"><header><button id="formationBack" class="secondary">VOLVER</button><div><h2 id="formationTitle">FORMACIÓN DE EQUIPO</h2></div><span class="formation-rule">1 protagonista · 2 compañeros</span></header><div class="formation-layout"><section class="formation-catalog"><h3>HÉROES</h3><div id="heroCatalog"></div></section><section class="formation-center"><h3>TU EQUIPO</h3><div id="formationSlots"></div><div id="formationPreview" aria-label="Vista previa del equipo"></div></section><aside id="heroDetail"></aside></div><footer><span id="formationMessage">Elige dos compañeros.</span><button id="formationStart">INICIAR EXPEDICIÓN</button></footer></div>';document.body.appendChild(screen);
 const vitals=$('.vital-panel');vitals.insertAdjacentHTML('afterbegin','<div id="leaderPortrait" class="hero-portrait leader-portrait"></div>');vitals.insertAdjacentHTML('beforeend','<div id="companionStatus"></div>');const manaParent=$('#manaBar').parentElement;manaParent.id='heroManaHud';vitals.querySelector('.vital-grid').appendChild(manaParent);manaParent.appendChild($('#manaDrain'));const xp=$('.experience-line');xp.id='teamExperience';xp.prepend($('#leveltext'));vitals.insertBefore(xp,$('#companionStatus'));
 const center=document.createElement('div');center.id='hudEncounter';
 const utility=document.createElement('div');utility.id='hudUtility';
 $('.hudtop').append(center,utility);
 center.append($('#runStatus'),$('#bossHud'));
 utility.append($('#miniMapPanel'),$('#pause'));
 $('#pause').setAttribute('aria-label','Pausar partida');
 const pause=$('#pauseScreen .card');
 const pauseHeader=document.createElement('header');pauseHeader.className='pause-header';
 const settings=document.createElement('div');settings.className='pause-settings';settings.append(pause.querySelector('label'),$('#qualityProfile'));
 pauseHeader.append(pause.querySelector('h2'),settings);pause.prepend(pauseHeader);
 pause.querySelector('.pause-skills-title').hidden=true;pause.querySelector('.pause-skill-columns').hidden=true;
 const content=document.createElement('div');content.id='partyPauseContent';
 const tabs=document.createElement('nav');tabs.className='pause-tabs';tabs.setAttribute('aria-label','Secciones de pausa');
 tabs.innerHTML='<button type="button" data-panel="skills" aria-pressed="true">Habilidades</button><button type="button" data-panel="team" aria-pressed="false">Equipo</button>';
 const actions=$('#resume').closest('.actions');pause.insertBefore(tabs,actions);pause.insertBefore(content,actions);
 let pausePanel='skills';
 function showPausePanel(name){
  pausePanel=name;
  for(const button of tabs.children)button.setAttribute('aria-pressed',String(button.dataset.panel===name));
  for(const panel of content.children)panel.hidden=panel.dataset.panel!==name;
  content.scrollTop=0;
 }
 tabs.addEventListener('click',event=>{const button=event.target.closest('button[data-panel]');if(button)showPausePanel(button.dataset.panel)});
 const portrait=(id,extra='',direction=0)=>'<span class="hero-portrait '+extra+'" style="background-image:url(&quot;'+V.portrait(id,direction)+'&quot;)"></span>';
 function trianglePreview(f,prefix){return '<div class="free-party-preview">'+f.map((id,i)=>id?'<div class="triangle-hero free-party-position-'+i+'">'+portrait(id,'triangle-portrait')+'<b>'+R.CLASSES[id].name+'</b><small>'+(i?'COMPAÑERO '+i:'TÚ · PRINCIPAL')+'</small></div>':'').join('')+'</div>'}

 function renderHub(){const f=api.formation;
  if(api.protagonist){
   const image=$('.isekai-hero img'),name=R.CLASSES[api.protagonist].name;
   const path='assets/isekai/'+api.protagonist+'-reference-v2.webp';
   if(image.getAttribute('src')!==path)image.src=path;
   image.alt='Ilustración del protagonista '+name;
   $('.isekai-hero figcaption').textContent=name;
  }
  $('#hubSpecimen').innerHTML='<span><small>EQUIPO ACTIVO</small><b>'+(R.CLASSES[f[0]]?.name||'Elegir protagonista')+'</b><em>'+f.slice(1).map(id=>R.CLASSES[id]?.name||'Sin compañero').join(' · ')+'</em></span>';$('#hubTeamPreview').innerHTML=f.map((id,i)=>'<div class="hub-hero">'+(id?portrait(id):'<span class="empty-triangle">+</span>')+'<b>'+(R.CLASSES[id]?.name||'Vacante')+'</b><small>'+(i?'Compañero':'Principal')+'</small></div>').join('');$('#hubTeamReady').textContent=f.filter(Boolean).length+' / 3';const button=$('#menuOrganismsButton');if(button){const spans=button.querySelectorAll('span');spans[spans.length-1].textContent='FORMACIÓN'}if($('#organismsTitle'))$('#organismsTitle').textContent='HÉROES';$('#heroCatalog').innerHTML=R.IDS.filter(id=>!R.isProtagonist(id)).map(id=>'<button class="hero-catalog-card" data-hero="'+id+'" aria-pressed="'+(id===selected)+'">'+portrait(id)+'<span><b>'+R.CLASSES[id].name+'</b><small>'+R.CLASSES[id].role+'</small></span></button>').join('')}

 function renderFormation(){renderHub();const f=api.formation;$('#formationSlots').innerHTML=[0,1,2].map(i=>'<div class="team-slot '+(i===activeSlot?'selected':'')+'"><button class="team-slot-select" data-slot="'+i+'" '+(i===0?'disabled':'')+' aria-pressed="'+(i===activeSlot)+'">'+(f[i]?portrait(f[i]):'<span class="empty-slot">+</span>')+'<span><small>'+(i===0?'HÉROE PRINCIPAL':'COMPAÑERO '+i+' · IA')+'</small><b>'+(R.CLASSES[f[i]]?.name||'Elegir héroe')+'</b></span></button>'+(i===0?'':'<button class="clear-slot" data-clear="'+i+'" aria-label="Vaciar espacio '+(i+1)+'">×</button>')+'</div>').join('');$('#formationPreview').innerHTML=trianglePreview(f,'formation');const d=R.CLASSES[selected],skill=R.UNIQUE_ABILITIES[selected];$('#heroDetail').innerHTML=portrait(selected,'detail-portrait')+'<small class="detail-role">'+d.role+'</small><h3>'+d.name+'</h3><p>'+d.description+'</p><div class="hero-base-attack">'+basicAttackIcon(selected)+'<span>AUTOATAQUE<b>'+d.basic+'</b><small>Automático · Sin coste de maná</small></span></div><dl class="hero-stats"><div><dt>Vida</dt><dd>'+d.hp+'</dd></div><div><dt>Daño</dt><dd>'+d.damage+'</dd></div><div><dt>Ataques/s</dt><dd>'+d.rate+'</dd></div><div><dt>Alcance</dt><dd>'+d.range+'</dd></div></dl><div class="hero-unique-detail">'+icon(skill.icon)+'<span><b>'+skill.name+'</b><small>'+skill.cost+' MP · '+skill.cooldown+' s de recarga</small><p>'+skill.description+'</p></span></div><h4>MEJORAS DE CLASE</h4><ul class="hero-skill-list">'+R.UPGRADES.filter(u=>u.owner===selected).map(u=>'<li>'+skillIcon(u)+'<span><b>'+u.name+'</b><small>'+categoryLabel(u)+' · '+u.effect+'</small></span></li>').join('')+'</ul>';const valid=R.validFormation(f);$('#formationStart').disabled=!valid||!api.ready;$('#formationMessage').textContent=!api.ready?'Cargando aventureros…':valid?'Compañeros libres · siguen al héroe principal y salen a combatir':'Completa los tres espacios con clases diferentes.'}
 function openFormation(back='levels'){returnView=back;activeSlot=1;selected=api.formation[1]||'warrior';$('#menu').classList.add('hidden');screen.classList.remove('hidden');renderFormation()}
 $('#heroCatalog').addEventListener('click',event=>{const button=event.target.closest('[data-hero]');if(!button)return;const id=button.dataset.hero,f=api.formation.slice(),other=f.indexOf(id);selected=id;if(other!==activeSlot){const previous=f[activeSlot];f[activeSlot]=id;if(other>=0)f[other]=previous||null;api.setFormation(f)}renderFormation()});
 $('#formationSlots').addEventListener('click',event=>{const remove=event.target.closest('[data-clear]'),button=event.target.closest('[data-slot]');if((remove?.dataset.clear??button?.dataset.slot)==='0')return;if(remove){const f=api.formation.slice();f[Number(remove.dataset.clear)]=null;api.setFormation(f);renderFormation()}else if(button){activeSlot=Number(button.dataset.slot);selected=api.formation[activeSlot]||selected;renderFormation()}});
 $('#formationBack').addEventListener('click',()=>{screen.classList.add('hidden');api.showMenu(returnView)});$('#formationStart').addEventListener('click',()=>{if(!R.validFormation(api.formation))return;screen.classList.add('hidden');api.startRun()});
 const roster=$('#skillGuide');
 const appearances=[
  {id:'basic',name:'Básico',color:'#adb7c4'},
  {id:'common',name:'Común',color:'#68dc92'},
  {id:'uncommon',name:'Poco común',color:'#72dff0',locked:true},
  {id:'rare',name:'Raro',color:'#7aabff',locked:true},
  {id:'mythic',name:'Mítico',color:'#c29aff',locked:true},
  {id:'legendary',name:'Legendario',color:'#f1cb73',locked:true}
 ];
 const commonNames={kael:'Viajero de la Señal',lyra:'Viajera de la Señal',
  kael:'Viajero de la Señal',lyra:'Viajera de la Señal',warrior:'Espadachín Aventurero',archer:'Exploradora del Bosque',mage:'Hechicero Violeta',
  cleric:'Sacerdotisa Dorada',assassin:'Sombra Carmesí',defender:'Guardián Real',lancer:'Lancero Celeste'
 };
 const visibleHeroIds=()=>R.IDS.filter(id=>!R.isProtagonist(id)||id===api.protagonist);
 let rosterHero=api.protagonist||'warrior',appearanceIndex=0,swipeStart=null;
 const appearanceDialog=document.createElement('dialog');
 appearanceDialog.id='heroAppearanceDialog';
 appearanceDialog.className='screen';
 appearanceDialog.setAttribute('aria-labelledby','appearanceTitle');
 appearanceDialog.innerHTML=`
  <div class="appearance-shell">
   <header><h2 id="appearanceTitle"></h2><button type="button" data-close-appearance aria-label="Cerrar aspectos" autofocus>×</button></header>
   <div class="appearance-carousel">
    <div id="appearancePreview">
     <img src="assets/heroes/team-splash.webp" alt="Los siete héroes de Microverse reunidos bajo la luna" decoding="async" loading="lazy" draggable="false" width="1536" height="864">
     <button type="button" data-appearance-step="-1" aria-label="Aspecto anterior">‹</button>
     <button type="button" data-appearance-step="1" aria-label="Siguiente aspecto">›</button>
    </div>
    <aside class="appearance-detail" aria-live="polite">
     <h3 id="appearanceHero"></h3>
     <strong id="appearanceName"></strong>
     <span id="appearanceRarity"></span>
     <div id="appearanceSprite" hidden></div>
     <p id="appearanceDescription"></p>
    </aside>
   </div>
   <div id="appearancePositions" aria-label="Posiciones del carrusel"></div>
   <footer><span id="appearanceStatus" role="status"></span><button type="button" id="applyHeroAppearance">Aplicar</button></footer>
  </div>`;
 document.body.appendChild(appearanceDialog);
 const appearanceArt=(id,skin)=>'<span class="roster-sprite" style="background-image:url(&quot;'+V.portrait(id,0,skin)+'&quot;)" aria-hidden="true"></span>';
 const skillsDialog=document.createElement('dialog');
 skillsDialog.id='heroSkillsDialog';skillsDialog.className='screen';
 skillsDialog.setAttribute('aria-labelledby','heroSkillsTitle');
 skillsDialog.innerHTML='<header><h2 id="heroSkillsTitle"></h2><button type="button" id="closeHeroSkills" autofocus>Cerrar</button></header><ul class="roster-skills" tabindex="0" aria-label="Lista de habilidades"></ul>';
 document.body.appendChild(skillsDialog);
 $('#closeHeroSkills').addEventListener('click',()=>skillsDialog.close());
 function showHeroSkills(){
  const hero=R.CLASSES[rosterHero],manual=R.UNIQUE_ABILITIES[rosterHero];
  $('#heroSkillsTitle').textContent='Habilidades de '+hero.name;
  const skills=[
   [basicAttackIcon(rosterHero),hero.basic,'Ataque básico',''],
   [icon(manual.icon),manual.name,'Manual · '+manual.cost+' MP · '+manual.cooldown+' s',manual.description],
   ...R.UPGRADES.filter(d=>d.owner===(R.isProtagonist(rosterHero)?'traveler':rosterHero)).map(d=>[skillIcon(d),d.name,categoryLabel(d),d.effect])
  ];
  skillsDialog.querySelector('.roster-skills').innerHTML=skills.map(([art,name,kind,description])=>'<li>'+art+'<span><b>'+name+'</b><small>'+kind+'</small><span>'+description+'</span></span></li>').join('');
  skillsDialog.showModal();
  skillsDialog.querySelector('.roster-skills').scrollTop=0;
 }
 const chronicles={
  kael:['La última señal','Kael creyó que aquella noche solo sería otro viaje bajo la lluvia. El mensaje que envió a su madre quedó sin respuesta cuando una desconocida lo empujó hacia una luz imposible. En Eshland conserva el teléfono y los audífonos: ahora busca una señal que lo guíe de regreso, mientras aprende que quizá la voz más importante no llegue desde su mundo.'],
  lyra:['Una voz entre mundos','Lyra salió del trabajo bajo la lluvia con una última promesa escrita en la pantalla: volvería pronto. El andén, el empujón y el resplandor blanco quebraron esa rutina. La diosa la dejó en Farion con ropa que no pertenece a Eshland y un teléfono que aún guarda su vida anterior. Cada frecuencia que descubre la acerca a los héroes y al camino de vuelta.'],
  warrior:['El filo prestado','Cuando se cerraron las compuertas, Ivo encontró una espada clavada en el torno que sujetaba la última puerta. Sacarla dejaba pasar a la infección. La sostuvo con el hombro hasta que cruzó el último aprendiz. Todavía lleva en la hombrera la hendidura del torno.'],
  archer:['El bosque bajo el vidrio','Nara marcaba los senderos del invernadero con flechas sin punta. Tras la primera oleada, alguien empezó a devolvérselas desde un sector declarado vacío. Entró con el equipo para averiguar quién seguía allí. Guarda un espacio libre en el carcaj para la próxima respuesta.'],
  mage:['La nota que falta','Las grietas del cristal de Liria cantan cuando se acerca una oleada. La primera noche confundió el sonido con una canción de su maestro y abrió el sello. Desde entonces afina su bastón antes de cada incursión. Ha aprendido todas las notas salvo la que cerraría la brecha.'],
  cleric:['Siete segundos','Alba custodiaba la enfermería cuando cedió el vidrio. Plantó el báculo en una junta del suelo y sostuvo la primera barrera contando en voz alta. Llegó a siete. Al otro lado, una niña había terminado de atar el torniquete de su hermano. Alba aún cuenta cada vez que levanta el santuario.'],
  assassin:['La deuda del silencio','Vera recibió dos dagas y un encargo de borrar el registro del primer brote. En la lista reconoció a su hermana entre los evacuados que nunca llegaron. Escondió el registro en el forro de su bufanda. Ahora usa una daga para abrirse paso y la otra para levantar los cerrojos del archivo.'],
  defender:['La puerta del ala norte','El escudo de Orso conserva el número de la sala de aislamiento. Era la puerta que arrancó de sus bisagras para cubrir a los pacientes durante la evacuación. En la cara interior quedan siete firmas torcidas. Antes de combatir pasa el pulgar sobre cada una.'],
  lancer:['El último relevo','Teo llevaba mensajes entre las torres con una lanza que también servía para saltar los canales. La noche del apagón llegó a la última torre y encontró la campana sin badajo. La golpeó con la punta hasta despertar al valle. La muesca que dejó aquel bronce silba cada vez que carga.']
 };
 const chronicle=document.createElement('dialog');
 chronicle.id='heroChronicle';chronicle.setAttribute('aria-labelledby','chronicleTitle');
 chronicle.innerHTML='<article><header><span></span><button type="button" autofocus>Cerrar</button></header><h2 id="chronicleTitle"></h2><p></p></article>';
 document.body.appendChild(chronicle);
 chronicle.querySelector('button').onclick=()=>chronicle.close();
 function showChronicle(){
  const [title,story]=chronicles[rosterHero]||['Un nombre nuevo bajo otro cielo','El viajero llegó a Eshland con el teléfono aún en la mano y una pregunta que nadie pudo contestar. Entre la ciudad sitiada y el camino de regreso, cada señal que logre descifrar puede cambiar el destino de ambos mundos.'];
  chronicle.querySelector('header span').textContent='Crónica de '+R.CLASSES[rosterHero].name;
  chronicle.querySelector('h2').textContent=title;
  chronicle.querySelector('p').textContent=story;
  chronicle.showModal();
 }
 const PROLOGUE_READ_KEY='microverse_isekai_prologue_read_v1';
 const prologuePages = [
 [
  "Las diez",
  [
   [
    "office",
    [
     [
      "Compañera",
      "¡Mañana me cuentas si alcanzaste el último metro!"
     ],
     [
      "@",
      "Si sigo aquí despidiéndome, ya sabemos cómo acaba la historia."
     ]
    ]
   ]
  ]
 ],
 [
  "Veinte minutos",
  [
   [
    "street",
    [
     [
      "@",
      "Ma, por fin salí. En veinte minutos estoy en casa. ¿Me guardas cena?"
     ]
    ]
   ]
  ]
 ],
 [
  "La cena en casa",
  [
   [
    "=tajadas",
    [
     [
      "Mamá · mensaje",
      "Las tajadas están casi listas. Te guardo las de las puntas, que sé que te gustan."
     ]
    ]
   ]
  ]
 ],
 [
  "Al otro lado del cruce",
  [
   [
    "cross",
    [
     [
      "@",
      "Déjame también la parte quemadita. Ya voy al metro."
     ]
    ]
   ]
  ]
 ],
 [
  "El último tren",
  [
   [
    "train",
    [
     [
      "Altavoz",
      "Último servicio de la noche. Permanezcan detrás de la línea amarilla."
     ]
    ]
   ]
  ]
 ],
 [
  "Una mano en la espalda",
  [
   [
    "push",
    []
   ]
  ]
 ],
 [
  "El andén desaparece",
  [
   [
    "flash",
    []
   ]
  ]
 ],
 [
  "Fuera del cielo",
  [
   [
    "=stars",
    [
     [
      "@",
      "¿Hola? Hace un segundo oía el tren. Ahora puedo oír hasta mis párpados."
     ]
    ]
   ]
  ]
 ],
 [
  "Al despertar",
  [
   [
    "awake",
    [
     [
      "@",
      "¿Eso de ahí abajo es una galaxia? ¿Qué clase de techo tiene este sitio?"
     ]
    ]
   ]
  ]
 ],
 [
  "La guardiana del cristal",
  [
   [
    "=goddess",
    [
     [
      "Diosa",
      "Es el suelo. Desde mi casa se ve el universo entero, hasta los rincones que todavía no tienen estrellas."
     ],
     [
      "@",
      "Alguien me empujó. ¿Me sacaste de la vía?"
     ],
     [
      "Diosa",
      "Te recogí después. Moriste en el andén. A mí me toca acompañarte hasta donde empiece tu próxima vida."
     ],
     [
      "@",
      "Mi mamá todavía me está esperando."
     ]
    ]
   ]
  ]
 ],
 [
  "La suerte de Eshland",
  [
   [
    "=wheel",
    [
     [
      "Diosa",
      "Ven. Cada marca de esta rueda es un mundo donde aún puede comenzar una vida."
     ],
     [
      "@",
      "Pasó tres veces por el mar azul. ¿Por qué se detuvo en la calavera?"
     ],
     [
      "Diosa",
      "Eshland… Hace años que no veía caer la aguja ahí."
     ]
    ]
   ]
  ]
 ],
 [
  "Antes de Blezck",
  [
   [
    "=primavera",
    [
     [
      "Diosa",
      "En primavera los aprendices levantaban los barcos con magia. Casi todos acababan en los tejados."
     ],
     [
      "@",
      "Parece un buen sitio para empezar de nuevo. ¿Por qué pusiste esa cara?"
     ]
    ]
   ]
  ]
 ],
 [
  "Lo que queda",
  [
   [
    "=blezck",
    [
     [
      "Diosa",
      "Porque eso que viste es un recuerdo. Después llegó Blezck, el rey demonio. Una a una, las ciudades dejaron de encender sus faroles."
     ]
    ]
   ]
  ]
 ],
 [
  "Las luces de Farion",
  [
   [
    "=relevo",
    [
     [
      "@",
      "Ahí aún hay luces."
     ],
     [
      "Diosa",
      "Farion. La capital es la última ciudad libre. Sus héroes hacen guardia por turnos. Antes eran turnos de cuatro horas. Ahora duran hasta que alguien puede volver a ponerse en pie."
     ],
     [
      "@",
      "¿Y tú desde aquí solo puedes mirar?"
     ],
     [
      "Diosa",
      "Puedo dejarte dentro de las murallas. Es la única llegada que todavía me atrevo a prometer."
     ]
    ]
   ]
  ]
 ],
 [
  "Sin tiempo de despedirse",
  [
   [
    "=portal",
    [
     [
      "@",
      "Espera. Antes de irme… ¿hay forma de decirle a mi mamá que no siga calentando la cena?"
     ],
     [
      "Diosa",
      "Guarda bien ese teléfono."
     ],
     [
      "@",
      "¡Espera…!"
     ]
    ]
   ]
  ]
 ],
 [
  "En medio de la plaza",
  [
   [
    "landing",
    [
     [
      "Vendedora",
      "¡Eh! ¿Te golpeaste la cabeza? Hace un instante esa plaza estaba vacía."
     ],
     [
      "@",
      "Ojalá supiera explicarlo. ¿Esto es Farion?"
     ],
     [
      "Vendedora",
      "La plaza mayor. Agárrate de mi brazo. Vamos a quitarte de en medio antes de que pase una carreta."
     ],
     [
      "Teléfono · borrador",
      "Ma, llegué."
     ]
    ]
   ]
  ]
 ]
];
 const cloneComic=pages=>pages.map(([title,panels])=>[title,panels.map(([id,lines])=>[id,lines.map(([speaker,line])=>[speaker,line])])]);
 let comicData=cloneComic(prologuePages),comicStoreReady=Promise.resolve();
 const COMIC_DB='microverse-comic-editor-v1',COMIC_STORE='comic';
 function openComicDB(){return new Promise((resolve,reject)=>{if(!('indexedDB'in window)){reject(new Error('IndexedDB no está disponible'));return}const request=indexedDB.open(COMIC_DB,1);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(COMIC_STORE))request.result.createObjectStore(COMIC_STORE)};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
 async function loadComicData(){try{const db=await openComicDB();const data=await new Promise((resolve,reject)=>{const request=db.transaction(COMIC_STORE,'readonly').objectStore(COMIC_STORE).get('prologue');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});db.close();if(Array.isArray(data)&&data.length)comicData=data}catch(error){try{const data=JSON.parse(localStorage.getItem(COMIC_DB)||'null');if(Array.isArray(data)&&data.length)comicData=data}catch{}}}
 async function persistComicData(){const serialized=cloneComic(comicData);try{const db=await openComicDB();await new Promise((resolve,reject)=>{const tx=db.transaction(COMIC_STORE,'readwrite');tx.objectStore(COMIC_STORE).put(serialized,'prologue');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});db.close();return true}catch(error){try{localStorage.setItem(COMIC_DB,JSON.stringify(serialized));return true}catch{return false}}}
 comicStoreReady=loadComicData();
 const mangaAudio = new Audio('assets/prologue-sound/las-luces-de-farion.mp3');
 mangaAudio.loop = true;
 mangaAudio.volume = .65;
 let activePanel = 0;
 let activeLine = 0;
 function syncReaderMusic() {
  if (!prologue.open || document.hidden || document.querySelector('#interfaceSound')?.getAttribute('aria-pressed') === 'false') {
   mangaAudio.pause();
  } else if (mangaAudio.paused) {
   mangaAudio.play().catch(() => {});
  }
 }
 document.addEventListener('visibilitychange', syncReaderMusic);
 const prologue=document.createElement('dialog');
 prologue.id='isekaiPrologue';prologue.className='manga-reader';prologue.setAttribute('aria-labelledby','prologueTitle');
 prologue.innerHTML='<article class="manga-book"><header class="manga-header"><div><small>MICROVERSE · HISTÓRICO</small><h2 id="prologueTitle">Una segunda oportunidad</h2></div><div class="manga-hero"><img alt=""><b></b></div><button type="button" data-close-prologue aria-label="Cerrar prólogo">×</button></header><div class="manga-page" aria-live="polite"><div class="manga-page-heading"><span id="mangaPageNumber"></span><h3 id="mangaPageTitle"></h3></div><div id="mangaPanels"></div></div><footer class="manga-controls"><button type="button" data-manga-prev>‹ Anterior</button><div class="manga-progress"><span id="mangaProgressText"></span><div><i></i></div></div><button type="button" data-manga-next>Siguiente ›</button></footer></article>';
 document.body.appendChild(prologue);
 let prologuePage=0,prologueAutomatic=false;
 const readPrologue=()=>{try{return localStorage.getItem(PROLOGUE_READ_KEY)==='1'}catch{return false}};
 const comicArtSource=id=>id.startsWith('data:')||id.startsWith('http:')||id.startsWith('https:')||id.startsWith('assets/')?id:id.startsWith('=')?'assets/isekai/eshland/'+id.slice(1)+'.webp':'assets/isekai/eshland/'+(api.protagonist||'kael')+'-'+(id==='street'&&api.protagonist==='lyra'?'cross':id)+'.webp';
 function renderProloguePage(){
  const page=comicData[prologuePage],name=R.CLASSES[api.protagonist]?.name || 'Protagonista',image=prologue.querySelector('.manga-hero img');
  prologue.querySelector('.manga-hero b').textContent=name;
  image.src='assets/isekai/'+(api.protagonist||'kael')+'-reference-v2.webp';image.alt='Protagonista '+name;
  $('#mangaPageNumber').textContent='PRÓLOGO · PÁGINA '+String(prologuePage+1).padStart(2,'0');
  $('#mangaPageTitle').textContent=page[0];
  const panels=$('#mangaPanels');panels.replaceChildren();
  page[1].slice(activePanel, activePanel + 1).forEach(([id, lines]) => {
   const frame = document.createElement('section');
   frame.className = 'comic-cell';
   const art = document.createElement('img');
   art.src=comicArtSource(id);
   art.alt = page[0] + ', viñeta ' + (activePanel + 1);
   frame.append(art);
   const dialogue = document.createElement('div');
   dialogue.className = 'comic-lines';
   for (const [speaker, line] of lines.slice(activeLine, activeLine + 1)) {
    const bubble = document.createElement('p');
    const who = document.createElement('b');
    who.textContent = speaker === '@' ? name : speaker;
    bubble.append(who, document.createTextNode(line.replaceAll('{hero}', name)));
    dialogue.append(bubble);
   }
   if(lines.length) frame.append(dialogue);
   panels.append(frame);
  });
  const previous=prologue.querySelector('[data-manga-prev]'),next=prologue.querySelector('[data-manga-next]');
  previous.disabled=prologuePage===0 && activePanel===0 && activeLine===0;next.textContent=activeLine + 1 < page[1][activePanel][1].length?'Continuar ›':prologuePage===comicData.length-1?'Llegar al nuevo mundo':'Siguiente ›';
  $('#mangaProgressText').textContent=(prologuePage+1)+' / '+comicData.length;
  prologue.querySelector('.manga-progress i').style.width=((prologuePage+1)/comicData.length*100)+'%';
  if(activePanel) panels.lastElementChild.scrollIntoView({block:'nearest'}); else prologue.querySelector('.manga-page').scrollTop=0;
 }
 function renderHistory(){
  const holder=$('#historyChapters');if(!holder)return;
  const available=!!api.protagonist;
  const name=R.CLASSES[api.protagonist]?.name || 'Protagonista';
  holder.innerHTML='<article class="history-chapter"><div class="history-chapter-mark">01</div><div><small>CAPÍTULO · '+(readPrologue()?'DESBLOQUEADO':'DISPONIBLE')+'</small><h3>Prólogo: Una segunda oportunidad</h3><p>La última espera de '+name+' y el comienzo de su viaje a otro mundo.</p></div><button type="button" data-read-prologue '+(available?'':'disabled')+'>'+(readPrologue()?'Volver a leer':'Leer prólogo')+'</button></article>';
  holder.querySelector('[data-read-prologue]').addEventListener('click',()=>openPrologue({automatic:false}));
 }
 async function openPrologue({automatic=false}={}){
  await comicStoreReady;prologueAutomatic=automatic;activePanel=0;activeLine=0;prologuePage=0;renderProloguePage();
  prologue.querySelector('[data-close-prologue]').hidden=automatic;
  if(!prologue.open)prologue.showModal();
  mangaAudio.currentTime=0;
  syncReaderMusic();
  window.dispatchEvent(new Event("microverse-reader"));
  prologue.querySelector('[data-manga-next]').focus({preventScroll:true});
 }
 function closePrologue(completed=false){
  if(completed){try{localStorage.setItem(PROLOGUE_READ_KEY,'1')}catch{}}
  if(prologue.open)prologue.close();
  renderHistory();
 }
 prologue.addEventListener('close', () => { mangaAudio.pause(); window.dispatchEvent(new Event('microverse-reader')); });
 prologue.addEventListener('cancel',event=>{if(prologueAutomatic)event.preventDefault()});
 prologue.addEventListener('click',event=>{
  if(mangaAudio.paused)syncReaderMusic();
  if(event.target===prologue||event.target.closest('[data-close-prologue]')){if(!prologueAutomatic)closePrologue(false);return}
  if(event.target.closest('[data-manga-prev]')) turnPanel(-1);
  if(event.target.closest('[data-manga-next], .comic-cell')) turnPanel(1);
 });
 function turnPanel(delta) {
  const nextLine = activeLine + delta;
  if(nextLine >= 0 && nextLine < comicData[prologuePage][1][activePanel][1].length){
   activeLine = nextLine;
   renderProloguePage();
   return;
  }
  const position = prologuePage + delta;
  if(position < 0) return;
  if(position >= comicData.length) return closePrologue(true);
  prologuePage = position;
  activePanel = 0;
  activeLine = delta > 0 ? 0 : Math.max(0, comicData[prologuePage][1][activePanel][1].length - 1);
  renderProloguePage();
 }
 prologue.addEventListener('keydown', event => {
  if(!['ArrowLeft','ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  turnPanel(event.key === 'ArrowLeft' ? -1 : 1);
 });
 const comicEditor=document.createElement('dialog');comicEditor.id='comicEditor';comicEditor.className='comic-editor-dialog';comicEditor.setAttribute('aria-labelledby','comicEditorTitle');
 comicEditor.innerHTML='<article><header><div><small>MICROVERSE · HERRAMIENTAS</small><h2 id="comicEditorTitle">Editor del prólogo</h2></div><button type="button" data-editor-close aria-label="Cerrar editor">×</button></header><div class="comic-editor-toolbar"><label>Página <select data-editor-page></select></label><button type="button" data-add-page>＋ Página</button><button type="button" data-remove-page>Eliminar página</button><label class="comic-page-title">Título<input data-page-title maxlength="80"></label></div><div data-editor-panels class="comic-editor-panels"></div><div class="comic-editor-toolbar"><button type="button" data-add-panel>＋ Viñeta</button><button type="button" data-save-comic>Guardar cambios</button><button type="button" data-export-comic>Exportar copia</button><label class="comic-import-button">Importar copia<input type="file" accept="application/json,.json" data-import-comic hidden></label><button type="button" data-reset-comic>Restaurar prólogo original</button><output data-editor-status>Se guarda en este dispositivo</output></div></article>';
 document.body.appendChild(comicEditor);
 let editorPage=0,comicSaveTimer;
 const escapeComicText=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 function renderComicEditor(){
  const page=comicData[editorPage],select=comicEditor.querySelector('[data-editor-page]');select.innerHTML=comicData.map((entry,index)=>'<option value="'+index+'">'+String(index+1).padStart(2,'0')+' · '+escapeComicText(entry[0])+'</option>').join('');select.value=String(editorPage);comicEditor.querySelector('[data-page-title]').value=page[0];
  comicEditor.querySelector('[data-remove-page]').disabled=comicData.length<=1;
  const panels=comicEditor.querySelector('[data-editor-panels]');panels.innerHTML=page[1].map(([id,lines],panelIndex)=>'<section class="comic-editor-panel" data-editor-panel="'+panelIndex+'"><header><b>VIÑETA '+(panelIndex+1)+'</b><button type="button" data-remove-panel="'+panelIndex+'" '+(page[1].length<=1?'disabled':'')+'>Quitar viñeta</button></header><img alt="Previsualización de viñeta" src="'+escapeComicText(comicArtSource(id))+'"><label>Ruta o URL de imagen<input data-panel-image="'+panelIndex+'" value="'+escapeComicText(id)+'" placeholder="assets/isekai/eshland/imagen.webp"></label><label class="comic-upload-label">Elegir imagen de este dispositivo<input type="file" accept="image/*" data-panel-upload="'+panelIndex+'"></label><div class="comic-editor-lines">'+lines.map(([speaker,line],lineIndex)=>'<div class="comic-editor-line"><label>Personaje<input data-line-speaker="'+panelIndex+'|'+lineIndex+'" maxlength="50" value="'+escapeComicText(speaker)+'"></label><label>Diálogo<textarea data-line-text="'+panelIndex+'|'+lineIndex+'" rows="2" maxlength="800">'+escapeComicText(line)+'</textarea></label><button type="button" data-remove-line="'+panelIndex+'|'+lineIndex+'">Quitar diálogo</button></div>').join('')+'<button type="button" data-add-line="'+panelIndex+'">＋ Diálogo</button></div></section>').join('');
 }
 function scheduleComicSave(){comicEditor.querySelector('[data-editor-status]').textContent='Cambios pendientes de guardar…';clearTimeout(comicSaveTimer);comicSaveTimer=setTimeout(async()=>{const ok=await persistComicData();const status=ok?'Guardado en este dispositivo':'No se pudo guardar; exporta una copia';comicEditor.querySelector('[data-editor-status]').textContent=status;const badge=$('#comicSaveStatus');if(badge)badge.textContent=status},350)}
 function openComicEditor(){if(!api.isDeveloperMode?.())return;comicStoreReady.then(()=>{editorPage=0;renderComicEditor();comicEditor.showModal()})}
 comicEditor.addEventListener('input',event=>{const target=event.target;if(target.matches('[data-page-title]'))comicData[editorPage][0]=target.value;else if(target.matches('[data-panel-image]')){const index=Number(target.dataset.panelImage);comicData[editorPage][1][index][0]=target.value;const img=target.closest('.comic-editor-panel').querySelector('img');img.src=comicArtSource(target.value)}else if(target.matches('[data-line-speaker]')||target.matches('[data-line-text]')){const [panelIndex,lineIndex]=(target.dataset.lineSpeaker||target.dataset.lineText).split('|').map(Number);const line=comicData[editorPage][1][panelIndex][1][lineIndex];line[target.matches('[data-line-speaker]')?0:1]=target.value}scheduleComicSave()});
 comicEditor.addEventListener('change',async event=>{const target=event.target;if(target.matches('[data-editor-page]')){editorPage=Number(target.value);renderComicEditor();return}if(target.matches('[data-panel-upload]')){const file=target.files?.[0];if(!file)return;try{const image=await createImageBitmap(file),scale=Math.min(1,1600/Math.max(image.width,image.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);comicData[editorPage][1][Number(target.dataset.panelUpload)][0]=canvas.toDataURL('image/webp',.84);renderComicEditor();scheduleComicSave()}catch{comicEditor.querySelector('[data-editor-status]').textContent='No se pudo leer esa imagen'}return}if(target.matches('[data-import-comic]')){const file=target.files?.[0];if(!file)return;try{const imported=JSON.parse(await file.text());if(!Array.isArray(imported)||!imported.length||imported.some(page=>!Array.isArray(page)||typeof page[0]!=='string'||!Array.isArray(page[1])||!page[1].length||page[1].some(panel=>!Array.isArray(panel)||typeof panel[0]!=='string'||!Array.isArray(panel[1])||panel[1].some(line=>!Array.isArray(line)||line.length<2))))throw new Error('Formato inválido');comicData=cloneComic(imported);editorPage=0;renderComicEditor();scheduleComicSave()}catch{comicEditor.querySelector('[data-editor-status]').textContent='Archivo inválido: usa una copia exportada desde este editor'}target.value=''}});
 comicEditor.addEventListener('click',event=>{const button=event.target.closest('button,[data-add-page],[data-add-panel],[data-add-line],[data-remove-line],[data-remove-panel],[data-remove-page],[data-save-comic],[data-export-comic],[data-reset-comic],[data-editor-close]');if(!button)return;if(button.matches('[data-editor-close]')){comicEditor.close();return}if(button.matches('[data-add-page]')){comicData.splice(editorPage+1,0,['Nueva página',[['landing',[]]]]);editorPage++;renderComicEditor();scheduleComicSave();return}if(button.matches('[data-remove-page]')){if(comicData.length>1){comicData.splice(editorPage,1);editorPage=Math.max(0,editorPage-1);renderComicEditor();scheduleComicSave()}return}if(button.matches('[data-add-panel]')){comicData[editorPage][1].push(['landing',[]]);renderComicEditor();scheduleComicSave();return}if(button.dataset.removePanel!==undefined){const index=Number(button.dataset.removePanel);if(comicData[editorPage][1].length>1)comicData[editorPage][1].splice(index,1);renderComicEditor();scheduleComicSave();return}if(button.dataset.addLine!==undefined){comicData[editorPage][1][Number(button.dataset.addLine)][1].push(['@','Nuevo diálogo…']);renderComicEditor();scheduleComicSave();return}if(button.dataset.removeLine){const [panelIndex,lineIndex]=button.dataset.removeLine.split('|').map(Number);comicData[editorPage][1][panelIndex][1].splice(lineIndex,1);renderComicEditor();scheduleComicSave();return}if(button.matches('[data-save-comic]')){clearTimeout(comicSaveTimer);persistComicData().then(ok=>{const status=ok?'Guardado en este dispositivo':'Error al guardar';comicEditor.querySelector('[data-editor-status]').textContent=status;$('#comicSaveStatus').textContent=status});return}if(button.matches('[data-export-comic]')){persistComicData().then(()=>{const blob=new Blob([JSON.stringify(comicData,null,2)],{type:'application/json'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='microverse-prologo.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000)});return}if(button.matches('[data-reset-comic]')){comicData=cloneComic(prologuePages);editorPage=0;renderComicEditor();scheduleComicSave()}});
 $('#openComicEditor')?.addEventListener('click',openComicEditor);
 function renderGuide(){
  const available=visibleHeroIds();if(!available.includes(rosterHero))rosterHero=api.protagonist||available[0]||'warrior';
  const hero=R.CLASSES[rosterHero],skin=V.activeSkin(rosterHero),profile=R.isProtagonist(rosterHero)?{level:1,maxed:true}:api.heroProfile(rosterHero),wallet=api.heroWallet();
  const growth=MicroverseExpedition.modifiers(hero,profile.level);
  const number=(value,places=0)=>Number(value.toFixed(places)).toLocaleString('es');
  const stats=[['Vida',hero.hp+growth.health],['Daño',number(hero.damage*growth.damage,1)],['Ataques/s',number(hero.rate*growth.rate,2)],['Alcance',hero.range],['Velocidad',number(hero.speed*growth.speed)],['Crítico',Math.round(hero.crit*100)+'%'],['Armadura',number(100*(1-(1-hero.armor)*(1-growth.armor)),2)+'%']];
  const price=(label,owned,cost)=>'<span class="'+(owned<cost?'missing':'')+'">'+label+' <b>'+number(owned)+' / '+number(cost)+'</b></span>';
  const requirements=R.isProtagonist(rosterHero)?'Protagonista principal seleccionado':profile.maxed?'Nivel máximo':profile.stageRequired?'Desbloqueo disponible en el escenario 2':price('Oro',wallet.gold,profile.gold)
   +(profile.fragments?price('Fragmentos demoníacos',wallet.fragments,profile.fragments)+price('Corazón de demonio',wallet.hearts,profile.hearts):'');
  $('#skillModuleTabs').hidden=true;
  roster.innerHTML='<nav class="roster-list" aria-label="Héroes">'+visibleHeroIds().map(id=>'<button type="button" data-roster-hero="'+id+'" aria-pressed="'+(id===rosterHero)+'">'+appearanceArt(id)+'<span>'+R.CLASSES[id].name+' <small>'+R.CLASSES[id].title+'</small></span></button>').join('')+'</nav>'+
   '<article class="roster-detail" aria-label="Ficha de '+hero.name+'"><div class="roster-overview"><div class="roster-character"><img src="'+(R.isProtagonist(rosterHero)?'assets/isekai/'+rosterHero+'-reference-v2.webp':'assets/heroes/'+rosterHero+'-roster.webp')+'" alt="Ilustración de '+hero.name+'" decoding="async"></div>'+
   '<div><div class="roster-heading"><h3>'+hero.name+'</h3><div class="roster-actions"><button type="button" data-open-skills>Habilidades</button><button type="button" data-open-appearance style="--rarity:'+appearances.find(item=>item.id===skin).color+'">Aspectos</button><button type="button" data-chronicle>Historia</button></div></div><p class="roster-role">'+hero.title+' · '+hero.role+' · Nivel '+profile.level+' / '+MicroverseExpedition.MAX_LEVEL+'</p><p>'+hero.description+'</p><dl class="roster-stats">'+
   stats.map(([label,value])=>'<div><dt>'+label+'</dt><dd>'+value+'</dd></div>').join('')+
   '</dl></div></div><div class="hero-level-panel"><div class="hero-level-requirements">'+requirements+'</div>'+
   (R.isProtagonist(rosterHero)||profile.maxed||profile.stageRequired?'':'<button type="button" data-buy-hero-level '+(profile.available?'':'disabled')+'>Subir a nivel '+profile.next+'</button>')+
   '<output id="heroLevelMessage" role="status"></output></div></article>';
  if(appearanceDialog.open)renderAppearance();
 }
 function renderAppearance(){
  const entry=appearances[appearanceIndex],equipped=entry.id===V.activeSkin(rosterHero),apply=$('#applyHeroAppearance');
  const hero=R.CLASSES[rosterHero];
  appearanceDialog.style.setProperty('--rarity',entry.color);
  $('#appearanceTitle').textContent='Aspectos de '+hero.name;
  $('#appearanceHero').textContent=hero.name;
  const splash=$('#appearancePreview img');
  const individual=entry.id==='basic'&&rosterHero!=='warrior';
  const splashPath='assets/heroes/'+(individual?rosterHero+'-basic-splash':'team-splash')+'.webp';
  if(splash.getAttribute('src')!==splashPath)splash.setAttribute('src',splashPath);
  splash.alt=individual?'Ilustración del aspecto básico de '+hero.name:'Los siete héroes de Microverse reunidos bajo la luna';
  $('#appearanceName').textContent=entry.id==='common'?commonNames[rosterHero]:entry.id==='basic'?'Aspecto básico':'';
  $('#appearanceRarity').textContent=entry.name;
  const sprite=$('#appearanceSprite');
  sprite.hidden=!!entry.locked;
  sprite.innerHTML=entry.locked?'':appearanceArt(rosterHero,entry.id);
  $('#appearanceDescription').textContent=entry.locked?'':hero.description;
  $('#appearancePositions').innerHTML=appearances.map((item,i)=>
   '<button type="button" data-appearance-index="'+i+'" aria-pressed="'+(i===appearanceIndex)+'" style="--tile-rarity:'+item.color+'"><b>'+item.name+'</b>'+(item.locked?'<small>Próximamente</small>':'')+'</button>').join('');
  $('#appearanceStatus').textContent=entry.locked?'PRÓXIMAMENTE':equipped?'✓ EQUIPADO':'Disponible';
  apply.textContent=equipped?'Aplicado':'Aplicar';
  apply.disabled=!!entry.locked||equipped;

 }
 function moveAppearance(step){
  appearanceIndex=(appearanceIndex+step+appearances.length)%appearances.length;
  renderAppearance();
 }
 roster.addEventListener('click',event=>{
  const hero=event.target.closest('[data-roster-hero]');
  if(hero){rosterHero=hero.dataset.rosterHero;renderGuide();roster.querySelector('[aria-pressed="true"]').focus({preventScroll:true});return}
  if(event.target.closest('[data-chronicle]')){showChronicle();return}
  if(event.target.closest('[data-open-skills]')){showHeroSkills();return}
  if(event.target.closest('[data-buy-hero-level]')){
   const bought=api.upgradeHero(rosterHero);
   if(bought)renderGuide();
   $('#heroLevelMessage').textContent=bought?'Nivel '+api.heroProfile(rosterHero).level+' alcanzado':'No se pudo guardar la mejora';
   return;
  }
  if(event.target.closest('[data-open-appearance]')){
   appearanceIndex=appearances.findIndex(item=>item.id===V.activeSkin(rosterHero));
   renderAppearance();appearanceDialog.showModal();
  }
 });
 appearanceDialog.addEventListener('click',event=>{
  const button=event.target.closest('button');
  if(!button)return;
  if(button.hasAttribute('data-close-appearance')){appearanceDialog.close();return}
  if(button.dataset.appearanceStep){moveAppearance(Number(button.dataset.appearanceStep));return}
  if(button.dataset.appearanceIndex!==undefined){appearanceIndex=Number(button.dataset.appearanceIndex);renderAppearance();$('#appearancePositions').children[appearanceIndex].focus();return}
  if(button.id==='applyHeroAppearance'){
   const entry=appearances[appearanceIndex];
   if(!entry.locked&&V.applySkin(rosterHero,entry.id)){renderHub();renderGuide();appearanceDialog.close();roster.querySelector('[data-open-appearance]').focus()}
   else $('#appearanceStatus').textContent='El aspecto todavía se está cargando';
  }
 });
 appearanceDialog.addEventListener('keydown',event=>{
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();moveAppearance(event.key==='ArrowLeft'?-1:1)}
 });
 const preview=$('#appearancePreview');
 preview.addEventListener('pointerdown',event=>{swipeStart=event.clientX;preview.setPointerCapture(event.pointerId)});
 preview.addEventListener('pointerup',event=>{
  if(swipeStart!==null&&Math.abs(event.clientX-swipeStart)>32)moveAppearance(event.clientX<swipeStart?1:-1);
  swipeStart=null;
 });
 preview.addEventListener('pointercancel',()=>{swipeStart=null});
 function updateHud(force=false){const party=api.party;if(!party)return;if(!force&&party.time>=hudClock&&party.time-hudClock<.12)return;hudClock=party.time;const leader=party.members[0],skill=R.UNIQUE_ABILITIES[leader.classId],next=R.nextLeader(party),playing=api.mode==='playing';rotate.disabled=!playing||!next;rotate.querySelector('small').textContent=next?R.CLASSES[next.classId].name.toUpperCase():'NO DISPONIBLE';rotate.setAttribute('aria-label',next?'Cambiar a '+R.CLASSES[next.classId].name:'Cambiar héroe no disponible');
 if(ability.dataset.hero!==leader.classId){ability.dataset.hero=leader.classId;ability.querySelector('.ability-icon').innerHTML=icon(skill.icon);ability.querySelector('.ability-name').textContent=skill.name.toUpperCase()}
 const cooldown=leader.uniqueCooldown||0,insufficient=leader.combat.mana<skill.cost;ability.disabled=!playing||leader.hp<=0||cooldown>0||insufficient;ability.classList.toggle('no-mana',insufficient);ability.querySelector('small').textContent=cooldown>0?Math.ceil(cooldown)+' s · '+skill.cost+' MP':insufficient?'SIN MANÁ · '+skill.cost+' MP':skill.cost+' MP';ability.style.setProperty('--ability-ready',String(1-cooldown/skill.cooldown));ability.setAttribute('aria-label',skill.name+' · '+skill.cost+' de maná'+(cooldown>0?' · recarga '+Math.ceil(cooldown)+' segundos':''));
 $('#organismHudName').textContent=R.CLASSES[leader.classId].name.toUpperCase();$('#leaderPortrait').style.backgroundImage='url("'+V.portrait(leader.classId)+'")';$('#leveltext').textContent='NIVEL '+api.level+' / '+window.MicroverseProgression.RUN_XP.maxLevel;if(api.level>=window.MicroverseProgression.RUN_XP.maxLevel){$('#xptext').textContent='NIVEL MÁXIMO';$('#xpfill').style.width='100%'}$('#hptext').textContent=Math.ceil(leader.hp)+' / '+Math.round(leader.maxHp);$('#hpfill').style.width=(leader.hp/leader.maxHp*100)+'%';let holder=$('#companionStatus');if(holder.dataset.classes!==party.members.map(m=>m.classId).join(',')){holder.dataset.classes=party.members.map(m=>m.classId).join(',');holder.innerHTML=party.members.slice(1).map(m=>'<div class="companion-chip" data-companion="'+m.partyIndex+'">'+portrait(m.classId)+'<span><b>'+R.CLASSES[m.classId].name+'</b><small></small><i><em></em></i></span></div>').join('')}
 for(const m of party.members.slice(1)){const chip=holder.querySelector('[data-companion="'+m.partyIndex+'"]');chip.classList.toggle('incapacitated',m.incapacitated>0);chip.querySelector('small').textContent=m.incapacitated>0?(party.revive?.target===m?'Reviviendo · '+Math.ceil(R.CONFIG.reviveSeconds-party.revive.elapsed)+' s':'Caído'):Math.ceil(m.hp)+' / '+Math.round(m.maxHp);chip.querySelector('em').style.width=(m.incapacitated>0?R.reviveProgress(party,m):m.hp/m.maxHp)*100+'%'}
 $('#heroManaHud').querySelector('.statrow>span:first-child').textContent='MANÁ';$('#manaBar').setAttribute('aria-label','Maná compartido del equipo, sin regeneración');$('#learnedSkillRibbon').hidden=true;
 }
 function learnedHTML(party,owner){const list=R.UPGRADES.concat(R.RESERVES).filter(d=>d.owner===owner&&R.level(party,d.id)>0);return list.length?list.map(d=>'<li>'+skillIcon(d)+'<span>'+d.name+'<small>NIVEL '+R.level(party,d.id)+(Number.isFinite(d.max)?'/'+d.max:'')+'</small></span></li>').join(''):'<li class="empty-upgrades">Sin mejoras todavía.</li>'}
 function sharedSkillHTML(party){return '<div class="shared-loadout">'+['active','passive'].map(category=>{const ids=R.equipped(party,category),limit=R.SLOT_LIMITS[category];return '<section><h3>HABILIDADES '+(category==='active'?'ACTIVAS':'PASIVAS')+' — '+ids.length+'/'+limit+'</h3><div class="shared-skill-slots">'+Array.from({length:limit},(_,i)=>{const d=R.BY_UPGRADE[ids[i]];return d?'<article class="equipped-party-skill">'+skillIcon(d)+'<span><b>'+d.name+'</b><small>'+(R.CLASSES[d.owner]?.name||(d.owner==='traveler'?'Protagonista':d.owner==='synergy'?'Mago + Arquero':'Equipo'))+' · NIVEL '+R.level(party,d.id)+'/'+d.max+'</small></span></article>':'<article class="empty-party-slot">ESPACIO LIBRE</article>'}).join('')+'</div></section>'}).join('')+'</div>'}
 function renderPause(){const party=api.party;if(!party)return;updateHud(true);content.innerHTML='<section data-panel="skills">'+sharedSkillHTML(party)+'</section><section data-panel="team"><div class="party-pause-grid">'+party.members.map((m,i)=>'<section class="party-pause-hero">'+portrait(m.classId)+'<small>'+(i?'COMPAÑERO · IA':'HÉROE PRINCIPAL')+'</small><h3>'+R.CLASSES[m.classId].name+'</h3><p>'+Math.ceil(m.hp)+' / '+Math.round(m.maxHp)+' PV'+(m.incapacitated>0?' · Caído':'')+'</p><dl><div><dt>Daño</dt><dd>'+(m.damage*m.damageBonus).toFixed(1)+'</dd></div><div><dt>Ataques/s</dt><dd>'+m.rate.toFixed(2)+'</dd></div><div><dt>Alcance</dt><dd>'+Math.round(m.range)+'</dd></div><div><dt>Resistencia</dt><dd>'+Math.round((1-(1-m.armor)*(1-(m.permanent.armor||0)))*100)+'%</dd></div></dl><b class="pause-basic">'+R.CLASSES[m.classId].basic+' · automático</b><div class="pause-unique"><b>'+R.UNIQUE_ABILITIES[m.classId].name+'</b><small>'+R.UNIQUE_ABILITIES[m.classId].cost+' MP · '+R.UNIQUE_ABILITIES[m.classId].cooldown+' s</small><p>'+R.UNIQUE_ABILITIES[m.classId].description+'</p></div><ul>'+learnedHTML(party,m.classId)+'</ul></section>').join('')+'</div><div class="party-pause-shared"><section><h3>MEJORAS UNIVERSALES</h3><ul>'+learnedHTML(party,'universal')+'</ul></section><section><h3>SINERGIAS ACTIVAS</h3><ul>'+learnedHTML(party,'synergy')+'</ul></section></div></section>';showPausePanel(pausePanel)}
 function renderOffers(){const party=api.party,holder=$('#upgradeCards');$('#upgradeTitle').textContent='EL EQUIPO SUBE DE NIVEL';$('#upgradeSubtitle')&&($('#upgradeSubtitle').textContent='Elige una mejora para esta expedición.');$('#upgradeCapacity').textContent='ACTIVAS '+R.equipped(party,'active').length+'/4 · PASIVAS '+R.equipped(party,'passive').length+'/2 · ELIGE UNA CARTA';holder.classList.add('party-upgrade-cards');holder.innerHTML=party.offers.map(d=>{const current=R.level(party,d.id),owner=d.owner==='universal'?'TODO EL EQUIPO':d.owner==='synergy'?'MAGO + ARQUERO':d.owner==='traveler'?'PROTAGONISTA':(R.CLASSES[d.owner]?.name||'EQUIPO').toUpperCase(),supply=d.category==='supply',slots=supply?'EFECTO INMEDIATO · NO EQUIPA HABILIDAD':current?'MEJORA EQUIPADA · NO OCUPA OTRO ESPACIO':'OCUPA 1 ESPACIO · '+R.freeSlots(party,d.category)+' '+(d.category==='active'?'ACTIVOS':'PASIVOS')+' LIBRES';return '<button class="party-upgrade-card category-'+d.category+'" data-party-upgrade="'+d.id+'">'+skillIcon(d)+'<span class="upgrade-owner">'+categoryLabel(d)+' · '+owner+'</span><strong>'+d.name+'</strong><span class="upgrade-next">'+(supply?'SUMINISTRO DE CAMPO':'NIVEL '+current+' → '+(current+1))+'</span><p>'+d.effect+'</p><strong class="upgrade-result">'+R.upgradePreview(party,d.id)+'</strong><small class="upgrade-slot-note">'+slots+'</small><small>'+(supply?'Disponible como alternativa cuando faltan mejoras válidas.':'LÍMITE · '+d.max+' NIVELES'+(d.category==='active'?' · AUTOMÁTICA · SIN MANÁ':''))+'</small></button>'}).join('')}
 $('#upgradeCards').addEventListener('click',event=>{const button=event.target.closest('[data-party-upgrade]');if(button)api.selectUpgrade(button.dataset.partyUpgrade)});
 function renderDeveloper(){const party=api.party;if(!party)return;$('#developerFirstLevel').disabled=api.level>=window.MicroverseProgression.RUN_XP.maxLevel;$('#developerTime').textContent='SUPERVIVENCIA · '+api.clock+' · '+api.phase;$('#developerEndContainment').disabled=!api.testEncounter;for(const b of document.querySelectorAll('[data-dev-containment]'))b.disabled=api.phase!=='SURVIVAL';$('#developerCapacity').textContent='ACTIVAS '+R.equipped(party,'active').length+'/4 · PASIVAS '+R.equipped(party,'passive').length+'/2 · '+party.members.map(m=>R.CLASSES[m.classId].name).join(' + ');$('#developerSkills').innerHTML=R.UPGRADES.filter(d=>R.eligible(party,d)||R.level(party,d.id)>0).map(d=>'<article class="dev-skill-card"><b>'+d.name+'</b><span>'+(d.owner==='universal'?'Equipo':d.owner==='synergy'?'Mago + Arquero':d.owner==='traveler'?'Protagonista':R.CLASSES[d.owner].name)+' · '+categoryLabel(d)+' · NIVEL '+R.level(party,d.id)+'/'+d.max+'</span><p>'+d.effect+'</p><button data-party-dev="'+d.id+'" '+(!R.eligible(party,d)?'disabled':'')+'>AÑADIR NIVEL · GRATIS</button></article>').join('');$('#developerOcular').textContent='REINICIAR EQUIPO';$('#developerRay').hidden=true;$('#developerUltimateLevel').hidden=true;document.querySelector('label[for="developerUltimateLevel"]').hidden=true;$('#developerCombatStatus').textContent='EQUIPO · '+party.members.length+' HÉROES · '+party.members[0].combat.mana.toFixed(1)+' MP';}
 $('#developerSkills').addEventListener('click',event=>{const button=event.target.closest('[data-party-dev]');if(button)api.developerUpgrade(button.dataset.partyDev)});
 renderHub();return{openFormation,renderFormation,renderHub,renderGuide,renderHistory,openPrologue,prologueRead:readPrologue,updateHud,renderPause,renderOffers,renderDeveloper};
}
root.MicroverseFantasyUI={mount};
})(typeof globalThis!=='undefined'?globalThis:this);
