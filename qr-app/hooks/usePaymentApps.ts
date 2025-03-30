'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR, { KeyedMutator } from 'swr';
import { useAuth } from '@/app/hooks/useAuth';
import { supabase } from '@/app/lib/supabase';
import { PaymentApp, UserPaymentApp } from '@/app/types';

// Supabaseからデータを取得するためのfetcher関数 (未使用なので削除)
/*
const fetcher = async (key: string) => {
  const { data, error } = await supabase.from(key).select(`*, payment_app:payment_apps(*)`);
  if (error) throw error;
  return data;
};
*/

// 全決済アプリリストを取得するフック
export function useAllPaymentApps(): {
  paymentApps: PaymentApp[];
  isLoading: boolean;
  isError: Error | null; // any の代わりに Error | null を使用
  mutate: KeyedMutator<PaymentApp[]>;
} {
  const { data, error, isLoading, mutate } = useSWR<PaymentApp[]>('payment_apps', async (key: string) => {
    const { data, error } = await supabase.from(key).select('*').order('name'); // 名前順で取得
    if (error) throw error;
    return data || []; // data が null の場合は空配列を返す
  });

  return {
    paymentApps: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}


// ユーザーが選択した決済アプリリストを取得・更新するフック
interface UseUserPaymentAppsResult {
  userPaymentApps: UserPaymentApp[];
  isLoading: boolean;
  isError: Error | null; // any の代わりに Error | null を使用
  updateUserPaymentApps: (orderedAppIds: string[]) => Promise<boolean>;
  mutate: KeyedMutator<UserPaymentApp[]>;
}

export function useUserPaymentApps(): UseUserPaymentAppsResult {
  const { user } = useAuth();
  const userId = user?.id;

  // SWRキー: ユーザーIDに基づいて動的に変化
  const swrKey = userId ? `user_payment_apps_for_${userId}` : null;

  const { data, error, isLoading, mutate } = useSWR<UserPaymentApp[]>(swrKey, async () => {
      if (!userId) return []; // ユーザーがいなければ空を返す
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

      // payment_app が null の可能性があるためフィルタリングし、型ガードを適用
      return typedData?.filter((upa): upa is UserPaymentApp & { payment_app: PaymentApp } => !!upa.payment_app) || [];
  }, {
      revalidateOnFocus: true,
      dedupingInterval: 5000,
  });


  // ユーザーの決済アプリ選択を更新する関数 (優先度も考慮)
  const updateUserPaymentApps = useCallback(async (orderedAppIds: string[]) => {
    if (!userId) return false;

    try {
      // 1. 現在のユーザーのアプリを取得 (トランザクションの一部として考える)
      const { data: currentAppsData, error: fetchError } = await supabase
        .from('user_payment_apps')
        .select('payment_app_id') // 必要なフィールドのみ選択
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
      const appsToDelete = Array.from(currentAppIds).filter((id: string) => !newAppIdsSet.has(id));

      // --- 操作を実行 (理想的にはトランザクション内だが、Supabase JS クライアントは直接サポートしていない) ---
      // 3a. 選択されなくなったアプリを削除
      if (appsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('user_payment_apps')
          .delete()
          .eq('user_id', userId) // 現在のユーザーのデータのみ削除することを保証
          .in('payment_app_id', appsToDelete);
        if (deleteError) {
            console.error("Delete error:", deleteError);
            throw deleteError;
        }
      }

      // 3b. 新しい選択と順序をUpsert
      if (appsToUpsert.length > 0) {
          const { error: upsertError } = await supabase
              .from('user_payment_apps')
              .upsert(appsToUpsert, { onConflict: 'user_id, payment_app_id' }); // 利用可能であれば、より明確にするために制約名を使用
          if (upsertError) {
              console.error("Upsert error:", upsertError);
              throw upsertError;
          }
      }
      // --- 操作終了 ---

      // 4. SWRキャッシュを更新してUIに即時反映
      // ここではオプティミスティックアップデートの方が良いかもしれないが、再検証の方がシンプル
      await mutate(); // 再フェッチを実行
      return true;

    } catch (error) {
      console.error('Error updating user payment apps:', error);
      return false;
    }
  }, [userId, mutate]);


  return {
    userPaymentApps: data || [],
    isLoading,
    isError: error,
    updateUserPaymentApps,
    mutate,
  };
} 