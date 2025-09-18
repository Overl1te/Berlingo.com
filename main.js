/*
  main.js
  - Loads data and drives page rendering (learning, rules, practice)
  - Uses BERLINGO.helpers, BERLINGO.ui, BERLINGO.exercise
*/
(function (h, ui, exModule) {
  const LESSONS_INDEX_URL = "data/lessons_index.json";
  const RULES_URL = "data/rules.json";
  const PRACTICE_URL = "data/practice.json";
  let LESSONS = [], RULES = {grammar:[], listening:[]}, PRACTICES = [];
  let POINTS = 0, HEARTS = 10;

  const moduleCache = new Map(); // Кэш для загруженных модулей

  async function getModule(moduleId) {
    if (moduleCache.has(moduleId)) {
      return moduleCache.get(moduleId);
    }
    const response = await fetch(`data/chapters/modules/${moduleId}.json`);
    const data = await response.json();
    moduleCache.set(moduleId, data);
    return data;
  }

  async function getLesson(lessonId) {
    const match = lessonId.match(/lesson(\d+)_/);
    if (!match) {
      throw new Error(`Invalid lesson ID: ${lessonId}`);
    }
    const moduleNum = match[1];
    const moduleId = `module${moduleNum}`;
    const moduleData = await getModule(moduleId);
    const lesson = moduleData.lessons.find(l => l.id === lessonId);
    if (!lesson) {
      throw new Error(`Lesson not found: ${lessonId}`);
    }
    return lesson;
  }

  async function loadData() {
    const [lRes, rRes, pRes] = await Promise.all([fetch(LESSONS_INDEX_URL), fetch(RULES_URL), fetch(PRACTICE_URL)]);
    LESSONS = (await lRes.json()).sections || [];  // Теперь это индекс без lessons в modules
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
    if (isMain) await renderContent(chapter);
    else if (isSession) await renderSession();
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
    if (chapter === "learning") await renderLearning();
    else if (chapter === "rules") renderRules();
    else if (chapter === "practice") renderPractice();
  }

  async function renderLearning() {
    const container = h.qs("#lessons");
    const subNav = document.createElement('div');
    subNav.className = 'nav-container';
    subNav.style.marginBottom = '16px';
    LESSONS.forEach((section, index) => {
      const item = document.createElement('div');
      item.className = 'nav-item';
      item.textContent = section.level;
      item.addEventListener('click', async () => {
        h.qsa('.nav-item', subNav).forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        await renderModules(section.modules, content);
      });
      subNav.appendChild(item);
    });
    container.appendChild(subNav);

    const content = document.createElement('div');
    content.id = 'learning-content';
    container.appendChild(content);

    if (LESSONS.length > 0) {
      h.qsa('.nav-item', subNav)[0].classList.add('active');
      await renderModules(LESSONS[0].modules, content);
    }
  }

  async function renderModules(modules, contentEl) {
    contentEl.innerHTML = '';
    for (const module of modules) {
      const moduleData = await getModule(module.id);
      module.lessons = moduleData.lessons || [];  // Добавляем lessons из отдельного файла

      const moduleCard = document.createElement('div');
      moduleCard.className = 'module-card';
      moduleCard.innerHTML = `<h3>${module.title}</h3><div class="lesson-meta">${module.intro || 'Модуль с уроками'}</div>`;
      
      const lessonsList = document.createElement('div');
      lessonsList.className = 'lessons-in-module';
      module.lessons.forEach((ls, idx) => {
        const prev = idx > 0 ? module.lessons[idx - 1] : null;
        const prevDone = prev ? h.isDone(prev.id) : true;
        const currentDone = h.isDone(ls.id);
        const card = document.createElement('div');
        card.className = 'lesson-card' + (!prevDone ? ' locked' : '');
        const actionHtml = !prevDone ? '<div class="lock-badge"><i class="fas fa-lock"></i> После предыдущего</div>'
          : `<a class="btn" style="position:absolute; right:10px; bottom:10px" href="lessons.html?lesson=${ls.id}&chapter=learning">${currentDone ? '<i class="fas fa-check"></i> Повторить' : '<i class="fas fa-play"></i> Начать'}</a>`;
        card.innerHTML = `<h4>${ls.title}</h4><div class="lesson-meta">${ls.intro || ''}</div>${actionHtml}`;
        lessonsList.appendChild(card);
      });
      moduleCard.appendChild(lessonsList);
      contentEl.appendChild(moduleCard);
    }
  }

  function renderRules() {
    const container = h.qs("#lessons");
    const grammar = RULES.grammar || [];
    const listening = RULES.listening || [];
    const renderGroup = (title, items) => {
      const div = document.createElement("div");
      div.innerHTML = `<h3>${title}</h3>`;
      const grid = document.createElement("div");
      grid.className = "lessons-grid";
      items.forEach(rule => {
        const done = h.isDone(rule.id);
        const card = document.createElement("div");
        card.className = "lesson-card";
        card.innerHTML = `<h3>${rule.title}</h3><div class="lesson-meta">${rule.intro || ''}</div><a class="btn" style="position:absolute; right:10px; bottom:10px" href="lessons.html?lesson=${rule.id}&chapter=rules">${done ? '<i class="fas fa-check"></i> Повторить' : '<i class="fas fa-play"></i> Начать'}</a>`;
        grid.appendChild(card);
      });
      div.appendChild(grid);
      container.appendChild(div);
    };
    renderGroup("Грамматика", grammar);
    renderGroup("Аудирование", listening);
  }

  function renderPractice() {
    const container = h.qs("#lessons");
    const grid = document.createElement("div");
    grid.className = "lessons-grid";
    PRACTICES.forEach(p => {
      const card = document.createElement("div");
      card.className = "lesson-card";
      card.innerHTML = `<h3>${p.description}</h3><div class="lesson-meta">На основе уроков</div><a class="btn" style="position:absolute; right:10px; bottom:10px" href="lessons.html?lesson=${p.id}&chapter=practice"><i class="fas fa-dumbbell"></i> Тренировать</a>`;
      grid.appendChild(card);
    });
    container.appendChild(grid);
  }

  async function renderSession() {
    const root = h.qs("#lesson-root");
    if (!root) return;
    const urlParams = new URLSearchParams(window.location.search);
    const lessonId = urlParams.get("lesson");
    const chapter = urlParams.get("chapter") || "learning";
    root.innerHTML = "";

    if (chapter === "rules") {
      const allRules = [...RULES.grammar, ...RULES.listening];
      const rule = allRules.find(r => r.id === lessonId);
      if (!rule) { root.innerHTML = "<p>Правило не найдено.</p>"; return; }
      ui.renderHeader(root, rule.title, rule.intro, "restart-lesson");
      HEARTS = parseInt(localStorage.getItem("berlingo_hearts_" + rule.id)) || 10;
      POINTS = parseInt(localStorage.getItem("berlingo_points_" + rule.id)) || 0;
      ui.renderStats(root, HEARTS);
      const progress = ui.renderProgress(root);
      const steps = [{title:"Теория"}, {title:"Упражнения"}];
      const stepNav = ui.renderStepNav(root, steps, ["book", "dumbbell"]);
      const content = document.createElement("div"); content.className = "step-content"; root.appendChild(content);
      let exerciseIndex = 0;

      function showStep(i) {
        content.innerHTML = "";
        h.qsa(".btn", stepNav).forEach(b => b.classList.remove("active"));
        h.qsa(".btn", stepNav)[i].classList.add("active");
        if (i === 0) {
          const theory = document.createElement("div"); theory.className = "theory";
          (rule.theory || []).forEach(t => {
            const sec = document.createElement("section");
            sec.innerHTML = `<h4>${t.title}</h4><p>${t.content}</p>`;
            theory.appendChild(sec);
          });
          content.appendChild(theory);
          const cont = document.createElement("div"); cont.className = "controls"; cont.innerHTML = '<button class="btn"><i class="fas fa-arrow-right"></i> К упражнениям</button>';
          cont.querySelector("button").addEventListener("click", ()=> { enableStep(1); showStep(1); });
          content.appendChild(cont);
        }
        if (i === 1) {
          showNextExercise();
        }
      }

      function showNextExercise(){
        if (exerciseIndex >= (rule.exercises||[]).length) {
          h.markDone(rule.id, HEARTS, POINTS);
          content.innerHTML = `<div class="lesson-hero"><h3>Правило пройдено!</h3><p class="small">Очки: ${POINTS}</p><div class="controls"><a class="btn" href="/?chapter=rules"><i class="fas fa-arrow-left"></i> К правилам</a></div></div>`;
          return;
        }
        const curr = rule.exercises[exerciseIndex];
        exModule.renderExercise(content, curr, {
          addPoints: (pts)=>{ POINTS+=pts; h.qs("#points").textContent = POINTS; },
          loseHeart: ()=>{ HEARTS--; h.qs("#hearts").textContent = HEARTS; if (HEARTS <= 0) { content.innerHTML = '<p>Сердечки кончились! Повторите урок.</p>'; } },
          onContinue: ()=>{ exerciseIndex++; showNextExercise(); }
        });
        ui.updateProgress(((exerciseIndex+1)/(rule.exercises||[]).length)*100);
      }

      function enableStep(i) { const btns = Array.from(stepNav.querySelectorAll(".btn")); if (btns[i]) { btns[i].disabled=false; btns[i].classList.remove("ghost"); } }
      showStep(0);
      h.qs("#restart-lesson").addEventListener("click", ()=>{ h.unmarkDone(rule.id); location.reload(); });
    } else if (chapter === "practice") {
      await renderPracticeSession(lessonId);
    } else {  // learning
      let lesson;
      try {
        lesson = await getLesson(lessonId);
      } catch (e) {
        root.innerHTML = "<p>Урок не найден.</p>";
        return;
      }
      ui.renderHeader(root, lesson.title, lesson.intro, "restart-lesson");
      HEARTS = parseInt(localStorage.getItem("berlingo_hearts_" + lesson.id)) || 10;
      POINTS = parseInt(localStorage.getItem("berlingo_points_" + lesson.id)) || 0;
      ui.renderStats(root, HEARTS);
      const progress = ui.renderProgress(root);
      const steps = [{title:"Теория"}, {title:"Словарь"}, {title:"Упражнения"}];
      const stepNav = ui.renderStepNav(root, steps, ["book","language","dumbbell"]);
      const content = document.createElement("div"); content.className = "step-content"; root.appendChild(content);
      let exerciseIndex = 0;

      function showStep(i) {
        content.innerHTML = "";
        h.qsa(".btn", stepNav).forEach(b => b.classList.remove("active"));
        h.qsa(".btn", stepNav)[i].classList.add("active");
        if (i === 0) {
          const theory = document.createElement("div"); theory.className = "theory";
          (lesson.theory || []).forEach(t => {
            const sec = document.createElement("section");
            sec.innerHTML = `<h4>${t.title}</h4><p>${t.content}</p>`;
            theory.appendChild(sec);
          });
          content.appendChild(theory);
          const cont = document.createElement("div"); cont.className = "controls"; cont.innerHTML = '<button class="btn"><i class="fas fa-arrow-right"></i> К словарю</button>';
          cont.querySelector("button").addEventListener("click", ()=> { enableStep(1); showStep(1); });
          content.appendChild(cont);
        }
        if (i === 1) {
          const vocab = document.createElement("div"); vocab.className = "vocab-grid";
          (lesson.vocab || []).forEach(v => {
            const card = document.createElement("div");
            card.className = "vocab-card";
            card.innerHTML = `<strong>${v.de}</strong> - ${v.ru}`;
            card.addEventListener("click", () => h.speak(v.de));
            vocab.appendChild(card);
          });
          content.appendChild(vocab);
          const cont = document.createElement("div"); cont.className = "controls"; cont.innerHTML = '<button class="btn"><i class="fas fa-arrow-right"></i> К упражнениям</button>';
          cont.querySelector("button").addEventListener("click", ()=> { enableStep(2); showStep(2); });
          content.appendChild(cont);
        }
        if (i === 2) {
          showNextExercise();
        }
      }

      function showNextExercise(){
        if (exerciseIndex >= (lesson.exercises||[]).length) {
          h.markDone(lesson.id, HEARTS, POINTS);
          content.innerHTML = `<div class="lesson-hero"><h3>Урок пройден!</h3><p class="small">Очки: ${POINTS}</p><div class="controls"><a class="btn" href="/?chapter=learning"><i class="fas fa-arrow-left"></i> К урокам</a></div></div>`;
          return;
        }
        const curr = lesson.exercises[exerciseIndex];
        exModule.renderExercise(content, curr, {
          addPoints: (pts)=>{ POINTS+=pts; h.qs("#points").textContent = POINTS; },
          loseHeart: ()=>{ HEARTS--; h.qs("#hearts").textContent = HEARTS; if (HEARTS <= 0) { content.innerHTML = '<p>Сердечки кончились! Повторите урок.</p>'; } },
          onContinue: ()=>{ exerciseIndex++; showNextExercise(); }
        });
        ui.updateProgress(((exerciseIndex+1)/(lesson.exercises||[]).length)*100);
      }

      function enableStep(i) { const btns = Array.from(stepNav.querySelectorAll(".btn")); if (btns[i]) { btns[i].disabled=false; btns[i].classList.remove("ghost"); } }
      showStep(0);
      h.qs("#restart-lesson").addEventListener("click", ()=>{ h.unmarkDone(lesson.id); location.reload(); });
    }
  }

  async function renderPracticeSession(practiceId) {
    const root = h.qs("#lesson-root");
    const practice = (PRACTICES || []).find(p => p.id === practiceId);
    if (!practice) { root.innerHTML = "<p>Тренировка не найдена.</p>"; return; }
    root.innerHTML = "";
    ui.renderHeader(root, practice.description, "Бесконечная практика на основе пройденных уроков", "restart-practice");
    ui.renderStats(root, "∞");
    const content = document.createElement("div"); content.className = "step-content"; root.appendChild(content);
    POINTS = 0;

    async function collectData() {
      let allVocab = [], allPhrases = [];
      for (const id of (practice.based_on_lessons || [])) {
        const lesson = await getLesson(id);
        if (lesson) {
          allVocab = allVocab.concat(lesson.vocab || []);
          (lesson.exercises || []).forEach(ex => { if (ex.sentence) allPhrases.push(ex.sentence); });
        }
      }
      return { allVocab, allPhrases };
    }

    function generateExercise(data) {
      if (practice.type === "sentence_build") {
        const phrase = data.allPhrases.length ? data.allPhrases[Math.floor(Math.random() * data.allPhrases.length)] : "Ich heiße Anna.";
        const pieces = phrase.split(" ").sort(() => Math.random() - 0.5);
        return { type: "reorder", instruction: "Собери предложение", pieces, correct: phrase.split(" ") };
      } else if (practice.type === "translate_words") {
        const random = data.allVocab.length ? data.allVocab[Math.floor(Math.random() * data.allVocab.length)] : { de: "Ich", ru: "Я" };
        return { type: "input", question: `Переведи '${random.ru}' на немецкий:`, answer: random.de };
      }
      return { type: "input", question: "Нет доступных упражнений", answer: "" };
    }

    async function showNext() {
      content.innerHTML = "";
      const data = await collectData();  // Await here to get data
      // Затем используйте data для generateExercise (адаптируйте generateExercise для использования data)
      const ex = generateExercise(data);  // Предполагаем, что вы адаптируете функцию generateExercise для принятия data
      exModule.renderExercise(content, ex, {
        addPoints: (pts)=>{ POINTS+=pts; const p = h.qs("#points"); if(p) p.textContent = POINTS; },
        loseHeart: ()=>{},
        onContinue: ()=>{ showNext(); }
      });
    }

    await showNext();
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
      item.addEventListener('click', async () => {  // async для потенциальной await
        const chapter = item.textContent.toLowerCase();
        if (chapter === "учёба")  {
          history.pushState(null, '', `?chapter=learning`);
          await renderContent("learning");
        }
        else if (chapter === "правила") {
          history.pushState(null, '', `?chapter=rules`);
          await renderContent("rules");
        }
        else if (chapter === "тренировка") {
          history.pushState(null, '', `?chapter=practice`);
          await renderContent("practice");
        }
      });
    });

    if (window.location.search === "") {
      history.replaceState(null, '', `?chapter=learning`);
    }

    loadData();
  });

})(window.BERLINGO.helpers, window.BERLINGO.ui, window.BERLINGO.exercise);