/* Exact allowlist observed on the official portal on 10 November 2026.
   Only the first two steps can be advanced; no generic submit/click logic. */
(() => {
  'use strict';
  const categories={hate:'incitation-a-la-haine',insult:'injure-ou-diffamation',violence:'menaces-ou-incitation-a-la-violence'};
  const visible=e=>Boolean(e&&e.getClientRects().length&&!e.disabled);
  const byId=id=>document.getElementById(id);
  const victimChoices=new WeakMap();
  function setVictim(choice) {
    if(!['yes','no'].includes(choice))return {ok:false,reason:'Choisissez Oui ou Non pour « Je suis la victime du signalement » dans votre fiche.'};
    const element=byId('identifier_checkbox__je-suis-la-victime-du-signalement');
    if(!element||element.type!=='checkbox'||element.disabled)return {ok:false,reason:'La case « Je suis la victime du signalement » n’est pas reconnue. Vérifiez-la sur PHAROS.'};
    const label=[...element.labels||[]].find(visible),group=element.closest('.fr-checkbox-group');
    const target=label||(visible(group)?group:visible(element)?element:null);
    if(!target)return {ok:false,reason:'La case victime n’est pas encore disponible. Vérifiez-la sur PHAROS.'};
    const desired=choice==='yes';
    const previous=victimChoices.get(element);
    const pending=()=>({ok:false,pending:true,reason:'PHAROS prend en compte votre choix victime…'});
    if(previous?.choice===choice){
      if(element.checked===desired){previous.confirmed=true;return {ok:true};}
      if(previous.confirmed)return {ok:false,reason:'Votre modification de la case victime sur PHAROS est conservée. Vérifiez-la puis continuez vous-même.'};
      if(Date.now()<previous.deadline)return pending();
      return {ok:false,reason:'PHAROS n’a pas confirmé le choix victime. Cochez ou décochez la case sur le portail puis continuez vous-même.'};
    }
    const attempt={choice,confirmed:element.checked===desired,deadline:Date.now()+1500};
    victimChoices.set(element,attempt);
    if(attempt.confirmed)return {ok:true};
    // PHAROS handles a click on its checkbox group and calls preventDefault.
    // Clicking the input triggers native checkbox activation, which the browser
    // then rolls back. Click the visible associated label instead, once only.
    target.click();
    if(element.checked===desired){attempt.confirmed=true;return {ok:true};}
    return pending();
  }
  function setValue(element,value) {
    if(!visible(element)) return {ok:false,reason:'Champ absent ou masqué.'};
    if(element.value && element.value!==value) return {ok:false,reason:'Un champ déjà renseigné est conservé.'};
    if(element.maxLength>0 && value.length>element.maxLength) return {ok:false,reason:`Texte trop long pour PHAROS (${value.length} / ${element.maxLength}). Raccourcissez le brouillon.`};
    if(element.value===value) return {ok:true};
    const proto=element.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto,'value').set.call(element,value);
    element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}));
    return {ok:element.value===value,reason:'La page n’a pas accepté la valeur.'};
  }
  function choose(element) {
    if(!visible(element)) return {ok:false,reason:'Option officielle non reconnue.'};
    const chosen=[...document.querySelectorAll('input[type="radio"]')].find(r=>r.name===element.name&&r.checked&&r!==element);
    if(chosen) return {ok:false,reason:'Votre choix déjà présent est conservé. Vérifiez-le sur PHAROS.'};
    if(!element.checked) element.click();
    return {ok:element.checked,reason:'La page n’a pas accepté le choix.'};
  }
  function stage() {
    if(location.pathname==='/etape/contenu') return 'content';
    if(location.pathname==='/etape/identifier') return 'description';
    return 'manual';
  }
  function fill(h) {
    if(h.expiresAt<=Date.now()) return {ok:false,message:'Brouillon expiré. Rouvrez PHAROS depuis la fiche.'};
    const current=stage();
    if(current==='content') {
      const slug=categories[h.category];
      if(!slug) return {ok:false,message:'Choisissez vous-même la catégorie sur PHAROS.'};
      const result=choose(byId('-etape-contenu_radio-button-group-input__'+slug));
      return {ok:result.ok,message:result.ok?'Catégorie préparée.':result.reason,nextId:'template-etape_btn__next--etape-contenu'};
    }
    if(current==='description') {
      const victim=setVictim(h.victim);
      if(!victim.ok)return {ok:false,pending:victim.pending===true,message:victim.reason};
      const social=choose(byId('-etape-identifier_radio-button-group-input__sur-un-reseau-social'));
      if(!social.ok) return {ok:false,message:social.reason};
      const urlFields=[...document.querySelectorAll('input[placeholder="https://exemple.fr"]')].filter(visible);
      const descriptions=[...document.querySelectorAll('textarea[name="textarea"]')].filter(e=>visible(e)&&(e.placeholder||'').startsWith('Description détaillée des faits signalés.'));
      if(urlFields.length!==1||descriptions.length!==1) return {ok:false,message:'Les champs officiels ne sont pas encore reconnus. Réessayez ou copiez les informations.'};
      const date=new Date(h.observedAt), pad=n=>String(n).padStart(2,'0');
      const values=[
        setValue(urlFields[0],h.url),setValue(descriptions[0],h.description),
        setValue(byId('identifier_text-input-calendar'),`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`),
        setValue(byId('identifier_text-input-time'),`${pad(date.getHours())}:${pad(date.getMinutes())}`)
      ];
      const failure=values.find(v=>!v.ok);
      return {ok:!failure,message:failure?.reason||'Lien, description, choix victime et date d’observation préparés.',nextId:'template-etape_btn__next--etape-identifier'};
    }
    return {ok:false,message:'À vous : complétez les informations personnelles, relisez et validez sur PHAROS. Aucun envoi automatique.'};
  }
  function advance(result) {
    const allowed={content:'template-etape_btn__next--etape-contenu',description:'template-etape_btn__next--etape-identifier'};
    const id=allowed[stage()];
    if(!result.ok||!id||result.nextId!==id) return false;
    const button=byId(id);
    if(!visible(button)||button.tagName!=='BUTTON'||button.textContent.trim()!=='Continuer') return false;
    button.click();return true;
  }
  globalThis.PharosOfficial={fill,advance,stage};
})();
