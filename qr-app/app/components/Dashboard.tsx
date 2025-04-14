'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '../hooks/useAuth';
import { useUserPointApps, useAllPointApps } from '../hooks/usePointApps';
import PointAppCard from './PointAppCard';
import CameraCapture from './CameraCapture';
import { PointApp } from '../types';
import { openPaymentApp, getAppLink, appLaunchState, didAppLaunch } from '../lib/deepLink';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, CirclePlus, CreditCard, Settings, Camera, Loader2 } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { XCircle, ScanEye } from 'lucide-react';
import PrioritySettings from './PrioritySettings';
import { ListOrdered } from 'lucide-react';
import { useQRCodeRecognition, RecognitionResult, RecognitionError } from '../hooks/useQRCodeRecognition';
import { AppSelector } from './AppSelector';
import PointAppGrid from './PointAppGrid';
import { SettingsDialog } from './SettingsDialog';

// アプリごとのブランドカラーを設定 (塗りつぶしデザイン)
function getBrandColor(app: PointApp) {
  const colors: Record<string, { bg: string, text: string, hover: string }> = {
    'Vポイント': { bg: 'bg-red-500', text: 'text-white', hover: 'hover:bg-red-600' },
    '楽天ポイント': { bg: 'bg-red-600', text: 'text-white', hover: 'hover:bg-red-700' },
    'dポイント': { bg: 'bg-pink-500', text: 'text-white', hover: 'hover:bg-pink-600' },
    'Ponta': { bg: 'bg-orange-500', text: 'text-white', hover: 'hover:bg-orange-600' },
    'PayPayポイント': { bg: 'bg-blue-500', text: 'text-white', hover: 'hover:bg-blue-600' },
  };
  
  return colors[app.name] || { bg: 'bg-gray-500', text: 'text-white', hover: 'hover:bg-gray-600' };
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { userPointApps, isLoading: isUserAppsLoading, updateUserPointApps, isError: userPointAppsError } = useUserPointApps();
  const { pointApps: paymentApps, isLoading: isAllAppsLoading, isError: allAppsError } = useAllPointApps();
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [showAppSelector, setShowAppSelector] = useState(false);
  const [orderedAppIds, setOrderedAppIds] = useState<string[]>([]);
  const [isCameraDialogOpen, setIsCameraDialogOpen] = useState(false);
  
  // --- useQRCodeRecognition フックを使用 ---
  const {
    isRecognizing,
    recognitionError,
    startRecognition,
    capturedImage,
    setResultCallback,
    setErrorCallback,
  } = useQRCodeRecognition();
  
  // フックのコールバックによって識別されたサービスを保持する状態
  const [identifiedServices, setIdentifiedServices] = useState<string[]>([]);

  // --- 1. appsToDisplay を定義 ---
  const appsToDisplay = useMemo(() => {
    if (user && !isUserAppsLoading && userPointApps && userPointApps.length > 0) {
      return [...userPointApps]
          .sort((a, b) => (a.priority ?? Infinity) - (b.priority ?? Infinity))
          .map(userApp => userApp.point_app!)
          .filter((app): app is PointApp => !!app);
     }
     else if (!user && selectedApps.length > 0 && paymentApps.length > 0) {
        const appMap = new Map(paymentApps.map((app: PointApp) => [app.id, app]));
        const guestApps = selectedApps
            .map(id => appMap.get(id))
            .filter((app): app is PointApp => !!app);
        return guestApps;
     }
     else {
       return [];
     }
   }, [user, isUserAppsLoading, userPointApps, selectedApps, paymentApps]);

  // --- 認識成功時のコールバック ---
  const handleRecognitionResult = useCallback((result: RecognitionResult) => {
    console.log('[Dashboard] handleRecognitionResult received:', result); // ★ ログ
    const uniqueServices = result.services ? [...new Set(result.services)] : [];
    setIdentifiedServices(uniqueServices);

    if (uniqueServices.length > 0) {
      const userApps = appsToDisplay;
      let appToLaunch: PointApp | null = null;
      let foundMatch = false;

      for (const app of userApps) {
        const isMatch = uniqueServices.some((service: string) => {
          const serviceLower = service?.toLowerCase() || '';
          const appNameLower = app.name?.toLowerCase() || '';
          return serviceLower === appNameLower;
        });
        if (isMatch) {
          appToLaunch = app;
          foundMatch = true;
          break;
        }
      }

      if (appToLaunch) {
        toast.info(`${appToLaunch.name} (優先度最高) を起動します...`);
        openPaymentApp(appToLaunch);
      } else {
        if (!foundMatch) {
        } else {
        }
        toast.info('利用可能な登録済みアプリが見つかりませんでした。');
      }
    } else {
    }
  }, [appsToDisplay]);

  // --- 認識エラー時のコールバック ---
  const handleRecognitionError = useCallback((error: RecognitionError) => {
    setIdentifiedServices([]);
  }, []);

  // --- フックにコールバックを登録 ---
  useEffect(() => {
    setResultCallback(handleRecognitionResult);
  }, [setResultCallback, handleRecognitionResult]);

  useEffect(() => {
    setErrorCallback(handleRecognitionError);
  }, [setErrorCallback, handleRecognitionError]);

  // カメラダイアログを開く関数
  const openCamera = () => {
    console.log('[Dashboard] openCamera called. Resetting identifiedServices...'); // ★ ログ
    // ★ スキャン開始前に必ず以前の結果をリセットする
    setIdentifiedServices([]);
    // capturedImage や recognitionError は useQRCodeRecognition フック側でリセットされる
    setIsCameraDialogOpen(true); // 状態リセットの後にダイアログを開く
  };

  // <<< userPointApps に基づいて初期順序のみを設定するように useEffect を変更 >>>
  useEffect(() => {
    if (user && userPointApps.length > 0) {
      const initialOrderFromDB = [...userPointApps]
        .sort((a, b) => (a.priority ?? Infinity) - (b.priority ?? Infinity))
        .map(upa => upa.point_app_id);

      if (JSON.stringify(initialOrderFromDB) !== JSON.stringify(orderedAppIds)) {
          setOrderedAppIds(initialOrderFromDB);
      }
    } else if (!user) {
    }
  }, [user, userPointApps]);

  // --- showAppSelector 用の既存の useEffect --- 開始 ---
   useEffect(() => {
    if ((!loading && user && userPointApps.length === 0 && !isUserAppsLoading) ||
        (!loading && !user && !localStorage.getItem('guestSelectedPointApps'))) {
       if (!isUserAppsLoading) {
          setShowAppSelector(true);
       }
    }

    if (!loading && !user) {
      const savedApps = localStorage.getItem('guestSelectedPointApps');
      if (savedApps) {
        const parsedGuestApps = JSON.parse(savedApps);
        if (JSON.stringify(parsedGuestApps) !== JSON.stringify(selectedApps)) {
           setSelectedApps(parsedGuestApps);
        }
      }
    }

    if (!loading && user && userPointApps.length > 0) {
       const currentDbSelectedIds = userPointApps.map(app => app.point_app_id);
       if (JSON.stringify(currentDbSelectedIds) !== JSON.stringify(selectedApps)) {
          setSelectedApps(currentDbSelectedIds);
       }
       setShowAppSelector(false);
    }
  }, [loading, user, userPointApps, isUserAppsLoading]);
  // --- showAppSelector 用の既存の useEffect --- 終了 ---

  // --- toggleAppSelection --- 開始 ---
  const toggleAppSelection = (appId: string) => {
    setSelectedApps(prev => {
      let newSelectedApps;
      if (prev.includes(appId)) {
        newSelectedApps = prev.filter(id => id !== appId);
      } else {
        newSelectedApps = [...prev, appId];
      }
      if (!user) {
        localStorage.setItem('guestSelectedPointApps', JSON.stringify(newSelectedApps));
      }
      return newSelectedApps;
    });
  };
  // --- toggleAppSelection --- 終了 ---

  // --- SettingsDialog からトリガーされる保存を処理するように confirmSelection を更新 --- 開始 ---
  const handleSaveSettings = async (finalSelectionToSave: string[], finalOrderedIds: string[]) => {
    setIsSaving(true);
    // console.log('[handleSaveSettings] Dashboardから設定を保存中...', { finalSelectionToSave, finalOrderedIds }); // ログ削除済み

    if (!user) {
      // console.log('[handleSaveSettings] ゲストユーザーとして保存中...'); // ログ削除済み
      localStorage.setItem('guestSelectedPointApps', JSON.stringify(finalSelectionToSave));
      setSelectedApps(finalSelectionToSave); // ローカル状態を更新
      setOrderedAppIds(finalOrderedIds); // ローカルの順序状態を更新
      setShowAppSelector(false);
      toast.success('設定を保存しました (ゲスト)');
      setIsSettingsDialogOpen(false);
      setIsSaving(false);
      // console.log('[handleSaveSettings] ゲスト保存完了.'); // ログ削除済み
      return;
    }

    try {
      // console.log('[handleSaveSettings] ログインユーザーとして保存中...'); // ログ削除済み
      // 最終的な選択を保存（ダイアログによって既に正しく順序付けられているはず）
      await updateUserPointApps(finalSelectionToSave);
      // 保存成功後にローカルの順序状態を更新
      setOrderedAppIds(finalOrderedIds);
      setShowAppSelector(false);
      toast.success('決済アプリの設定を保存しました');
      setIsSettingsDialogOpen(false);
      // console.log('[handleSaveSettings] ログインユーザー保存API呼び出し完了.'); // ログ削除済み
    } catch (error) {
      console.error('Error saving app selection:', error);
      toast.error('設定の保存に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  };
  // --- 更新された confirmSelection --- 終了 ---

  // --- ローディング状態 --- 開始 ---
  if (loading || (isAllAppsLoading && showAppSelector)) {
     return (
      <div className="space-y-4 p-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-9 w-24" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    );
  }
  // --- ローディング状態 --- END ---

  // --- アプリ選択UI --- 開始 ---
  if (showAppSelector) {
    return (
        <AppSelector
            allPaymentApps={paymentApps || []}
            selectedAppIds={selectedApps}
            onSelectionChange={toggleAppSelection}
            onConfirm={() => {
                setShowAppSelector(false);
            }}
            isSaving={isSaving}
            isLoading={isAllAppsLoading}
        />
    );
  }
  // --- アプリ選択UI --- 終了 ---

  // --- レンダリング用データ導出 --- 開始 ---
  const displayApps = appsToDisplay;
  const highlightedAppNames = new Set(identifiedServices);
  const selectedAppDetails = (paymentApps || [])
      .filter((app: PointApp) => selectedApps.includes(app.id));
      
  // PointAppGridに渡すためにUserPointApp形式に変換
  const displayUserApps = displayApps.map((app, index) => ({
    id: `display-${app.id}`,
    user_id: user?.id || 'guest',
    point_app_id: app.id,
    point_app: app,
    priority: index,
    is_active: true
  }));
  // --- レンダリング用データ導出 --- 終了 ---

  return (
    <div className="space-y-8 p-4 md:p-6 pb-24">
      <Toaster position="top-center" richColors />

      {/* --- ヘッダー --- 開始 --- */}
       <div className="flex justify-between items-center gap-2">
         <h1 className="text-2xl sm:text-3xl font-bold text-foreground">ポイントアプリHub</h1>
         <div className="flex items-center gap-2">
            {/* --- カメラダイアログ --- 開始 --- */}
            <Dialog open={isCameraDialogOpen} onOpenChange={setIsCameraDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Camera className="h-4 w-4" />
                    <span className="hidden sm:inline">スキャン</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>カメラで決済サービスを認識</DialogTitle>
                    <DialogDescription>
                      お店のロゴなどを撮影して、利用可能な決済サービスを認識します。
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto">
                    <CameraCapture
                      onCapture={startRecognition}
                      onError={(msg) => { /* エラーはフックのコールバックで処理される */ }}
                      isProcessing={isRecognizing}
                    />

                    {/* --- 認識されたサービスセクション (移動してきた) --- */}
                    {(isRecognizing || identifiedServices.length > 0 || recognitionError !== null) && (
                      <Card className="shadow-sm mt-4"> {/* 少し上にマージンを追加 */} 
                        {/* カードヘッダーはダイアログにあるので削除しても良いかも？ */}
                        {/* <CardHeader>
                          <CardTitle className="text-lg font-medium flex items-center">
                            <ScanEye className="mr-2 h-5 w-5" />
                            お店で使える決済サービス (スキャン結果)
                          </CardTitle>
                        </CardHeader> */}
                        <CardContent className="pt-4"> {/* ヘッダー削除に伴いptを追加 */} 
                          {isRecognizing ? (
                            <div className="flex items-center justify-center py-4 text-muted-foreground">
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              認識中...
                            </div>
                          ) : recognitionError ? (
                            <Alert variant="destructive" className="mt-0">
                              <XCircle className="h-4 w-4" />
                              <AlertTitle>認識エラー</AlertTitle>
                              <AlertDescription>{recognitionError.message}</AlertDescription>
                            </Alert>
                          ) : identifiedServices.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {identifiedServices.map(serviceName => (
                                <Badge key={serviceName} variant="secondary" className="text-sm">
                                  {serviceName}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              対応する決済サービスが見つかりませんでした。
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                   <DialogFooter>
                     <Button variant="outline" onClick={() => setIsCameraDialogOpen(false)}>閉じる</Button>
                   </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* --- カメラダイアログ --- 終了 --- */}

            {/* --- 設定ダイアログトリガー (ここでは完全なダイアログではない) --- 開始 --- */}
             <Button variant="outline" size="sm" className="gap-1" onClick={() => setIsSettingsDialogOpen(true)}>
               <Settings className="h-4 w-4" />
               <span className="hidden sm:inline">編集</span>
             </Button>
            {/* --- 設定ダイアログトリガー --- 終了 --- */}

            {/* --- SettingsDialogをレンダリング (状態によって制御) --- */}
            <SettingsDialog
                isOpen={isSettingsDialogOpen}
                onOpenChange={setIsSettingsDialogOpen}
                allPaymentApps={paymentApps || []}
                initialSelectedAppIds={selectedApps}
                initialOrderedAppIds={orderedAppIds}
                appsToDisplay={displayApps}
                onSave={handleSaveSettings}
                isSaving={isSaving}
                isLoadingApps={isUserAppsLoading || isAllAppsLoading}
                isUserLoggedIn={!!user}
            />
         </div>
       </div>
      {/* --- ヘッダー --- 終了 --- */}

      {/* --- アプリリストカード (下マージン追加) --- */}
      <PointAppGrid
        apps={displayUserApps}
        isLoading={isUserAppsLoading}
      />

    </div>
  );
} 