// 決済アプリの型定義
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

// ユーザープロファイルの型定義
export interface Profile {
  id: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
}

// ユーザーの決済アプリ設定の型定義
export interface UserPaymentApp {
  id: string;
  user_id: string;
  payment_app_id: string;
  payment_app?: PaymentApp;
  display_order: number;
  is_active: boolean;
  created_at?: string;
}

// 残高情報の型定義（フェーズ2）
export interface BalanceInfo {
  id: string;
  user_id: string;
  payment_app_id: string;
  payment_app?: PaymentApp;
  balance: number;
  points: number;
  last_updated?: string;
} 