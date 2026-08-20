// ==========================================================================
// PLANNINGEASY - DASHBOARD / HOME MODULE
// Default Period: THIS YEAR (Strict Requirement)
// Features: Finance Summaries, Reports Snapshot, Member Task Visibility & Status Updates
// ==========================================================================

import { Auth } from './auth.js';
import { Storage } from './storage.js';
import { Navigation } from './navigation.js';
import { APP_CONFIG } from './config.js';

export const Dashboard = {
  currentPeriod: 'this_year', // DEFAULT: 'this_year' | 'month' | 'week'

  formatCurrency(amount) {
    return `${APP_CONFIG.currencySymbol} ${Number(amount || 0).toLocaleString('en-IN')}`;
  },

  getDateRange(period) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    if (period === 'week') {
      const startOfWeek = new Date(now);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);
      return { start: startOfWeek, end: now };
    } else if (period === 'month') {
      const startOfMonth = new Date(currentYear, currentMonth, 1);
      return { start: startOfMonth, end: now };
    } else {
      // Default: 'this_year'
      const startOfYear = new Date(currentYear, 0, 1);
      return { start: startOfYear, end: now };
    }
  },

  filterByPeriod(items, period) {
    const { start } = this.getDateRange(period);
    const startTime = start.getTime();
    return items.filter((item) => {
      const itemTime = new Date(item.date || item.createdAt || item.timestamp).getTime();
      return itemTime >= startTime;
    });
  },

  render(container) {
    const user = Auth.getCurrentUser();
    if (!user) return;

    const allFinance = Storage.getAll('finance');
    const allReports = Storage.getAll('reports');
    const allTasks = Storage.getAll('tasks');
    const allLogs = Storage.getAll('auditLogs');

    // Filter finance by current period
    const filteredFinance = this.filterByPeriod(allFinance, this.currentPeriod);
    const totalIncome = filteredFinance
      .filter((f) => f.type === 'income')
      .reduce((sum, f) => sum + Number(f.amount || 0), 0);
    const totalExpense = filteredFinance
      .filter((f) => f.type === 'expense')
      .reduce((sum, f) => sum + Number(f.amount || 0), 0);
    const netBalance = totalIncome - totalExpense;

    // Filter tasks
    const relevantTasks = Auth.isAdmin()
      ? allTasks
      : allTasks.filter((t) => t.assignedToUid === user.uid);
    const pendingTasks = relevantTasks.filter((t) => (t.status || 'pending') === 'pending').length;
    const inProgressTasks = relevantTasks.filter((t) => t.status === 'in_progress').length;
    const completedTasks = relevantTasks.filter((t) => t.status === 'completed').length;

    const periodLabel = this.currentPeriod === 'this_year' ? 'This Year' : (this.currentPeriod === 'month' ? 'This Month' : 'This Week');

    container.innerHTML = `
      <div class="dashboard-view">
        <!-- Welcome Header Banner -->
        <div class="card" style="background: linear-gradient(135deg, #1e3a8a, #2563eb); color: #ffffff; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-size: 12px; opacity: 0.85; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Welcome Back</div>
              <div style="font-size: 19px; font-weight: 800; margin-top: 2px;">${user.name}</div>
              <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px; flex-wrap: wrap;">
                <span style="text-transform: capitalize; font-weight: 700; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 9999px; font-size: 12px;">
                  ${user.role}
                </span>
                ${user.position ? `
                  <span style="font-weight: 700; background: rgba(255,255,255,0.3); padding: 2px 8px; border-radius: 9999px; font-size: 12px;">
                    🎖️ ${user.position}
                  </span>
                ` : ''}
              </div>
            </div>
            <div style="width: 50px; height: 50px; border-radius: 50%; background: rgba(255,255,255,0.2); overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; border: 2px solid rgba(255,255,255,0.4);">
              ${user.photoUrl ? `<img src="${user.photoUrl}" style="width: 100%; height: 100%; object-fit: cover;" alt="Avatar">` : (user.name || user.username).charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        <!-- Dashboard Period Selector (Default: THIS YEAR) -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
          <div style="font-size: 14px; font-weight: 700; color: var(--text-main);">Dashboard Period</div>
          <div class="chip-group" style="margin-bottom: 0;">
            <button class="chip ${this.currentPeriod === 'this_year' ? 'active' : ''}" data-period="this_year">This Year</button>
            <button class="chip ${this.currentPeriod === 'month' ? 'active' : ''}" data-period="month">Month</button>
            <button class="chip ${this.currentPeriod === 'week' ? 'active' : ''}" data-period="week">Week</button>
          </div>
        </div>

        <!-- Finance Summary Numbers (STRICTLY NO CHARTS) -->
        <div class="summary-grid">
          <div class="summary-card income">
            <div class="summary-label">Income</div>
            <div class="summary-val income-val">${this.formatCurrency(totalIncome)}</div>
          </div>
          <div class="summary-card expense">
            <div class="summary-label">Expense</div>
            <div class="summary-val expense-val">${this.formatCurrency(totalExpense)}</div>
          </div>
          <div class="summary-card balance">
            <div class="summary-label">Balance</div>
            <div class="summary-val balance-val" style="color: ${netBalance >= 0 ? 'var(--primary-dark)' : 'var(--danger)'};">
              ${this.formatCurrency(netBalance)}
            </div>
          </div>
        </div>

        <!-- Quick Action Shortcuts -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;">
          <button class="btn btn-outline btn-sm" id="dashAddIncomeBtn" style="justify-content: flex-start;">
            <span style="color: var(--success); font-weight: 800; font-size: 16px;">+</span> Add Income
          </button>
          <button class="btn btn-outline btn-sm" id="dashAddExpenseBtn" style="justify-content: flex-start;">
            <span style="color: var(--danger); font-weight: 800; font-size: 16px;">-</span> Add Expense
          </button>
          <button class="btn btn-outline btn-sm" id="dashAddReportBtn" style="justify-content: flex-start;">
            <span style="color: var(--primary); font-weight: 800; font-size: 14px;">📝</span> Add Report
          </button>
          <button class="btn btn-outline btn-sm" id="dashOpenChatBtn" style="justify-content: flex-start;">
            <span style="color: var(--accent); font-weight: 800; font-size: 14px;">💬</span> Open Chat
          </button>
        </div>

        <!-- Tasks Overview Card -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">${Auth.isAdmin() ? 'Tasks Overview' : 'My Assigned Tasks'}</div>
              <div class="card-subtitle">${relevantTasks.length} tasks assigned</div>
            </div>
            ${Auth.isAdmin() ? `<button class="btn btn-ghost btn-sm" id="dashViewTasksBtn">Manage &rarr;</button>` : ''}
          </div>
          
          <div style="display: flex; gap: 8px; margin-bottom: 12px;">
            <div style="flex: 1; background: var(--bg-surface); padding: 8px; border-radius: 8px; text-align: center;">
              <div style="font-size: 11px; color: var(--text-muted); font-weight: 600;">Pending</div>
              <div style="font-size: 16px; font-weight: 800; color: var(--primary);">${pendingTasks}</div>
            </div>
            <div style="flex: 1; background: var(--warning-bg); padding: 8px; border-radius: 8px; text-align: center;">
              <div style="font-size: 11px; color: var(--warning); font-weight: 600;">In Progress</div>
              <div style="font-size: 16px; font-weight: 800; color: var(--warning);">${inProgressTasks}</div>
            </div>
            <div style="flex: 1; background: var(--success-bg); padding: 8px; border-radius: 8px; text-align: center;">
              <div style="font-size: 11px; color: var(--success); font-weight: 600;">Completed</div>
              <div style="font-size: 16px; font-weight: 800; color: var(--success);">${completedTasks}</div>
            </div>
          </div>

          <!-- Member Task Visibility & Immediate Status Updating -->
          ${relevantTasks.length === 0 ? `
            <div class="text-muted" style="font-size: 13px; text-align: center; padding: 8px 0;">No tasks assigned currently.</div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${relevantTasks.slice(0, 5).map((t) => {
                const status = t.status || 'pending';
                return `
                  <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 10px 12px;">
                    <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 6px;">
                      <div>
                        <div style="font-size: 13.5px; font-weight: 700; color: var(--text-main);">${t.title}</div>
                        ${t.description ? `<div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">${t.description}</div>` : ''}
                        <div style="font-size: 11px; color: var(--text-subtle); margin-top: 4px;">
                          📅 Due: ${t.dueDate || 'No deadline'} &bull; Priority: <b style="text-transform: capitalize;">${t.priority || 'Normal'}</b>
                        </div>
                      </div>
                      <div>
                        <select class="task-status-select dash-update-task-status" data-id="${t.id}">
                          <option value="pending" ${status === 'pending' ? 'selected' : ''}>Pending</option>
                          <option value="in_progress" ${status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                          <option value="completed" ${status === 'completed' ? 'selected' : ''}>Completed</option>
                        </select>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- Recent Reports Card -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Recent Reports</div>
              <div class="card-subtitle">${allReports.length} reports logged</div>
            </div>
            <button class="btn btn-ghost btn-sm" id="dashViewReportsBtn">View All &rarr;</button>
          </div>
          ${allReports.length === 0 ? `
            <div class="text-muted" style="font-size: 13px; text-align: center; padding: 12px 0;">No reports available yet.</div>
          ` : `
            <div>
              ${allReports.slice(0, 3).map((r) => `
                <div class="list-item card-clickable" data-report-id="${r.id}" style="padding: 10px 12px; margin-bottom: 6px;">
                  <div class="list-item-main">
                    <div class="list-item-title">${r.title}</div>
                    <div class="list-item-meta">By ${r.authorName} &bull; ${r.date}</div>
                  </div>
                  <div style="color: var(--text-subtle);">&rsaquo;</div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        ${Auth.isAdmin() ? `
          <!-- Recent Activity (Admin Only) -->
          <div class="card">
            <div class="card-header">
              <div>
                <div class="card-title">Recent Activity</div>
                <div class="card-subtitle">System audit trail</div>
              </div>
              <button class="btn btn-ghost btn-sm" id="dashViewAuditBtn">Audit Log &rarr;</button>
            </div>
            ${allLogs.length === 0 ? `
              <div class="text-muted" style="font-size: 13px; text-align: center; padding: 12px 0;">No activities recorded yet.</div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 8px;">
                ${allLogs.slice(0, 3).map((log) => `
                  <div style="font-size: 12px; border-left: 2px solid var(--primary-light); padding-left: 8px;">
                    <div style="font-weight: 600; color: var(--text-main);">${log.description}</div>
                    <div style="color: var(--text-muted); font-size: 10px; margin-top: 2px;">
                      ${log.actorName} &bull; ${new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        ` : ''}
      </div>
    `;

    // Attach Period Change Events
    container.querySelectorAll('.chip[data-period]').forEach((chip) => {
      chip.addEventListener('click', () => {
        this.currentPeriod = chip.getAttribute('data-period');
        this.render(container);
      });
    });

    // Task status updater directly from dashboard
    container.querySelectorAll('.dash-update-task-status').forEach((sel) => {
      sel.addEventListener('change', (e) => {
        const id = sel.getAttribute('data-id');
        const newStatus = e.target.value;
        const task = Storage.getById('tasks', id);

        Storage.update('tasks', id, { status: newStatus }, Auth.getCurrentUser());

        // Notify Admin of member's status update
        const admins = Storage.getAll('users').filter((u) => u.role === 'admin').map((u) => u.uid);
        Storage.createNotification({
          type: 'task_status',
          title: 'Task Status Updated',
          message: `${user.name} changed task "${task?.title || 'Task'}" to ${newStatus.replace('_', ' ')}`,
          recipientUids: admins,
          targetTab: 'tasks',
          targetId: id
        });

        window.dispatchEvent(new CustomEvent('pe_show_toast', { detail: { message: `Task status updated to ${newStatus.replace('_', ' ')}`, type: 'info' } }));
      });
    });

    // Quick Action Handlers
    container.querySelector('#dashAddIncomeBtn')?.addEventListener('click', () => {
      Navigation.setTab('finance');
      window.dispatchEvent(new CustomEvent('pe_open_add_finance', { detail: { type: 'income' } }));
    });

    container.querySelector('#dashAddExpenseBtn')?.addEventListener('click', () => {
      Navigation.setTab('finance');
      window.dispatchEvent(new CustomEvent('pe_open_add_finance', { detail: { type: 'expense' } }));
    });

    container.querySelector('#dashAddReportBtn')?.addEventListener('click', () => {
      Navigation.setTab('reports');
      window.dispatchEvent(new CustomEvent('pe_open_add_report'));
    });

    container.querySelector('#dashOpenChatBtn')?.addEventListener('click', () => {
      Navigation.setTab('chat');
    });

    container.querySelector('#dashViewReportsBtn')?.addEventListener('click', () => {
      Navigation.setTab('reports');
    });

    container.querySelector('#dashViewTasksBtn')?.addEventListener('click', () => {
      Navigation.setTab('tasks');
    });

    container.querySelector('#dashViewAuditBtn')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('pe_open_audit_modal'));
    });

    container.querySelectorAll('[data-report-id]').forEach((el) => {
      el.addEventListener('click', () => {
        const repId = el.getAttribute('data-report-id');
        window.dispatchEvent(new CustomEvent('pe_open_report_detail', { detail: { reportId: repId } }));
      });
    });
  }
};
