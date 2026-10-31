import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import { changeAppLanguage } from '../i18n';
import { clearAllOfflineData } from './db';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isConfigured] = useState(() => isSupabaseConfigured());

  // Load profile helper
  const loadProfile = async (userId, userMeta) => {
    try {
      if (isConfigured && supabase) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (data && !error) {
          setUserProfile(data);
          if (data.preferred_language) {
            changeAppLanguage(data.preferred_language);
          }
          return data;
        }
      }
    } catch (e) {
      console.warn('[AuthContext] Profile load warning:', e);
    }

    // Default profile from metadata
    const defaultProfile = {
      id: userId,
      full_name: userMeta?.full_name || userMeta?.name || 'Teacher',
      school_name: userMeta?.school_name || '',
      preferred_language: userMeta?.preferred_language || 'en'
    };
    setUserProfile(defaultProfile);
    return defaultProfile;
  };

  useEffect(() => {
    if (!isConfigured || !supabase) {
      // Offline / Local Teacher session check
      const savedUser = localStorage.getItem('gurumitra_local_teacher') || localStorage.getItem('ruralclass_local_teacher');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          setUser(parsed);
          loadProfile(parsed.id, parsed.user_metadata);
        } catch (e) {}
      }
      setLoading(false);
      return;
    }

    // 1. Check active Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user || null);
      if (session?.user) {
        loadProfile(session.user.id, session.user.user_metadata);
      }
      setLoading(false);
    });

    // 2. Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user || null);
      if (session?.user) {
        loadProfile(session.user.id, session.user.user_metadata);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [isConfigured]);

  const login = async (email, password) => {
    if (!isConfigured || !supabase) {
      // Local Teacher Login when Supabase is not yet configured
      const cleanEmailKey = btoa(email).replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
      const teacherId = `teacher-${cleanEmailKey}`;
      const localTeacher = {
        id: teacherId,
        email,
        token: `local-token-${teacherId}`,
        user_metadata: {
          full_name: email.split('@')[0],
          school_name: ''
        }
      };
      localStorage.setItem('gurumitra_local_teacher', JSON.stringify(localTeacher));
      localStorage.setItem('ruralclass_local_teacher', JSON.stringify(localTeacher));
      setUser(localTeacher);
      loadProfile(localTeacher.id, localTeacher.user_metadata);
      return { user: localTeacher };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setUser(data.user);
    setSession(data.session);
    if (data.user) {
      await loadProfile(data.user.id, data.user.user_metadata);
    }
    return data;
  };

  const signup = async (email, password, { full_name }) => {
    // For every newly registered teacher, ensure a 100% clean slate:
    // Clear previously cached IndexedDB records and active classroom pointers
    localStorage.removeItem('gurumitra_active_classroom_id');
    localStorage.removeItem('ruralclass_active_classroom_id');
    localStorage.removeItem('gurumitra_active_timetable_plan');
    localStorage.removeItem('ruralclass_active_timetable_plan');
    await clearAllOfflineData();

    if (!isConfigured || !supabase) {
      const teacherId = `teacher-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const localTeacher = {
        id: teacherId,
        email,
        token: `local-token-${teacherId}`,
        user_metadata: {
          full_name: full_name || email.split('@')[0],
          school_name: ''
        }
      };
      localStorage.setItem('gurumitra_local_teacher', JSON.stringify(localTeacher));
      localStorage.setItem('ruralclass_local_teacher', JSON.stringify(localTeacher));
      setUser(localTeacher);
      loadProfile(localTeacher.id, localTeacher.user_metadata);
      return { user: localTeacher };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: full_name || email.split('@')[0]
        }
      }
    });
    if (error) throw error;
    setUser(data.user);
    setSession(data.session);
    if (data.user) {
      await loadProfile(data.user.id, { full_name });
    }
    return data;
  };

  const resetPassword = async (email) => {
    if (!isConfigured || !supabase) {
      throw new Error('Supabase is not configured yet. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable email password resets.');
    }
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/login'
    });
    if (error) throw error;
    return data;
  };

  const updateProfile = async (updates) => {
    if (isConfigured && supabase && user) {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      setUserProfile(data);
      if (updates.preferred_language) {
        changeAppLanguage(updates.preferred_language);
      }
      return data;
    } else {
      setUserProfile(prev => ({ ...prev, ...updates }));
      if (updates.preferred_language) {
        changeAppLanguage(updates.preferred_language);
      }
      return { ...userProfile, ...updates };
    }
  };

  const logout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('gurumitra_local_teacher');
    localStorage.removeItem('ruralclass_local_teacher');
    localStorage.removeItem('gurumitra_active_classroom_id');
    localStorage.removeItem('ruralclass_active_classroom_id');
    localStorage.removeItem('gurumitra_active_timetable_plan');
    localStorage.removeItem('ruralclass_active_timetable_plan');
    await clearAllOfflineData();
    setUser(null);
    setSession(null);
    setUserProfile(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      userProfile,
      loading,
      isConfigured,
      login,
      signup,
      resetPassword,
      updateProfile,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
