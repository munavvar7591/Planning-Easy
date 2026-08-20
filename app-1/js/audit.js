// ==========================================================================
// PLANNINGEASY - AUDIT LOG VIEWER (ADMIN ONLY)
// Chronological tracking of all user actions, finance/report/task changes.
// ==========================================================================

import { Auth } from './auth.js';
import { Storage } from './storage.js';

export const Audit = {
  searchQuery: '',

  render(container) {
    if (!Auth.isAdmin()) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-title">Unauthorized</div></div>`;
      return;
    }

    const logs = Storage.getAll('auditLogs');
    let filtered = logs.filter((l) => {
      if (!this.searchQuery) return true;
      const q = this.searchQuery.toLowerCase();
      const combined = `${l.action || ''} ${l.description || ''} ${l.actorName || ''}`.toLowerCase();
      return combined.includes(q);
    });

    container.innerHTML = `
      <div class="audit-view">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <div>
            <h2 style="font-size: 18px; font-weight: 800; color: var(--text-main);">Audit Trail</h2>
            <div style="font-size: 12px; color: var(--text-muted);">Immutable activity and security logs</div>
          </div>
          <button class="btn btn-outline btn-sm" id="exportAuditCsvBtn">
            📥 Export CSV
          </button>
        </div>

        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" id="auditSearchInput" placeholder="Filter audit logs..." value="${this.searchQuery}">
        </div>

        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 10px; font-weight: 600;">
          Showing ${filtered.length} log entries
        </div>

        <div class="audit-list">
          ${filtered.length === 0 ? `
            <div class="empty-state">
              <div class="empty-state-title">No audit logs found</div>
            </div>
          ` : `
            <div>
              ${filtered.map((log) => `
                <div class="card" style="padding: 10px 14px; margin-bottom: 8px;">
                  <div style="display: flex; align-items: center; justify-content: space-between;">
                    <span class="badge" style="background: var(--bg-surface); color: var(--primary-dark); font-size: 10px;">
                      ${log.action}
                    </span>
                    <span style="font-size: 11px; color: var(--text-muted);">
                      ${new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div style="font-size: 13px; font-weight: 600; color: var(--text-main); margin-top: 6px;">
                    ${log.description}
                  </div>
                  <div style="font-size: 11px; color: var(--text-muted); margin-top: 3px;">
                    Actor: <b>${log.actorName}</b> (${log.actorRole})
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;

    // Search
    const searchInput = container.querySelector('#auditSearchInput');
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.render(container);
    });

    // Export CSV
    container.querySelector('#exportAuditCsvBtn')?.addEventListener('click', () => {
      if (filtered.length === 0) return;
      const headers = ['Timestamp', 'Action', 'Description', 'Actor Name', 'Actor Role', 'Target Collection', 'Target ID'];
      const rows = filtered.map((l) => [
        `"${l.timestamp || ''}"`,
        `"${l.action || ''}"`,
        `"${(l.description || '').replace(/"/g, '""')}"`,
        `"${(l.actorName || '').replace(/"/g, '""')}"`,
        `"${l.actorRole || ''}"`,
        `"${l.targetCollection || ''}"`,
        `"${l.targetId || ''}"`
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `PlanningEasy_Audit_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }
};
