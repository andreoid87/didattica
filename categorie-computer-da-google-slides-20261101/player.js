/* Lettore statico minimale: nessuna dipendenza, nessuna chiamata di rete.
   Non rigenera i canvas e non sposta eventuali iframe Miniapp. */
(() => {
  'use strict';
  const width = Number(document.body.dataset.slideWidth) || 960;
  const height = Number(document.body.dataset.slideHeight) || 540;
  const slides = Array.from(document.querySelectorAll('main > section.slide'));
  const main = document.querySelector('main');
  const header = document.querySelector('header');
  const oldSelection = document.getElementById('selection');
  if (!main || !slides.length) return;

  const home = document.createElement('a');
  home.href = '/';
  home.className = 'player-home';
  home.textContent = '‹ Catalogo';
  home.setAttribute('aria-label', 'Torna al catalogo');
  header.prepend(home);

  const controls = document.createElement('nav');
  controls.className = 'player-controls';
  controls.setAttribute('aria-label', 'Controlli presentazione');
  controls.innerHTML = [
    '<button type="button" class="player-button" data-action="prev" aria-label="Slide precedente" title="Precedente (←)">‹</button>',
    '<span class="player-position" aria-live="polite"></span>',
    '<button type="button" class="player-button" data-action="next" aria-label="Slide successiva" title="Successiva (→)">›</button>',
    '<span class="player-divider" aria-hidden="true"></span>',
    '<button type="button" class="player-button player-button-small" data-action="grid" aria-label="Mostra tutte le slide" title="Indice delle slide (G)">▦</button>',
    '<button type="button" class="player-button player-button-small" data-action="notes" aria-label="Mostra testo e fonti" title="Testo e fonti (N)">☷</button>',
    '<button type="button" class="player-button player-button-small" data-action="fullscreen" aria-label="Schermo intero" title="Schermo intero (F)">⛶</button>'
  ].join('');
  document.body.append(controls);
  // A LIM can reveal a touch-sized exit button in the upper-right corner.
  const exitButton = document.createElement('button');
  exitButton.type = 'button';
  exitButton.className = 'fullscreen-exit';
  exitButton.textContent = 'Esci da schermo intero';
  exitButton.setAttribute('aria-label', 'Mostra il comando per uscire dallo schermo intero');
  exitButton.title = 'Tocca per mostrare il comando di uscita';
  exitButton.hidden = true;
  document.body.append(exitButton);

  const dialog = document.createElement('div');
  dialog.className = 'player-dialog';
  dialog.hidden = true;
  dialog.innerHTML = '<div class="dialog-panel" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div class="dialog-header"><h2 id="dialog-title"></h2><button class="dialog-close" type="button" aria-label="Chiudi">×</button></div><div class="dialog-content"></div></div>';
  document.body.append(dialog);
  const dialogTitle = dialog.querySelector('#dialog-title');
  const dialogContent = dialog.querySelector('.dialog-content');
  const prevButton = controls.querySelector('[data-action="prev"]');
  const nextButton = controls.querySelector('[data-action="next"]');
  const notesButton = controls.querySelector('[data-action="notes"]');
  const fullButton = controls.querySelector('[data-action="fullscreen"]');
  const position = controls.querySelector('.player-position');
  let active = 0;
  let idleTimer = 0;
  let exitTimer = 0;
  let focusBeforeDialog = null;

  function showControls() {
    if (document.fullscreenElement) return;
    document.body.classList.remove('player-idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (dialog.hidden && !controls.contains(document.activeElement) &&
          !header.contains(document.activeElement)) {
        document.body.classList.add('player-idle');
      }
    }, 3200);
  }

  function resize() {
    const slide = slides[active];
    if (!slide) return;
    const styles = getComputedStyle(main);
    const availableW = Math.max(1, main.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight));
    const availableH = Math.max(1, main.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom));
    const scale = Math.min(availableW / width, availableH / height);
    const w = Math.round(width * scale * 100) / 100;
    const h = Math.round(height * scale * 100) / 100;
    const viewport = slide.querySelector('.viewport');
    const surface = slide.querySelector('.surface');
    const canvas = slide.querySelector('.canvas');
    if (!viewport || !surface || !canvas) return;
    slide.style.width = w + 'px';
    slide.style.height = h + 'px';
    viewport.style.width = w + 'px';
    viewport.style.height = h + 'px';
    surface.style.width = w + 'px';
    surface.style.height = h + 'px';
    canvas.style.transform = 'scale(' + scale + ')';
  }

  function show() {
    let id = '';
    try { id = decodeURIComponent(location.hash.slice(1)); } catch {}
    const found = slides.findIndex(slide => slide.id === id);
    active = found < 0 ? 0 : found;
    slides.forEach((slide, index) => { slide.hidden = index !== active; });
    if (oldSelection) oldSelection.value = slides[active].id;
    position.textContent = (active + 1) + ' / ' + slides.length;
    prevButton.disabled = active === 0;
    nextButton.disabled = active === slides.length - 1;
    notesButton.disabled = !slides[active].querySelector('.reading');
    resize();
    showControls();
  }

  function go(index) {
    if (index < 0 || index >= slides.length) return;
    const id = slides[index].id;
    if (location.hash === '#' + encodeURIComponent(id)) show();
    else location.hash = encodeURIComponent(id);
  }

  function closeDialog() {
    if (dialog.hidden) return;
    dialog.hidden = true;
    dialogContent.replaceChildren();
    main.inert = false;
    controls.inert = false;
    header.inert = false;
    document.body.classList.remove('player-dialog-open');
    (focusBeforeDialog || controls.querySelector('[data-action="grid"]')).focus();
    showControls();
  }

  function openDialog(kind) {
    focusBeforeDialog = document.activeElement;
    dialogTitle.textContent = kind === 'grid' ? 'Tutte le slide' : 'Testo e fonti';
    dialogContent.replaceChildren();
    if (kind === 'grid') {
      const grid = document.createElement('div');
      grid.className = 'player-grid';
      slides.forEach((slide, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'grid-item';
        button.textContent = (index + 1) + '. ' + (slide.getAttribute('aria-label') || 'Diapositiva');
        if (index === active) button.setAttribute('aria-current', 'true');
        button.addEventListener('click', () => { closeDialog(); go(index); });
        grid.append(button);
      });
      dialogContent.append(grid);
    } else {
      const reading = slides[active].querySelector('.reading');
      if (!reading) return;
      const copy = reading.cloneNode(true);
      copy.open = true;
      dialogContent.append(copy);
    }
    dialog.hidden = false;
    main.inert = true;
    controls.inert = true;
    header.inert = true;
    document.body.classList.add('player-dialog-open');
    dialog.querySelector('.dialog-close').focus();
  }

  function syncFullscreen() {
    const on = !!document.fullscreenElement;
    document.body.classList.toggle('fullscreen-mode', on);
    exitButton.hidden = !on;
    if (!on) {
      clearTimeout(exitTimer);
      exitButton.classList.remove('is-visible');
      exitButton.setAttribute('aria-label', 'Mostra il comando per uscire dallo schermo intero');
    }
    fullButton.textContent = on ? '⊡' : '⛶';
    fullButton.setAttribute('aria-label', on ? 'Esci da schermo intero' : 'Schermo intero');
    fullButton.setAttribute('aria-pressed', String(on));
    resize();
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    } catch {
      fullButton.title = 'Schermo intero non disponibile in questo browser';
    }
    syncFullscreen();
    showControls();
  }

  controls.addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button || button.disabled) return;
    const action = button.dataset.action;
    if (action === 'prev') go(active - 1);
    if (action === 'next') go(active + 1);
    if (action === 'grid' || action === 'notes') openDialog(action);
    if (action === 'fullscreen') toggleFullscreen();
  });
  // Fullscreen touch navigation deliberately ignores Miniapps and interactive slide elements.
  // An iframe's pointer events do not bubble to this document, preserving its controls.
  main.addEventListener('click', event => {
    if (!document.fullscreenElement || !dialog.hidden || event.button !== 0) return;
    if (event.target.closest('a,button,input,textarea,select,summary,iframe,[contenteditable],[data-accortic-miniapp],[role="button"],[role="textbox"]')) return;
    if (document.querySelector('.miniapp-expanded')) return;
    const bounds = main.getBoundingClientRect();
    go(active + (event.clientX < bounds.left + bounds.width / 2 ? -1 : 1));
  });

  exitButton.addEventListener('click', event => {
    event.stopPropagation();
    if (!document.fullscreenElement) return;
    if (exitButton.classList.contains('is-visible')) {
      toggleFullscreen();
      return;
    }
    exitButton.classList.add('is-visible');
    exitButton.setAttribute('aria-label', 'Esci da schermo intero');
    clearTimeout(exitTimer);
    exitTimer = setTimeout(() => {
      exitButton.classList.remove('is-visible');
      exitButton.setAttribute('aria-label', 'Mostra il comando per uscire dallo schermo intero');
    }, 3200);
  });

  dialog.querySelector('.dialog-close').addEventListener('click', closeDialog);
  dialog.addEventListener('click', event => {
    if (event.target === dialog) closeDialog();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !dialog.hidden) {
      event.preventDefault();
      closeDialog();
      return;
    }
    if (!dialog.hidden || event.altKey || event.ctrlKey || event.metaKey ||
        document.activeElement?.tagName === 'IFRAME' ||
        document.querySelector('.miniapp-expanded') ||
        event.target.closest('input,textarea,select,[contenteditable]')) return;
    const key = event.key.toLowerCase();
    if (event.key === 'ArrowRight' || event.key === 'PageDown') {
      event.preventDefault(); go(active + 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      event.preventDefault(); go(active - 1);
    } else if (key === 'f') {
      event.preventDefault(); toggleFullscreen();
    } else if (key === 'g') {
      event.preventDefault(); openDialog('grid');
    } else if (key === 'n' && !notesButton.disabled) {
      event.preventDefault(); openDialog('notes');
    }
    showControls();
  });
  document.addEventListener('pointermove', showControls, {passive:true});
  document.addEventListener('pointerdown', showControls, {passive:true});
  document.addEventListener('focusin', showControls);
  document.addEventListener('fullscreenchange', syncFullscreen);
  window.addEventListener('resize', resize);
  window.addEventListener('hashchange', show);
  if (oldSelection) oldSelection.addEventListener('change', () => {
    const index = slides.findIndex(slide => slide.id === oldSelection.value);
    go(index < 0 ? 0 : index);
  });
  window.addEventListener('beforeprint', () => {
    slides.forEach(slide => {
      slide.hidden = false;
      slide.style.width = width + 'px';
      slide.style.height = height + 'px';
      const canvas = slide.querySelector('.canvas');
      if (canvas) canvas.style.transform = 'scale(1)';
      const viewport = slide.querySelector('.viewport');
      const surface = slide.querySelector('.surface');
      for (const node of [viewport, surface]) {
        if (node) {node.style.width = width + 'px'; node.style.height = height + 'px';}
      }
    });
  });
  window.addEventListener('afterprint', show);
  document.body.classList.add('player-ready');
  show();
})();

/* Miniapp v1: trusted player creates an isolated frame from an approved marker.
   Editorial HTML never supplies iframe, srcdoc or script content. */
const miniappRelease=/^(?:https:\/\/(?:accortic-b69ab\.web\.app|accordino\.it)\/miniapp\/[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?\/v[1-9][0-9]{0,5}\/|https:\/\/edu\.accordino\.it\/miniapp\/[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?\/)$/;
let openMiniapp=null;
for(const host of document.querySelectorAll('div[data-accortic-miniapp="v1"]')){
  const url=host.getAttribute('data-accortic-miniapp-url')||'',
    title=host.getAttribute('data-accortic-miniapp-title')||'Miniapp';
  if(!miniappRelease.test(url)){
    host.textContent='Miniapp da configurare. Apri la slide nell’editor.';
    continue;
  }
  const bar=document.createElement('div');bar.className='miniapp-bar';
  const caption=document.createElement('strong');caption.textContent=title;
  const expand=document.createElement('button');expand.type='button';expand.textContent='Espandi per LIM';expand.setAttribute('aria-label','Espandi '+title+' per LIM');
  bar.append(caption,expand);
  const viewport=document.createElement('div');viewport.className='miniapp-viewport';
  const frame=document.createElement('iframe');
  frame.src=url;frame.title=title;frame.setAttribute('sandbox','allow-scripts');
  frame.setAttribute('referrerpolicy','no-referrer');
  frame.setAttribute('loading','lazy');
  viewport.append(frame);
  host.replaceChildren(bar,viewport);
  // NEVER move/recreate the frame on expand: its in-memory game state must survive.
  let previouslyFocused=null,previousScroll=0;
  const close=()=>{
    if(openMiniapp!==host)return;
    host.classList.remove('miniapp-expanded');
    host.removeAttribute('role');host.removeAttribute('aria-modal');
    document.body.classList.remove('miniapp-open');
    expand.textContent='Espandi per LIM';expand.setAttribute('aria-label','Espandi '+title+' per LIM');
    openMiniapp=null;dispatchEvent(new Event('resize'));scrollTo({top:previousScroll,behavior:'instant'});
    (previouslyFocused||expand).focus({preventScroll:true});
  };
  const toggle=()=>{
    if(openMiniapp===host){close();return;}
    if(openMiniapp)return;
    previouslyFocused=document.activeElement;
    previousScroll=scrollY;
    openMiniapp=host;host.classList.add('miniapp-expanded');
    host.setAttribute('role','dialog');host.setAttribute('aria-modal','true');
    document.body.classList.add('miniapp-open');
    expand.textContent='Torna alla slide';expand.setAttribute('aria-label','Torna alla slide da '+title);
    expand.focus({preventScroll:true});
  };
  expand.addEventListener('click',toggle);
  addEventListener('keydown',event=>{
    if(openMiniapp!==host)return;
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();}
    if(event.key==='Tab'&&document.activeElement===expand&&event.shiftKey){event.preventDefault();expand.focus();}
  },true);
}
