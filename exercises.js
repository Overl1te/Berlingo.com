/*
  exercises.js
  - Single entry point: renderExercise(ex, opts)
  - Handles mcq, input, reorder, match, fill_blank, listen_type, pronounce
  Expose under BERLINGO.exercise
*/
window.BERLINGO = window.BERLINGO || {};
window.BERLINGO.exercise = (function (h, ui) {

  function renderExercise(container, ex, state) {
    // state: { addPoints, loseHeart, onContinue }
    container.innerHTML = "";
    const exEl = document.createElement("div");
    exEl.className = "exercise";
    exEl.innerHTML = `<div><strong>${ex.question || ex.instruction || ex.title || ""}</strong></div>
      <div class="exercise-content"></div>
      <div class="result"></div>
      <div class="correct-answer" style="display:none; margin-top:8px; color:var(--muted);"></div>
      <div class="controls check-controls"></div>
      <div class="controls continue-controls" style="display:none;"><button class="btn continue-btn"><i class="fas fa-arrow-right"></i> Далее</button></div>`;
    const exContent = exEl.querySelector(".exercise-content");
    const resultEl = exEl.querySelector(".result");
    const correctAnswerEl = exEl.querySelector(".correct-answer");
    const checkControls = exEl.querySelector(".check-controls");
    const continueControls = exEl.querySelector(".continue-controls");
    const continueBtn = exEl.querySelector(".continue-btn");

    continueBtn.addEventListener("click", () => {
      if (state && typeof state.onContinue === "function") state.onContinue();
    });

    function finish(correct) {
      if (correct) {
        if (state && typeof state.addPoints === "function") state.addPoints(10);
      } else {
        if (state && typeof state.loseHeart === "function") state.loseHeart();
      }
      continueControls.style.display = "block";
    }

    if (ex.type === "mcq") {
      ex.options.forEach((opt, i) => {
        const btn = document.createElement("button");
        btn.className = "btn mcq-option option";
        btn.type = "button";
        btn.textContent = opt;
        btn.addEventListener("click", () => {
          const isCorrect = i === ex.answer;
          if (isCorrect) {
            h.speak(opt);  // Произносить только правильный вариант при выборе
          }
          resultEl.innerHTML = isCorrect ? '<i class="fas fa-check" style="color:var(--success)"></i> Правильно!' : '<i class="fas fa-times" style="color:var(--error)"></i> Неправильно.';
          Array.from(exContent.querySelectorAll(".mcq-option")).forEach(b => b.disabled = true);
          finish(isCorrect);
        });
        exContent.appendChild(btn);
      });
    } else if (ex.type === "input" || ex.type === "fill_blank" || ex.type === "listen_type") {
      if (ex.type === "listen_type") {
        const playBtn = document.createElement("button");
        playBtn.className = "btn";
        playBtn.type = "button";
        playBtn.innerHTML = '<i class="fas fa-play"></i> Прослушать';
        playBtn.addEventListener("click", () => h.speak(ex.phrase || ex.answer || ""));
        exContent.appendChild(playBtn);
      }
      if (ex.type === "fill_blank") {
        const sentence = document.createElement("div");
        sentence.className = "sentence";
        sentence.textContent = ex.sentence || ex.question || "";
        exContent.appendChild(sentence);
      }
      const inp = document.createElement("input");
      inp.className = "input-answer";
      inp.placeholder = "Введите ответ";
      exContent.appendChild(inp);
      h.addSpecialChars(exContent);

      const checkBtn = document.createElement("button");
      checkBtn.className = "btn";
      checkBtn.type = "button";
      checkBtn.innerHTML = '<i class="fas fa-check"></i> Проверить';
      checkBtn.addEventListener("click", () => {
        const userAnswer = inp.value.trim().toLowerCase();
        const correctAnswer = (ex.answer || "").toLowerCase();
        const isCorrect = userAnswer === correctAnswer;
        if (isCorrect) {
          h.speak(ex.answer || "");
        }
        resultEl.innerHTML = isCorrect ? '<i class="fas fa-check" style="color:var(--success)"></i> Правильно!' : '<i class="fas fa-times" style="color:var(--error)"></i> Неправильно.';
        if (!isCorrect) {
          correctAnswerEl.textContent = `Правильный ответ: ${ex.answer}`;
          correctAnswerEl.style.display = "block";
        }
        inp.disabled = true;
        checkBtn.disabled = true;
        finish(isCorrect);
      });
      exContent.appendChild(checkBtn);
    } else if (ex.type === "reorder") {
      const sentenceDiv = document.createElement("div");
      sentenceDiv.className = "reorder-sentence";
      exContent.appendChild(sentenceDiv);
      const piecesDiv = document.createElement("div");
      piecesDiv.className = "reorder-pieces";
      exContent.appendChild(piecesDiv);
      h.addDnDHandlers(piecesDiv);
      ex.pieces.forEach(piece => {
        const p = document.createElement("div");
        p.className = "piece";
        p.textContent = piece;
        p.draggable = true;
        piecesDiv.appendChild(p);
      });
      const checkBtn = document.createElement("button");
      checkBtn.className = "btn";
      checkBtn.innerHTML = '<i class="fas fa-check"></i> Проверить';
      checkBtn.addEventListener("click", () => {
        const ordered = Array.from(sentenceDiv.children).map(el => el.textContent).join(" ");
        const isCorrect = ordered === ex.correct.join(" ");
        resultEl.innerHTML = isCorrect ? '<i class="fas fa-check" style="color:var(--success)"></i> Правильно!' : '<i class="fas fa-times" style="color:var(--error)"></i> Неправильно.';
        if (!isCorrect) {
          correctAnswerEl.textContent = `Правильный порядок: ${ex.correct.join(" ")}`;
          correctAnswerEl.style.display = "block";
        }
        Array.from(piecesDiv.children).forEach(p => p.style.cursor = "default");
        checkBtn.disabled = true;
        finish(isCorrect);
      });
      exContent.appendChild(checkBtn);
    } else if (ex.type === "match") {
      const leftDiv = document.createElement("div");
      leftDiv.className = "match-lefts";
      ex.left.forEach(item => {
        const el = document.createElement("div");
        el.className = "match-left";
        el.textContent = item;
        leftDiv.appendChild(el);
      });
      exContent.appendChild(leftDiv);
      const rightDiv = document.createElement("div");
      rightDiv.className = "match-rights";
      ex.right.forEach(item => {
        const el = document.createElement("div");
        el.className = "match-right";
        el.textContent = item;
        rightDiv.appendChild(el);
      });
      exContent.appendChild(rightDiv);
      h.addMatchHandlers(exContent, ex.pairs);
      const checkBtn = document.createElement("button");
      checkBtn.className = "btn";
      checkBtn.innerHTML = '<i class="fas fa-check"></i> Проверить';
      checkBtn.addEventListener("click", () => {
        let correctCount = 0;
        ex.pairs.forEach(pair => {
          const leftEl = exContent.querySelector(`[data-matched="${pair.ru}"]`);
          if (leftEl && leftEl.textContent === pair.de) correctCount++;
        });
        const isCorrect = correctCount === ex.pairs.length;
        resultEl.innerHTML = isCorrect ? '<i class="fas fa-check" style="color:var(--success)"></i> Все правильно!' : `<i class="fas fa-times" style="color:var(--error)"></i> ${correctCount}/${ex.pairs.length} пар верно.`;
        if (!isCorrect) {
          correctAnswerEl.innerHTML = ex.pairs.map(p => `<div><strong>${p.de}</strong> - ${p.ru}</div>`).join("");
          correctAnswerEl.style.display = "block";
        }
        Array.from(exContent.querySelectorAll(".match-left, .match-right")).forEach(el => el.style.pointerEvents = "none");
        checkBtn.disabled = true;
        finish(isCorrect);
      });
      exContent.appendChild(checkBtn);
    } else if (ex.type === "pronounce") {
      const words = (ex.pronounce || "").split(" ");
      // UPDATED: Set title with play buttons
      const titleDiv = exEl.querySelector("div strong"); // Assuming the strong is already in the innerHTML
      titleDiv.innerHTML = `${ex.question || ""} <div class="pronounce-container" style="display: inline-flex; align-items: center; gap: 4px;">
        <button class="btn small play-whole" style="padding: 4px 8px;"><i class="fas fa-volume-up"></i></button>
        <span class="pronounce-words">${words.map(word => `<span class="pronounce-word" style="cursor: pointer; text-decoration: underline;">${word}</span>`).join(' ')}</span>
      </div>`;

      // Add listener for whole phrase button
      const playWholeBtn = exEl.querySelector(".play-whole");
      if (playWholeBtn) {
        playWholeBtn.addEventListener("click", () => h.speak(ex.pronounce || ""));
      }

      // Add listeners for individual words
      const wordSpans = exEl.querySelectorAll(".pronounce-word");
      wordSpans.forEach(span => {
        span.addEventListener("click", () => h.speak(span.textContent || ""));
      });

      // The rest of the pronounce exercise (microphone recording) remains the same
      const recordBtn = document.createElement("button");
      recordBtn.className = "recordBtn";
      recordBtn.type = "button";
      recordBtn.innerHTML = '<i class="fas fa-microphone"></i> Нажмите и говорите';
      recordBtn.addEventListener("click", () => {
        if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
          resultEl.innerHTML = '<i class="fas fa-times" style="color:var(--error)"></i> Распознавание речи не поддерживается в этом браузере.';
          return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'de-DE';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          recordBtn.innerHTML = '<i class="fas fa-microphone"></i> Запись...';
          recordBtn.disabled = true;
        };

        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript.trim();
          // console.log(`Распознано: ${transcript}`);

          const isCorrect = transcript.toLowerCase() === (ex.pronounce || "").toLowerCase();
          resultEl.innerHTML = isCorrect ? '<i class="fas fa-check" style="color:var(--success)"></i> Правильно!' : '<i class="fas fa-times" style="color:var(--error)"></i> Неправильно.';
          if (!isCorrect) {
            correctAnswerEl.textContent = `Правильное произношение: ${ex.pronounce}`;
            correctAnswerEl.style.display = "block";
          }
          recordBtn.disabled = true;
          finish(isCorrect);
        };

        recognition.onerror = (event) => {
          // console.log(`Ошибка распознавания: ${event.error}`);
          resultEl.innerHTML = '<i class="fas fa-times" style="color:var(--error)"></i> Ошибка распознавания. Попробуйте снова.';
          recordBtn.innerHTML = '<i class="fas fa-microphone"></i> Начать запись';
          recordBtn.disabled = false;
        };

        recognition.onend = () => {
          recordBtn.innerHTML = '<i class="fas fa-microphone"></i> Начать запись';
          if (!recordBtn.disabled) recordBtn.disabled = false;
        };

        recognition.start();
      });
      exContent.appendChild(recordBtn);
    } else {
      exContent.innerHTML = "<div>Неподдерживаемый тип упражнения.</div>";
    }

    // NEW: Add skip button if dev mode and skip enabled
    if (h.isDevMode() && h.isSkipEnabled()) {
      const skipBtn = document.createElement("button");
      skipBtn.className = "btn ghost small skip-exercise";
      skipBtn.innerHTML = '<i class="fas fa-forward"></i> Пропустить';
      skipBtn.style.marginTop = "12px";
      skipBtn.addEventListener("click", () => {
        resultEl.innerHTML = '<i class="fas fa-forward" style="color:var(--muted);"></i> Пропущено';
        // Disable other interactions if needed
        if (ex.type === "mcq") {
          Array.from(exContent.querySelectorAll(".mcq-option")).forEach(b => b.disabled = true);
        } else if (ex.type === "input") {
          const inp = exContent.querySelector(".input-answer");
          if (inp) inp.disabled = true;
          const checkBtn = exContent.querySelector(".btn:not(.skip-exercise)");
          if (checkBtn) checkBtn.disabled = true;
        }
        // Proceed without points or penalty
        continueControls.style.display = "block";
      });
      exContent.appendChild(skipBtn);
    }

    container.appendChild(exEl);
  }

  return { renderExercise };

})(window.BERLINGO.helpers, window.BERLINGO.ui);