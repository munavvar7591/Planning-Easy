// ==========================================================================
// PLANNINGEASY - PROFILE & SETTINGS MODAL (ENHANCED)
// Features: Profile photo upload/change/remove with compression,
// Position/Designation display & edit, Contact updates, Password change, Logout.
// ==========================================================================

import { Auth } from './auth.js';
import { Storage } from './storage.js';
import { Users } from './users.js';
import { Backup } from './backup.js';
import { Audit } from './audit.js';

export const Profile = {
  // Client-side image compression using Canvas
  compressImage(file, maxWidth = 256, maxHeight = 256) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement('canvas');
          let width = image.width;
          let height = image.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(image, 0, 0, width, height);

          // Get compressed data URL
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        };
        image.onerror = reject;
        image.src = readerEvent.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  openModal() {
    const user = Auth.getCurrentUser();
    if (!user) return;

    const modalBackdrop = document.getElementById('globalModalBackdrop');
    const modalContent = document.getElementById('globalModalContent');
    if (!modalBackdrop || !modalContent) return;

    modalContent.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-sheet-header">
          <div class="modal-sheet-title">My Profile & Settings</div>
          <button class="btn btn-ghost btn-sm close-modal-btn">&times;</button>
        </div>
        <div class="modal-sheet-body">
          <!-- Profile Card Header with Avatar & Photo Upload -->
          <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 20px; padding: 14px; background: var(--bg-surface); border-radius: var(--radius-lg);">
            <div style="position: relative;">
              <div id="profilePhotoDisplay" style="width: 60px; height: 60px; border-radius: 50%; background: var(--primary); color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800; overflow: hidden; border: 2px solid var(--primary-100);">
                ${user.photoUrl ? `<img src="${user.photoUrl}" style="width: 100%; height: 100%; object-fit: cover;" alt="${user.name}">` : (user.name || user.username).charAt(0).toUpperCase()}
              </div>
              <input type="file" id="profilePhotoFileInput" accept="image/*" style="display: none;">
            </div>

            <div style="flex: 1;">
              <div style="font-size: 17px; font-weight: 800; color: var(--text-main);">${user.name}</div>
              <div style="font-size: 13px; color: var(--text-muted);">
                @${user.username} &bull; <span style="text-transform: capitalize; font-weight: 700;">${user.role}</span>
              </div>
              ${user.position ? `
                <div style="margin-top: 3px;">
                  <span class="badge" style="background: var(--primary-100); color: var(--primary-dark); font-size: 11px;">
                    🎖️ ${user.position}
                  </span>
                </div>
              ` : ''}
              
              <div style="display: flex; gap: 8px; margin-top: 8px;">
                <button class="btn btn-primary btn-sm" id="changePhotoBtn" style="padding: 4px 10px; font-size: 11px;">
                  📷 ${user.photoUrl ? 'Change Photo' : 'Add Photo'}
                </button>
                ${user.photoUrl ? `
                  <button class="btn btn-ghost btn-sm" id="removePhotoBtn" style="padding: 4px 8px; font-size: 11px; color: var(--danger);">
                    Remove
                  </button>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- Position / Designation Form -->
          <form id="profilePositionForm" class="card" style="margin-bottom: 16px;">
            <div class="card-title" style="margin-bottom: 8px; font-size: 14px;">Position / Designation</div>
            <div class="form-group" style="margin-bottom: 10px;">
              <input type="text" class="form-input" id="profPositionInput" value="${user.position || ''}" placeholder="e.g. President, Secretary, Treasurer, Coordinator">
              <div class="input-hint">Specify your role in the organization/committee</div>
            </div>
            <button type="submit" class="btn btn-outline btn-sm btn-block">Update Position</button>
          </form>

          <!-- Contact Details Form -->
          <form id="profileDetailsForm" class="card" style="margin-bottom: 16px;">
            <div class="card-title" style="margin-bottom: 12px; font-size: 14px;">Contact Information</div>
            
            <div class="form-group">
              <label class="form-label">Phone Number</label>
              <input type="tel" class="form-input" id="profPhone" value="${user.phone || ''}">
            </div>

            <div class="form-group">
              <label class="form-label">WhatsApp Number</label>
              <input type="tel" class="form-input" id="profWhatsapp" value="${user.whatsapp || ''}">
            </div>

            <div class="form-group">
              <label class="form-label">Address / Location</label>
              <input type="text" class="form-input" id="profAddress" value="${user.address || ''}">
            </div>

            <button type="submit" class="btn btn-primary btn-sm btn-block">Save Contact Info</button>
          </form>

          <!-- Password Change Form -->
          <form id="profilePasswordForm" class="card" style="margin-bottom: 16px;">
            <div class="card-title" style="margin-bottom: 12px; font-size: 14px;">Change Password</div>
            
            <div class="form-group">
              <label class="form-label">New Password</label>
              <input type="password" required minlength="4" class="form-input" id="profNewPassword" placeholder="Enter new password">
            </div>

            <button type="submit" class="btn btn-outline btn-sm btn-block">Update Password</button>
          </form>

          ${Auth.isAdmin() ? `
            <!-- Admin Quick Utilities Menu -->
            <div class="card" style="margin-bottom: 16px;">
              <div class="card-title" style="margin-bottom: 10px; font-size: 14px;">Admin Administration</div>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <button class="btn btn-outline btn-sm" id="adminUsersModalBtn" style="justify-content: flex-start;">
                  👥 Member & Account Management &rarr;
                </button>
                <button class="btn btn-outline btn-sm" id="adminBackupModalBtn" style="justify-content: flex-start;">
                  💾 Backup & Restore Database &rarr;
                </button>
                <button class="btn btn-outline btn-sm" id="adminAuditModalBtn" style="justify-content: flex-start;">
                  📜 Activity & Audit Logs &rarr;
                </button>
              </div>
            </div>
          ` : ''}

          <!-- Logout Button -->
          <button class="btn btn-danger btn-block" id="profileLogoutBtn">
            🚪 Log Out of PlanningEasy
          </button>
        </div>
      </div>
    `;

    modalBackdrop.classList.add('show');

    modalContent.querySelectorAll('.close-modal-btn').forEach((b) => {
      b.addEventListener('click', () => modalBackdrop.classList.remove('show'));
    });

    // Profile Photo Change & Upload
    const photoFileInput = modalContent.querySelector('#profilePhotoFileInput');
    modalContent.querySelector('#changePhotoBtn')?.addEventListener('click', () => photoFileInput.click());

    photoFileInput?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const compressedDataUrl = await this.compressImage(file, 256, 256);
        Auth.updateUser(user.uid, { photoUrl: compressedDataUrl });
        window.dispatchEvent(new CustomEvent('pe_show_toast', { detail: { message: 'Profile photo updated!', type: 'success' } }));
        this.openModal(); // Refresh modal
      } catch (err) {
        alert('Failed to process image: ' + err.message);
      }
    });

    // Remove Profile Photo
    modalContent.querySelector('#removePhotoBtn')?.addEventListener('click', () => {
      if (confirm('Remove profile photo and restore default avatar?')) {
        Auth.updateUser(user.uid, { photoUrl: null });
        window.dispatchEvent(new CustomEvent('pe_show_toast', { detail: { message: 'Profile photo removed.', type: 'info' } }));
        this.openModal();
      }
    });

    // Save Position / Designation
    const posForm = modalContent.querySelector('#profilePositionForm');
    posForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const posVal = posForm.querySelector('#profPositionInput').value.trim();
      Auth.updateUser(user.uid, { position: posVal });
      window.dispatchEvent(new CustomEvent('pe_show_toast', { detail: { message: 'Position / Designation updated!', type: 'success' } }));
      this.openModal();
    });

    // Save Contact Details
    const detailsForm = modalContent.querySelector('#profileDetailsForm');
    detailsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const updates = {
        phone: detailsForm.querySelector('#profPhone').value.trim(),
        whatsapp: detailsForm.querySelector('#profWhatsapp').value.trim(),
        address: detailsForm.querySelector('#profAddress').value.trim()
      };
      Auth.updateUser(user.uid, updates);
      window.dispatchEvent(new CustomEvent('pe_show_toast', { detail: { message: 'Profile information updated!', type: 'success' } }));
    });

    // Change Password
    const pwdForm = modalContent.querySelector('#profilePasswordForm');
    pwdForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const newPwd = pwdForm.querySelector('#profNewPassword').value;
      Auth.changePassword(user.uid, newPwd);
      pwdForm.reset();
      window.dispatchEvent(new CustomEvent('pe_show_toast', { detail: { message: 'Password updated successfully!', type: 'success' } }));
    });

    // Admin Utilities Navigation
    if (Auth.isAdmin()) {
      modalContent.querySelector('#adminUsersModalBtn')?.addEventListener('click', () => {
        modalBackdrop.classList.remove('show');
        const main = document.getElementById('mainContent');
        if (main) Users.render(main);
      });

      modalContent.querySelector('#adminBackupModalBtn')?.addEventListener('click', () => {
        modalBackdrop.classList.remove('show');
        const main = document.getElementById('mainContent');
        if (main) Backup.render(main);
      });

      modalContent.querySelector('#adminAuditModalBtn')?.addEventListener('click', () => {
        modalBackdrop.classList.remove('show');
        const main = document.getElementById('mainContent');
        if (main) Audit.render(main);
      });
    }

    // Logout
    modalContent.querySelector('#profileLogoutBtn')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to log out?')) {
        modalBackdrop.classList.remove('show');
        Auth.logout();
      }
    });
  }
};
