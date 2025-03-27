'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../hooks/useAuth';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { signUp, signInWithSocial } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    // パスワード一致チェック
    if (password !== confirmPassword) {
      setError('パスワードが一致しません。');
      setIsLoading(false);
      return;
    }

    try {
      const result = await signUp(email, password);
      if (result) {
        setSuccess('登録確認メールを送信しました。メールをご確認ください。');
      }
    } catch (err: any) {
      setError(err.message || '登録に失敗しました。再度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignUp = async (provider: 'google' | 'apple') => {
    try {
      await signInWithSocial(provider);
    } catch (err: any) {
      setError(err.message || `${provider}での登録に失敗しました。`);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-red-800">
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="rounded-md bg-green-50 p-4 text-green-800">
          <p>{success}</p>
          <p className="mt-2">
            <Link href="/auth/login" className="font-medium text-green-600 hover:text-green-500">
              ログインページへ
            </Link>
          </p>
        </div>
      )}

      {!success && (
        <>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                パスワード
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                8文字以上の英数字を組み合わせてください
              </p>
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                パスワード（確認）
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    処理中...
                  </span>
                ) : '登録する'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">または</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => handleSocialSignUp('google')}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866.549 3.921 1.453l2.814-2.814C17.503 2.988 15.139 2 12.545 2 7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z" />
                </svg>
                Googleで登録
              </button>
              <button
                onClick={() => handleSocialSignUp('apple')}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.45-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.47C2.23 14.53 3.5 5.5 8.75 5.5c1.26.05 2.11.58 2.86.58.75 0 2.17-.72 3.65-.61 1.71.13 2.94.86 3.54 2.18-3.39 2.03-2.85 6.14.25 7.61-.7 1.67-1.43 3.3-3 5.02M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-.9 3.13-.64.86-1.87 1.51-2.86 1.44-.15-1.15.4-2.35.82-3.07z" />
                </svg>
                Appleで登録
              </button>
            </div>
          </div>
        </>
      )}

      <div className="text-sm text-center">
        <p className="text-gray-600 dark:text-gray-400">
          すでにアカウントをお持ちの方は{' '}
          <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
            ログイン
          </Link>
        </p>
      </div>
    </div>
  );
} 