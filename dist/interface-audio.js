(() => {
  'use strict';
  const menu = document.querySelector('#menu');
  const controls = document.createElement('button');
  controls.id = 'interfaceSound';
  controls.type = 'button';
  document.querySelector('.hub-header').appendChild(controls);

  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  let enabled = true;
  try { enabled = localStorage.getItem('microverse-ui-audio') !== 'off'; } catch {}
  let context, musicBus, buttonBus, timer, step = 0, lastTouch = -Infinity;
  // A minor / F / C / G, with plucked accompaniment and a quiet flute lead.
  const chords = [[45,52,57,60],[41,48,53,57],[48,55,60,64],[43,50,55,59]];
  const melody = [72,null,76,74,72,null,69,null,69,72,77,null,76,72,69,null,
                  67,null,72,76,79,null,76,72,74,null,71,74,76,74,71,null];
  const arpeggio = [0,2,1,3,2,1,3,1];
  const beat = .27;

  function updateButton() {
    controls.textContent = enabled ? 'AUDIO ACTIVO' : 'AUDIO SILENCIADO';
    controls.setAttribute('aria-pressed', String(enabled));
  }

  function tone(bus, note, start, length, volume, type = 'sine') {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = 440 * 2 ** ((note - 69) / 12);
    envelope.gain.setValueAtTime(.0001, start);
    envelope.gain.exponentialRampToValueAtTime(volume, start + Math.min(.055, length / 4));
    envelope.gain.exponentialRampToValueAtTime(.0001, start + length);
    oscillator.connect(envelope);
    envelope.connect(bus);
    oscillator.start(start);
    oscillator.stop(start + length + .01);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
  }

  function syncMusic() {
    if (!context) return;
    const playing = enabled && !document.hidden && !document.querySelector("#isekaiPrologue[open]") && !menu.inert && !menu.classList.contains('hidden');
    musicBus.gain.setTargetAtTime(playing ? 1.25 : 0, context.currentTime, .065);
    if (!playing) {
      clearInterval(timer);
      timer = undefined;
      return;
    }
    if (timer !== undefined) return;
    const phrase = () => {
      if (context.state !== 'running') return;
      const start = context.currentTime + .025;
      const chord = chords[Math.floor(step / 8)];
      const note = chord[arpeggio[step % 8]];
      tone(musicBus, note, start, .62, .094, 'triangle');
      tone(musicBus, note + 12, start + .025, .38, .026);
      if (step % 8 === 0) tone(musicBus, chord[0] - 12, start, 1.8, .105);
      if (melody[step]) {
        tone(musicBus, melody[step], start + .014, beat * (melody[(step+1)%melody.length] ? 1.1 : 1.75), .105);
        tone(musicBus, melody[step], start + .17, .54, .022);
      }
      step = (step + 1) % melody.length;
    };
    phrase();
    timer = setInterval(phrase, beat * 1000);
  }

  function unlock() {
    if (!AudioEngine || !enabled) return;
    if (!context) {
      context = new AudioEngine();
      musicBus = context.createGain();
      buttonBus = context.createGain();
      musicBus.gain.value = 0;
      buttonBus.gain.value = .38;
      musicBus.connect(context.destination);
      buttonBus.connect(context.destination);
    }
    if (context.state === 'suspended') context.resume().then(syncMusic).catch(() => {});
    else syncMusic();
  }

  function buttonFeedback(button) {
    if (!button || button.disabled || button === controls || button.closest('#isekaiPrologue') || !enabled || !context) return;
    const time = context.currentTime;
    if(button.matches('#quit,#back')){
      [64,55,48].forEach((note,i)=>tone(buttonBus,note,time+i*.068,.23,.18,'triangle'));
      return;
    }
    const back = button.matches('[data-menu-back],#formationBack,#developerBack,#closeHeroSkills,[data-close-appearance],#heroChronicle button');
    if(back){
      tone(buttonBus,81,time,.12,.14);
      tone(buttonBus,74,time+.048,.19,.17,'triangle');
      return;
    }
    const confirm = button.matches('#play,#startLevel1,#formationStart,#resume,#retry,.party-upgrade-card');
    tone(buttonBus, confirm ? 74 : 79, time, .095, .17, 'triangle');
    if (confirm) tone(buttonBus, 81, time + .042, .14, .105);
  }

  window.MicroverseDashSound = () => {
    if(!enabled)return;
    unlock();
    if(!context)return;
    const start=context.currentTime,osc=context.createOscillator(),gain=context.createGain();
    osc.type='triangle';
    osc.frequency.setValueAtTime(640,start);
    osc.frequency.exponentialRampToValueAtTime(72,start+.17);
    gain.gain.setValueAtTime(.001,start);
    gain.gain.exponentialRampToValueAtTime(.38,start+.012);
    gain.gain.exponentialRampToValueAtTime(.001,start+.19);
    osc.connect(gain);gain.connect(buttonBus);osc.start(start);osc.stop(start+.2);
    osc.onended=()=>{osc.disconnect();gain.disconnect()};
  };
  const interactive = 'button,summary,select';
  document.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    unlock();
    const button = event.target.closest(interactive);
    if (button) {
      lastTouch = performance.now();
      buttonFeedback(button);
    }
  }, true);
  document.addEventListener('click', event => {
    unlock();
    if (event.detail === 0 || performance.now() - lastTouch > 550) buttonFeedback(event.target.closest(interactive));
  }, true);
  controls.addEventListener('click', () => {
    enabled = !enabled;
    try { localStorage.setItem('microverse-ui-audio', enabled ? 'on' : 'off'); } catch {}
    updateButton();
    if (enabled) unlock();
    else syncMusic();
  });
  new MutationObserver(syncMusic).observe(menu, {attributes: true, attributeFilter: ['class']});
  window.addEventListener('microverse-reader',syncMusic);
  window.addEventListener('microverse-enter',unlock);
  document.addEventListener('visibilitychange', syncMusic);
  if (!AudioEngine) controls.hidden = true;
  updateButton();
})();
