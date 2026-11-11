import {rpc} from './ui.js';
let state;
const $=id=>document.getElementById(id);
function task(fn){return async()=>{try{await fn();}catch(e){$('message').textContent=e.message;}};}
$('open').onclick=task(async()=>{await rpc('OPEN_DASHBOARD');window.close();});
$('edit').onclick=task(async()=>{await rpc('OPEN_DASHBOARD',{id:state.last.id});window.close();});
$('capture').onclick=task(async()=>{$('capture').disabled=true;try{const r=await rpc('CAPTURE',{id:state.last.id});$('message').textContent='Capture enregistrée dans la fiche ('+r.count+').';}finally{$('capture').disabled=false;}});
task(async()=>{state=await rpc('POPUP_STATE');$('count').textContent=state.count+' dossier'+(state.count>1?'s':'')+' sur cet ordinateur';if(state.canCapture){$('captureArea').hidden=false;$('author').textContent=state.last.draft.author||'Auteur à compléter';}})();
