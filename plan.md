# ポイントアプリHubへの変更計画

## 1. 概要

QR決済アプリHubからポイントアプリHubへの変更プロジェクト計画書です。
このプロジェクトでは、ユーザーが複数のポイントアプリを一か所で管理し、素早く起動できるウェブアプリケーションに改修します。

## 2. 対象ポイントアプリ

以下の5つのポイントアプリを対象とします：

1. Vポイント
2. 楽天ポイント
3. dポイント（ドコモ）
4. Ponta（Pontaカード）
5. PayPayポイント

## 3. 変更ファイル一覧

### 3.1 型定義ファイル
- `qr-app/app/types/index.ts`：PaymentApp → PointApp、UserPaymentApp → UserPointApp に変更

### 3.2 APIルート
- `qr-app/app/api/payment-apps/route.ts` → `qr-app/app/api/point-apps/route.ts`（新規作成）
- `qr-app/app/api/recognize-image/route.ts`：プロンプト修正

### 3.3 フック
- `qr-app/app/hooks/usePaymentApps.ts` → `qr-app/app/hooks/usePointApps.ts`（新規作成）

### 3.4 コンポーネント
- `qr-app/app/components/PaymentAppCard.tsx` → `qr-app/app/components/PointAppCard.tsx`（新規作成）
- `qr-app/app/components/PaymentAppGrid.tsx` → `qr-app/app/components/PointAppGrid.tsx`（新規作成）
- `qr-app/app/components/Dashboard.tsx`：更新（import変更、関数名変更）
- `qr-app/app/components/AppSelector.tsx`：更新（import変更、関数名変更）
- `qr-app/app/components/PrioritySettings.tsx`：更新（import変更、関数名変更）
- `qr-app/app/components/SettingsDialog.tsx`：更新（import変更、関数名変更）

### 3.5 その他
- `qr-app/app/lib/deepLink.ts`：テキスト・URL更新
- `qr-app/public/images/`：ポイントアプリのロゴ画像追加

## 4. 具体的な変更内容

### 4.1 型定義の変更 (`qr-app/app/types/index.ts`)

```typescript
// 変更前のコード
export interface PaymentApp {
  id: string;
  name: string;
  logo_url?: string;
  web_url: string;
  ios_url_scheme?: string;
  android_url_scheme?: string;
  app_store_url?: string;
  play_store_url?: string;
  api_available: boolean;
  created_at?: string;
}

export interface UserPaymentApp {
  id: string;
  user_id: string;
  payment_app_id: string;
  payment_app?: PaymentApp;
  priority?: number | null;
  is_active: boolean;
  created_at?: string;
}

// 変更後のコード
export interface PointApp {
  id: string;
  name: string;
  logo_url?: string;
  web_url: string;
  ios_url_scheme?: string;
  android_url_scheme?: string;
  app_store_url?: string;
  play_store_url?: string;
  api_available: boolean;
  created_at?: string;
}

export interface UserPointApp {
  id: string;
  user_id: string;
  point_app_id: string;
  point_app?: PointApp;
  priority?: number | null;
  is_active: boolean;
  created_at?: string;
}

// 残高情報の型定義（フェーズ2）
export interface BalanceInfo {
  id: string;
  user_id: string;
  point_app_id: string;  // 変更: payment_app_id → point_app_id
  point_app?: PointApp;  // 変更: payment_app → point_app
  balance: number;
  points: number;
  expiry_date?: string;  // 追加: 有効期限
  last_updated?: string;
}
```

### 4.2 APIルートの変更

#### 4.2.1 新規作成: `qr-app/app/api/point-apps/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { PointApp } from '../../types';

// サンプルデータ：主要なポイントアプリの情報
const pointApps: PointApp[] = [
  {
    id: '1',
    name: 'Vポイント',
    logo_url: '/images/vpoint_logo.png',
    web_url: 'https://vpoint.jp/',
    ios_url_scheme: 'vpoint://',
    android_url_scheme: 'vpoint://',
    app_store_url: 'https://apps.apple.com/jp/app/vpoint/id939540582',
    play_store_url: 'https://play.google.com/store/apps/details?id=jp.co.vpoint.app',
    api_available: false
  },
  {
    id: '2',
    name: '楽天ポイント',
    logo_url: '/images/rakuten_point_logo.png',
    web_url: 'https://point.rakuten.co.jp/',
    ios_url_scheme: 'rakuten://',
    android_url_scheme: 'rakuten://',
    app_store_url: 'https://apps.apple.com/jp/app/%E6%A5%BD%E5%A4%A9%E3%83%9D%E3%82%A4%E3%83%B3%E3%83%88%E3%82%AF%E3%83%A9%E3%83%96/id1094107454',
    play_store_url: 'https://play.google.com/store/apps/details?id=jp.co.rakuten.pointclub',
    api_available: false
  },
  {
    id: '3',
    name: 'dポイント',
    logo_url: '/images/dpoint_logo.png',
    web_url: 'https://dpoint.jp/',
    ios_url_scheme: 'dpoint://',
    android_url_scheme: 'dpoint://',
    app_store_url: 'https://apps.apple.com/jp/app/d%E3%83%9D%E3%82%A4%E3%83%B3%E3%83%88%E3%82%AF%E3%83%A9%E3%83%96/id1093466147',
    play_store_url: 'https://play.google.com/store/apps/details?id=com.nttdocomo.dpoint',
    api_available: false
  },
  {
    id: '4',
    name: 'Ponta',
    logo_url: '/images/ponta_logo.png',
    web_url: 'https://point.recruit.co.jp/',
    ios_url_scheme: 'ponta://',
    android_url_scheme: 'ponta://',
    app_store_url: 'https://apps.apple.com/jp/app/ponta/id533199470',
    play_store_url: 'https://play.google.com/store/apps/details?id=jp.co.recruit.pontalink',
    api_available: false
  },
  {
    id: '5',
    name: 'PayPayポイント',
    logo_url: '/images/paypay_point_logo.png',
    web_url: 'https://www.paypay.ne.jp/point/',
    ios_url_scheme: 'paypay://',
    android_url_scheme: 'paypay://',
    app_store_url: 'https://apps.apple.com/jp/app/paypay-qr/id1435783608',
    play_store_url: 'https://play.google.com/store/apps/details?id=jp.ne.paypay.android.app',
    api_available: false
  }
];

export async function GET() {
  return NextResponse.json(pointApps);
}

export async function POST(request: Request) {
  try {
    const newApp = await request.json();
    
    // Validation
    if (!newApp.name || !newApp.web_url) {
      return NextResponse.json(
        { error: "必須項目が不足しています" },
        { status: 400 }
      );
    }
    
    // 実際のアプリではDBに保存
    const mockNewApp = {
      ...newApp,
      id: (pointApps.length + 1).toString(),
      api_available: newApp.api_available || false,
      created_at: new Date().toISOString()
    };
    
    return NextResponse.json(mockNewApp, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "不正なリクエストです" },
      { status: 400 }
    );
  }
}
```

#### 4.2.2 更新: `qr-app/app/api/recognize-image/route.ts`

```typescript
// 変更前
const prompt = `
  この画像に写っているQRコード決済サービスのロゴを特定し、その正式名称のリストだけをJSON配列形式で返してください。
  例: ["PayPay", "楽天ペイ", "d払い"]
  ロゴが見つからない場合や、QRコード決済サービス以外のロゴの場合は、空の配列 [] を返してください。
  余計な説明や前置きは不要です。JSON配列のみを返してください。
  認識可能なサービス例: PayPay, LINE Pay, 楽天ペイ, d払い, au PAY, メルペイ
`;

// 変更後
const prompt = `
  この画像に写っているポイントカードやポイントサービスのロゴを特定し、その正式名称のリストだけをJSON配列形式で返してください。
  例: ["Vポイント", "楽天ポイント", "dポイント"]
  ロゴが見つからない場合や、ポイントサービス以外のロゴの場合は、空の配列 [] を返してください。
  余計な説明や前置きは不要です。JSON配列のみを返してください。
  認識可能なサービス例: Vポイント, 楽天ポイント, dポイント, Ponta, PayPayポイント
`;

// 変更前
const extracted = text.match(/(PayPay|LINE Pay|楽天ペイ|d払い|au PAY|メルペイ)/g);

// 変更後
const extracted = text.match(/(Vポイント|楽天ポイント|dポイント|Ponta|PayPayポイント)/g);
```

### 4.3 フックの新規作成 (`qr-app/app/hooks/usePointApps.ts`)

```typescript
'use client';

import useSWR from 'swr';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';
import { UserPointApp, PointApp } from '../types';

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
      const savedApps = localStorage.getItem('guestSelectedPointApps'); // 変更: キー名変更
      if (savedApps) {
        const selectedIds = JSON.parse(savedApps) as string[];
        
        // 選択されたIDに対応するアプリを返す
        return selectedIds.map((id, index) => {
          const app = pointApps.find((a: PointApp) => a.id === id);
          if (!app) return null;
          
          return {
            id: `guest-${id}`,
            user_id: 'guest',
            point_app_id: id, // 変更: payment_app_id → point_app_id
            point_app: app,   // 変更: payment_app → point_app
            display_order: index,
            is_active: true
          } as UserPointApp;
        }).filter(Boolean) as UserPointApp[];
      }
    } catch (e) {
      console.error('Error parsing guest selected apps:', e);
    }
    
    return [];
  };
  
  const { data, error, mutate } = useSWR(
    user ? `user-point-apps-${user.id}` : 'guest-point-apps', // キー名変更
    async () => {
      if (user) {
        // 認証済みユーザー
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
            point_app_id: appId, // 変更: payment_app_id → point_app_id
            point_app: app,      // 変更: payment_app → point_app
            display_order: index,
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
      localStorage.setItem('guestSelectedPointApps', JSON.stringify(appIds)); // 変更: キー名変更
      
      const newGuestApps = appIds.map((appId, index) => {
        const app = pointApps.find((a: PointApp) => a.id === appId);
        if (!app) return null;
        
        return {
          id: `guest-${appId}`,
          user_id: 'guest',
          point_app_id: appId, // 変更: payment_app_id → point_app_id
          point_app: app,      // 変更: payment_app → point_app
          display_order: index,
          is_active: true
        } as UserPointApp;
      }).filter(Boolean) as UserPointApp[];
      
      await mutate(newGuestApps, false);
      return true;
    }
  };
  
  // 表示順を更新する関数
  const updateDisplayOrder = async (updatedApps: { id: string; display_order: number }[]) => {
    if (user) {
      // 認証済みユーザー
      // 実装省略
    } else {
      // ゲストモード
      const currentData = getGuestSelected();
      const sortedIds = updatedApps
        .sort((a, b) => a.display_order - b.display_order)
        .map(app => app.id.replace('guest-', ''));
      
      localStorage.setItem('guestSelectedPointApps', JSON.stringify(sortedIds)); // 変更: キー名変更
      
      await mutate();
    }
  };
  
  return {
    userPointApps: data || [], // 変更: userPaymentApps → userPointApps
    isLoading: !data,
    isError: error,
    updateUserPointApps, // 変更: updateUserPaymentApps → updateUserPointApps
    updateDisplayOrder,
    mutate
  };
}
```

### 4.4 コンポーネント変更

#### 4.4.1 新規作成: `qr-app/app/components/PointAppCard.tsx`

```typescript
'use client';

import Image from 'next/image';
import { useState } from 'react';
import { PointApp } from '../types'; // 変更: PaymentApp → PointApp
import { openAppOrStore } from '../lib/deepLink';

interface PointAppCardProps {
  app: PointApp;
  onClick?: (app: PointApp) => void;
}

export default function PointAppCard({ app, onClick }: PointAppCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleClick = async () => {
    if (onClick) {
      onClick(app);
      return;
    }
    
    setIsLoading(true);
    try {
      await openAppOrStore(app);
    } catch (error) {
      console.error('Failed to open app:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      onClick={handleClick}
    >
      {app.logo_url ? (
        <div className="relative w-16 h-16 mb-2">
          <Image
            src={app.logo_url}
            alt={`${app.name} logo`}
            fill
            className="object-contain"
          />
        </div>
      ) : (
        <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full mb-2 flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-500 dark:text-gray-400">
            {app.name.charAt(0)}
          </span>
        </div>
      )}
      
      <h3 className="text-sm font-medium text-center">{app.name}</h3>
      
      {isLoading && (
        <div className="mt-2 animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-white"></div>
      )}
    </div>
  );
}
```

#### 4.4.2 新規作成: `qr-app/app/components/PointAppGrid.tsx`

```typescript
'use client';

import { UserPointApp } from '../types'; // 変更: UserPaymentApp → UserPointApp
import PointAppCard from './PointAppCard'; // 変更: PaymentAppCard → PointAppCard

interface PointAppGridProps {
  apps: UserPointApp[]; // 変更: UserPaymentApp → UserPointApp
  isLoading?: boolean;
}

export default function PointAppGrid({ apps, isLoading = false }: PointAppGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
        {[...Array(5)].map((_, i) => (
          <div 
            key={`skeleton-${i}`}
            className="bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md p-4 h-32 animate-pulse"
          />
        ))}
      </div>
    );
  }
  
  if (!apps || apps.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500 dark:text-gray-400">
          ポイントアプリが選択されていません。設定から追加してください。
        </p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
      {apps.map(userApp => (
        <PointAppCard 
          key={userApp.id} 
          app={userApp.point_app!} // 変更: payment_app → point_app
        />
      ))}
    </div>
  );
}
```

#### 4.4.3 更新: `qr-app/app/components/Dashboard.tsx` (主要部分のみ抜粋)

```typescript
// 変更箇所のみ抜粋

// 変更前
import { useUserPaymentApps } from '../hooks/usePaymentApps';
import PaymentAppGrid from './PaymentAppGrid';

// 変更後
import { useUserPointApps } from '../hooks/usePointApps';
import PointAppGrid from './PointAppGrid';

// 関数内
function Dashboard() {
  // 変更前
  const { userPaymentApps, isLoading: isLoadingApps } = useUserPaymentApps();
  
  // 変更後
  const { userPointApps, isLoading: isLoadingApps } = useUserPointApps();
  
  // JSX部分 変更前
  <PaymentAppGrid apps={userPaymentApps} isLoading={isLoadingApps} />
  
  // JSX部分 変更後
  <PointAppGrid apps={userPointApps} isLoading={isLoadingApps} />
}
```

### 4.5 その他の変更

#### 4.5.1 ローカルストレージキーの移行処理

```typescript
// 既存のローカルストレージからデータを移行する処理
// アプリの起動時などに1回だけ実行
function migrateLocalStorage() {
  if (typeof window === 'undefined') return;
  
  try {
    // 旧データの取得
    const oldData = localStorage.getItem('guestSelectedApps');
    if (oldData && !localStorage.getItem('guestSelectedPointApps')) {
      // 新しいキーに保存
      localStorage.setItem('guestSelectedPointApps', oldData);
      console.log('ローカルストレージデータを移行しました');
    }
  } catch (e) {
    console.error('ローカルストレージ移行エラー:', e);
  }
}
```

## 5. データベース変更 (Supabase)

```sql
-- テーブル名変更
ALTER TABLE payment_apps RENAME TO point_apps;
ALTER TABLE user_payment_apps RENAME TO user_point_apps;

-- カラム名変更
ALTER TABLE user_point_apps RENAME COLUMN payment_app_id TO point_app_id;

-- 外部キー制約の更新
ALTER TABLE user_point_apps 
  DROP CONSTRAINT user_payment_apps_payment_app_id_fkey,
  ADD CONSTRAINT user_point_apps_point_app_id_fkey 
  FOREIGN KEY (point_app_id) REFERENCES point_apps(id) ON DELETE CASCADE;

-- RLSポリシーの更新
DROP POLICY IF EXISTS "Allow individual user access" ON public.user_point_apps;

CREATE POLICY "Allow individual user access"
ON public.user_point_apps
FOR ALL
USING (auth.uid() = user_id);
```

## 6. 実装手順

### 6.1 初期セットアップ・開発環境

1. 開発ブランチの作成: `git checkout -b feature/point-app-migration`
2. 必要なロゴ画像の準備と追加

### 6.2 実装順序

1. 型定義ファイル (`types/index.ts`) の更新
   - 既存の型をコピーして新しい型を作成
   - 古い型は残しておくが、非推奨コメントを追加

2. 新規APIエンドポイント作成
   - `point-apps/route.ts` を作成
   - `recognize-image/route.ts` のプロンプト更新

3. フックの新規作成
   - `usePointApps.ts` の作成

4. コアコンポーネントの作成
   - `PointAppCard.tsx`
   - `PointAppGrid.tsx`

5. 主要ユーザーインターフェースの更新
   - `Dashboard.tsx` の更新
   - `AppSelector.tsx` の更新
   - `PrioritySettings.tsx` の更新
   - `SettingsDialog.tsx` の更新

6. ローカルストレージ移行ロジックの実装
   - `_app.tsx` または `layout.tsx` に移行処理追加

7. テスト
   - 各機能の動作確認
   - エラーハンドリングの確認

8. クリーンアップ
   - 古いファイルの削除または非推奨化

## 7. テスト項目

1. ポイントアプリ一覧の表示
2. アプリの選択と保存
3. 優先順序の設定
4. カメラ連携と画像認識
5. アプリ起動機能
6. ダークモード対応
7. レスポンシブデザイン
8. ローカルストレージ移行

## 8. デプロイ計画

1. マイグレーションスクリプトの作成（Supabase DB変更用）
2. ステージング環境でのテスト
3. 本番環境へのデプロイ（Vercel）
4. モニタリングとバグ修正
