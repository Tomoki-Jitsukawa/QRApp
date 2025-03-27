'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // 現在のセッションを取得
    const getSession = async () => {
      setLoading(true);
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };
    
    getSession();
    
    // 認証状態の変更を購読
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );
    
    // クリーンアップ関数
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ログイン関数
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push('/');
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  // メールリンクでのログイン
  const signInWithMagicLink = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error sending magic link:', error);
      throw error;
    }
  };

  // サインアップ関数
  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  // ソーシャルログイン
  const signInWithSocial = async (provider: 'google' | 'apple') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider });
      if (error) throw error;
    } catch (error) {
      console.error(`Error signing in with ${provider}:`, error);
      throw error;
    }
  };

  // ログアウト関数
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push('/auth/login');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  return {
    user,
    session,
    loading,
    signIn,
    signInWithMagicLink,
    signUp,
    signInWithSocial,
    signOut
  };
} 