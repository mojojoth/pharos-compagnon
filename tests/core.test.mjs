import test from 'node:test';
import assert from 'node:assert/strict';
import {newRecord,cleanSource,cleanDraft,safeUrl,facebookUrl,isOfficial,description,hash,verifyImport,evidenceHtml,imageFromData} from '../extension/core.js';
const source={platform:'facebook',captureMethod:'dom',commentText:'Commentaire fictif pour les tests.',author:'Compte Exemple',commentUrl:'https://www.facebook.com/post/123?comment_id=456',postUrl:'https://www.facebook.com/post/123',pageUrl:'https://www.facebook.com/post/123',observedAt:'2026-11-10T10:00:00Z'};
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8eoAAAAASUVORK5CYII=';
const backup=r=>({app:'pharos-compagnon',schemaVersion:1,records:[r]});
test('URLs : protocoles dangereux et faux domaines rejetés',()=>{
  for(const u of ['javascript:alert(1)','data:text/html,x','https://name:password@example.org','file:///etc/passwd'])assert.equal(safeUrl(u),'');
  assert.equal(facebookUrl('https://facebook.com.evil.test/foo'),'');assert.equal(facebookUrl('https://www.facebook.com/post/123'),'https://www.facebook.com/post/123');
  assert.equal(isOfficial('https://internet-signalement.gouv.fr.evil.test/'),false);assert.equal(isOfficial('http://internet-signalement.gouv.fr/'),false);assert.equal(isOfficial('https://www.internet-signalement.gouv.fr/'),true);
});
test('Le relevé normalisé possède une empreinte stable',async()=>{
  const r=await newRecord(source);assert.equal(r.status,'draft');assert.equal(r.draft.category,'');assert.equal(r.draft.visibility,'unverified');
  assert.equal(r.sourceHash,await hash(JSON.stringify(r.source)));assert.deepEqual(cleanSource(r.source),r.source);
});
test('Modifier le brouillon préserve la collecte originale',async()=>{
  const r=await newRecord(source),original=structuredClone(r.source);r.draft.text='Correction';r.draft.author='Nom corrigé';
  assert.deepEqual(r.source,original);assert.match(description(r),/Correction/);assert.equal(r.sourceHash,await hash(JSON.stringify(original)));
});
test('Aucun texte fabriqué pour une fiche manuelle',async()=>{
  const r=await newRecord({platform:'manual',captureMethod:'manual',commentText:''});assert.equal(r.source.commentText,'');assert.equal(r.draft.text,'');
  await assert.rejects(()=>newRecord({...source,commentText:''}),/vide/);
});
test('Description personnalisée conservée sans troncature implicite',async()=>{
  const r=await newRecord(source);r.draft.customDescription=true;r.draft.description='a'.repeat(6000);assert.equal(description(r).length,6000);
});
test('Les propriétés non autorisées ne traversent pas la normalisation',()=>{
  const d=cleanDraft({category:'__proto__',visibility:'everyone',commentUrl:'javascript:alert(1)',admin:true});assert.equal(d.category,'');assert.equal(d.visibility,'unverified');assert.equal(d.commentUrl,'');assert.equal('admin' in d,false);
});
test('Aller-retour JSON avec vérification des captures',async()=>{
  const r=await newRecord(source);r.screenshots.push(await imageFromData(png,{sourceUrl:source.pageUrl}));
  const out=await verifyImport(JSON.parse(JSON.stringify(backup(r))));assert.equal(out[0].sourceHash,r.sourceHash);assert.equal(out[0].screenshots[0].sha256,r.screenshots[0].sha256);
});
test('Import altéré refusé avant écriture',async()=>{
  const r=await newRecord(source);r.source.commentText='Texte modifié';await assert.rejects(()=>verifyImport(backup(r)),/Empreinte/);
});
test('Identifiants en double et empreintes de capture invalides refusés',async()=>{
  const r=await newRecord(source);await assert.rejects(()=>verifyImport({...backup(r),records:[r,r]}),/double/);
  r.screenshots=[{...await imageFromData(png),sha256:'0'.repeat(64)}];await assert.rejects(()=>verifyImport(backup(r)),/capture/);
});
test('SVG et faux fichiers image refusés',async()=>{
  await assert.rejects(()=>imageFromData('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='),/invalide/);
  await assert.rejects(()=>imageFromData('data:image/png;base64,PHNjcmlwdD4='),/image/);
});
test('HTML imprimable : contenu échappé, pas de script ni de ressource distante',async()=>{
  const r=await newRecord({...source,commentText:'<script>alert(1)</script><img src="https://evil.test/x">'});
  const html=evidenceHtml([r]);assert.equal(html.includes('<script>'),false);assert.match(html,/&lt;script&gt;/);assert.match(html,/default-src 'none'/);assert.match(html,/authenticité/);
});
test('Collecte Facebook : un profil portant comment_id est retiré des liens de contenu',async()=>{
  const profile='https://www.facebook.com/profile.php?id=123&comment_id=456';
  const r=await newRecord({...source,authorUrl:profile,commentUrl:profile,postUrl:profile});
  assert.equal(r.source.authorUrl,'https://www.facebook.com/profile.php?id=123');assert.equal(r.source.commentUrl,'');assert.equal(r.source.postUrl,'');
  for(const path of ['/people/Posts/321','/pages/Videos/321','/groups/321/user/456']){
    const url='https://www.facebook.com'+path+'?comment_id=456';const record=await newRecord({...source,authorUrl:url,commentUrl:url,postUrl:url});assert.equal(record.source.commentUrl,'');assert.equal(record.source.postUrl,'');assert.equal(record.source.authorUrl,'https://www.facebook.com'+path);
  }
});
test('Compatibilité v1.0.0 : import des anciens relevés sans réécriture de leur origine',async()=>{
  const r=await newRecord(source);r.source.commentUrl='https://www.facebook.com/compte?comment_id=456';r.source.postUrl='https://www.facebook.com/compte';r.sourceHash=await hash(JSON.stringify(r.source));
  const restored=await verifyImport(backup(r));assert.deepEqual(restored[0].source,r.source);assert.equal(restored[0].sourceHash,r.sourceHash);
});
test('Choix victime : seules les valeurs Oui et Non explicites sont conservées',()=>{
  assert.equal(cleanDraft({victim:'yes'}).victim,'yes');assert.equal(cleanDraft({victim:'no'}).victim,'no');assert.equal(cleanDraft({victim:true}).victim,'');assert.equal(cleanDraft({}).victim,'');
});
