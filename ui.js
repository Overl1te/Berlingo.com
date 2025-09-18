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

  function renderSettingsModal() {
    let modal = document.querySelector('.settings-modal');
    if (modal) {
      modal.classList.add('visible');
      return;
    }

    modal = document.createElement('div');
    modal.className = 'settings-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-sidebar"></div>
        <div class="modal-main"></div>
        <button class="modal-close"><i class="fas fa-times"></i></button>
      </div>
    `;
    document.body.appendChild(modal);

    const sidebar = modal.querySelector('.modal-sidebar');
    const main = modal.querySelector('.modal-main');
    const closeBtn = modal.querySelector('.modal-close');

    closeBtn.addEventListener('click', () => {
      modal.classList.remove('visible');
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('visible');
      }
    });

    const categories = [
      { id: 'general', title: 'Общее', content: '<p>Общие настройки (пока пусто).</p>' },
      { id: 'account', title: 'Аккаунт', content: `
        <h3>Аккаунт</h3>
        <div class="setting-item">
          <label>Режим разработчика</label>
          <label class="toggle-switch">
            <input type="checkbox" id="dev-mode-toggle">
            <span class="slider"></span>
          </label>
        </div>
      ` },
      { id: 'dev', title: 'Для разработчиков', content: `
        <h3>Для разработчиков</h3>
        <div class="setting-item">
          <label>Включить кнопки пропуска</label>
          <label class="toggle-switch">
            <input type="checkbox" id="skip-toggle">
            <span class="slider"></span>
          </label>
        </div>
      `, hidden: true }
    ];

    function renderCategories() {
      sidebar.innerHTML = '';
      categories.forEach(cat => {
        if (cat.hidden && !BERLINGO.helpers.isDevMode()) return;
        const item = document.createElement('div');
        item.className = 'category-item';
        item.textContent = cat.title;
        item.dataset.catId = cat.id;
        item.addEventListener('click', () => {
          document.querySelectorAll('.category-item').forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          main.innerHTML = cat.content;
          if (cat.id === 'account') {
            const toggle = main.querySelector('#dev-mode-toggle');
            if (toggle) {
              toggle.checked = BERLINGO.helpers.isDevMode();
              toggle.addEventListener('change', (e) => {
                BERLINGO.helpers.setDevMode(e.target.checked);
                renderCategories();  // Re-render sidebar to show/hide dev category
              });
            }
          } else if (cat.id === 'dev') {
            const skipToggle = main.querySelector('#skip-toggle');
            if (skipToggle) {
              skipToggle.checked = BERLINGO.helpers.isSkipEnabled();
              skipToggle.addEventListener('change', (e) => {
                BERLINGO.helpers.setSkipEnabled(e.target.checked);
                window.location.reload(); 
              });
            }
          }
        });
        sidebar.appendChild(item);
      });
      // Auto-select first category
      const firstItem = sidebar.querySelector('.category-item');
      if (firstItem) firstItem.click();
    }

    renderCategories();
    modal.classList.add('visible');
  }

  function updateProgress(percent) {
    const fill = document.querySelector(".progress-fill");
    if (fill) fill.style.width = percent + "%";
  }

  return { renderHeader, renderStats, renderProgress, renderStepNav, updateProgress, renderSettingsModal };

})(window.BERLINGO.helpers);