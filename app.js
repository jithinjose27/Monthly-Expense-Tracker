/**
 * Monthly Personal Expense Tracker - Cloud & Multi-Year Engine
 * 
 * Features:
 * 1. Supabase Cloud Sync & PostgreSQL persistence.
 * 2. Public Read Access: Unauthenticated visitors can view all months/years.
 * 3. Authorized Owner Editing: Full edit access and auto-saving only when authenticated.
 * 4. Multi-Year Support: Seamless switching between Oct-Dec 2026, all months of 2027, etc.
 * 5. Data Preservation: October 2026 data and ₹12,510 budget preserved independently.
 * 6. Responsive design, SVG charts, formulas, keyboard navigation, and client Excel/CSV exports.
 */

(function () {
  'use strict';

  // Constants
  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const CATEGORIES = [
    { key: 'chicken', label: 'Chicken', color: '#d97706', icon: '🍗' },
    { key: 'eggs', label: 'Eggs', color: '#ca8a04', icon: '🥚' },
    { key: 'bananas', label: 'Bananas', color: '#65a30d', icon: '🍌' },
    { key: 'otherFood', label: 'Other Food', color: '#059669', icon: '🥗' },
    { key: 'otherExp', label: 'Other Expenses', color: '#4f46e5', icon: '💳' }
  ];

  // Preserved October 2026 Seed Data (Historical baseline)
  const OCTOBER_2026_DEFAULT_BUDGET = 12510;
  const OCTOBER_2026_PRESERVED_DAYS = {
    3: { chicken: 82, eggs: 98, bananas: 0, otherFood: 0, otherExp: 0, notes: 'Chicken 200g, 14 eggs' },
    4: { chicken: 102, eggs: 0, bananas: 0, otherFood: 0, otherExp: 0, notes: 'Chicken 300g (bone)' },
    5: { chicken: 82, eggs: 98, bananas: 56, otherFood: 0, otherExp: 0, notes: 'Chicken 200g, 14 eggs, bananas' },
    6: { chicken: 82, eggs: 0, bananas: 0, otherFood: 0, otherExp: 50, notes: 'Chicken 200g, Bank deduction' },
    7: { chicken: 82, eggs: 0, bananas: 0, otherFood: 0, otherExp: 14, notes: 'Chicken 200g, 10 eggs, Cello Tape' },
    8: { chicken: 82, eggs: 0, bananas: 0, otherFood: 120, otherExp: 1004, notes: 'Chicken 200g, Chat, Trimmer' },
    9: { chicken: 82, eggs: 147, bananas: 0, otherFood: 271, otherExp: 264, notes: 'Chicken 200g, 21 eggs, Curd+Dates, Chia seed' },
    10: { chicken: 0, eggs: 0, bananas: 0, otherFood: 608, otherExp: 409, notes: 'Burger, Recharge(9th) + Petrol' },
    11: { chicken: 82, eggs: 84, bananas: 28, otherFood: 0, otherExp: 0, notes: 'Chicken 200g, 12 eggs, bananas' },
    12: { chicken: 82, eggs: 0, bananas: 0, otherFood: 0, otherExp: 104, notes: 'Chicken 200g, Soap' },
    13: { chicken: 82, eggs: 63, bananas: 20, otherFood: 0, otherExp: 95, notes: 'Chicken 200g, 9 eggs, bananas, trip' }
  };

  let saveDebounceTimer = null;
  let supabaseClient = null;

  // Application State
  const state = {
    year: 2026,
    month: 10, // 1 to 12
    budget: OCTOBER_2026_DEFAULT_BUDGET,
    highlightHighSpending: true,
    filterQuery: '',
    cloudConnected: false,
    isAuthenticated: false,
    user: null,
    isSyncing: false,
    daysData: {} // day (1..31) -> { chicken, eggs, bananas, otherFood, otherExp, notes }
  };

  // DOM Elements cache
  const el = {};

  function initElements() {
    el.monthSelect = document.getElementById('monthSelect');
    el.yearInput = document.getElementById('yearInput');
    el.prevMonthBtn = document.getElementById('prevMonthBtn');
    el.nextMonthBtn = document.getElementById('nextMonthBtn');
    el.currentMonthBtn = document.getElementById('currentMonthBtn');

    // Cloud & Auth status bar
    el.syncStatusDot = document.getElementById('syncStatusDot');
    el.syncStatusText = document.getElementById('syncStatusText');
    el.roleBadge = document.getElementById('roleBadge');
    el.syncReloadBtn = document.getElementById('syncReloadBtn');
    el.syncSaveBtn = document.getElementById('syncSaveBtn');
    el.cloudSetupBtn = document.getElementById('cloudSetupBtn');
    el.authBtn = document.getElementById('authBtn');

    // Budget UI
    el.budgetInput = document.getElementById('budgetInput');
    el.totalSpentDisplay = document.getElementById('totalSpentDisplay');
    el.budgetRemainingDisplay = document.getElementById('budgetRemainingDisplay');
    el.budgetProgressFill = document.getElementById('budgetProgressFill');
    el.budgetAlertBanner = document.getElementById('budgetAlertBanner');

    // KPI Displays
    el.kpiTotalExpense = document.getElementById('kpiTotalExpense');
    el.kpiRemainingBudget = document.getElementById('kpiRemainingBudget');
    el.kpiDailyAvg = document.getElementById('kpiDailyAvg');
    el.kpiHighestDay = document.getElementById('kpiHighestDay');
    el.kpiLowestDay = document.getElementById('kpiLowestDay');
    el.kpiFoodPercent = document.getElementById('kpiFoodPercent');

    // Category KPI Displays
    el.catSummaryContainer = document.getElementById('catSummaryContainer');

    // Charts
    el.doughnutChartBox = document.getElementById('doughnutChartBox');
    el.barChartBox = document.getElementById('barChartBox');
    el.chartTooltip = document.getElementById('chartTooltip');

    // Table elements
    el.tableBody = document.getElementById('spreadsheetBody');
    el.tableTitle = document.getElementById('tableTitle');
    el.tableDaysCount = document.getElementById('tableDaysCount');
    el.searchInput = document.getElementById('searchInput');
    el.highSpendingToggle = document.getElementById('highSpendingToggle');

    // Foot totals
    el.footChicken = document.getElementById('footChicken');
    el.footEggs = document.getElementById('footEggs');
    el.footBananas = document.getElementById('footBananas');
    el.footOtherFood = document.getElementById('footOtherFood');
    el.footOtherExp = document.getElementById('footOtherExp');
    el.footGrandTotal = document.getElementById('footGrandTotal');

    // Actions
    el.sampleDataBtn = document.getElementById('sampleDataBtn');
    el.clearMonthBtn = document.getElementById('clearMonthBtn');
    el.exportExcelBtn = document.getElementById('exportExcelBtn');
    el.exportCsvBtn = document.getElementById('exportCsvBtn');
    el.printBtn = document.getElementById('printBtn');
    el.toast = document.getElementById('toastMsg');

    // Auth Modal Elements
    el.authModal = document.getElementById('authModal');
    el.authModalTitle = document.getElementById('authModalTitle');
    el.closeAuthModalBtn = document.getElementById('closeAuthModalBtn');
    el.authEmailInput = document.getElementById('authEmailInput');
    el.authPasswordInput = document.getElementById('authPasswordInput');
    el.authSubmitBtn = document.getElementById('authSubmitBtn');
    el.authToggleModeBtn = document.getElementById('authToggleModeBtn');
    el.authToggleText = document.getElementById('authToggleText');
    el.authErrorMsg = document.getElementById('authErrorMsg');
    el.authSuccessMsg = document.getElementById('authSuccessMsg');

    // Cloud Setup Modal Elements
    el.cloudSetupModal = document.getElementById('cloudSetupModal');
    el.closeCloudSetupBtn = document.getElementById('closeCloudSetupBtn');
    el.setupUrlInput = document.getElementById('setupUrlInput');
    el.setupAnonKeyInput = document.getElementById('setupAnonKeyInput');
    el.saveCloudSetupBtn = document.getElementById('saveCloudSetupBtn');
    el.clearCloudSetupBtn = document.getElementById('clearCloudSetupBtn');
    el.setupMsg = document.getElementById('setupMsg');
  }

  // Formatting Utilities
  function formatINR(num) {
    if (isNaN(num) || num === null) num = 0;
    return '₹' + Number(num).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  }

  function showToast(message) {
    if (!el.toast) return;
    el.toast.textContent = message;
    el.toast.classList.add('show');
    setTimeout(() => {
      el.toast.classList.remove('show');
    }, 2800);
  }

  function escapeHTML(str) {
    return (str || '').replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  // ==========================================================================
  // Supabase Client Initialization & Auth Handling
  // ==========================================================================
  function initSupabase() {
    const cfg = window.SUPABASE_CONFIG || {};
    const url = cfg.url || localStorage.getItem('supabase_project_url');
    const anonKey = cfg.anonKey || localStorage.getItem('supabase_anon_key');

    if (window.supabase && url && anonKey) {
      try {
        supabaseClient = window.supabase.createClient(url, anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true
          }
        });
        state.cloudConnected = true;

        // Listen for session changes (login, logout, token refresh)
        supabaseClient.auth.onAuthStateChange((event, session) => {
          handleAuthChange(session);
        });

        // Check initial session
        supabaseClient.auth.getSession().then(({ data: { session } }) => {
          handleAuthChange(session);
        });

        return true;
      } catch (err) {
        console.error('Failed to initialize Supabase client:', err);
      }
    }

    state.cloudConnected = false;
    updateAuthRoleUI();
    return false;
  }

  function handleAuthChange(session) {
    if (session && session.user) {
      state.isAuthenticated = true;
      state.user = session.user;
    } else {
      state.isAuthenticated = false;
      state.user = null;
    }
    updateAuthRoleUI();
    renderAll();
  }

  function updateAuthRoleUI() {
    if (state.isAuthenticated && state.user) {
      document.body.classList.remove('is-visitor');
      if (el.roleBadge) {
        el.roleBadge.className = 'role-badge badge-owner';
        el.roleBadge.textContent = '👤 Owner (Editing Access)';
      }
      if (el.authBtn) {
        el.authBtn.innerHTML = '<span>🚪</span> Sign Out';
        el.authBtn.title = `Signed in as ${state.user.email}. Click to sign out.`;
      }
      if (el.syncSaveBtn) {
        el.syncSaveBtn.style.display = 'inline-flex';
      }
      if (el.budgetInput) el.budgetInput.readOnly = false;
      updateSyncStatus('online', '✓ Synced with Supabase Cloud');
    } else {
      document.body.classList.add('is-visitor');
      if (el.roleBadge) {
        el.roleBadge.className = 'role-badge badge-visitor';
        el.roleBadge.textContent = '👁️ Visitor (Read-Only)';
      }
      if (el.authBtn) {
        el.authBtn.innerHTML = '<span>🔑</span> Sign In';
        el.authBtn.title = 'Sign in with owner account to edit expenses';
      }
      if (el.syncSaveBtn) {
        el.syncSaveBtn.style.display = 'none';
      }
      if (el.budgetInput) el.budgetInput.readOnly = true;

      if (state.cloudConnected) {
        updateSyncStatus('online', '👁️ Public Portfolio Mode • Cloud Connected');
      } else {
        updateSyncStatus('offline', '📁 Local Preview Mode (Click Cloud Setup to connect)');
      }
    }
  }

  function updateSyncStatus(status, text) {
    if (!el.syncStatusDot || !el.syncStatusText) return;
    el.syncStatusDot.className = `status-dot dot-${status}`;
    el.syncStatusText.textContent = text;
  }

  // ==========================================================================
  // Data Loading (Supabase with Local Fallback)
  // ==========================================================================
  function resetMonthToEmpty(year, month) {
    const numDays = getDaysInMonth(year, month);
    state.daysData = {};
    for (let d = 1; d <= numDays; d++) {
      state.daysData[d] = {
        chicken: 0,
        eggs: 0,
        bananas: 0,
        otherFood: 0,
        otherExp: 0,
        notes: ''
      };
    }

    // Default budget: October 2026 has ₹12,510; all other months have ₹5,000 default
    if (year === 2026 && month === 10) {
      state.budget = OCTOBER_2026_DEFAULT_BUDGET;
      // Pre-fill preserved October expenses
      Object.keys(OCTOBER_2026_PRESERVED_DAYS).forEach(day => {
        state.daysData[day] = { ...OCTOBER_2026_PRESERVED_DAYS[day] };
      });
    } else {
      state.budget = 5000;
    }
  }

  async function loadDataForCurrentMonth(silent = false) {
    // 1. Reset state for selected month/year
    resetMonthToEmpty(state.year, state.month);

    // 2. If Supabase is connected, fetch data from PostgreSQL
    if (supabaseClient) {
      try {
        const monthStr = String(state.month).padStart(2, '0');
        const startDate = `${state.year}-${monthStr}-01`;
        const lastDay = getDaysInMonth(state.year, state.month);
        const endDate = `${state.year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

        // Fetch monthly budget
        const { data: budgetData, error: bErr } = await supabaseClient
          .from('monthly_budgets')
          .select('budget')
          .eq('year', state.year)
          .eq('month', state.month)
          .maybeSingle();

        if (budgetData && budgetData.budget !== null && budgetData.budget !== undefined) {
          state.budget = parseFloat(budgetData.budget) || state.budget;
        }

        // Fetch daily expenses for this month
        const { data: expenseRows, error: expErr } = await supabaseClient
          .from('expenses')
          .select('*')
          .gte('expense_date', startDate)
          .lte('expense_date', endDate);

        if (!expErr && expenseRows && expenseRows.length > 0) {
          expenseRows.forEach(row => {
            const day = parseInt(row.expense_date.split('-')[2], 10);
            if (day >= 1 && day <= lastDay) {
              state.daysData[day] = {
                chicken: parseFloat(row.chicken) || 0,
                eggs: parseFloat(row.eggs) || 0,
                bananas: parseFloat(row.bananas) || 0,
                otherFood: parseFloat(row.other_food) || 0,
                otherExp: parseFloat(row.other_exp) || 0,
                notes: row.notes || ''
              };
            }
          });
        }

        renderAll();
        if (!silent) {
          const mName = MONTH_NAMES[state.month - 1];
          showToast(`✓ Loaded ${mName} ${state.year} data from Cloud!`);
        }
        return true;
      } catch (err) {
        console.warn('Error loading from Supabase, using local state:', err);
      }
    }

    // 3. Fallback to localStorage if cloud unavailable
    const storageKey = `monthly_expense_${state.year}_${state.month}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        Object.keys(parsed).forEach(d => {
          if (state.daysData[d]) state.daysData[d] = parsed[d];
        });
      } catch (e) {}
    }
    const savedBudget = localStorage.getItem(`monthly_budget_${state.year}_${state.month}`);
    if (savedBudget) {
      state.budget = parseFloat(savedBudget) || state.budget;
    }

    renderAll();
    return true;
  }

  // ==========================================================================
  // Cloud Database Save (Authorized Owner Only)
  // ==========================================================================
  async function saveToCloud(explicit = false) {
    if (!state.isAuthenticated || !state.user) {
      if (explicit) {
        showToast('👁️ Visitor view is read-only. Please sign in to edit.');
      }
      return;
    }

    if (!supabaseClient) {
      if (explicit) showToast('Supabase client not connected. Check Cloud Setup.');
      return;
    }

    updateSyncStatus('offline', '🟡 Saving changes to Supabase Cloud...');

    try {
      // 1. Upsert Monthly Budget
      const { error: bErr } = await supabaseClient
        .from('monthly_budgets')
        .upsert({
          user_id: state.user.id,
          year: state.year,
          month: state.month,
          budget: state.budget
        }, { onConflict: 'user_id, year, month' });

      if (bErr) throw bErr;

      // 2. Prepare daily expenses payload for this month
      const numDays = getDaysInMonth(state.year, state.month);
      const monthStr = String(state.month).padStart(2, '0');
      const rowsToUpsert = [];

      for (let d = 1; d <= numDays; d++) {
        const data = state.daysData[d] || { chicken: 0, eggs: 0, bananas: 0, otherFood: 0, otherExp: 0, notes: '' };
        const dateStr = `${state.year}-${monthStr}-${String(d).padStart(2, '0')}`;
        rowsToUpsert.push({
          user_id: state.user.id,
          expense_date: dateStr,
          chicken: data.chicken || 0,
          eggs: data.eggs || 0,
          bananas: data.bananas || 0,
          other_food: data.otherFood || 0,
          other_exp: data.otherExp || 0,
          notes: data.notes || ''
        });
      }

      // Batch upsert into PostgreSQL
      const { error: expErr } = await supabaseClient
        .from('expenses')
        .upsert(rowsToUpsert, { onConflict: 'user_id, expense_date' });

      if (expErr) throw expErr;

      // Cache locally as secondary backup
      try {
        localStorage.setItem(`monthly_expense_${state.year}_${state.month}`, JSON.stringify(state.daysData));
        localStorage.setItem(`monthly_budget_${state.year}_${state.month}`, state.budget.toString());
      } catch (e) {}

      updateSyncStatus('online', '✓ All changes saved to Supabase Cloud');
      if (explicit) {
        showToast('💾 Successfully saved changes to Cloud Database!');
      }
    } catch (err) {
      console.error('Error saving to Supabase:', err);
      updateSyncStatus('offline', `⚠️ Save error: ${err.message || 'Database policy rejected write'}`);
      if (explicit) {
        showToast(`Save failed: ${err.message}`);
      }
    }
  }

  function triggerDebouncedCloudSave() {
    if (!state.isAuthenticated) return;
    if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
    updateSyncStatus('offline', '🟡 Pending cloud save...');
    saveDebounceTimer = setTimeout(() => {
      saveToCloud(false);
    }, 700);
  }

  // ==========================================================================
  // Calculations Engine
  // ==========================================================================
  function calculateMetrics() {
    const numDays = getDaysInMonth(state.year, state.month);

    let totalChicken = 0;
    let totalEggs = 0;
    let totalBananas = 0;
    let totalOtherFood = 0;
    let totalOtherExp = 0;
    let grandTotal = 0;

    let maxSpending = -1;
    let maxSpendingDay = null;

    let minSpending = Infinity;
    let minSpendingDay = null;

    let daysWithSpending = 0;
    const dailyTotals = {};

    for (let d = 1; d <= numDays; d++) {
      const data = state.daysData[d] || { chicken: 0, eggs: 0, bananas: 0, otherFood: 0, otherExp: 0 };
      const dChicken = parseFloat(data.chicken) || 0;
      const dEggs = parseFloat(data.eggs) || 0;
      const dBananas = parseFloat(data.bananas) || 0;
      const dOtherFood = parseFloat(data.otherFood) || 0;
      const dOtherExp = parseFloat(data.otherExp) || 0;

      const dTotal = dChicken + dEggs + dBananas + dOtherFood + dOtherExp;
      dailyTotals[d] = dTotal;

      totalChicken += dChicken;
      totalEggs += dEggs;
      totalBananas += dBananas;
      totalOtherFood += dOtherFood;
      totalOtherExp += dOtherExp;
      grandTotal += dTotal;

      if (dTotal > 0) {
        daysWithSpending++;
        if (dTotal > maxSpending) {
          maxSpending = dTotal;
          maxSpendingDay = d;
        }
        if (dTotal < minSpending) {
          minSpending = dTotal;
          minSpendingDay = d;
        }
      }
    }

    const avgDaily = numDays > 0 ? (grandTotal / numDays) : 0;
    const totalFood = totalChicken + totalEggs + totalBananas + totalOtherFood;
    const foodPercent = grandTotal > 0 ? (totalFood / grandTotal) * 100 : 0;
    const remainingBudget = state.budget - grandTotal;
    const budgetPercentUsed = state.budget > 0 ? (grandTotal / state.budget) * 100 : 0;

    return {
      numDays,
      totalChicken,
      totalEggs,
      totalBananas,
      totalOtherFood,
      totalOtherExp,
      totalFood,
      foodPercent,
      grandTotal,
      remainingBudget,
      budgetPercentUsed,
      avgDaily,
      maxSpending: maxSpending > -1 ? maxSpending : 0,
      maxSpendingDay,
      minSpending: minSpending !== Infinity ? minSpending : 0,
      minSpendingDay,
      daysWithSpending,
      dailyTotals
    };
  }

  // ==========================================================================
  // Render Spreadsheet Table
  // ==========================================================================
  function renderTable(metrics) {
    const numDays = metrics.numDays;
    const currentMonthName = MONTH_NAMES[state.month - 1];

    el.tableTitle.textContent = `${currentMonthName} ${state.year} Daily Breakdown`;
    el.tableDaysCount.textContent = `${numDays} Days (${metrics.daysWithSpending} active)`;

    const query = state.filterQuery.trim().toLowerCase();
    const thresholdHigh = metrics.avgDaily > 0 ? Math.max(metrics.avgDaily * 1.25, 100) : 500;
    const isVisitor = !state.isAuthenticated;

    let html = '';

    for (let day = 1; day <= numDays; day++) {
      const dateObj = new Date(state.year, state.month - 1, day);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
      const dateStr = `${day.toString().padStart(2, '0')} ${currentMonthName.slice(0, 3)} ${state.year}`;
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

      const data = state.daysData[day] || { chicken: 0, eggs: 0, bananas: 0, otherFood: 0, otherExp: 0, notes: '' };
      const dTotal = metrics.dailyTotals[day] || 0;
      const isHigh = state.highlightHighSpending && dTotal >= thresholdHigh && dTotal > 0;

      // Search filter
      if (query) {
        const matchesNote = (data.notes || '').toLowerCase().includes(query);
        const matchesDay = dayName.toLowerCase().includes(query);
        const matchesDate = dateStr.toLowerCase().includes(query);
        if (!matchesNote && !matchesDay && !matchesDate) {
          continue;
        }
      }

      const rowClasses = [];
      if (isWeekend) rowClasses.push('row-weekend');
      if (isHigh) rowClasses.push('row-high-spending');

      const roAttr = isVisitor ? 'readonly' : '';
      const notesRoAttr = isVisitor ? 'readonly' : '';

      html += `
        <tr class="${rowClasses.join(' ')}" data-day="${day}">
          <!-- Date (Sticky) -->
          <td class="col-sticky-date">
            <span class="date-text">${dateStr}</span>
          </td>

          <!-- Day (Sticky) -->
          <td class="col-sticky-day" style="text-align: center;">
            <span class="day-badge ${isWeekend ? 'weekend' : 'weekday'}">
              ${dayName.slice(0, 3)}
            </span>
            ${isHigh ? '<span class="high-spend-tag" title="High Spending Day">High</span>' : ''}
          </td>

          <!-- Chicken -->
          <td>
            <div class="cell-input-wrapper">
              <span class="cell-currency-prefix">₹</span>
              <input type="number" step="any" min="0" ${roAttr}
                     class="table-input ${data.chicken > 0 ? 'has-value' : 'zero-value'}"
                     data-day="${day}" data-field="chicken" 
                     value="${data.chicken > 0 ? data.chicken : ''}" 
                     placeholder="0" />
            </div>
          </td>

          <!-- Eggs -->
          <td>
            <div class="cell-input-wrapper">
              <span class="cell-currency-prefix">₹</span>
              <input type="number" step="any" min="0" ${roAttr}
                     class="table-input ${data.eggs > 0 ? 'has-value' : 'zero-value'}"
                     data-day="${day}" data-field="eggs" 
                     value="${data.eggs > 0 ? data.eggs : ''}" 
                     placeholder="0" />
            </div>
          </td>

          <!-- Bananas -->
          <td>
            <div class="cell-input-wrapper">
              <span class="cell-currency-prefix">₹</span>
              <input type="number" step="any" min="0" ${roAttr}
                     class="table-input ${data.bananas > 0 ? 'has-value' : 'zero-value'}"
                     data-day="${day}" data-field="bananas" 
                     value="${data.bananas > 0 ? data.bananas : ''}" 
                     placeholder="0" />
            </div>
          </td>

          <!-- Other Food -->
          <td>
            <div class="cell-input-wrapper">
              <span class="cell-currency-prefix">₹</span>
              <input type="number" step="any" min="0" ${roAttr}
                     class="table-input ${data.otherFood > 0 ? 'has-value' : 'zero-value'}"
                     data-day="${day}" data-field="otherFood" 
                     value="${data.otherFood > 0 ? data.otherFood : ''}" 
                     placeholder="0" />
            </div>
          </td>

          <!-- Other Expenses -->
          <td>
            <div class="cell-input-wrapper">
              <span class="cell-currency-prefix">₹</span>
              <input type="number" step="any" min="0" ${roAttr}
                     class="table-input ${data.otherExp > 0 ? 'has-value' : 'zero-value'}"
                     data-day="${day}" data-field="otherExp" 
                     value="${data.otherExp > 0 ? data.otherExp : ''}" 
                     placeholder="0" />
            </div>
          </td>

          <!-- Daily Total (Calculated Formula) -->
          <td class="daily-total-cell" id="dailyTotal_${day}">
            ${formatINR(dTotal)}
          </td>

          <!-- Notes -->
          <td>
            <input type="text" class="notes-input" ${notesRoAttr}
                   data-day="${day}" data-field="notes" 
                   value="${escapeHTML(data.notes || '')}" 
                   placeholder="${isVisitor ? '' : 'e.g. 1kg breast, 12 eggs...'}" />
          </td>
        </tr>
      `;
    }

    el.tableBody.innerHTML = html;

    // Attach Cell Event Listeners (only if authenticated owner)
    if (state.isAuthenticated) {
      attachTableInputEvents();
    }

    // Render Table Footer Totals
    el.footChicken.textContent = formatINR(metrics.totalChicken);
    el.footEggs.textContent = formatINR(metrics.totalEggs);
    el.footBananas.textContent = formatINR(metrics.totalBananas);
    el.footOtherFood.textContent = formatINR(metrics.totalOtherFood);
    el.footOtherExp.textContent = formatINR(metrics.totalOtherExp);
    el.footGrandTotal.textContent = formatINR(metrics.grandTotal);
  }

  function attachTableInputEvents() {
    const inputs = el.tableBody.querySelectorAll('.table-input, .notes-input');

    inputs.forEach(input => {
      input.addEventListener('focus', function () {
        this.select();
      });

      input.addEventListener('input', function () {
        handleCellChange(this);
      });

      input.addEventListener('keydown', function (e) {
        handleKeyNavigation(e, this);
      });
    });
  }

  function handleCellChange(input) {
    if (!state.isAuthenticated) return;

    const day = parseInt(input.getAttribute('data-day'), 10);
    const field = input.getAttribute('data-field');

    if (!state.daysData[day]) {
      state.daysData[day] = { chicken: 0, eggs: 0, bananas: 0, otherFood: 0, otherExp: 0, notes: '' };
    }

    if (field === 'notes') {
      state.daysData[day].notes = input.value;
    } else {
      let val = parseFloat(input.value);
      if (isNaN(val) || val < 0) val = 0;
      state.daysData[day][field] = val;

      if (val > 0) {
        input.classList.remove('zero-value');
        input.classList.add('has-value');
      } else {
        input.classList.remove('has-value');
        input.classList.add('zero-value');
      }
    }

    triggerDebouncedCloudSave();

    // Fast recalculate
    const metrics = calculateMetrics();
    updateDashboardUI(metrics);

    const rowTotalCell = document.getElementById(`dailyTotal_${day}`);
    if (rowTotalCell) {
      rowTotalCell.textContent = formatINR(metrics.dailyTotals[day]);
    }
  }

  function handleKeyNavigation(e, input) {
    const day = parseInt(input.getAttribute('data-day'), 10);
    const field = input.getAttribute('data-field');
    const numDays = getDaysInMonth(state.year, state.month);

    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      const nextDay = day + 1 <= numDays ? day + 1 : 1;
      const target = el.tableBody.querySelector(`[data-day="${nextDay}"][data-field="${field}"]`);
      if (target) target.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevDay = day - 1 >= 1 ? day - 1 : numDays;
      const target = el.tableBody.querySelector(`[data-day="${prevDay}"][data-field="${field}"]`);
      if (target) target.focus();
    }
  }

  // ==========================================================================
  // Dashboard & Charts UI Update
  // ==========================================================================
  function updateDashboardUI(metrics) {
    el.budgetInput.value = state.budget;
    el.totalSpentDisplay.textContent = formatINR(metrics.grandTotal);

    if (metrics.remainingBudget >= 0) {
      el.budgetRemainingDisplay.textContent = formatINR(metrics.remainingBudget);
      el.budgetRemainingDisplay.className = 'stat-val positive';
    } else {
      el.budgetRemainingDisplay.textContent = `-${formatINR(Math.abs(metrics.remainingBudget))}`;
      el.budgetRemainingDisplay.className = 'stat-val negative';
    }

    const pct = Math.min(Math.max(metrics.budgetPercentUsed, 0), 100);
    el.budgetProgressFill.style.width = `${pct}%`;

    if (metrics.budgetPercentUsed > 100) {
      el.budgetProgressFill.className = 'progress-fill status-over';
      el.budgetAlertBanner.className = 'budget-alert-banner banner-danger';
      const overBy = formatINR(Math.abs(metrics.remainingBudget));
      el.budgetAlertBanner.innerHTML = `⚠️ <strong>Budget Exceeded!</strong> Spent ${metrics.budgetPercentUsed.toFixed(1)}% of monthly limit (over by ${overBy}). Review highest spending days.`;
    } else if (metrics.budgetPercentUsed >= 80) {
      el.budgetProgressFill.className = 'progress-fill status-warn';
      el.budgetAlertBanner.className = 'budget-alert-banner banner-warn';
      el.budgetAlertBanner.innerHTML = `⚡ <strong>Budget Warning:</strong> Consumed ${metrics.budgetPercentUsed.toFixed(1)}% of budget. Remaining: ${formatINR(metrics.remainingBudget)}.`;
    } else {
      el.budgetProgressFill.className = 'progress-fill';
      el.budgetAlertBanner.className = 'budget-alert-banner banner-success';
      el.budgetAlertBanner.innerHTML = `✓ <strong>Budget on Track:</strong> ${formatINR(metrics.remainingBudget)} remaining (${metrics.budgetPercentUsed.toFixed(1)}% used).`;
    }

    el.kpiTotalExpense.textContent = formatINR(metrics.grandTotal);
    el.kpiRemainingBudget.textContent = formatINR(metrics.remainingBudget);
    el.kpiDailyAvg.textContent = formatINR(metrics.avgDaily);

    if (metrics.maxSpendingDay) {
      const dObj = new Date(state.year, state.month - 1, metrics.maxSpendingDay);
      el.kpiHighestDay.textContent = `${dObj.getDate()} ${MONTH_NAMES[state.month - 1].slice(0, 3)} (${formatINR(metrics.maxSpending)})`;
    } else {
      el.kpiHighestDay.textContent = 'None';
    }

    if (metrics.minSpendingDay) {
      const dObj = new Date(state.year, state.month - 1, metrics.minSpendingDay);
      el.kpiLowestDay.textContent = `${dObj.getDate()} ${MONTH_NAMES[state.month - 1].slice(0, 3)} (${formatINR(metrics.minSpending)})`;
    } else {
      el.kpiLowestDay.textContent = 'None';
    }

    el.kpiFoodPercent.textContent = `${metrics.foodPercent.toFixed(1)}%`;

    renderCategoryCards(metrics);

    el.footChicken.textContent = formatINR(metrics.totalChicken);
    el.footEggs.textContent = formatINR(metrics.totalEggs);
    el.footBananas.textContent = formatINR(metrics.totalBananas);
    el.footOtherFood.textContent = formatINR(metrics.totalOtherFood);
    el.footOtherExp.textContent = formatINR(metrics.totalOtherExp);
    el.footGrandTotal.textContent = formatINR(metrics.grandTotal);

    renderDoughnutChart(metrics);
    renderBarChart(metrics);
  }

  function renderCategoryCards(metrics) {
    const cats = [
      { key: 'chicken', label: 'Chicken', amount: metrics.totalChicken, color: 'var(--cat-chicken)', cls: 'cat-chicken', icon: '🍗' },
      { key: 'eggs', label: 'Eggs', amount: metrics.totalEggs, color: 'var(--cat-eggs)', cls: 'cat-eggs', icon: '🥚' },
      { key: 'bananas', label: 'Bananas', amount: metrics.totalBananas, color: 'var(--cat-bananas)', cls: 'cat-bananas', icon: '🍌' },
      { key: 'otherFood', label: 'Other Food', amount: metrics.totalOtherFood, color: 'var(--cat-other-food)', cls: 'cat-other-food', icon: '🥗' },
      { key: 'otherExp', label: 'Other Expenses', amount: metrics.totalOtherExp, color: 'var(--cat-other-exp)', cls: 'cat-other-exp', icon: '💳' }
    ];

    let html = '';
    cats.forEach(c => {
      const pct = metrics.grandTotal > 0 ? (c.amount / metrics.grandTotal) * 100 : 0;
      html += `
        <div class="cat-kpi-card ${c.cls}">
          <div class="cat-kpi-top">
            <span class="cat-title">${c.icon} ${c.label}</span>
            <span class="cat-percent-badge">${pct.toFixed(1)}%</span>
          </div>
          <div class="cat-amount">${formatINR(c.amount)}</div>
          <div class="cat-mini-bar">
            <div class="cat-mini-bar-fill" style="width: ${pct}%; background-color: ${c.color};"></div>
          </div>
        </div>
      `;
    });

    el.catSummaryContainer.innerHTML = html;
  }

  // ==========================================================================
  // SVG Charts (100% Client-Side, Zero Heavy Dependencies)
  // ==========================================================================
  function renderDoughnutChart(metrics) {
    const size = 260;
    const strokeWidth = 38;
    const radius = (size - strokeWidth) / 2;
    const center = size / 2;
    const circumference = 2 * Math.PI * radius;

    const items = [
      { key: 'chicken', label: 'Chicken', amount: metrics.totalChicken, color: '#d97706' },
      { key: 'eggs', label: 'Eggs', amount: metrics.totalEggs, color: '#ca8a04' },
      { key: 'bananas', label: 'Bananas', amount: metrics.totalBananas, color: '#65a30d' },
      { key: 'otherFood', label: 'Other Food', amount: metrics.totalOtherFood, color: '#059669' },
      { key: 'otherExp', label: 'Other Exp', amount: metrics.totalOtherExp, color: '#4f46e5' }
    ];

    const grand = metrics.grandTotal;

    if (grand <= 0) {
      el.doughnutChartBox.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); font-size: 13px; padding: 40px 0;">
          <div style="font-size: 32px; margin-bottom: 8px;">📊</div>
          No expenses recorded for this month yet.
        </div>
      `;
      return;
    }

    let currentOffset = 0;
    let pathsHtml = '';
    let legendHtml = '';

    items.forEach(item => {
      if (item.amount <= 0) return;
      const pct = (item.amount / grand);
      const dash = pct * circumference;
      const gap = circumference - dash;

      pathsHtml += `
        <circle cx="${center}" cy="${center}" r="${radius}" 
                fill="none" 
                stroke="${item.color}" 
                stroke-width="${strokeWidth}" 
                stroke-dasharray="${dash} ${gap}" 
                stroke-dashoffset="${-currentOffset}" 
                style="transition: all 0.4s ease; cursor: pointer;"
                data-label="${item.label}" 
                data-amount="${formatINR(item.amount)}" 
                data-pct="${(pct * 100).toFixed(1)}%"
                class="chart-slice" />
      `;

      currentOffset += dash;

      legendHtml += `
        <div class="legend-item" title="${item.label}: ${formatINR(item.amount)} (${(pct * 100).toFixed(1)}%)">
          <span class="legend-dot" style="background-color: ${item.color};"></span>
          <span><strong>${item.label}:</strong> ${(pct * 100).toFixed(1)}%</span>
        </div>
      `;
    });

    const svg = `
      <div class="svg-doughnut-container">
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg);">
          <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="#e2e8f0" stroke-width="${strokeWidth}" />
          ${pathsHtml}
        </svg>
        <div style="position: absolute; text-align: center; pointer-events: none; transform: translateY(-16px);">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: var(--text-muted); letter-spacing: 0.05em;">Total Spent</div>
          <div style="font-size: 18px; font-weight: 800; color: var(--text-main);">${formatINR(grand)}</div>
        </div>
        <div class="doughnut-legend">
          ${legendHtml}
        </div>
      </div>
    `;

    el.doughnutChartBox.innerHTML = svg;

    const slices = el.doughnutChartBox.querySelectorAll('.chart-slice');
    slices.forEach(slice => {
      slice.addEventListener('mouseenter', e => {
        slice.setAttribute('stroke-width', (strokeWidth + 6).toString());
        const lbl = slice.getAttribute('data-label');
        const amt = slice.getAttribute('data-amount');
        const p = slice.getAttribute('data-pct');
        showTooltip(e, `${lbl}: ${amt} (${p})`);
      });
      slice.addEventListener('mouseleave', () => {
        slice.setAttribute('stroke-width', strokeWidth.toString());
        hideTooltip();
      });
      slice.addEventListener('mousemove', e => {
        moveTooltip(e);
      });
    });
  }

  function renderBarChart(metrics) {
    const numDays = metrics.numDays;
    const width = 640;
    const height = 240;
    const padLeft = 45;
    const padRight = 15;
    const padTop = 20;
    const padBottom = 35;

    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;

    let maxVal = 0;
    for (let d = 1; d <= numDays; d++) {
      if (metrics.dailyTotals[d] > maxVal) maxVal = metrics.dailyTotals[d];
    }
    maxVal = maxVal > 0 ? Math.ceil(maxVal * 1.15) : 500;

    const barSlot = chartW / numDays;
    const barW = Math.max(barSlot * 0.7, 4);

    let barsHtml = '';
    const avgY = padTop + chartH - (metrics.avgDaily / maxVal) * chartH;

    for (let day = 1; day <= numDays; day++) {
      const val = metrics.dailyTotals[day] || 0;
      const barH = (val / maxVal) * chartH;
      const x = padLeft + (day - 1) * barSlot + (barSlot - barW) / 2;
      const y = padTop + chartH - barH;

      const isAboveAvg = metrics.avgDaily > 0 && val >= metrics.avgDaily;
      const color = isAboveAvg ? '#f59e0b' : '#3b82f6';

      barsHtml += `
        <rect x="${x}" y="${y}" width="${barW}" height="${barH}" 
              rx="3" ry="3" 
              fill="${val > 0 ? color : '#f1f5f9'}" 
              class="bar-rect" 
              style="cursor: pointer; transition: opacity 0.15s ease;"
              data-day="${day}" 
              data-val="${formatINR(val)}" />
      `;

      if (day === 1 || day % 5 === 0 || day === numDays) {
        barsHtml += `
          <text x="${x + barW / 2}" y="${height - 12}" 
                text-anchor="middle" font-size="10" fill="#64748b" font-weight="600">
            ${day}
          </text>
        `;
      }
    }

    let gridHtml = '';
    const ticks = 4;
    for (let t = 0; t <= ticks; t++) {
      const tickVal = (maxVal / ticks) * t;
      const y = padTop + chartH - (tickVal / maxVal) * chartH;
      gridHtml += `
        <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="2 2" />
        <text x="${padLeft - 6}" y="${y + 3}" text-anchor="end" font-size="10" fill="#94a3b8" font-weight="500">
          ₹${Math.round(tickVal)}
        </text>
      `;
    }

    let avgLineHtml = '';
    if (metrics.avgDaily > 0 && avgY <= (padTop + chartH)) {
      avgLineHtml = `
        <line x1="${padLeft}" y1="${avgY}" x2="${width - padRight}" y2="${avgY}" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="4 4" />
        <text x="${width - padRight}" y="${avgY - 4}" text-anchor="end" font-size="10" fill="#dc2626" font-weight="700">
          Avg ₹${Math.round(metrics.avgDaily)}
        </text>
      `;
    }

    const svg = `
      <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" style="overflow: visible;">
        ${gridHtml}
        ${barsHtml}
        ${avgLineHtml}
      </svg>
    `;

    el.barChartBox.innerHTML = svg;

    const bars = el.barChartBox.querySelectorAll('.bar-rect');
    bars.forEach(bar => {
      const day = bar.getAttribute('data-day');
      const val = bar.getAttribute('data-val');
      const dateObj = new Date(state.year, state.month - 1, parseInt(day, 10));
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

      bar.addEventListener('mouseenter', e => {
        bar.style.opacity = '0.75';
        showTooltip(e, `Day ${day} (${dayName}): ${val}`);
      });
      bar.addEventListener('mouseleave', () => {
        bar.style.opacity = '1';
        hideTooltip();
      });
      bar.addEventListener('mousemove', e => {
        moveTooltip(e);
      });
      bar.addEventListener('click', () => {
        const row = el.tableBody.querySelector(`tr[data-day="${day}"]`);
        if (row) {
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
          row.style.outline = '2px solid #2563eb';
          setTimeout(() => { row.style.outline = 'none'; }, 1500);
        }
      });
    });
  }

  function showTooltip(e, text) {
    if (!el.chartTooltip) return;
    el.chartTooltip.textContent = text;
    el.chartTooltip.style.opacity = '1';
    moveTooltip(e);
  }

  function moveTooltip(e) {
    if (!el.chartTooltip) return;
    el.chartTooltip.style.left = `${e.pageX}px`;
    el.chartTooltip.style.top = `${e.pageY - 12}px`;
  }

  function hideTooltip() {
    if (!el.chartTooltip) return;
    el.chartTooltip.style.opacity = '0';
  }

  // ==========================================================================
  // Client-Side File Exports (Excel .xls & CSV)
  // ==========================================================================
  function exportCSV() {
    const metrics = calculateMetrics();
    const numDays = metrics.numDays;
    const monthName = MONTH_NAMES[state.month - 1];

    let csv = `Monthly Expense Tracker - ${monthName} ${state.year}\n`;
    csv += `Monthly Budget,₹${state.budget}\n`;
    csv += `Total Spent,₹${metrics.grandTotal}\n`;
    csv += `Remaining Budget,₹${metrics.remainingBudget}\n`;
    csv += `Average Daily,₹${metrics.avgDaily.toFixed(2)}\n\n`;

    csv += `Date,Day,Chicken (₹),Eggs (₹),Bananas (₹),Other Food (₹),Other Expenses (₹),Daily Total (₹),Notes\n`;

    for (let day = 1; day <= numDays; day++) {
      const d = state.daysData[day] || { chicken: 0, eggs: 0, bananas: 0, otherFood: 0, otherExp: 0, notes: '' };
      const dateObj = new Date(state.year, state.month - 1, day);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
      const dateStr = `${day.toString().padStart(2, '0')}-${monthName.slice(0, 3)}-${state.year}`;
      const dTotal = metrics.dailyTotals[day] || 0;
      const notesClean = `"${(d.notes || '').replace(/"/g, '""')}"`;

      csv += `${dateStr},${dayName},${d.chicken || 0},${d.eggs || 0},${d.bananas || 0},${d.otherFood || 0},${d.otherExp || 0},${dTotal},${notesClean}\n`;
    }

    csv += `TOTAL,,${metrics.totalChicken},${metrics.totalEggs},${metrics.totalBananas},${metrics.totalOtherFood},${metrics.totalOtherExp},${metrics.grandTotal},\n`;

    downloadFile(csv, `Monthly_Expenses_${monthName}_${state.year}.csv`, 'text/csv;charset=utf-8;');
    showToast('Exported CSV file successfully!');
  }

  function exportExcel() {
    const metrics = calculateMetrics();
    const numDays = metrics.numDays;
    const monthName = MONTH_NAMES[state.month - 1];

    const startRow = 6;
    const endRow = startRow + numDays - 1;
    const totalRow = endRow + 1;

    let rowsXml = '';

    for (let day = 1; day <= numDays; day++) {
      const r = startRow + day - 1;
      const d = state.daysData[day] || { chicken: 0, eggs: 0, bananas: 0, otherFood: 0, otherExp: 0, notes: '' };
      const dateObj = new Date(state.year, state.month - 1, day);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
      const dateStr = `${day.toString().padStart(2, '0')}-${monthName.slice(0, 3)}-${state.year}`;
      const notesClean = escapeHTML(d.notes || '');

      rowsXml += `
      <Row ss:Index="${r}">
        <Cell ss:StyleID="sCenter"><Data ss:Type="String">${dateStr}</Data></Cell>
        <Cell ss:StyleID="sCenter"><Data ss:Type="String">${dayName}</Data></Cell>
        <Cell ss:StyleID="sCurrency"><Data ss:Type="Number">${d.chicken || 0}</Data></Cell>
        <Cell ss:StyleID="sCurrency"><Data ss:Type="Number">${d.eggs || 0}</Data></Cell>
        <Cell ss:StyleID="sCurrency"><Data ss:Type="Number">${d.bananas || 0}</Data></Cell>
        <Cell ss:StyleID="sCurrency"><Data ss:Type="Number">${d.otherFood || 0}</Data></Cell>
        <Cell ss:StyleID="sCurrency"><Data ss:Type="Number">${d.otherExp || 0}</Data></Cell>
        <Cell ss:StyleID="sDailyTotal" ss:Formula="=SUM(RC[-5]:RC[-1])"><Data ss:Type="Number">${metrics.dailyTotals[day]}</Data></Cell>
        <Cell ss:StyleID="sText"><Data ss:Type="String">${notesClean}</Data></Cell>
      </Row>`;
    }

    const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="sHeader">
   <Font ss:FontName="Segoe UI" ss:Bold="1" ss:Color="#FFFFFF" ss:Size="11"/>
   <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="sCenter">
   <Alignment ss:Horizontal="Center"/>
  </Style>
  <Style ss:ID="sText">
   <Alignment ss:Horizontal="Left"/>
  </Style>
  <Style ss:ID="sCurrency">
   <NumberFormat ss:Format="&quot;₹&quot;#,##0.00"/>
   <Alignment ss:Horizontal="Right"/>
  </Style>
  <Style ss:ID="sDailyTotal">
   <NumberFormat ss:Format="&quot;₹&quot;#,##0.00"/>
   <Font ss:Bold="1" ss:Color="#0F172A"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Right"/>
  </Style>
  <Style ss:ID="sTotalRow">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="&quot;₹&quot;#,##0.00"/>
   <Alignment ss:Horizontal="Right"/>
  </Style>
  <Style ss:ID="sGrandTotal">
   <Font ss:Bold="1" ss:Color="#38BDF8" ss:Size="11"/>
   <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="&quot;₹&quot;#,##0.00"/>
   <Alignment ss:Horizontal="Right"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${monthName} ${state.year}">
  <Table>
   <Column ss:Width="95"/>
   <Column ss:Width="90"/>
   <Column ss:Width="85"/>
   <Column ss:Width="85"/>
   <Column ss:Width="85"/>
   <Column ss:Width="95"/>
   <Column ss:Width="110"/>
   <Column ss:Width="110"/>
   <Column ss:Width="250"/>
   <Row ss:Index="1">
    <Cell><Data ss:Type="String">Monthly Expense Tracker - ${monthName} ${state.year}</Data></Cell>
   </Row>
   <Row ss:Index="2">
    <Cell><Data ss:Type="String">Monthly Budget: ₹${state.budget}</Data></Cell>
   </Row>
   <Row ss:Index="5">
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Date</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Day</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Chicken (₹)</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Eggs (₹)</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Bananas (₹)</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Other Food (₹)</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Other Exp (₹)</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Daily Total (₹)</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Notes</Data></Cell>
   </Row>
   ${rowsXml}
   <Row ss:Index="${totalRow}">
    <Cell ss:StyleID="sTotalRow"><Data ss:Type="String">TOTAL</Data></Cell>
    <Cell ss:StyleID="sTotalRow"><Data ss:Type="String"></Data></Cell>
    <Cell ss:StyleID="sTotalRow" ss:Formula="=SUM(R[${startRow - totalRow}]C:R[-1]C)"><Data ss:Type="Number">${metrics.totalChicken}</Data></Cell>
    <Cell ss:StyleID="sTotalRow" ss:Formula="=SUM(R[${startRow - totalRow}]C:R[-1]C)"><Data ss:Type="Number">${metrics.totalEggs}</Data></Cell>
    <Cell ss:StyleID="sTotalRow" ss:Formula="=SUM(R[${startRow - totalRow}]C:R[-1]C)"><Data ss:Type="Number">${metrics.totalBananas}</Data></Cell>
    <Cell ss:StyleID="sTotalRow" ss:Formula="=SUM(R[${startRow - totalRow}]C:R[-1]C)"><Data ss:Type="Number">${metrics.totalOtherFood}</Data></Cell>
    <Cell ss:StyleID="sTotalRow" ss:Formula="=SUM(R[${startRow - totalRow}]C:R[-1]C)"><Data ss:Type="Number">${metrics.totalOtherExp}</Data></Cell>
    <Cell ss:StyleID="sGrandTotal" ss:Formula="=SUM(R[${startRow - totalRow}]C:R[-1]C)"><Data ss:Type="Number">${metrics.grandTotal}</Data></Cell>
    <Cell ss:StyleID="sTotalRow"><Data ss:Type="String"></Data></Cell>
   </Row>
  </Table>
 </Worksheet>
</Workbook>`;

    downloadFile(xml, `Monthly_Expenses_${monthName}_${state.year}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
    showToast('Exported Excel Spreadsheet (.xls) successfully!');
  }

  function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ==========================================================================
  // Global Actions & Events Setup
  // ==========================================================================
  function renderAll() {
    el.monthSelect.value = state.month.toString();
    el.yearInput.value = state.year.toString();

    const metrics = calculateMetrics();
    renderTable(metrics);
    updateDashboardUI(metrics);
  }

  function setupEventListeners() {
    // Month selector change
    el.monthSelect.addEventListener('change', function () {
      state.month = parseInt(this.value, 10);
      loadDataForCurrentMonth(false);
    });

    // Year input change (Supports 2026, 2027, etc.)
    el.yearInput.addEventListener('change', function () {
      let y = parseInt(this.value, 10);
      if (isNaN(y) || y < 2020 || y > 2035) y = 2026;
      state.year = y;
      this.value = y;
      loadDataForCurrentMonth(false);
    });

    // Month Navigation buttons (◀ and ▶)
    el.prevMonthBtn.addEventListener('click', () => {
      if (state.month === 1) {
        state.month = 12;
        state.year--;
      } else {
        state.month--;
      }
      loadDataForCurrentMonth(false);
    });

    el.nextMonthBtn.addEventListener('click', () => {
      if (state.month === 12) {
        state.month = 1;
        state.year++;
      } else {
        state.month++;
      }
      loadDataForCurrentMonth(false);
    });

    el.currentMonthBtn.addEventListener('click', () => {
      const now = new Date();
      state.year = now.getFullYear();
      state.month = now.getMonth() + 1;
      loadDataForCurrentMonth(false);
    });

    // Refresh button
    if (el.syncReloadBtn) {
      el.syncReloadBtn.addEventListener('click', () => {
        loadDataForCurrentMonth(false);
      });
    }

    // Manual Save button (for explicit confirmation)
    if (el.syncSaveBtn) {
      el.syncSaveBtn.addEventListener('click', () => {
        saveToCloud(true);
      });
    }

    // Budget input change
    el.budgetInput.addEventListener('change', function () {
      if (!state.isAuthenticated) {
        showToast('👁️ Visitor view is read-only.');
        this.value = state.budget;
        return;
      }
      let val = parseFloat(this.value);
      if (isNaN(val) || val < 0) val = 0;
      state.budget = val;
      this.value = val;
      triggerDebouncedCloudSave();
      const metrics = calculateMetrics();
      updateDashboardUI(metrics);
      showToast(`Monthly budget updated to ${formatINR(val)}`);
    });

    // Search filter
    el.searchInput.addEventListener('input', function () {
      state.filterQuery = this.value;
      const metrics = calculateMetrics();
      renderTable(metrics);
    });

    // High spending toggle
    el.highSpendingToggle.addEventListener('change', function () {
      state.highlightHighSpending = this.checked;
      const metrics = calculateMetrics();
      renderTable(metrics);
    });

    // Sample Data button (Owner only)
    el.sampleDataBtn.addEventListener('click', () => {
      if (!state.isAuthenticated) {
        showToast('👁️ Sign in to populate sample data.');
        return;
      }
      if (confirm('Populate realistic sample expenses for Food & Living?')) {
        loadSampleExpenses();
      }
    });

    // Clear Month button (Owner only)
    el.clearMonthBtn.addEventListener('click', () => {
      if (!state.isAuthenticated) {
        showToast('👁️ Sign in to modify month data.');
        return;
      }
      const mName = MONTH_NAMES[state.month - 1];
      if (confirm(`Are you sure you want to clear all expenses for ${mName} ${state.year}?`)) {
        const numDays = getDaysInMonth(state.year, state.month);
        state.daysData = {};
        for (let d = 1; d <= numDays; d++) {
          state.daysData[d] = { chicken: 0, eggs: 0, bananas: 0, otherFood: 0, otherExp: 0, notes: '' };
        }
        triggerDebouncedCloudSave();
        renderAll();
        showToast(`Cleared all expenses for ${mName} ${state.year}`);
      }
    });

    // Client Exports
    el.exportCsvBtn.addEventListener('click', exportCSV);
    el.exportExcelBtn.addEventListener('click', exportExcel);
    el.printBtn.addEventListener('click', () => {
      window.print();
    });

    // Auth & Modal Listeners
    setupAuthModalListeners();
    setupCloudModalListeners();
  }

  function loadSampleExpenses() {
    const numDays = getDaysInMonth(state.year, state.month);
    const samples = [
      { day: 1, c: 240, e: 60, b: 40, f: 120, o: 50, n: 'Chicken 1kg, 12 eggs, Bananas 1kg, Milk' },
      { day: 2, c: 0,   e: 40, b: 35, f: 90,  o: 0,  n: 'Brown eggs, Robusta bananas, Oats' },
      { day: 3, c: 260, e: 0,  b: 40, f: 150, o: 80, n: 'Chicken breast, veggies, fruits' },
      { day: 4, c: 0,   e: 65, b: 0,  f: 110, o: 0,  n: 'Egg tray 12pk, curd, bread' },
      { day: 5, c: 250, e: 40, b: 45, f: 80,  o: 150,n: 'Chicken curry cut, bananas, spices' }
    ];
    samples.forEach(s => {
      if (s.day <= numDays) {
        state.daysData[s.day] = { chicken: s.c, eggs: s.e, bananas: s.b, otherFood: s.f, otherExp: s.o, notes: s.n };
      }
    });
    triggerDebouncedCloudSave();
    renderAll();
    showToast('Loaded sample expenses!');
  }

  // ==========================================================================
  // Auth Modal (Sign In / Sign Up)
  // ==========================================================================
  let isSignUpMode = false;

  function setupAuthModalListeners() {
    el.authBtn.addEventListener('click', () => {
      if (state.isAuthenticated) {
        if (confirm('Do you want to sign out? Your public link will stay in read-only mode.')) {
          if (supabaseClient) supabaseClient.auth.signOut();
          state.isAuthenticated = false;
          state.user = null;
          updateAuthRoleUI();
          renderAll();
          showToast('Signed out. Viewing in Public Read-Only mode.');
        }
      } else {
        openAuthModal();
      }
    });

    el.closeAuthModalBtn.addEventListener('click', closeAuthModal);
    el.authModal.addEventListener('click', e => {
      if (e.target === el.authModal) closeAuthModal();
    });

    el.authToggleModeBtn.addEventListener('click', () => {
      isSignUpMode = !isSignUpMode;
      el.authModalTitle.textContent = isSignUpMode ? '✨ Create Owner Account' : '🔑 Owner Authentication';
      el.authSubmitBtn.textContent = isSignUpMode ? 'Create Account' : 'Sign In';
      el.authToggleText.textContent = isSignUpMode ? 'Already have an account?' : 'First time setup?';
      el.authToggleModeBtn.textContent = isSignUpMode ? 'Sign In Instead' : 'Create Owner Account';
      el.authErrorMsg.style.display = 'none';
      el.authSuccessMsg.style.display = 'none';
    });

    el.authSubmitBtn.addEventListener('click', handleAuthSubmit);
    el.authPasswordInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') handleAuthSubmit();
    });
  }

  function openAuthModal() {
    if (!state.cloudConnected) {
      showToast('Please configure Supabase first in "Cloud Setup".');
      openCloudSetupModal();
      return;
    }
    el.authErrorMsg.style.display = 'none';
    el.authSuccessMsg.style.display = 'none';
    el.authEmailInput.value = '';
    el.authPasswordInput.value = '';
    el.authModal.style.display = 'flex';
    el.authEmailInput.focus();
  }

  function closeAuthModal() {
    el.authModal.style.display = 'none';
  }

  async function handleAuthSubmit() {
    const email = el.authEmailInput.value.trim();
    const password = el.authPasswordInput.value;

    if (!email || !password) {
      showAuthError('Please enter both email and password.');
      return;
    }

    if (!supabaseClient) {
      showAuthError('Supabase is not configured yet. Click "Cloud Setup" to configure.');
      return;
    }

    el.authSubmitBtn.disabled = true;
    el.authSubmitBtn.textContent = 'Processing...';
    el.authErrorMsg.style.display = 'none';
    el.authSuccessMsg.style.display = 'none';

    try {
      if (isSignUpMode) {
        // Sign Up
        const { data, error } = await supabaseClient.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          handleAuthChange(data.session);
          closeAuthModal();
          showToast('Account created and signed in successfully!');
        } else {
          el.authSuccessMsg.textContent = 'Account created! Please check your email to confirm registration, then sign in.';
          el.authSuccessMsg.style.display = 'block';
        }
      } else {
        // Sign In
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        handleAuthChange(data.session);
        closeAuthModal();
        showToast('Signed in successfully! Full editing access unlocked.');
      }
    } catch (err) {
      showAuthError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      el.authSubmitBtn.disabled = false;
      el.authSubmitBtn.textContent = isSignUpMode ? 'Create Account' : 'Sign In';
    }
  }

  function showAuthError(msg) {
    el.authErrorMsg.textContent = msg;
    el.authErrorMsg.style.display = 'block';
  }

  // ==========================================================================
  // Cloud Setup Modal
  // ==========================================================================
  function setupCloudModalListeners() {
    el.cloudSetupBtn.addEventListener('click', openCloudSetupModal);
    el.closeCloudSetupBtn.addEventListener('click', closeCloudSetupModal);
    el.cloudSetupModal.addEventListener('click', e => {
      if (e.target === el.cloudSetupModal) closeCloudSetupModal();
    });

    el.saveCloudSetupBtn.addEventListener('click', () => {
      const url = el.setupUrlInput.value.trim();
      const anonKey = el.setupAnonKeyInput.value.trim();

      if (!url || !anonKey) {
        alert('Please provide both the Supabase Project URL and Public Anon Key.');
        return;
      }

      localStorage.setItem('supabase_project_url', url);
      localStorage.setItem('supabase_anon_key', anonKey);

      if (window.SUPABASE_CONFIG) {
        window.SUPABASE_CONFIG.url = url;
        window.SUPABASE_CONFIG.anonKey = anonKey;
      }

      const connected = initSupabase();
      if (connected) {
        el.setupMsg.textContent = '✓ Connected to Supabase successfully!';
        el.setupMsg.style.display = 'block';
        setTimeout(() => {
          closeCloudSetupModal();
          loadDataForCurrentMonth(false);
        }, 1200);
      } else {
        alert('Could not initialize Supabase client. Please check the URL format.');
      }
    });

    el.clearCloudSetupBtn.addEventListener('click', () => {
      if (confirm('Clear stored Supabase credentials from this browser?')) {
        localStorage.removeItem('supabase_project_url');
        localStorage.removeItem('supabase_anon_key');
        if (window.SUPABASE_CONFIG) {
          window.SUPABASE_CONFIG.url = '';
          window.SUPABASE_CONFIG.anonKey = '';
        }
        supabaseClient = null;
        state.cloudConnected = false;
        state.isAuthenticated = false;
        state.user = null;
        updateAuthRoleUI();
        closeCloudSetupModal();
        showToast('Cleared Supabase credentials.');
      }
    });
  }

  function openCloudSetupModal() {
    const cfg = window.SUPABASE_CONFIG || {};
    el.setupUrlInput.value = cfg.url || localStorage.getItem('supabase_project_url') || '';
    el.setupAnonKeyInput.value = cfg.anonKey || localStorage.getItem('supabase_anon_key') || '';
    el.setupMsg.style.display = 'none';
    el.cloudSetupModal.style.display = 'flex';
  }

  function closeCloudSetupModal() {
    el.cloudSetupModal.style.display = 'none';
  }

  // ==========================================================================
  // Application Entry Point
  // ==========================================================================
  document.addEventListener('DOMContentLoaded', async () => {
    initElements();
    setupEventListeners();

    // 1. Initialize Supabase
    initSupabase();

    // 2. Load data for October 2026 (Preserved Historical Baseline)
    await loadDataForCurrentMonth(true);
  });

})();
