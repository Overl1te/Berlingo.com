
const DATA_URL = 'data/lessons.json';
let LESSONS = [];

function qs(s, r=document){return r.querySelector(s);}
function qsa(s, r=document){return Array.from((r||document).querySelectorAll(s));}

async function loadData(){
  const res = await fetch(DATA_URL);
  const json = await res.json();
  LESSONS = json.lessons;
  renderIndex();
  renderLessonIfNeeded();
}

function renderIndex(){
  const container = qs('#lessons');
  if(!container) return;
  container.innerHTML = '';
  // determine unlocked lessons: lesson1 unlocked by default; subsequent unlocked if previous done
  LESSONS.forEach((ls, idx) => {
    const donePrev = idx===0 ? true : (localStorage.getItem('berlingo_done_'+LESSONS[idx-1].id) === '1');
    const done = localStorage.getItem('berlingo_done_'+ls.id) === '1';
    const locked = !donePrev;
    const div = document.createElement('div');
    div.className = 'lesson-card' + (locked ? ' locked' : '');
    let actionHtml = '';
    if(locked){
      actionHtml = `<div class="lock-badge">🔒 Доступно после предыдущего</div>`;
    } else {
      actionHtml = `<a class="btn" href="${ls.id}.html">${done ? 'Повторить' : 'Открыть'}</a>`;
    }
    div.innerHTML = `<div>
      <h3>${ls.title}</h3>
      <div class="lesson-meta">${ls.level} • ${ls.intro}</div>
    </div>
    <div>
      <div style="margin-bottom:8px">${done?'<span class="small">Пройден</span>':'<span class="small">Доступно</span>'}</div>
      ${actionHtml}
    </div>`;
    container.appendChild(div);
  });
}

// Lesson page rendering and lock enforcement
function renderLessonIfNeeded(){
  const root = qs('#lesson-root');
  if(!root) return;
  const id = window.BERLINGO_LESSON_ID;
  const lesson = LESSONS.find(l=>l.id===id);
  if(!lesson){ root.innerHTML = '<p>Урок не найден.</p>'; return; }
  // check lock: find index
  const idx = LESSONS.findIndex(l=>l.id===id);
  const prevDone = idx===0 ? true : (localStorage.getItem('berlingo_done_'+LESSONS[idx-1].id) === '1');
  if(!prevDone){
    root.innerHTML = `<div class="lesson-hero"><h3>Урок пока заблокирован</h3><p class="small">Пройдите предыдущий урок, чтобы открыть этот.</p><div class="controls"><a class="btn" href="index.html">Вернуться к модулям</a></div></div>`;
    return;
  }
  // render stepper and content (similar to previous implementation)
  root.innerHTML = '';
  const header = document.createElement('div'); header.className='lesson-root-title';
  header.innerHTML = `<div><h2>${lesson.title}</h2><div class="small">${lesson.level} • ${lesson.intro}</div></div><div class="controls"><button id="restart-lesson" class="btn ghost">Повторить</button></div>`;
  root.appendChild(header);

  const steps = [{key:'theory', title:'Теория'},{key:'vocab', title:'Словарь'},{key:'examples', title:'Примеры'},{key:'exercises', title:'Практика'}];
  const stepNav = document.createElement('div'); stepNav.className='step-nav small'; stepNav.style.display='flex'; stepNav.style.gap='8px'; stepNav.style.marginTop='10px';
  steps.forEach((s,i)=>{ const b=document.createElement('button'); b.className='btn ghost'; b.textContent=s.title; b.disabled = i!==0; b.dataset.index=i; stepNav.appendChild(b); });
  root.appendChild(stepNav);

  const content = document.createElement('div'); content.className='step-content'; content.style.marginTop='14px';
  root.appendChild(content);

  let currentStep = 0;
  function showStep(idx){
    currentStep = idx;
    qsa('.step-nav .btn', stepNav).forEach((b,i)=>{ b.classList.toggle('ghost', i!==idx); b.disabled = i>idx; });
    content.innerHTML = '';
    if(idx===0) renderTheory();
    if(idx===1) renderVocab();
    if(idx===2) renderExamples();
    if(idx===3) renderExercises();
  }

  function renderTheory(){
    const box = document.createElement('div'); box.className='theory';
    lesson.theory.forEach((t)=>{ const it=document.createElement('div'); it.className='item'; it.innerHTML=`<strong>${t.title}</strong><div class="small">${t.content}</div>`; box.appendChild(it); });
    content.appendChild(box);
    // reveal sequence
    const items = Array.from(box.children); let i=0;
    function reveal(){ if(i<items.length){ items[i].classList.add('visible'); i++; setTimeout(reveal, 300);} else { const cont=document.createElement('div'); cont.className='controls'; const btn=document.createElement('button'); btn.className='btn'; btn.textContent='Перейти к словарю'; btn.addEventListener('click', ()=>{ enableStep(1); showStep(1); }); cont.appendChild(btn); content.appendChild(cont); } }
    reveal();
  }

  function renderVocab(){
    const box = document.createElement('div'); box.className='examples';
    const grid = document.createElement('div'); grid.className='vocab-grid';
    lesson.vocab.forEach((v, i)=>{ const item = document.createElement('div'); item.className='vocab-item'; item.innerHTML = `<div class="word" data-de="${escapeHtml(v.de)}" data-ru="${escapeHtml(v.ru)}">${v.de}</div><div><button class="btn small play-word">🔊</button></div>`; grid.appendChild(item); });
    box.appendChild(grid);
    const cont = document.createElement('div'); cont.className='controls'; const btn = document.createElement('button'); btn.className='btn'; btn.textContent='Перейти к примерам'; btn.addEventListener('click', ()=>{ enableStep(2); showStep(2); }); cont.appendChild(btn);
    content.appendChild(box); content.appendChild(cont);
    qsa('.word', box).forEach(w=> w.addEventListener('click', onWordClick));
    qsa('.play-word', box).forEach((b,i)=> b.addEventListener('click', ()=> speak(lesson.vocab[i].de)));
  }

  function renderExamples(){
    const box = document.createElement('div'); box.className='examples';
    lesson.examples.forEach((e)=>{ const el=document.createElement('div'); el.className='example'; el.innerHTML = `<div><strong>${e.de}</strong><div class="small">${e.ru}</div></div><div><button class="btn small play-word">🔊</button></div>`; box.appendChild(el); });
    const cont = document.createElement('div'); cont.className='controls'; const btn=document.createElement('button'); btn.className='btn'; btn.textContent='Перейти к практике'; btn.addEventListener('click', ()=>{ enableStep(3); showStep(3); }); cont.appendChild(btn);
    content.appendChild(box); content.appendChild(cont);
    qsa('.play-word', box).forEach((b,i)=> b.addEventListener('click', ()=> speak(lesson.examples[i].de)));
  }

  function renderExercises(){
    const box = document.createElement('div'); box.className='exercises';
    lesson.exercises.forEach((ex, idx)=>{
      const exEl = document.createElement('div'); exEl.className='exercise';
      if(ex.type==='mcq'){
        exEl.innerHTML = `<div><strong>${ex.question}</strong></div><div class="mcq"></div><div class="result"></div>`;
        ex.options.forEach((opt,i)=>{ const d=document.createElement('div'); d.className='option'; d.textContent=opt; d.addEventListener('click', ()=>{ if(d.dataset.done) return; if(i===ex.answer){ d.style.border='2px solid rgba(46,204,113,0.9)'; exEl.querySelector('.result').textContent='Правильно'; d.dataset.done='1'; } else { d.style.border='2px solid rgba(255,99,71,0.9)'; exEl.querySelector('.result').textContent='Неправильно'; } checkAllDone(); }); exEl.querySelector('.mcq').appendChild(d); });
      } else if(ex.type==='reorder'){
        exEl.innerHTML = `<div><strong>${ex.instruction||'Соберите фразу'}</strong></div><div class="reorder-pieces"></div><div class="controls"><button class="btn check-reorder">Проверить</button></div><div class="result"></div>`;
        const piecesEl = exEl.querySelector('.reorder-pieces'); const pieces = ex.pieces.slice(); for(let i=pieces.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [pieces[i],pieces[j]]=[pieces[j],pieces[i]];} pieces.forEach(p=>{ const d=document.createElement('div'); d.className='piece'; d.draggable=true; d.textContent=p; piecesEl.appendChild(d);});
        addDnDHandlers(piecesEl);
        exEl.querySelector('.check-reorder').addEventListener('click', ()=>{ const order = Array.from(piecesEl.children).map(ch=>ch.textContent.trim()); if(JSON.stringify(order)===JSON.stringify(ex.correct)){ exEl.querySelector('.result').textContent='Правильно'; piecesEl.style.border='2px solid rgba(46,204,113,0.9)'; piecesEl.dataset.done='1'; } else { exEl.querySelector('.result').textContent='Не верно'; piecesEl.style.border='2px solid rgba(255,99,71,0.9)'; } checkAllDone(); });
      } else if(ex.type==='input'){
        exEl.innerHTML = `<div><strong>${ex.question}</strong></div><input class="input-answer" placeholder="Введите ответ" /><div class="controls"><button class="btn check-input">Проверить</button></div><div class="result"></div>`;
        exEl.querySelector('.check-input').addEventListener('click', ()=>{ const val=(exEl.querySelector('.input-answer').value||'').trim().toLowerCase(); if(val === (ex.answer||'').trim().toLowerCase()){ exEl.querySelector('.result').textContent='Правильно'; exEl.dataset.done='1'; } else exEl.querySelector('.result').textContent='Неверно'; checkAllDone(); });
      }
      box.appendChild(exEl);
    });
    content.appendChild(box);
    function checkAllDone(){
      const all = Array.from(box.querySelectorAll('.exercise'));
      const doneCount = all.filter(e=> e.querySelector('.result') && e.querySelector('.result').textContent.includes('Правильно')).length;
      if(doneCount === all.length){
        localStorage.setItem('berlingo_done_'+lesson.id,'1');
        const doneNote = document.createElement('div'); doneNote.className='small'; doneNote.textContent='Урок пройден — следующий урок открыт.';
        content.appendChild(doneNote);
        qs('#restart-lesson').textContent='Повторить урок';
      }
    }
  }

  function enableStep(i){ const btns = qsa('.step-nav .btn', stepNav); if(btns[i]){ btns[i].disabled=false; btns[i].classList.remove('ghost'); } }
  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function onWordClick(e){ const de = e.currentTarget.dataset.de; const ru = e.currentTarget.dataset.ru; showWordPopup(de, ru); }

  showStep(0);

  qs('#restart-lesson').addEventListener('click', ()=>{ localStorage.removeItem('berlingo_done_'+lesson.id); location.reload(); });
}

// DnD helpers
function addDnDHandlers(container){ let dragEl = null; container.addEventListener('dragstart', e=>{ if(e.target.classList.contains('piece')){ dragEl = e.target; e.target.classList.add('dragging'); e.dataTransfer.setData('text/plain','x'); }}); container.addEventListener('dragend', e=>{ if(dragEl) dragEl.classList.remove('dragging'); dragEl=null; }); container.addEventListener('dragover', e=>{ e.preventDefault(); const after = getDragAfterElement(container, e.clientY); if(after==null) container.appendChild(dragEl); else container.insertBefore(dragEl, after); }); }
function getDragAfterElement(container, y){ const draggableElements = [...container.querySelectorAll('.piece:not(.dragging)')]; return draggableElements.reduce((closest, child)=>{ const box = child.getBoundingClientRect(); const offset = y - box.top - box.height/2; if(offset < 0 && offset > (closest.offset || -Infinity)){ return {offset: offset, element: child}; } else return closest; }, {}).element; }

// Popup
function showWordPopup(de, ru){ const popup = qs('#word-popup'); const pw = qs('#popup-word'); const pt = qs('#popup-translate'); pw.textContent = de; pt.textContent = ru; popup.classList.remove('hidden'); popup.setAttribute('aria-hidden','false'); qs('#popup-play').onclick = ()=> speak(de); qs('#popup-close').onclick = ()=> { popup.classList.add('hidden'); popup.setAttribute('aria-hidden','true'); }; }

// TTS
function speak(text){ if(!('speechSynthesis' in window)) return; const u = new SpeechSynthesisUtterance(text); u.lang = 'de-DE'; const voices = speechSynthesis.getVoices().filter(v=>v.lang && v.lang.startsWith('de')); if(voices[0]) u.voice = voices[0]; speechSynthesis.cancel(); speechSynthesis.speak(u); }

window.addEventListener('load', loadData);
