// ==========================================================================
// PLANNINGEASY - NOTIFICATION SERVICE & NOTIFICATION CENTER
// ==========================================================================

import { Auth } from './auth.js';
import { Storage } from './storage.js';
import { Navigation } from './navigation.js';

export const Notifications = {
  init() {
    // Listen for custom toast events
    window.addEventListener('pe_show_toast', (e) => {
      if (e.detail) {
        this.showToast(e.detail.message, e.detail.type || 'info', e.detail.duration || 3000);
      }
    });

    // Header Bell Button Click
    const bellBtn = document.getElementById('headerNotificationBtn');
    bellBtn?.addEventListener('click', () => {
      this.openNotificationModal();
    });

    // Subscribe to notification updates to update header badge in real time
    Storage.subscribe('notifications', () => {
      this.updateHeaderBadge();
    });

    this.updateHeaderBadge();
    this.initPushSupport();
  },

  getUnreadNotificationsForUser(userUid) {
    if (!userUid) return [];
    const notifs = Storage.getAll('notifications');
    return notifs.filter((n) => {
      const isRecipient = n.recipientUids.includes('all') || n.recipientUids.includes(userUid);
      const isUnread = !n.readBy || !n.readBy.includes(userUid);
      return isRecipient && isUnread;
    });
  },

  getAllNotificationsForUser(userUid) {
    if (!userUid) return [];
    const notifs = Storage.getAll('notifications');
    return notifs.filter((n) => {
      return n.recipientUids.includes('all') || n.recipientUids.includes(userUid);
    });
  },

  updateHeaderBadge() {
    const user = Auth.getCurrentUser();
    const badgeEl = document.getElementById('headerNotificationBadge');
    if (!badgeEl) return;

    if (!user) {
      badgeEl.style.display = 'none';
      return;
    }

    const unread = this.getUnreadNotificationsForUser(user.uid);
    if (unread.length > 0) {
      badgeEl.style.display = 'flex';
      badgeEl.textContent = unread.length > 99 ? '99+' : unread.length;
    } else {
      badgeEl.style.display = 'none';
    }
  },

  formatTimeAgo(isoString) {
    if (!isoString) return 'recently';
    const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  },

  openNotificationModal() {
    const user = Auth.getCurrentUser();
    if (!user) return;

    const modalBackdrop = document.getElementById('globalModalBackdrop');
    const modalContent = document.getElementById('globalModalContent');
    if (!modalBackdrop || !modalContent) return;

    const userNotifs = this.getAllNotificationsForUser(user.uid);
    const unreadCount = this.getUnreadNotificationsForUser(user.uid).length;

    modalContent.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-sheet-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="modal-sheet-title">Notifications</div>
            ${unreadCount > 0 ? `<span class="badge badge-expense">${unreadCount} New</span>` : ''}
          </div>
          <button class="btn btn-ghost btn-sm close-modal-btn">&times;</button>
        </div>

        <div style="padding: 10px 16px; background: var(--bg-surface); display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-light);">
          <div style="font-size: 12px; color: var(--text-muted); font-weight: 600;">
            ${userNotifs.length} total updates
          </div>
          ${unreadCount > 0 ? `
            <button class="btn btn-ghost btn-sm" id="markAllReadBtn" style="font-size: 12px; padding: 4px 8px; color: var(--primary);">
              ✓ Mark all read
            </button>
          ` : ''}
        </div>

        <div class="modal-sheet-body" style="padding: 12px; max-height: 60vh;">
          ${userNotifs.length === 0 ? `
            <div class="empty-state">
              <div class="empty-state-icon">🔔</div>
              <div class="empty-state-title">No notifications yet</div>
              <div class="empty-state-text">You are all caught up on all group activities.</div>
            </div>
          ` : `
            <div>
              ${userNotifs.map((n) => {
                const isUnread = !n.readBy || !n.readBy.includes(user.uid);
                let icon = '🔔';
                let iconClass = 'notif-system';
                if (n.type === 'transaction') { icon = '💳'; iconClass = 'notif-trans'; }
                else if (n.type === 'chat') { icon = '💬'; iconClass = 'notif-chat'; }
                else if (n.type === 'report') { icon = '📝'; iconClass = 'notif-report'; }
                else if (n.type === 'task' || n.type === 'task_status') { icon = '✅'; iconClass = 'notif-task'; }

                return `
                  <div class="notification-item ${isUnread ? 'unread' : ''}" data-notif-id="${n.id}" data-target-tab="${n.targetTab || 'home'}" data-target-id="${n.targetId || ''}">
                    <div class="notification-icon-box ${iconClass}">
                      ${icon}
                    </div>
                    <div style="flex: 1; min-width: 0;">
                      <div style="font-size: 13.5px; font-weight: 700; color: var(--text-main); margin-bottom: 2px;">
                        ${n.title}
                      </div>
                      <div style="font-size: 12.5px; color: var(--text-muted); line-height: 1.4;">
                        ${n.message}
                      </div>
                      <div style="font-size: 11px; color: var(--text-subtle); margin-top: 4px;">
                        ${this.formatTimeAgo(n.createdAt)}
                      </div>
                    </div>
                    ${isUnread ? `<span class="notification-unread-dot"></span>` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <div class="modal-sheet-footer">
          <button class="btn btn-primary btn-block close-modal-btn">Close</button>
        </div>
      </div>
    `;

    modalBackdrop.classList.add('show');

    // Close buttons
    modalContent.querySelectorAll('.close-modal-btn').forEach((b) => {
      b.addEventListener('click', () => modalBackdrop.classList.remove('show'));
    });

    // Mark all as read
    modalContent.querySelector('#markAllReadBtn')?.addEventListener('click', () => {
      Storage.markAllNotificationsAsRead(user.uid);
      this.updateHeaderBadge();
      this.openNotificationModal(); // Refresh modal
    });

    // Notification click -> mark read and navigate
    modalContent.querySelectorAll('.notification-item').forEach((item) => {
      item.addEventListener('click', () => {
        const notifId = item.getAttribute('data-notif-id');
        const targetTab = item.getAttribute('data-target-tab') || 'home';
        const targetId = item.getAttribute('data-target-id');

        Storage.markNotificationAsRead(notifId, user.uid);
        this.updateHeaderBadge();
        modalBackdrop.classList.remove('show');

        // Navigate to relevant section
        if (targetTab === 'finance') {
          Navigation.setTab('finance');
        } else if (targetTab === 'reports') {
          Navigation.setTab('reports');
          if (targetId) {
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('pe_open_report_detail', { detail: { reportId: targetId } }));
            }, 100);
          }
        } else if (targetTab === 'tasks') {
          if (Auth.isAdmin()) {
            Navigation.setTab('tasks');
          } else {
            Navigation.setTab('home');
          }
        } else if (targetTab === 'chat') {
          Navigation.setTab('chat');
        } else {
          Navigation.setTab('home');
        }
      });
    });
  },

  showToast(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    else if (type === 'error') icon = '⚠️';
    else if (type === 'warning') icon = '🔔';

    toast.innerHTML = `
      <span>${icon}</span>
      <span style="flex: 1;">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  },

  async initPushSupport() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      return;
    }
  },

  async requestPushPermission() {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop/push notifications.');
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      this.showToast('Push notifications enabled for PlanningEasy!', 'success');
      return true;
    }
    return false;
  }
};
