/* Frontend-only DEMO account. Never use for real authentication or sensitive passwords. */
const TC_AUTH_USERS = 'trackcycle_demo_users_v1';
const TC_AUTH_SESSION = 'trackcycle_demo_session_v1';
function tcUsers(){try{return JSON.parse(localStorage.getItem(TC_AUTH_USERS)||'[]')}catch{return []}}
function tcSession(){try{return JSON.parse(localStorage.getItem(TC_AUTH_SESSION)||'null')}catch{return null}}
function tcUser(){const s=tcSession();return s&&tcUsers().find(u=>u.id===s.id)||null}
async function tcDigest(email,password,salt){const bytes=new TextEncoder().encode(salt+'|'+email.toLowerCase()+'|'+password);const hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function tcReturn(){const next=new URLSearchParams(location.search).get('next');return ['reserve.html','history.html','trip.html','profile.html'].includes(next)?next:'profile.html'}
function tcSignOut(){localStorage.removeItem(TC_AUTH_SESSION);location.href='login.html'}
document.addEventListener('DOMContentLoaded',()=>{
 const user=tcUser();document.querySelectorAll('[data-account-link]').forEach(a=>{a.href=user?'profile.html':'login.html';a.innerHTML=user?'<i class="ri-user-smile-line"></i> '+user.name.split(' ')[0]:'<i class="ri-login-circle-line"></i> Login';a.classList.add('account-chip')});
 const form=document.querySelector('[data-auth-form]');const message=document.querySelector('[data-auth-message]');
 if(document.body.dataset.page==='profile'){
  if(!user){location.replace('login.html?next=profile.html');return}
  document.querySelector('[data-profile-name]').textContent=user.name;document.querySelector('[data-profile-email]').textContent=user.email;
  document.querySelector('[data-profile-count]').textContent=typeof getBookings==='function'?getBookings().filter(b=>b.userId===user.id).length:0;
  document.querySelector('[data-logout]').addEventListener('click',tcSignOut);
  const edit=document.querySelector('[data-edit-profile]'), pf=document.querySelector('[data-profile-form]'), msg=document.querySelector('[data-profile-message]');
  edit.addEventListener('click',()=>{pf.classList.remove('auth-hidden');edit.classList.add('auth-hidden');pf.elements.name.value=user.name;pf.elements.email.value=user.email;msg.textContent=''});
  document.querySelector('[data-cancel-profile]').addEventListener('click',()=>{pf.classList.add('auth-hidden');edit.classList.remove('auth-hidden')});
  pf.addEventListener('submit',e=>{e.preventDefault();const current=tcUser();if(!current){location.href='login.html';return}const name=pf.elements.name.value.trim(),email=pf.elements.email.value.trim().toLowerCase();if(name.length<2){msg.textContent='Please enter at least two characters for your name.';return}if(!pf.elements.email.checkValidity()){msg.textContent='Enter a valid email address.';return}const users=tcUsers();if(users.some(u=>u.id!==current.id&&u.email===email)){msg.textContent='This email is already used by another demo account.';return}const idx=users.findIndex(u=>u.id===current.id);if(idx<0)return;users[idx]={...users[idx],name,email};localStorage.setItem(TC_AUTH_USERS,JSON.stringify(users));document.querySelector('[data-profile-name]').textContent=name;document.querySelector('[data-profile-email]').textContent=email;pf.classList.add('auth-hidden');edit.classList.remove('auth-hidden');const link=document.querySelector('[data-account-link]');if(link)link.innerHTML='<i class="ri-user-smile-line"></i> '+name.split(' ')[0];});

 }
 if(!form)return;
 if(user){location.replace(tcReturn());return}
 form.addEventListener('submit',async e=>{
  e.preventDefault();message.textContent='';const email=form.elements.email.value.trim().toLowerCase();const password=form.elements.password.value;
  const users=tcUsers();if(document.body.dataset.page==='register'){
   const name=form.elements.fullname.value.trim();if(name.length<2){message.textContent='Enter your full name.';return}if(password.length<8){message.textContent='Use at least 8 characters for your demo password.';return}if(users.some(u=>u.email===email)){message.textContent='This email is already registered in this browser.';return}
   const id=crypto.randomUUID();const salt=crypto.randomUUID();const digest=await tcDigest(email,password,salt);users.push({id,name,email,salt,digest});localStorage.setItem(TC_AUTH_USERS,JSON.stringify(users));localStorage.setItem(TC_AUTH_SESSION,JSON.stringify({id}));location.href=tcReturn();return;
  }
  const match=users.find(u=>u.email===email);if(!match||await tcDigest(email,password,match.salt)!==match.digest){message.textContent='Incorrect email or demo password.';return}localStorage.setItem(TC_AUTH_SESSION,JSON.stringify({id:match.id}));location.href=tcReturn();
 });
});
