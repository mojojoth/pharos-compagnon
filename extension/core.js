import './connectors/facebook-urls.js';
export const facebookLinks=globalThis.PharosFacebookUrls;
export const VERSION = 1;
export const CATEGORIES = {
  "": "À choisir",
  hate: "Incitation à la haine",
  insult: "Injure ou diffamation",
  violence: "Menaces ou incitation à la violence",
  other: "Autre catégorie — choisir sur PHAROS"
};
export const STATUSES = {draft:"Brouillon", prepared:"Préparé", reported:"Envoyé (déclaré par vous)", archived:"Archivé"};
export const MAX_IMAGE = 8 * 1024 * 1024;
export function text(value, max = 20000) {
  return typeof value === "string" ? value.replace(/\u0000/g, "").slice(0, max) : "";
}
export function safeUrl(value) {
  try {
    const url = new URL(text(value, 4000));
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return "";
    return url.href;
  } catch { return ""; }
}
export function facebookUrl(value) {
  try {
    const u = new URL(safeUrl(value));
    if (!['www.facebook.com','facebook.com','m.facebook.com','mbasic.facebook.com'].includes(u.hostname)) return "";
    return u.href;
  } catch { return ""; }
}
export function isOfficial(value) {
  try { const u = new URL(value); return u.protocol === 'https:' && ['internet-signalement.gouv.fr','www.internet-signalement.gouv.fr'].includes(u.hostname); }
  catch { return false; }
}
export function cleanSource(input = {}) {
  return {
    platform: input.platform === 'facebook' ? 'facebook' : 'manual',
    author: text(input.author, 500), authorUrl: safeUrl(input.authorUrl),
    commentText: text(input.commentText, 50000), commentUrl: safeUrl(input.commentUrl),
    postUrl: safeUrl(input.postUrl), pageUrl: safeUrl(input.pageUrl),
    observedAt: validDate(input.observedAt), displayedDate: text(input.displayedDate, 500),
    truncated: Boolean(input.truncated), rawVisibleText: text(input.rawVisibleText, 60000),
    captureMethod: input.captureMethod === 'selection' ? 'selection' : input.captureMethod === 'dom' ? 'dom' : 'manual'
  };
}
export function validDate(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : new Date().toISOString();
}
export function cleanDraft(input = {}, source = {}) {
  return {
    author: text(input.author ?? source.author, 500),
    text: text(input.text ?? source.commentText, 50000),
    commentUrl: safeUrl(input.commentUrl ?? source.commentUrl),
    postUrl: safeUrl(input.postUrl ?? source.postUrl),
    category: Object.hasOwn(CATEGORIES, input.category) ? input.category : '',
    victim: ['yes','no'].includes(input.victim) ? input.victim : '',
    visibility: ['public','restricted'].includes(input.visibility) ? input.visibility : 'unverified',
    context: text(input.context, 12000),
    description: text(input.description, 50000),
    customDescription: input.customDescription === true
  };
}
export async function hash(value) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), b=>b.toString(16).padStart(2,'0')).join('');
}
export async function newRecord(input) {
  const source = cleanSource(input);
  if(source.platform==='facebook'){
    source.authorUrl=facebookLinks.profileUrl(source.authorUrl);
    source.commentUrl=facebookLinks.commentUrl(source.commentUrl);
    source.postUrl=facebookLinks.postUrl(source.postUrl);
  }
  if (!source.commentText.trim() && !(source.platform==='manual' && source.captureMethod==='manual')) throw new Error('Le texte du commentaire est vide. Utilisez une fiche manuelle pour un contenu sans texte.');
  return {
    schemaVersion: VERSION, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    status: 'draft', source, sourceHash: await hash(JSON.stringify(source)), draft: cleanDraft({}, source),
    notes: '', receipt: '', screenshots: []
  };
}
export function description(record) {
  const d = record.draft, s = record.source;
  if (d.customDescription) return d.description;
  const lines = [
    "Je souhaite signaler le commentaire suivant, observé sur Facebook.",
    `Date et heure d’observation : ${new Date(s.observedAt).toLocaleString('fr-FR', {timeZoneName:'short'})}.`,
    `Nom affiché du compte : ${d.author || 'non relevé'}.`
  ];
  if (s.authorUrl) lines.push(`Profil affiché : ${s.authorUrl}`);
  if (d.commentUrl) lines.push(`Lien du commentaire : ${d.commentUrl}`);
  else lines.push("Lien direct du commentaire non récupéré ; le lien fourni doit être vérifié.");
  if (d.postUrl) lines.push(`Publication : ${d.postUrl}`);
  lines.push('', 'Texte du commentaire :', d.text);
  if (s.truncated) lines.push('', 'Attention : le texte était peut-être replié lors du relevé.');
  if (d.context.trim()) lines.push('', 'Contexte et motifs du signalement :', d.context.trim());
  lines.push('', 'Les noms ci-dessus sont ceux affichés par les comptes ; leur identité civile n’est pas vérifiée par cet outil.');
  return lines.join('\n');
}
export function summary(record) {
  const {screenshots, ...rest} = record;
  return {...rest, screenshotCount:screenshots.length};
}
export async function imageFromData(dataUrl, meta = {}) {
  if (typeof dataUrl !== 'string' || dataUrl.length > MAX_IMAGE || !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(dataUrl)) throw new Error('Capture invalide. PNG ou JPEG, 6 Mo maximum environ.');
  const b64 = dataUrl.split(',')[1];
  let bytes;
  try { bytes = Uint8Array.from(atob(b64), c=>c.charCodeAt(0)); } catch { throw new Error('Capture illisible.'); }
  const png = bytes[0]===137 && bytes[1]===80 && bytes[2]===78 && bytes[3]===71;
  const jpeg = bytes[0]===255 && bytes[1]===216 && bytes[2]===255;
  if ((!png && !jpeg) || (dataUrl.startsWith('data:image/png') && !png) || (dataUrl.startsWith('data:image/jpeg') && !jpeg)) throw new Error('Le fichier n’est pas une image PNG ou JPEG reconnue.');
  return {id:crypto.randomUUID(),dataUrl,sha256:await hash(bytes),at:validDate(meta.at),sourceUrl:safeUrl(meta.sourceUrl),method:meta.method==='viewport'?'viewport':'attachment'};
}
export async function verifyImport(input) {
  if (!input || input.schemaVersion !== VERSION || input.app !== 'pharos-compagnon' || !Array.isArray(input.records) || input.records.length > 1000) throw new Error('Sauvegarde PHAROS Compagnon v1 attendue (1 000 fiches maximum).');
  const results = [], seen = new Set();
  for (const raw of input.records) {
    if (!raw || !/^[a-f0-9-]{36}$/i.test(raw.id) || seen.has(raw.id)) throw new Error('Identifiant de fiche invalide ou en double.');
    seen.add(raw.id);
    const source = cleanSource(raw.source);
    const digest = await hash(JSON.stringify(source));
    if (digest !== raw.sourceHash) throw new Error('Empreinte de collecte différente : sauvegarde refusée.');
    if (!Array.isArray(raw.screenshots) || raw.screenshots.length>5) throw new Error('Nombre de captures invalide.');
    const screenshots=[];
    for(const rawImage of raw.screenshots) {
      const img=await imageFromData(rawImage.dataUrl,rawImage);
      if(img.sha256!==rawImage.sha256) throw new Error('Empreinte de capture différente : sauvegarde refusée.');
      screenshots.push(img);
    }
    results.push({schemaVersion:VERSION,id:raw.id,createdAt:validDate(raw.createdAt),updatedAt:validDate(raw.updatedAt),source,sourceHash:digest,
      draft:cleanDraft(raw.draft,source),status:Object.hasOwn(STATUSES,raw.status)?raw.status:'draft',notes:text(raw.notes),receipt:text(raw.receipt,1000),screenshots});
  }
  return results;
}
export function escapeHtml(value) { return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
export function evidenceHtml(records) {
  const e=escapeHtml;
  const sheets=records.map(r=>`<article><h1>Fiche de collecte</h1><p>${e(r.id)} · ${e(STATUSES[r.status])}</p>
    <h2>Relevé d’origine</h2><dl><dt>Observation</dt><dd>${e(r.source.observedAt)}</dd><dt>Nom affiché</dt><dd>${e(r.source.author||'Non relevé')}</dd><dt>Profil</dt><dd>${e(r.source.authorUrl)}</dd><dt>Commentaire</dt><dd>${e(r.source.commentUrl||'Lien direct non relevé')}</dd><dt>Publication</dt><dd>${e(r.source.postUrl)}</dd><dt>Page consultée</dt><dd>${e(r.source.pageUrl)}</dd><dt>Date affichée sur Facebook</dt><dd>${e(r.source.displayedDate||'Non relevée')}</dd><dt>Méthode</dt><dd>${e(r.source.captureMethod)}${r.source.truncated?' · Texte peut-être replié':''}</dd></dl>
    <pre>${e(r.source.commentText)}</pre><p class="hash">SHA-256 du relevé JSON : ${e(r.sourceHash)}</p>
    <details><summary>Texte visible du bloc collecté</summary><pre>${e(r.source.rawVisibleText)}</pre></details>
    <h2>Brouillon préparé</h2><pre>${e(description(r))}</pre><h2>Notes et référence de réception</h2><pre>${e(r.notes)}\n${e(r.receipt)}</pre>
    ${r.screenshots.map(i=>`<figure><img src="${e(i.dataUrl)}" alt="Capture jointe"><figcaption>${e(i.at)} · ${e(i.method)}<br>${e(i.sourceUrl)}<br>SHA-256 : ${e(i.sha256)}</figcaption></figure>`).join('')}
    <footer>Document préparé localement par PHAROS Compagnon, extension indépendante. Une empreinte contrôle l’intégrité d’un fichier ; elle ne certifie ni son authenticité ni sa date. Un signalement PHAROS ne remplace pas un dépôt de plainte.</footer></article>`).join('');
  return `<!doctype html><html lang="fr"><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'"><title>Dossier de collecte — PHAROS Compagnon</title><style>body{font:15px system-ui;max-width:900px;margin:40px auto;padding:20px;color:#142b35}h1{font-size:28px}h2{font-size:18px;margin-top:28px}dt{font-weight:700;margin-top:10px}dd{margin:2px 0;overflow-wrap:anywhere}pre{font:14px system-ui;white-space:pre-wrap;overflow-wrap:anywhere;background:#f0f4f3;padding:18px}img{max-width:100%}figure{margin:20px 0;break-inside:avoid}figcaption,footer,.hash{font-size:11px;overflow-wrap:anywhere;color:#4f6367}footer{border-top:1px solid #ccc;padding-top:15px}article+article{break-before:page}@media print{body{margin:0;max-width:none}article{page-break-after:always}details{display:block}pre{background:none;border:1px solid #ddd}}</style><body>${sheets}</body></html>`;
}
