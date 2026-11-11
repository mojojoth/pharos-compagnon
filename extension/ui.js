export async function rpc(type,data={}) {
  const r=await chrome.runtime.sendMessage({type,...data});
  if(!r?.ok) throw new Error(r?.error||'L’extension ne répond pas. Rechargez-la dans chrome://extensions.');
  return r.data;
}
export function el(tag,className,value) {const n=document.createElement(tag);if(className)n.className=className;if(value!==undefined)n.textContent=value;return n;}
export function download(filename,contents,mime) {
  const url=URL.createObjectURL(new Blob([contents],{type:mime}));
  const link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
}
export async function copy(value) {
  try {await navigator.clipboard.writeText(value);}
  catch {throw new Error('La copie n’a pas abouti. Sélectionnez le texte et utilisez ⌘C.');}
}
