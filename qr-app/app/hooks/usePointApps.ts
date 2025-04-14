'use client';

import useSWR from 'swr';
import { useAuth } from './useAuth';
import { PointApp, UserPointApp } from '../types';

// REST APIからフェッチするfetcher関数
const fetcher = (url: string) => fetch(url).then(res => res.json());

// 全てのポイントアプリを取得するフック
export function useAllPointApps() {
  const { data, error, mutate } = useSWR('/api/point-apps', fetcher);
  
  return {
    pointApps: data || [],
    isLoading: !error && !data,
    isError: error,
    mutate
  };
}

// ユーザーが選択したポイントアプリを取得するフック
export function useUserPointApps() {
  const { user } = useAuth();
  const { pointApps } = useAllPointApps();
  
  // ゲストモードでの選択アプリを取得
  const getGuestSelected = () => {
    if (typeof window === 'undefined') return [];
    
    try {
      const savedApps = localStorage.getItem('guestSelectedPointApps'); // 変更: キー名
      if (savedApps) {
        const selectedIds = JSON.parse(savedApps) as string[];
        
        // 選択されたIDに対応するアプリを返す
        return selectedIds.map((id, index) => {
          const app = pointApps.find((a: PointApp) => a.id === id);
          if (!app) return null;
          
          return {
            id: `guest-${id}`,
            user_id: 'guest',
            point_app_id: id,
            point_app: app,
            priority: index,
            is_active: true
          } as UserPointApp;
        }).filter(Boolean) as UserPointApp[];
      }
    } catch (e) {
      console.error('Error parsing guest selected apps:', e);
    }
    
    return [];
  };
  
  // 旧データからの移行処理
  const migrateFromOldLocalStorage = () => {
    if (typeof window === 'undefined') return false;
    
    try {
      // 既にポイントアプリデータが存在する場合は移行不要
      if (localStorage.getItem('guestSelectedPointApps')) return false;
      
      // 旧データの取得
      const oldData = localStorage.getItem('guestSelectedApps');
      if (oldData) {
        // 新しいキーに保存
        localStorage.setItem('guestSelectedPointApps', oldData);
        console.log('ローカルストレージデータを移行しました');
        return true;
      }
    } catch (e) {
      console.error('ローカルストレージ移行エラー:', e);
    }
    
    return false;
  };
  
  // 初回マウント時に一度だけ移行処理を実行
  if (!user && typeof window !== 'undefined') {
    migrateFromOldLocalStorage();
  }
  
  const { data, error, mutate } = useSWR(
    user ? `user-point-apps-${user.id}` : 'guest-point-apps',
    async () => {
      if (user) {
        // 認証済みユーザー
        // 実際のアプリではSupabaseからデータを取得する実装となる
        return [] as UserPointApp[];
      } else {
        // ゲストモード
        return getGuestSelected();
      }
    },
    {
      revalidateOnFocus: false,
      revalidateOnMount: true,
      dedupingInterval: 1000 * 60 * 5
    }
  );
  
  // ユーザーのポイントアプリ設定を更新する関数
  const updateUserPointApps = async (appIds: string[]) => {
    if (user) {
      // 認証済みユーザー
      try {
        const newUserApps = appIds.map((appId, index) => {
          const app = pointApps.find((a: PointApp) => a.id === appId);
          return {
            id: `user-${user.id}-${appId}`,
            user_id: user.id,
            point_app_id: appId,
            point_app: app,
            priority: index,
            is_active: true
          } as UserPointApp;
        });
        
        await mutate(newUserApps, false);
        return true;
      } catch (error) {
        console.error('Error updating user point apps:', error);
        throw error;
      }
    } else {
      // ゲストモード
      localStorage.setItem('guestSelectedPointApps', JSON.stringify(appIds));
      
      const newGuestApps = appIds.map((appId, index) => {
        const app = pointApps.find((a: PointApp) => a.id === appId);
        if (!app) return null;
        
        return {
          id: `guest-${appId}`,
          user_id: 'guest',
          point_app_id: appId,
          point_app: app,
          priority: index,
          is_active: true
        } as UserPointApp;
      }).filter(Boolean) as UserPointApp[];
      
      await mutate(newGuestApps, false);
      return true;
    }
  };
  
  // 表示順を更新する関数
  const updateDisplayOrder = async (updatedApps: { id: string; priority: number }[]) => {
    if (user) {
      // 認証済みユーザー
      // 実装省略
    } else {
      // ゲストモード
      const currentData = data || [];
      const sortedIds = updatedApps
        .sort((a, b) => a.priority - b.priority)
        .map(app => app.id.replace('guest-', ''));
      
      localStorage.setItem('guestSelectedPointApps', JSON.stringify(sortedIds));
      
      await mutate();
    }
  };
  
  return {
    userPointApps: data || [],
    isLoading: !data,
    isError: error,
    updateUserPointApps,
    updateDisplayOrder,
    mutate
  };
} 