'use client';

import { UserPointApp } from '../types';
import { openPaymentApp } from '../lib/deepLink';

interface PointAppGridProps {
  apps: UserPointApp[];
  isLoading?: boolean;
}

export default function PointAppGrid({ apps, isLoading = false }: PointAppGridProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col space-y-4 p-4">
        {[...Array(5)].map((_, i) => (
          <div 
            key={`skeleton-${i}`}
            className="bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md p-4 h-16 animate-pulse w-full"
          />
        ))}
      </div>
    );
  }
  
  if (!apps || apps.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500 dark:text-gray-400">
          ポイントアプリが選択されていません。設定から追加してください。
        </p>
      </div>
    );
  }
  
  // 優先度でソート (確実にソートするためのダブルチェック)
  const sortedApps = [...apps].sort((a, b) => (a.priority ?? Infinity) - (b.priority ?? Infinity));
  
  // デバッグ情報
  console.log('PointAppGrid - 表示するアプリ:', sortedApps.map(app => ({
    id: app.id,
    name: app.point_app?.name,
    priority: app.priority
  })));
  
  // アプリを起動する関数
  const handleAppLaunch = (userApp: UserPointApp) => {
    if (userApp.point_app) {
      openPaymentApp(userApp.point_app);
    }
  };
  
  return (
    <div className="flex flex-col space-y-3 p-4">
      {sortedApps.map((userApp, index) => (
        <div key={userApp.id} className="w-full">
          <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <div className="flex-shrink-0 w-10 h-10 mr-4">
              {userApp.point_app?.logo_url ? (
                <img 
                  src={userApp.point_app.logo_url} 
                  alt={`${userApp.point_app.name} logo`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-500 dark:text-gray-400">
                    {userApp.point_app?.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-grow">
              <h3 className="text-md font-medium">{userApp.point_app?.name}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">優先度: {index + 1}</p>
            </div>
            <button 
              onClick={() => handleAppLaunch(userApp)}
              className="ml-auto bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              起動
            </button>
          </div>
        </div>
      ))}
    </div>
  );
} 