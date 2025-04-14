'use client';

import useSWR from 'swr';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';
import { UserPaymentApp, PaymentApp } from '../types';

// REST APIからフェッチするfetcher関数
const fetcher = (url: string) => fetch(url).then(res => res.json());

// 全ての決済アプリを取得するフック
export function useAllPaymentApps() {
  // Phase 1ではAPIからデータを取得し、Phase 2以降でSupabaseに移行予定
  const { data, error, mutate } = useSWR('/api/payment-apps', fetcher);
  
  return {
    paymentApps: data || [],
    isLoading: !error && !data,
    isError: error,
    mutate
  };

  // Supabaseバージョン（将来的に完全移行）
  /*
  const { data, error, mutate } = useSWR('all-payment-apps', async () => {
    const { data, error } = await supabase
      .from('payment_apps')
      .select('*')
      .order('name');
      
    if (error) throw error;
    return data as PaymentApp[];
  });
  
  return {
    paymentApps: data || [],
    isLoading: !error && !data,
    isError: error,
    mutate
  };
  */
}

// ユーザーが選択した決済アプリを取得するフック
export function useUserPaymentApps() {
  const { user } = useAuth();
  const { paymentApps } = useAllPaymentApps();
  
  // ゲストモードでの選択アプリを取得
  const getGuestSelected = () => {
    if (typeof window === 'undefined') return [];
    
    try {
      const savedApps = localStorage.getItem('guestSelectedApps');
      if (savedApps) {
        const selectedIds = JSON.parse(savedApps) as string[];
        
        // 選択されたIDに対応するアプリを返す
        return selectedIds.map((id, index) => {
          const app = paymentApps.find((a: PaymentApp) => a.id === id);
          if (!app) return null;
          
          return {
            id: `guest-${id}`,
            user_id: 'guest',
            payment_app_id: id,
            payment_app: app,
            display_order: index,
            is_active: true
          } as UserPaymentApp;
        }).filter(Boolean) as UserPaymentApp[];
      }
    } catch (e) {
      console.error('Error parsing guest selected apps:', e);
    }
    
    return [];
  };
  
  // Phase 1では簡易的な実装
  // 認証済みユーザーの場合は将来的にSupabaseから取得
  // 未認証の場合はローカルストレージから取得
  const { data, error, mutate } = useSWR(
    user ? `user-payment-apps-${user.id}` : 'guest-payment-apps',
    async () => {
      if (user) {
        // 認証済みユーザー（将来的にはSupabaseから取得）
        // 現在はモック実装
        return [] as UserPaymentApp[];
      } else {
        // ゲストモード
        return getGuestSelected();
      }
    },
    {
      revalidateOnFocus: false,
      revalidateOnMount: true,
      dedupingInterval: 1000 * 60 * 5 // 5分間重複リクエストを防止
    }
  );
  
  // ユーザーの決済アプリ設定を更新する関数
  const updateUserPaymentApps = async (appIds: string[]) => {
    if (user) {
      // 認証済みユーザー（将来的にはSupabaseに保存）
      try {
        // モック実装（将来的にはSupabaseに保存）
        const newUserApps = appIds.map((appId, index) => {
          const app = paymentApps.find((a: PaymentApp) => a.id === appId);
          return {
            id: `user-${user.id}-${appId}`,
            user_id: user.id,
            payment_app_id: appId,
            payment_app: app,
            display_order: index,
            is_active: true
          } as UserPaymentApp;
        });
        
        // データを更新
        await mutate(newUserApps, false);
        return true;
      } catch (error) {
        console.error('Error updating user payment apps:', error);
        throw error;
      }
    } else {
      // ゲストモード - ローカルストレージに保存
      localStorage.setItem('guestSelectedApps', JSON.stringify(appIds));
      
      // 更新後のデータでキャッシュを更新
      const newGuestApps = appIds.map((appId, index) => {
        const app = paymentApps.find((a: PaymentApp) => a.id === appId);
        if (!app) return null;
        
        return {
          id: `guest-${appId}`,
          user_id: 'guest',
          payment_app_id: appId,
          payment_app: app,
          display_order: index,
          is_active: true
        } as UserPaymentApp;
      }).filter(Boolean) as UserPaymentApp[];
      
      // データを更新
      await mutate(newGuestApps, false);
      return true;
    }
  };
  
  // 表示順を更新する関数
  const updateDisplayOrder = async (updatedApps: { id: string; display_order: number }[]) => {
    if (user) {
      // 認証済みユーザー（将来的にはSupabaseに保存）
      // モック実装（実際の実装では省略）
    } else {
      // ゲストモード - ローカルストレージの順序を更新
      const currentData = getGuestSelected();
      const sortedIds = updatedApps
        .sort((a, b) => a.display_order - b.display_order)
        .map(app => app.id.replace('guest-', ''));
      
      localStorage.setItem('guestSelectedApps', JSON.stringify(sortedIds));
      
      // 更新後のデータでキャッシュを更新
      await mutate();
    }
  };
  
  return {
    userPaymentApps: data || [],
    isLoading: !data,
    isError: error,
    updateUserPaymentApps,
    updateDisplayOrder,
    mutate
  };
} 