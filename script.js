// ========== SVG Icons ==========
const SVG_ICONS = {
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m2.12 2.12l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m2.12-2.12l4.24-4.24M19.78 19.78l-4.24-4.24m-2.12-2.12l-4.24-4.24M19.78 4.22l-4.24 4.24m-2.12 2.12l-4.24 4.24"></path></svg>',
  empty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h14l4 4v12a2 2 0 0 1-2 2z"></path><polyline points="16 15 12 11 8 15"></polyline></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="currentColor"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2"></line><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2"></line></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
};

// ========== Constants ==========
const REFINING_RATIOS = { 3: 2, 4: 2, 5: 3, 6: 4, 7: 5, 8: 5 };
const TIERS = [2, 3, 4, 5, 6, 7, 8];
const TIER_OPTIONS = ['T4', 'T5', 'T6', 'T7', 'T8'];

// ========== State Management ==========
const AppState = {
  calculators: {},
  tabOrder: [],
  activeTabId: null,
  renameModalId: null,
  draggedTabId: null,

  createNewTab(data) {
    const id = 'tab_' + Date.now();
    this.calculators[id] = data || {
      name: 'Tab',
      tier: 8,
      amount: 100,
      returnRate: 36.7,
      prices: { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 }
    };
    this.tabOrder.push(id);
    this.activeTabId = id;
    return id;
  },

  deleteTab(id) {
    delete this.calculators[id];
    this.tabOrder = this.tabOrder.filter(tid => tid !== id);
    if (this.activeTabId === id) {
      this.activeTabId = this.tabOrder[0] || null;
    }
  },

  getCurrentCalculator() {
    return this.calculators[this.activeTabId];
  },

  save() {
    try {
      localStorage.setItem('calculators', JSON.stringify(this.calculators));
      localStorage.setItem('tabOrder', JSON.stringify(this.tabOrder));
    } catch (e) {
      console.warn('save failed', e);
    }
  },

  load() {
    const saved = localStorage.getItem('calculators');
    const order = localStorage.getItem('tabOrder');
    if (saved) {
      try {
        this.calculators = JSON.parse(saved);
      } catch (e) {
        this.calculators = {};
      }
      if (order) {
        try {
          this.tabOrder = JSON.parse(order);
        } catch (e) {
          this.tabOrder = Object.keys(this.calculators);
        }
        this.tabOrder = this.tabOrder.filter(id => this.calculators[id]);
      } else {
        this.tabOrder = Object.keys(this.calculators);
      }
      this.activeTabId = this.tabOrder[0] || null;
    }
    if (!this.activeTabId) this.createNewTab();
  }
};

// ========== Theme Management ==========
const ThemeManager = {
  currentTheme: 'light',
  currentColor: '#3b82f6',

  applyTheme(theme, color) {
    document.documentElement.setAttribute('data-theme', theme);
    this.currentTheme = theme;
    this.currentColor = color;

    if (theme === 'light') {
      document.documentElement.style.setProperty('--accent', color);
      const rgb = parseInt(color.slice(1), 16);
      const r = (rgb >> 16) & 255;
      const g = (rgb >> 8) & 255;
      const b = rgb & 255;
      const lightColor = `rgba(${r},${g},${b},0.1)`;
      document.documentElement.style.setProperty('--accent-light', lightColor);
    } else {
      document.documentElement.style.removeProperty('--accent');
      document.documentElement.style.removeProperty('--accent-light');
    }

    localStorage.setItem('theme', theme);
    localStorage.setItem('accentColor', color);
  },

  restoreFromStorage() {
    const theme = localStorage.getItem('theme') || 'light';
    const color = localStorage.getItem('accentColor') || '#3b82f6';
    this.applyTheme(theme, color);
  }
};

// ========== UI Management ==========
const UIManager = {
  renderEmptyState() {
    const el = document.getElementById('appContent');
    el.innerHTML = `<div class="empty-state"><div class="empty-state__icon">${SVG_ICONS.empty}</div><h2 class="empty-state__title">No Calculators Yet</h2><p class="empty-state__text"></p><button class="empty-state__button" onclick="UIManager.createNewCalculator()">${SVG_ICONS.plus} Create New Calculator</button></div>`;
  },

  createNewCalculator() {
    AppState.createNewTab();
    this.render();
    AppState.save();
  },

  render() {
    if (!AppState.activeTabId || !AppState.getCurrentCalculator()) {
      this.renderEmptyState();
      return;
    }
    const calc = AppState.getCurrentCalculator();

    let html = `<div class="card"><h2 class="card__title">${SVG_ICONS.settings}Settings</h2><div class="form-row"><div class="form-field"><label class="form-label">Target Tier</label><div class="select" id="tierSelect"><button class="select__button">T${calc.tier}</button><div class="select__menu">`;
    TIER_OPTIONS.forEach((t, i) => {
      html += `<div class="select__option" data-value="${i + 4}">${t}</div>`;
    });
    html += `</div></div></div><div class="form-field"><label class="form-label">Target Amount</label><input class="form-input" id="amount" type="number" placeholder="100"></div><div class="form-field"><label class="form-label">Return Rate %</label><input class="form-input" id="returnRate" type="number" step="0.1" placeholder="36.7"></div></div></div>`;

    html += `<div class="card"><div class="tabs-wrapper" id="tabsContainer"></div><h2 class="card__title">Required Materials & Prices</h2><table><tr><th>Tier</th><th>Price per Unit</th><th>Expense per Tier</th><th style="text-align:right">Units Needed</th></tr>`;
    TIERS.forEach(t => {
      html += `<tr><td><strong>T${t}</strong></td><td><input class="form-input" id="price${t}" type="number" placeholder="0" style="width:100%"></td><td id="expense${t}" class="table__expense">0</td><td id="needed${t}" class="table__value">0</td></tr>`;
    });
    html += `</table></div><div class="card"><div class="expense-section"><div class="expense-section__label">TOTAL EXPENSES</div><div id="totalExpense" class="expense-section__total">0 silver</div></div></div>`;

    document.getElementById('appContent').innerHTML = html;

    document.getElementById('amount').value = calc.amount;
    document.getElementById('returnRate').value = calc.returnRate;
    TIERS.forEach(t => {
      const el = document.getElementById('price' + t);
      if (el) el.value = calc.prices[t] || 0;
    });

    this.attachEventListeners();
    this.renderTabs();
    this.updateCalculations();
  },

  renderTabs() {
    const container = document.getElementById('tabsContainer');
    container.innerHTML = '';
    AppState.tabOrder.forEach(id => {
      const calc = AppState.calculators[id];
      if (!calc) return;
      const tabEl = document.createElement('div');
      tabEl.className = 'tab' + (id === AppState.activeTabId ? ' active' : '');
      tabEl.draggable = true;
      tabEl.innerHTML = `<span class="tab__handle">⋮⋮</span><span class="tab__name">${calc.name}</span><button class="tab__button">${SVG_ICONS.edit}</button><button class="tab__button tab__close">${SVG_ICONS.close}</button>`;
      const buttons = tabEl.querySelectorAll('.tab__button');
      buttons[0].onclick = (e) => {
        e.stopPropagation();
        this.openRenameModal(id);
      };
      buttons[1].onclick = (e) => {
        e.stopPropagation();
        this.deleteTabUI(id);
      };
      tabEl.onclick = () => {
        AppState.activeTabId = id;
        this.render();
      };
      tabEl.ondragstart = () => {
        AppState.draggedTabId = id;
        tabEl.classList.add('dragging');
      };
      tabEl.ondragend = () => {
        tabEl.classList.remove('dragging');
        AppState.draggedTabId = null;
      };
      tabEl.ondragover = (e) => {
        e.preventDefault();
        if (id !== AppState.draggedTabId) tabEl.classList.add('drag-over');
      };
      tabEl.ondragleave = () => tabEl.classList.remove('drag-over');
      tabEl.ondrop = (e) => {
        e.preventDefault();
        tabEl.classList.remove('drag-over');
        if (AppState.draggedTabId && AppState.draggedTabId !== id) {
          const fi = AppState.tabOrder.indexOf(AppState.draggedTabId);
          const ti = AppState.tabOrder.indexOf(id);
          AppState.tabOrder.splice(fi, 1);
          AppState.tabOrder.splice(ti, 0, AppState.draggedTabId);
          this.renderTabs();
          AppState.save();
        }
      };
      container.appendChild(tabEl);
    });
    const addBtn = document.createElement('button');
    addBtn.className = 'tab__add';
    addBtn.innerHTML = SVG_ICONS.plus;
    addBtn.onclick = () => this.createNewCalculator();
    container.appendChild(addBtn);
  },

  attachEventListeners() {
    const tierSelect = document.getElementById('tierSelect');
    if (tierSelect) {
      tierSelect.onclick = () => tierSelect.classList.toggle('active');
      tierSelect.querySelectorAll('.select__option').forEach(opt => {
        opt.onclick = () => {
          const calc = AppState.getCurrentCalculator();
          calc.tier = Number(opt.dataset.value);
          tierSelect.classList.remove('active');
          tierSelect.querySelectorAll('.select__option').forEach(o => o.classList.remove('selected'));
          opt.classList.add('selected');
          tierSelect.querySelector('.select__button').innerText = 'T' + calc.tier;
          this.updateCalculations();
          AppState.save();
        };
      });
    }
    document.addEventListener('click', e => {
      const sel = document.getElementById('tierSelect');
      if (sel && !sel.contains(e.target)) sel.classList.remove('active');
    });

    const update = () => {
      const calc = AppState.getCurrentCalculator();
      const amtEl = document.getElementById('amount');
      const rrEl = document.getElementById('returnRate');
      if (!calc || !amtEl || !rrEl) return;
      calc.amount = Number(amtEl.value) || 0;
      calc.returnRate = Number(rrEl.value) || 0;
      TIERS.forEach(t => {
        const priceEl = document.getElementById('price' + t);
        if (priceEl) calc.prices[t] = Number(priceEl.value) || 0;
      });
      this.updateCalculations();
      AppState.save();
    };

    const amtEl = document.getElementById('amount');
    const rrEl = document.getElementById('returnRate');
    if (amtEl) amtEl.oninput = update;
    if (rrEl) rrEl.oninput = update;
    TIERS.forEach(t => {
      const priceEl = document.getElementById('price' + t);
      if (priceEl) priceEl.oninput = update;
    });
  },

  updateCalculations() {
    const calc = AppState.getCurrentCalculator();
    if (!calc) return;
    let returnRate = calc.returnRate / 100;
    if (returnRate < 0) returnRate = 0;
    if (returnRate > 0.95) returnRate = 0.95;
    let hides = { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
    const refine = (tier, amount) => {
      if (tier < 2) return;
      if (tier === 2) {
        hides[2] += amount * (1 - returnRate);
        return;
      }
      hides[tier] += amount * REFINING_RATIOS[tier] * (1 - returnRate);
      refine(tier - 1, amount * (1 - returnRate));
    };
    refine(calc.tier, calc.amount);
    let total = 0;
    TIERS.forEach(t => {
      const needed = Math.ceil(hides[t] || 0);
      const expense = needed * (calc.prices[t] || 0);
      const neededEl = document.getElementById('needed' + t);
      const expenseEl = document.getElementById('expense' + t);
      if (neededEl) neededEl.innerText = needed.toLocaleString('en-US');
      if (expenseEl) expenseEl.innerText = expense.toLocaleString('en-US');
      total += expense;
    });
    const totalEl = document.getElementById('totalExpense');
    if (totalEl) totalEl.innerText = total.toLocaleString('en-US') + ' silvers';
  },

  openRenameModal(id) {
    AppState.renameModalId = id;
    const input = document.getElementById('renameInput');
    if (input) input.value = AppState.calculators[id].name;
    const modal = document.getElementById('renameModal');
    if (modal) modal.classList.add('active');
    if (input) input.focus();
  },

  deleteTabUI(id) {
    AppState.deleteTab(id);
    this.render();
    AppState.save();
  }
};

// ========== Export Functions ==========
function calculateNeededAndExpense(calc) {
  const returnRate = Math.max(0, Math.min(0.95, (calc.returnRate || 0) / 100));
  let hides = { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
  const refine = (tier, amount) => {
    if (tier < 2) return;
    if (tier === 2) {
      hides[2] += amount * (1 - returnRate);
      return;
    }
    hides[tier] += amount * REFINING_RATIOS[tier] * (1 - returnRate);
    refine(tier - 1, amount * (1 - returnRate));
  };
  refine(calc.tier || 8, calc.amount || 0);
  const perTier = {};
  let total = 0;
  TIERS.forEach(t => {
    const unitsNeeded = Math.ceil(hides[t] || 0);
    const pricePerUnit = (calc.prices && Number(calc.prices[t])) || 0;
    const expense = unitsNeeded * pricePerUnit;
    perTier['T' + t] = {
      pricePerUnit: pricePerUnit,
      unitsNeeded: unitsNeeded,
      expense: expense
    };
    total += expense;
  });
  return { perTier, totalExpense: total };
}

function fmt(n) {
  return Number(n || 0).toLocaleString('en-US');
}

function padLeft(s, n) {
  return String(s).padStart(n);
}

function padRight(s, n) {
  return String(s).padEnd(n);
}

function generateExportMarkdownForActiveTab() {
  const lines = [];
  lines.push('```');
  const id = AppState.activeTabId;
  if (!id || !AppState.calculators[id]) {
    lines.push('');
    lines.push('```');
    return lines.join('\n');
  }
  const calc = AppState.calculators[id];
  const computed = calculateNeededAndExpense(calc);
  lines.push(`TAB: ${calc.name}`);
  lines.push(`Target Tier: T${calc.tier}`);
  lines.push(`Amount: ${fmt(calc.amount)}`);
  lines.push(`Return Rate: ${calc.returnRate}%`);
  lines.push('');
  const rows = TIERS.map(t => {
    const r = computed.perTier['T' + t];
    return {
      tier: 'T' + t,
      price: fmt(r.pricePerUnit),
      needed: fmt(r.unitsNeeded),
      expense: fmt(r.expense)
    };
  });
  const colWidth = {
    tier: Math.max(...rows.map(r => r.tier.length), 4),
    price: Math.max(...rows.map(r => r.price.length), 'Price'.length),
    needed: Math.max(...rows.map(r => r.needed.length), 'Needed'.length),
    expense: Math.max(...rows.map(r => r.expense.length), 'Expense'.length)
  };
  const header = padRight('Tier', colWidth.tier) + ' | ' + padLeft('Price', colWidth.price) + ' | ' + padLeft('Needed', colWidth.needed) + ' | ' + padLeft('Expense', colWidth.expense);
  lines.push(header);
  lines.push('-'.repeat(header.length));
  rows.forEach(r => {
    const line = padRight(r.tier, colWidth.tier) + ' | ' + padLeft(r.price, colWidth.price) + ' | ' + padLeft(r.needed, colWidth.needed) + ' | ' + padLeft(r.expense, colWidth.expense);
    lines.push(line);
  });
  lines.push('');
  lines.push(`TOTAL: ${fmt(computed.totalExpense)}`);
  lines.push('');
  lines.push('```');
  return lines.join('\n');
}

async function exportPlannerToClipboard() {
  try {
    const md = generateExportMarkdownForActiveTab();
    await navigator.clipboard.writeText(md);
    const tooltip = document.getElementById('exportTooltip');
    if (tooltip) {
      tooltip.classList.add('show');
      setTimeout(() => {
        tooltip.classList.remove('show');
      }, 1200);
    }
  } catch (err) {
    console.error(err);
    alert('Export failed: ' + (err && err.message ? err.message : err));
  }
}

// ========== Event Listeners ==========
document.getElementById('themeToggle').onclick = () => {
  const currentTheme = ThemeManager.currentTheme;
  const newTheme = currentTheme === 'light' ? 'dark-1' : 'light';
  const color = newTheme === 'light' ? '#3b82f6' : '#8b5cf6';
  ThemeManager.applyTheme(newTheme, color);
};

document.getElementById('exportButton').onclick = exportPlannerToClipboard;

document.getElementById('confirmRename').onclick = () => {
  const newName = document.getElementById('renameInput').value.trim();
  if (newName) {
    AppState.calculators[AppState.renameModalId].name = newName;
    document.getElementById('renameModal').classList.remove('active');
    AppState.save();
    UIManager.renderTabs();
  }
};

document.getElementById('cancelRename').onclick = () => {
  document.getElementById('renameModal').classList.remove('active');
};

document.getElementById('renameInput').onkeydown = (e) => {
  if (e.key === 'Enter') document.getElementById('confirmRename').click();
  if (e.key === 'Escape') document.getElementById('cancelRename').click();
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const m = document.getElementById('renameModal');
    if (m && m.classList.contains('active')) m.classList.remove('active');
  }
});

// ========== Initialize App ==========
ThemeManager.restoreFromStorage();
AppState.load();
UIManager.render();