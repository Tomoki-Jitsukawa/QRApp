'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import { PaymentApp } from '../types';
import { openPaymentApp, getAppLink, getStoreLink, openAppStore, appLaunchState, didAppLaunch } from '../lib/deepLink';

interface PaymentAppCardProps {
  app: PaymentApp;
}

export default function PaymentAppCard({ app }: PaymentAppCardProps) {
  const [showQr, setShowQr] = useState(false);
  const [showStoreOption, setShowStoreOption] = useState(false);
  const [appLaunched, setAppLaunched] = useState(false);
  const isPC = typeof window !== 'undefined' && !(/android|iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()));
  
  // アプリの起動状態をモニタリング
  useEffect(() => {
    // visibilitychangeイベントをリッスンして、アプリからの戻りを検知
    const handleVisibilityChange = () => {
      if (!isPC && document.visibilityState === 'visible') {
        // 現在のアプリのIDと最後に起動を試みたアプリのIDを比較
        if (appLaunchState.lastAttemptedApp === app.id) {
          // 少し遅延させて正確に判定
          setTimeout(() => {
            const wasSuccessful = didAppLaunch(app.id);
            setAppLaunched(wasSuccessful);
            
            // アプリが起動しなかった場合のみストアオプションを表示
            if (!wasSuccessful && appLaunchState.lastAttemptedApp === app.id) {
              setShowStoreOption(true);
            }
          }, 300);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [app.id, isPC]);
  
  const handleClick = () => {
    if (isPC) {
      setShowQr(!showQr);
    } else {
      // 状態をリセット
      setShowStoreOption(false);
      setAppLaunched(false);
      
      // アプリを開く
      openPaymentApp(app);
    }
  };
  
  const handleStoreClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // カード全体のクリックイベントを防止
    openAppStore(app);
  };
  
  return (
    <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl border border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-700 transform hover:scale-105">
      <button
        onClick={handleClick}
        className="w-full p-5 text-left focus:outline-none"
      >
        <div className="flex flex-col items-center space-y-3">
          {app.logo_url ? (
            <div className="flex-shrink-0 w-16 h-16 relative p-1 rounded-lg">
              <Image
                src={app.logo_url}
                alt={app.name}
                width={64}
                height={64}
                className="object-contain rounded-lg transition-all"
              />
            </div>
          ) : (
            <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-lg flex items-center justify-center">
              <span className="text-gray-500 dark:text-gray-300 text-xl font-bold">{app.name.charAt(0)}</span>
            </div>
          )}
          <div className="flex-1 text-center">
            <h3 className="font-medium text-gray-900 dark:text-white">{app.name}</h3>
            {app.api_available && (
              <p className="text-xs text-green-500 mt-1">API連携可能</p>
            )}
          </div>
        </div>
      </button>
      
      {/* ストアオプションのバッジ（モバイルのみ、必要な場合） */}
      {!isPC && showStoreOption && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs py-1 px-2">
          <div className="flex justify-between items-center">
            <span>アプリをインストール</span>
            <button 
              onClick={handleStoreClick}
              className="bg-white text-indigo-600 rounded-full px-2 py-0.5 text-xs font-medium hover:bg-gray-100"
            >
              ストアへ
            </button>
          </div>
        </div>
      )}
      
      {/* QRコードモーダル（PCの場合のみ） */}
      {isPC && showQr && (
        <div className="absolute inset-0 bg-white dark:bg-gray-800 z-10 flex flex-col items-center justify-center p-4 animate-fade-in backdrop-blur-sm border rounded-xl">
          <button
            onClick={() => setShowQr(false)}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white focus:outline-none p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="p-4 text-center">
            <h3 className="mb-3 font-bold text-lg text-gray-900 dark:text-white">{app.name}を起動</h3>
            <div className="inline-block p-3 bg-white rounded-lg border border-gray-200 shadow-md">
              <QRCodeSVG
                value={getAppLink(app)}
                size={180}
                bgColor={"#ffffff"}
                fgColor={"#000000"}
                level={"H"}
                includeMargin={false}
              />
            </div>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              スマートフォンでスキャンして{app.name}を開きます
            </p>
            
            {/* PCでもストアリンクを表示 */}
            {getStoreLink(app) && (
              <div className="mt-4">
                <a 
                  href={getStoreLink(app) || '#'} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm px-4 py-2 rounded-full hover:from-indigo-600 hover:to-purple-700 transition-all duration-200"
                >
                  ストアで見る
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 