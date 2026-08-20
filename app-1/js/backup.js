// ==========================================================================
// PLANNINGEASY - BACKUP & RESTORE UTILITY (ADMIN ONLY)
// Safe export without plain passwords, plus secure restore with confirmations.
// ==========================================================================

import { Auth } from './auth.js';
import { Storage } from './storage.js';

export const Backup = {
  render(container) {
    if (!Auth.isAdmin()) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-title">Unauthorized</div></div>`;
      return;
    }

    const finCount = Storage.getAll('finance').length;
    const repCount = Storage.getAll('reports').length;
    const tskCount = Storage.getAll('tasks').length;
    const usrCount = Storage.getAll('users').length;

    container.innerHTML = `
      <div class="backup-view">
        <div style="margin-bottom: 14px;">
          <h2 style="font-size: 18px; font-weight: 800; color: var(--text-main);">Data Backup & Restore</h2>
          <div style="font-size: 12px; color: var(--text-muted);">Securely backup your organization's entire data</div>
        </div>

        <!-- Backup Card -->
        <div class="card" style="margin-bottom: 14px;">
          <div class="card-title" style="margin-bottom: 6px;">📥 Download Backup</div>
          <div style="font-size: 13px; color: var(--text-muted); line-height: 1.4; margin-bottom: 12px;">
            Export a full JSON snapshot containing:
            <ul style="margin: 6px 0 6px 18px;">
              <li><b>${usrCount}</b> Members (credentials protected)</li>
              <li><b>${finCount}</b> Finance entries</li>
              <li><b>${repCount}</b> Reports</li>
              <li><b>${tskCount}</b> Tasks & assignments</li>
            </ul>
          </div>
          <button class="btn btn-primary btn-block" id="downloadBackupBtn">
            <span>💾 Download Backup (JSON)</span>
          </button>
        </div>

        <!-- Restore Card -->
        <div class="card" style="border: 1px dashed var(--danger);">
          <div class="card-title" style="color: var(--danger); margin-bottom: 6px;">⚠️ Restore From Backup</div>
          <div style="font-size: 13px; color: var(--text-muted); line-height: 1.4; margin-bottom: 12px;">
            Restoring will replace existing finance records, reports, tasks, and logs with the data from the selected backup file.
          </div>
          <input type="file" id="restoreFileInput" accept=".json" style="display: none;">
          <button class="btn btn-danger btn-block" id="triggerRestoreBtn">
            <span>🔄 Select Backup File to Restore</span>
          </button>
        </div>
      </div>
    `;

    // Download Backup
    container.querySelector('#downloadBackupBtn')?.addEventListener('click', () => {
      const backupData = Storage.createBackup();
      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PlanningEasy_Backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      window.dispatchEvent(new CustomEvent('pe_show_toast', { detail: { message: 'Backup file generated and downloaded!', type: 'success' } }));
    });

    // Trigger Restore
    const fileInput = container.querySelector('#restoreFileInput');
    container.querySelector('#triggerRestoreBtn')?.addEventListener('click', () => fileInput.click());

    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        try {
          const parsed = JSON.parse(loadEvt.target.result);
          if (!parsed.data) throw new Error('Invalid backup file structure.');

          const confirmText = `CRITICAL WARNING:\n\nAre you sure you want to restore data from backup?\n\nBackup Date: ${parsed.exportedAt || 'Unknown'}\nFinance records: ${parsed.data.finance?.length || 0}\nReports: ${parsed.data.reports?.length || 0}\nTasks: ${parsed.data.tasks?.length || 0}\n\nExisting records will be updated. Type OK to confirm.`;

          const answer = prompt(confirmText, '');
          if (answer && answer.toUpperCase() === 'OK') {
            Storage.restoreBackup(parsed, Auth.getCurrentUser());
            alert('Database restored successfully!');
            window.location.reload();
          } else {
            alert('Restore cancelled.');
          }
        } catch (err) {
          alert('Error parsing backup file: ' + err.message);
        }
      };
      reader.readAsText(file);
    });
  }
};
