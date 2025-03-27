'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { useAllPaymentApps, useUserPaymentApps } from '../hooks/usePaymentApps';

export default function Settings() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { paymentApps, isLoading: isAllAppsLoading } = useAllPaymentApps();
  const { userPaymentApps, updateUserPaymentApps, isLoading: isUserAppsLoading } = useUserPaymentApps();
  
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // ユーザーがログインしていなければリダイレクト
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [loading, user, router]);
  
  // 現在の選択アプリを取得
  useEffect(() => {
    if (userPaymentApps.length > 0) {
      setSelectedApps(userPaymentApps.map(app => app.payment_app_id));
    }
  }, [userPaymentApps]);
  
  const toggleAppSelection = (appId: string) => {
    setSelectedApps(prev => {
      if (prev.includes(appId)) {
        return prev.filter(id => id !== appId);
      } else {
        return [...prev, appId];
      }
    });
  };
  
  const handleSaveSettings = async () => {
    setIsSubmitting(true);
    setMessage(null);
    
    try {
      await updateUserPaymentApps(selectedApps);
      setMessage({ type: 'success', text: '設定を保存しました' });
    } catch (error) {
      console.error('Settings save error:', error);
      setMessage({ type: 'error', text: '設定の保存に失敗しました' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (loading || isAllAppsLoading || isUserAppsLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 dark:border-white"></div>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">設定</h1>
        </div>
        
        {message && (
          <div className={`rounded-md p-4 ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            <p>{message.text}</p>
          </div>
        )}
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">QR決済アプリ設定</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">ダッシュボードに表示するQR決済アプリを選択してください。</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {paymentApps.map(app => (
              <div
                key={app.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors duration-200 ${
                  selectedApps.includes(app.id)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
                onClick={() => toggleAppSelection(app.id)}
              >
                <div className="flex flex-col items-center text-center">
                  {app.logo_url ? (
                    <div className="w-12 h-12 relative mb-2">
                      <img src={app.logo_url} alt={app.name} className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-2">
                      <span className="text-gray-500 dark:text-gray-300 text-lg font-semibold">
                        {app.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{app.name}</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-md text-white font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  保存中...
                </span>
              ) : '設定を保存'}
            </button>
          </div>
        </div>
        
        {/* アカウント設定（将来的に拡張予定）*/}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">アカウント設定</h2>
          <p className="text-gray-600 dark:text-gray-300">
            メールアドレス: {user?.email}
          </p>
        </div>
      </div>
    </Layout>
  );
} 