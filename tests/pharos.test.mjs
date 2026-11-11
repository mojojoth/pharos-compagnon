import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{JSDOM}=require(process.env.PHAROS_JSDOM_PATH||'jsdom');
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root),'utf8');
const fixture=await read('tests/fixtures/pharos.html'),adapter=await read('extension/connectors/pharos.js'),content=await read('extension/pharos-content.js');
const url='https://internet-signalement.gouv.fr/etape/identifier';
const h={expiresAt:Date.now()+60000,url:'https://www.facebook.com/page/posts/123?comment_id=456',description:'Commentaire fictif de test.',observedAt:'2026-11-10T10:00:00Z',victim:'yes',autoAdvance:true};
function page({initial=false,delay=0,ignore=false,hidden=false}={}){
 const d=new JSDOM(fixture,{url,runScripts:'dangerously',pretendToBeVisual:true}),w=d.window;
 w.HTMLElement.prototype.getClientRects=function(){return this.hidden||this.style.display==='none'?[]:[{width:30,height:30}];};
 w.chrome={runtime:{sendMessage:async()=>({ok:true,data:{...h}})}};
 const input=w.document.getElementById('identifier_checkbox__je-suis-la-victime-du-signalement'),oldLabel=input.parentElement;
 const group=w.document.createElement('div');group.className='fr-checkbox-group';
 const label=w.document.createElement('label');label.htmlFor=input.id;label.textContent='Je suis la victime du signalement';label.className='fr-label';
 oldLabel.replaceWith(group);group.append(input,label);input.checked=initial;if(hidden)input.style.display='none';
 let selected=initial,clicks=0;
 // The public PHAROS component handles a click on its group, prevents the
 // checkbox's native default action, and binds checked to its own selected IDs.
 group.addEventListener('click',event=>{
  event.preventDefault();clicks++;
  if(ignore)return;
  selected=!selected;
  if(delay)w.setTimeout(()=>input.checked=selected,delay);else input.checked=selected;
 });
 w.eval(adapter);return {d,w,input,label,model:()=>selected,clicks:()=>clicks};
}
async function until(fn,timeout=5000){const start=Date.now();while(!fn()){if(Date.now()-start>timeout)throw new Error('Le portail simulé ne confirme pas le résultat attendu.');await new Promise(r=>setTimeout(r,15));}}
test('Régression PHAROS : Oui et Non conservés malgré preventDefault du bloc',()=>{
 for(const choice of ['yes','no']){
  const p=page({initial:choice==='no'});
  try{const result=p.w.PharosOfficial.fill({...h,victim:choice});assert.equal(result.ok,true);assert.equal(p.input.checked,choice==='yes');assert.equal(p.model(),choice==='yes');assert.equal(p.clicks(),1);}
  finally{p.d.window.close();}
 }
});
test('PHAROS : rendu différé confirmé avec un seul clic sur le libellé',async()=>{
 const p=page({delay:40});
 try{const api=p.w.PharosOfficial,first=api.fill(h);assert.equal(first.pending,true);assert.equal(first.ok,false);await until(()=>p.input.checked);const second=api.fill(h);assert.equal(second.ok,true);assert.equal(p.model(),true);assert.equal(p.clicks(),1);}
 finally{p.d.window.close();}
});
test('PHAROS : attendre la case confirmée avant d’avancer, arrêt avant l’envoi',async()=>{
 const p=page({delay:40});
 try{p.w.eval(content);await until(()=>p.w.location.pathname==='/etape/informations');assert.equal(p.model(),true);assert.equal(p.clicks(),1);assert.equal(p.w.informationClicks,0);assert.equal(p.w.finalClicks,0);}
 finally{p.d.window.close();}
});
test('PHAROS : absence de confirmation, pas de clics répétés ni d’avancement',()=>{
 const p=page({ignore:true});
 try{const api=p.w.PharosOfficial,first=api.fill(h);assert.equal(first.pending,true);const now=p.w.Date.now();p.w.Date.now=()=>now+10000;const result=api.fill(h);assert.equal(result.ok,false);assert.notEqual(result.pending,true);assert.equal(api.advance(result),false);assert.equal(p.clicks(),1);assert.equal(p.input.checked,false);}
 finally{p.d.window.close();}
});
test('PHAROS : libellé visible utilisable avec une case native masquée',()=>{
 const p=page({hidden:true});
 try{const result=p.w.PharosOfficial.fill(h);assert.equal(result.ok,true);assert.equal(p.input.checked,true);assert.equal(p.model(),true);assert.equal(p.clicks(),1);}
 finally{p.d.window.close();}
});
