// The Node-side stand-in for the server in t125: the same rules as sql/01_onboard.sql (single use, 24 h, revoke, roles,
// foreman = Pipelayer only) and functions/crew-join (a no-email account + a one-time hash), shared by every browser context.
const crypto=require('crypto');
module.exports=function(){
  const C='d01a4a5f-312a-418f-9172-ea9aec9784b5', CN='DIG Civil Construction';
  const OFFICE='00000000-0000-4000-8000-000000000001', FOREMAN='00000000-0000-4000-8000-0000000000f1';
  const A='ACDEFHJKMNPRTUVWXY34679';
  const st={links:[],members:new Map([[FOREMAN,{company_id:C,role:'foreman'}]]),users:new Map(),hashes:new Map(),names:new Map([[OFFICE,'Tommy'],[FOREMAN,'Ray']]),terms:[],notices:[],log:[]};
  const now=()=>Date.now(), iso=(t)=>new Date(t).toISOString();
  const sha=(t)=>crypto.createHash('sha256').update(String(t)).digest('hex');
  const newCode=()=>{let c='';const b=crypto.randomBytes(6);for(const x of b)c+=A[x%A.length];return c;};
  const refusal=(l)=>!l?'pb:link_not_found':l.revoked_at?'pb:link_revoked':l.used_at?'pb:link_used':l.expires_at<=now()?'pb:link_expired':null;
  const find=(a,kind)=>{const t=a.p_token||a.token, c=String(a.p_code||a.code||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
    if(t)return st.links.find(l=>l.hash===sha(t)&&(!kind||l.kind===kind));
    return st.links.find(l=>l.code===c&&(!kind||l.kind===kind)&&!l.used_at&&!l.revoked_at&&l.expires_at>now());};
  const isMgr=(u)=>u===OFFICE, mem=(u)=>st.members.get(u);
  function join(l,uid,name){const why=refusal(l);if(why)return{ok:false,code:why};if(mem(uid))return{ok:false,code:mem(uid).company_id===C?'pb:already_member':'pb:other_company'};
    st.members.set(uid,{company_id:C,role:l.role});l.used_at=now();l.used_by=uid;if(!st.names.has(uid))st.names.set(uid,l.label||name);st.log.push(['joined',uid,l.role]);
    return{ok:true,company_id:C,company_name:CN,role:l.role,user_id:uid};}
  const ops={
    pb_onboard_link_make(uid,a){const r=a.p_role;if(!['foreman','pipelayer'].includes(r))return{__error:'pb:bad_role'};
      if(!isMgr(uid)){const m=mem(uid);if(!m||m.role!=='foreman')return{__error:'pb:not_company_account'};if(r!=='pipelayer')return{__error:'pb:foreman_pipelayer_only'};}
      if(st.links.filter(l=>l.kind==='join'&&!l.used_at&&!l.revoked_at&&l.expires_at>now()).length>=10)return{ok:false,code:'pb:too_many_links'};
      const tok=crypto.randomBytes(24).toString('base64url'),code=newCode(),l={id:crypto.randomUUID(),kind:'join',role:r,label:a.p_name||null,hash:sha(tok),code,created_by:uid,created_at:now(),expires_at:now()+864e5};
      st.links.push(l);return{ok:true,id:l.id,token:tok,code,expires_at:iso(l.expires_at),role:r,label:l.label,company_name:CN};},
    pb_onboard_links(uid){const m=isMgr(uid);if(!m&&!mem(uid))return{ok:true,links:[]};
      return{ok:true,manager:m,links:st.links.filter(l=>l.kind==='join'&&(m||l.created_by===uid)).slice().reverse().map(l=>({id:l.id,role:l.role,label:l.label,code:refusal(l)?null:l.code,made_by:st.names.get(l.created_by)||'Company account',mine:l.created_by===uid,created_at:iso(l.created_at),expires_at:iso(l.expires_at),opened_at:l.opened_at?iso(l.opened_at):null,used_at:l.used_at?iso(l.used_at):null,joined_name:l.used_by?st.names.get(l.used_by):null,joined_user:l.used_by||null,still_member:l.used_by?!!mem(l.used_by):null,status:l.used_at?'joined':l.revoked_at?'revoked':l.expires_at<=now()?'expired':l.opened_at?'opened':'waiting'}))};},
    pb_onboard_link_revoke(uid,a){const l=st.links.find(x=>x.id===a.p_id);if(!l)return{ok:false,code:'pb:link_not_found'};if(!(isMgr(uid)||l.created_by===uid))return{ok:false,code:'pb:not_company_account'};if(l.used_at)return{ok:false,code:'pb:link_used'};l.revoked_at=l.revoked_at||now();return{ok:true};},
    pb_onboard_peek(uid,a){const l=find(a,'join'),why=refusal(l);if(why)return{ok:false,code:why};l.opened_at=l.opened_at||now();
      return{ok:true,company_name:CN,role:l.role,label:l.label,invited_by:st.names.get(l.created_by)||'Your company',expires_at:iso(l.expires_at),code:a.p_token?l.code:null};},
    pb_onboard_join(uid,a){if(!uid)return{__error:'pb:signed_out'};const l=find(a,'join');if(!l)return{ok:false,code:'pb:link_not_found'};return join(l,uid,a.p_name);},
    pb_onboard_handoff_make(uid){if(!uid)return{__error:'pb:signed_out'};const tok=crypto.randomBytes(24).toString('base64url'),code=newCode();st.links.push({id:crypto.randomUUID(),kind:'handoff',for_user:uid,hash:sha(tok),code,created_by:uid,created_at:now(),expires_at:now()+9e5});return{ok:true,token:tok,code,expires_at:iso(now()+9e5)};},
    'fn:crew-join'(uid,b){const l=find(b,null);const why=refusal(l);if(why)return{ok:false,code:why};
      if(b.action==='signin'){if(l.kind!=='handoff')return{ok:false,code:'pb:use_join'};l.used_at=now();const h='h-'+crypto.randomBytes(8).toString('hex');st.hashes.set(h,l.for_user);return{ok:true,token_hash:h,type:'magiclink'};}
      if(l.kind!=='join')return{ok:false,code:'pb:link_not_found'};if(!b.terms||!b.terms.t)return{ok:false,code:'pb:terms_needed'};
      const id=crypto.randomUUID(),u={id,email:'m-'+crypto.randomBytes(12).toString('hex')+'@crew.pipelayersbible.com',app_metadata:{pb_link:true},user_metadata:{full_name:String(b.name||'').slice(0,80)}};
      st.users.set(id,u);const j=join(l,id,b.name);if(!j.ok){st.users.delete(id);return j;}
      const h='h-'+crypto.randomBytes(8).toString('hex');st.hashes.set(h,id);return{ok:true,token_hash:h,type:'magiclink',company_name:CN,role:j.role};},
    verify(uid,a){const id=st.hashes.get(a.token_hash);if(!id)return{user:null};st.hashes.delete(a.token_hash);const m=mem(id);return{user:st.users.get(id),member:m?Object.assign({company_name:CN},m):null};},
    pb_prod_access(uid){if(isMgr(uid))return{member:false,company_id:null,manager:true,managed_company_id:C,role:null,server_at:iso(now())};const m=mem(uid);return m?{member:true,company_id:C,manager:false,role:m.role,server_at:iso(now())}:{member:false,company_id:null,manager:false,role:null,server_at:iso(now())};},
    pb_terms_accept(uid,a){st.terms.push([uid,a.p_terms,a.p_privacy]);return{ok:true,at:iso(now())};},
    pb_terms_status(uid){const t=st.terms.filter(x=>x[0]===uid).pop();return t?{terms:t[1],privacy:t[2],at:iso(now())}:(isMgr(uid)||uid===FOREMAN?{terms:'1.0',privacy:'1.0',at:iso(now())}:null);},
    pb_notice_ack(uid,a){st.notices.push([uid,a.p_notice,a.p_version]);return{ok:true};},
    pb_my_name_get(uid){return{ok:true,name:st.names.get(uid)||null};},
  };
  return {st,C,OFFICE,FOREMAN,call:(op,uid,args)=>{const f=ops[op];if(!f)return{__error:'no op '+op};try{return f(uid,args||{});}catch(e){return{__error:'pb:server '+e.message};}}};
};
