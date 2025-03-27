'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '../hooks/useAuth';
import { useUserPaymentApps, useAllPaymentApps } from '../hooks/usePaymentApps';
import PaymentAppCard from './PaymentAppCard';
import { PaymentApp } from '../types';
import { openPaymentApp, getAppLink, appLaunchState, didAppLaunch } from '../lib/deepLink';

// アプリごとのブランドカラーを設定 (塗りつぶしデザイン)
function getBrandColor(app: PaymentApp) {
  const colors: Record<string, { bg: string, text: string }> = {
    'PayPay': { bg: 'bg-red-500', text: 'text-white' },
    'LINE Pay': { bg: 'bg-green-500', text: 'text-white' },
    '楽天ペイ': { bg: 'bg-red-600', text: 'text-white' },
    'd払い': { bg: 'bg-pink-500', text: 'text-white' },
    'au PAY': { bg: 'bg-orange-500', text: 'text-white' },
    'メルペイ': { bg: 'bg-blue-500', text: 'text-white' },
  };
  
  return colors[app.name] || { bg: 'bg-gray-500', text: 'text-white' };
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { userPaymentApps, isLoading: isUserAppsLoading, updateUserPaymentApps } = useUserPaymentApps();
  const { paymentApps, isLoading: isAllAppsLoading } = useAllPaymentApps();
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // 未登録ユーザーにデフォルトの決済アプリを表示するためのstate
  const [showAppSelector, setShowAppSelector] = useState(false);
  
  useEffect(() => {
    // ログイン済みで選択アプリがない場合、または未ログインでゲストモードの場合
    if ((!loading && user && userPaymentApps.length === 0) || 
        (!loading && !user && !localStorage.getItem('guestSelectedApps'))) {
      setShowAppSelector(true);
    }
    
    // ゲストモードの場合、ローカルストレージから選択済みアプリを取得
    if (!loading && !user) {
      const savedApps = localStorage.getItem('guestSelectedApps');
      if (savedApps) {
        setSelectedApps(JSON.parse(savedApps));
      }
    }
    
    // ログイン済みの場合は、選択済みアプリを設定
    if (!loading && user && userPaymentApps.length > 0) {
      setSelectedApps(userPaymentApps.map(app => app.payment_app_id));
    }
  }, [loading, user, userPaymentApps]);
  
  // アプリ選択の切り替え
  const toggleAppSelection = (appId: string) => {
    setSelectedApps(prev => {
      if (prev.includes(appId)) {
        return prev.filter(id => id !== appId);
      } else {
        return [...prev, appId];
      }
    });
  };
  
  // 選択を確定
  const confirmSelection = async () => {
    setIsSaving(true);
    try {
      await updateUserPaymentApps(selectedApps);
      setShowAppSelector(false);
    } catch (error) {
      console.error('Error saving app selection:', error);
      // エラー処理を追加可能
    } finally {
      setIsSaving(false);
    }
  };
  
  // 表示するアプリリストを決定
  const appsToDisplay = () => {
    if (user && !isUserAppsLoading && userPaymentApps.length > 0) {
      // ログイン済みで選択済みアプリがある場合
      return userPaymentApps.map(userApp => userApp.payment_app!);
    } else if (!user && !isUserAppsLoading && userPaymentApps.length > 0) {
      // ゲストモードで選択済みアプリがある場合
      return userPaymentApps.map(userApp => userApp.payment_app!);
    } else {
      // どちらでもない場合は空配列（アプリ選択画面を表示）
      return [];
    }
  };
  
  if (loading || isAllAppsLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-300"></div>
      </div>
    );
  }
  
  if (showAppSelector) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-lg p-6 backdrop-blur-sm transition-all duration-300 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">利用するQR決済アプリを選択</h2>
          <p className="text-gray-600 mb-8">利用したいQR決済アプリを選択してください。後から設定画面で変更することもできます。</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {paymentApps.map((app: PaymentApp) => (
              <div
                key={app.id}
                className={`p-4 border rounded-xl cursor-pointer transition-all duration-200 transform hover:scale-105 ${
                  selectedApps.includes(app.id)
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => toggleAppSelection(app.id)}
              >
                <div className="flex flex-col items-center text-center">
                  {app.logo_url ? (
                    <div className="w-16 h-16 relative mb-3 p-2">
                      <div className="w-full h-full relative rounded-lg overflow-hidden">
                        <Image
                          src={app.logo_url}
                          alt={app.name}
                          width={64}
                          height={64}
                          style={{
                            objectFit: 'contain',
                            width: '100%',
                            height: '100%'
                          }}
                          className="transition-all duration-200"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-3 shadow-sm">
                      <span className="text-gray-500 text-xl font-bold">
                        {app.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-900">{app.name}</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-8 flex justify-end">
            <button
              onClick={confirmSelection}
              disabled={selectedApps.length === 0 || isSaving}
              className={`px-6 py-3 rounded-md text-white font-medium transition-all duration-200 ${
                selectedApps.length > 0 && !isSaving
                  ? 'bg-blue-500 hover:bg-blue-600 shadow-sm'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {isSaving ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  保存中...
                </span>
              ) : '選択を確定'}
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  const displayApps = appsToDisplay();
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">QR決済アプリ</h1>
        <button
          onClick={() => setShowAppSelector(true)}
          className="text-sm px-4 py-2 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-200"
        >
          編集
        </button>
      </div>
      
      {displayApps.length > 0 ? (
        <div className="bg-white rounded-xl shadow-md p-4 transition-all duration-300 border border-gray-100">
          <h2 className="text-lg font-medium text-gray-700 mb-3 px-2">決済アプリ</h2>
          <div className="flex flex-col space-y-3">
            {displayApps.map(app => (
              <PaymentAppCardAppleStyle key={app.id} app={app} />
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md p-8 text-center transition-all duration-300 border border-gray-100">
          <div className="flex flex-col items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-600 mb-4">
              表示するQR決済アプリがありません。
            </p>
            <button
              onClick={() => setShowAppSelector(true)}
              className="px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-all duration-200"
            >
              アプリを選択する
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// シンプルなApple風カードスタイルのPaymentAppCard
function PaymentAppCardAppleStyle({ app }: { app: PaymentApp }) {
  const isPC = typeof window !== 'undefined' && !(/android|iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()));
  
  const handleClick = () => {
    if (isPC) {
      // PCの場合はウェブURLを新しいタブで開く
      window.open(app.web_url, '_blank');
    } else {
      // アプリを開く - インストールされていなければ反応なし
      openPaymentApp(app);
    }
  };
  
  const brandColors = getBrandColor(app);
  
  return (
    <button
      onClick={handleClick}
      className={`w-full p-3 rounded-xl ${brandColors.bg} ${brandColors.text} flex justify-between items-center focus:outline-none active:opacity-90 transition-all duration-150 transform hover:scale-[1.02] hover:shadow-lg shadow-md`}
    >
      <div className="flex items-center">
        {app.logo_url ? (
          <div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg flex items-center justify-center mr-3 shadow-sm">
            <Image
              src={app.logo_url}
              alt={app.name}
              width={32}
              height={32}
              className="object-contain"
            />
          </div>
        ) : (
          <div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg flex items-center justify-center mr-3 shadow-sm">
            <span className="text-gray-500 text-lg font-bold">{app.name.charAt(0)}</span>
          </div>
        )}
        <div className="text-left">
          <p className="text-sm font-medium">{app.name}</p>
          <p className="text-xs opacity-80">タップして起動</p>
        </div>
      </div>
      <div>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-80" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      </div>
    </button>
  );
} 