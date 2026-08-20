// ==========================================================================
// PLANNINGEASY - REPORT MANAGEMENT MODULE
// STRICT: NO "Pending / Not Pending" classification (Explicitly forbidden)
// Permissions: Admin & Member ADD/VIEW. ONLY Admin EDIT/DELETE.
// ==========================================================================

import { Auth } from './auth.js';
import { Storage } from './storage.js';

export const Reports = {
  searchQuery: '',

  render(container) {
    const user = Auth.getCurrentUser();
    if (!user) return;

    const allReports = Storage.getAll('reports');

    // Filter by search
    let filtered = allReports.filter((r) => {
      if (!this.searchQuery) return true;
      const q = this.searchQuery.toLowerCase();
      const combined = `${r.title || ''} ${r.content || ''} ${r.authorName || ''} ${r.date || ''}`.toLowerCase();
      return combined.includes(q);
    });

    // Sort by date descending
    filtered.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

    container.innerHTML = `
      <div class="reports-view">
        <!-- Module Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <div>
            <h2 style="font-size: 18px; font-weight: 800; color: var(--text-main);">Reports</h2>
            <div style="font-size: 12px; color: var(--text-muted);">Organizational updates, audits & minutes</div>
          </div>
          <button class="btn btn-primary btn-sm" id="openAddReportBtn">
            <span>+ Add Report</span>
          </button>
        </div>

        <!-- Search Box -->
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" id="reportSearchInput" placeholder="Search reports by title, content, author, date..." value="${this.searchQuery}">
        </div>

        <!-- Report Count Info -->
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 10px; font-weight: 600;">
          Showing ${filtered.length} of ${allReports.length} reports
        </div>

        <!-- Reports List -->
        <div class="reports-list">
          ${filtered.length === 0 ? `
            <div class="empty-state">
              <div class="empty-state-icon">📋</div>
              <div class="empty-state-title">No reports found</div>
              <div class="empty-state-text">No reports match your current search criteria.</div>
              <button class="btn btn-primary btn-sm" id="emptyAddReportBtn">+ Create Report</button>
            </div>
          ` : `
            <div>
              ${filtered.map((r) => `
                <div class="card card-clickable report-card-item" data-id="${r.id}" style="padding: 14px; margin-bottom: 10px;">
                  <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
                    <div style="flex: 1; min-width: 0;">
                      <div class="card-title" style="font-size: 15px; margin-bottom: 4px;">${r.title}</div>
                      <div class="text-muted" style="font-size: 12px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                        <span>📅 ${r.date || 'N/A'}</span>
                        <span>&bull; Author: <b>${r.authorName || 'Unknown'}</b></span>
                      </div>
                      <div style="font-size: 13px; color: var(--text-muted); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                        ${r.content}
                      </div>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                      <span class="badge" style="background: var(--primary-50); color: var(--primary); font-size: 11px;">View Full</span>
                      ${Auth.isAdmin() ? `
                        <div class="flex items-center gap-1" onclick="event.stopPropagation();">
                          <button class="btn btn-ghost btn-sm btn-icon-only edit-report-btn" data-id="${r.id}" title="Edit Report" style="width: 26px; height: 26px; min-height: 26px;">
                            ✏️
                          </button>
                          <button class="btn btn-ghost btn-sm btn-icon-only delete-report-btn" data-id="${r.id}" title="Delete Report" style="width: 26px; height: 26px; min-height: 26px; color: var(--danger);">
                            🗑️
                          </button>
                        </div>
                      ` : ''}
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;

    // Event Handlers
    container.querySelector('#openAddReportBtn')?.addEventListener('click', () => this.openAddModal());
    container.querySelector('#emptyAddReportBtn')?.addEventListener('click', () => this.openAddModal());

    const searchInput = container.querySelector('#reportSearchInput');
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.render(container);
    });

    container.querySelectorAll('.report-card-item').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-id');
        this.openDetailModal(id);
      });
    });

    if (Auth.isAdmin()) {
      container.querySelectorAll('.edit-report-btn').forEach((b) => {
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = b.getAttribute('data-id');
          this.openEditModal(id);
        });
      });

      container.querySelectorAll('.delete-report-btn').forEach((b) => {
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = b.getAttribute('data-id');
          this.confirmDelete(id);
        });
      });
    }
  },

  // Modal: Add Report
  openAddModal() {
    const user = Auth.getCurrentUser();
    if (!user) return;

    const modalBackdrop = document.getElementById('globalModalBackdrop');
    const modalContent = document.getElementById('globalModalContent');
    if (!modalBackdrop || !modalContent) return;

    const today = new Date().toISOString().split('T')[0];

    modalContent.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-sheet-header">
          <div class="modal-sheet-title">Create New Report</div>
          <button class="btn btn-ghost btn-sm close-modal-btn">&times;</button>
        </div>
        <form id="addReportForm" class="modal-sheet-body">
          <div class="form-group">
            <label class="form-label">Report Title</label>
            <input type="text" required class="form-input" id="repTitle" placeholder="e.g. Monthly Operations Overview">
          </div>

          <div class="form-group">
            <label class="form-label">Date</label>
            <input type="date" required class="form-input" id="repDate" value="${today}">
          </div>

          <div class="form-group">
            <label class="form-label">Report Content / Narration</label>
            <textarea required class="form-textarea" id="repContent" style="min-height: 140px;" placeholder="Write complete detailed report here..."></textarea>
          </div>

          <div class="modal-sheet-footer" style="padding: 16px 0 0 0; margin-top: 16px;">
            <button type="button" class="btn btn-outline close-modal-btn">Cancel</button>
            <button type="submit" class="btn btn-primary">Publish Report</button>
          </div>
        </form>
      </div>
    `;

    modalBackdrop.classList.add('show');

    modalContent.querySelectorAll('.close-modal-btn').forEach((b) => {
      b.addEventListener('click', () => modalBackdrop.classList.remove('show'));
    });

    const form = modalContent.querySelector('#addReportForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = form.querySelector('#repTitle').value.trim();
      const date = form.querySelector('#repDate').value;
      const content = form.querySelector('#repContent').value.trim();

      const newReport = {
        title,
        date,
        content,
        authorUid: user.uid,
        authorName: user.name
      };

      const added = Storage.add('reports', newReport, user);

      // Create notification for all members
      Storage.createNotification({
        type: 'report',
        title: 'New Report Published',
        message: `${user.name} published: "${title}"`,
        recipientUids: ['all'],
        targetTab: 'reports',
        targetId: added.id
      });

      modalBackdrop.classList.remove('show');
      window.dispatchEvent(new CustomEvent('pe_show_toast', { detail: { message: 'Report submitted successfully!', type: 'success' } }));
    });
  },

  // Modal: View Full Report
  openDetailModal(id) {
    const report = Storage.getById('reports', id);
    if (!report) return;

    const modalBackdrop = document.getElementById('globalModalBackdrop');
    const modalContent = document.getElementById('globalModalContent');
    if (!modalBackdrop || !modalContent) return;

    modalContent.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-sheet-header">
          <div class="modal-sheet-title">Report Details</div>
          <button class="btn btn-ghost btn-sm close-modal-btn">&times;</button>
        </div>
        <div class="modal-sheet-body">
          <div class="report-detail-view">
            <div class="report-detail-header">
              <div class="report-detail-title">${report.title}</div>
              <div class="report-detail-meta">
                <span>📅 Date: <b>${report.date || 'N/A'}</b></span>
                <span>👤 Author: <b>${report.authorName || 'Unknown'}</b></span>
              </div>
            </div>
            <div class="report-detail-content">${report.content}</div>
          </div>
        </div>
        <div class="modal-sheet-footer">
          <button class="btn btn-outline" id="exportSingleReportPdfBtn">
            📄 Export PDF
          </button>
          <button class="btn btn-primary close-modal-btn">Close</button>
        </div>
      </div>
    `;

    modalBackdrop.classList.add('show');

    modalContent.querySelectorAll('.close-modal-btn').forEach((b) => {
      b.addEventListener('click', () => modalBackdrop.classList.remove('show'));
    });

    modalContent.querySelector('#exportSingleReportPdfBtn')?.addEventListener('click', () => {
      this.exportSingleReportPdf(report);
    });
  },

  // Modal: Admin Edit Report
  openEditModal(id) {
    if (!Auth.isAdmin()) {
      alert('Only Admin can edit reports.');
      return;
    }

    const report = Storage.getById('reports', id);
    if (!report) return;

    const modalBackdrop = document.getElementById('globalModalBackdrop');
    const modalContent = document.getElementById('globalModalContent');
    if (!modalBackdrop || !modalContent) return;

    modalContent.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-sheet-header">
          <div class="modal-sheet-title">Edit Report</div>
          <button class="btn btn-ghost btn-sm close-modal-btn">&times;</button>
        </div>
        <form id="editReportForm" class="modal-sheet-body">
          <div class="form-group">
            <label class="form-label">Report Title</label>
            <input type="text" required class="form-input" id="editRepTitle" value="${report.title}">
          </div>

          <div class="form-group">
            <label class="form-label">Date</label>
            <input type="date" required class="form-input" id="editRepDate" value="${report.date || ''}">
          </div>

          <div class="form-group">
            <label class="form-label">Report Content</label>
            <textarea required class="form-textarea" id="editRepContent" style="min-height: 140px;">${report.content || ''}</textarea>
          </div>

          <div class="modal-sheet-footer" style="padding: 16px 0 0 0; margin-top: 16px;">
            <button type="button" class="btn btn-outline close-modal-btn">Cancel</button>
            <button type="submit" class="btn btn-primary">Update Report</button>
          </div>
        </form>
      </div>
    `;

    modalBackdrop.classList.add('show');

    modalContent.querySelectorAll('.close-modal-btn').forEach((b) => {
      b.addEventListener('click', () => modalBackdrop.classList.remove('show'));
    });

    const form = modalContent.querySelector('#editReportForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const updates = {
        title: form.querySelector('#editRepTitle').value.trim(),
        date: form.querySelector('#editRepDate').value,
        content: form.querySelector('#editRepContent').value.trim()
      };

      Storage.update('reports', id, updates, Auth.getCurrentUser());
      modalBackdrop.classList.remove('show');
      window.dispatchEvent(new CustomEvent('pe_show_toast', { detail: { message: 'Report updated successfully!', type: 'success' } }));
    });
  },

  // Confirmation: Admin Delete Report
  confirmDelete(id) {
    if (!Auth.isAdmin()) {
      alert('Only Admin can delete reports.');
      return;
    }

    const report = Storage.getById('reports', id);
    if (!report) return;

    if (confirm(`Are you sure you want to delete the report "${report.title}"?\n\nThis action cannot be undone.`)) {
      Storage.delete('reports', id, Auth.getCurrentUser());
      window.dispatchEvent(new CustomEvent('pe_show_toast', { detail: { message: 'Report deleted.', type: 'info' } }));
    }
  },

  // Export Single Report PDF
  exportSingleReportPdf(report) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to download PDF.');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Report - ${report.title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 30px; color: #0f172a; line-height: 1.6; }
          .header { border-bottom: 2px solid #1e40af; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; color: #1e3a8a; }
          .meta { font-size: 13px; color: #64748b; margin-top: 6px; }
          .content { font-size: 15px; margin-top: 20px; white-space: pre-wrap; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${report.title}</div>
          <div class="meta">
            <b>Date:</b> ${report.date || 'N/A'} &bull; 
            <b>Author:</b> ${report.authorName || 'Unknown'} &bull;
            <b>Exported:</b> ${new Date().toLocaleString()}
          </div>
        </div>
        <div class="content">${report.content}</div>
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
