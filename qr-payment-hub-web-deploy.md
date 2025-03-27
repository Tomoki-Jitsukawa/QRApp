# QR決済アプリHub Webアプリケーション デプロイガイド

このドキュメントは、QR決済アプリHub Webアプリケーションの開発環境セットアップから本番環境へのデプロイまでの手順を説明します。

## 1. 開発環境セットアップ

### Next.js環境のセットアップ

1. **Node.jsのインストール**
   - [Node.js公式サイト](https://nodejs.org/)から最新のLTS版をダウンロード
   - インストール後、ターミナルで確認:
     ```bash
     node -v
     npm -v
     ```

2. **プロジェクトの作成**
   ```bash
   # npxを使用してNext.jsプロジェクトを作成（TypeScript対応）
   npx create-next-app@latest qr-payment-hub --typescript
   cd qr-payment-hub
   ```

3. **必要なパッケージのインストール**
   ```bash
   # ベースライブラリ
   npm install @supabase/supabase-js swr qrcode.react

   # スタイリング
   npm install tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   
   # 開発ツール
   npm install -D @types/qrcode.react
   ```

4. **Tailwind CSSの設定**
   
   `tailwind.config.js`を編集:
   ```javascript
   module.exports = {
     content: [
       "./pages/**/*.{js,ts,jsx,tsx}",
       "./components/**/*.{js,ts,jsx,tsx}",
     ],
     theme: {
       extend: {},
     },
     plugins: [],
   }
   ```
   
   `styles/globals.css`を編集:
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

### Supabase環境のセットアップ

1. **Supabaseアカウントの作成**
   - [Supabase公式サイト](https://supabase.com/)にアクセス
   - GitHubアカウントでサインアップ

2. **新しいプロジェクトの作成**
   - Supabaseダッシュボードから「New Project」をクリック
   - プロジェクト名、パスワード、リージョンを設定
   - 無料枠で十分な機能が利用可能

3. **データベーススキーマの設定**
   - SQLエディタを開く
   - 設計書に記載されたテーブル作成SQLを実行

4. **APIキーとURLの取得**
   - プロジェクト設定 > API から以下の情報をコピー:
     - Project URL
     - anon/public key
   - これらは後でNext.jsアプリに設定します

5. **RLSポリシーの設定**
   - Authentication > Policies からテーブルごとのRLSを有効化
   - 各テーブルに必要なポリシーを追加

## 2. ローカル開発環境の設定

1. **環境変数の設定**

   プロジェクトルートに`.env.local`ファイルを作成:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

2. **Supabaseクライアントの設定**

   `lib/supabase.ts`ファイルを作成:
   ```typescript
   import { createClient } from '@supabase/supabase-js';

   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
   const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

   export const supabase = createClient(supabaseUrl, supabaseAnonKey);
   ```

3. **認証コンポーネントの作成**

   `components/Auth.tsx`を作成:
   ```tsx
   import { useState } from 'react';
   import { supabase } from '../lib/supabase';

   export default function Auth() {
     const [loading, setLoading] = useState(false);
     const [email, setEmail] = useState('');
     
     const handleLogin = async (e: React.FormEvent) => {
       e.preventDefault();
       setLoading(true);
       
       const { error } = await supabase.auth.signIn({ email });
       
       if (error) {
         alert(error.message);
       } else {
         alert('Check your email for the login link!');
       }
       setLoading(false);
     };
     
     return (
       <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
         <h1 className="text-2xl font-bold mb-6">QR決済アプリHub</h1>
         <p className="mb-4">サインインして、あなた専用のQR決済ハブを設定しましょう。</p>
         <form onSubmit={handleLogin}>
           <input
             className="w-full p-2 border rounded mb-4"
             type="email"
             placeholder="メールアドレス"
             value={email}
             onChange={(e) => setEmail(e.target.value)}
             required
           />
           <button
             className="w-full bg-blue-500 text-white p-2 rounded"
             type="submit"
             disabled={loading}
           >
             {loading ? '処理中...' : 'マジックリンクを送信'}
           </button>
         </form>
       </div>
     );
   }
   ```

4. **初期データのセットアップ**

   Supabase SQLエディタで実行:
   ```sql
   -- QR決済アプリのサンプルデータ
   INSERT INTO payment_apps (name, logo_url, web_url, ios_url_scheme, android_url_scheme, app_store_url, play_store_url)
   VALUES
   ('PayPay', 'https://example.com/paypay.png', 'https://paypay.ne.jp/', 'paypay://', 'jp.ne.paypay.android.app://', 'https://apps.apple.com/jp/app/paypay/id1435783608', 'https://play.google.com/store/apps/details?id=jp.ne.paypay.android'),
   ('LINE Pay', 'https://example.com/linepay.png', 'https://line.me/ja/pay', 'line://', 'line://', 'https://apps.apple.com/jp/app/line/id443904275', 'https://play.google.com/store/apps/details?id=jp.naver.line.android'),
   ('楽天ペイ', 'https://example.com/rakutenpay.png', 'https://pay.rakuten.co.jp/', 'rakutenpay://', 'jp.co.rakuten.pay://', 'https://apps.apple.com/jp/app/楽天ペイ/id1139755229', 'https://play.google.com/store/apps/details?id=jp.co.rakuten.pay');
   ```

5. **開発サーバーの起動**

   ```bash
   npm run dev
   ```

   ブラウザで http://localhost:3000 にアクセスして動作確認

## 3. アプリケーションの基本実装

### 1. ホームページの作成

`pages/index.tsx`を編集:

```tsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Auth from '../components/Auth';
import PaymentAppGrid from '../components/PaymentAppGrid';

export default function Home() {
  const [session, setSession] = useState(null);
  
  useEffect(() => {
    // セッション状態の取得と監視
    setSession(supabase.auth.session());
    
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setSession(session);
      }
    );
    
    return () => {
      authListener?.unsubscribe();
    };
  }, []);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {!session ? (
          <Auth />
        ) : (
          <PaymentAppGrid userId={session.user.id} />
        )}
      </div>
    </div>
  );
}
```

### 2. 決済アプリカードの実装

`components/PaymentAppCard.tsx`を作成:

```tsx
import Image from 'next/image';
import { useCallback } from 'react';
import QRCode from 'qrcode.react';

export default function PaymentAppCard({ app, isMobile }) {
  const handleOpenApp = useCallback(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    
    let url = app.web_url; // デフォルトはウェブURL
    
    if (isIOS && app.ios_url_scheme) {
      url = app.ios_url_scheme;
    } else if (isAndroid && app.android_url_scheme) {
      url = app.android_url_scheme;
    }
    
    // タイムアウトでアプリ起動確認
    const timeout = setTimeout(() => {
      // アプリが起動