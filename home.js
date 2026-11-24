'use strict';
/* UDA names and stable membership follow AccorTIC's ticAnnualPlan.ts.
   catalog.json remains the sole authority for published materials. */
const units=[
  {
    "id": "hardware-computer",
    "title": "Hardware del computer",
    "prefix": "tic-uda1-"
  },
  {
    "id": "software-informazioni",
    "title": "Software e informazioni digitali",
    "prefix": "tic-uda2-"
  },
  {
    "id": "documenti-presentazioni",
    "title": "Documenti e comunicazione",
    "prefix": "tic-uda3-"
  },
  {
    "id": "foglio-elettronico",
    "title": "Dati e foglio elettronico",
    "prefix": "tic-uda4-"
  },
  {
    "id": "algoritmi-flowgorithm",
    "title": "Algoritmi e problem solving",
    "prefix": "tic-uda5-"
  },
  {
    "id": "reti-sicurezza",
    "title": "Reti e sicurezza digitale",
    "prefix": "tic-uda6-"
  },
  {
    "id": "ia-progetto",
    "title": "Intelligenza artificiale",
    "prefix": "tic-uda7-"
  }
];
const aliases={
  "interno-pc": 0,
  "categorie-computer-da-google-slides-20261101": 0,
  "periferiche-memorie-massa-google-slides-20261101": 0,
  "tic-sistemi-operativi-2026": 1
};
function normalize(value){return String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();}
function matches(item,unit,query){const hay=normalize([item.title,item.description,unit?.title,item.id].filter(Boolean).join(" "));return normalize(query).split(/\s+/).every(word=>hay.includes(word));}
function readCatalog(data){if(data?.schemaVersion!==1||!Array.isArray(data.materials))throw Error("Catalogo non valido");const seen=new Set();return data.materials.filter(item=>{if(!item||typeof item.id!=="string"||!/^[a-z][a-z0-9-]{0,79}$/.test(item.id)||item.id==="miniapp"||typeof item.title!=="string"||!item.title.trim()||item.title.length>=200||seen.has(item.id))return false;seen.add(item.id);return true;});}
function membership(id,units,aliases){if(Object.hasOwn(aliases,id))return aliases[id];return units.findIndex(unit=>id.startsWith(unit.prefix));}
const byId=id=>document.getElementById(id);
const search=byId('search'),status=byId('catalog-status'),container=byId('units'),retry=byId('retry');
let materials=null;
function el(tag,cls,value){const node=document.createElement(tag);if(cls)node.className=cls;if(value!==undefined)node.textContent=value;return node;}
function card(item){
  const link=el('a','material-card');link.href='/'+item.id+'/';
  link.append(el('span','material-type','Presentazione'),el('span','material-title',item.title));
  const description=typeof item.description==='string'?item.description.trim():'';
  if(description&&description!=='Presentazione didattica · Informatica')link.append(el('span','material-desc',description));
  link.append(el('span','material-action','Apri materiale ↗'));return link;
}
function render(){
  const query=search.value,filtering=Boolean(normalize(query)),groups=units.map((unit,index)=>({unit,index,items:[]}));
  const extra={unit:{title:'Altri materiali'},index:-1,items:[]};
  for(const item of materials??[]){const index=membership(item.id,units,aliases);const group=index<0?extra:groups[index];if(matches(item,group.unit,query))group.items.push(item);}
  if(extra.items.length)groups.push(extra);
  const fragment=document.createDocumentFragment();let count=0;
  for(const group of groups){
    count+=group.items.length;if(filtering&&!group.items.length)continue;
    const details=el('details','unit'),summary=el('summary');
    const number=el('span','unit-number',group.index<0?'·':String(group.index+1).padStart(2,'0'));number.setAttribute('aria-hidden','true');
    const title=el('span','unit-title',group.unit.title);
    title.append(el('span','unit-count',materials===null?'Disponibilità da verificare':group.items.length?group.items.length+(group.items.length===1?' materiale':' materiali'):'Nessun materiale pubblicato'));
    const chevron=el('span','unit-chevron','›');chevron.setAttribute('aria-hidden','true');
    summary.append(number,title,chevron);details.append(summary);
    if(group.items.length){const list=el('div','material-list');list.append(...group.items.map(card));details.append(list);details.open=true;}
    else details.append(el('p','empty',materials===null?'Catalogo non disponibile.':'I materiali compariranno qui quando saranno pubblicati.'));
    fragment.append(details);
  }
  container.replaceChildren(fragment);
  if(materials===null)return;
  status.textContent=filtering?(count?count+' risultati':'Nessun risultato per la ricerca.'):count+(count===1?' materiale pubblicato':' materiali pubblicati');
}
async function load(){
  retry.hidden=true;search.disabled=true;status.textContent='Caricamento dei materiali pubblicati…';
  try{const response=await fetch('/catalog.json',{cache:'no-store'});if(!response.ok)throw Error('Catalogo non disponibile');materials=readCatalog(await response.json());search.disabled=false;render();}
  catch{materials=null;search.value='';render();status.textContent='Catalogo temporaneamente non disponibile. Riprova.';retry.hidden=false;}
}
search.addEventListener('input',render);retry.addEventListener('click',load);render();void load();
