/**
 * ATRIA INSTITUTE OF TECHNOLOGY - Timetable Planner
 * Student and Faculty Authentication Module
 * LocalStorage prototype: use server-side authentication for production.
 */

class AuthManager {
  constructor() {
    this.currentUser = AppStore.get(STORAGE_KEYS.ACTIVE_USER, null);
    this.normalizeStoredUsers();

    // Only Student and Faculty sessions are supported in this version.
    if (this.currentUser) {
      const stored = this.getUsers().find(u => u.id === this.currentUser.id);
      if (!stored || !['student', 'staff'].includes(stored.role) || (stored.status || 'active') !== 'active') {
        this.currentUser = null;
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER);
      } else {
        this.currentUser = { ...stored };
        AppStore.set(STORAGE_KEYS.ACTIVE_USER, this.currentUser);
      }
    }
  }

  getUsers() {
    return AppStore.get(STORAGE_KEYS.USERS, DEFAULT_USERS);
  }

  normalizeStoredUsers() {
    const users = this.getUsers();
    let changed = false;
    users.forEach(user => {
      // Older versions used Admin approval for Faculty registrations.
      // Since Faculty now have direct access, migrate those pending accounts.
      if (!user.status || (user.role === 'staff' && ['pending', 'rejected'].includes(user.status))) {
        user.status = 'active';
        changed = true;
      }
      delete user.approvedAt;
      delete user.approvedBy;
      delete user.rejectedAt;
      delete user.rejectedBy;
    });
    if (changed) AppStore.set(STORAGE_KEYS.USERS, users);
  }

  getCurrentUser() { return this.currentUser; }
  isLoggedIn() { return this.currentUser !== null; }
  isStudent() { return !!this.currentUser && this.currentUser.role === 'student'; }
  isStaff() { return !!this.currentUser && this.currentUser.role === 'staff'; }

  // Compatibility alias: existing app sections previously guarded by isAdmin()
  // are now available to authenticated Faculty / Staff.
  isAdmin() { return this.isStaff(); }

  login(role, identifier, password) {
    if (!['student', 'staff'].includes(role)) {
      return { success: false, error: 'Please select Student or Faculty / Staff.' };
    }

    const users = this.getUsers();
    const cleanId = String(identifier || '').trim().toUpperCase();
    const cleanPass = String(password || '');
    const user = users.find(u =>
      String(u.username || '').trim().toUpperCase() === cleanId && u.role === role
    );

    if (!user || user.password !== cleanPass) {
      const label = role === 'student' ? 'Admission Number' : 'Staff User ID';
      return { success: false, error: `Invalid ${label} or Password. Please verify your credentials.` };
    }

    if ((user.status || 'active') !== 'active') {
      return { success: false, error: 'This account is inactive. Please contact the institute.' };
    }

    this.currentUser = { ...user };
    AppStore.set(STORAGE_KEYS.ACTIVE_USER, this.currentUser);
    return { success: true, user: this.currentUser };
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER);
  }

  _validateNewUser(username, name, password) {
    const cleanId = String(username || '').trim().toUpperCase();
    if (!cleanId) return { error: 'User ID is required.' };
    if (!String(name || '').trim()) return { error: 'Full name is required.' };
    if (String(password || '').length < 6) return { error: 'Password must contain at least 6 characters.' };
    const exists = this.getUsers().some(u => String(u.username || '').trim().toUpperCase() === cleanId);
    if (exists) return { error: `An account with ID "${cleanId}" already exists.` };
    return { cleanId };
  }

  studentRegister({ username, name, classId, password }) {
    const validation = this._validateNewUser(username, name, password);
    if (validation.error) return { success: false, error: validation.error };

    const cleanId = validation.cleanId;
    if (!/^1AT[A-Z0-9]{5,}$/i.test(cleanId)) {
      return { success: false, error: 'Enter a valid Atria USN beginning with 1AT.' };
    }

    const classes = AppStore.get(STORAGE_KEYS.CLASSES, DEFAULT_CLASSES);
    const targetClass = classes.find(c => c.id === classId);
    if (!targetClass) return { success: false, error: 'Please select a valid class / section.' };

    const user = {
      id: 'USER-' + Date.now(), username: cleanId, name: String(name).trim(), password,
      role: 'student', status: 'active', classId: targetClass.id,
      department: targetClass.department, semester: targetClass.semester,
      section: targetClass.section, createdAt: new Date().toISOString()
    };

    const users = this.getUsers();
    users.push(user);
    AppStore.set(STORAGE_KEYS.USERS, users);
    this.currentUser = { ...user };
    AppStore.set(STORAGE_KEYS.ACTIVE_USER, this.currentUser);
    return { success: true, user: this.currentUser };
  }

  staffRegister({ username, name, department, password }) {
    const validation = this._validateNewUser(username, name, password);
    if (validation.error) return { success: false, error: validation.error };

    const cleanId = validation.cleanId;
    if (!/^[A-Z0-9][A-Z0-9_-]{2,}$/.test(cleanId)) {
      return { success: false, error: 'Enter a valid Staff ID (letters, numbers, _ or -).' };
    }
    if (!String(department || '').trim()) {
      return { success: false, error: 'Department is required.' };
    }

    const user = {
      id: 'USER-' + Date.now(), username: cleanId, name: String(name).trim(), password,
      role: 'staff', status: 'active', department: String(department).trim(),
      createdAt: new Date().toISOString()
    };

    const users = this.getUsers();
    users.push(user);
    AppStore.set(STORAGE_KEYS.USERS, users);
    this.currentUser = { ...user };
    AppStore.set(STORAGE_KEYS.ACTIVE_USER, this.currentUser);
    return { success: true, user: this.currentUser };
  }
}

const auth = new AuthManager();
