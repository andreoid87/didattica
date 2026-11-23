/* AccorTIC — MS-DOS didactic simulator v1. No real filesystem, network, or persistence. */
(function (root) {
  'use strict';
  const file = (contents) => ({type: 'file', contents});
  const dir = (children) => ({type: 'dir', children});
  const SYSTEM = dir({
    'AUTOEXEC.BAT': file('@ECHO OFF\r\nPATH C:\\DOS\r\nPROMPT $P$G'),
    'CONFIG.SYS': file('FILES=30\r\nBUFFERS=20'),
    'LEGGIMI.TXT': file('Benvenuto nel disco virtuale C:.\r\nEntra nella cartella SCUOLA per iniziare.'),
    'DOS': dir({
      'COMMAND.COM': file('File di sistema simulato. Non eseguibile.'),
      'HELP.TXT': file('Comandi fondamentali: DIR, CD, TYPE, TREE, CLS, HELP.')
    }),
    'SCUOLA': dir({
      'TIC': dir({
        'LEZIONE.TXT': file('FILE E CARTELLE\r\n\r\nUn file contiene informazioni.\r\nUna cartella contiene file e altre cartelle.\r\nIl percorso indica dove trovare una risorsa.\r\n\r\nDIR = elenca; CD = cambia cartella; TYPE = legge un file.'),
        'ESERCIZI.TXT': file('1. Torna alla cartella principale con CD \\.\r\n2. Entra in DOCUMENTI e leggi APPUNTI.TXT.\r\n3. Prova TREE per visualizzare le cartelle.')
      }),
      'ELE': dir({'CIRCUITI.TXT': file('Esempio TIC: documentazione di un circuito.') }),
      'MEC': dir({'OFFICINA.TXT': file('Esempio TIC: documentazione di una macchina.') }),
      'CAT': dir({'PROGETTO.TXT': file('Esempio TIC: documentazione di un edificio.') })
    }),
    'DOCUMENTI': dir({
      'APPUNTI.TXT': file('Un percorso assoluto parte dalla radice, per esempio C:\\SCUOLA\\TIC.\r\nUn percorso relativo parte dalla cartella corrente.'),
      'ELENCO.TXT': file('Archivio di esempio per il simulatore.')
    })
  });
  function normalizeTarget(raw, cwd) {
    let arg = raw.trim().replace(/^"(.*)"$/, '$1').replace(/\//g, '\\');
    if (!arg) return cwd.slice();
    const drive = arg.match(/^([A-Za-z]):/);
    if (drive) {
      if (drive[1].toUpperCase() !== 'C') throw new Error('Unità non valida. È disponibile solo C:.');
      arg = arg.slice(2);
    }
    const parts = arg.startsWith('\\') ? [] : cwd.slice();
    for (const entry of arg.split('\\')) {
      const part = entry.trim().toUpperCase();
      if (!part || part === '.') continue;
      if (part === '..') { parts.pop(); continue; }
      parts.push(part);
    }
    return parts;
  }
  function at(parts) {
    let node = SYSTEM;
    for (const part of parts) {
      if (node.type !== 'dir') return null;
      node = node.children[part];
      if (!node) return null;
    }
    return node;
  }
  function path(parts) { return 'C:\\' + parts.join('\\'); }
  function byteLength(str) { return new TextEncoder().encode(str).length; }
  function formatDir(parts, node) {
    const entries = node.type === 'file'
      ? [[parts.at(-1), node]]
      : Object.entries(node.children).sort((a, b) =>
        (b[1].type === 'dir') - (a[1].type === 'dir') || a[0].localeCompare(b[0]));
    const listing = [
      ' Il volume nell’unità C è DIDATTICA',
      ' Directory di ' + path(node.type === 'file' ? parts.slice(0, -1) : parts),
      ''
    ];
    let countFiles = 0, bytes = 0, countDirs = 0;
    for (const [name, entry] of entries) {
      if (entry.type === 'dir') {
        countDirs++;
        listing.push('01-01-95  09:00  <DIR>         ' + name);
      } else {
        countFiles++;
        const n = byteLength(entry.contents);
        bytes += n;
        listing.push('01-01-95  09:00  ' + String(n).padStart(10) + '  ' + name);
      }
    }
    listing.push('');
    listing.push('    ' + countFiles + ' file     ' + bytes + ' byte');
    listing.push('    ' + countDirs + ' cartelle');
    return listing.join('\n');
  }
  function formatTree(parts, current) {
    const lines = [path(parts)];
    function visit(node, prefix) {
      const folders = Object.entries(node.children)
        .filter(([, child]) => child.type === 'dir')
        .sort(([a], [b]) => a.localeCompare(b));
      folders.forEach(([name, child], index) => {
        const last = index === folders.length - 1;
        lines.push(prefix + (last ? '└── ' : '├── ') + name);
        visit(child, prefix + (last ? '    ' : '│   '));
      });
    }
    visit(current, '');
    return lines.join('\n');
  }
  class DosEngine {
    constructor() { this.reset(); }
    reset() { this.cwd = []; this.completed = false; }
    get prompt() { return path(this.cwd) + '>'; }
    execute(input) {
      const text = String(input || '').trim();
      if (!text) return {text: ''};
      const matched = text.match(/^([^\s]+)(?:\s+([\s\S]*))?$/);
      let command = matched[1].toUpperCase();
      let arg = (matched[2] || '').trim();
      if (command === 'CD..') { command = 'CD'; arg = '..'; }
      if (command === 'CD\\') { command = 'CD'; arg = '\\'; }
      try {
        if (command === 'HELP' || command === '?') return {text: [
          'Comandi disponibili (maiuscole o minuscole):',
          '  DIR [cartella]  Elenca file e cartelle',
          '  CD [cartella]   Cambia cartella (CD .. torna indietro)',
          '  CD \\           Torna alla cartella principale',
          '  TYPE file.TXT  Legge un file di testo',
          '  TREE [cartella] Mostra la struttura delle cartelle',
          '  CLS             Pulisce lo schermo',
          '  VER             Mostra la versione',
          '  ECHO testo      Visualizza un messaggio',
          '  HELP            Mostra questo aiuto',
          '',
          'Obiettivo: trova e leggi SCUOLA\\TIC\\LEZIONE.TXT.'
        ].join('\n')};
        if (command === 'VER') return {text: 'MS-DOS Version 6.22\nSimulazione didattica AccorTIC, non un sistema operativo reale.'};
        if (command === 'CLS') return {text: '', clear: true};
        if (command === 'ECHO') return {text: arg};
        if (command === 'CD' || command === 'CHDIR') {
          if (!arg) return {text: path(this.cwd)};
          const target = normalizeTarget(arg, this.cwd);
          const node = at(target);
          if (!node || node.type !== 'dir') return {text: 'Percorso non trovato. Usa DIR per vedere le cartelle disponibili.', error: true};
          this.cwd = target;
          return {text: ''};
        }
        if (command === 'DIR') {
          const target = normalizeTarget(arg, this.cwd);
          const node = at(target);
          if (!node) return {text: 'File o cartella non trovato. Verifica il nome con DIR.', error: true};
          return {text: formatDir(target, node)};
        }
        if (command === 'TYPE') {
          if (!arg) return {text: 'Indica un nome, ad esempio TYPE LEGGIMI.TXT.', error: true};
          const target = normalizeTarget(arg, this.cwd);
          const node = at(target);
          if (!node || node.type !== 'file') return {text: 'File non trovato. Usa DIR per vedere i file disponibili.', error: true};
          const found = target.join('\\') === 'SCUOLA\\TIC\\LEZIONE.TXT';
          const justCompleted = found && !this.completed;
          if (found) this.completed = true;
          return {text: node.contents.replace(/\r\n/g, '\n') + (justCompleted ? '\n\nObiettivo raggiunto: hai trovato e letto il file!' : ''), completed: justCompleted};
        }
        if (command === 'TREE') {
          const target = normalizeTarget(arg, this.cwd);
          const node = at(target);
          if (!node || node.type !== 'dir') return {text: 'Cartella non trovata. Usa DIR per individuarla.', error: true};
          return {text: formatTree(target, node)};
        }
        return {text: 'Comando o nome file non valido. Digita HELP per vedere i comandi disponibili.', error: true};
      } catch (error) {
        return {text: error.message || 'Percorso non valido.', error: true};
      }
    }
  }
  root.AccorTICDos = {DosEngine};
  if (typeof module !== 'undefined' && module.exports) module.exports = {DosEngine};
})(typeof window !== 'undefined' ? window : globalThis);
