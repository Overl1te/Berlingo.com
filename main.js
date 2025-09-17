
/*
  main.js
  - Loads data and drives page rendering (learning, rules, practice)
  - Uses BERLINGO.helpers, BERLINGO.ui, BERLINGO.exercise
*/
(function (h, ui, exModule) {
  const LESSONS_URL = "data/lessons.json";
  const RULES_URL = "data/rules.json";
  const PRACTICE_URL = "data/practice.json";
  let LESSONS = [], RULES = {grammar:[], listening:[]}, PRACTICES = [];
  let POINTS = 0, HEARTS = 10;

  async function loadData() {
    const [lRes, rRes, pRes] = await Promise.all([fetch(LESSONS_URL), fetch(RULES_URL), fetch(PRACTICE_URL)]);
    LESSONS = (await lRes.json()).lessons || [];
    RULES = await rRes.json();
    PRACTICES = (await pRes.json()).practices || [];
    const urlParams = new URLSearchParams(window.location.search);
    const chapter = urlParams.get("chapter") || "learning";

    try {
      await BERLINGO.helpers.warmUpSpeech();   // пробуем "прогреть" движок
    } catch(e) { /* игнор */ }

    await BERLINGO.helpers.loadVoices();

    // если после всех попыток голосов нет — добавим одноразовый слушатель на пользовательский жест
    if (!BERLINGO.helpers.germanVoices || BERLINGO.helpers.germanVoices.length === 0) {
      const gestureHandler = async () => {
        await BERLINGO.helpers.warmUpSpeech();
        await BERLINGO.helpers.loadVoices();
        window.removeEventListener('click', gestureHandler);
        window.removeEventListener('touchstart', gestureHandler);
      };
      window.addEventListener('click', gestureHandler, { once: true });
      window.addEventListener('touchstart', gestureHandler, { once: true });
    }

    const isMain = !!h.qs("#lessons");
    const isSession = !!h.qs("#lesson-root");
    if (isMain) renderContent(chapter);
    else if (isSession) renderSession();
  }

  async function renderContent(chapter) {
    const items = document.querySelectorAll('.nav-item');
    if (items) items.forEach(i => i.classList.remove('active'));
    if (items[0].textContent.toLowerCase() === "учёба" && window.location.search === "?chapter=learning") items[0].classList.add('active');
    else if (items[1].textContent.toLowerCase() === "правила" && window.location.search === "?chapter=rules") items[1].classList.add('active');
    else if (items[2].textContent.toLowerCase() === "тренировка" && window.location.search === "?chapter=practice") items[2].classList.add('active');
    const container = h.qs("#lessons");
    if (!container) return;
    container.innerHTML = "";
    if (chapter === "learning") renderLearning();
    else if (chapter === "rules") renderRules();
    else if (chapter === "practice") renderPractice();
  }

  function renderLearning() {
    const container = h.qs("#lessons");
    LESSONS.forEach((ls, idx) => {
      const prev = idx > 0 ? LESSONS[idx-1] : null;
      const prevDone = prev ? h.isDone(prev.id) : true;
      const currentDone = h.isDone(ls.id);
      const card = document.createElement("div");
      card.className = "lesson-card" + (!prevDone ? " locked" : "");
      const actionHtml = !prevDone ? '<div class="lock-badge"><i class="fas fa-lock"></i> После предыдущего</div>'
        : `<a class="btn" style="position:absolute; right:10px; bottom:10px" href="lessons.html?lesson=${idx+1}&chapter=learning">${currentDone?'<i class="fas fa-redo"></i> Повторить':'<i class="fas fa-play"></i> Начать'}</a>`;
      card.innerHTML = `<div><h3>${ls.title}</h3><div class="lesson-meta">${ls.level} • ${ls.intro}</div></div><div>${currentDone?'<span class="small"><i class="fas fa-check-circle" style="color:var(--success)"></i> Пройден</span>':'<span class="small"><i class="fas fa-unlock"></i> Доступно</span>'}${actionHtml}</div>`;
      container.appendChild(card);
    });
  }

  function renderRules() {
    const container = h.qs("#lessons");
    const subNav = document.createElement('div');
    subNav.className = 'nav-container';
    subNav.style.marginBottom = '16px';
    ['Грамматика','Аудирование'].forEach(tab => {
      const item = document.createElement('div');
      item.className = 'nav-item';
      item.textContent = tab;
      item.addEventListener('click', () => {
        h.qsa('.nav-item', subNav).forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        renderRulesSection(tab.toLowerCase() === 'грамматика' ? 'grammar' : 'listening');
      });
      subNav.appendChild(item);
    });
    container.appendChild(subNav);
    h.qsa('.nav-item', subNav)[0].classList.add('active');
    renderRulesSection('grammar');
  }

  function renderRulesSection(section) {
    const container = h.qs("#lessons");
    const rulesGrid = document.createElement('div');
    if (section === 'grammar' && !(document.querySelector('.grammar-grid'))) {
      document.querySelector('.listening-grid')?.remove();
      rulesGrid.className = 'lessons-grid';
      rulesGrid.classList.add('grammar-grid');
      (RULES[section] || []).forEach((rule, idx) => {
        const div = document.createElement("div");
        div.className = "lesson-card";
        div.innerHTML = `<div><h3>${rule.title}</h3><div class="lesson-meta">${rule.level} • ${rule.intro}</div></div><a class="btn" href="lessons.html?lesson=${idx+1}&chapter=rules&section=${section}"><i class="fas fa-play"></i> Начать</a>`;
        rulesGrid.appendChild(div);
      });
    }else if (section === 'listening' && !(document.querySelector('.listening-grid'))) {
      document.querySelector('.grammar-grid')?.remove();
      rulesGrid.className = 'lessons-grid';
      rulesGrid.classList.add('listening-grid');
      (RULES[section] || []).forEach((rule, idx) => {
        const div = document.createElement("div");
        div.className = "lesson-card";
        div.innerHTML = `<div><h3>${rule.title}</h3><div class="lesson-meta">${rule.level} • ${rule.intro}</div></div><a class="btn" href="lessons.html?lesson=${idx+1}&chapter=rules&section=${section}"><i class="fas fa-play"></i> Начать</a>`;
        rulesGrid.appendChild(div);
      });
    }else {
      return;
    }
    container.appendChild(rulesGrid);
  }

  function renderPractice() {
    const container = h.qs("#lessons");
    (PRACTICES || []).forEach(pr => {
      const completed = (pr.based_on_lessons || []).every(id => h.isDone(id));
      const div = document.createElement("div");
      div.className = "lesson-card" + (!completed ? " locked" : "");
      div.innerHTML = `<div><h3>${pr.description}</h3><div class="lesson-meta">На основе: ${(pr.based_on_lessons||[]).join(', ')}</div></div>`;
      if (completed) {
        const btn = document.createElement("a");
        btn.className = "btn";
        btn.href = `lessons.html?practice=${pr.id}&chapter=practice`;
        btn.innerHTML = '<i class="fas fa-dumbbell"></i> Тренировать';
        div.appendChild(btn);
      } else {
        div.innerHTML += '<div class="lock-badge"><i class="fas fa-lock"></i> Пройди базовые уроки</div>';
      }
      container.appendChild(div);
    });
  }

  // Session rendering
  function renderSession() {
    const root = h.qs("#lesson-root");
    if (!root) return;
    const params = new URLSearchParams(window.location.search);
    const chapter = params.get("chapter") || "learning";
    const lessonParam = params.get("lesson");
    const practiceParam = params.get("practice");
    const section = params.get("section");

    if (chapter === "learning" && lessonParam) renderLearningSession(lessonParam);
    else if (chapter === "rules" && lessonParam && section) renderRulesSession(section, lessonParam);
    else if (chapter === "practice" && practiceParam) renderPracticeSession(practiceParam);
    else root.innerHTML = "<p>Сессия не указана. Вернитесь на главную.</p>";
  }

  function renderLearningSession(lessonParam) {
    const root = h.qs("#lesson-root");
    const id = "lesson" + lessonParam;
    const lesson = LESSONS.find(l => l.id === id);
    if (!lesson) { root.innerHTML = "<p>Урок не найден.</p>"; return; }
    const idx = LESSONS.findIndex(l => l.id === id);
    const prevDone = idx === 0 ? true : h.isDone(LESSONS[idx-1].id);
    if (!prevDone) {
      root.innerHTML = `<div class="lesson-hero"><h3>Урок заблокирован</h3><p class="small">Пройди предыдущий!</p><div class="controls"><a class="btn" href="/?chapter=learning"><i class="fas fa-arrow-left"></i> К модулям</a></div></div>`;
      return;
    }

    POINTS = 0; HEARTS = 10;
    root.innerHTML = "";
    ui.renderHeader(root, lesson.title, `${lesson.level} • ${lesson.intro}`, "restart-lesson");
    ui.renderStats(root, HEARTS);
    ui.renderProgress(root);
    const steps = [{key:"theory", title:"Теория"},{key:"vocab", title:"Слова"},{key:"practice", title:"Практика"}];
    const stepNav = ui.renderStepNav(root, steps, ["book","language","dumbbell"]);
    const content = document.createElement("div"); content.className = "step-content"; root.appendChild(content);

    let currentStep = 0, exerciseIndex = 0;

    function showStep(i) {
      currentStep = i;
      Array.from(stepNav.querySelectorAll(".btn")).forEach((b, idx) => {
        b.classList.toggle("ghost", idx !== i);
        b.disabled = idx > i;
      });
      content.innerHTML = "";
      if (i === 0) renderTheory(lesson, content);
      if (i === 1 && lesson.vocab) renderVocab(lesson, content);
      if (i === 2) renderExercises(lesson, content);
    }

    function renderTheory(lesson, container) {
      const box = document.createElement("div"); box.className = "theory";
      (lesson.theory || []).forEach(t => {
        const it = document.createElement("div"); it.className = "item";
        it.innerHTML = `<strong>${t.title}</strong><div class="small">${t.content}</div>`;
        box.appendChild(it);
      });
      container.appendChild(box);
      const items = Array.from(box.querySelectorAll(".item"));
      let i = 0;
      (function reveal(){
        if (i < items.length) { items[i].classList.add("visible"); i++; setTimeout(reveal,200); }
        else {
          const cont = document.createElement("div"); cont.className = "controls";
          const btn = document.createElement("button"); btn.className = "btn"; btn.innerHTML = '<i class="fas fa-arrow-right"></i> К словам';
          btn.addEventListener("click", ()=> { enableStep(1); showStep(1); });
          cont.appendChild(btn); container.appendChild(cont);
        }
      })();
    }

    function renderVocab(lesson, container) {
      const box = document.createElement("div"); box.className = "vocab-grid";
      (lesson.vocab || []).forEach((v) => {
        const item = document.createElement("div"); item.className = "vocab-item";
        item.dataset.de = v.de; item.dataset.ru = v.ru;
        item.innerHTML = `<span class="word">${v.de}</span><button class="btn small play-word" type="button"><i class="fas fa-volume-up"></i></button>`;
        item.addEventListener("click", () => {
          item.classList.toggle("flipped");
          item.querySelector(".word").textContent = item.classList.contains("flipped") ? v.ru : v.de;
        });
        box.appendChild(item);
      });
      container.appendChild(box);
      Array.from(container.querySelectorAll(".play-word")).forEach((b,i) => b.addEventListener("click", (e)=>{ e.stopPropagation(); h.speak(lesson.vocab[i].de); }));
      const cont = document.createElement("div"); cont.className = "controls";
      const btn = document.createElement("button"); btn.className = "btn"; btn.innerHTML = '<i class="fas fa-arrow-right"></i> К практике';
      btn.addEventListener("click", ()=> { enableStep(2); showStep(2); });
      cont.appendChild(btn); container.appendChild(cont);
    }

    function renderExercises(lesson, container) {
      exerciseIndex = 0;
      showNextExercise();
      function showNextExercise(){
        if (exerciseIndex >= (lesson.exercises || []).length) { completeLesson(lesson.id, container); return; }
        const curr = lesson.exercises[exerciseIndex];
        exModule.renderExercise(container, curr, {
          addPoints: addPoints,
          loseHeart: loseHeart,
          onContinue: ()=> { exerciseIndex++; showNextExercise(); }
        });
        ui.updateProgress(((exerciseIndex+1) / (lesson.exercises||[]).length) * 100);
      }
    }

    function addPoints(pts) { POINTS += pts; const p = h.qs("#points"); if (p) p.textContent = POINTS; }
    function loseHeart() { HEARTS--; const hEl = h.qs("#hearts"); if (hEl) hEl.textContent = HEARTS; if (HEARTS === 0) {
      content.innerHTML = '<div class="lesson-hero"><h3>Жизни кончились</h3><p class="small">Попробуй заново!</p><div class="controls"><button class="btn" onclick="location.reload()"><i class="fas fa-redo"></i> Рестарт</button></div></div>';
    } }

    function completeLesson(id, container) {
      h.markDone(id, HEARTS, POINTS);
      container.innerHTML = `<div class="lesson-hero"><h3>Урок пройден!</h3><p class="small">Очки: ${POINTS}, Осталось жизней: ${HEARTS}</p><div class="controls"><a class="btn" href="/?chapter=learning"><i class="fas fa-arrow-left"></i> К модулям</a></div></div>`;
    }

    function enableStep(i) {
      const btns = Array.from(stepNav.querySelectorAll(".btn"));
      if (btns[i]) { btns[i].disabled = false; btns[i].classList.remove("ghost"); }
    }

    if (!lesson.vocab) {
      const btns = Array.from(stepNav.querySelectorAll(".btn"));
      if (btns[1]) btns[1].style.display = "none";
    }

    showStep(0);
    h.qs("#restart-lesson").addEventListener("click", ()=> { h.unmarkDone(lesson.id); location.reload(); });
  }

  function renderRulesSession(section, lessonParam) {
    const root = h.qs("#lesson-root");
    const idx = parseInt(lessonParam,10) - 1;
    const rule = (RULES[section]||[])[idx];
    if (!rule) { root.innerHTML = "<p>Правило не найдено.</p>"; return; }
    POINTS = 0; HEARTS = 10;
    root.innerHTML = "";
    ui.renderHeader(root, rule.title, `${rule.level} • ${rule.intro}`, "restart-lesson");
    ui.renderStats(root, HEARTS);
    ui.renderProgress(root);
    const steps = [{key:"theory", title:"Теория"},{key:"practice", title:"Практика"}];
    const stepNav = ui.renderStepNav(root, steps, ["book","dumbbell"]);
    const content = document.createElement("div"); content.className = "step-content"; root.appendChild(content);

    let currentStep = 0, exerciseIndex = 0;

    function showStep(i) {
      currentStep = i;
      Array.from(stepNav.querySelectorAll(".btn")).forEach((b, idx) => {
        b.classList.toggle("ghost", idx !== i);
        b.disabled = idx > i;
      });
      content.innerHTML = "";
      if (i === 0) {
        const box = document.createElement("div"); box.className = "theory";
        (rule.theory||[]).forEach(t => {
          const it = document.createElement("div"); it.className = "item"; it.innerHTML = `<strong>${t.title}</strong><div class="small">${t.content}</div>`; box.appendChild(it);
        });
        content.appendChild(box);
        const items = Array.from(box.querySelectorAll(".item"));
        let j = 0;
        (function reveal(){ if (j < items.length) { items[j].classList.add("visible"); j++; setTimeout(reveal,200);} else {
          const cont = document.createElement("div"); cont.className="controls"; const btn = document.createElement("button"); btn.className="btn"; btn.innerHTML = '<i class="fas fa-arrow-right"></i> К практике'; btn.addEventListener("click", ()=> { enableStep(1); showStep(1); }); cont.appendChild(btn); content.appendChild(cont);
        }})(); 
      }
      if (i === 1) {
        exerciseIndex = 0;
        showNextExercise();
        function showNextExercise(){
          if (exerciseIndex >= (rule.exercises||[]).length) { h.markDone(rule.id, HEARTS, POINTS); content.innerHTML = `<div class="lesson-hero"><h3>Правило пройдено!</h3><p class="small">Очки: ${POINTS}</p><div class="controls"><a class="btn" href="/?chapter=rules"><i class="fas fa-arrow-left"></i> К правилам</a></div></div>`; return; }
          const curr = rule.exercises[exerciseIndex];
          exModule.renderExercise(content, curr, {
            addPoints: (pts)=>{ POINTS+=pts; h.qs("#points").textContent = POINTS; },
            loseHeart: ()=>{ HEARTS--; h.qs("#hearts").textContent = HEARTS; },
            onContinue: ()=>{ exerciseIndex++; showNextExercise(); }
          });
          ui.updateProgress(((exerciseIndex+1)/(rule.exercises||[]).length)*100);
        }
      }
    }

    function enableStep(i) { const btns = Array.from(stepNav.querySelectorAll(".btn")); if (btns[i]) { btns[i].disabled=false; btns[i].classList.remove("ghost"); } }
    showStep(0);
    h.qs("#restart-lesson").addEventListener("click", ()=>{ h.unmarkDone(rule.id); location.reload(); });
  }

  function renderPracticeSession(practiceId) {
    const root = h.qs("#lesson-root");
    const practice = (PRACTICES || []).find(p => p.id === practiceId);
    if (!practice) { root.innerHTML = "<p>Тренировка не найдена.</p>"; return; }
    root.innerHTML = "";
    ui.renderHeader(root, practice.description, "Бесконечная практика на основе пройденных уроков", "restart-practice");
    ui.renderStats(root, "∞");
    const content = document.createElement("div"); content.className = "step-content"; root.appendChild(content);
    POINTS = 0;

    function collectData() {
      let allVocab = [], allPhrases = [];
      (practice.based_on_lessons||[]).forEach(id => {
        const lesson = LESSONS.find(l => l.id === id);
        if (lesson) {
          allVocab = allVocab.concat(lesson.vocab || []);
          (lesson.exercises || []).forEach(ex => { if (ex.sentence) allPhrases.push(ex.sentence); });
        }
      });
      return { allVocab, allPhrases };
    }

    function generateExercise() {
      const data = collectData();
      if (practice.type === "sentence_build") {
        const phrase = data.allPhrases.length ? data.allPhrases[Math.floor(Math.random()*data.allPhrases.length)] : "Ich heiße Anna.";
        const pieces = phrase.split(" ").sort(() => Math.random()-0.5);
        return { type:"reorder", instruction:"Собери предложение", pieces, correct: phrase.split(" ") };
      } else if (practice.type === "translate_words") {
        const random = data.allVocab.length ? data.allVocab[Math.floor(Math.random()*data.allVocab.length)] : {de:"Ich", ru:"Я"};
        return { type:"input", question:`Переведи '${random.ru}' на немецкий:`, answer: random.de };
      }
      return { type:"input", question:"Нет доступных упражнений", answer:"" };
    }

    function showNext() {
      content.innerHTML = "";
      const ex = generateExercise();
      exModule.renderExercise(content, ex, {
        addPoints: (pts)=>{ POINTS+=pts; const p = h.qs("#points"); if(p) p.textContent = POINTS; },
        loseHeart: ()=>{},
        onContinue: ()=>{ showNext(); }
      });
    }

    showNext();
    h.qs("#restart-practice").addEventListener("click", ()=> location.reload());
  }

  const resetButton = document.querySelector('.remove_progress');
  if (resetButton) {
    resetButton.addEventListener('click', function() {
      BERLINGO.helpers.resetProgress();
    });
  }

  // Init
  window.addEventListener("load", () => {
    h.qsa('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const chapter = item.textContent.toLowerCase();
        if (chapter === "учёба")  {
          history.pushState(null, '', `?chapter=learning`);
          renderContent("learning");
        }
        else if (chapter === "правила") {
          history.pushState(null, '', `?chapter=rules`);
          renderContent("rules");
        }
        else if (chapter === "тренировка") {
          history.pushState(null, '', `?chapter=practice`);
          renderContent("practice");
        }
      });
    });

    if (window.location.search === "") {
      history.replaceState(null, '', `?chapter=learning`);
    }

    loadData();
  });

})(window.BERLINGO.helpers, window.BERLINGO.ui, window.BERLINGO.exercise);
