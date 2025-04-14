'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Menu, LogOut, Settings, User, ChevronDown, Home } from 'lucide-react';
import { Toaster } from 'sonner';

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
      <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="text-center text-3xl font-bold text-foreground">
            ポイントアプリHub
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            あなた専用のポイントカード管理プラットフォーム
          </p>
        </div>
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <Card className="backdrop-blur-sm">
            <CardContent className="pt-6">
              {children}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Toaster position="top-center" richColors />
      
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-6 md:gap-10">
              <Link href="/" className="flex items-center space-x-2">
                <span className="inline-block font-bold text-xl">ポイントアプリHub</span>
              </Link>
              
              <nav className="hidden md:flex gap-6">
                <Link
                  href="/"
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    pathname === '/' ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  ホーム
                </Link>
                {!loading && user && (
                  <Link
                    href="/settings"
                    className={`text-sm font-medium transition-colors hover:text-primary ${
                      pathname === '/settings' ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    設定
                  </Link>
                )}
              </nav>
            </div>
            
            <div className="hidden md:flex items-center gap-2">
              {!loading && (
                <>
                  {user ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-1 h-8">
                          <User className="h-4 w-4" />
                          <span className="hidden sm:inline-block">アカウント</span>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href="/settings" className="flex items-center cursor-pointer gap-2">
                            <Settings className="h-4 w-4" />
                            <span>設定</span>
                          </Link>
                        </DropdownMenuItem>
                        <Separator className="my-1" />
                        <DropdownMenuItem onClick={() => signOut()} className="flex items-center cursor-pointer gap-2 text-red-500 focus:text-red-500">
                          <LogOut className="h-4 w-4" />
                          <span>ログアウト</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Button size="sm" asChild>
                      <Link href="/auth/login">ログイン</Link>
                    </Button>
                  )}
                </>
              )}
            </div>
            
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">メニューを開く</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <div className="grid gap-6 py-6">
                  <div className="space-y-3">
                    <Link 
                      href="/"
                      className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Home className="h-4 w-4" />
                      ホーム
                    </Link>
                    {!loading && user && (
                      <Link 
                        href="/settings"
                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Settings className="h-4 w-4" />
                        設定
                      </Link>
                    )}
                    {!loading && (
                      <>
                        {user ? (
                          <button
                            onClick={() => {
                              signOut();
                              setIsMenuOpen(false);
                            }}
                            className="flex items-center gap-2 text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
                          >
                            <LogOut className="h-4 w-4" />
                            ログアウト
                          </button>
                        ) : (
                          <Link 
                            href="/auth/login"
                            className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            <User className="h-4 w-4" />
                            ログイン
                          </Link>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      
      <main className="flex-1 py-6 sm:py-10 container">
        {children}
      </main>
      
      <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container py-6 text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} ポイントアプリHub. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
} 