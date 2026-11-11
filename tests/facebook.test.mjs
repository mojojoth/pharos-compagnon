import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {JSDOM}=require(process.env.PHAROS_JSDOM_PATH||'jsdom');
const adapter=await readFile(new URL('../extension/connectors/facebook.js',import.meta.url),'utf8');
const urls=await readFile(new URL('../extension/connectors/facebook-urls.js',import.meta.url),'utf8');
const post='https://www.facebook.com/page.exemple/posts/pfbidPublication123';
function comment({body='Texte du commentaire.',author='Compte Exemple',ids='comment_id=456',extra='',label='',idAttr=''}={}) {
 return `<div role="article" aria-label="${label||'Commentaire de '+author}" id="target" ${idAttr}><a href="/compte.exemple?${ids}&amp;__cft__=tracking"><span>${author}</span></a><div dir="auto" data-comment-text>${body}</div><div><a href="/compte.exemple?${ids}">2 h</a> · <button role="button">Répondre</button></div>${extra}</div>`;
}
function inPost(inner,link=post){return `<div role="article" aria-label="Publication" id="post"><a href="/page.exemple">Page Exemple</a><a href="${link}"><time datetime="2026-11-10T09:00:00Z">Il y a 3 h</time></a>${inner}</div>`;}
function collect(html,page='https://www.facebook.com/page.exemple') {
 const d=new JSDOM(html,{url:page,runScripts:'outside-only'});
 try{d.window.eval(urls+'\n'+adapter);return JSON.parse(JSON.stringify(d.window.PharosFacebook.extract(d.window.document.getElementById('target'))));}
 finally{d.window.close();}
}
test('Régression : profil avec comment_id, auteur et publication distincts',()=>{
 const r=collect(inPost(comment()));
 assert.equal(r.author,'Compte Exemple');assert.equal(r.authorUrl,'https://www.facebook.com/compte.exemple');
 assert.equal(r.commentUrl,post+'?comment_id=456');assert.equal(r.postUrl,post);assert.equal(r.commentText,'Texte du commentaire.');
});
test('Régression : aucun profil présenté comme commentaire ou publication sans contexte',()=>{
 const r=collect(comment());assert.equal(r.author,'Compte Exemple');assert.equal(r.commentUrl,'');assert.equal(r.postUrl,'');
});
test('Publication consultée directement : reconstruire le lien avec le seul identifiant relevé',()=>{
 const r=collect(comment(),post);assert.equal(r.commentUrl,post+'?comment_id=456');assert.equal(r.postUrl,post);
});
test('Une réponse conserve comment_id et reply_comment_id sans reprendre son parent',()=>{
 const html=inPost(`<div role="article" aria-label="Commentaire de Parent"><a href="/parent?comment_id=456">Parent</a><div dir="auto">Texte parent.</div>${comment({author:'Compte Réponse',ids:'comment_id=456&amp;reply_comment_id=789',body:'Texte de la réponse.'})}</div>`);
 const r=collect(html);assert.equal(r.author,'Compte Réponse');assert.equal(r.commentText,'Texte de la réponse.');assert.equal(r.commentUrl,post+'?comment_id=456&reply_comment_id=789');assert.equal(r.postUrl,post);
});
test('Nom accessible et libellé du commentaire quand le nom n’est pas un texte de lien',()=>{
 const html=inPost('<div role="article" aria-label="Commentaire de Compte Accessible" id="target"><a href="/profile.php?id=321&amp;comment_id=456" aria-label="Ouvrir le profil de Compte Accessible"><img alt="Photo de profil"></a><div dir="auto">Texte accessible.</div></div>');
 const r=collect(html);assert.equal(r.author,'Compte Accessible');assert.equal(r.authorUrl,'https://www.facebook.com/profile.php?id=321');assert.equal(r.commentUrl,post+'?comment_id=456');
});
test('Le contexte de la publication proche prime sur une autre URL ouverte en arrière-plan',()=>{
 const r=collect(inPost(comment()),'https://www.facebook.com/autre/posts/pfbidAutre');assert.equal(r.postUrl,post);assert.equal(r.commentUrl,post+'?comment_id=456');
});
test('Un lien vers un autre commentaire cité dans le texte n’est pas le permalien du relevé',()=>{
 const r=collect(inPost(comment({body:'Voir <a href="https://www.facebook.com/autre/posts/other?comment_id=999">ce lien</a>.'})));assert.equal(r.commentUrl,post+'?comment_id=456');assert.equal(r.postUrl,post);
});
test('Plusieurs identifiants contradictoires : ne pas inventer un lien de commentaire',()=>{
 const r=collect(inPost(comment({extra:'<a href="/compte.exemple?comment_id=999">Lien ambigu</a>'})));assert.equal(r.commentUrl,'');assert.equal(r.postUrl,post);
});
test('Identifiant de commentaire porté explicitement par le bloc',()=>{
 const html=inPost('<div role="article" aria-label="Commentaire de Exemple" data-commentid="456" id="target"><a href="/compte.exemple">Exemple</a><div dir="auto">Texte.</div></div>');
 const r=collect(html);assert.equal(r.commentUrl,post+'?comment_id=456');
});
test('Les formes story, permalink, photo et vidéo gardent la ressource et retirent le profil',()=>{
 const forms=['https://www.facebook.com/permalink.php?story_fbid=123&id=321','https://www.facebook.com/story.php?story_fbid=123&id=321','https://www.facebook.com/photo.php?fbid=123','https://www.facebook.com/watch/?v=123','https://www.facebook.com/groups/321/posts/123/'];
 for(const parent of forms){const r=collect(inPost(comment(),parent));assert.equal(r.postUrl,parent);const expected=new URL(parent);expected.searchParams.set('comment_id','456');assert.equal(r.commentUrl,expected.href);}
});
