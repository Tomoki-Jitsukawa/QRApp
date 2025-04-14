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
  priority?: number | null;
  is_active: boolean;
  created_at?: string;
}

// ポイントアプリの型定義
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

// ユーザーのポイントアプリ設定の型定義
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
  point_app_id: string;
  point_app?: PointApp;
  balance: number;
  points: number;
  expiry_date?: string;
  last_updated?: string;
} 