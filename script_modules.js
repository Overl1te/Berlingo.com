// Updated script_modules.js with fixed check buttons, full-width, and URL param support

const DATA_URL = "data/lessons.json";
let LESSONS = [];
let POINTS = 0;
let HEARTS = 10;

function qs(s, r = document) {
  return r.querySelector(s);
}
function qsa(s, r = document) {
  return Array.from(r.querySelectorAll(s));
}

async function loadData() {
  const res = await fetch(DATA_URL);
  const json = await res.json();
  LESSONS = json.lessons;
  renderIndex();
  renderLessonIfNeeded();
}

function renderIndex() {
  const container = qs("#lessons");
  if (!container) return;
  container.innerHTML = "";
  
  LESSONS.forEach((ls, idx) => {
    // Проверяем, полностью ли пройден предыдущий урок
    const prevLesson = idx > 0 ? LESSONS[idx - 1] : null;
    const prevDone = prevLesson ? isLessonComplete(prevLesson.id) : true;
    
    // Проверяем, полностью ли пройден текущий урок
    const currentDone = isLessonComplete(ls.id);
    
    const div = document.createElement("div");
    div.className = "lesson-card" + (!prevDone ? " locked" : "");
    div.style = 'position: relative;';
    
    let actionHtml = !prevDone
      ? '<div class="lock-badge"><i class="fas fa-lock"></i> После предыдущего</div>'
      : `<a class="btn" style="position: absolute; right: 10px; bottom: 10px" href="lessons.html?lesson=${idx + 1}">${currentDone ? '<i class="fas fa-redo"></i> Повторить' : '<i class="fas fa-play"></i> Начать'}</a>`;
    
    div.innerHTML = `<div><h3>${ls.title}</h3><div class="lesson-meta">${ls.level} • ${ls.intro}</div></div><div>${
      currentDone ? '<span class="small"><i class="fas fa-check-circle" style="color:var(--success)"></i> Пройден</span>' : '<span class="small"><i class="fas fa-unlock"></i> Доступно</span>'
    }${actionHtml}</div>`;
    
    container.appendChild(div);
  });
}

function isLessonComplete(lessonId) {
  // Проверяем, отмечен ли урок как пройденный
  const isMarkedDone = localStorage.getItem("berlingo_done_" + lessonId) === "1";
  
  // Дополнительная проверка: если урок пройден, но у пользоваля 0 сердец,
  // считаем его не пройденным (опционально)
  const heartsLeft = localStorage.getItem("berlingo_hearts_" + lessonId);
  if (isMarkedDone && heartsLeft !== null && parseInt(heartsLeft) === 0) {
    return false; // Урок "провален", нужно перепроходить
  }
  
  return isMarkedDone;
}

function renderLessonIfNeeded() {
  const root = qs("#lesson-root");
  if (!root) return;

  // Чтение ID из URL
  const urlParams = new URLSearchParams(window.location.search);
  const lessonParam = urlParams.get('lesson');
  if (!lessonParam) {
    root.innerHTML = "<p>Урок не указан. Вернитесь на главную.</p>";
    return;
  }
  const id = 'lesson' + lessonParam;
  const lesson = LESSONS.find((l) => l.id === id);
  if (!lesson) {
    root.innerHTML = "<p>Урок не найден.</p>";
    return;
  }
  const idx = LESSONS.findIndex((l) => l.id === id);
  const prevDone = idx === 0 ? true : localStorage.getItem("berlingo_done_" + LESSONS[idx - 1].id) === "1";
  if (!prevDone) {
    root.innerHTML = `<div class="lesson-hero"><h3>Урок заблокирован</h3><p class="small">Пройди предыдущий!</p><div class="controls"><a class="btn" href="index.html"><i class="fas fa-arrow-left"></i> К модулям</a></div></div>`;
    return;
  }
  POINTS = 0;
  HEARTS = 10;
  root.innerHTML = "";
  const header = document.createElement("div");
  header.className = "lesson-root-title";
  header.innerHTML = `<div><h2>${lesson.title}</h2><div class="small">${lesson.level} • ${lesson.intro}</div></div><div class="controls"><button id="restart-lesson" class="btn ghost"><i class="fas fa-redo"></i> Повторить</button></div>`;
  root.appendChild(header);

  const stats = document.createElement("div");
  stats.className = "stats";
  stats.innerHTML = `<div class="stat"><i class="fas fa-heart" style="color:var(--error)"></i> <span id="hearts">10</span></div><div class="stat"><i class="fas fa-star" style="color:var(--accent)"></i> <span id="points">0</span></div>`;
  root.appendChild(stats);

  const progress = document.createElement("div");
  progress.className = "progress-bar";
  progress.innerHTML = '<div class="progress-fill" style="width:0%"></div>';
  root.appendChild(progress);

  const steps = [
    { key: "theory", title: "Теория" },
    { key: "vocab", title: "Слова" },
    { key: "practice", title: "Практика" },
  ];
  const stepNav = document.createElement("div");
  stepNav.className = "step-nav small";
  stepNav.style.display = "flex";
  stepNav.style.gap = "8px";
  stepNav.style.marginTop = "8px";
  steps.forEach((s, i) => {
    const b = document.createElement("button");
    b.className = "btn ghost";
    b.innerHTML = `<i class="fas fa-${i === 0 ? "book" : i === 1 ? "language" : "dumbbell"}"></i> ${s.title}`;
    b.disabled = i !== 0;
    b.dataset.index = i;
    stepNav.appendChild(b);
  });
  root.appendChild(stepNav);

  const content = document.createElement("div");
  content.className = "step-content";
  root.appendChild(content);

  let currentStep = 0;
  let exerciseIndex = 0;
  function showStep(idx) {
    currentStep = idx;
    qsa(".step-nav .btn", stepNav).forEach((b, i) => {
      b.classList.toggle("ghost", i !== idx);
      b.disabled = i > idx;
    });
    content.innerHTML = "";
    if (idx === 0) renderTheory(lesson);
    if (idx === 1) renderVocab(lesson);
    if (idx === 2) renderPractice(lesson);
  }

  function renderTheory(lesson) {
    const box = document.createElement("div");
    box.className = "theory";
    lesson.theory.forEach((t) => {
      const it = document.createElement("div");
      it.className = "item";
      it.innerHTML = `<strong>${t.title}</strong><div class="small">${t.content}</div>`;
      box.appendChild(it);
    });
    content.appendChild(box);
    const items = qsa(".item", box);
    let i = 0;
    function reveal() {
      if (i < items.length) {
        items[i].classList.add("visible");
        i++;
        setTimeout(reveal, 200);
      } else {
        const cont = document.createElement("div");
        cont.className = "controls";
        const btn = document.createElement("button");
        btn.className = "btn";
        btn.innerHTML = '<i class="fas fa-arrow-right"></i> К словам';
        btn.addEventListener("click", () => {
          enableStep(1);
          showStep(1);
        });
        cont.appendChild(btn);
        content.appendChild(cont);
      }
    }
    reveal();
  }

  function renderVocab(lesson) {
    const box = document.createElement("div");
    box.className = "vocab-grid";
    lesson.vocab.forEach((v) => {
      const item = document.createElement("div");
      item.className = "vocab-item";
      item.dataset.de = v.de;
      item.dataset.ru = v.ru;
      item.innerHTML = `<span class="word">${v.de}</span><button class="btn small play-word"><i class="fas fa-volume-up"></i></button>`;
      item.addEventListener("click", () => {
        item.classList.toggle("flipped");
        item.querySelector(".word").textContent = item.classList.contains("flipped") ? v.ru : v.de;
      });
      box.appendChild(item);
    });
    content.appendChild(box);
    qsa(".play-word").forEach((b, i) =>
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        speak(lesson.vocab[i].de);
      })
    );
    const cont = document.createElement("div");
    cont.className = "controls";
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.innerHTML = '<i class="fas fa-arrow-right"></i> К практике';
    btn.addEventListener("click", () => {
      enableStep(2);
      showStep(2);
    });
    cont.appendChild(btn);
    content.appendChild(cont);
  }

  function renderPractice(lesson) {
    exerciseIndex = 0;
    showNextExercise(lesson);
  }

  function showNextExercise(lesson) {
    if (exerciseIndex >= lesson.exercises.length) {
      completeLesson(lesson.id);
      return;
    }
    content.innerHTML = "";
    const ex = lesson.exercises[exerciseIndex];
    const exEl = document.createElement("div");
    exEl.className = "exercise";
    exEl.innerHTML = `<div><strong>${ex.question || ex.instruction}</strong></div><div class="exercise-content"></div><div class="result"></div><div class="correct-answer" style="display:none; margin-top:8px; color:var(--muted);"></div><div class="controls check-controls"></div><div class="controls continue-controls" style="display:none;"></div>`;
    const exContent = exEl.querySelector(".exercise-content");
    const resultEl = exEl.querySelector(".result");
    const correctEl = exEl.querySelector(".correct-answer");
    const checkControls = exEl.querySelector(".check-controls");
    const continueControls = exEl.querySelector(".continue-controls");
    if (ex.type === "mcq") {
      ex.options.forEach((opt, i) => {
        const optEl = document.createElement("div");
        optEl.className = "option";
        optEl.textContent = opt;
        optEl.addEventListener("click", () => handleMcq(exEl, i, ex.answer, optEl, ex.options[ex.answer]));
        exContent.appendChild(optEl);
      });
    } else if (ex.type === "input") {
      exContent.innerHTML += '<input class="input-answer" placeholder="Введите ответ" />';
      addSpecialChars(exContent);
      const checkBtn = document.createElement("button");
      checkBtn.className = "btn check-input";
      checkBtn.innerHTML = '<i class="fas fa-check"></i> Проверить';
      checkBtn.addEventListener("click", () => handleInput(exEl, ex.answer));
      checkControls.appendChild(checkBtn);
    } else if (ex.type === "reorder") {
      exContent.innerHTML += '<div class="reorder-pieces"></div>';
      const piecesEl = exContent.querySelector(".reorder-pieces");
      const pieces = [...ex.pieces].sort(() => Math.random() - 0.5);
      pieces.forEach((p) => {
        const d = document.createElement("div");
        d.className = "piece";
        d.textContent = p;
        d.draggable = true;
        piecesEl.appendChild(d);
      });
      addDnDHandlers(piecesEl);
      const checkBtn = document.createElement("button");
      checkBtn.className = "btn check-reorder";
      checkBtn.innerHTML = '<i class="fas fa-check"></i> Проверить';
      checkBtn.addEventListener("click", () => handleReorder(exEl, ex.correct, piecesEl));
      checkControls.appendChild(checkBtn);
    } else if (ex.type === "match") {
      exContent.innerHTML += '<div class="match-pairs"><div class="match-column left"><div class="small">Немецкий</div></div><div class="match-column right"><div class="small">Русский</div></div></div>';
      const matchEl = exContent.querySelector(".match-pairs");
      const leftCol = matchEl.querySelector(".left");
      const rightCol = matchEl.querySelector(".right");
      const leftItems = ex.pairs.map(p => p.de).sort(() => Math.random() - 0.5);
      const rightItems = ex.pairs.map(p => p.ru).sort(() => Math.random() - 0.5);
      leftItems.forEach((de) => {
        const l = document.createElement("div");
        l.className = "match-left";
        l.textContent = de;
        leftCol.appendChild(l);
      });
      rightItems.forEach((ru) => {
        const r = document.createElement("div");
        r.className = "match-right";
        r.textContent = ru;
        rightCol.appendChild(r);
      });
      addMatchHandlers(matchEl, ex.pairs);
      const checkBtn = document.createElement("button");
      checkBtn.className = "btn check-match";
      checkBtn.innerHTML = '<i class="fas fa-check"></i> Проверить';
      checkBtn.addEventListener("click", () => handleMatch(exEl, ex.pairs, matchEl));
      checkControls.appendChild(checkBtn);
    } else if (ex.type === "fill_blank") {
      ex.answers.forEach(() => {
        const input = document.createElement("input");
        input.className = "blank-input input-answer small";
        input.placeholder = "...";
        exContent.appendChild(input);
      });
      addSpecialChars(exContent);
      const checkBtn = document.createElement("button");
      checkBtn.className = "btn check-fill";
      checkBtn.innerHTML = '<i class="fas fa-check"></i> Проверить';
      checkBtn.addEventListener("click", () => handleFillBlank(exEl, ex.answers));
      checkControls.appendChild(checkBtn);
    } else if (ex.type === "listen_type") {
      // Сначала создаем кнопку прослушать
      const listenBtn = document.createElement("button");
      listenBtn.className = "btn listen-btn small";
      listenBtn.innerHTML = '<i class="fas fa-volume-up"></i> Прослушать';
      listenBtn.addEventListener("click", () => speak(ex.phrase));
      exContent.appendChild(listenBtn); // Добавляем кнопку в контейнер

      // Затем создаем input
      const input = document.createElement("input");
      input.className = "input-answer";
      input.placeholder = "Введите услышанное";
      exContent.appendChild(input); // Добавляем input после кнопки

      addSpecialChars(exContent);
      const checkBtn = document.createElement("button");
      checkBtn.className = "btn check-input";
      checkBtn.innerHTML = '<i class="fas fa-check"></i> Проверить';
      checkBtn.addEventListener("click", () => handleInput(exEl, ex.phrase));
      checkControls.appendChild(checkBtn);
    }
    content.appendChild(exEl);
  }

  function handleMcq(exEl, selected, correctIdx, optEl, correctText) {
    const resultEl = exEl.querySelector(".result");
    const correctEl = exEl.querySelector(".correct-answer");
    const continueControls = exEl.querySelector(".continue-controls");
    qsa(".option", exEl).forEach(o => o.style.pointerEvents = "none");
    if (selected === correctIdx) {
      optEl.classList.add("correct");
      resultEl.textContent = "Правильно!";
      resultEl.style.color = "var(--success)";
      addPoints(10);
    } else {
      optEl.classList.add("incorrect");
      resultEl.textContent = "Неверно.";
      resultEl.style.color = "var(--error)";
      correctEl.textContent = `Правильный: ${correctText}`;
      correctEl.style.display = "block";
      loseHeart();
    }
    showContinueButton(continueControls);
  }

  function handleInput(exEl, answer) {
    const input = exEl.querySelector(".input-answer");
    const resultEl = exEl.querySelector(".result");
    const correctEl = exEl.querySelector(".correct-answer");
    const continueControls = exEl.querySelector(".continue-controls");
    const checkControls = exEl.querySelector(".check-controls");
    if (input.value.trim().toLowerCase() === answer.toLowerCase()) {
      input.style.border = "2px solid var(--success)";
      resultEl.textContent = "Правильно!";
      resultEl.style.color = "var(--success)";
      addPoints(10);
    } else {
      input.style.border = "2px solid var(--error)";
      resultEl.textContent = "Неверно.";
      resultEl.style.color = "var(--error)";
      correctEl.textContent = `Правильный: ${answer}`;
      correctEl.style.display = "block";
      loseHeart();
    }
    input.disabled = true;
    checkControls.innerHTML = "";
    showContinueButton(continueControls);
  }

  function handleReorder(exEl, correct, piecesEl) {
    const resultEl = exEl.querySelector(".result");
    const correctEl = exEl.querySelector(".correct-answer");
    const continueControls = exEl.querySelector(".continue-controls");
    const checkControls = exEl.querySelector(".check-controls");
    const currentOrder = qsa(".piece", piecesEl).map(p => p.textContent);
    if (currentOrder.join(' ') === correct.join(' ')) {
      piecesEl.style.border = "2px solid var(--success)";
      resultEl.textContent = "Правильно!";
      resultEl.style.color = "var(--success)";
      addPoints(15);
    } else {
      piecesEl.style.border = "2px solid var(--error)";
      resultEl.textContent = "Неверно.";
      resultEl.style.color = "var(--error)";
      correctEl.textContent = `Правильный порядок: ${correct.join(' ')}`;
      correctEl.style.display = "block";
      loseHeart();
    }
    checkControls.innerHTML = "";
    qsa(".piece", piecesEl).forEach(p => p.draggable = false);
    showContinueButton(continueControls);
  }

  function handleMatch(exEl, pairs, matchEl) {
    const resultEl = exEl.querySelector(".result");
    const correctEl = exEl.querySelector(".correct-answer");
    const continueControls = exEl.querySelector(".continue-controls");
    const checkControls = exEl.querySelector(".check-controls");
    const leftEls = qsa(".match-left", matchEl);
    let correct = true;
    leftEls.forEach((l) => {
      if (!l.dataset.matched) {
        correct = false;
      } else {
        const expectedRu = pairs.find((p) => p.de === l.textContent).ru;
        if (l.dataset.matched !== expectedRu) {
          correct = false;
        }
      }
    });
    if (correct) {
      resultEl.textContent = "Правильно!";
      resultEl.style.color = "var(--success)";
      qsa(".match-left, .match-right", matchEl).forEach((el) => el.classList.add("correct"));
      addPoints(20);
    } else {
      resultEl.textContent = "Неверно.";
      resultEl.style.color = "var(--error)";
      // Show correct pairs
      let correctText = "Правильные пары: ";
      pairs.forEach(p => correctText += `${p.de} - ${p.ru}; `);
      correctEl.textContent = correctText;
      correctEl.style.display = "block";
      leftEls.forEach((l) => {
        if (l.dataset.matched) {
          const r = qsa(".match-right", matchEl).find((r) => r.textContent === l.dataset.matched);
          const expected = pairs.find((p) => p.de === l.textContent).ru;
          if (l.dataset.matched !== expected) {
            l.classList.add("incorrect");
            if (r) r.classList.add("incorrect");
          } else {
            l.classList.add("correct");
            if (r) r.classList.add("correct");
          }
        }
      });
      loseHeart();
    }
    checkControls.innerHTML = "";
    qsa(".match-left, .match-right", matchEl).forEach(el => el.style.pointerEvents = "none");
    showContinueButton(continueControls);
  }

  function handleFillBlank(exEl, answers) {
    const resultEl = exEl.querySelector(".result");
    const correctEl = exEl.querySelector(".correct-answer");
    const continueControls = exEl.querySelector(".continue-controls");
    const checkControls = exEl.querySelector(".check-controls");
    const inputs = qsa(".blank-input", exEl);
    let correct = true;
    let correctText = "Правильные ответы: ";
    inputs.forEach((inp, i) => {
      if (inp.value.trim().toLowerCase() !== answers[i].toLowerCase()) correct = false;
      correctText += `${answers[i]} `;
    });
    resultEl.textContent = correct ? "Правильно!" : "Неверно.";
    resultEl.style.color = correct ? "var(--success)" : "var(--error)";
    if (!correct) {
      correctEl.textContent = correctText;
      correctEl.style.display = "block";
      loseHeart();
    } else addPoints(15);
    inputs.forEach(inp => inp.disabled = true);
    checkControls.innerHTML = "";
    showContinueButton(continueControls);
  }

  function showContinueButton(controls) {
    controls.style.display = "flex";
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.innerHTML = '<i class="fas fa-arrow-right"></i> Продолжить';
    btn.addEventListener("click", nextExercise);
    controls.appendChild(btn);
  }

  function nextExercise() {
    exerciseIndex++;
    updateProgress((exerciseIndex / lesson.exercises.length) * 100);
    if (HEARTS > 0) showNextExercise(lesson);
    else {
      content.innerHTML = '<div class="lesson-hero"><h3>Жизни кончились!</h3><p class="small">Попробуй снова.</p><button class="btn" onclick="location.reload()"><i class="fas fa-redo"></i> Рестарт</button></div>';
    }
  }

  function addPoints(pts) {
    POINTS += pts;
    qs("#points").textContent = POINTS;
    // Confetti animation (simple)
    console.log("Confetti!"); // Можно добавить библиотеку confetti.js
  }

  function loseHeart() {
    HEARTS--;
    qs("#hearts").textContent = HEARTS;
    if (HEARTS === 0) nextExercise(); // Завершить
  }

  function updateProgress(percent) {
    qs(".progress-fill").style.width = `${percent}%`;
  }

  function completeLesson(id) {
    // Сохраняем не только статус завершения, но и количество оставшихся сердец
    localStorage.setItem("berlingo_done_" + id, "1");
    localStorage.setItem("berlingo_hearts_" + id, HEARTS.toString());
    localStorage.setItem("berlingo_points_" + id, POINTS.toString());
    
    content.innerHTML = '<div class="lesson-hero"><h3>Урок пройден!</h3><p class="small">Очки: ' + POINTS + ', Осталось жизней: ' + HEARTS + '</p><div class="controls"><a class="btn" href="index.html"><i class="fas fa-arrow-left"></i> К модулям</a></div></div>';
  }

  function enableStep(i) {
    const btns = qsa(".step-nav .btn", stepNav);
    if (btns[i]) {
      btns[i].disabled = false;
      btns[i].classList.remove("ghost");
    }
  }

  function addDnDHandlers(container) {
    let selectedPiece = null;

    // Обновленная логика для ПК: используем native HTML5 drag-and-drop с улучшениями
    container.addEventListener("dragstart", (e) => {
      if (e.target.classList.contains("piece")) {
        selectedPiece = e.target;
        e.target.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", ""); // Для Firefox
      }
    });

    container.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const after = getDragAfterElement(container, e.clientX, e.clientY);
      if (after == null) {
        container.appendChild(selectedPiece);
      } else {
        container.insertBefore(selectedPiece, after);
      }
    });

    container.addEventListener("dragend", (e) => {
      if (selectedPiece) {
        selectedPiece.classList.remove("dragging");
        selectedPiece = null;
      }
    });

    container.addEventListener("drop", (e) => {
      e.preventDefault();
    });

    // Обновленная логика для мобильных: улучшенный touch с плавным перемещением и snapping
    let touchStartX = 0, touchStartY = 0, initialLeft = 0, initialTop = 0;
    container.addEventListener("touchstart", (e) => {
      if (e.target.classList.contains("piece")) {
        selectedPiece = e.target;
        selectedPiece.classList.add("dragging");
        const rect = selectedPiece.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        selectedPiece.style.position = "absolute"; // Делаем absolute для плавного движения
        selectedPiece.style.zIndex = 1000;
        selectedPiece.style.left = `${initialLeft}px`;
        selectedPiece.style.top = `${initialTop}px`;
        selectedPiece.style.transition = "none";
      }
    }, { passive: false });

    container.addEventListener("touchmove", (e) => {
      if (selectedPiece) {
        e.preventDefault();
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        selectedPiece.style.left = `${initialLeft + dx}px`;
        selectedPiece.style.top = `${initialTop + dy}px`;
      }
    }, { passive: false });

    container.addEventListener("touchend", (e) => {
      if (selectedPiece) {
        selectedPiece.classList.remove("dragging");
        selectedPiece.style.position = "";
        selectedPiece.style.zIndex = "";
        selectedPiece.style.left = "";
        selectedPiece.style.top = "";
        selectedPiece.style.transition = "all 0.2s ease";
        const after = getDragAfterElement(container, e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        if (after == null) {
          container.appendChild(selectedPiece);
        } else {
          container.insertBefore(selectedPiece, after);
        }
        selectedPiece = null;
      }
    }, { passive: false });
  }

  function getDragAfterElement(container, x, y) {
    const els = Array.from(container.querySelectorAll(".piece:not(.dragging)"));
    return els.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2; // Улучшено: фокус на вертикальном offset для горизонтального контейнера
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  function addMatchHandlers(matchEl, pairs) {
    let selectedLeft = null;
    let selectedRight = null;
    qsa(".match-left", matchEl).forEach(l => {
      l.addEventListener("click", () => {
        if (l.classList.contains("matched")) return;
        if (selectedLeft) selectedLeft.classList.remove("selected");
        selectedLeft = l;
        selectedLeft.classList.add("selected");
        if (selectedRight) tryMatch();
      });
    });
    qsa(".match-right", matchEl).forEach(r => {
      r.addEventListener("click", () => {
        if (r.classList.contains("matched")) return;
        if (selectedRight) selectedRight.classList.remove("selected");
        selectedRight = r;
        selectedRight.classList.add("selected");
        if (selectedLeft) tryMatch();
      });
    });
    function tryMatch() {
      const expected = pairs.find(p => p.de === selectedLeft.textContent).ru;
      if (selectedRight.textContent === expected) {
        selectedLeft.dataset.matched = selectedRight.textContent;
        selectedRight.dataset.matched = selectedLeft.textContent;
        selectedLeft.classList.add("matched");
        selectedRight.classList.add("matched");
      }
      selectedLeft.classList.remove("selected");
      selectedRight.classList.remove("selected");
      selectedLeft = null;
      selectedRight = null;
    }
  }

  function addSpecialChars(content) {
    const chars = ['ä', 'ö', 'ü', 'ß'];
    const div = document.createElement("div");
    div.className = "special-chars small";
    div.style.marginTop = "8px";
    chars.forEach(c => {
      const b = document.createElement("button");
      b.className = "btn ghost small";
      b.textContent = c;
      b.addEventListener("click", () => {
        const inp = content.querySelector(".input-answer");
        inp.value += c;
        inp.focus();
      });
      div.appendChild(b);
    });
    content.appendChild(div);
  }

  function showWordPopup(de, ru) {
    const popup = qs("#word-popup");
    qs("#popup-word").textContent = de;
    qs("#popup-translate").textContent = ru;
    popup.classList.remove("hidden");
    popup.setAttribute("aria-hidden", "false");
    qs("#popup-play").onclick = () => speak(de);
    qs("#popup-close").onclick = () => {
      popup.classList.add("hidden");
      popup.setAttribute("aria-hidden", "true");
    };
  }

  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "de-DE";
    const voices = speechSynthesis.getVoices().filter((v) => v.lang.startsWith("de"));
    if (voices[0]) u.voice = voices[0];
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }

  showStep(0);
  qs("#restart-lesson").addEventListener("click", () => {
    localStorage.removeItem("berlingo_done_" + id);
    location.reload();
  });
}

window.addEventListener("load", loadData);