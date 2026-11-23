/* Browser UI for the educational DOS simulator. No real command execution. */
(function () {
  'use strict';
  const engine = new window.AccorTICDos.DosEngine();
  const output = document.getElementById('output');
  const form = document.getElementById('form');
  const input = document.getElementById('command');
  const prompt = document.getElementById('prompt');
  const terminal = document.getElementById('terminal');
  const announcer = document.getElementById('announcement');
  const progress = document.getElementById('goal');
  const history = [];
  let historyIndex = 0;

  function line(text, cssClass = '') {
    const node = document.createElement('pre');
    node.className = 'line ' + cssClass;
    node.textContent = text;
    output.appendChild(node);
    while (output.childElementCount > 160) output.firstElementChild.remove();
    terminal.scrollTop = terminal.scrollHeight;
  }

  function updatePrompt() { prompt.textContent = engine.prompt; }
  function focusInput() { input.focus({preventScroll: true}); }

  function run(raw) {
    const value = raw.trim();
    if (!value) { focusInput(); return; }
    const shownPrompt = engine.prompt;
    line(shownPrompt + value, 'command-echo');
    history.push(value);
    if (history.length > 100) history.shift();
    historyIndex = history.length;
    const result = engine.execute(value);
    if (result.clear) output.replaceChildren();
    else if (result.text) line(result.text, result.error ? 'error' : 'reply');
    if (result.completed) {
      progress.textContent = 'Obiettivo raggiunto';
      progress.classList.add('completed');
    }
    announcer.textContent = result.completed ? 'Obiettivo raggiunto.' : (result.error ? result.text : 'Comando eseguito.');
    input.value = '';
    updatePrompt();
    terminal.scrollTop = terminal.scrollHeight;
    focusInput();
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    run(input.value);
  });
  input.addEventListener('keydown', (event) => {
    // Execute directly from keyboard even in sandboxed iframes and on LIMs.
    if (event.key === 'Enter' && !event.isComposing) {
      event.preventDefault();
      run(input.value);
      return;
    }
    if (event.key === 'ArrowUp' && history.length) {
      event.preventDefault();
      historyIndex = Math.max(0, historyIndex - 1);
      input.value = history[historyIndex];
    } else if (event.key === 'ArrowDown' && history.length) {
      event.preventDefault();
      historyIndex = Math.min(history.length, historyIndex + 1);
      input.value = historyIndex === history.length ? '' : history[historyIndex];
    }
  });
  document.querySelectorAll('[data-command]').forEach((button) => {
    button.addEventListener('click', () => run(button.getAttribute('data-command')));
  });
  document.getElementById('restart').addEventListener('click', () => {
    engine.reset();
    output.replaceChildren();
    history.length = 0;
    historyIndex = 0;
    progress.textContent = 'Trova LEZIONE.TXT';
    progress.classList.remove('completed');
    banner();
    updatePrompt();
    announcer.textContent = 'Simulazione ricominciata.';
    focusInput();
  });
  terminal.addEventListener('click', (event) => {
    if (!event.target.closest('button,a,input')) focusInput();
  });
  function banner() {
    line('Microsoft(R) MS-DOS Version 6.22', 'welcome');
    line('SIMULAZIONE DIDATTICA — nessun comando agisce sul tuo computer.', 'notice');
    line('Obiettivo: trova e leggi C:\\SCUOLA\\TIC\\LEZIONE.TXT.\nDigita HELP per conoscere i comandi.\n', 'instruction');
  }
  banner();
  updatePrompt();
  // After opening the Miniapp, typing starts immediately without clicking a tiny input.
  requestAnimationFrame(focusInput);
})();
