
import { createClient } from '@supabase/supabase-js';
import { User, Task, TaskStatus } from '../types';

const SUPABASE_URL = 'https://yvugbgjrakdcgirxpcvi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_f3m2s_7xpL28Tm8vQsjU1A_R7HVsVJP';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const mapDbTaskToTask = (t: any): Task => ({
  id: t.id,
  title: t.title,
  description: t.description,
  status: t.status as TaskStatus,
  priority: t.priority,
  category: t.category,
  createdAt: t.created_at ? new Date(t.created_at).getTime() : Date.now(),
  completedAt: t.completed_at ? new Date(t.completed_at).getTime() : undefined,
  logDate: t.log_date,
  dueDate: t.due_date,
  blocker: t.blocker,
  postponedReason: t.postponed_reason,
  duration: t.duration
});

export const apiService = {
  register: async (name: string, email: string, password: string, avatarColor: string): Promise<void> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, avatar_color: avatarColor }
      }
    });
    if (error) throw error;
    if (data.user) {
       try {
         await supabase.from('profiles').upsert({ id: data.user.id, name, avatar_color: avatarColor });
       } catch (profileErr) {
         console.warn("Profile creation pending email verification", profileErr);
       }
    }
  },

  login: async (email: string, password: string): Promise<{ user: User; tasks: Task[]; team: string[] }> => {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) throw authError;
    const user = authData.user;
    if (!user.email_confirmed_at) {
      await supabase.auth.signOut();
      throw new Error('UNVERIFIED: Please check your email and click the verification link before signing in.');
    }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (!profile) {
      await supabase.from('profiles').insert({ id: user.id, name: user.user_metadata?.full_name || 'User', avatar_color: user.user_metadata?.avatar_color || '#6366f1' });
    }
    const workspace = await apiService.fetchWorkspace(user.id);
    return {
      user: {
        id: user.id,
        name: profile?.name || user.user_metadata?.full_name || 'User',
        email: user.email!,
        isGuest: false,
        avatarColor: profile?.avatar_color || user.user_metadata?.avatar_color || '#6366f1',
        isVerified: true
      },
      tasks: workspace.tasks,
      team: workspace.team
    };
  },

  getCurrentUser: async (): Promise<User | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user.email_confirmed_at) return null;
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    return {
      id: session.user.id,
      name: profile?.name || session.user.user_metadata?.full_name || 'User',
      email: session.user.email!,
      isGuest: false,
      avatarColor: profile?.avatar_color || session.user.user_metadata?.avatar_color || '#6366f1',
      isVerified: true
    };
  },

  fetchWorkspace: async (userId: string): Promise<{ tasks: Task[]; team: string[] }> => {
    const { data: tasksData, error: tasksError } = await supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (tasksError) console.error("Error fetching tasks:", tasksError);
    
    const { data: teamData, error: teamError } = await supabase.from('team_members').select('name').eq('user_id', userId);
    if (teamError) console.error("Error fetching team:", teamError);

    return {
      tasks: (tasksData || []).map(mapDbTaskToTask),
      team: teamData?.map(t => t.name) || ['Self']
    };
  },

  syncWorkspace: async (userId: string, tasks: Task[], team: string[]): Promise<void> => {
    try {
      await apiService.syncTeam(userId, team);
      // Syncing all tasks concurrently
      const results = await Promise.allSettled(tasks.map(task => apiService.syncTask(userId, task)));
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        throw new Error(`${failures.length} tasks failed to sync. Check console for details.`);
      }
    } catch (e) {
      console.error("Workspace sync failed:", e);
      throw e;
    }
  },

  syncTask: async (userId: string, task: Task): Promise<void> => {
    const payload = {
      id: task.id,
      user_id: userId,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      category: task.category,
      log_date: task.logDate,
      due_date: task.dueDate,
      blocker: task.blocker,
      postponed_reason: task.postponedReason,
      duration: task.duration,
      completed_at: task.completedAt ? new Date(task.completedAt).toISOString() : null,
      created_at: new Date(task.createdAt).toISOString()
    };

    const { error } = await supabase.from('tasks').upsert(payload);
    
    if (error) {
      console.error(`Sync Task Error [ID: ${task.id}]:`, error.message, error.details, error.hint);
      // If error message contains "column does not exist", inform the user
      if (error.message?.includes("column")) {
        console.warn("DATABASE SCHEMA MISMATCH: It seems your Supabase table is missing columns. Please run the SQL setup script.");
      }
      throw error;
    }
  },

  deleteTask: async (userId: string, taskId: string): Promise<void> => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId).eq('user_id', userId);
    if (error) {
      console.error("Delete Task Error:", error);
      throw error;
    }
  },

  syncTeam: async (userId: string, names: string[]): Promise<void> => {
    // Delete existing and re-insert for simple sync
    const { error: delError } = await supabase.from('team_members').delete().eq('user_id', userId);
    if (delError) console.error("Team Sync (Delete) Error:", delError);

    if (names.length > 0) {
      const inserts = names.map(n => ({ user_id: userId, name: n }));
      const { error: insError } = await supabase.from('team_members').insert(inserts);
      if (insError) console.error("Team Sync (Insert) Error:", insError);
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
  }
};
