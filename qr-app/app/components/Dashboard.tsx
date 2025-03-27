'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '../hooks/useAuth';
import { useUserPaymentApps, useAllPaymentApps } from '../hooks/usePaymentApps';
import PaymentAppCard from './PaymentAppCard';
import { PaymentApp } from '../types';
import { openPaymentApp, getAppLink, appLaunchState, didAppLaunch } from '../lib/deepLink';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, CirclePlus, CreditCard, Settings } from 'lucide-react';
import { toast, Toaster } from 'sonner';

// アプリごとのブランドカラーを設定 (塗りつぶしデザイン)
function getBrandColor(app: PaymentApp) {
  const colors: Record<string, { bg: string, text: string, hover: string }> = {
    'PayPay': { bg: 'bg-red-500', text: 'text-white', hover: 'hover:bg-red-600' },
    'LINE Pay': { bg: 'bg-green-500', text: 'text-white', hover: 'hover:bg-green-600' },
    '楽天ペイ': { bg: 'bg-red-600', text: 'text-white', hover: 'hover:bg-red-700' },
    'd払い': { bg: 'bg-pink-500', text: 'text-white', hover: 'hover:bg-pink-600' },
    'au PAY': { bg: 'bg-orange-500', text: 'text-white', hover: 'hover:bg-orange-600' },
    'メルペイ': { bg: 'bg-blue-500', text: 'text-white', hover: 'hover:bg-blue-600' },
  };
  
  return colors[app.name] || { bg: 'bg-gray-500', text: 'text-white', hover: 'hover:bg-gray-600' };
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { userPaymentApps, isLoading: isUserAppsLoading, updateUserPaymentApps } = useUserPaymentApps();
  const { paymentApps, isLoading: isAllAppsLoading } = useAllPaymentApps();
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
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
      toast.success('決済アプリを保存しました');
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving app selection:', error);
      toast.error('保存に失敗しました。もう一度お試しください。');
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
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-9 w-16" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (showAppSelector) {
    return (
      <div className="space-y-6">
        <Card className="backdrop-blur-sm transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-2xl">利用するQR決済アプリを選択</CardTitle>
            <CardDescription>
              利用したいQR決済アプリを選択してください。後から設定画面で変更することもできます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {paymentApps.map((app: PaymentApp) => (
                <div
                  key={app.id}
                  className={`relative p-4 border rounded-xl cursor-pointer transition-all duration-200 transform hover:scale-105 ${
                    selectedApps.includes(app.id)
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-muted hover:border-primary/50'
                  }`}
                  onClick={() => toggleAppSelection(app.id)}
                >
                  {selectedApps.includes(app.id) && (
                    <div className="absolute top-2 right-2 z-10">
                      <CheckCircle className="h-5 w-5 text-primary" />
                    </div>
                  )}
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
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mb-3 shadow-sm">
                        <span className="text-gray-500 text-xl font-bold">
                          {app.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <span className="text-sm font-medium">{app.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="justify-between">
            <div className="text-sm text-muted-foreground">
              {selectedApps.length} アプリを選択中
            </div>
            <Button
              onClick={confirmSelection}
              disabled={selectedApps.length === 0 || isSaving}
              className="relative overflow-hidden group"
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  保存中...
                </span>
              ) : (
                <>
                  <span className="group-hover:translate-y-[-100%] inline-block transition-transform duration-300">選択を確定</span>
                  <span className="absolute top-0 left-0 w-full text-center translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300">
                    決定 <CheckCircle className="h-4 w-4 inline-block" />
                  </span>
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  const displayApps = appsToDisplay();
  
  return (
    <div className="space-y-8">
      <Toaster position="top-center" richColors />
      
      <div className="flex justify-between items-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">QR決済アプリ</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">編集</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>決済アプリの設定</DialogTitle>
              <DialogDescription>
                利用したいQR決済アプリを選択してください。
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-4">
              {paymentApps.map((app: PaymentApp) => (
                <div
                  key={app.id}
                  className={`relative p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedApps.includes(app.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-primary/30'
                  }`}
                  onClick={() => toggleAppSelection(app.id)}
                >
                  {selectedApps.includes(app.id) && (
                    <div className="absolute top-1 right-1 z-10">
                      <CheckCircle className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className="flex flex-col items-center text-center">
                    {app.logo_url ? (
                      <div className="w-12 h-12 relative mb-2">
                        <Image
                          src={app.logo_url}
                          alt={app.name}
                          width={48}
                          height={48}
                          className="object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-2">
                        <span className="text-muted-foreground text-lg font-bold">
                          {app.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <span className="text-xs font-medium">{app.name}</span>
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                キャンセル
              </Button>
              <Button 
                onClick={confirmSelection}
                disabled={selectedApps.length === 0 || isSaving}
              >
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    保存中...
                  </span>
                ) : '保存'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Tabs defaultValue="grid" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="grid w-[200px] grid-cols-2">
            <TabsTrigger value="grid">グリッド</TabsTrigger>
            <TabsTrigger value="list">リスト</TabsTrigger>
          </TabsList>
          <Badge variant="outline" className="gap-1">
            <CreditCard className="h-3.5 w-3.5" />
            {displayApps.length} アプリ
          </Badge>
        </div>
        
        <TabsContent value="grid" className="mt-0">
          {displayApps.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {displayApps.map(app => (
                <PaymentAppCard key={app.id} app={app} />
              ))}
            </div>
          ) : (
            <EmptyState setShowAppSelector={setShowAppSelector} />
          )}
        </TabsContent>
        
        <TabsContent value="list" className="mt-0">
          {displayApps.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {displayApps.map(app => (
                    <PaymentAppCardAppleStyle key={app.id} app={app} />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <EmptyState setShowAppSelector={setShowAppSelector} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// 空の状態表示コンポーネント
function EmptyState({ setShowAppSelector }: { setShowAppSelector: (show: boolean) => void }) {
  return (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-muted p-3 mb-4">
          <CirclePlus className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">表示するQR決済アプリがありません</h3>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          アプリを選択することで、すぐにQR決済を利用できるようになります。
        </p>
        <Button onClick={() => setShowAppSelector(true)}>
          アプリを選択する
        </Button>
      </CardContent>
    </Card>
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
    <div className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <Button
        variant="ghost"
        onClick={handleClick}
        className="w-full h-auto p-3 flex justify-between items-center rounded-none text-foreground hover:bg-transparent active:scale-[0.98] transition-transform"
      >
        <div className="flex items-center">
          {app.logo_url ? (
            <div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg flex items-center justify-center mr-3 shadow-sm">
              <Image
                src={app.logo_url}
                alt={app.name}
                width={40}
                height={40}
                className="object-contain p-1"
              />
            </div>
          ) : (
            <div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg flex items-center justify-center mr-3 shadow-sm">
              <span className="text-xl font-bold text-muted-foreground">
                {app.name.charAt(0)}
              </span>
            </div>
          )}
          <div className="flex flex-col items-start">
            <span className="font-medium group-hover:text-primary transition-colors">{app.name}</span>
            <span className="text-xs text-muted-foreground">
              {isPC ? "クリックして公式サイトを開く" : "タップして開く"}
            </span>
          </div>
        </div>
        
        <div className={`${brandColors.bg} text-white rounded-full w-14 h-7 flex items-center justify-center text-xs font-medium group-hover:scale-105 transition-all group-hover:shadow-md shadow-sm`}>
          開く
        </div>
      </Button>
    </div>
  );
} 