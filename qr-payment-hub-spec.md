# QR決済アプリ Hub アプリケーション設計書 (Flutter + Supabase)

## 1. 概要

複数のQR決済アプリの情報を一元管理し、シームレスな支払い体験を提供するハブアプリケーションの設計書です。

### フェーズ1（MVP）
- 各QR決済アプリへのディープリンクによる遷移機能
- シンプルなUI/UXデザイン

### フェーズ2以降
- 各アプリの残高表示
- ポイント情報表示
- キャンペーン情報の表示

## 2. 技術要素

### フロントエンド
- **フレームワーク**: Flutter
  - Dart言語によるクロスプラットフォーム開発
  - 高パフォーマンスなネイティブレンダリング
  - 豊富なウィジェットライブラリ
  - ホットリロードによる高速な開発サイクル

### バックエンド
- **サーバー**: Node.js + Express
  - RESTful APIの提供
  - 将来的に各QR決済サービスとの連携APIを管理

### データベース
- **Supabase**
  - PostgreSQLベースの堅牢なデータベース
  - リアルタイムサブスクリプション機能
  - 組み込み認証システム
  - RLS (Row Level Security) によるデータ保護
  - 拡張性の高いストレージソリューション

### 認証
- **Supabase Authentication**
  - 複数の認証プロバイダーをサポート（メール、SNSアカウント等）
  - JWTトークンベースの認証
  - セッション管理

## 3. アプリ構造

### Flutterプロジェクト構成
```
lib/
├── main.dart                // アプリのエントリーポイント
├── app/                     // アプリケーション設定
│   ├── routes.dart          // ルート定義
│   ├── themes.dart          // テーマ設定
│   └── constants.dart       // アプリ全体で使用する定数
├── models/                  // データモデル
│   ├── payment_app.dart     // 決済アプリモデル
│   ├── user_profile.dart    // ユーザープロファイル
│   └── balance_info.dart    // 残高情報（フェーズ2）
├── services/                // サービス層
│   ├── supabase_service.dart // Supabase接続
│   ├── auth_service.dart    // 認証サービス
│   └── deep_link_service.dart // ディープリンク処理
├── views/                   // UI画面
│   ├── home/                // ホーム画面関連
│   ├── settings/            // 設定画面関連
│   └── detail/              // 詳細画面関連（フェーズ2）
└── widgets/                 // 再利用可能なウィジェット
    ├── payment_app_card.dart // 決済アプリカード
    └── balance_display.dart  // 残高表示（フェーズ2）
```

### データモデル (Supabase)
```sql
-- 決済アプリテーブル
CREATE TABLE payment_apps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  logo_url TEXT,
  ios_url_scheme TEXT,
  android_url_scheme TEXT,
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

### 1. ディープリンク実装
**課題**: 各QR決済アプリへの適切な遷移方法の実装

**解決策**:
- Flutterの`url_launcher`パッケージを使用
- URLスキームを利用したアプリ起動
- アプリ未インストール時はストアページに誘導

```dart
// ディープリンクサービスの実装例
import 'package:url_launcher/url_launcher.dart';
import 'dart:io' show Platform;

class DeepLinkService {
  Future<void> openPaymentApp(String iosUrlScheme, String androidUrlScheme, 
                             String appStoreUrl, String playStoreUrl) async {
    final urlScheme = Platform.isIOS ? iosUrlScheme : androidUrlScheme;
    final storeUrl = Platform.isIOS ? appStoreUrl : playStoreUrl;
    
    try {
      final canLaunch = await canLaunchUrl(Uri.parse(urlScheme));
      if (canLaunch) {
        await launchUrl(Uri.parse(urlScheme));
      } else {
        await launchUrl(Uri.parse(storeUrl));
      }
    } catch (e) {
      print('アプリを開けませんでした: $e');
      // エラー処理（ダイアログ表示など）
    }
  }
}
```

### 2. Supabaseとの連携
**課題**: リアルタイムデータ同期と認証の実装

**解決策**:
- `supabase_flutter`パッケージの利用
- リアルタイムサブスクリプションの設定
- RLSポリシーによるデータアクセス制御

```dart
// Supabaseサービスの実装例
import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseService {
  final supabase = Supabase.instance.client;
  
  // ユーザーの決済アプリリストを取得
  Future<List<PaymentApp>> getUserPaymentApps() async {
    final user = supabase.auth.currentUser;
    if (user == null) return [];
    
    final response = await supabase
      .from('user_payment_apps')
      .select('*, payment_apps(*)')
      .eq('user_id', user.id)
      .order('display_order');
      
    return response.map((data) => PaymentApp.fromJson(data['payment_apps'])).toList();
  }
  
  // リアルタイムサブスクリプション（フェーズ2）
  Stream<List<BalanceInfo>> streamBalanceInfo() {
    final user = supabase.auth.currentUser;
    if (user == null) return Stream.value([]);
    
    return supabase
      .from('balance_info')
      .stream(primaryKey: ['id'])
      .eq('user_id', user.id)
      .map((data) => data.map((item) => BalanceInfo.fromJson(item)).toList());
  }
}
```

### 3. 残高・ポイント情報取得（フェーズ2）
**課題**: 各QR決済アプリの残高・ポイント情報へのアクセス

**解決策**:
- 公式API連携（可能な場合）- Flutterの`http`パッケージ利用
- ユーザー入力による手動更新 - Flutterフォームの実装
- Supabaseデータベースとの同期 - バッチ処理の実装

## 5. ユーザーフロー（MVP）

1. アプリ初回起動
   - Supabase認証（メール/SNSログイン）
   - ウェルカム画面表示
   - 利用するQR決済アプリの選択

2. ホーム画面
   - Flutterの`GridView`または`ListView`で決済アプリを表示
   - タップで`DeepLinkService`を通じて対応するアプリを起動

3. 設定変更
   - Flutterの`ReorderableListView`で表示順序の変更
   - チェックボックスで表示/非表示の切り替え

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
- Flutter環境構築
- Supabaseセットアップとテーブル設計
- 認証フロー実装
- 基本UI/UX設計
- ディープリンク機能実装

### フェーズ2 - 2-3ヶ月
- 残高表示機能
- ポイント情報表示
- リアルタイムデータ同期

### フェーズ3 - 3-4ヶ月
- キャンペーン情報表示
- 利用履歴表示
- 高度なデータ同期

## 8. Flutter特有の開発手法

### 状態管理
- **Provider/Riverpod**:
  - 軽量で直感的な状態管理
  - ウィジェットツリー間のデータ共有に最適

```dart
// Providerを用いた状態管理の例
final paymentAppsProvider = FutureProvider<List<PaymentApp>>((ref) async {
  final supabaseService = ref.read(supabaseServiceProvider);
  return await supabaseService.getUserPaymentApps();
});
```

### UI/UXデザイン
- **Material/Cupertino ウィジェット**:
  - プラットフォーム固有のデザイン言語を尊重
  - レスポンシブデザインとアダプティブレイアウト

```dart
// レスポンシブなグリッドレイアウトの例
GridView.builder(
  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
    crossAxisCount: MediaQuery.of(context).size.width > 600 ? 4 : 2,
    childAspectRatio: 1.0,
  ),
  itemCount: paymentApps.length,
  itemBuilder: (context, index) => PaymentAppCard(app: paymentApps[index]),
)
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

### ストレージ（アプリアイコン等）
```dart
// Supabaseストレージからのアイコン取得例
Future<String> getPaymentAppLogo(String appId) async {
  final String path = 'payment_apps/$appId/logo.png';
  final String publicUrl = supabase.storage.from('public').getPublicUrl(path);
  return publicUrl;
}
```

## 10. セキュリティ考慮事項

- Supabaseの認証システムを利用したJWTベースの認証
- RLSによるデータアクセス制御
- 環境変数やFlutter環境ファイルでの機密情報管理
- SSLを用いた通信暗号化
- Flutterのコード難読化（リリース版）

## 11. パフォーマンス最適化

- Flutterのウィジェットツリー最適化
  - `const`コンストラクタの活用
  - メモ化によるリビルド最小化
- 画像のキャッシュ処理
- Supabaseクエリの最適化
  - インデックス作成
  - 必要なカラムのみ選択

## 12. 将来的な拡張性

- QRコード読み取り機能の追加
  - Flutterの`qr_code_scanner`パッケージの活用
- 決済履歴の分析と支出管理機能
  - カスタムChartウィジェットの実装
- 複数のQR決済間での残高移動・チャージ機能
  - Supabase Edge Functionsを用いた安全な処理
- パーソナライズされたキャンペーン推奨
  - Flutterアニメーションを活用した魅力的な表示

## 13. まとめ

Flutter + Supabaseを採用することで、高パフォーマンスでネイティブに近い体験を提供しつつ、堅牢なバックエンドとリアルタイムデータ連携を実現できます。特にFlutterのクロスプラットフォーム開発とSupabaseの統合認証・データベース機能により、開発効率とユーザー体験の両方を向上させることが可能です。

MVPでのディープリンク機能はFlutterの`url_launcher`で容易に実装でき、フェーズ2以降の拡張もSupabaseのリアルタイム機能を活用することで効率的に進められます。