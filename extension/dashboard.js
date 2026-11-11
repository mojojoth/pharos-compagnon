import {description,STATUSES,evidenceHtml,facebookLinks} from './core.js';
import {rpc,el,download,copy} from './ui.js';
const $=id=>document.getElementById(id);
let records=[],selected=null,dirty=false,toastTimer;
function toast(message,error=false){$('toast').textContent=message;$('toast').classList.toggle('error',error);$('toast').hidden=false;window.clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>$('toast').hidden=true,error?8000:3800);}
function run(fn){return async()=>{try{await fn();}catch(e){toast(e.message,true);}};}
const inputIds=['author','comment','commentUrl','postUrl','visibility','category','victim','context','notes','status','receipt','custom','customText'];
function changed(){dirty=true;$('saveState').textContent='Modifications à enregistrer';updatePreview();}
function edited(){return {...selected,draft:{author:$('author').value,text:$('comment').value,commentUrl:$('commentUrl').value,postUrl:$('postUrl').value,visibility:$('visibility').value,category:$('category').value,victim:$('victim').value,context:$('context').value,customDescription:$('custom').checked,description:$('customText').value},notes:$('notes').value,receipt:$('receipt').value,status:$('status').value};}
function updatePreview(){if(!selected)return;const value=description(edited());$('preview').value=value;$('length').textContent=value.length.toLocaleString('fr-FR')+' / 4 000 caractères sur PHAROS';$('length').classList.toggle('over',value.length>4000);$('customText').hidden=!$('custom').checked;}
function renderList(){
  const query=$('search').value.toLocaleLowerCase('fr'),filter=$('filter').value;
  $('count').textContent=records.length;$('list').replaceChildren();
  const filtered=records.filter(r=>(!filter||r.status===filter)&&(!query||[r.draft.author,r.draft.text,r.notes].join(' ').toLocaleLowerCase('fr').includes(query)));
  for(const r of filtered){
    const button=el('button','record-item'+(selected?.id===r.id?' active':''));button.setAttribute('aria-pressed',String(selected?.id===r.id));
    const top=el('div','record-top');top.append(el('span','record-author',r.draft.author||'Auteur à compléter'),el('span','record-status',r.status==='reported'?'Envoi déclaré':STATUSES[r.status]));
    button.append(top,el('div','record-excerpt',r.draft.text||'Fiche manuelle à compléter'),el('div','record-date',new Date(r.createdAt).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})+' · '+r.screenshotCount+' capture'+(r.screenshotCount>1?'s':'')));
    button.addEventListener('click',run(()=>select(r.id)));$('list').appendChild(button);
  }
  if(!filtered.length)$('list').appendChild(el('p','no-results',query||filter?'Aucun dossier correspondant.':'Vos commentaires collectés apparaîtront ici.'));
}
async function refresh(){records=await rpc('LIST');renderList();}
async function select(id,force=false){
  if(dirty&&!force&&!confirm('Quitter cette fiche sans enregistrer vos modifications ?'))return;
  const recordChanged=selected?.id!==id;
  selected=await rpc('GET',{id});dirty=false;location.hash=id;
  $('empty').hidden=true;$('editor').hidden=false;
  const r=selected,d=r.draft;
  $('title').textContent=d.author||'Auteur à compléter';$('meta').textContent='Observé le '+new Date(r.source.observedAt).toLocaleString('fr-FR')+' · '+r.id.slice(0,8);
  const values={author:d.author,comment:d.text,commentUrl:d.commentUrl,postUrl:d.postUrl,visibility:d.visibility,category:d.category,victim:d.victim||'',context:d.context,notes:r.notes,status:r.status,receipt:r.receipt,customText:d.description};
  for(const [id,value] of Object.entries(values))$(id).value=value;
  $('custom').checked=d.customDescription;$('saveState').textContent='Enregistré';
  const warnings=[];if(r.source.truncated)warnings.push('Le commentaire était peut-être replié. Dépliez-le sur Facebook et vérifiez le texte complet.');
  if(!d.author)warnings.push('Le nom de l’auteur n’a pas été relevé. Vérifiez le nom affiché sur Facebook et complétez-le.');
  if(!d.commentUrl)warnings.push('Le lien direct du commentaire manque. Sur Facebook, cliquez sur sa date puis copiez le lien.');
  else if(!facebookLinks.commentUrl(d.commentUrl))warnings.push('Le lien du commentaire ne correspond pas à un commentaire reconnu : il peut s’agir d’un profil récupéré par l’ancienne version. Collectez à nouveau le commentaire ou corrigez le lien.');
  if(!d.postUrl)warnings.push('Le lien de la publication manque. Ouvrez la publication et copiez son adresse.');
  else if(!facebookLinks.postUrl(d.postUrl))warnings.push('Le lien de la publication ne correspond pas à une publication reconnue. Un profil ne doit pas être utilisé à sa place.');
  if(r.source.captureMethod==='selection')warnings.push('Collecte par sélection : vérifiez le nom, le texte et les liens.');
  if(r.source.captureMethod==='manual')warnings.push('Fiche créée manuellement : complétez les faits et joignez vos captures.');
  $('notice').textContent=warnings.join('\n');$('notice').hidden=!warnings.length;
  $('originalText').textContent=r.source.commentText||'Aucun texte relevé automatiquement.';$('sourceHash').value=r.sourceHash;
  $('sourceMeta').replaceChildren();
  for(const [label,value] of [['Nom affiché',r.source.author],['Commentaire',r.source.commentUrl],['Publication',r.source.postUrl],['Page consultée',r.source.pageUrl],['Date affichée',r.source.displayedDate],['Méthode',r.source.captureMethod]])$('sourceMeta').appendChild(el('p','',label+' : '+(value||'Non relevé')));
  $('images').replaceChildren();
  for(const image of r.screenshots){const box=el('div','image-item'),link=el('a');link.href=image.dataUrl;link.download='capture-'+image.id+(image.dataUrl.startsWith('data:image/jpeg')?'.jpg':'.png');const img=el('img');img.src=image.dataUrl;img.alt='Capture jointe du '+new Date(image.at).toLocaleString('fr-FR');link.appendChild(img);box.append(link,el('span','',new Date(image.at).toLocaleString('fr-FR')));$('images').appendChild(box);}
  renderList();updatePreview();
  if(recordChanged)document.querySelector('.workspace').scrollTop=0;
}
async function save(){
  if(!selected||!dirty)return selected;
  const r=edited();selected=await rpc('SAVE',{id:r.id,expectedUpdatedAt:selected.updatedAt,draft:r.draft,notes:r.notes,status:r.status,receipt:r.receipt});
  dirty=false;$('saveState').textContent='Enregistré';$('title').textContent=selected.draft.author||'Auteur à compléter';await refresh();return selected;
}
async function createManual(){if(dirty&&!confirm('Quitter sans enregistrer les modifications ?'))return;const r=await rpc('CREATE_MANUAL');await refresh();await select(r.id,true);$('comment').focus();}
for(const id of inputIds)$(id).addEventListener('input',()=>{if(id==='custom'&&$('custom').checked&&!$('customText').value)$('customText').value=description({...selected,draft:{...edited().draft,customDescription:false}});changed();});
$('search').addEventListener('input',renderList);$('filter').addEventListener('change',renderList);
$('new').onclick=run(createManual);$('emptyNew').onclick=run(createManual);$('save').onclick=run(async()=>{await save();toast('Fiche enregistrée.');});
$('copy').onclick=run(async()=>{await copy($('preview').value);toast('Description copiée.');});
$('pharos').onclick=run(async()=>{await save();await rpc('OPEN_PHAROS',{id:selected.id,autoAdvance:$('autoAdvance').checked});toast('Brouillon ouvert sur le portail officiel.');});
$('exportAll').onclick=run(async()=>{await save();const backup=await rpc('EXPORT');download('pharos-sauvegarde-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(backup,null,2),'application/json');toast('Sauvegarde téléchargée. Conservez-la avant de retirer l’extension.');});
$('exportOne').onclick=run(async()=>{await save();const r=await rpc('GET',{id:selected.id});download('pharos-fiche-'+r.id.slice(0,8)+'.json',JSON.stringify({app:'pharos-compagnon',schemaVersion:1,exportedAt:new Date().toISOString(),records:[r]},null,2),'application/json');});
$('print').onclick=run(async()=>{await save();const r=await rpc('GET',{id:selected.id});download('pharos-dossier-'+r.id.slice(0,8)+'.html',evidenceHtml([r]),'text/html');toast('Ouvrez le fichier HTML puis utilisez ⌘P → Enregistrer au format PDF.');});
$('importBackup').onclick=()=>$('importFile').click();
$('importFile').onchange=run(async()=>{const file=$('importFile').files[0];$('importFile').value='';if(!file)return;if(file.size>50*1024*1024)throw new Error('Sauvegarde trop volumineuse : maximum 50 Mo.');const result=await rpc('IMPORT',{backup:JSON.parse(await file.text())});await refresh();toast(result.added+' fiche(s) importée(s), '+result.skipped+' déjà présente(s), conservée(s).');if(!selected&&records.length)await select(records[0].id);});
$('addImage').onclick=()=>$('imageFile').click();
$('imageFile').onchange=run(async()=>{const file=$('imageFile').files[0];$('imageFile').value='';if(!file||!selected)return;if(file.size>6*1024*1024)throw new Error('Capture trop volumineuse : maximum 6 Mo.');await save();const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Lecture impossible.'));reader.readAsDataURL(file);});await rpc('ADD_IMAGE',{id:selected.id,dataUrl});await refresh();await select(selected.id,true);toast('Capture jointe.');});
$('delete').onclick=run(async()=>{if(!selected||!confirm('Supprimer définitivement cette fiche et ses captures ? Exportez-la d’abord si vous souhaitez la conserver.'))return;await rpc('DELETE',{id:selected.id});selected=null;dirty=false;location.hash='';await refresh();if(records.length)await select(records[0].id,true);else{$('editor').hidden=true;$('empty').hidden=false;}toast('Fiche supprimée.');});
document.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key==='s'){event.preventDefault();run(save)();}});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
chrome.storage.onChanged.addListener((_changes,area)=>{if(area==='local')refresh().catch(e=>toast(e.message,true));});
run(async()=>{await refresh();const id=location.hash.slice(1);if(id)try{await select(id,true);}catch(e){toast(e.message,true);}else if(records.length)await select(records[0].id,true);})();
