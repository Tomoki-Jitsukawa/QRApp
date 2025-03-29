'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '../hooks/useAuth';
import { useUserPaymentApps, useAllPaymentApps } from '../hooks/usePaymentApps';
import PaymentAppCard from './PaymentAppCard';
import CameraCapture from './CameraCapture';
import { PaymentApp } from '../types';
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
import { useQRCodeRecognition, RecognitionResult, RecognitionError } from '../../hooks/useQRCodeRecognition';
import { AppSelector } from './AppSelector';
import { PaymentAppGrid } from './PaymentAppGrid';
import { SettingsDialog } from './SettingsDialog';

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
  const { userPaymentApps, isLoading: isUserAppsLoading, updateUserPaymentApps, isError: userPaymentAppsError } = useUserPaymentApps();
  const { paymentApps, isLoading: isAllAppsLoading, isError: allAppsError } = useAllPaymentApps();
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
  
  // State to hold the services identified by the hook's callback
  const [identifiedServices, setIdentifiedServices] = useState<string[]>([]);

  // --- 1. appsToDisplay を定義 ---
  const appsToDisplay = useMemo(() => {
    if (user && !isUserAppsLoading && userPaymentApps && userPaymentApps.length > 0) {
      return [...userPaymentApps]
          .sort((a, b) => (a.priority ?? Infinity) - (b.priority ?? Infinity))
          .map(userApp => userApp.payment_app!)
          .filter((app): app is PaymentApp => !!app);
     }
     else if (!user && selectedApps.length > 0 && paymentApps.length > 0) {
        const appMap = new Map(paymentApps.map((app: PaymentApp) => [app.id, app]));
        const guestApps = selectedApps
            .map(id => appMap.get(id))
            .filter((app): app is PaymentApp => !!app);
        return guestApps;
     }
     else {
       return [];
     }
   }, [user, isUserAppsLoading, userPaymentApps, selectedApps, paymentApps]);

  // --- Callback for successful recognition ---
  const handleRecognitionResult = useCallback((result: RecognitionResult) => {
    console.log('[Dashboard] handleRecognitionResult received:', result); // ★ Log
    const services = result.services || [];
    setIdentifiedServices(services);

    if (services.length > 0) {
      const userApps = appsToDisplay;
      let appToLaunch: PaymentApp | null = null;
      let foundMatch = false;

      for (const app of userApps) {
        const isMatch = services.some((service: string) => {
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

  // --- Callback for recognition error ---
  const handleRecognitionError = useCallback((error: RecognitionError) => {
    setIdentifiedServices([]);
  }, []);

  // --- Register callbacks with the hook ---
  useEffect(() => {
    setResultCallback(handleRecognitionResult);
  }, [setResultCallback, handleRecognitionResult]);

  useEffect(() => {
    setErrorCallback(handleRecognitionError);
  }, [setErrorCallback, handleRecognitionError]);

  // カメラダイアログを開く関数
  const openCamera = () => {
    console.log('[Dashboard] openCamera called. Resetting identifiedServices...'); // ★ Log
    // ★ スキャン開始前に必ず以前の結果をリセットする
    setIdentifiedServices([]);
    // capturedImage や recognitionError は useQRCodeRecognition フック側でリセットされる
    setIsCameraDialogOpen(true); // 状態リセットの後にダイアログを開く
  };

  // <<< Modify useEffect to ONLY set initial order based on userPaymentApps >>>
  useEffect(() => {
    if (user && userPaymentApps.length > 0) {
      const initialOrderFromDB = [...userPaymentApps]
        .sort((a, b) => (a.priority ?? Infinity) - (b.priority ?? Infinity))
        .map(upa => upa.payment_app_id);

      if (JSON.stringify(initialOrderFromDB) !== JSON.stringify(orderedAppIds)) {
          setOrderedAppIds(initialOrderFromDB);
      }
    } else if (!user) {
    }
  }, [user, userPaymentApps]);

  // --- Existing useEffect for showAppSelector --- START ---
   useEffect(() => {
    if ((!loading && user && userPaymentApps.length === 0 && !isUserAppsLoading) ||
        (!loading && !user && !localStorage.getItem('guestSelectedApps'))) {
       if (!isUserAppsLoading) {
          setShowAppSelector(true);
       }
    }

    if (!loading && !user) {
      const savedApps = localStorage.getItem('guestSelectedApps');
      if (savedApps) {
        const parsedGuestApps = JSON.parse(savedApps);
        if (JSON.stringify(parsedGuestApps) !== JSON.stringify(selectedApps)) {
           setSelectedApps(parsedGuestApps);
        }
      }
    }

    if (!loading && user && userPaymentApps.length > 0) {
       const currentDbSelectedIds = userPaymentApps.map(app => app.payment_app_id);
       if (JSON.stringify(currentDbSelectedIds) !== JSON.stringify(selectedApps)) {
          setSelectedApps(currentDbSelectedIds);
       }
       setShowAppSelector(false);
    }
  }, [loading, user, userPaymentApps, isUserAppsLoading]);
  // --- Existing useEffect for showAppSelector --- END ---

  // --- toggleAppSelection --- START ---
  const toggleAppSelection = (appId: string) => {
    setSelectedApps(prev => {
      let newSelectedApps;
      if (prev.includes(appId)) {
        newSelectedApps = prev.filter(id => id !== appId);
      } else {
        newSelectedApps = [...prev, appId];
      }
      if (!user) {
        localStorage.setItem('guestSelectedApps', JSON.stringify(newSelectedApps));
      }
      return newSelectedApps;
    });
  };
  // --- toggleAppSelection --- END ---

  // --- Updated confirmSelection to handle save triggered from SettingsDialog --- START ---
  const handleSaveSettings = async (finalSelectionToSave: string[], finalOrderedIds: string[]) => {
    setIsSaving(true);
    // console.log('[handleSaveSettings] Saving settings from Dashboard...', { finalSelectionToSave, finalOrderedIds }); // ログ削除済み

    if (!user) {
      // console.log('[handleSaveSettings] Saving for GUEST user.'); // ログ削除済み
      localStorage.setItem('guestSelectedApps', JSON.stringify(finalSelectionToSave));
      setSelectedApps(finalSelectionToSave); // Update local state
      setOrderedAppIds(finalOrderedIds); // Update local order state
      setShowAppSelector(false);
      toast.success('設定を保存しました (ゲスト)');
      setIsSettingsDialogOpen(false);
      setIsSaving(false);
      // console.log('[handleSaveSettings] GUEST save complete.'); // ログ削除済み
      return;
    }

    try {
      // console.log('[handleSaveSettings] Saving for LOGGED IN user.'); // ログ削除済み
      // Save the final selection (which should already be ordered correctly by the dialog)
      await updateUserPaymentApps(finalSelectionToSave);
      // Update local order state after successful save
      setOrderedAppIds(finalOrderedIds);
      setShowAppSelector(false);
      toast.success('決済アプリの設定を保存しました');
      setIsSettingsDialogOpen(false);
      // console.log('[handleSaveSettings] LOGGED IN save API call complete.'); // ログ削除済み
    } catch (error) {
      console.error('Error saving app selection:', error);
      toast.error('設定の保存に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  };
  // --- Updated confirmSelection --- END ---

  // --- Loading state --- START ---
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
  // --- Loading state --- END ---

  // --- App Selector UI --- START ---
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
  // --- App Selector UI --- END ---

  // --- Derive data for rendering --- START ---
  const displayApps = appsToDisplay;
  const highlightedAppNames = new Set(identifiedServices);
  const selectedAppDetails = (paymentApps || [])
      .filter((app: PaymentApp) => selectedApps.includes(app.id));
  // --- Derive data for rendering --- END ---

  return (
    <div className="space-y-8 p-4 md:p-6 pb-24">
      <Toaster position="top-center" richColors />

      {/* --- Header --- START --- */}
       <div className="flex justify-between items-center gap-2">
         <h1 className="text-2xl sm:text-3xl font-bold text-foreground">QR決済アプリ</h1>
         <div className="flex items-center gap-2">
            {/* --- Camera Dialog --- START --- */}
            <Dialog open={isCameraDialogOpen} onOpenChange={setIsCameraDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Camera className="h-4 w-4" />
                    <span className="hidden sm:inline">スキャン</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xs">
                  <DialogHeader>
                    <DialogTitle>カメラで決済サービスを認識</DialogTitle>
                    <DialogDescription>
                      お店のロゴなどを撮影して、利用可能な決済サービスを認識します。
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4 max-h-[45vh] overflow-y-auto">
                    <CameraCapture
                      onCapture={startRecognition}
                      onError={(msg) => { /* Errors are handled by the hook's callback */ }}
                      isProcessing={isRecognizing}
                    />

                    {/* --- Identified Services Section (移動してきた) --- */}
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
            {/* --- Camera Dialog --- END --- */} 

            {/* --- Settings Dialog Trigger (No longer a full Dialog here) --- START --- */}
             <Button variant="outline" size="sm" className="gap-1" onClick={() => setIsSettingsDialogOpen(true)}>
               <Settings className="h-4 w-4" />
               <span className="hidden sm:inline">編集</span>
             </Button>
            {/* --- Settings Dialog Trigger --- END --- */}

            {/* --- Render the SettingsDialog (controlled by state) --- */}
            <SettingsDialog
                isOpen={isSettingsDialogOpen}
                onOpenChange={setIsSettingsDialogOpen}
                allPaymentApps={paymentApps || []}
                initialSelectedAppIds={selectedApps}
                initialOrderedAppIds={orderedAppIds}
                appsToDisplay={appsToDisplay} // Pass apps for PrioritySettings inside dialog
                onSave={handleSaveSettings} // Pass the save handler
                isSaving={isSaving}
                isLoadingApps={isAllAppsLoading} // Pass app loading state
                isUserLoggedIn={!!user}
            />
         </div>
       </div>
      {/* --- Header --- END --- */}

      {/* --- App List Card (Add bottom margin) --- */}
      <PaymentAppGrid
        apps={displayApps}
        orderedAppIds={orderedAppIds}
        onAppClick={(app) => {
          toast.info(`${app.name} を起動します...`);
          openPaymentApp(app);
        }}
        getBrandColor={getBrandColor}
      />

    </div>
  );
} 