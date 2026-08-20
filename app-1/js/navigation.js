// ==========================================================================
// PLANNINGEASY - NAVIGATION & ROUTING CONTROLLER
// ==========================================================================

import { Auth } from './auth.js';
import { Storage } from './storage.js';

export const Navigation = {
  currentTab: 'home',
  listeners: new Set(),

  // Icon SVG Definitions (Lucide-inspired clean outline SVG)
  icons: {
    home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    finance: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`,
    reports: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    tasks: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
    users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    profile: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
  },

  onTabChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  },

  setTab(tabId) {
    const user = Auth.getCurrentUser();
    // Safety check: Members are NOT allowed to navigate to tasks
    if (tabId === 'tasks' && !Auth.isAdmin()) {
      tabId = 'home';
    }

    this.currentTab = tabId;
    this.updateBottomNavUI();

    for (const cb of this.listeners) {
      try {
        cb(tabId);
      } catch (err) {
        console.error('[Navigation] Error in tab callback:', err);
      }
    }
  },

  getTabsForCurrentUser() {
    if (Auth.isAdmin()) {
      // ADMIN: Home, Chat, Finance, Reports, Tasks (5 items)
      return [
        { id: 'home', label: 'Home', icon: this.icons.home },
        { id: 'chat', label: 'Chat', icon: this.icons.chat, hasBadge: true },
        { id: 'finance', label: 'Finance', icon: this.icons.finance },
        { id: 'reports', label: 'Reports', icon: this.icons.reports },
        { id: 'tasks', label: 'Tasks', icon: this.icons.tasks }
      ];
    } else {
      // MEMBER: Home, Chat, Finance, Reports (4 items - NO TASKS TAB)
      return [
        { id: 'home', label: 'Home', icon: this.icons.home },
        { id: 'chat', label: 'Chat', icon: this.icons.chat, hasBadge: true },
        { id: 'finance', label: 'Finance', icon: this.icons.finance },
        { id: 'reports', label: 'Reports', icon: this.icons.reports }
      ];
    }
  },

  calculateUnreadChatCount() {
    const user = Auth.getCurrentUser();
    if (!user) return 0;

    const messages = Storage.getAll('messages');
    const readTimestamp = parseInt(localStorage.getItem(`pe_chat_read_${user.uid}`) || '0', 10);
    
    // Count unread group messages or direct messages intended for this user
    let unreadCount = 0;
    for (const msg of messages) {
      if (msg.senderUid !== user.uid) {
        const msgTime = new Date(msg.createdAt).getTime();
        if (msgTime > readTimestamp) {
          if (msg.conversationId === 'group' || Auth.isAdmin() || msg.conversationId === `dm_${user.uid}`) {
            unreadCount++;
          }
        }
      }
    }
    return unreadCount;
  },

  renderBottomNav() {
    const navContainer = document.getElementById('bottomNav');
    if (!navContainer) return;

    const user = Auth.getCurrentUser();
    if (!user) {
      navContainer.style.display = 'none';
      return;
    }
    navContainer.style.display = 'flex';

    const tabs = this.getTabsForCurrentUser();
    const unread = this.calculateUnreadChatCount();

    navContainer.innerHTML = tabs.map((tab) => `
      <button class="nav-item ${this.currentTab === tab.id ? 'active' : ''}" data-tab="${tab.id}">
        <div class="icon-wrapper">
          ${tab.icon}
          ${tab.hasBadge && unread > 0 ? `<span class="nav-badge" id="chatNavBadge">${unread > 99 ? '99+' : unread}</span>` : ''}
        </div>
        <span>${tab.label}</span>
      </button>
    `).join('');

    // Attach click handlers
    navContainer.querySelectorAll('.nav-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        this.setTab(targetTab);
      });
    });
  },

  updateBottomNavUI() {
    const navContainer = document.getElementById('bottomNav');
    if (!navContainer) return;

    navContainer.querySelectorAll('.nav-item').forEach((btn) => {
      const tabId = btn.getAttribute('data-tab');
      if (tabId === this.currentTab) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update unread badge if present
    const badgeEl = document.getElementById('chatNavBadge');
    const unread = this.calculateUnreadChatCount();
    if (badgeEl) {
      if (unread > 0) {
        badgeEl.style.display = 'flex';
        badgeEl.textContent = unread > 99 ? '99+' : unread;
      } else {
        badgeEl.style.display = 'none';
      }
    }
  }
};
