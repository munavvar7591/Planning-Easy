// ==========================================================================
// PLANNINGEASY - AUTHENTICATION & ROLE-BASED ACCESS CONTROL
// ==========================================================================

import { Storage } from './storage.js';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.authListeners = new Set();
    this.loadSession();
  }

  loadSession() {
    try {
      const stored = localStorage.getItem('pe_auth_user');
      if (stored) {
        const user = JSON.parse(stored);
        // Refresh with latest user record from storage
        const latest = Storage.getById('users', user.uid);
        if (latest && latest.status !== 'disabled') {
          this.currentUser = latest;
        } else {
          this.logout();
        }
      }
    } catch (e) {
      console.error('[Auth] Error loading session:', e);
      this.currentUser = null;
    }
  }

  onAuthStateChanged(callback) {
    this.authListeners.add(callback);
    callback(this.currentUser);
    return () => this.authListeners.delete(callback);
  }

  notifyAuthChange() {
    for (const cb of this.authListeners) {
      try {
        cb(this.currentUser);
      } catch (err) {
        console.error('[Auth] Listener error:', err);
      }
    }
  }

  // --- Login with Username and Password ---
  async login(username, password) {
    if (!username || !password) {
      throw new Error('Please enter both username and password.');
    }

    const cleanUsername = username.trim().toLowerCase();
    const users = Storage.getAll('users');
    const user = users.find(
      (u) => u.username.toLowerCase() === cleanUsername && u.passwordHash === password
    );

    if (!user) {
      throw new Error('Invalid username or password.');
    }

    if (user.status === 'disabled') {
      throw new Error('This account has been disabled. Please contact Admin.');
    }

    // Set online presence
    const updated = Storage.update('users', user.uid, {
      isOnline: true,
      lastSeen: new Date().toISOString()
    });

    this.currentUser = updated || user;
    localStorage.setItem('pe_auth_user', JSON.stringify(this.currentUser));
    
    Storage.logAudit({
      action: 'USER_LOGIN',
      targetCollection: 'users',
      targetId: this.currentUser.uid,
      description: `User ${this.currentUser.name} (${this.currentUser.username}) logged in.`,
      actorUid: this.currentUser.uid,
      actorName: this.currentUser.name,
      actorRole: this.currentUser.role
    });

    this.notifyAuthChange();
    return this.currentUser;
  }

  logout() {
    if (this.currentUser) {
      Storage.update('users', this.currentUser.uid, {
        isOnline: false,
        lastSeen: new Date().toISOString()
      });
      Storage.logAudit({
        action: 'USER_LOGOUT',
        targetCollection: 'users',
        targetId: this.currentUser.uid,
        description: `User ${this.currentUser.name} logged out.`,
        actorUid: this.currentUser.uid,
        actorName: this.currentUser.name,
        actorRole: this.currentUser.role
      });
    }
    this.currentUser = null;
    localStorage.removeItem('pe_auth_user');
    this.notifyAuthChange();
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isAdmin() {
    return this.currentUser && this.currentUser.role === 'admin';
  }

  isMember() {
    return this.currentUser && this.currentUser.role === 'member';
  }

  // --- Admin User Management Operations ---
  createMember(memberData) {
    if (!this.isAdmin()) {
      throw new Error('Unauthorized: Only Admin can create member accounts.');
    }

    const cleanUsername = (memberData.username || '').trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      throw new Error('Username must be at least 3 characters long.');
    }

    if (!memberData.password || memberData.password.length < 4) {
      throw new Error('Password must be at least 4 characters long.');
    }

    const existing = Storage.getAll('users').find(
      (u) => u.username.toLowerCase() === cleanUsername
    );
    if (existing) {
      throw new Error(`Username "${cleanUsername}" is already taken.`);
    }

    const newMember = {
      uid: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      username: cleanUsername,
      passwordHash: memberData.password,
      name: (memberData.name || '').trim() || cleanUsername,
      role: memberData.role || 'member', // 'admin' or 'member'
      position: (memberData.position || '').trim() || (memberData.role === 'admin' ? 'Admin' : 'Member'),
      photoUrl: memberData.photoUrl || null,
      phone: (memberData.phone || '').trim(),
      whatsapp: (memberData.whatsapp || '').trim() || (memberData.phone || '').trim(),
      address: (memberData.address || '').trim(),
      status: 'active',
      isOnline: false,
      createdAt: new Date().toISOString()
    };

    return Storage.add('users', newMember, this.currentUser);
  }

  updateUser(uid, updates) {
    if (!this.currentUser) throw new Error('Not authenticated');

    const targetUser = Storage.getById('users', uid);
    if (!targetUser) throw new Error('User not found');

    // If not admin, can only update own profile and cannot change role/status/username
    if (!this.isAdmin()) {
      if (this.currentUser.uid !== uid) {
        throw new Error('Unauthorized: You can only edit your own profile.');
      }
      delete updates.role;
      delete updates.status;
      delete updates.username;
    } else {
      // If admin is updating username, check uniqueness
      if (updates.username && updates.username.toLowerCase() !== targetUser.username.toLowerCase()) {
        const cleanUsername = updates.username.trim().toLowerCase();
        const existing = Storage.getAll('users').find(
          (u) => u.username.toLowerCase() === cleanUsername && u.uid !== uid
        );
        if (existing) {
          throw new Error(`Username "${cleanUsername}" is already taken.`);
        }
        updates.username = cleanUsername;
      }
    }

    const updated = Storage.update('users', uid, updates, this.currentUser);
    if (this.currentUser.uid === uid) {
      this.currentUser = updated;
      localStorage.setItem('pe_auth_user', JSON.stringify(this.currentUser));
      this.notifyAuthChange();
    }
    return updated;
  }

  deleteUser(uid) {
    if (!this.isAdmin()) {
      throw new Error('Unauthorized: Only Admin can delete users.');
    }
    if (this.currentUser.uid === uid) {
      throw new Error('Cannot delete your own Admin account.');
    }
    return Storage.delete('users', uid, this.currentUser);
  }

  changePassword(uid, newPassword) {
    if (!this.currentUser) throw new Error('Not authenticated');
    if (!this.isAdmin() && this.currentUser.uid !== uid) {
      throw new Error('Unauthorized to change this password.');
    }
    if (!newPassword || newPassword.length < 4) {
      throw new Error('Password must be at least 4 characters.');
    }

    return this.updateUser(uid, { passwordHash: newPassword });
  }
}

export const Auth = new AuthService();
