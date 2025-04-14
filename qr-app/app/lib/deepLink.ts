import { PaymentApp, PointApp } from '../types/index';

// アプリ起動の状態を管理するオブジェクト（グローバルな状態）
export const appLaunchState = {
  wasLaunched: false,
  isLaunching: false,
  lastAttemptedApp: null as string | null,
  lastLaunchTimestamp: 0,
  
  // 起動状態をリセット
  reset() {
    this.wasLaunched = false;
    this.isLaunching = false;
    this.lastAttemptedApp = null;
    this.lastLaunchTimestamp = 0;
  },
  
  // 起動を開始
  startLaunch(appId: string) {
    this.wasLaunched = false;
    this.isLaunching = true;
    this.lastAttemptedApp = appId;
    this.lastLaunchTimestamp = Date.now();
  },
  
  // 起動完了（アプリから戻ってきた）
  finishLaunch() {
    // 起動された（成功）
    this.wasLaunched = true;
    this.isLaunching = false;
  },
  
  // アプリが起動しなかった（インストールされていないか、別の問題がある）
  failLaunch() {
    this.wasLaunched = false;
    this.isLaunching = false;
  }
};

// デバイスタイプに応じてURLを生成する関数
export function getAppLink(app: PaymentApp | PointApp): string {
  // クライアントサイドでのみ実行されるようにする
  if (typeof window === 'undefined') return app.web_url;
  
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

// ストアURLを取得する関数（明示的に使用する場合のみ）
export function getStoreLink(app: PaymentApp | PointApp): string | null {
  if (typeof window === 'undefined') return null;
  
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/iphone|ipad|ipod/.test(userAgent) && app.app_store_url) {
    return app.app_store_url;
  } else if (/android/.test(userAgent) && app.play_store_url) {
    return app.play_store_url;
  }
  
  return null;
}

// アプリを開く関数 - インストールされていない場合は反応しない
export function openPaymentApp(app: PaymentApp | PointApp): void {
  if (typeof window === 'undefined') return;
  
  const link = getAppLink(app);
  
  // アプリ起動状態をリセット・設定
  appLaunchState.startLaunch(app.id);
  
  // visibilitychangeイベントでアプリ起動確認
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && appLaunchState.isLaunching) {
      // ページが再び表示された（＝アプリから戻ってきた）
      // シンプルに起動完了とみなす - インストールされていなくても特に何も表示しない
      appLaunchState.finishLaunch();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (timeout) clearTimeout(timeout);
    }
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // タイムアウトでアプリ起動状態管理のクリーンアップ
  const timeout = setTimeout(() => {
    if (document.visibilityState === 'visible') {
      appLaunchState.failLaunch();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, 2000);
  
  // リンクを開く
  window.location.href = link;
  
  // イベントリスナーでタイムアウトをクリア
  window.addEventListener('pagehide', () => {
    if (timeout) clearTimeout(timeout);
  });
  
  // ページをアンロードする前にイベントリスナーを削除
  window.addEventListener('beforeunload', () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    if (timeout) clearTimeout(timeout);
  });
}

// アプリが起動したかどうかを確認する関数
export function didAppLaunch(appId: string): boolean {
  return appLaunchState.wasLaunched && appLaunchState.lastAttemptedApp === appId;
}

// アプリが起動していない場合のみ、ストアを開く関数
export function openAppStoreIfNeeded(app: PaymentApp | PointApp): boolean {
  // アプリが起動していなければストアを開く
  if (!didAppLaunch(app.id)) {
    openAppStore(app);
    return true;
  }
  return false;
}

// ストアを明示的に開くための関数（別途UIから呼び出す場合用）
export function openAppStore(app: PaymentApp | PointApp): void {
  const storeUrl = getStoreLink(app);
  if (storeUrl) {
    window.location.href = storeUrl;
  }
} 