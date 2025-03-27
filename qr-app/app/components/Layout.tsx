'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';
import { usePathname } from 'next/navigation';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, signOut, loading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  
  // 認証関連ページの場合は簡易レイアウト
  if (pathname?.startsWith('/auth/')) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-all duration-300">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-800">
            QR決済アプリHub
          </h2>
        </div>
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-md sm:rounded-lg sm:px-10 transition-all duration-300 border border-gray-100">
            {children}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 transition-all duration-300">
      <nav className="bg-white shadow-sm transition-all duration-300 sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="text-xl font-bold text-gray-800 transition-all duration-300 hover:text-blue-600">
                  QR決済アプリHub
                </Link>
              </div>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
              {!loading && (
                <>
                  {user ? (
                    <>
                      <Link 
                        href="/settings" 
                        className="px-3 py-2 rounded-md text-gray-500 hover:text-blue-500 hover:bg-gray-100 transition-all duration-200 font-medium"
                      >
                        設定
                      </Link>
                      <button
                        onClick={() => signOut()}
                        className="px-3 py-2 rounded-md text-gray-500 hover:text-blue-500 hover:bg-gray-100 transition-all duration-200 font-medium"
                      >
                        ログアウト
                      </button>
                    </>
                  ) : (
                    <Link 
                      href="/auth/login" 
                      className="px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
                    >
                      ログイン
                    </Link>
                  )}
                </>
              )}
            </div>
            <div className="-mr-2 flex items-center sm:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-blue-500 hover:bg-gray-100 focus:outline-none transition-all duration-200"
                aria-expanded={isMenuOpen}
              >
                <span className="sr-only">メニューを開く</span>
                <svg className={`${isMenuOpen ? 'hidden' : 'block'} h-6 w-6`} stroke="currentColor" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <svg className={`${isMenuOpen ? 'block' : 'hidden'} h-6 w-6`} stroke="currentColor" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        {/* モバイルメニュー */}
        <div 
          className={`${isMenuOpen ? 'block' : 'hidden'} sm:hidden transform transition-all duration-300 ease-in-out ${isMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}
        >
          <div className="pt-2 pb-3 space-y-1 bg-white border-b border-gray-100">
            {!loading && user ? (
              <>
                <Link
                  href="/settings"
                  className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:text-blue-500 hover:bg-gray-50 hover:border-blue-500 transition-all duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  設定
                </Link>
                <button
                  onClick={() => {
                    signOut();
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:text-blue-500 hover:bg-gray-50 hover:border-blue-500 transition-all duration-200"
                >
                  ログアウト
                </button>
              </>
            ) : (
              <Link
                href="/auth/login"
                className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:text-blue-500 hover:bg-gray-50 hover:border-blue-500 transition-all duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                ログイン
              </Link>
            )}
          </div>
        </div>
      </nav>
      
      <main className="py-6 sm:py-10 lg:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
      
      <footer className="bg-white shadow-inner transition-all duration-300 border-t border-gray-100">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} QR決済アプリHub. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
} 