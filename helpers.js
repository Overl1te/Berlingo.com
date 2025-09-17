
/*
  helpers.js
  - Utility functions: qs, qsa, speak, storage helpers
  - Special chars, DnD and matching handlers
  Expose under global BERLINGO.helpers
*/
window.BERLINGO = window.BERLINGO || {};
window.BERLINGO.helpers = (function () {
  function qs(s, r = document) { return r.querySelector(s); }
  function qsa(s, r = document) { return Array.from(r.querySelectorAll(s)); }

  function warmUpSpeech(timeout = 700) {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window)) return resolve(false);

      let resolved = false;
      function finish(val) { if (!resolved) { resolved = true; resolve(val); } }

      // короткая "немая" попытка — пробуем пустой/пробельный utterance
      try {
        const u = new SpeechSynthesisUtterance(" ");
        u.volume = 0;
        u.rate = 1;
        u.pitch = 1;
        u.onend = () => finish(true);
        u.onerror = () => finish(false);
        // 일부 브라우저는 пустую строку игнорируют, но попытка всё равно может "прогреть" движок
        speechSynthesis.speak(u);
      } catch (e) {
        // если speak бросил — всё равно продолжаем к таймауту
      }

      // если событие onend не произойдет — всё равно резолвим через timeout
      setTimeout(() => finish(true), timeout);
    });
  }

  // Storage helpers
  function markDone(id, hearts, points) {
    localStorage.setItem("berlingo_done_" + id, "1");
    if (hearts !== undefined) localStorage.setItem("berlingo_hearts_" + id, String(hearts));
    if (points !== undefined) localStorage.setItem("berlingo_points_" + id, String(points));
  }
  function unmarkDone(id) { localStorage.removeItem("berlingo_done_" + id); }
  function isDone(id) {
    const done = localStorage.getItem("berlingo_done_" + id) === "1";
    const hearts = localStorage.getItem("berlingo_hearts_" + id);
    if (done && hearts !== null && parseInt(hearts) === 0) return false;
    return done;
  }

  // Speech
  let voicesLoaded = false;
  let germanVoices = [];

  // Функция для загрузки голосов
  function loadVoices(timeout = 4000) {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window)) return resolve([]);

      const start = Date.now();

      function trySet() {
        const all = speechSynthesis.getVoices() || [];
        const de = all.filter(v => v.lang && v.lang.toLowerCase().startsWith("de"));
        if (de.length > 0) {
          germanVoices = de;
          voicesLoaded = true;
          resolve(de);
          return true;
        }
        return false;
      }

      // пробуем сразу
      if (trySet()) return;

      // handler для voiceschanged
      function onVoicesChanged() {
        if (trySet()) cleanup();
      }
      function cleanup() {
        speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
        clearInterval(interval);
      }

      speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);

      // polling на случай, если voiceschanged не сработает мгновенно
      const interval = setInterval(() => {
        if (trySet()) { cleanup(); return; }
        if (Date.now() - start > timeout) {
          // таймаут — возвращаем текущее состояние (возможно пустой массив)
          cleanup();
          const fallback = (speechSynthesis.getVoices() || []).filter(v => v.lang && v.lang.toLowerCase().startsWith("de"));
          if (fallback.length > 0) {
            germanVoices = fallback;
            voicesLoaded = true;
          }
          resolve(fallback);
        }
      }, 200);
    });
  }

  // Обновленная функция speak
  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "de-DE";
    
    if (voicesLoaded && germanVoices.length > 0) {
      u.voice = germanVoices[0];
    }
    
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }

  // Special characters helper
  function addSpecialChars(targetEl) {
    const chars = ['ä','ö','ü','ß'];
    const div = document.createElement("div");
    div.className = "special-chars small";
    div.style.marginTop = "8px";
    chars.forEach(c => {
      const b = document.createElement("button");
      b.className = "btn ghost small";
      b.type = "button";
      b.textContent = c;
      b.addEventListener("click", () => {
        const inp = targetEl.querySelector(".input-answer");
        if (inp) {
          inp.value += c;
          inp.focus();
        }
      });
      div.appendChild(b);
    });
    targetEl.appendChild(div);
  }

  function resetProgress() {
    // Удаляем все ключи, связанные с прогрессом Berlingo
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('berlingo_')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Перезагружаем страницу для применения изменений
    setTimeout(() => {
      window.location.reload();
    }, 300);
  }

  // Drag & Drop handlers for '.piece' containers (desktop + touch)
  function addDnDHandlers(container) {
    if (!container) return;
    let selected = null;
    let touchData = null;

    // Desktop native DnD
    container.addEventListener("dragstart", (e) => {
      if (e.target.classList.contains("piece")) {
        selected = e.target;
        e.target.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        try { e.dataTransfer.setData("text/plain", ""); } catch (err) {}
      }
    });
    container.addEventListener("dragover", (e) => {
      e.preventDefault();
      const after = getDragAfterElement(container, e.clientX, e.clientY);
      if (!after) container.appendChild(selected);
      else container.insertBefore(selected, after);
    });
    container.addEventListener("dragend", () => {
      if (selected) selected.classList.remove("dragging");
      selected = null;
    });

    // Touch support (simple)
    container.addEventListener("touchstart", (e) => {
      const el = e.target.closest(".piece");
      if (!el) return;
      selected = el;
      selected.classList.add("dragging");
      const rect = selected.getBoundingClientRect();
      touchData = {startX: e.touches[0].clientX, startY: e.touches[0].clientY, left: rect.left, top: rect.top};
      selected.style.position = "absolute";
      selected.style.zIndex = 1000;
      selected.style.left = `${touchData.left}px`;
      selected.style.top = `${touchData.top}px`;
      selected.style.transition = "none";
    }, {passive:false});

    container.addEventListener("touchmove", (e) => {
      if (!selected || !touchData) return;
      e.preventDefault();
      const dx = e.touches[0].clientX - touchData.startX;
      const dy = e.touches[0].clientY - touchData.startY;
      selected.style.left = `${touchData.left + dx}px`;
      selected.style.top = `${touchData.top + dy}px`;
    }, {passive:false});

    container.addEventListener("touchend", (e) => {
      if (!selected) return;
      selected.classList.remove("dragging");
      selected.style.position = "";
      selected.style.zIndex = "";
      selected.style.left = "";
      selected.style.top = "";
      selected.style.transition = "";
      const after = getDragAfterElement(container, e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      if (!after) container.appendChild(selected);
      else container.insertBefore(selected, after);
      selected = null;
      touchData = null;
    }, {passive:false});
  }

  function getDragAfterElement(container, x, y) {
    const draggableElements = Array.from(container.querySelectorAll(".piece:not(.dragging)"));
    let closest = {offset: Number.NEGATIVE_INFINITY, element: null};
    draggableElements.forEach(child => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        closest = { offset, element: child };
      }
    });
    return closest.element;
  }

  // Matching handlers (left + right)
  function addMatchHandlers(scopeEl, pairs) {
    let left = null, right = null;
    const leftEls = Array.from(scopeEl.querySelectorAll(".match-left"));
    const rightEls = Array.from(scopeEl.querySelectorAll(".match-right"));
    leftEls.forEach(l => l.addEventListener("click", () => {
      speak(l.textContent);  // Произносить немецкое слово при клике (в форме как написано)
      if (l.classList.contains("matched")) return;
      if (left) left.classList.remove("selected");
      left = l;
      left.classList.add("selected");
      if (right) tryMatch();
    }));
    rightEls.forEach(r => r.addEventListener("click", () => {
      if (r.classList.contains("matched")) return;
      if (right) right.classList.remove("selected");
      right = r;
      right.classList.add("selected");
      if (left) tryMatch();
    }));
    function tryMatch() {
      if (!left || !right) return;
      const expected = pairs.find(p => p.de === left.textContent);
      if (expected && right.textContent === expected.ru) {
        left.classList.add("matched");
        right.classList.add("matched");
        left.dataset.matched = right.textContent;
        right.dataset.matched = left.textContent;
      }
      if (left) left.classList.remove("selected");
      if (right) right.classList.remove("selected");
      left = null; right = null;
    }
  }

  // Popup for words
  function showWordPopup(de, ru) {
    const popup = qs("#word-popup");
    if (!popup) return;
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

  // helpers.js - в конце файла
return {
  qs, 
  qsa, 
  markDone, 
  unmarkDone, 
  isDone, 
  resetProgress, 
  speak, 
  loadVoices,
  warmUpSpeech,
  addSpecialChars, 
  addDnDHandlers, 
  addMatchHandlers, 
  showWordPopup
};
})();
