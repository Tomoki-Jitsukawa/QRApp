'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR, { KeyedMutator } from 'swr';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';
import { PaymentApp, UserPaymentApp } from '../types';

// REST APIからフェッチするfetcher関数
const fetcher = (url: string) => fetch(url).then(res => res.json());

// 全決済アプリリストを取得するフック
export function useAllPaymentApps(): {
  paymentApps: PaymentApp[];
  isLoading: boolean;
  isError: Error | null;
  mutate: KeyedMutator<PaymentApp[]>;
} {
  // 環境変数や設定に基づいてAPIモードまたはSupabaseモードを決定
  const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
  
  // Supabaseバージョン
  const { data: supabaseData, error: supabaseError, isLoading: supabaseIsLoading, mutate: supabaseMutate } = useSWR<PaymentApp[]>(
    useSupabase ? 'payment_apps' : null,
    async (key: string) => {
      const { data, error } = await supabase.from(key).select('*').order('name');
      if (error) throw error;
      return data || [];
    },
    {
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  );
  
  // REST APIバージョン
  const { data: apiData, error: apiError, mutate: apiMutate } = useSWR<PaymentApp[]>(
    !useSupabase ? '/api/payment-apps' : null,
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  );
  
  return {
    paymentApps: useSupabase ? (supabaseData || []) : (apiData || []),
    isLoading: useSupabase ? supabaseIsLoading : (!apiData && !apiError),
    isError: useSupabase ? supabaseError : apiError,
    mutate: useSupabase ? supabaseMutate : apiMutate,
  };
}

// ユーザーが選択した決済アプリリストを取得・更新するフック
interface UseUserPaymentAppsResult {
  userPaymentApps: UserPaymentApp[];
  isLoading: boolean;
  isError: Error | null;
  updateUserPaymentApps: (orderedAppIds: string[]) => Promise<boolean>;
  updateDisplayOrder?: (updatedApps: { id: string; display_order: number }[]) => Promise<void>; // REST API用
  mutate: KeyedMutator<UserPaymentApp[]>;
}

export function useUserPaymentApps(): UseUserPaymentAppsResult {
  const { user } = useAuth();
  const userId = user?.id;
  const { paymentApps } = useAllPaymentApps();
  const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
  
  // ゲストモードでの選択アプリを取得
  const getGuestSelected = useCallback(() => {
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
            priority: index + 1,
            is_active: true
          } as UserPaymentApp;
        }).filter(Boolean) as UserPaymentApp[];
      }
    } catch (e) {
      console.error('Error parsing guest selected apps:', e);
    }
    
    return [];
  }, [paymentApps]);

  // SWRキー: ユーザーIDに基づいて動的に変化
  const swrKey = userId && useSupabase ? `user_payment_apps_for_${userId}` : (
    user ? `user-payment-apps-${user.id}` : 'guest-payment-apps'
  );

  // Supabase版のデータフェッチャー
  const supabaseFetcher = async () => {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('user_payment_apps')
      .select(`
        id,
        user_id,
        payment_app_id,
        priority,
        is_active,
        payment_app:payment_apps(*)
      `)
      .eq('user_id', userId)
      .order('priority', { ascending: true, nullsFirst: false });

    if (error) {
      console.error("Error fetching user payment apps:", error);
      throw error;
    }
    
    const typedData = data as unknown as (UserPaymentApp & { payment_app: PaymentApp | null })[] | null;
    return typedData?.filter((upa): upa is UserPaymentApp & { payment_app: PaymentApp } => !!upa.payment_app) || [];
  };

  // REST API/ローカルストレージ版のデータフェッチャー
  const apiFetcher = async () => {
    if (user) {
      try {
        // 将来的にはREST APIからユーザーの設定を取得
        const response = await fetch(`/api/user/payment-apps?userId=${user.id}`);
        if (response.ok) {
          return await response.json();
        }
        return [];
      } catch (e) {
        console.error('Error fetching user payment apps from API:', e);
        return [];
      }
    } else {
      // ゲストモード
      return getGuestSelected();
    }
  };

  // SWRフック
  const { data, error, isLoading, mutate } = useSWR<UserPaymentApp[]>(
    swrKey,
    useSupabase ? supabaseFetcher : apiFetcher,
    {
      revalidateOnFocus: useSupabase,
      revalidateOnMount: true,
      dedupingInterval: 5000,
    }
  );

  // Supabase版のユーザー設定更新関数
  const updateUserPaymentAppsSupabase = useCallback(async (orderedAppIds: string[]) => {
    if (!userId) return false;

    try {
      // 1. 現在のユーザーのアプリを取得
      const { data: currentAppsData, error: fetchError } = await supabase
        .from('user_payment_apps')
        .select('payment_app_id')
        .eq('user_id', userId);

      if (fetchError) {
        console.error("Fetch error before update:", fetchError);
        throw fetchError;
      }
      
      const currentAppIds = new Set(currentAppsData?.map((app: { payment_app_id: string }) => app.payment_app_id) || []);

      // 2. 新しい順序でのUpsertデータを作成
      const appsToUpsert = orderedAppIds.map((appId, index) => ({
         user_id: userId,
         payment_app_id: appId,
         priority: index + 1, // 優先度を1から順に設定
      }));

      // 3. 不要になったアプリを特定して削除
      const newAppIdsSet = new Set(orderedAppIds);
      const appsToDelete = Array.from(currentAppIds as Set<string>).filter(id => !newAppIdsSet.has(id));

      // 選択されなくなったアプリを削除
      if (appsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('user_payment_apps')
          .delete()
          .eq('user_id', userId)
          .in('payment_app_id', appsToDelete);
          
        if (deleteError) {
          console.error("Delete error:", deleteError);
          throw deleteError;
        }
      }

      // 新しい選択と順序をUpsert
      if (appsToUpsert.length > 0) {
        const { error: upsertError } = await supabase
          .from('user_payment_apps')
          .upsert(appsToUpsert, { onConflict: 'user_id, payment_app_id' });
          
        if (upsertError) {
          console.error("Upsert error:", upsertError);
          throw upsertError;
        }
      }

      // SWRキャッシュを更新
      await mutate();
      return true;
    } catch (error) {
      console.error('Error updating user payment apps:', error);
      return false;
    }
  }, [userId, mutate]);

  // REST API/ローカルストレージ版のユーザー設定更新関数
  const updateUserPaymentAppsApi = useCallback(async (appIds: string[]) => {
    if (user) {
      try {
        // 将来的にはREST APIにユーザー設定を保存
        const response = await fetch(`/api/user/payment-apps`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            appIds
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to update user settings');
        }
        
        // データを更新
        const newUserApps = appIds.map((appId, index) => {
          const app = paymentApps.find((a: PaymentApp) => a.id === appId);
          return {
            id: `user-${user.id}-${appId}`,
            user_id: user.id,
            payment_app_id: appId,
            payment_app: app,
            priority: index + 1,
            is_active: true
          } as UserPaymentApp;
        });
        
        await mutate(newUserApps, false);
        return true;
      } catch (error) {
        console.error('Error updating user payment apps:', error);
        return false;
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
          priority: index + 1,
          is_active: true
        } as UserPaymentApp;
      }).filter(Boolean) as UserPaymentApp[];
      
      await mutate(newGuestApps, false);
      return true;
    }
  }, [user, paymentApps, mutate, getGuestSelected]);

  // 表示順を更新する関数（REST API版のみ用）
  const updateDisplayOrder = useCallback(async (updatedApps: { id: string; display_order: number }[]) => {
    if (user) {
      // 将来的にはREST APIで表示順を更新
      try {
        const response = await fetch(`/api/user/payment-apps/order`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            updatedApps
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to update display order');
        }
        
        await mutate();
      } catch (error) {
        console.error('Error updating display order:', error);
      }
    } else {
      // ゲストモード - ローカルストレージの順序を更新
      const sortedIds = updatedApps
        .sort((a, b) => a.display_order - b.display_order)
        .map(app => app.id.replace('guest-', ''));
      
      localStorage.setItem('guestSelectedApps', JSON.stringify(sortedIds));
      
      // 更新後のデータでキャッシュを更新
      await mutate();
    }
  }, [user, mutate]);

  return {
    userPaymentApps: data || [],
    isLoading: isLoading || (!error && !data),
    isError: error,
    updateUserPaymentApps: useSupabase ? updateUserPaymentAppsSupabase : updateUserPaymentAppsApi,
    ...((!useSupabase) && { updateDisplayOrder }),
    mutate,
  };
} 