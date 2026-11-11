/* Facebook adapter: visible DOM only, no requests or private API. */
(() => {
  'use strict';
  const U=globalThis.PharosFacebookUrls;
  const ARTICLE='[role="article"]',MESSAGE='[data-comment-text],[data-ad-preview="message"],[data-ad-comet-preview="message"]';
  function owned(element,scope) {
    const article=element.closest(ARTICLE);
    return scope.matches(ARTICLE)?article===scope:!article||!scope.contains(article);
  }
  const cleanUrl=value=>U.cleanUrl(value,location.href);
  const href=a=>a.getAttribute('href')||'';
  function textOf(element) {
    if(!element)return '';
    const clone=element.cloneNode(true);
    clone.querySelectorAll('[data-pharos-button],script,style,button,[role="button"],[role="article"],[hidden]').forEach(n=>n.remove());
    clone.querySelectorAll('img[alt]').forEach(i=>i.replaceWith(document.createTextNode(i.alt)));
    clone.querySelectorAll('br').forEach(n=>n.replaceWith(document.createTextNode('\n')));
    clone.querySelectorAll('div,p,li,blockquote').forEach(n=>n.appendChild(document.createTextNode('\n')));
    return (clone.textContent||'').replace(/\u200b/g,'').replace(/\n{3,}/g,'\n\n').trim();
  }
  function links(scope){return [...scope.querySelectorAll('a[href]')].filter(a=>owned(a,scope)&&!a.closest('[data-pharos-button]'));}
  function timestamp(a) {
    if(a.querySelector('time,abbr'))return true;
    const label=[a.getAttribute('aria-label'),a.textContent].filter(Boolean).join(' ').trim();
    return /^(?:il y a |à l['’]instant|hier\b|aujourd['’]hui\b|just now\b|yesterday\b|\d+\s*(?:min|mn|h|j|s|sem|d|w|hr|hour|day|week)\b)/i.test(label);
  }
  function nameOf(node) {
    let value=(node.innerText||node.textContent||'').replace(/\s+/g,' ').trim();
    if(!value)value=(node.getAttribute('aria-labelledby')||'').split(/\s+/).map(id=>document.getElementById(id)?.textContent||'').join(' ').trim();
    if(!value)value=(node.getAttribute('aria-label')||'').trim();
    value=value.replace(/^(?:ouvrir|voir|afficher|visiter)\s+(?:le\s+)?profil\s+(?:de\s+|d['’])/i,'').replace(/^(?:open|view|visit)\s+(?:the\s+)?profile\s+(?:of\s+)?/i,'');
    if(/^(?:photo(?: de profil)?(?: de .*)?|profile picture(?: of .*)?|avatar|profil|profile|j['’]aime|like|répondre|reply)$/i.test(value))return '';
    return value;
  }
  function labelAuthor(scope) {
    const label=scope.getAttribute('aria-label')||'';
    const match=label.match(/^(?:commentaire|réponse)\s+(?:de|par)\s+(.+)$|^(?:comment|reply)\s+by\s+(.+)$/i);
    return (match?.[1]||match?.[2]||'').replace(/\s+(?:il y a\s+.+|\d+\s+(?:minutes?|hours?|days?)\s+ago)$/i,'').trim();
  }
  function author(scope,items) {
    const profiles=items.filter(a=>U.profileUrl(href(a),location.href)&&!a.closest(MESSAGE));
    const score=a=>Number(Boolean(a.closest('h3,h4')))*8+Number(Boolean((a.textContent||'').trim()))*4+Number(Boolean(a.getAttribute('aria-label')));
    profiles.sort((a,b)=>score(b)-score(a));
    for(const a of profiles){const name=nameOf(a);if(name&&!timestamp(a))return {name,url:U.profileUrl(href(a),location.href),element:a};}
    const heading=[...scope.querySelectorAll('h3,h4,[role="link"]:not([href])')].find(n=>owned(n,scope)&&!n.closest(MESSAGE)&&nameOf(n));
    return {name:heading?nameOf(heading):labelAuthor(scope),url:profiles[0]?U.profileUrl(href(profiles[0]),location.href):'',element:heading||profiles[0]||null};
  }
  function messageNode(scope,person,items) {
    const times=items.filter(timestamp);
    const candidates=[...scope.querySelectorAll(MESSAGE+',[dir="auto"]')]
      .filter(n=>owned(n,scope)&&!n.closest('a,button,[role="button"],[contenteditable="true"],h3,h4')&&!n.querySelector(ARTICLE)&&!(person.element&&n.contains(person.element))&&!times.some(a=>n.contains(a)))
      .map(n=>({node:n,text:textOf(n),explicit:n.matches(MESSAGE)})).filter(v=>v.text);
    candidates.sort((a,b)=>Number(b.explicit)-Number(a.explicit)||b.text.length-a.text.length);
    return candidates[0]?.node||null;
  }
  function permalink(scope,body,items=links(scope)) {
    const candidates=items.filter(a=>U.commentUrl(href(a),location.href)&&!a.closest(MESSAGE)&&!(body&&body.contains(a)));
    candidates.sort((a,b)=>Number(timestamp(b))-Number(timestamp(a))||Number(Boolean(U.commentIds(href(b),location.href).replyId))-Number(Boolean(U.commentIds(href(a),location.href).replyId)));
    return candidates[0]||null;
  }
  function isComment(scope) {
    if(/^(?:comment(?:aire)?\b|réponse\b|reply\b)/i.test(scope.getAttribute('aria-label')||''))return true;
    if(scope.hasAttribute('data-commentid')||scope.hasAttribute('data-comment-id'))return true;
    return links(scope).some(a=>!a.closest(MESSAGE)&&Boolean(U.commentUrl(href(a),location.href)));
  }
  function discover(root=document) {
    const selector=ARTICLE+',[data-commentid],[data-comment-id]',candidates=new Set();
    if(root.matches?.(selector)&&isComment(root))candidates.add(root);
    root.querySelectorAll?.(selector).forEach(a=>{if(isComment(a))candidates.add(a);});
    root.querySelectorAll?.('a[href*="comment_id="]').forEach(a=>{
      if(a.closest(ARTICLE))return;const c=a.closest('[data-commentid],[data-comment-id],li');if(c)candidates.add(c);
    });
    return [...candidates];
  }
  function nearbyPost(scope) {
    for(let container=scope.parentElement;container;container=container.parentElement){
      if(!container.matches(ARTICLE+', [role="dialog"]'))continue;
      const items=[...container.querySelectorAll('a[href]')].filter(a=>
        !scope.contains(a)&&!a.closest(MESSAGE)&&U.postUrl(href(a),location.href)&&
        (container.matches(ARTICLE)?owned(a,container):!a.closest(ARTICLE)));
      const dated=items.filter(timestamp),chosen=dated.length?dated:items;
      const targets=[...new Set(chosen.map(a=>U.postUrl(href(a),location.href)))];
      if(targets.length===1)return targets[0];
      if(targets.length>1)break;
    }
    return U.postUrl(location.href);
  }
  function identifiers(scope,items,body) {
    const pairs=items.filter(a=>!a.closest(MESSAGE)&&!(body&&body.contains(a))).map(a=>U.commentIds(href(a),location.href));
    const explicit=scope.getAttribute('data-commentid')||scope.getAttribute('data-comment-id');
    if(explicit&&/^\d+$/.test(explicit))pairs.push({commentId:explicit,replyId:''});
    const comments=new Set(pairs.map(p=>p.commentId).filter(Boolean)),replies=new Set(pairs.map(p=>p.replyId).filter(Boolean));
    if(comments.size!==1||replies.size>1)return null;
    return {commentId:[...comments][0],replyId:[...replies][0]||''};
  }
  function extract(scope) {
    const items=links(scope),person=author(scope,items),body=messageNode(scope,person,items),direct=permalink(scope,body,items);
    let commentText=textOf(body);
    if(!commentText){const clone=scope.cloneNode(true);clone.querySelectorAll('a,button,h3,h4,[role="button"],[role="article"],[data-pharos-button]').forEach(n=>n.remove());commentText=textOf(clone);}
    const actual=direct?U.commentUrl(href(direct),location.href):'';
    const postUrl=actual?U.postUrl(actual):nearbyPost(scope);
    const ids=actual?null:identifiers(scope,items,body);
    const commentUrl=actual||(ids?U.makeCommentUrl(postUrl,ids):'');
    const dated=direct||items.find(timestamp),time=dated?.querySelector('time,abbr');
    const truncated=[...scope.querySelectorAll('[role="button"],a,button')].some(n=>owned(n,scope)&&/^(voir plus|afficher la suite|see more|more)$/i.test(n.textContent.trim()));
    return {platform:'facebook',author:person.name,authorUrl:person.url,commentText,commentUrl,postUrl,pageUrl:cleanUrl(location.href),
      observedAt:new Date().toISOString(),displayedDate:time?.getAttribute('datetime')||time?.getAttribute('title')||dated?.getAttribute('aria-label')||dated?.textContent.trim()||'',truncated,rawVisibleText:textOf(scope),captureMethod:'dom'};
  }
  function insertionPoint(scope) {
    const reply=[...scope.querySelectorAll('button,[role="button"],a')].find(n=>owned(n,scope)&&/^(répondre|reply)$/i.test(n.textContent.trim()));
    if(reply?.parentElement&&reply.parentElement!==scope&&!reply.parentElement.contains(scope.querySelector(MESSAGE)))return reply.parentElement;
    return scope;
  }
  globalThis.PharosFacebook={discover,extract,insertionPoint,cleanUrl};
})();

