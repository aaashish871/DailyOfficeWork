
import { User, Task } from '../types';

/**
 * CENTRAL COMPANY SERVER SIMULATOR
 * This service handles authentication and data persistence.
 * For true cross-device use, replace localStorage with a real API endpoint.
 */

const MOCK_DELAY = 800;

const getGlobalDB = () => {
  const db = localStorage.getItem('worksync_central_db');
  return db ? JSON.parse(db) : { users: [], workspaces: {} };
};

const saveGlobalDB = (db: any) => {
  localStorage.setItem('worksync_central_db', JSON.stringify(db));
};

export const apiService = {
  /**
   * Register user and "trigger" verification email
   */
  register: async (name: string, email: string, password: string, avatarColor: string): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
    const db = getGlobalDB();
    
    if (db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('An account with this email already exists on our server.');
    }

    const newUser: User = { 
      id: crypto.randomUUID(), 
      name, 
      email: email.toLowerCase(), 
      isGuest: false, 
      avatarColor,
      isVerified: false // Users start unverified
    };

    db.users.push({ ...newUser, password });
    db.workspaces[newUser.id] = { tasks: [], team: ['Self', 'Rahul', 'Priya', 'Amit'] };
    
    saveGlobalDB(db);
    return newUser;
  },

  /**
   * Simulate the user clicking the link in their email
   */
  verifyEmail: async (email: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
    const db = getGlobalDB();
    const userIndex = db.users.findIndex((u: any) => u.email === email.toLowerCase());
    
    if (userIndex !== -1) {
      db.users[userIndex].isVerified = true;
      saveGlobalDB(db);
    } else {
      throw new Error("Verification failed: User not found.");
    }
  },

  /**
   * Login with strict verification check
   */
  login: async (email: string, password: string): Promise<{ user: User; tasks: Task[]; team: string[] }> => {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
    const db = getGlobalDB();
    
    const found = db.users.find((u: any) => u.email === email.toLowerCase() && u.password === password);
    
    if (!found) {
      throw new Error('Invalid email or password. Please check your credentials.');
    }

    if (!found.isVerified) {
      throw new Error('UNVERIFIED: Please check your email and verify your account before logging in.');
    }

    const user: User = { 
      id: found.id, 
      name: found.name, 
      email: found.email, 
      isGuest: false, 
      avatarColor: found.avatarColor,
      isVerified: found.isVerified
    };
    
    const workspace = db.workspaces[user.id] || { tasks: [], team: ['Self'] };
    return { user, ...workspace };
  },

  syncWorkspace: async (userId: string, tasks: Task[], team: string[]): Promise<void> => {
    const db = getGlobalDB();
    if (db.workspaces[userId]) {
      db.workspaces[userId] = { tasks, team };
      saveGlobalDB(db);
    }
  },

  fetchWorkspace: async (userId: string): Promise<{ tasks: Task[]; team: string[] }> => {
    const db = getGlobalDB();
    return db.workspaces[userId] || { tasks: [], team: ['Self'] };
  }
};
