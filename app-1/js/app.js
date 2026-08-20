// ==========================================================================
// PLANNINGEASY - MAIN APPLICATION BOOTSTRAPPER
// ==========================================================================

import { Auth } from './auth.js';
import { Storage } from './storage.js';
import { Navigation } from './navigation.js';
import { Dashboard } from './dashboard.js';
import { Finance } from './finance.js';
import { Reports } from './reports.js';
import { Tasks } from './tasks.js';
import { Chat } from './chat.js';
import { Users } from './users.js';
import { Backup } from './backup.js';
import { Audit } from './audit.js';
import { Profile } from './profile.js';
import { Notifications } from './notifications.js';

class App {
  constructor() {
    this.appHeader = document.getElementById('appHeader');
    this.mainContent = document.getElementById('mainContent');
    this.bottomNav = document.getElementById('bottomNav');
    this.profileAvatarBtn = document.getElementById('profileAvatarBtn');
    this.presenceDot = document.getElementById('headerPresenceDot');
    this.userAvatarInitial = document.getElementById('userAvatarInitial');
  }

  init() {
    Notifications.init();
    this.registerServiceWorker();
    this.setupGlobalEventListeners();

    // Listen to Auth State
    Auth.onAuthStateChanged((user) => {
      if (user) {
        this.renderAuthenticatedApp(user);
      } else {
        this.renderLoginScreen();
      }
    });

    // Listen to Navigation tab changes
    Navigation.onTabChange((tabId) => {
      this.renderTab(tabId);
    });

    // Listen to data mutations for real-time reactivity
    ['finance', 'reports', 'tasks', 'messages', 'users', 'auditLogs'].forEach((col) => {
      Storage.subscribe(col, () => {
        if (Auth.getCurrentUser()) {
          this.renderTab(Navigation.currentTab);
          Navigation.updateBottomNavUI();
        }
      });
    });
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => console.log('[SW] Service Worker registered with scope:', reg.scope))
          .catch((err) => console.warn('[SW] Registration failed:', err));
      });
    }
  }

  setupGlobalEventListeners() {
    // Top-Right Profile button click
    this.profileAvatarBtn?.addEventListener('click', () => {
      Profile.openModal();
    });

    // Quick Event Listeners
    window.addEventListener('pe_open_add_finance', (e) => {
      Finance.openAddModal(e.detail?.type || 'income');
    });

    window.addEventListener('pe_open_add_report', () => {
      Reports.openAddModal();
    });

    window.addEventListener('pe_open_report_detail', (e) => {
      if (e.detail?.reportId) {
        Reports.openDetailModal(e.detail.reportId);
      }
    });

    window.addEventListener('pe_open_audit_modal', () => {
      if (Auth.isAdmin()) {
        Audit.render(this.mainContent);
      }
    });

    // Online / Offline window network events
    window.addEventListener('online', () => {
      if (this.presenceDot) this.presenceDot.classList.add('online');
      Notifications.showToast('You are online', 'info');
    });

    window.addEventListener('offline', () => {
      if (this.presenceDot) this.presenceDot.classList.remove('online');
      Notifications.showToast('You are offline (Offline mode active)', 'warning');
    });
  }

  renderLoginScreen() {
    this.appHeader.style.display = 'none';
    this.bottomNav.style.display = 'none';

    this.mainContent.style.marginTop = '0';
    this.mainContent.style.marginBottom = '0';
    this.mainContent.style.padding = '0';

    this.mainContent.innerHTML = `
      <div class="auth-container">
        <div class="auth-card">
          <div class="auth-header">
            <div class="auth-logo">PE</div>
            <div class="auth-title">PLANNINGEASY</div>
            <div class="auth-subtitle">All-in-One Group & Team Management</div>
          </div>

          <form id="loginForm">
            <div class="form-group">
              <label class="form-label">Username</label>
              <input type="text" required class="form-input" id="loginUsername" placeholder="Enter assigned username" autocomplete="username">
            </div>

            <div class="form-group">
              <label class="form-label">Password</label>
              <input type="password" required class="form-input" id="loginPassword" placeholder="Enter password" autocomplete="current-password">
            </div>

            <div id="loginError" style="color: var(--danger); font-size: 13px; font-weight: 600; margin-bottom: 12px; display: none;"></div>

            <button type="submit" class="btn btn-primary btn-block" id="loginSubmitBtn">
              Log In to Portal
            </button>
          </form>

          <!-- Fast Demo / Seeded Credentials Quick Buttons -->
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border-light); font-size: 12px; color: var(--text-muted);">
            <div style="font-weight: 700; color: var(--text-main); margin-bottom: 8px;">Quick Demo Accounts:</div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <button type="button" class="btn btn-outline btn-sm quick-login-btn" data-user="admin" data-pass="admin123" style="justify-content: space-between;">
                <span>👑 <b>Admin:</b> admin</span>
                <span style="opacity: 0.7;">admin123</span>
              </button>
              <button type="button" class="btn btn-outline btn-sm quick-login-btn" data-user="rahul" data-pass="member123" style="justify-content: space-between;">
                <span>👤 <b>Member 1:</b> rahul</span>
                <span style="opacity: 0.7;">member123</span>
              </button>
              <button type="button" class="btn btn-outline btn-sm quick-login-btn" data-user="priya" data-pass="member123" style="justify-content: space-between;">
                <span>👤 <b>Member 2:</b> priya</span>
                <span style="opacity: 0.7;">member123</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    const form = this.mainContent.querySelector('#loginForm');
    const errEl = this.mainContent.querySelector('#loginError');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errEl.style.display = 'none';
      const username = form.querySelector('#loginUsername').value;
      const password = form.querySelector('#loginPassword').value;

      try {
        await Auth.login(username, password);
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
      }
    });

    this.mainContent.querySelectorAll('.quick-login-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const u = btn.getAttribute('data-user');
        const p = btn.getAttribute('data-pass');
        form.querySelector('#loginUsername').value = u;
        form.querySelector('#loginPassword').value = p;
        try {
          await Auth.login(u, p);
        } catch (err) {
          errEl.textContent = err.message;
          errEl.style.display = 'block';
        }
      });
    });
  }

  renderAuthenticatedApp(user) {
    this.appHeader.style.display = 'flex';
    this.bottomNav.style.display = 'flex';
    this.mainContent.style.marginTop = 'var(--header-height)';
    this.mainContent.style.marginBottom = 'calc(var(--nav-height) + var(--safe-bottom) + 12px)';
    this.mainContent.style.padding = '16px';

    // Update Header Avatar
    const avatarImg = document.getElementById('userAvatarImg');
    if (user.photoUrl && avatarImg) {
      avatarImg.src = user.photoUrl;
      avatarImg.style.display = 'block';
      if (this.userAvatarInitial) this.userAvatarInitial.style.display = 'none';
    } else {
      if (avatarImg) avatarImg.style.display = 'none';
      if (this.userAvatarInitial) {
        this.userAvatarInitial.style.display = 'block';
        this.userAvatarInitial.textContent = (user.name || user.username).charAt(0).toUpperCase();
      }
    }

    if (this.presenceDot) {
      this.presenceDot.classList.add('online');
    }

    // Update Notification Bell Badge
    Notifications.updateHeaderBadge();

    // Render Role-Based Navigation
    Navigation.renderBottomNav();
    this.renderTab(Navigation.currentTab);
  }

  renderTab(tabId) {
    const user = Auth.getCurrentUser();
    if (!user) return;

    switch (tabId) {
      case 'home':
        Dashboard.render(this.mainContent);
        break;
      case 'chat':
        Chat.render(this.mainContent);
        break;
      case 'finance':
        Finance.render(this.mainContent);
        break;
      case 'reports':
        Reports.render(this.mainContent);
        break;
      case 'tasks':
        if (Auth.isAdmin()) {
          Tasks.render(this.mainContent);
        } else {
          Navigation.setTab('home');
        }
        break;
      default:
        Dashboard.render(this.mainContent);
        break;
    }
  }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
