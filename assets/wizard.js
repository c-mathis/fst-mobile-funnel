
// v7m — Clean (no summary), progress bar, animations, option icons, phone mask + email validation
const STEPS = [
  { id:'amount',  type:'pills',   title:'How much tax debt do you owe?', sub:'Choose the closest range.', options:['< $10,000','$10,000–$25,000','$25,000–$50,000','$50,000+'], required:true },
  { id:'taxtype', type:'pills',   title:'Do you have any unfiled tax years?', sub:'Select one.', options:['No, I\'m current','1 year','2–3 years','4–5 years','5+ years'], required:true },
  { id:'years',   type:'pills',   title:'Do you owe Federal or State taxes?', sub:'Select the best match.', options:['Federal','State', 'Both'], required:true },
 
  { id:'contact', type:'contact', title:'Who are we helping today? We will reach out to schedule a consultation.', sub:'Enter your contact details', required:true }
];

const qTitle = document.getElementById('qTitle');
const qSub = document.getElementById('qSub');
const stepLabel = document.getElementById('stepLabel');
const nextBtn = document.getElementById('nextBtn');
const backBtn = document.getElementById('backBtn');
const controls = document.getElementById('controls');
const progressBar = document.getElementById('progressBar');

const params = new URLSearchParams(location.search);
const utm = params.toString()?('?'+params.toString()):'';
// === Google Apps Script integration (edit these) ===
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwfDJy9Lfk5sZQsA6ccMJOf2XTvcNAeoMHdb7JhKqHtKQ6cYMUkLnuKKZMVyehTS4Hd/exec'; 
const NOTIFY_EMAILS   = 'cameron@axesagency.com';                                 // comma-separate for multiple


let step = 0;
const data = {};

function setProgress(i){
  stepLabel.textContent = `Step ${Math.min(i+1,STEPS.length)} of ${STEPS.length}`;
  const pct = Math.round((i)/ (STEPS.length-1) * 100);
  progressBar.style.width = Math.max(2, pct) + '%';
}

function iconFor(stepId){
  const icons = {
    amount:'<svg class="icon" viewBox="0 0 24 24" fill="none"><path d="M12 3v18M7 7h6a3 3 0 0 1 0 6H9a3 3 0 1 0 0 6h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    taxtype:'<svg class="icon" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    years:'<svg class="icon" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    state:'<svg class="icon" viewBox="0 0 24 24" fill="none"><path d="M4 10l4-5h8l4 5-4 5H8l-4-5z" stroke="currentColor" stroke-width="2"/></svg>',
    contact:'<svg class="icon" viewBox="0 0 24 24" fill="none"><path d="M22 16v3a2 2 0 0 1-2 2h-3c-7.18 0-13-5.82-13-13V3a2 2 0 0 1 2-2h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };
  return icons[stepId] || '';
}

function animateSwap(container, build){
  const kids = Array.from(container.children);
  if(kids.length){ kids.forEach(k => k.classList.add('slide-out-down')); }
  setTimeout(()=>{
    container.innerHTML = '';
    build();
    Array.from(container.children).forEach(k => k.classList.add('slide-in-up'));
  }, kids.length ? 140 : 0);
}

function render(){
  const s = STEPS[step];
  setProgress(step);

  // question
  const content = document.querySelector('.content-inner');
  animateSwap(content, ()=>{
    const h = document.createElement('div'); h.className='h1'; h.id='qTitle'; h.textContent = s.title;
    const sub = document.createElement('div'); sub.className='section-sub'; sub.id='qSub'; sub.textContent = s.sub || '';
    content.appendChild(h); content.appendChild(sub);
  });

  // controls
  animateSwap(controls, ()=>{ buildControlsForStep(s); });

  backBtn.disabled = step===0;
  nextBtn.textContent = step===STEPS.length-1 ? 'Finish' : 'Next';
}

function buildControlsForStep(s){
  let el;
  if(s.type==='select'){
    el = document.createElement('select');
    el.className = 'select';
    el.innerHTML = '<option value="" disabled selected>Select…</option>' + (s.options||[]).map(o=>`<option>${o}</option>`).join('');
    if(data[s.id]) el.value = data[s.id];
    controls.appendChild(el);
  }
  else if(s.type==='pills'){
    el = document.createElement('div');
    el.className = 'options';
    (s.options||[]).forEach(opt=>{
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'option';
      item.innerHTML = `<span class="mark">✓</span><span class="label">${opt}</span>`;
      if(data[s.id]===opt) item.classList.add('active');
      item.addEventListener('mousedown', ()=> item.classList.add('tap'));
      item.addEventListener('mouseup', ()=> item.classList.remove('tap'));
      item.addEventListener('mouseleave', ()=> item.classList.remove('tap'));
      item.addEventListener('click', ()=>{
        el.querySelectorAll('.option').forEach(n=>n.classList.remove('active'));
        item.classList.add('active');
        advance(opt);
      });
      el.appendChild(item);
    });
    controls.appendChild(el);
  }
  else if(s.type==='contact'){
    buildContactStep();
  }
}

function buildContactStep(){
  const wrap = document.createElement('div');
  wrap.style.display='grid';
  wrap.style.gridTemplateColumns='1fr 1fr';
  wrap.style.gap='10px';
  wrap.className='grid2';

  const mkField = (id, node)=>{ node.dataset.id=id; node.classList.add('input'); return node; }
  const mkInput = (id, type, ph, val)=> mkField(id, Object.assign(document.createElement('input'), {type, placeholder:ph, value:val||''}));
  const mkSelect = (id, opts, label)=>{
    const sel = document.createElement('select'); sel.className='select'; sel.dataset.id=id;
    sel.innerHTML = `<option value="" disabled selected>${label}</option>` + opts.map(o=>`<option>${o}</option>`).join('');
    if(data[id]) sel.value = data[id];
    return sel;
  };

  const name = mkInput('name','text','Full name', data.name);
  const phone = mkInput('phone','tel','Phone (e.g. (555) 555‑5555)', data.phone);
  const email = mkInput('email','email','Email', data.email);
  const contactWin = mkSelect('contact',['Morning','Afternoon','Evening',],'Preferred contact window…');

  // Masking
  const digits = s=> (s||'').replace(/\D/g,'');
  const formatPhone = d => {
    const a=d.slice(0,3), b=d.slice(3,6), c=d.slice(6,10);
    if(d.length<=3) return a;
    if(d.length<=6) return `(${a}) ${b}`;
    return `(${a}) ${b}-${c}`;
  };
  function maskPhone(){ const d = digits(phone.value).slice(0,10); phone.value = formatPhone(d); }
  phone.addEventListener('input', maskPhone); phone.addEventListener('blur', maskPhone);

  // Email validation
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  function setError(el, msg){
    el.classList.add('error');
    const e = document.createElement('div'); e.className='error-text'; e.textContent=msg;
    el.parentNode && el.parentNode.appendChild(e);
  }
  function clearError(el){
    el.classList.remove('error');
    if(el.parentNode){ const n = el.parentNode.querySelector('.error-text'); if(n) n.remove(); }
  }
  function validateEmailInstant(){
    clearError(email);
    if(email.value && !emailRe.test(email.value)){ setError(email,'Please enter a valid email address.'); }
  }
  email.addEventListener('blur', validateEmailInstant);

  // Consent
  const consent = document.createElement('label');
  consent.style.display='flex'; consent.style.alignItems='center'; consent.style.gap='10px'; consent.style.gridColumn='1 / -1';
  const cb = document.createElement('input'); cb.type='checkbox'; cb.checked=!!data.terms; cb.dataset.id='terms';
  consent.appendChild(cb);
  consent.appendChild(document.createTextNode('By checking this box I agree that I am a US Resident over the age 18 and agree to the Privacy Policy.'));

  // Layout
  const cell = (node, full=false)=>{ const c = document.createElement('div'); if(full) c.style.gridColumn='1 / -1'; c.appendChild(node); return c; };
  wrap.appendChild(cell(name));
  wrap.appendChild(cell(phone));
  wrap.appendChild(cell(email, true));
  wrap.appendChild(cell(contactWin, true));
  wrap.appendChild(cell(consent, true));
  controls.appendChild(wrap);

  // Submit/validate on Next
  nextBtn.onclick = function(){
    [name, phone, email, contactWin].forEach(clearError);
    let ok = true;

    if(!name.value.trim()){ setError(name,'Name is required.'); ok=false; }
    const d = digits(phone.value);
    if(d.length<10){ setError(phone,'Enter a 10‑digit US phone.'); ok=false; } else { phone.value = formatPhone(d); }
    if(!email.value.trim() || !emailRe.test(email.value)){ setError(email,'Please enter a valid email address.'); ok=false; }
    if(!contactWin.value){ setError(contactWin,'Please select a preferred contact window.'); ok=false; }
    if(!cb.checked){
      if(!consent.querySelector('.error-text')){ const e = document.createElement('div'); e.className='error-text'; e.textContent='Consent is required to continue.'; consent.appendChild(e); }
      ok=false;
    } else { const e = consent.querySelector('.error-text'); if(e) e.remove(); }

    if(!ok){
      const sub = document.getElementById('qSub');
      sub.textContent = 'Please fix the highlighted fields to continue.';
      sub.style.color = '#b91c1c';
      setTimeout(()=>{ sub.style.color='var(--muted)'; sub.textContent = STEPS[step].sub || ''; }, 1600);
      return;
    }

    data.name = name.value.trim();
    data.phone = formatPhone(digits(phone.value));
    data.email = email.value.trim();
    data.contact = contactWin.value;
    data.terms = cb.checked;
    step++;
    if(step<STEPS.length){ render(); } else { submit(); }
  };

  backBtn.onclick = back;
  email.addEventListener('keydown', e=>{ if(e.key==='Enter'){ nextBtn.click(); }});
}

function back(){ if(step===0) return; step--; render(); }

function nextDefault(){
  const s = STEPS[step];
  if(s.type==='select'){
    const v = controls.querySelector('select').value;
    return advance(v);
  }
  if(s.type==='pills'){
    const lab = controls.querySelector('.option.active .label');
    const v = lab ? lab.textContent : '';
    return advance(v);
  }
}

nextBtn.onclick = nextDefault;
backBtn.onclick = back;

function advance(value){
  const s = STEPS[step];
  if(s.required && (!value || value.length===0)){
    const sub = document.getElementById('qSub');
    sub.textContent = 'Please provide an answer to continue.';
    sub.style.color = '#b91c1c';
    setTimeout(()=>{ sub.style.color='var(--muted)'; sub.textContent = s.sub || ''; }, 1000);
    return;
  }
  data[s.id] = value;
  step++;
  if(step<STEPS.length){ render(); }
  else { submit(); }
}


// --- Helper to post without blocking redirect ---
async function postToGoogle(payload){
  if(!GAS_WEB_APP_URL || GAS_WEB_APP_URL.indexOf('script.google.com') === -1){
    console.warn('GAS_WEB_APP_URL not set; skipping network post.');
    return;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500); // fail fast to protect UX
  try {
    const url = GAS_WEB_APP_URL + `?ua=${encodeURIComponent(navigator.userAgent)}&ref=${encodeURIComponent(document.referrer)}`;
    await fetch(url, {
      method: 'POST',
      // 👇 change fixes CORS (simple request, no preflight)
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ ...payload, notify: NOTIFY_EMAILS }),
      signal: controller.signal
    });
  } catch (e) {
    console.warn('Post to GAS failed (continuing to TY):', e);
  } finally {
    clearTimeout(timer);
  }
}
function submit(){
  // assemble payload from the same 'data' object your steps populate
  const payload = { ...data, ts: new Date().toISOString() };

  // send to Google Apps Script (Sheet + emails). Non-blocking.
  postToGoogle(payload);

  // keep demo storage if you like
  try { localStorage.setItem('demo_lead', JSON.stringify(payload)); } catch(_) {}

  // redirect to thank-you immediately (preserves UTM params if present)
  const qp = new URLSearchParams({ name: data.name || 'Friend' });
  const utm = params && params.toString() ? '&' + params.toString() : '';
  location.href = 'thank-you.html?' + qp.toString() + utm;
}

render();
