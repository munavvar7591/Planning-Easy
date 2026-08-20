// ==========================================================================
// PLANNINGEASY - UNIFIED DATA & PERSISTENCE LAYER
// ==========================================================================

import { APP_CONFIG } from './config.js';

class StorageService {
  constructor() {
    this.listeners = new Map();
    this.initDatabase();
  }

  initDatabase() {
    // Check if initial storage exists, otherwise seed initial data
    if (!localStorage.getItem('pe_initialized')) {
      console.log('[Storage] Initializing fresh database with seeded data...');
      
      localStorage.setItem('pe_users', JSON.stringify(APP_CONFIG.initialUsers));
      
      const now = new Date();
      const currentYear = now.getFullYear();
      
      // Seed Initial Finance Entries for "This Year"
      const initialFinance = [
        {
          id: 'fin_1',
          type: 'income',
          amount: 50000,
          category: 'Donation',
          narration: 'Annual community fund collection',
          date: `${currentYear}-01-15`,
          createdByUid: 'admin_root',
          createdByName: 'System Admin',
          createdAt: new Date(`${currentYear}-01-15T10:00:00`).toISOString()
        },
        {
          id: 'fin_2',
          type: 'expense',
          amount: 15000,
          category: 'Office Rent',
          narration: 'January office lease payment',
          date: `${currentYear}-01-20`,
          createdByUid: 'admin_root',
          createdByName: 'System Admin',
          createdAt: new Date(`${currentYear}-01-20T11:00:00`).toISOString()
        },
        {
          id: 'fin_3',
          type: 'expense',
          amount: 3200,
          category: 'Food',
          narration: 'Team quarterly review refreshments',
          date: `${currentYear}-02-10`,
          createdByUid: 'member_rahul',
          createdByName: 'Rahul Sharma',
          createdAt: new Date(`${currentYear}-02-10T14:30:00`).toISOString()
        },
        {
          id: 'fin_4',
          type: 'income',
          amount: 25000,
          category: 'Donation',
          narration: 'Special project contribution',
          date: new Date().toISOString().split('T')[0],
          createdByUid: 'member_priya',
          createdByName: 'Priya Patel',
          createdAt: new Date().toISOString()
        }
      ];
      localStorage.setItem('pe_finance', JSON.stringify(initialFinance));

      // Seed Initial Reports
      const initialReports = [
        {
          id: 'rep_1',
          title: 'Q1 Activity & Operations Summary',
          content: 'All committee operations have commenced smoothly for the year. The initial funding drive was completed successfully with high participation. Next milestone is organizing the annual meeting and vendor review.',
          date: `${currentYear}-01-30`,
          authorUid: 'admin_root',
          authorName: 'System Admin',
          createdAt: new Date(`${currentYear}-01-30T16:00:00`).toISOString()
        },
        {
          id: 'rep_2',
          title: 'Equipment & Facility Inspection',
          content: 'Conducted inspection of all sound systems, seating, and lighting at the community venue. All equipment is operational with no immediate repairs required.',
          date: new Date().toISOString().split('T')[0],
          authorUid: 'member_rahul',
          authorName: 'Rahul Sharma',
          createdAt: new Date().toISOString()
        }
      ];
      localStorage.setItem('pe_reports', JSON.stringify(initialReports));

      // Seed Initial Tasks
      const initialTasks = [
        {
          id: 'tsk_1',
          title: 'Prepare Annual Membership Directory',
          description: 'Verify contact numbers and updated addresses of all active members.',
          assignedToUid: 'member_rahul',
          assignedToName: 'Rahul Sharma',
          priority: 'high',
          status: 'in_progress', // 'pending' | 'in_progress' | 'completed'
          dueDate: `${currentYear}-12-31`,
          createdByUid: 'admin_root',
          createdByName: 'System Admin',
          createdAt: new Date().toISOString()
        },
        {
          id: 'tsk_2',
          title: 'Review Financial Statements & Receipts',
          description: 'Match all Q1 expense receipts with submitted finance entries.',
          assignedToUid: 'member_priya',
          assignedToName: 'Priya Patel',
          priority: 'medium',
          status: 'pending',
          dueDate: `${currentYear}-11-30`,
          createdByUid: 'admin_root',
          createdByName: 'System Admin',
          createdAt: new Date().toISOString()
        }
      ];
      localStorage.setItem('pe_tasks', JSON.stringify(initialTasks));

      // Seed Initial Chat Messages (Group Chat)
      const initialMessages = [
        {
          id: 'msg_1',
          conversationId: 'group',
          senderUid: 'admin_root',
          senderName: 'System Admin',
          senderRole: 'admin',
          senderPosition: 'President / Admin',
          senderPhotoUrl: null,
          text: 'Welcome everyone to the PlanningEasy management portal! Let us keep all discussions, finances, and reports centralized here.',
          replyTo: null,
          mediaUrl: null,
          mediaType: null,
          reactions: { '👍': ['member_rahul', 'member_priya'] },
          createdAt: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 'msg_2',
          conversationId: 'group',
          senderUid: 'member_rahul',
          senderName: 'Rahul Sharma',
          senderRole: 'member',
          senderPosition: 'Treasurer',
          senderPhotoUrl: null,
          text: 'Glad to be here! The interface is clean and super fast on mobile.',
          replyTo: null,
          mediaUrl: null,
          mediaType: null,
          reactions: { '❤️': ['admin_root'] },
          createdAt: new Date(Date.now() - 1800000).toISOString()
        }
      ];
      localStorage.setItem('pe_messages', JSON.stringify(initialMessages));

      // Seed Initial Notifications
      const initialNotifications = [
        {
          id: 'notif_1',
          type: 'system',
          title: 'Welcome to PlanningEasy',
          message: 'System is ready. You can manage finances, reports, tasks, and communications here.',
          recipientUids: ['all'],
          readBy: [],
          targetTab: 'home',
          createdAt: new Date(Date.now() - 7200000).toISOString()
        },
        {
          id: 'notif_2',
          type: 'task',
          title: 'Task Assigned',
          message: 'You have been assigned: "Prepare Annual Membership Directory"',
          recipientUids: ['member_rahul'],
          readBy: [],
          targetTab: 'tasks',
          targetId: 'tsk_1',
          createdAt: new Date(Date.now() - 3600000).toISOString()
        }
      ];
      localStorage.setItem('pe_notifications', JSON.stringify(initialNotifications));

      // Seed Initial Audit Logs
      const initialLogs = [
        {
          id: 'log_1',
          action: 'SYSTEM_INITIALIZATION',
          targetCollection: 'system',
          targetId: 'root',
          description: 'PlanningEasy database initialized successfully.',
          actorUid: 'admin_root',
          actorName: 'System Admin',
          actorRole: 'admin',
          timestamp: new Date().toISOString()
        }
      ];
      localStorage.setItem('pe_auditLogs', JSON.stringify(initialLogs));

      localStorage.setItem('pe_initialized', 'true');
    }
  }

  // --- Reactive Subscriptions ---
  subscribe(collection, callback) {
    if (!this.listeners.has(collection)) {
      this.listeners.set(collection, new Set());
    }
    this.listeners.get(collection).add(callback);
    
    // Immediately emit current data
    callback(this.getAll(collection));

    // Return unsubscribe function
    return () => {
      if (this.listeners.has(collection)) {
        this.listeners.get(collection).delete(callback);
      }
    };
  }

  notify(collection) {
    if (this.listeners.has(collection)) {
      const data = this.getAll(collection);
      for (const cb of this.listeners.get(collection)) {
        try {
          cb(data);
        } catch (err) {
          console.error(`[Storage] Listener error on ${collection}:`, err);
        }
      }
    }
  }

  // --- CRUD Operations ---
  getAll(collection) {
    try {
      const raw = localStorage.getItem(`pe_${collection}`);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error(`[Storage] Error reading ${collection}:`, e);
      return [];
    }
  }

  getById(collection, id) {
    const items = this.getAll(collection);
    return items.find((item) => item.id === id || item.uid === id) || null;
  }

  add(collection, item, actor = null) {
    const items = this.getAll(collection);
    if (!item.id && !item.uid) {
      item.id = `${collection.substring(0, 3)}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    }
    if (!item.createdAt) {
      item.createdAt = new Date().toISOString();
    }
    items.unshift(item);
    localStorage.setItem(`pe_${collection}`, JSON.stringify(items));
    this.notify(collection);

    if (actor && collection !== 'auditLogs') {
      this.logAudit({
        action: `ADD_${collection.toUpperCase()}`,
        targetCollection: collection,
        targetId: item.id || item.uid,
        description: `Added entry in ${collection}: ${item.title || item.narration || item.name || item.text || item.id}`,
        actorUid: actor.uid,
        actorName: actor.name,
        actorRole: actor.role
      });
    }

    return item;
  }

  update(collection, id, updates, actor = null) {
    const items = this.getAll(collection);
    const index = items.findIndex((item) => item.id === id || item.uid === id);
    if (index === -1) return null;

    const oldItem = items[index];
    const updatedItem = { ...oldItem, ...updates, updatedAt: new Date().toISOString() };
    items[index] = updatedItem;
    localStorage.setItem(`pe_${collection}`, JSON.stringify(items));
    this.notify(collection);

    if (actor && collection !== 'auditLogs') {
      this.logAudit({
        action: `UPDATE_${collection.toUpperCase()}`,
        targetCollection: collection,
        targetId: id,
        description: `Updated record in ${collection} (ID: ${id})`,
        actorUid: actor.uid,
        actorName: actor.name,
        actorRole: actor.role
      });
    }

    return updatedItem;
  }

  delete(collection, id, actor = null) {
    let items = this.getAll(collection);
    const target = items.find((item) => item.id === id || item.uid === id);
    if (!target) return false;

    items = items.filter((item) => item.id !== id && item.uid !== id);
    localStorage.setItem(`pe_${collection}`, JSON.stringify(items));
    this.notify(collection);

    if (actor && collection !== 'auditLogs') {
      this.logAudit({
        action: `DELETE_${collection.toUpperCase()}`,
        targetCollection: collection,
        targetId: id,
        description: `Deleted record from ${collection} (ID: ${id})`,
        actorUid: actor.uid,
        actorName: actor.name,
        actorRole: actor.role
      });
    }

    return true;
  }

  logAudit(logData) {
    const logs = this.getAll('auditLogs');
    const newLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      ...logData
    };
    logs.unshift(newLog);
    // Limit to latest 1000 logs
    if (logs.length > 1000) logs.pop();
    localStorage.setItem('pe_auditLogs', JSON.stringify(logs));
    this.notify('auditLogs');
  }

  // --- Notification Management ---
  createNotification({ type, title, message, recipientUids = ['all'], targetTab = 'home', targetId = null }) {
    const notifications = this.getAll('notifications');
    
    // Deduplication check: Avoid exact identical notification within 10 seconds
    const tenSecAgo = Date.now() - 10000;
    const isDuplicate = notifications.some(n => 
      n.title === title && 
      n.message === message && 
      new Date(n.createdAt).getTime() > tenSecAgo
    );
    if (isDuplicate) return null;

    const newNotif = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type, // 'transaction' | 'chat' | 'report' | 'task' | 'task_status' | 'system'
      title,
      message,
      recipientUids, // array of uids or ['all']
      readBy: [],
      targetTab,
      targetId,
      createdAt: new Date().toISOString()
    };

    notifications.unshift(newNotif);
    // Keep max 300 notifications
    if (notifications.length > 300) notifications.pop();
    localStorage.setItem('pe_notifications', JSON.stringify(notifications));
    this.notify('notifications');

    // Trigger in-app toast event for instant feedback
    window.dispatchEvent(new CustomEvent('pe_show_toast', {
      detail: {
        message: `${title}: ${message}`,
        type: type === 'transaction' ? 'success' : (type === 'task' ? 'warning' : 'info')
      }
    }));

    return newNotif;
  }

  markNotificationAsRead(notifId, userUid) {
    if (!userUid) return;
    const notifs = this.getAll('notifications');
    const target = notifs.find(n => n.id === notifId);
    if (target) {
      if (!target.readBy) target.readBy = [];
      if (!target.readBy.includes(userUid)) {
        target.readBy.push(userUid);
        localStorage.setItem('pe_notifications', JSON.stringify(notifs));
        this.notify('notifications');
      }
    }
  }

  markAllNotificationsAsRead(userUid) {
    if (!userUid) return;
    const notifs = this.getAll('notifications');
    let changed = false;
    notifs.forEach(n => {
      const isTarget = n.recipientUids.includes('all') || n.recipientUids.includes(userUid);
      if (isTarget) {
        if (!n.readBy) n.readBy = [];
        if (!n.readBy.includes(userUid)) {
          n.readBy.push(userUid);
          changed = true;
        }
      }
    });

    if (changed) {
      localStorage.setItem('pe_notifications', JSON.stringify(notifs));
      this.notify('notifications');
    }
  }

  // --- Export & Backup ---
  createBackup() {
    const users = this.getAll('users').map(u => {
      const sanitized = { ...u };
      delete sanitized.passwordHash; // NEVER expose passwords in backup
      return sanitized;
    });

    return {
      appName: APP_CONFIG.appName,
      version: APP_CONFIG.version,
      exportedAt: new Date().toISOString(),
      data: {
        users,
        finance: this.getAll('finance'),
        reports: this.getAll('reports'),
        tasks: this.getAll('tasks'),
        notifications: this.getAll('notifications'),
        auditLogs: this.getAll('auditLogs')
      }
    };
  }

  restoreBackup(backupData, actor) {
    if (!backupData || !backupData.data) {
      throw new Error('Invalid backup file format');
    }

    const { data } = backupData;
    if (Array.isArray(data.finance)) {
      localStorage.setItem('pe_finance', JSON.stringify(data.finance));
      this.notify('finance');
    }
    if (Array.isArray(data.reports)) {
      localStorage.setItem('pe_reports', JSON.stringify(data.reports));
      this.notify('reports');
    }
    if (Array.isArray(data.tasks)) {
      localStorage.setItem('pe_tasks', JSON.stringify(data.tasks));
      this.notify('tasks');
    }
    if (Array.isArray(data.notifications)) {
      localStorage.setItem('pe_notifications', JSON.stringify(data.notifications));
      this.notify('notifications');
    }
    if (Array.isArray(data.auditLogs)) {
      localStorage.setItem('pe_auditLogs', JSON.stringify(data.auditLogs));
      this.notify('auditLogs');
    }

    if (actor) {
      this.logAudit({
        action: 'RESTORE_BACKUP',
        targetCollection: 'system',
        targetId: 'backup',
        description: `Restored database backup generated at ${backupData.exportedAt || 'unknown date'}`,
        actorUid: actor.uid,
        actorName: actor.name,
        actorRole: actor.role
      });
    }

    return true;
  }
}

export const Storage = new StorageService();
