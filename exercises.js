/*
  exercises.js
  - Single entry point: renderExercise(ex, opts)
  - Handles mcq, input, reorder, match, fill_blank, listen_type
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
        const val = inp.value.trim().toLowerCase();
        const answer = (ex.answer || ex.answers || "").toString().toLowerCase();
        let isCorrect = false;
        if (ex.type === "fill_blank" && Array.isArray(ex.answers)) {
          isCorrect = ex.answers.some(a => a.toLowerCase() === val);
        } else {
          isCorrect = val === answer;
        }
        resultEl.innerHTML = isCorrect ? '<i class="fas fa-check" style="color:var(--success)"></i> Правильно!' : '<i class="fas fa-times" style="color:var(--error)"></i> Неправильно.';
        if (!isCorrect) {
          correctAnswerEl.textContent = `Правильный ответ: ${Array.isArray(ex.answers) ? ex.answers[0] : ex.answer}`;
          correctAnswerEl.style.display = "block";
        }
        if (isCorrect) {
          h.speak(Array.isArray(ex.answers) ? ex.answers[0] : ex.answer);  // Произносить правильный ответ (в uppercase-форме из JSON)
        }
        document.querySelector(".check-controls").style.display = "none";
        inp.disabled = true;
        checkBtn.disabled = true;
        finish(isCorrect);
      });
      checkControls.appendChild(checkBtn);
    } else if (ex.type === "reorder") {
      const sentenceContainer = document.createElement("div");
      sentenceContainer.className = "reorder-sentence";
      exContent.appendChild(sentenceContainer);

      const piecesContainer = document.createElement("div");
      piecesContainer.className = "reorder-pieces";

      function handlePieceClick(e) {
        const piece = e.target;
        if (piece.parentNode === piecesContainer) {
          sentenceContainer.appendChild(piece);
        } else if (piece.parentNode === sentenceContainer) {
          piecesContainer.appendChild(piece);
        }
      }

      const shuffledPieces = [...ex.pieces].sort(() => Math.random() - 0.5);  // Перемешиваем слова
      shuffledPieces.forEach(p => {
        const piece = document.createElement("div");
        piece.className = "piece";
        piece.textContent = p;
        piece.addEventListener("click", (e) => {
          h.speak(p);  // Произносить слово при клике (в форме как написано)
          handlePieceClick(e);
        });
        piecesContainer.appendChild(piece);
      });
      exContent.appendChild(piecesContainer);

      const checkBtn = document.createElement("button");
      checkBtn.className = "btn";
      checkBtn.type = "button";
      checkBtn.innerHTML = '<i class="fas fa-check"></i> Проверить';
      checkBtn.addEventListener("click", () => {
        const current = Array.from(sentenceContainer.children).map(p => p.textContent.trim());
        const isCorrect = current.join(" ") === (ex.correct || []).join(" ");
        resultEl.innerHTML = isCorrect ? '<i class="fas fa-check" style="color:var(--success)"></i> Правильно!' : '<i class="fas fa-times" style="color:var(--error)"></i> Неправильно.';
        if (!isCorrect) {
          correctAnswerEl.textContent = `Правильный порядок: ${(ex.correct || []).join(" ")}`;
          correctAnswerEl.style.display = "block";
        }
        if (isCorrect) {
          h.speak((ex.correct || []).join(" "));  // Произносить только правильную фразу после проверки
        }
        // Отключаем дальнейшие клики
        Array.from(exContent.querySelectorAll(".piece")).forEach(p => {
          p.style.pointerEvents = "none";
        });
        document.querySelector(".check-controls").style.display = "none";
        checkBtn.disabled = true;
        finish(isCorrect);
      });
      checkControls.appendChild(checkBtn);
    } else if (ex.type === "match") {
      const pairsContainer = document.createElement("div");
      pairsContainer.className = "match-pairs";

      const left = document.createElement("div");
      left.className = "match-column";
      const right = document.createElement("div");
      right.className = "match-column";
      const shuffledRight = [...(ex.pairs || [])].sort(() => Math.random() - 0.5);
      (ex.pairs || []).forEach(p => {
        const l = document.createElement("div");
        l.className = "match-left";
        l.textContent = p.de;
        left.appendChild(l);
      });
      shuffledRight.forEach(p => {
        const r = document.createElement("div");
        r.className = "match-right";
        r.textContent = p.ru;
        right.appendChild(r);
      });
      pairsContainer.appendChild(left);
      pairsContainer.appendChild(right);
      exContent.appendChild(pairsContainer);
      h.addMatchHandlers(exContent, ex.pairs || []);
      const checkBtn = document.createElement("button");
      checkBtn.className = "btn";
      checkBtn.type = "button";
      checkBtn.innerHTML = '<i class="fas fa-check"></i> Проверить';
      checkBtn.addEventListener("click", () => {
        const allMatched = Array.from(exContent.querySelectorAll(".match-left")).every(l => l.classList.contains("matched"));
        resultEl.innerHTML = allMatched ? '<i class="fas fa-check" style="color:var(--success)"></i> Правильно!' : '<i class="fas fa-times" style="color:var(--error)"></i> Не все сопоставлено.';
        document.querySelector(".check-controls").style.display = "none";
        checkBtn.disabled = true;
        finish(allMatched);
      });
      checkControls.appendChild(checkBtn);
    } else {
      exContent.innerHTML = "<div>Неподдерживаемый тип упражнения.</div>";
    }

    container.appendChild(exEl);
  }

  return { renderExercise };

})(window.BERLINGO.helpers, window.BERLINGO.ui);