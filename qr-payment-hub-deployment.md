# QR決済アプリHub デプロイ・セットアップガイド

このドキュメントは、QR決済アプリHubの開発環境セットアップから本番環境へのデプロイまでの手順を説明します。

## 1. 開発環境セットアップ

### Flutter環境のセットアップ

1. **Flutter SDKのインストール**

   ```bash
   # macOSの場合
   brew install flutter
   
   # Windowsの場合はFlutterウェブサイトからインストーラをダウンロード
   # https://flutter.dev/docs/get-started/install/windows
   ```

2. **環境の検証**

   ```bash
   flutter doctor
   ```

   すべてのチェックが通過するまで、表示される指示に従って問題を修正してください。

3. **プロジェクトの作成**

   ```bash
   flutter create qr_payment_hub
   cd qr_payment_hub
   ```

4. **必要なパッケージの追加**

   ```bash
   flutter pub add supabase_flutter
   flutter pub add url_launcher
   flutter pub add flutter_riverpod
   flutter pub add go_router
   flutter pub add flutter_secure_storage
   ```

### Supabase環境のセットアップ

1. **Supabaseアカウントの作成**
   - [Supabase公式サイト](https://supabase.com/)にアクセス
   - サインアップしてアカウントを作成

2. **新しいプロジェクトの作成**
   - Supabaseダッシュボードから「New Project」をクリック
   - プロジェクト名、パスワード、リージョンを設定

3. **データベーススキーマの設定**
   - SQLエディタを開く
   - 設計書に記載されたテーブル作成SQLを実行

4. **APIキーの取得**
   - Settings > API から URL と anon キーをコピー
   - これらのキーは後でFlutterアプリに設定します

5. **RLSポリシーの設定**
   - Authentication > Policies からテーブルごとのRLSを有効化
   - 各テーブルに必要なポリシーを追加

## 2. ローカル開発環境の設定

### Flutterプロジェクトの環境変数設定

1. **環境変数ファイルの作成**

   ```bash
   touch .env
   ```

2. **.envファイルに必要な情報を追加**

   ```
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   ```

3. **.envファイルをgitignoreに追加**

   ```bash
   echo ".env" >> .gitignore
   ```

4. **環境変数読み込みのためのパッケージ追加**

   ```bash
   flutter pub add flutter_dotenv
   ```

5. **環境変数読み込み設定**

   `lib/main.dart`に以下を追加:

   ```dart
   import 'package:flutter_dotenv/flutter_dotenv.dart';
   
   Future<void> main() async {
     await dotenv.load();
     await Supabase.initialize(
       url: dotenv.env['SUPABASE_URL']!,
       anonKey: dotenv.env['SUPABASE_ANON_KEY']!,
     );
     runApp(ProviderScope(child: MyApp()));
   }
   ```

### 初期データのセットアップ

1. **QR決済アプリのサンプルデータをSupabaseに挿入**

   ```sql
   INSERT INTO payment_apps (name, logo_url, ios_url_scheme, android_url_scheme, app_store_url, play_store_url)
   VALUES
   ('PayPay', 'https://example.com/paypay.png', 'paypay://', 'jp.ne.paypay.android.app://', 'https://apps.apple.com/jp/app/paypay/id1435783608', 'https://play.google.com/store/apps/details?id=jp.ne.paypay.android'),
   ('LINE Pay', 'https://example.com/linepay.png', 'line://', 'line://', 'https://apps.apple.com/jp/app/line/id443904275', 'https://play.google.com/store/apps/details?id=jp.naver.line.android'),
   -- 他の決済アプリも同様に追加
   ;
   ```

## 3. アプリケーションの起動と動作確認

1. **アプリの起動**

   ```bash
   flutter run
   ```

2. **エミュレータ/シミュレータでの動作確認**
   - iOS シミュレータ
   - Android エミュレータ
   - Webブラウザ（オプション）

3. **実機でのテスト**
   - iOSデバイス（Apple Developer Accountが必要）
   - Androidデバイス（USBデバッグを有効化）

## 4. CI/CD環境のセットアップ

### GitHub Actions によるCI/CD

1. **リポジトリのセットアップ**

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repository-url>
   git push -u origin main
   ```

2. **.github/workflows ディレクトリの作成**

   ```bash
   mkdir -p .github/workflows
   ```

3. **CI/CDワークフローファイルの作成**

   `.github/workflows/main.yml`:

   ```yaml
   name: Flutter CI/CD

   on:
     push:
       branches: [ main ]
     pull_request:
       branches: [ main ]

   jobs:
     build:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: subosito/flutter-action@v2
           with:
             flutter-version: '3.16.0'
             channel: 'stable'
         - run: flutter pub get
         - run: flutter test
         - run: flutter build apk
         - uses: actions/upload-artifact@v3
           with:
             name: app-release
             path: build/app/outputs/flutter-apk/app-release.apk
   ```

## 5. 本番環境へのデプロイ

### iOS App Store へのデプロイ

1. **App Store Connect でアプリを登録**
   - Apple Developer Program にサインアップ（年間9,800円）
   - App Store Connect でアプリIDを作成

2. **ビルド設定**

   ```bash
   # iOS用のリリースビルド作成
   flutter build ipa
   ```

3. **App Store Connect へのアップロード**
   - Xcodeを開き、Product > Archive を選択
   - Archiveが完了したら、Distribute App を選択
   - App Store Connect を選択し、指示に従ってアップロード

### Google Play Store へのデプロイ

1. **Google Play Console でアプリを登録**
   - Google Play Developer Console にサインアップ（一度のみ$25）
   - 新しいアプリケーションを作成

2. **ビルド設定**

   ```bash
   # 署名用のkeystore作成（初回のみ）
   keytool -genkey -v -keystore ~/key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
   
   # key.propertiesファイルを作成
   touch android/key.properties
   ```

   `android/key.properties` に以下を追加:

   ```
   storePassword=<パスワード>
   keyPassword=<パスワード>
   keyAlias=upload
   storeFile=<keystore へのパス>
   ```

3. **Androidアプリのビルド**

   ```bash
   flutter build appbundle
   ```

4. **Google Play Consoleへのアップロード**
   - Play Console > App releases > Production > Create Release
   - 生成された app-release.aab ファイルをアップロード
   - 必要なストアの情報を入力し公開

### Supabase本番環境の最終設定

1. **RLSポリシーの最終確認**
   - すべてのテーブルにRLSが適用されていることを確認
   - テストアカウントで機能を検証

2. **本番環境用のバックアップ設定**
   - 定期的なデータベースバックアップの設定
   - 監視アラートの設定

3. **本番環境URLとキーをアプリに反映**
   - CI/CDの環境変数として設定
   - または、本番用のbuild時に埋め込み

## 6. 日常の運用手順

### アプリのアップデート

1. **新機能開発とテスト**
   - 開発環境で新機能を実装
   - 自動テストとの統合

2. **バージョン管理**
   - `pubspec.yaml` のバージョン番号を更新
   ```yaml
   version: 1.0.1+2  # <version>+<build number>
   ```

3. **更新のデプロイ**
   - CI/CDパイプラインを通じて自動デプロイ
   - または手動でストアにアップロード

### バックエンド更新

1. **データモデルの変更**
   - マイグレーションスクリプトの作成と実行
   - 適切なロールバックプランの準備

2. **APIの更新**
   - 互換性を維持したAPI更新
   - 必要に応じてバージョニング

### モニタリング

1. **エラートラッキング**
   - Sentry や Firebase Crashlytics の統合

2. **分析ツール**
   - Firebase Analytics や Amplitude の統合
   - ユーザー行動の追跡と分析

## 7. トラブルシューティング

### 一般的な問題と解決策

1. **ビルドエラー**
   - Flutter Clean を実行: `flutter clean && flutter pub get`
   - Pod のリインストール (iOS): `cd ios && pod install`

2. **Supabase接続エラー**
   - API キーと URL の確認
   - ネットワーク接続の確認
   - RLSポリシーの確認

3. **ディープリンクが機能しない**
   - URLスキームの正確さを確認
   - 各プラットフォームの設定を確認
     - iOS: Info.plist の URL Types
     - Android: AndroidManifest.xml の intent-filter

## 8. サポートリソース

- **Flutter公式ドキュメント**: https://flutter.dev/docs
- **Supabase公式ドキュメント**: https://supabase.com/docs
- **Flutter Community**: https://flutter.dev/community
- **Stack Overflow**: https://stackoverflow.com/questions/tagged/flutter
