// ==========================================================================
// PLANNINGEASY - FINANCE MANAGEMENT MODULE
// STRICT: NO CHARTS / GRAPHS - ONLY NUMBERS, SUMMARY CARDS & LISTS
// Permissions: Admin & Member ADD/VIEW. ONLY Admin EDIT/DELETE.
// ==========================================================================

import { Auth } from './auth.js';
import { Storage } from './storage.js';
import { APP_CONFIG } from './config.js';

export const Finance = {
  activeFilterType: 'all', // 'all' | 'income' | 'expense'
  activeCategory: 'all',
  searchQuery: '',
  selectedMonth: '', // YYYY-MM

  formatCurrency(amount) {
    return `${APP_CONFIG.currencySymbol} ${Number(amount || 0).toLocaleString('en-IN')}`;
  },

  render(container) {
    const user = Auth.getCurrentUser();
    if (!user) return;

    const allFinance = Storage.getAll('finance');

    // Apply Filters
    let filtered = allFinance.filter((item) => {
      // Type Filter
      if (this.activeFilterType !== 'all' && item.type !== this.activeFilterType) {
        return false;
      }
      // Category Filter
      if (this.activeCategory !== 'all' && item.category !== this.activeCategory) {
        return false;
      }
      // Month Filter
      if (this.selectedMonth && item.date && !item.date.startsWith(this.selectedMonth)) {
        return false;
      }
      // Search Query
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        const text = `${item.narration || ''} ${item.category || ''} ${item.createdByName || ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });

    // Sort by date descending
    filtered.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

    // Calculate Summaries from filtered data
    const totalIncome = filtered
      .filter((f) => f.type === 'income')
      .reduce((sum, f) => sum + Number(f.amount || 0), 0);
    const totalExpense = filtered
      .filter((f) => f.type === 'expense')
      .reduce((sum, f) => sum + Number(f.amount || 0), 0);
    const netBalance = totalIncome - totalExpense;

    container.innerHTML = `
      <div class="finance-view">
        <!-- Module Top Header with Action -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <div>
            <h2 style="font-size: 18px; font-weight: 800; color: var(--text-main);">Finance Records</h2>
            <div style="font-size: 12px; color: var(--text-muted);">Manage organizational income & expenses</div>
          </div>
          <button class="btn btn-primary btn-sm" id="openAddTransactionBtn">
            <span>+ Add Entry</span>
          </button>
        </div>

        <!-- Summary Cards (No Charts) -->
        <div class="summary-grid">
          <div class="summary-card income">
            <div class="summary-label">Total Income</div>
            <div class="summary-val income-val">${this.formatCurrency(totalIncome)}</div>
          </div>
          <div class="summary-card expense">
            <div class="summary-label">Total Expense</div>
            <div class="summary-val expense-val">${this.formatCurrency(totalExpense)}</div>
          </div>
          <div class="summary-card balance">
            <div class="summary-label">Net Balance</div>
            <div class="summary-val balance-val" style="color: ${netBalance >= 0 ? 'var(--primary-dark)' : 'var(--danger)'};">
              ${this.formatCurrency(netBalance)}
            </div>
          </div>
        </div>

        <!-- Filter Controls -->
        <div class="card" style="padding: 12px; margin-bottom: 12px;">
          <!-- Search Bar -->
          <div class="search-box" style="margin-bottom: 8px;">
            <span class="search-icon">🔍</span>
            <input type="text" id="financeSearchInput" placeholder="Search narration, category, or person..." value="${this.searchQuery}">
          </div>

          <!-- Type Filter Chips -->
          <div class="chip-group" style="margin-bottom: 8px;">
            <button class="chip ${this.activeFilterType === 'all' ? 'active' : ''}" data-type-filter="all">All (${allFinance.length})</button>
            <button class="chip ${this.activeFilterType === 'income' ? 'active' : ''}" data-type-filter="income">Income</button>
            <button class="chip ${this.activeFilterType === 'expense' ? 'active' : ''}" data-type-filter="expense">Expense</button>
          </div>

          <!-- Category & Month Selectors -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div>
              <select class="form-select" id="financeCategorySelect" style="padding: 7px 10px; font-size: 12px;">
                <option value="all" ${this.activeCategory === 'all' ? 'selected' : ''}>All Categories</option>
                ${APP_CONFIG.financeCategories.map((cat) => `
                  <option value="${cat}" ${this.activeCategory === cat ? 'selected' : ''}>${cat}</option>
                `).join('')}
              </select>
            </div>
            <div>
              <input type="month" class="form-input" id="financeMonthSelect" style="padding: 6px 10px; font-size: 12px;" value="${this.selectedMonth}">
            </div>
          </div>
        </div>

        <!-- Admin Export Bar -->
        ${Auth.isAdmin() ? `
          <div style="display: flex; gap: 8px; margin-bottom: 12px; justify-content: flex-end;">
            <button class="btn btn-outline btn-sm" id="exportFinanceCsvBtn">
              📥 Export CSV
            </button>
            <button class="btn btn-outline btn-sm" id="exportFinancePdfBtn">
              📄 Export PDF
            </button>
          </div>
        ` : ''}

        <!-- Transactions List -->
        <div class="transactions-list">
          ${filtered.length === 0 ? `
            <div class="empty-state">
              <div class="empty-state-icon">💳</div>
              <div class="empty-state-title">No transactions found</div>
              <div class="empty-state-text">No income or expense records match your current filter.</div>
              <button class="btn btn-primary btn-sm" id="emptyAddTransactionBtn">+ Add First Entry</button>
            </div>
          ` : `
            <div>
              ${filtered.map((item) => `
                <div class="list-item" style="border-left: 4px solid ${item.type === 'income' ? 'var(--success)' : 'var(--danger)'};">
                  <div class="list-item-main">
                    <div class="flex items-center gap-2">
                      <span class="badge ${item.type === 'income' ? 'badge-income' : 'badge-expense'}">
                        ${item.type.toUpperCase()}
                      </span>
                      <span style="font-size: 12px; font-weight: 700; color: var(--text-main);">${item.category}</span>
                    </div>
                    <div class="list-item-title mt-1" style="font-size: 13.5px; font-weight: 500;">
                      ${item.narration || 'No description'}
                    </div>
                    <div class="list-item-meta">
                      <span>📅 ${item.date || 'N/A'}</span>
                      <span>&bull; By ${item.createdByName || 'Unknown'}</span>
                    </div>
                  </div>
                  <div style="display: flex; flex-direction: column; align-items: flex-end;">
                    <div class="list-item-amount" style="color: ${item.type === 'income' ? 'var(--success)' : 'var(--danger)'};">
                      ${item.type === 'income' ? '+' : '-'} ${this.formatCurrency(item.amount)}
                    </div>
                    ${Auth.isAdmin() ? `
                      <div class="list-item-actions mt-2">
                        <button class="btn btn-ghost btn-sm btn-icon-only edit-finance-btn" data-id="${item.id}" title="Edit Entry" style="width: 28px; height: 28px; min-height: 28px;">
                          ✏️
                        </button>
                        <button class="btn btn-ghost btn-sm btn-icon-only delete-finance-btn" data-id="${item.id}" title="Delete Entry" style="width: 28px; height: 28px; min-height: 28px; color: var(--danger);">
                          🗑️
                        </button>
                      </div>
                    ` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;

    // Event Handlers
    container.querySelector('#openAddTransactionBtn')?.addEventListener('click', () => this.openAddModal());
    container.querySelector('#emptyAddTransactionBtn')?.addEventListener('click', () => this.openAddModal());

    // Search input
    const searchInput = container.querySelector('#financeSearchInput');
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.render(container);
    });

    // Type filter
    container.querySelectorAll('[data-type-filter]').forEach((chip) => {
      chip.addEventListener('click', () => {
        this.activeFilterType = chip.getAttribute('data-type-filter');
        this.render(container);
      });
    });

    // Category select
    container.querySelector('#financeCategorySelect')?.addEventListener('change', (e) => {
      this.activeCategory = e.target.value;
      this.render(container);
    });

    // Month select
    container.querySelector('#financeMonthSelect')?.addEventListener('change', (e) => {
      this.selectedMonth = e.target.value;
      this.render(container);
    });

    // Admin Edit & Delete Handlers
    if (Auth.isAdmin()) {
      container.querySelectorAll('.edit-finance-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-id');
          this.openEditModal(id);
        });
      });

      container.querySelectorAll('.delete-finance-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-id');
          this.confirmDelete(id);
        });
      });

      container.querySelector('#exportFinanceCsvBtn')?.addEventListener('click', () => this.exportCsv(filtered));
      container.querySelector('#exportFinancePdfBtn')?.addEventListener('click', () => this.exportPdf(filtered, totalIncome, totalExpense, netBalance));
    }
  },

  // Modal: Add Entry
  openAddModal(defaultType = 'income') {
    const user = Auth.getCurrentUser();
    if (!user) return;

    const modalBackdrop = document.getElementById('globalModalBackdrop');
    const modalContent = document.getElementById('globalModalContent');
    if (!modalBackdrop || !modalContent) return;

    const today = new Date().toISOString().split('T')[0];

    modalContent.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-sheet-header">
          <div class="modal-sheet-title">Add Finance Entry</div>
          <button class="btn btn-ghost btn-sm close-modal-btn">&times;</button>
        </div>
        <form id="addFinanceForm" class="modal-sheet-body">
          <div class="form-group">
            <label class="form-label">Transaction Type</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <label style="display: flex; align-items: center; gap: 6px; padding: 10px; border: 1.5px solid var(--border-medium); border-radius: var(--radius-md); cursor: pointer;">
                <input type="radio" name="finType" value="income" ${defaultType === 'income' ? 'checked' : ''}>
                <span style="font-weight: 700; color: var(--success);">+ Income</span>
              </label>
              <label style="display: flex; align-items: center; gap: 6px; padding: 10px; border: 1.5px solid var(--border-medium); border-radius: var(--radius-md); cursor: pointer;">
                <input type="radio" name="finType" value="expense" ${defaultType === 'expense' ? 'checked' : ''}>
                <span style="font-weight: 700; color: var(--danger);">- Expense</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Amount (₹)</label>
            <input type="number" step="any" min="1" required class="form-input" id="finAmount" placeholder="e.g. 5000">
          </div>

          <div class="form-group">
            <label class="form-label">Category</label>
            <select class="form-select" id="finCategory" required>
              ${APP_CONFIG.financeCategories.map((c) => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Description / Narration</label>
            <textarea class="form-textarea" id="finNarration" required placeholder="Enter clear description of this transaction..."></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Date</label>
            <input type="date" class="form-input" id="finDate" required value="${today}">
          </div>

          <div id="finFormError" style="color: var(--danger); font-size: 12px; margin-top: 8px; display: none;"></div>

          <div class="modal-sheet-footer" style="padding: 16px 0 0 0; margin-top: 16px;">
            <button type="button" class="btn btn-outline close-modal-btn">Cancel</button>
            <button type="submit" class="btn btn-primary" id="saveFinBtn">Save Entry</button>
          </div>
        </form>
      </div>
    `;

    modalBackdrop.classList.add('show');

    // Close handlers
    modalContent.querySelectorAll('.close-modal-btn').forEach((b) => {
      b.addEventListener('click', () => modalBackdrop.classList.remove('show'));
    });

    // Form submit
    const form = modalContent.querySelector('#addFinanceForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const type = form.querySelector('input[name="finType"]:checked').value;
      const amount = parseFloat(form.querySelector('#finAmount').value);
      const category = form.querySelector('#finCategory').value;
      const narration = form.querySelector('#finNarration').value.trim();
      const date = form.querySelector('#finDate').value;
      const errEl = form.querySelector('#finFormError');

      if (!amount || amount <= 0) {
        errEl.textContent = 'Please enter a valid amount greater than zero.';
        errEl.style.display = 'block';
        return;
      }

      const newEntry = {
        type,
        amount,
        category,
        narration,
        date,
        createdByUid: user.uid,
        createdByName: user.name
      };

      const added = Storage.add('finance', newEntry, user);

      // Create notification for transaction
      Storage.createNotification({
        type: 'transaction',
        title: `New ${type.toUpperCase()} Entry`,
        message: `${user.name} added ${type === 'income' ? '+' : '-'} ₹${amount.toLocaleString('en-IN')} under ${category} (${narration || 'No narration'})`,
        recipientUids: ['all'],
        targetTab: 'finance',
        targetId: added.id
      });

      modalBackdrop.classList.remove('show');
      window.dispatchEvent(new CustomEvent('pe_show_toast', { detail: { message: 'Finance entry added successfully!', type: 'success' } }));
    });
  },

  // Modal: Admin Edit Entry
  openEditModal(id) {
    if (!Auth.isAdmin()) {
      alert('Only Admin can edit finance records.');
      return;
    }

    const item = Storage.getById('finance', id);
    if (!item) return;

    const modalBackdrop = document.getElementById('globalModalBackdrop');
    const modalContent = document.getElementById('globalModalContent');
    if (!modalBackdrop || !modalContent) return;

    modalContent.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-sheet-header">
          <div class="modal-sheet-title">Edit Finance Entry</div>
          <button class="btn btn-ghost btn-sm close-modal-btn">&times;</button>
        </div>
        <form id="editFinanceForm" class="modal-sheet-body">
          <div class="form-group">
            <label class="form-label">Transaction Type</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <label style="display: flex; align-items: center; gap: 6px; padding: 10px; border: 1.5px solid var(--border-medium); border-radius: var(--radius-md); cursor: pointer;">
                <input type="radio" name="editFinType" value="income" ${item.type === 'income' ? 'checked' : ''}>
                <span style="font-weight: 700; color: var(--success);">+ Income</span>
              </label>
              <label style="display: flex; align-items: center; gap: 6px; padding: 10px; border: 1.5px solid var(--border-medium); border-radius: var(--radius-md); cursor: pointer;">
                <input type="radio" name="editFinType" value="expense" ${item.type === 'expense' ? 'checked' : ''}>
                <span style="font-weight: 700; color: var(--danger);">- Expense</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Amount (₹)</label>
            <input type="number" step="any" min="1" required class="form-input" id="editFinAmount" value="${item.amount}">
          </div>

          <div class="form-group">
            <label class="form-label">Category</label>
            <select class="form-select" id="editFinCategory" required>
              ${APP_CONFIG.financeCategories.map((c) => `<option value="${c}" ${item.category === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Description / Narration</label>
            <textarea class="form-textarea" id="editFinNarration" required>${item.narration || ''}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Date</label>
            <input type="date" class="form-input" id="editFinDate" required value="${item.date || ''}">
          </div>

          <div class="modal-sheet-footer" style="padding: 16px 0 0 0; margin-top: 16px;">
            <button type="button" class="btn btn-outline close-modal-btn">Cancel</button>
            <button type="submit" class="btn btn-primary">Update Entry</button>
          </div>
        </form>
      </div>
    `;

    modalBackdrop.classList.add('show');

    modalContent.querySelectorAll('.close-modal-btn').forEach((b) => {
      b.addEventListener('click', () => modalBackdrop.classList.remove('show'));
    });

    const form = modalContent.querySelector('#editFinanceForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const updates = {
        type: form.querySelector('input[name="editFinType"]:checked').value,
        amount: parseFloat(form.querySelector('#editFinAmount').value),
        category: form.querySelector('#editFinCategory').value,
        narration: form.querySelector('#editFinNarration').value.trim(),
        date: form.querySelector('#editFinDate').value
      };

      Storage.update('finance', id, updates, Auth.getCurrentUser());
      modalBackdrop.classList.remove('show');
      window.dispatchEvent(new CustomEvent('pe_show_toast', { detail: { message: 'Finance entry updated!', type: 'success' } }));
    });
  },

  // Confirmation: Admin Delete Entry
  confirmDelete(id) {
    if (!Auth.isAdmin()) {
      alert('Only Admin can delete finance records.');
      return;
    }

    const item = Storage.getById('finance', id);
    if (!item) return;

    if (confirm(`Are you sure you want to delete this ${item.type} entry of ${this.formatCurrency(item.amount)}?\n\nThis action cannot be undone.`)) {
      Storage.delete('finance', id, Auth.getCurrentUser());
      window.dispatchEvent(new CustomEvent('pe_show_toast', { detail: { message: 'Finance entry deleted.', type: 'info' } }));
    }
  },

  // Export CSV
  exportCsv(items) {
    if (!items || items.length === 0) {
      alert('No finance data to export.');
      return;
    }

    const headers = ['Date', 'Type', 'Amount (INR)', 'Category', 'Narration', 'Created By', 'Created At'];
    const rows = items.map((i) => [
      `"${i.date || ''}"`,
      `"${(i.type || '').toUpperCase()}"`,
      i.amount || 0,
      `"${(i.category || '').replace(/"/g, '""')}"`,
      `"${(i.narration || '').replace(/"/g, '""')}"`,
      `"${(i.createdByName || '').replace(/"/g, '""')}"`,
      `"${i.createdAt || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PlanningEasy_Finance_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // Export PDF Summary Report
  exportPdf(items, totalIncome, totalExpense, netBalance) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to download PDF.');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>PlanningEasy - Finance Statement</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #1e293b; }
          .header { border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; color: #1e3a8a; }
          .meta { font-size: 12px; color: #64748b; margin-top: 4px; }
          .summary-box { display: flex; gap: 15px; margin-bottom: 25px; }
          .card { flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; text-align: center; }
          .label { font-size: 11px; text-transform: uppercase; color: #64748b; }
          .val { font-size: 18px; font-weight: bold; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th { background: #f1f5f9; padding: 8px; text-align: left; border-bottom: 2px solid #cbd5e1; }
          td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
          .income { color: #16a34a; font-weight: bold; }
          .expense { color: #dc2626; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">PlanningEasy - Financial Statement</div>
          <div class="meta">Generated on: ${new Date().toLocaleString()} &bull; Total Transactions: ${items.length}</div>
        </div>

        <div class="summary-box">
          <div class="card">
            <div class="label">Total Income</div>
            <div class="val income">${this.formatCurrency(totalIncome)}</div>
          </div>
          <div class="card">
            <div class="label">Total Expense</div>
            <div class="val expense">${this.formatCurrency(totalExpense)}</div>
          </div>
          <div class="card">
            <div class="label">Net Balance</div>
            <div class="val">${this.formatCurrency(netBalance)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Category</th>
              <th>Narration</th>
              <th>Amount</th>
              <th>Created By</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((i) => `
              <tr>
                <td>${i.date || 'N/A'}</td>
                <td class="${i.type}">${i.type.toUpperCase()}</td>
                <td>${i.category}</td>
                <td>${i.narration}</td>
                <td class="${i.type}">${i.type === 'income' ? '+' : '-'} ${this.formatCurrency(i.amount)}</td>
                <td>${i.createdByName}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  }
};
