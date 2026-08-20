// ==========================================================================
// PLANNINGEASY - ADMIN USER MANAGEMENT MODULE
// Full CRUD control over members, usernames, passwords, roles, positions and statuses.
// ==========================================================================

import { Auth } from './auth.js';
import { Storage } from './storage.js';

export const Users = {
  searchQuery: '',

  render(container) {
    if (!Auth.isAdmin()) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-title">Unauthorized</div></div>`;
      return;
    }

    const allUsers = Storage.getAll('users');
    let filtered = allUsers.filter((u) => {
      if (!this.searchQuery) return true;
      const q = this.searchQuery.toLowerCase();
      const combined = `${u.name || ''} ${u.username || ''} ${u.position || ''} ${u.phone || ''} ${u.role || ''}`.toLowerCase();
      return combined.includes(q);
    });

    container.innerHTML = `
      <div class="users-view">
        <!-- Module Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <div>
            <h2 style="font-size: 18px; font-weight: 800; color: var(--text-main);">User Management</h2>
            <div style="font-size: 12px; color: var(--text-muted);">Manage member accounts, positions & permissions</div>
          </div>
          <button class="btn btn-primary btn-sm" id="openAddMemberBtn">
            <span>+ Add Member</span>
          </button>
        </div>

        <!-- Search Bar -->
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" id="userSearchInput" placeholder="Search by name, username, position, phone..." value="${this.searchQuery}">
        </div>

        <!-- Member Count Header -->
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 10px; font-weight: 600;">
          Total Members: ${allUsers.length} (${allUsers.filter((u) => u.status !== 'disabled').length} active)
        </div>

        <!-- Users List -->
        <div class="users-list">
          ${filtered.map((u) => `
            <div class="card" style="padding: 14px; margin-bottom: 10px; opacity: ${u.status === 'disabled' ? '0.6' : '1'};">
              <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <div style="width: 44px; height: 44px; border-radius: 50%; background: var(--primary-100); color: var(--primary-dark); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 15px; overflow: hidden; flex-shrink: 0;">
                    ${u.photoUrl ? `<img src="${u.photoUrl}" style="width: 100%; height: 100%; object-fit: cover;" alt="${u.name}">` : (u.name || u.username).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                      <span style="font-size: 14.5px; font-weight: 700; color: var(--text-main);">${u.name}</span>
                      <span class="badge ${u.role === 'admin' ? 'badge-admin' : 'badge-member'}">
                        ${u.role.toUpperCase()}
                      </span>
                      ${u.position ? `<span class="badge" style="background: var(--bg-surface); color: var(--primary-dark);">${u.position}</span>` : ''}
                      ${u.status === 'disabled' ? `<span class="badge badge-expense">DISABLED</span>` : ''}
                    </div>
                    <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                      @${u.username} &bull; ${u.phone || 'No phone'}
                    </div>
                    ${u.address ? `<div style="font-size: 11px; color: var(--text-subtle); margin-top: 2px;">📍 ${u.address}</div>` : ''}
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 4px;">
                  <button class="btn btn-ghost btn-sm btn-icon-only edit-user-btn" data-uid="${u.uid}" title="Edit User" style="width: 28px; height: 28px; min-height: 28px;">
                    ✏️
                  </button>
                  <button class="btn btn-ghost btn-sm btn-icon-only reset-pwd-btn" data-uid="${u.uid}" title="Reset Password" style="width: 28px; height: 28px; min-height: 28px;">
                    🔑
                  </button>
                  ${u.uid !== Auth.getCurrentUser().uid ? `
                    <button class="btn btn-ghost btn-sm btn-icon-only toggle-status-btn" data-uid="${u.uid}" title="${u.status === 'disabled' ? 'Enable' : 'Disable'}" style="width: 28px; height: 28px; min-height: 28px;">
                      ${u.status === 'disabled' ? '🟢' : '⏸️'}
                    </button>
                    <button class="btn btn-ghost btn-sm btn-icon-only delete-user-btn" data-uid="${u.uid}" title="Delete User" style="width: 28px; height: 28px; min-height: 28px; color: var(--danger);">
                      🗑️
                    </button>
                  ` : ''}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Event Handlers
    container.querySelector('#openAddMemberBtn')?.addEventListener('click', () => this.openAddModal());

    const searchInput = container.querySelector('#userSearchInput');
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.render(container);
    });

    container.querySelectorAll('.edit-user-btn').forEach((b) => {
      b.addEventListener('click', () => this.openEditModal(b.getAttribute('data-uid')));
    });

    container.querySelectorAll('.reset-pwd-btn').forEach((b) => {
      b.addEventListener('click', () => this.openResetPasswordModal(b.getAttribute('data-uid')));
    });

    container.querySelectorAll('.toggle-status-btn').forEach((b) => {
      b.addEventListener('click', () => {
        const uid = b.getAttribute('data-uid');
        const target = Storage.getById('users', uid);
        if (!target) return;
        const newStatus = target.status === 'disabled' ? 'active' : 'disabled';
        Auth.updateUser(uid, { status: newStatus });
        window.dispatchEvent(new CustomEvent('pe_show_toast', { detail: { message: `Account ${newStatus === 'active' ? 'enabled' : 'disabled'}.`, type: 'info' } }));
        this.render(container);
      });
    });

    container.querySelectorAll('.delete-user-btn').forEach((b) => {
      b.addEventListener('click', () => {
        const uid = b.getAttribute('data-uid');
        const target = Storage.getById('users', uid);
        if (!target) return;
        if (confirm(`Are you sure you want to completely delete member "${target.name}" (@${target.username})?\n\nThis will permanently remove their login access.`)) {
          Auth.deleteUser(uid);
          window.dispatchEvent(new CustomEvent('pe_show_toast', { detail: { message: 'Member removed.', type: 'info' } }));
          this.render(container);
        }
      });
    });
  },

  // Modal: Add Member
  openAddModal() {
    const modalBackdrop = document.getElementById('globalModalBackdrop');
    const modalContent = document.getElementById('globalModalContent');
    if (!modalBackdrop || !modalContent) return;

    modalContent.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-sheet-header">
          <div class="modal-sheet-title">Create Member Account</div>
          <button class="btn btn-ghost btn-sm close-modal-btn">&times;</button>
        </div>
        <form id="addMemberForm" class="modal-sheet-body">
          <div class="form-group">
            <label class="form-label">Full Name</label>
            <input type="text" required class="form-input" id="newMemName" placeholder="e.g. Ramesh Kumar">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div class="form-group">
              <label class="form-label">Username</label>
              <input type="text" required class="form-input" id="newMemUsername" placeholder="e.g. ramesh">
            </div>
            <div class="form-group">
              <label class="form-label">Password</label>
              <input type="password" required minlength="4" class="form-input" id="newMemPassword" placeholder="Initial password">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div class="form-group">
              <label class="form-label">Role</label>
              <select class="form-select" id="newMemRole">
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Position / Designation</label>
              <input type="text" class="form-input" id="newMemPosition" placeholder="e.g. Treasurer, Coordinator">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div class="form-group">
              <label class="form-label">Phone Number</label>
              <input type="tel" class="form-input" id="newMemPhone" placeholder="+91 9876543210">
            </div>
            <div class="form-group">
              <label class="form-label">WhatsApp Number</label>
              <input type="tel" class="form-input" id="newMemWhatsapp" placeholder="+91 9876543210">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Short Address</label>
            <input type="text" class="form-input" id="newMemAddress" placeholder="e.g. Sector 4, Bangalore">
          </div>

          <div id="addMemberError" style="color: var(--danger); font-size: 12px; display: none;"></div>

          <div class="modal-sheet-footer" style="padding: 16px 0 0 0; margin-top: 16px;">
            <button type="button" class="btn btn-outline close-modal-btn">Cancel</button>
            <button type="submit" class="btn btn-primary">Create Account</button>
          </div>
        </form>
      </div>
    `;

    modalBackdrop.classList.add('show');

    modalContent.querySelectorAll('.close-modal-btn').forEach((b) => {
      b.addEventListener('click', () => modalBackdrop.classList.remove('show'));
    });

    const form = modalContent.querySelector('#addMemberForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const errEl = form.querySelector('#addMemberError');
      errEl.style.display = 'none';

      try {
        Auth.createMember({
          name: form.querySelector('#newMemName').value,
          username: form.querySelector('#newMemUsername').value,
          password: form.querySelector('#newMemPassword').value,
          role: form.querySelector('#newMemRole').value,
          position: form.querySelector('#newMemPosition').value,
          phone: form.querySelector('#newMemPhone').value,
          whatsapp: form.querySelector('#newMemWhatsapp').value,
          address: form.querySelector('#newMemAddress').value
        });

        modalBackdrop.classList.remove('show');
        window.dispatchEvent(new CustomEvent('pe_show_toast', { detail: { message: 'Member account created successfully!', type: 'success' } }));
        const main = document.getElementById('mainContent');
        if (main) this.render(main);
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
      }
    });
  },

  // Modal: Edit Member
  openEditModal(uid) {
    const user = Storage.getById('users', uid);
    if (!user) return;

    const modalBackdrop = document.getElementById('globalModalBackdrop');
    const modalContent = document.getElementById('globalModalContent');
    if (!modalBackdrop || !modalContent) return;

    modalContent.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-sheet-header">
          <div class="modal-sheet-title">Edit Member: ${user.name}</div>
          <button class="btn btn-ghost btn-sm close-modal-btn">&times;</button>
        </div>
        <form id="editMemberForm" class="modal-sheet-body">
          <div class="form-group">
            <label class="form-label">Full Name</label>
            <input type="text" required class="form-input" id="editMemName" value="${user.name}">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div class="form-group">
              <label class="form-label">Username</label>
              <input type="text" required class="form-input" id="editMemUsername" value="${user.username}">
            </div>
            <div class="form-group">
              <label class="form-label">Role</label>
              <select class="form-select" id="editMemRole">
                <option value="member" ${user.role === 'member' ? 'selected' : ''}>Member</option>
                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Position / Designation</label>
            <input type="text" class="form-input" id="editMemPosition" value="${user.position || ''}" placeholder="e.g. Treasurer, Coordinator">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div class="form-group">
              <label class="form-label">Phone Number</label>
              <input type="tel" class="form-input" id="editMemPhone" value="${user.phone || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">WhatsApp Number</label>
              <input type="tel" class="form-input" id="editMemWhatsapp" value="${user.whatsapp || ''}">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Short Address</label>
            <input type="text" class="form-input" id="editMemAddress" value="${user.address || ''}">
          </div>

          <div id="editMemberError" style="color: var(--danger); font-size: 12px; display: none;"></div>

          <div class="modal-sheet-footer" style="padding: 16px 0 0 0; margin-top: 16px;">
            <button type="button" class="btn btn-outline close-modal-btn">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    `;

    modalBackdrop.classList.add('show');

    modalContent.querySelectorAll('.close-modal-btn').forEach((b) => {
      b.addEventListener('click', () => modalBackdrop.classList.remove('show'));
    });

    const form = modalContent.querySelector('#editMemberForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const errEl = form.querySelector('#editMemberError');
      errEl.style.display = 'none';

      try {
        Auth.updateUser(uid, {
          name: form.querySelector('#editMemName').value,
          username: form.querySelector('#editMemUsername').value,
          role: form.querySelector('#editMemRole').value,
          position: form.querySelector('#editMemPosition').value,
          phone: form.querySelector('#editMemPhone').value,
          whatsapp: form.querySelector('#editMemWhatsapp').value,
          address: form.querySelector('#editMemAddress').value
        });

        modalBackdrop.classList.remove('show');
        window.dispatchEvent(new CustomEvent('pe_show_toast', { detail: { message: 'Member updated successfully!', type: 'success' } }));
        const main = document.getElementById('mainContent');
        if (main) this.render(main);
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
      }
    });
  },

  // Modal: Reset Password
  openResetPasswordModal(uid) {
    const user = Storage.getById('users', uid);
    if (!user) return;

    const modalBackdrop = document.getElementById('globalModalBackdrop');
    const modalContent = document.getElementById('globalModalContent');
    if (!modalBackdrop || !modalContent) return;

    modalContent.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-sheet-header">
          <div class="modal-sheet-title">Reset Password for @${user.username}</div>
          <button class="btn btn-ghost btn-sm close-modal-btn">&times;</button>
        </div>
        <form id="resetPwdForm" class="modal-sheet-body">
          <div class="form-group">
            <label class="form-label">New Password</label>
            <input type="password" required minlength="4" class="form-input" id="resetPwdInput" placeholder="Enter new password">
            <div class="input-hint">Minimum 4 characters</div>
          </div>

          <div class="modal-sheet-footer" style="padding: 16px 0 0 0; margin-top: 16px;">
            <button type="button" class="btn btn-outline close-modal-btn">Cancel</button>
            <button type="submit" class="btn btn-primary">Set Password</button>
          </div>
        </form>
      </div>
    `;

    modalBackdrop.classList.add('show');

    modalContent.querySelectorAll('.close-modal-btn').forEach((b) => {
      b.addEventListener('click', () => modalBackdrop.classList.remove('show'));
    });

    const form = modalContent.querySelector('#resetPwdForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const newPwd = form.querySelector('#resetPwdInput').value;
      Auth.changePassword(uid, newPwd);
      modalBackdrop.classList.remove('show');
      window.dispatchEvent(new CustomEvent('pe_show_toast', { detail: { message: `Password updated for @${user.username}`, type: 'success' } }));
    });
  }
};
