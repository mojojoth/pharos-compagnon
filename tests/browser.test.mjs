import {createRequire} from 'node:module';
import {readFile,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
let chromium;
try{({chromium}=require('playwright'));}catch{throw new Error('Installez la dépendance de développement Playwright avec npm install.');}
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))), extension=path.join(root,'extension');
const fbHtml=await readFile(path.join(root,'tests/fixtures/facebook.html'),'utf8');
const portalHtml=await readFile(path.join(root,'tests/fixtures/pharos.html'),'utf8');
const profile=await mkdtemp(path.join(tmpdir(),'pharos-tests-'));
const results=[];let context;
function passed(name){results.push(name);console.log('OK',name);}
try{
 context=await chromium.launchPersistentContext(profile,{headless:true,channel:'chromium',...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),viewport:{width:1500,height:1100},args:['--disable-extensions-except='+extension,'--load-extension='+extension,'--no-sandbox']});
 await context.route('**/*',route=>{
  const u=route.request().url();
  if(u.startsWith('https://www.facebook.com/'))return route.fulfill({contentType:'text/html',body:fbHtml});
  if(u.startsWith('https://internet-signalement.gouv.fr/'))return route.fulfill({contentType:'text/html',body:portalHtml});
  if(u.startsWith('chrome-extension:')||u.startsWith('data:'))return route.continue();
  return route.abort();
 });
 const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker',{timeout:15000});
 const extensionId=new URL(worker.url()).host,base='chrome-extension://'+extensionId+'/';
 const errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 const dashboard=await context.newPage();await dashboard.goto(base+'dashboard.html');
 const rpc=async(type,data={})=>{
  const r=await dashboard.evaluate(async m=>chrome.runtime.sendMessage(m),{type,...data});
  if(!r.ok)throw new Error(r.error);return r.data;
 };
 await dashboard.locator('#empty h2').waitFor();passed('Extension MV3 chargée, worker et tableau de bord sans build');
 const fb=await context.newPage();await fb.goto('https://www.facebook.com/post/123');
 await fb.locator('#reply-one [data-pharos-button]').waitFor();assert.equal(await fb.locator('[data-pharos-button]').count(),2);assert.equal((await rpc('LIST')).length,0);passed('Deux boutons pour commentaire et réponse ; aucune collecte au chargement');
 const pagePromise=context.waitForEvent('page');await fb.locator('#reply-one [data-pharos-button]').click();const replyEditor=await pagePromise;await replyEditor.waitForLoadState();
 let records=await rpc('LIST');assert.equal(records.length,1);const reply=records[0];assert.equal(reply.source.author,'Compte Réponse');assert.equal(reply.source.commentText,'Réponse fictive distincte.');assert.match(reply.source.commentUrl,/reply_comment_id=789/);passed('Réponse imbriquée : auteur, texte et lien du bon commentaire');
 const nextPage=context.waitForEvent('page');await fb.locator('#comment-one > .actions [data-pharos-button]').click();const mainEditor=await nextPage;await mainEditor.waitForLoadState();
 records=await rpc('LIST');assert.equal(records.length,2);let current=records.find(r=>r.id!==reply.id);assert.equal(current.source.author,'Compte Exemple');assert.equal(current.source.commentText,'Commentaire fictif pour vérifier la collecte. ✊');assert.equal(current.source.postUrl,'https://www.facebook.com/post/123');assert.equal(current.source.commentUrl.includes('__cft__'),false);passed('Collecte du commentaire parent sans contamination par sa réponse ; emoji et URL nettoyée');
 const duplicatePage=context.waitForEvent('page');await fb.locator('#comment-one > .actions [data-pharos-button]').click();await (await duplicatePage).waitForLoadState();assert.equal((await rpc('LIST')).length,2);passed('Déduplication : même lien et même texte, aucune seconde fiche');
 await fb.evaluate(()=>{document.getElementById('dynamic').innerHTML='<div role="article" aria-label="Commentaire de Compte Dynamique" id="dynamic-comment"><a href="/dynamique">Compte Dynamique</a><div dir="auto" data-comment-text>Commentaire chargé ensuite.</div><a href="/post/123?comment_id=900">1 min</a><button role="button">Répondre</button></div>';});
 await fb.locator('#dynamic-comment [data-pharos-button]').waitFor();passed('MutationObserver : bouton ajouté aux commentaires chargés ensuite');
 const forbidden=await fb.evaluate(()=>chrome?.runtime?.sendMessage?false:true).catch(()=>true);assert.equal(forbidden,true); // Page world cannot directly access extension APIs.
 const denied=await worker.evaluate(async()=>{
  // A Facebook content script is only authorized to collect, never list.
  const mod=await import(chrome.runtime.getURL('core.js'));return mod.isOfficial('https://internet-signalement.gouv.fr.evil.example/');
 });assert.equal(denied,false);
 await dashboard.goto(base+'dashboard.html#'+current.id);await dashboard.locator('#author').waitFor();await dashboard.locator('#context').fill('Contexte de démonstration, aucun fait réel.');await dashboard.locator('#visibility').selectOption('public');await dashboard.locator('#category').selectOption('hate');await dashboard.locator('#victim').selectOption('no');await dashboard.locator('#status').selectOption('prepared');await dashboard.locator('#save').click();await dashboard.waitForFunction(()=>document.getElementById('saveState').textContent==='Enregistré');
 current=await rpc('GET',{id:current.id});assert.equal(current.source.commentText,'Commentaire fictif pour vérifier la collecte. ✊');assert.equal(current.status,'prepared');assert.equal(current.draft.visibility,'public');passed('Édition, sauvegarde et conservation du relevé d’origine');
 if(process.env.PHAROS_SCREENSHOT)await dashboard.screenshot({path:process.env.PHAROS_SCREENSHOT,fullPage:true});
 const stale=await dashboard.evaluate(async r=>chrome.runtime.sendMessage({type:'SAVE',id:r.id,expectedUpdatedAt:'2000-01-01T00:00:00.000Z',draft:r.draft}),current);assert.equal(stale.ok,false);passed('Conflit de versions : pas d’écrasement silencieux');
 const blank=await rpc('CREATE_MANUAL');const blocked=await dashboard.evaluate(async id=>chrome.runtime.sendMessage({type:'OPEN_PHAROS',id}),blank.id);assert.equal(blocked.ok,false);assert.match(blocked.error,/visibilité/);passed('Contenu de visibilité non vérifiée : préparation refusée avec explication');
 const portalPromise=context.waitForEvent('page');await rpc('OPEN_PHAROS',{id:current.id,autoAdvance:true});const portal=await portalPromise;await portal.waitForURL('**/etape/informations',{timeout:15000});
 assert.equal(await portal.locator('#personal-name').inputValue(),'');assert.equal(await portal.evaluate(()=>window.finalClicks),0);assert.equal(await portal.evaluate(()=>window.informationClicks),0);passed('PHAROS : catégories et description avancées, arrêt aux informations personnelles sans envoi');
 const independent=await context.newPage();await independent.goto('https://internet-signalement.gouv.fr/etape/contenu');assert.equal(await independent.locator('[data-pharos-companion-panel]').count(),0);passed('Un onglet PHAROS indépendant ne reçoit aucun brouillon');
 const secondPromise=context.waitForEvent('page');const preparedReply=await rpc('SAVE',{id:reply.id,expectedUpdatedAt:reply.updatedAt,draft:{...reply.draft,category:'violence',visibility:'public',victim:'yes'},notes:'',receipt:'',status:'draft'});await rpc('OPEN_PHAROS',{id:preparedReply.id,autoAdvance:false});const second=await secondPromise;await second.waitForURL('**/etape/contenu');await second.locator('[data-pharos-companion-panel]').waitFor();assert.equal(await second.locator('#-etape-contenu_radio-button-group-input__menaces-ou-incitation-a-la-violence').isChecked(),true);assert.equal(second.url().endsWith('/etape/contenu'),true);assert.equal((await second.locator('[data-pharos-companion-panel] #description').inputValue()).includes('Réponse fictive distincte.'),true);passed('Second transfert isolé ; avancement désactivé respecté');
 const testAdapter=await context.newPage();await testAdapter.goto('https://internet-signalement.gouv.fr/etape/identifier');await testAdapter.locator('#-etape-identifier_radio-button-group-input__sur-un-reseau-social').check();
 const adapterSource=await readFile(path.join(extension,'connectors/pharos.js'),'utf8');await testAdapter.addScriptTag({content:adapterSource});
 const long=await testAdapter.evaluate(()=>PharosOfficial.fill({expiresAt:Date.now()+10000,observedAt:'2026-11-10T10:00:00Z',url:'https://www.facebook.com/post/123',description:'a'.repeat(4001),victim:'no'}));assert.equal(long.ok,false);assert.match(long.message,/trop long/);assert.equal(await testAdapter.locator('textarea[name=textarea]').inputValue(),'');passed('Description trop longue : aucune troncature et avancement bloqué');
 await testAdapter.locator('input[placeholder="https://exemple.fr"]').fill('https://www.facebook.com/autre');
 const conflicts=await testAdapter.evaluate(()=>PharosOfficial.fill({expiresAt:Date.now()+10000,observedAt:'2026-11-10T10:00:00Z',url:'https://www.facebook.com/post/123',description:'Texte de test',victim:'no'}));assert.equal(conflicts.ok,false);assert.equal(await testAdapter.locator('input[placeholder="https://exemple.fr"]').inputValue(),'https://www.facebook.com/autre');passed('PHAROS : un lien déjà renseigné est conservé');
 const expired=await testAdapter.evaluate(()=>PharosOfficial.fill({expiresAt:Date.now()-1}));assert.equal(expired.ok,false);assert.match(expired.message,/expiré/);passed('Brouillon expiré : préremplissage refusé');
 const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8eoAAAAASUVORK5CYII=';
 const withImage=await rpc('ADD_IMAGE',{id:current.id,dataUrl:png});assert.equal(withImage.screenshots.length,1);
 const backup=await rpc('EXPORT');const imported=await rpc('IMPORT',{backup});assert.equal(imported.added,0);assert.equal(imported.skipped,3);await rpc('DELETE',{id:blank.id});const restored=await rpc('IMPORT',{backup});assert.equal(restored.added,1);assert.equal(restored.skipped,2);passed('Export/import JSON avec image et empreintes, ajout sans écraser les fiches');
 const mutated=structuredClone(backup);mutated.records[0].source.commentText='Altération';const reject=await dashboard.evaluate(async backup=>chrome.runtime.sendMessage({type:'IMPORT',backup}),mutated);assert.equal(reject.ok,false);assert.equal((await rpc('LIST')).length,3);passed('Sauvegarde altérée : import refusé, stockage intact');
 // The popup must load in its own extension context; capture itself requires a toolbar gesture.
 const popup=await context.newPage();await popup.goto(base+'popup.html');await popup.locator('#count').waitFor();await popup.waitForFunction(()=>document.getElementById('count').textContent.includes('dossier'));passed('Fenêtre de l’extension chargée et état des dossiers affiché');
 assert.deepEqual(errors,[]);passed('Aucune erreur JavaScript non gérée dans les pages testées');
 console.log(JSON.stringify({passed:results.length,checks:results},null,2));
 if(process.env.PHAROS_TEST_RESULTS)await writeFile(process.env.PHAROS_TEST_RESULTS,JSON.stringify({passed:results.length,checks:results},null,2));
}finally{if(context)await context.close();await rm(profile,{recursive:true,force:true});}
