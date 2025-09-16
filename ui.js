
/*
  ui.js
  - UI building blocks: header (title + controls), stats, progress, step navigation
  Expose under BERLINGO.ui
*/
window.BERLINGO = window.BERLINGO || {};
window.BERLINGO.ui = (function (h) {

  function renderHeader(root, title, subtitle, restartId) {
    const header = document.createElement("div");
    header.className = "lesson-root-title";
    header.innerHTML = `<div><h2>${title}</h2><div class="small">${subtitle || ""}</div></div><div class="controls"><button id="${restartId || "restart-lesson"}" class="btn ghost"><i class="fas fa-redo"></i> Повторить</button></div>`;
    root.appendChild(header);
    return header;
  }

  function renderStats(root, heartsLabel) {
    const stats = document.createElement("div");
    stats.className = "stats";
    stats.innerHTML = `<div class="stat"><i class="fas fa-heart" style="color:var(--error)"></i> <span id="hearts">${heartsLabel !== undefined ? heartsLabel : 10}</span></div><div class="stat"><i class="fas fa-star" style="color:var(--accent)"></i> <span id="points">0</span></div>`;
    root.appendChild(stats);
    return stats;
  }

  function renderProgress(root) {
    const progress = document.createElement("div");
    progress.className = "progress-bar";
    progress.innerHTML = '<div class="progress-fill" style="width:0%"></div>';
    root.appendChild(progress);
    return progress;
  }

  function renderStepNav(root, steps, icons) {
    const stepNav = document.createElement("div");
    stepNav.className = "step-nav small";
    stepNav.style.display = "flex";
    stepNav.style.gap = "8px";
    stepNav.style.marginTop = "8px";
    steps.forEach((s, i) => {
      const b = document.createElement("button");
      b.className = "btn ghost";
      const icon = (icons && icons[i]) ? icons[i] : (i === 0 ? "book" : i === 1 ? "language" : "dumbbell");
      b.innerHTML = `<i class="fas fa-${icon}"></i> ${s.title}`;
      b.disabled = i !== 0;
      b.dataset.index = i;
      stepNav.appendChild(b);
    });
    root.appendChild(stepNav);
    return stepNav;
  }

  function updateProgress(percent) {
    const fill = document.querySelector(".progress-fill");
    if (fill) fill.style.width = percent + "%";
  }

  return { renderHeader, renderStats, renderProgress, renderStepNav, updateProgress };

})(window.BERLINGO.helpers);
