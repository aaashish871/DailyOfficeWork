
import { User, Task } from '../types';

/**
 * MOCK CLOUD API SERVICE
 * Simulation of a central company server.
 */

const MOCK_DELAY = 400;

const getGlobalDatabase = () => {
  const db = localStorage.getItem('ws_cloud_db');
  return db ? JSON.parse(db) : { users: [], workspaces: {} };
};

const saveGlobalDatabase = (db: any) => {
  localStorage.setItem('ws_cloud_db', JSON.stringify(db));
};

export const apiService = {
  /**
   * ADMIN: Get entire DB string for mirroring
   */
  exportDatabase: (): string => {
    return btoa(JSON.stringify(getGlobalDatabase()));
  },

  /**
   * ADMIN: Restore entire DB from string
   */
  importDatabase: (data: string): void => {
    try {
      const parsed = JSON.parse(atob(data));
      if (parsed.users && parsed.workspaces) {
        saveGlobalDatabase(parsed);
      }
    } catch (e) {
      throw new Error("Invalid Server Data Blob");
    }
  },

  /**
   * ADMIN: List all users (excluding admin itself)
   */
  getAllUsers: async (): Promise<any[]> => {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
    const db = getGlobalDatabase();
    return db.users;
  },

  register: async (name: string, email: string, password: string, avatarColor: string): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
    const db = getGlobalDatabase();
    
    if (db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('User already exists on server.');
    }

    const newUser: User = { id: crypto.randomUUID(), name, email, isGuest: false, avatarColor };
    db.users.push({ ...newUser, password });
    db.workspaces[newUser.id] = { tasks: [], team: ['Self', 'Rahul', 'Priya', 'Amit'] };
    
    saveGlobalDatabase(db);
    return newUser;
  },

  login: async (email: string, password: string): Promise<{ user: User; tasks: Task[]; team: string[]; isAdmin?: boolean }> => {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
    
    // Master Admin Login
    if (email === 'admin@worksync.ai' && password === 'admin123') {
      const adminUser: User = {
        id: 'admin_master',
        name: 'Server Admin',
        email: 'admin@worksync.ai',
        isGuest: false,
        avatarColor: '#1e293b'
      };
      return { user: adminUser, tasks: [], team: [], isAdmin: true };
    }

    const db = getGlobalDatabase();
    const found = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    
    if (!found) {
      throw new Error('Invalid email or password. If you registered on another device, you must use "Mirror Server" in the Admin panel first.');
    }

    const user: User = { id: found.id, name: found.name, email: found.email, isGuest: false, avatarColor: found.avatarColor };
    const workspace = db.workspaces[user.id] || { tasks: [], team: ['Self'] };

    return { user, ...workspace };
  },

  syncWorkspace: async (userId: string, tasks: Task[], team: string[]): Promise<void> => {
    if (userId === 'admin_master') return;
    const db = getGlobalDatabase();
    if (db.workspaces[userId]) {
      db.workspaces[userId] = { tasks, team };
      saveGlobalDatabase(db);
    }
  },

  fetchWorkspace: async (userId: string): Promise<{ tasks: Task[]; team: string[] }> => {
    const db = getGlobalDatabase();
    return db.workspaces[userId] || { tasks: [], team: ['Self'] };
  }
};
