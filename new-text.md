# QR決済アプリHub 仕様書

## 1. 概要

QR決済アプリHubは、複数のQR決済サービス（PayPay, LINE Pay, 楽天ペイなど）を一つのWebアプリケーションから素早く起動・管理するためのツールです。ユーザーは頻繁に利用する決済アプリを登録し、ダッシュボードから簡単にアクセスできます。さらに、スマートフォンのカメラで店頭の対応決済サービス一覧などを撮影し、画像認識技術（Google AI Gemini API）を利用して、その場で利用可能な決済アプリの中から、ユーザーが設定した優先度に基づいて最適なアプリを起動する機能も備えています。

**主な機能:**

*   **ダッシュボード:** ユーザーが選択したQR決済アプリのアイコンを一覧表示。
*   **アプリ起動:**
    *   モバイル: アイコンタップで対応する決済アプリを直接起動（URLスキーム利用）。
    *   PC: アイコンクリックでQRコードを表示し、スマートフォンでスキャンして起動。
*   **アプリ選択:** 利用したいQR決済アプリを一覧から選択・登録。
*   **優先度設定:** 登録したアプリに利用優先度を設定し、並び替え可能。
*   **カメラ連携 & 画像認識:**
    *   スマートフォンカメラで店頭の決済手段などを撮影。
    *   撮影画像から対応決済アプリ名を認識 (Google AI Gemini API)。
    *   認識結果とユーザー設定の優先度に基づき、最適なアプリを起動候補として提示・起動。
*   **認証:**
    *   Supabaseを利用したメール/パスワード認証、マジックリンク認証。
    *   ゲストモード（設定はローカルストレージに保存）。
*   **レスポンシブデザイン:** PC、スマートフォン、タブレットに対応。
*   **ダークモード:** OS設定に連動。

## 2. 技術スタック

*   **フロントエンド:**
    *   **フレームワーク:** Next.js (v15+, App Router)
    *   **言語:** TypeScript
    *   **UIライブラリ:** React (v19+)
    *   **スタイリング:** Tailwind CSS
    *   **UIコンポーネント:** shadcn/ui (Radix UIベース)
    *   **状態管理:** SWR (データ取得), React Context (`useAuth`), `useState`, `useCallback`, `useRef`
    *   **フォーム:** React Hook Form, Zod (バリデーション)
    *   **アイコン:** Lucide React
    *   **通知:** Sonner
    *   **QRコード生成:** qrcode.react
    *   **ドラッグ＆ドロップ:** @dnd-kit
*   **バックエンド:**
    *   **フレームワーク:** Next.js API Routes
    *   **画像認識:** Google AI Gemini API (`gemini-1.5-flash-latest`) via `@google/generative-ai`
*   **データベース & 認証:** Supabase (PostgreSQL, Supabase Auth)
*   **ホスティング:** Vercel

## 3. アーキテクチャ

```mermaid
graph TD
    User[ユーザー] --> Browser[ブラウザ @ Next.js App (Vercel)]

    subgraph "Frontend (Browser)"
        Browser --> Layout[Layout (app/components/Layout.tsx)]
        Layout --> Dashboard[Dashboard (app/components/Dashboard.tsx)]
        Dashboard --> Grid[PaymentAppGrid (app/components/PaymentAppGrid.tsx)]
        Dashboard --> Settings[SettingsDialog (app/components/SettingsDialog.tsx)]
        Dashboard --> Camera[CameraCapture (app/components/CameraCapture.tsx)]
        Dashboard --> AppSelector[AppSelector (app/components/AppSelector.tsx)]

        Grid --> Card[PaymentAppCard (app/components/PaymentAppCard.tsx)]
        Settings --> Priority[PrioritySettings (app/components/PrioritySettings.tsx)]

        Dashboard --> AuthHook[useAuth (app/hooks/useAuth.ts)]
        Dashboard --> PaymentAppsHook[usePaymentApps (app/hooks/usePaymentApps.ts)]
        
        Card --> |アプリ起動指示| DeepLinkLib["DeepLink Logic (lib/deepLink.ts)"]
        DeepLinkLib --> PaymentAppsExtern["QR決済アプリ (外部)"]
        DeepLinkLib --> AppStore["アプリストア (外部)"]
        
        Dashboard --> |カメラAPIアクセス| BrowserCameraAPI[Web Camera API (getUserMedia)]
        Dashboard --> |画像認識要求| RecognizeAPI["API Route: /api/recognize-image"]
        
        AuthHook --> SupabaseClient["Supabase Client (lib/supabase.ts)"]
        PaymentAppsHook --> SupabaseClient
        PaymentAppsHook --> |優先度更新等| PaymentAPI["API Route: /api/payment-apps"]
    end

    subgraph "Backend (Vercel Serverless Functions)"
        RecognizeAPI --> GeminiAPI["Google AI Gemini API"]
        PaymentAPI --> SupabaseClientBackend["Supabase Client (Server-side)"]
    end
    
    subgraph "Data & Auth (Supabase)"
      SupabaseClient --> SupabaseService["Supabase (DB & Auth)"]
      SupabaseClientBackend --> SupabaseService
      SupabaseService --> DB[(PostgreSQL)]
      SupabaseService --> Auth[Auth Service]
    end

    User --> |ログイン/認証| Auth
    User --> |直接利用| PaymentAppsExtern
```

**ポイント:**

*   `Dashboard.tsx` が中心的な役割を果たし、各種UIコンポーネント、カスタムフック、API呼び出しを統合。
*   認証状態は `useAuth` フック、決済アプリデータ（一覧、ユーザー設定、優先度）は `usePaymentApps` フックで管理。
*   カメラ機能、画像認識API呼び出し、結果処理は `Dashboard.tsx` 内に実装されている (**注意:** `useQRCodeRecognition.ts` フックは現存しない)。
*   外部API (Gemini) との連携は、セキュリティのためNext.js API Route (`/api/recognize-image`) を介して行う。
*   ユーザーごとの決済アプリ設定（優先度含む）の更新もAPI Route (`/api/payment-apps`) 経由で行われる可能性がある（`usePaymentApps.ts` の実装による）。

## 4. ファイル構成

```
qr-app/
├── app/
│   ├── (auth)/              # 認証関連ページ (Supabaseコールバック用など)
│   ├── api/                 # APIルート
│   │   ├── payment-apps/    # ユーザーの決済アプリ設定更新API (優先度等)
│   │   │   └── route.ts
│   │   └── recognize-image/ # 画像認識API (Gemini連携)
│   │       └── route.ts
│   ├── components/          # 再利用可能なUIコンポーネント
│   │   ├── AppSelector.tsx    # 初期/設定時のアプリ選択UI
│   │   ├── CameraCapture.tsx  # カメラ撮影モーダル
│   │   ├── Dashboard.tsx      # アプリケーションのメインコンテナ
│   │   ├── Layout.tsx         # 全体のレイアウト (ヘッダー、フッター等)
│   │   ├── PaymentAppCard.tsx # 個々の決済アプリ表示カード
│   │   ├── PaymentAppGrid.tsx # 決済アプリカードをグリッド表示
│   │   ├── PrioritySettings.tsx # ドラッグ&ドロップによる優先度設定UI
│   │   └── SettingsDialog.tsx # 設定モーダル (アプリ選択と優先度設定を内包)
│   ├── hooks/               # カスタムReactフック
│   │   ├── useAuth.ts         # 認証状態とユーザー情報を管理
│   │   └── usePaymentApps.ts  # 全決済アプリ一覧、ユーザー選択アプリ、優先度、保存/更新処理
│   ├── lib/                 # ライブラリ初期化、ユーティリティ関数
│   │   ├── deepLink.ts        # モバイルアプリ起動ロジック (URLスキーム, ストア誘導)
│   │   └── supabase.ts        # Supabaseクライアント初期化・インスタンス
│   ├── types/               # TypeScript型定義
│   │   └── index.ts
│   ├── globals.css          # グローバルCSS (Tailwindベース)
│   ├── layout.tsx           # ルートレイアウト定義
│   └── page.tsx             # アプリケーションのエントリーポイント (主にDashboardをレンダリング)
├── public/                # 静的ファイル (画像など)
├── .env.local.example     # 環境変数テンプレート
├── .env.local             # 環境変数ファイル (Supabaseキー, Geminiキーなど)
├── next.config.mjs        # Next.js設定
├── package.json           # プロジェクト依存関係・スクリプト
├── tailwind.config.ts     # Tailwind CSS設定
└── tsconfig.json          # TypeScript設定
```

## 5. 主要コンポーネント解説

*   **`app/page.tsx` & `app/layout.tsx`**: アプリケーションのエントリーポイントと基本的なHTML構造、全体レイアウトを提供。
*   **`app/components/Layout.tsx`**: ヘッダー（タイトル、ログイン状態表示、設定ボタンなど）、メインコンテンツエリア、フッターを含む共通レイアウト。
*   **`app/components/Dashboard.tsx`**:
    *   アプリケーションの中心となるコンテナコンポーネント (`'use client'`)。
    *   認証状態 (`useAuth`) と決済アプリデータ (`usePaymentApps`) をフックから取得・管理。
    *   `PaymentAppGrid` を使用して選択されたアプリを表示。
    *   カメラ起動ボタン、設定ボタンのイベントハンドリング。
    *   **カメラ機能 (`CameraCapture`)、画像認識API呼び出し、認識結果と優先度に基づいたアプリ起動ロジックを内包。**
    *   ゲストモード時の初期アプリ選択 (`AppSelector`) の表示制御。
    *   ローディング状態、エラー状態の管理と表示。
*   **`app/components/PaymentAppGrid.tsx`**: `usePaymentApps` から受け取ったユーザー選択済みの決済アプリリスト（優先度順）を元に、`PaymentAppCard` をグリッドレイアウトで表示。
*   **`app/components/PaymentAppCard.tsx`**: 個々の決済アプリ情報を表示するカード。アイコン、アプリ名を表示し、クリック/タップ時に `lib/deepLink.ts` の関数を呼び出してアプリ起動またはQRコード表示を行う。
*   **`app/components/SettingsDialog.tsx`**:
    *   設定変更用のモーダルダイアログ。
    *   タブ切り替えで「アプリ選択」(`AppSelector` を利用)と「優先度設定」(`PrioritySettings`) を表示。
    *   状態はダイアログ内で管理し、「保存」ボタンクリック時に `usePaymentApps` の更新関数を呼び出す。
*   **`app/components/PrioritySettings.tsx`**: `@dnd-kit` を使用し、決済アプリリストをドラッグ＆ドロップで並び替えられるUIを提供。`SettingsDialog` 内で使用される。
*   **`app/components/CameraCapture.tsx`**: カメラプレビューと撮影ボタンを表示するモーダル。撮影された画像データ (Data URL) を `Dashboard` に渡す。
*   **`app/components/AppSelector.tsx`**: 全ての決済アプリ一覧をチェックボックス付きで表示。ユーザーが利用するアプリを選択・解除できる。ゲストモードの初期設定や、`SettingsDialog` 内で使用される。

## 6. カスタムフック解説

*   **`app/hooks/useAuth.ts`**:
    *   Supabaseクライアントを使用して現在の認証セッション、ユーザー情報を取得・管理。
    *   ログイン状態の変化を監視し、関連コンポーネントに提供。
    *   ログイン、ログアウト処理の関数を提供。
*   **`app/hooks/usePaymentApps.ts`**:
    *   Supabaseから全決済アプリマスタ (`payment_apps`) を取得 (SWR利用)。
    *   ログインユーザーの場合、Supabaseからユーザーが選択・設定した決済アプリ情報 (`user_payment_apps` - 優先度含む) を取得 (SWR利用)。
    *   ゲストモードの場合、ローカルストレージから選択・優先度情報を読み込み/書き込み。
    *   ユーザーが選択したアプリリストと、優先度順にソートされた表示用アプリリストを計算・提供。
    *   設定変更（アプリ選択、優先度）をSupabaseまたはローカルストレージに保存するための関数 (`updateUserPaymentApps` 等) を提供。

## 7. APIルート解説

*   **`app/api/recognize-image/route.ts` (POST)**:
    *   `Dashboard` から送信された画像データ (Data URL) を受け取る。
    *   環境変数に設定された `GEMINI_API_KEY` を使用して Google AI Gemini API (`gemini-1.5-flash-latest`) を呼び出す。
    *   プロンプトで画像内の決済サービス名をJSON配列で返すよう指示。
    *   Gemini APIからの応答（Markdown形式でラップされている場合も考慮しJSONを抽出）をパースし、認識されたサービス名の配列 (`{ services: ["PayPay", "楽天ペイ"] }`) をクライアント (Dashboard) に返す。
    *   APIキーの秘匿化と安全な外部API連携を実現。
*   **`app/api/payment-apps/route.ts` (POST, PUT等 - 要実装確認)**:
    *   `usePaymentApps` フック (の保存関数) から呼び出される想定。
    *   認証されたユーザーの決済アプリ設定（主に `priority`）をSupabaseデータベース (`user_payment_apps` テーブル) に更新するためのエンドポイント。
    *   リクエストボディでユーザーIDと更新後の優先度リストなどを受け取り、サーバーサイドでSupabaseクライアントを使ってDBを更新。
    *   RLS (Row Level Security) ポリシーにより、ユーザーは自身のデータのみ更新可能。

## 8. データモデル (Supabase)

```sql
-- 全ての決済アプリのマスタ情報
CREATE TABLE payment_apps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- 主キー
  name TEXT NOT NULL UNIQUE,                     -- アプリ名 (例: PayPay)
  logo_url TEXT,                                 -- ロゴ画像のURL
  web_url TEXT,                                  -- PC等で開くWebサイトURL
  ios_url_scheme TEXT,                           -- iOSアプリ起動用URLスキーム
  android_url_scheme TEXT,                       -- Androidアプリ起動用URLスキーム
  app_store_url TEXT,                            -- App Store URL
  play_store_url TEXT,                           -- Google Play Store URL
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() -- 作成日時
);

-- Supabase Authと連携するユーザープロファイル (最低限)
-- 注意: Supabase Authの `auth.users` テーブルが主。これは追加情報用。
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, -- `auth.users` テーブルのIDを参照
  email TEXT,                                     -- メールアドレス (auth.usersにもあるが冗長性のため)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ユーザーが選択し、優先度を設定した決済アプリの情報
CREATE TABLE user_payment_apps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- ユーザーID (auth.usersを参照)
  payment_app_id UUID NOT NULL REFERENCES payment_apps(id) ON DELETE CASCADE, -- 決済アプリID
  priority INTEGER NOT NULL,                     -- ユーザー設定の優先度 (小さいほど高い)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, payment_app_id)                 -- ユーザーごとに同じアプリは1つだけ
);

-- RLSポリシー (Row Level Security) - 抜粋
-- user_payment_apps テーブルに対するポリシー例:
-- ユーザーは自身の user_payment_apps レコードのみ参照・更新可能
ALTER TABLE user_payment_apps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow individual user access"
ON public.user_payment_apps
FOR ALL -- SELECT, INSERT, UPDATE, DELETE
USING (auth.uid() = user_id);
```

## 9. 主要機能フロー

### 9.1. 認証フロー

1.  **初回アクセス**: `useAuth` がセッションを確認。
2.  **未ログイン**:
    *   ログインフォームまたはゲストモード選択肢を表示 (コンポーネントは未特定だが `Auth.tsx` 的なものが存在する可能性)。
    *   **ゲストモード選択**: `usePaymentApps` がローカルストレージモードで動作開始。`AppSelector` で初期アプリ選択へ。
    *   **ログイン選択**: メール/パスワード入力 or マジックリンク要求。Supabase Authで認証。成功後、`useAuth` がセッション情報を更新し、ダッシュボードへ。
3.  **ログイン済み**: `useAuth` がセッション情報を取得。`usePaymentApps` がSupabaseモードで動作開始。ダッシュボード表示へ。

### 9.2. アプリ選択・表示フロー

1.  **データ取得**: `usePaymentApps` が全アプリマスタとユーザー設定（ログイン時: Supabase, ゲスト時: LocalStorage）を取得。
2.  **表示リスト生成**: ユーザー設定に基づき、表示対象かつ優先度順にソートされたアプリリストを生成。
3.  **レンダリング**: `Dashboard` -> `PaymentAppGrid` -> `PaymentAppCard` がリストを元にアプリ一覧を表示。

### 9.3. アプリ起動フロー

1.  **ユーザー操作**:
    *   **モバイル**: `PaymentAppCard` のアイコンをタップ。
    *   **PC**: `PaymentAppCard` のアイコンをクリック。
2.  **処理分岐 (`PaymentAppCard` -> `lib/deepLink.ts`)**:
    *   **モバイル**:
        1.  対象アプリのOS別URLスキーム (`ios_url_scheme` or `android_url_scheme`) を取得。
        2.  `window.location.href` 等でURLスキームを開こうとする。
        3.  **起動失敗/タイムアウト**: 対応するアプリストアURL (`app_store_url` or `play_store_url`) にリダイレクト。
        4.  **ストアURLもない場合**: Web URL (`web_url`) にフォールバック（またはエラー表示）。
    *   **PC**:
        1.  対象アプリのWeb URL (`web_url`) または起動用情報を含む文字列を取得。
        2.  `qrcode.react` を使用してQRコードをモーダル等で表示。
        3.  ユーザーがスマートフォンでスキャン -> スマートフォン側でアプリ起動。

### 9.4. カメラ撮影・画像認識・優先起動フロー

1.  **カメラ起動**: `Dashboard` のカメラボタンをクリック。
2.  **撮影**: `CameraCapture` モーダルが表示され、ユーザーが撮影ボタンをクリック。撮影された画像データ (Data URL) を `Dashboard` に渡す。
3.  **画像認識API呼び出し (`Dashboard`)**:
    *   ローディング状態 (`isRecognizing`) を true に設定。
    *   取得した画像データを `/api/recognize-image` エンドポイントにPOSTリクエストで送信。
4.  **API処理 (`/api/recognize-image`)**:
    *   Gemini APIを呼び出し、画像から決済サービス名を抽出。
    *   結果 (サービス名配列) をJSONで返す。
5.  **結果処理 (`Dashboard`)**:
    *   APIから返された認識結果 (サービス名配列 `recognizedServices`) を受け取る。
    *   ローディング状態を false に設定。
    *   `usePaymentApps` から取得したユーザー設定の優先度付きアプリリスト (`appsToDisplay`) と `recognizedServices` を照合。
        *   `recognizedServices` の各サービス名（小文字化）と `appsToDisplay` の各アプリ名（小文字化）を比較。
        *   一致したアプリのうち、`appsToDisplay` 内での優先度 (priority) が最も高いものを特定。
    *   **最適なアプリが見つかった場合**: `lib/deepLink.ts` の起動関数を呼び出し、そのアプリを起動しようとする。
    *   **見つからなかった場合**: 「対応アプリが見つかりません」等の通知 (Sonner) を表示。
    *   **APIエラー時**: エラー通知を表示。

### 9.5. 設定変更フロー (アプリ選択・優先度)

1.  **設定ダイアログ表示**: `Dashboard` の設定ボタンをクリック -> `SettingsDialog` が表示される。
2.  **アプリ選択**:
    *   「アプリ選択」タブを開く (`AppSelector` が表示される)。
    *   ユーザーが表示したいアプリのチェックボックスを変更。変更はダイアログ内の状態に一時保存される。
3.  **優先度設定**:
    *   「優先度設定」タブを開く (`PrioritySettings` が表示される)。
    *   表示対象として選択されているアプリのみがリストに表示される。
    *   ユーザーがドラッグ＆ドロップでアプリの順番を入れ替える。変更はダイアログ内の状態に一時保存される。
4.  **設定保存**:
    *   ユーザーが「保存」ボタンをクリック。
    *   `SettingsDialog` が、一時保存されていた選択状態と新しい優先度順リストを `usePaymentApps` の更新関数 (`updateUserPaymentApps` 等) に渡す。
5.  **データ永続化 (`usePaymentApps`)**:
    *   **ログインユーザー**: サーバーサイドAPI (`/api/payment-apps`) を呼び出すか、クライアントサイドでSupabaseの `user_payment_apps` テーブルを更新（追加/削除/priority更新）。
    *   **ゲストユーザー**: ローカルストレージに選択状態と優先度順のIDリストを保存。
6.  **UI更新**: SWRがデータを再検証するか、フックが状態を更新し、`Dashboard` の表示が新しい設定に更新される。

## 10. デプロイ

*   **プラットフォーム**: Vercel
*   **手順**:
    1.  コードをGitHubリポジトリにプッシュ。
    2.  VercelアカウントとGitHubリポジトリを連携。
    3.  Vercelプロジェクト設定で環境変数 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`) を設定。
    4.  Vercelが自動でビルド (`npm run build`) とデプロイを実行。
    5.  `main` ブランチへのプッシュで本番環境、プルリクエスト作成でプレビュー環境が自動的にデプロイされる。

## 11. 今後の課題・拡張性

*   **画像認識の改善:**
    *   表記揺れへの対応（例: "PayPay" と "ペイペイ"）。Geminiへのプロンプト改善や、認識結果に対するあいまい検索ロジックの追加。
    *   低品質な画像や複雑な背景への耐性向上。
*   **プライバシー:** カメラ利用に関する明確な説明と同意取得フローの実装。プライバシーポリシーの作成と表示。
*   **エラーハンドリング:** より詳細なエラーフィードバック（例: Gemini APIのエラー種別に応じたメッセージ）。
*   **機能拡張:**
    *   残高・ポイント表示（各決済サービスのAPI提供状況次第）。
    *   キャンペーン情報表示。
    *   PWA (Progressive Web App) 化によるオフライン利用（一部機能）やホーム画面への追加。
    *   ソーシャルログイン。
*   **テスト:** 単体テスト、結合テスト、E2Eテストの拡充。
*   **パフォーマンス:** 画像アップロードサイズの最適化、API応答速度の監視。
*   **コスト管理:** Gemini APIの利用状況とコストの継続的な監視。
