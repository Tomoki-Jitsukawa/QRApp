# QR決済アプリHub Webアプリケーション設計書

## 1. 概要

複数のQR決済アプリの情報を一元管理し、シームレスな支払い体験を提供するWebアプリケーションの設計書です。ユーザーはPCやスマートフォンのブラウザからアクセスでき、各QR決済アプリへのリンクを通じて素早く決済アプリを起動できます。

### フェーズ1（MVP）
- 各QR決済アプリへのURLスキームによる遷移機能
- レスポンシブなUI/UXデザイン

### フェーズ2以降
- 各アプリの残高表示
- ポイント情報表示
- キャンペーン情報の表示

## 2. 技術要素

### フロントエンド
- **フレームワーク**: Next.js (React)
  - SSRによる高速な初期ロード
  - SEO対策が容易
  - レスポンシブデザインの実装が容易
  - TypeScriptサポート

- **スタイリング**: Tailwind CSS
  - ユーティリティファーストのアプローチ
  - レスポンシブデザインの効率的な構築
  - カスタマイズ性の高さ

### バックエンド
- **フレームワーク**: Next.js API Routes
  - フロントエンドと統合された開発環境
  - サーバーレス機能によるスケーリング

### データベース
- **Supabase**
  - PostgreSQLベースの堅牢なデータベース
  - リアルタイムサブスクリプション機能
  - 組み込み認証システム
  - RLS (Row Level Security) によるデータ保護
  - 拡張性の高いストレージソリューション

### ホスティング
- **Vercel**
  - Next.jsに最適化されたホスティング
  - グローバルCDN
  - 自動デプロイとプレビュー機能
  - 無料枠あり

### 認証
- **Supabase Authentication**
  - メール/パスワード認証
  - ソーシャルログイン（Google, Appleなど）
  - JWTトークンベースの認証

## 3. アプリ構造

### プロジェクト構成
```
src/
├── pages/              // Next.jsのページコンポーネント
│   ├── index.tsx       // ホームページ（ダッシュボード）
│   ├── auth/           // 認証関連ページ
│   ├── settings/       // 設定ページ
│   └── api/            // APIエンドポイント
├── components/         // 再利用可能なコンポーネント
│   ├── Layout.tsx      // 共通レイアウト
│   ├── PaymentAppCard.tsx // 決済アプリカード
│   └── BalanceDisplay.tsx // 残高表示（フェーズ2）
├── lib/                // ユーティリティ関数
│   ├── supabase.ts     // Supabase クライアント
│   └── deepLink.ts     // ディープリンク関数
├── hooks/              // カスタムReactフック
│   ├── useAuth.ts      // 認証フック
│   └── usePaymentApps.ts // 決済アプリデータフック
├── types/              // TypeScript型定義
│   └── index.ts        // 共通型定義
└── styles/             // グローバルスタイル
    └── globals.css     // Tailwind CSS設定
```

### データモデル (Supabase)
```sql
-- 決済アプリテーブル
CREATE TABLE payment_apps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  logo_url TEXT,
  web_url TEXT,          -- 通常のWebリンク
  ios_url_scheme TEXT,   -- iOSディープリンク
  android_url_scheme TEXT, -- Androidディープリンク
  app_store_url TEXT,
  play_store_url TEXT,
  api_available BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ユーザープロファイル
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ユーザーの決済アプリ設定
CREATE TABLE user_payment_apps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  payment_app_id UUID REFERENCES payment_apps(id) ON DELETE CASCADE,
  display_order INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, payment_app_id)
);

-- 残高情報（フェーズ2）
CREATE TABLE balance_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  payment_app_id UUID REFERENCES payment_apps(id) ON DELETE CASCADE,
  balance DECIMAL,
  points DECIMAL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, payment_app_id)
);
```

## 4. 技術的課題と解決策

### 1. Web環境からモバイルアプリへの遷移
**課題**: ブラウザからQR決済アプリを起動する方法の実装

**解決策**:
- URLスキームによるディープリンク
- UA検出によるデバイス分岐（iOS/Android/PC）
- PCブラウザからはQRコード表示機能の追加

```typescript
// デバイスタイプに応じてURLを生成する関数
export function getAppLink(app: PaymentApp): string {
  // ユーザーエージェントでデバイス検出
  const userAgent = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isAndroid = /android/.test(userAgent);
  
  if (isIOS && app.ios_url_scheme) {
    return app.ios_url_scheme;
  } else if (isAndroid && app.android_url_scheme) {
    return app.android_url_scheme;
  } else {
    // PCやその他のデバイスの場合は通常のWebURLを返す
    return app.web_url;
  }
}

// アプリを開く関数
export function openPaymentApp(app: PaymentApp): void {
  const link = getAppLink(app);
  
  // タイムアウトでアプリ起動確認
  const timeout = setTimeout(() => {
    // アプリが起動しなかった場合はストアページへ
    window.location.href = isIOS ? app.app_store_url : app.play_store_url;
  }, 1000);
  
  // リンクを開く
  window.location.href = link;
  
  // イベントリスナーでタイムアウトをクリア
  window.addEventListener('pagehide', () => {
    clearTimeout(timeout);
  });
}
```

### 2. PC環境での利便性向上
**課題**: PCユーザーはQRコードをスキャンして利用する必要がある

**解決策**:
- QRコード生成機能の実装
- スマートフォンでスキャンして対応アプリに遷移

```tsx
// QRコード表示コンポーネント
import QRCode from 'qrcode.react';

const QRCodeDisplay = ({ url, appName }) => {
  return (
    <div className="p-4 text-center">
      <h3 className="mb-2 font-bold">{appName}を起動</h3>
      <div className="inline-block p-2 bg-white rounded-lg">
        <QRCode value={url} size={180} />
      </div>
      <p className="mt-2 text-sm text-gray-600">
        スマートフォンでスキャンして{appName}を開きます
      </p>
    </div>
  );
};
```

### 3. レスポンシブデザインの実装
**課題**: 様々なデバイスサイズに対応したUI設計

**解決策**:
- Tailwind CSSのレスポンシブユーティリティを活用
- モバイルファーストのデザインアプローチ
- メディアクエリによる条件付きレンダリング

```tsx
// レスポンシブなグリッドレイアウト例
<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
  {paymentApps.map(app => (
    <PaymentAppCard key={app.id} app={app} />
  ))}
</div>
```

### 4. Supabaseとの連携
**課題**: リアルタイムデータ同期と認証の実装

**解決策**:
- Supabase Javascriptクライアントの利用
- SWRを使用したデータフェッチングと状態管理
- サーバーサイドでのセッション検証

```typescript
// Supabaseクライアントの設定
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// カスタムフックを使用したデータ取得
import useSWR from 'swr';

export function usePaymentApps() {
  const { data, error, mutate } = useSWR('payment-apps', async () => {
    const { data, error } = await supabase
      .from('user_payment_apps')
      .select('*, payment_apps(*)')
      .order('display_order');
      
    if (error) throw error;
    return data;
  });
  
  return {
    paymentApps: data,
    isLoading: !error && !data,
    isError: error,
    mutate
  };
}
```

## 5. ユーザーフロー（MVP）

1. **アプリ初回アクセス**
   - Webブラウザでサイトにアクセス
   - ユーザー登録またはゲストモードを選択
   - 利用するQR決済アプリの選択

2. **ダッシュボード画面**
   - 選択した決済アプリのグリッド表示
   - モバイルの場合：タップでURLスキームにより対応アプリを起動
   - PCの場合：QRコードを表示して、スマホでスキャン可能

3. **設定画面**
   - 表示アプリの追加・削除
   - 表示順のカスタマイズ
   - テーマ設定（ライト/ダークモード）

## 6. サポート対象QR決済アプリ（日本市場向け）

### 初期サポート（MVP）
- PayPay
- LINE Pay
- 楽天ペイ
- d払い
- au PAY
- メルペイ

### 将来的な拡張
- ファミペイ
- PayB
- ゆうちょPay
- その他地域・業界特化型QRコード決済

## 7. 開発ロードマップ

### フェーズ1（MVP）- 1-2ヶ月
- Next.js環境構築
- Supabaseセットアップとテーブル設計
- 認証フロー実装
- レスポンシブUI/UX設計
- URLスキーム連携実装（モバイル）
- QRコード表示機能（PC）
- Vercelへのデプロイ

### フェーズ2 - 2-3ヶ月
- 残高表示機能
- ポイント情報表示
- リアルタイムデータ同期
- ユーザー設定の保存と同期

### フェーズ3 - 3-4ヶ月
- キャンペーン情報表示
- 利用履歴表示
- PWA対応（オフライン機能）
- 多言語対応

## 8. Next.js特有の開発手法

### SSR/SSG活用
- 初期ロード時のパフォーマンス向上
- SEO対策
- データプリフェッチ

```typescript
// getServerSidePropsの例
export async function getServerSideProps({ req }) {
  const { user } = await supabase.auth.api.getUserByCookie(req);
  
  if (!user) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }
  
  const { data } = await supabase
    .from('payment_apps')
    .select('*');
    
  return {
    props: {
      initialData: data || [],
    },
  };
}
```

### API Routes
- サーバーサイドロジックの実装
- 外部APIとの連携
- 認証と認可の処理

```typescript
// API Routeの例
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { user } = await supabase.auth.api.getUserByCookie(req);
  
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('user_payment_apps')
      .select('*, payment_apps(*)')
      .eq('user_id', user.id)
      .order('display_order');
      
    if (error) return res.status(400).json({ error });
    return res.status(200).json(data);
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
```

## 9. Supabase特有の開発手法

### データセキュリティ（RLS）
```sql
-- Row Level Security の設定例
ALTER TABLE user_payment_apps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ユーザーは自分のデータのみアクセス可能" 
  ON user_payment_apps 
  FOR ALL 
  USING (auth.uid() = user_id);
```

### リアルタイムサブスクリプション
```typescript
// リアルタイム更新の購読
const subscription = supabase
  .from('balance_info')
  .on('*', (payload) => {
    console.log('Change received!', payload);
    mutate(); // SWRのキャッシュを更新
  })
  .subscribe();

// クリーンアップ
return () => {
  subscription.unsubscribe();
};
```

## 10. Webアプリケーションのメリットと課題

### メリット
1. **クロスプラットフォーム互換性**:
   - PC、スマートフォン、タブレットなど様々なデバイスでアクセス可能
   - ブラウザがあれば利用可能（インストール不要）

2. **更新の容易さ**:
   - 更新はサーバーサイドで一括適用可能
   - ユーザーによるアップデート操作が不要

3. **低い開発コスト**:
   - 単一のコードベースで複数プラットフォームに対応
   - ストア審査プロセスが不要

4. **SEO対策とシェアリング**:
   - 検索エンジンからの流入が可能
   - SNSでのシェアが容易

### 課題と対策
1. **モバイルアプリ連携の制限**:
   - WebからのURLスキーム起動はOS/ブラウザによって動作が異なる
   - → デバイス検出とフォールバックメカニズムの実装

2. **オフライン対応**:
   - ネットワーク接続が必要
   - → PWA技術によるオフラインキャッシュの実装

3. **ネイティブ機能アクセス**:
   - カメラやプッシュ通知などの機能に制限がある
   - → PWAのWeb APIを活用

## 11. セキュリティ考慮事項

- Supabaseの認証システムを利用したJWTベースの認証
- RLSによるデータアクセス制御
- 環境変数による機密情報管理
- HTTPS通信の強制
- CSP (Content Security Policy) の実装
- CSRF対策

## 12. パフォーマンス最適化

- Next.jsのイメージ最適化
- コード分割とレイジーローディング
- キャッシュ戦略（SWR/React Query）
- Lighthouse監査の定期実施
- WebVitalsの監視

## 13. 将来的な拡張性

- PWA対応による疑似ネイティブ体験
- QRコード読み取り機能（WebカメラAPI利用）
- 決済履歴の分析と支出管理機能
- パーソナライズされたキャンペーン推奨
- 多言語対応と地域ローカライズ

## 14. デプロイと運用

- Vercelを使った自動デプロイ
- CI/CDパイプラインの構築（GitHub Actions）
- 監視とアラート設定
- アナリティクスによるユーザー行動分析
- A/Bテストの実施

## 15. まとめ

Next.js + Supabaseを採用したWebアプリケーションアプローチにより、PCとモバイルの両方に対応した柔軟なQR決済アプリHubを実現できます。URLスキームを活用したディープリンク機能とPC向けのQRコード表示機能により、様々なデバイスからQR決済アプリへのシームレスな遷移が可能になります。

MVPではWebブラウザからQR決済アプリへの起動機能に集中し、その後のフェーズで残高表示やキャンペーン情報など付加価値機能を順次実装していくことで、ユーザー体験を段階的に向上させることができます。
