/* Shared by the isolated Facebook script and the extension's own pages/worker.
   A comment_id parameter alone never turns a profile into a publication. */
(() => {
  'use strict';
  const hosts=new Set(['www.facebook.com','facebook.com','m.facebook.com','mbasic.facebook.com']);
  const tracking=new Set(['fbclid','mibextid','ref','refid','notif_id','notif_t','acontext']);
  function parse(value,base) {
    if(typeof value!=='string'||!value.trim()||value.trim().startsWith('#'))return null;
    try {
      const u=new URL(value,base);
      if(u.protocol!=='https:'||!hosts.has(u.hostname)||u.username||u.password)return null;
      for(const key of [...u.searchParams.keys()])if(key.startsWith('__')||tracking.has(key))u.searchParams.delete(key);
      u.hash='';return u;
    }catch{return null;}
  }
  function cleanUrl(value,base){return parse(value,base)?.href||'';}
  function resource(u) {
    const p=u.pathname.split('/').filter(Boolean),path=u.pathname.replace(/\/$/,'').toLowerCase();
    const first=(p[0]||'').toLowerCase(),second=(p[1]||'').toLowerCase();
    if(['posts','post','videos','reel'].includes(first)&&p[1])return true;
    if(p[2]&&['posts','videos'].includes(second)&&!['people','pages','groups','user','profile.php'].includes(first))return true;
    if(first==='groups'&&p[1]&&['posts','permalink'].includes(p[2])&&p[3])return true;
    if(['/permalink.php','/story.php'].includes(path)&&u.searchParams.get('story_fbid'))return true;
    if(['/photo.php','/photo'].includes(path)&&u.searchParams.get('fbid'))return true;
    if(path==='/watch'&&u.searchParams.get('v'))return true;
    return false;
  }
  function postUrl(value,base) {
    const u=parse(value,base);if(!u||!resource(u))return '';
    u.searchParams.delete('comment_id');u.searchParams.delete('reply_comment_id');return u.href;
  }
  function id(value){return typeof value==='string'&&/^[A-Za-z0-9_=:+/-]{1,512}$/.test(value)?value:'';}
  function commentIds(value,base) {
    const u=parse(value,base);if(!u)return {commentId:'',replyId:''};
    return {commentId:u.searchParams.getAll('comment_id').length===1?id(u.searchParams.get('comment_id')):'',replyId:u.searchParams.getAll('reply_comment_id').length===1?id(u.searchParams.get('reply_comment_id')):''};
  }
  function commentUrl(value,base) {
    const u=parse(value,base);if(!u||!resource(u))return '';
    const ids=commentIds(u.href);return ids.commentId||ids.replyId?u.href:'';
  }
  function profileUrl(value,base) {
    const u=parse(value,base);if(!u||resource(u))return '';
    const p=u.pathname.split('/').filter(Boolean),first=(p[0]||'').toLowerCase();
    const reserved=new Set(['watch','photo','photos','posts','post','videos','reel','reels','groups','events','marketplace','share','stories','search','gaming','notifications','friends','settings','help','login','messages','hashtag']);
    const profile=(p.length===1&&!first.includes('.')&&!reserved.has(first))||
      (first==='profile.php'&&Boolean(u.searchParams.get('id')))||
      (['people','pages'].includes(first)&&p.length>=3)||
      (first==='user'&&p.length===2)||
      (first==='groups'&&p[1]&&p[2]==='user'&&p[3]);
    const dottedUsername=p.length===1&&first.includes('.')&&!first.endsWith('.php')&&!reserved.has(first);
    if(!profile&&!dottedUsername)return '';
    for(const key of [...u.searchParams.keys()])if(!(first==='profile.php'&&key==='id'))u.searchParams.delete(key);
    return u.href;
  }
  function makeCommentUrl(publication,ids) {
    const post=postUrl(publication);if(!post||!id(ids?.commentId))return '';
    const u=new URL(post);u.searchParams.set('comment_id',ids.commentId);
    if(id(ids.replyId))u.searchParams.set('reply_comment_id',ids.replyId);return u.href;
  }
  globalThis.PharosFacebookUrls=Object.freeze({cleanUrl,postUrl,commentUrl,profileUrl,commentIds,makeCommentUrl});
})();
