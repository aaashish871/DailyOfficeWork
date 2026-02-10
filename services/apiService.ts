
import { User, Task } from '../types';

/**
 * MOCK CLOUD API SERVICE
 * In a real-world scenario, these would be fetch() calls to your company's backend.
 * We are using a 'Global Registry' simulation to mimic a central server.
 */

const MOCK_DELAY = 600; // Simulate network latency

// This simulates the 'Central Server' database
const getGlobalDatabase = () => {
  return JSON.parse(localStorage.getItem('ws_cloud_db') || '{"users": [], "workspaces": {}}');
};

const saveGlobalDatabase = (db: any) => {
  localStorage.setItem('ws_cloud_db', JSON.stringify(db));
};

export const apiService = {
  /**
   * Register a new user on the 'Central Server'
   */
  register: async (name: string, email: string, password: string, avatarColor: string): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
    const db = getGlobalDatabase();
    
    if (db.users.find((u: any) => u.email === email)) {
      throw new Error('User already exists on server.');
    }

    const newUser: User = { id: crypto.randomUUID(), name, email, isGuest: false, avatarColor };
    db.users.push({ ...newUser, password });
    db.workspaces[newUser.id] = { tasks: [], team: ['Self', 'Rahul', 'Priya', 'Amit'] };
    
    saveGlobalDatabase(db);
    return newUser;
  },

  /**
   * Login and fetch data from 'Central Server'
   */
  login: async (email: string, password: string): Promise<{ user: User; tasks: Task[]; team: string[] }> => {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
    const db = getGlobalDatabase();
    
    const found = db.users.find((u: any) => u.email === email && u.password === password);
    if (!found) throw new Error('Invalid email or password.');

    const user: User = { id: found.id, name: found.name, email: found.email, isGuest: false, avatarColor: found.avatarColor };
    const workspace = db.workspaces[user.id] || { tasks: [], team: ['Self'] };

    return { user, ...workspace };
  },

  /**
   * Push updates to the 'Central Server'
   */
  syncWorkspace: async (userId: string, tasks: Task[], team: string[]): Promise<void> => {
    // In a real app, this would be a PATCH or PUT request
    const db = getGlobalDatabase();
    if (db.workspaces[userId]) {
      db.workspaces[userId] = { tasks, team };
      saveGlobalDatabase(db);
    }
  },

  /**
   * Pull latest data from 'Central Server'
   */
  fetchWorkspace: async (userId: string): Promise<{ tasks: Task[]; team: string[] }> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const db = getGlobalDatabase();
    return db.workspaces[userId] || { tasks: [], team: ['Self'] };
  }
};
