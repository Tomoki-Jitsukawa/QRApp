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
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [identifiedServices, setIdentifiedServices] = useState<string[]>([]);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [cameraError, setCameraError] = useState<string>('');

  // --- 1. appsToDisplay を定義 ---
  const appsToDisplay = useMemo(() => {
    // ★ログ復活・詳細化
    console.log('[appsToDisplay useMemo] Calculating...', {
        isLoggedIn: !!user,
        isUserAppsLoading,
        userPaymentAppsCount: userPaymentApps?.length ?? 'N/A', // null も考慮
        selectedApps, // selectedApps の内容自体をログ出力
        paymentAppsCount: paymentApps?.length ?? 'N/A' // null も考慮
    });
    if (user && !isUserAppsLoading && userPaymentApps && userPaymentApps.length > 0) {
      console.log('[appsToDisplay useMemo] Using userPaymentApps (sorted)');
      return [...userPaymentApps]
          .sort((a, b) => (a.priority ?? Infinity) - (b.priority ?? Infinity))
          .map(userApp => userApp.payment_app!)
          .filter((app): app is PaymentApp => !!app);
     }
     else if (!user && selectedApps.length > 0 && paymentApps.length > 0) {
        console.log('[appsToDisplay useMemo] Using selectedApps (guest mode)');
        const appMap = new Map(paymentApps.map((app: PaymentApp) => [app.id, app]));
        const guestApps = selectedApps
            .map(id => appMap.get(id))
            .filter((app): app is PaymentApp => !!app);
        // ★ログ追加: ゲストモードで計算されたアプリリスト
        console.log('[appsToDisplay useMemo] Calculated guest apps:', guestApps.map(a => a.name));
        return guestApps;
     }
     else {
       console.log('[appsToDisplay useMemo] Returning empty array. Conditions not met.');
       return [];
     }
   }, [user, isUserAppsLoading, userPaymentApps, selectedApps, paymentApps]); // 依存配列は変更なし

  // --- 2. handleResult を定義 (appsToDisplay に依存) ---
  const handleResult = useCallback((services: string[]) => {
    console.log('[handleResult] Received services from API:', services);
    console.log('[handleResult] Current appsToDisplay (priority order):', appsToDisplay.map(app => ({ name: app.name, id: app.id })));
    setIdentifiedServices(services);
    setIsRecognizing(false);
    setCameraError('');

    if (services.length > 0) {
        toast.success(`${services.join(', ')} が見つかりました。`);
        const userApps = appsToDisplay; // この時点での最新の appsToDisplay を使う
        let appToLaunch: PaymentApp | null = null;
        let foundMatch = false;

        for (const app of userApps) {
           console.log(`[handleResult] Comparing service names with app: name='${app.name}' (length: ${app.name?.length})`);
           const isMatch = services.some(service => {
               const serviceLower = service?.toLowerCase() || '';
               const appNameLower = app.name?.toLowerCase() || '';
               console.log(`  Comparing: '${serviceLower}' (len:${serviceLower.length}) === '${appNameLower}' (len:${appNameLower.length}) -> ${serviceLower === appNameLower}`);
               if (serviceLower.includes('paypay') || appNameLower.includes('paypay')) {
                  console.log(`    (PayPay comparison check: service='${service}', app.name='${app.name}')`);
               }
               return serviceLower === appNameLower;
           });
           if (isMatch) {
               appToLaunch = app;
               foundMatch = true;
               console.log(`[handleResult] Match found! App to launch: ${app.name} (Priority highest)`);
               break;
           }
        }
        if (appToLaunch) {
            console.log(`[handleResult] Attempting to call openPaymentApp for: ${appToLaunch.name}`);
            toast.info(`${appToLaunch.name} (優先度最高) を起動します...`);
            openPaymentApp(appToLaunch);
        } else {
            if (!foundMatch) {
               console.log('[handleResult] No matching app found in appsToDisplay for the identified services.');
               console.log('  Recognized services:', services);
               console.log('  Available apps:', appsToDisplay.map(a => a.name));
            } else {
               console.warn('[handleResult] Logic error: Match found but appToLaunch is null.');
            }
            toast.info('利用可能な登録済みアプリが見つかりませんでした。');
        }
    } else {
        console.log('[handleResult] No services identified by API.');
    }
  }, [appsToDisplay, openPaymentApp]); // openPaymentApp が安定なら外しても良い

  // --- 3. handleError を定義 ---
  const handleError = useCallback((message: string) => {
    console.error('Camera/API Error:', message);
    setCameraError(message);
    setIdentifiedServices([]);
    setIsRecognizing(false);
    toast.error(`認識エラー: ${message}`);
  }, []);

  // --- 4. & 5. Ref を初期値 null で作成 ---
  const handleResultRef = useRef<((services: string[]) => void) | null>(null);
  const handleErrorRef = useRef<((message: string) => void) | null>(null);

  // --- 6. & 7. useEffect で Ref を更新 ---
  useEffect(() => {
    handleResultRef.current = handleResult;
  }, [handleResult]);

  useEffect(() => {
    handleErrorRef.current = handleError;
  }, [handleError]);

  // --- 8. handleCapture を定義 (依存配列 []) ---
  const handleCapture = useCallback(async (imageDataUrl: string) => {
    console.log('Image captured, calling API...');
    setCapturedImage(imageDataUrl);
    setIdentifiedServices([]);
    setCameraError('');
    setIsRecognizing(true);

    try {
      const response = await fetch('/api/recognize-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageDataUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }

      const result = await response.json();
      console.log("API response received:", result);
      // Ref を介して呼び出す (Optional Chaining を使用)
      handleResultRef.current?.(result.services || []);

    } catch (error) {
      console.error("Failed to call recognition API:", error);
      // Ref を介して呼び出す (Optional Chaining を使用)
      handleErrorRef.current?.(error instanceof Error ? error.message : "Unknown error occurred during recognition.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 依存配列は空

  // <<< Modify useEffect to ONLY set initial order based on userPaymentApps >>>
  useEffect(() => {
    // Only run if logged in and apps are loaded
    if (user && userPaymentApps.length > 0) {
      const initialOrderFromDB = [...userPaymentApps]
        .sort((a, b) => (a.priority ?? Infinity) - (b.priority ?? Infinity))
        .map(upa => upa.payment_app_id);

      // Set state only if it differs from the current state
      // (Avoids potential loops if userPaymentApps instance changes but content doesn't)
      if (JSON.stringify(initialOrderFromDB) !== JSON.stringify(orderedAppIds)) {
          console.log("Setting initial orderedAppIds from DB:", initialOrderFromDB);
          setOrderedAppIds(initialOrderFromDB);
      }
    } else if (!user) {
        // Optional: Reset order on logout or for guest mode initialization if needed
        // If guest order is handled entirely by local storage and PrioritySettings initial state,
        // this might not be necessary.
        // setOrderedAppIds([]); // Example reset
    }
    // <<< Update dependency array >>>
  }, [user, userPaymentApps]); // Depend only on user login state and fetched prioritized apps

  // --- Existing useEffect for showAppSelector --- START ---
   useEffect(() => {
    // ログイン済みで選択アプリがない場合、または未ログインでゲストモードの場合
    if ((!loading && user && userPaymentApps.length === 0 && !isUserAppsLoading) || // Check loading state
        (!loading && !user && !localStorage.getItem('guestSelectedApps'))) {
      // Don't show selector immediately if apps are still loading
       if (!isUserAppsLoading) {
          setShowAppSelector(true);
       }
    }

    // ゲストモードの場合、ローカルストレージから選択済みアプリを取得
    if (!loading && !user) {
      const savedApps = localStorage.getItem('guestSelectedApps');
      if (savedApps) {
        // Make sure selectedApps state reflects guest data
        const parsedGuestApps = JSON.parse(savedApps);
        // Compare before setting to avoid unnecessary re-renders/loops
        if (JSON.stringify(parsedGuestApps) !== JSON.stringify(selectedApps)) {
           setSelectedApps(parsedGuestApps); // This updates the state based on localStorage
        }
      }
    }

    // ログイン済みの場合は、選択済みアプリを設定 (初回または変更時)
    if (!loading && user && userPaymentApps.length > 0) {
       const currentDbSelectedIds = userPaymentApps.map(app => app.payment_app_id);
       if (JSON.stringify(currentDbSelectedIds) !== JSON.stringify(selectedApps)) {
          setSelectedApps(currentDbSelectedIds);
       }
       // Hide selector once apps are loaded for logged-in user
       setShowAppSelector(false);
    }
  // ★依存配列から selectedApps を削除
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
      // Update local storage for guest
      if (!user) {
        localStorage.setItem('guestSelectedApps', JSON.stringify(newSelectedApps));
      }
      return newSelectedApps;
    });
  };
  // --- toggleAppSelection --- END ---

  // Callback for PrioritySettings component
  const handleOrderChange = useCallback((newOrder: string[]) => {
    setOrderedAppIds(newOrder);
  }, []);


  // --- Updated confirmSelection to include order --- START ---
  const confirmSelection = async () => {
    setIsSaving(true);
    // Get the final ordered list based on the current selection
    // ★ログ追加: 保存直前の selectedApps と orderedAppIds
    console.log('[confirmSelection] Starting save...', { currentSelectedApps: selectedApps, currentOrderedAppIds: orderedAppIds });

    // ★修正: 保存する最終的なIDリストを決定するロジック
    let finalSelectionToSave: string[];
    if (!user) { // Guest mode
        if (orderedAppIds.length > 0) {
             // If user explicitly ordered, filter based on order and selection
            finalSelectionToSave = orderedAppIds.filter(id => selectedApps.includes(id));
            console.log('[confirmSelection] Using explicitly ordered IDs for guest:', finalSelectionToSave);
        } else {
            // If user did not order, save the selected apps directly
            finalSelectionToSave = [...selectedApps]; // Use a copy of selectedApps
             console.log('[confirmSelection] Using selected apps directly for guest (no explicit order):', finalSelectionToSave);
        }
    } else { // Logged-in user
        // For logged-in users, always filter by orderedAppIds (priority matters)
        finalSelectionToSave = orderedAppIds.filter(id => selectedApps.includes(id));
        console.log('[confirmSelection] Final ordered selection for logged-in user:', finalSelectionToSave);
    }

    // ★ログ追加: 最終的に保存/更新するIDリスト
    console.log('[confirmSelection] Final selection to save/update:', finalSelectionToSave);

    // For guest users, save to local storage and update state
    if (!user) {
        // ★ログ追加: ゲストモードでの保存
        console.log('[confirmSelection] Saving for GUEST user.');
        localStorage.setItem('guestSelectedApps', JSON.stringify(finalSelectionToSave)); // 修正されたリストを保存
        setSelectedApps(finalSelectionToSave); // ★重要: 修正されたリストでステートを更新
        setShowAppSelector(false);
        toast.success('設定を保存しました (ゲスト)');
        setIsSettingsDialogOpen(false);
        setIsSaving(false);
        // ★ログ追加: ゲストモード保存完了後の selectedApps
        console.log('[confirmSelection] GUEST save complete. New selectedApps state should be:', finalSelectionToSave);
        return; // Exit for guest user
    }

    // For logged-in users, update via the hook
    try {
      // ★ログ追加: ログインユーザーでの保存
      console.log('[confirmSelection] Saving for LOGGED IN user.');
      await updateUserPaymentApps(finalSelectionToSave); // 修正されたリストで更新
      // Note: updateUserPaymentApps should trigger a re-fetch of userPaymentApps,
      // which will then update appsToDisplay via the useMemo dependency.
      setShowAppSelector(false); // Hide selector if it was shown
      toast.success('決済アプリの設定を保存しました');
      setIsSettingsDialogOpen(false); // Close the settings dialog
       // ★ログ追加: ログインユーザー保存 API 呼び出し完了
       console.log('[confirmSelection] LOGGED IN save API call complete.');
    } catch (error) {
      console.error('Error saving app selection:', error);
      toast.error('設定の保存に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  };
  // --- Updated confirmSelection to include order --- END ---


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
      <Card className="w-full max-w-2xl mx-auto mt-8">
        <CardHeader>
          <CardTitle>利用する決済アプリを選択</CardTitle>
          <CardDescription>
            よく使う決済アプリを選んでください。後から変更できます。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(paymentApps || []).map((app: PaymentApp) => (
            <div key={app.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Image src={app.logo_url || '/placeholder.png'} alt={app.name} width={32} height={32} className="rounded-md" />
                <span>{app.name}</span>
              </div>
              <Button
                variant={selectedApps.includes(app.id) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleAppSelection(app.id)}
              >
                {selectedApps.includes(app.id) ? <CheckCircle className="mr-2 h-4 w-4" /> : <CirclePlus className="mr-2 h-4 w-4" />}
                {selectedApps.includes(app.id) ? '選択中' : '追加'}
              </Button>
            </div>
          ))}
        </CardContent>
        <CardFooter className="justify-end">
          <Button onClick={confirmSelection} disabled={isSaving || selectedApps.length === 0}>
            {isSaving ? '保存中...' : '選択を確定'}
          </Button>
        </CardFooter>
      </Card>
    );
  }
  // --- App Selector UI --- END ---

  // --- Derive data for rendering --- START ---
  const displayApps = appsToDisplay;
  const highlightedAppNames = new Set(identifiedServices);
  // Derive selected app details for PrioritySettings based on the *currently selected* IDs
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
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>カメラで決済サービスを認識</DialogTitle>
                    <DialogDescription>
                      お店のロゴなどを撮影して、利用可能な決済サービスを認識します。
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4 max-h-[80vh] overflow-y-auto">
                    <CameraCapture
                      onCapture={handleCapture}
                      onError={handleError}
                      isProcessing={isRecognizing}
                    />
                     {cameraError && (
                       <Alert variant="destructive">
                         <XCircle className="h-4 w-4" />
                         <AlertTitle>エラー</AlertTitle>
                         <AlertDescription>{cameraError}</AlertDescription>
                       </Alert>
                     )}
                     {identifiedServices.length > 0 && (
                       <Alert variant="default">
                         <ScanEye className="h-4 w-4" />
                         <AlertTitle>認識されたサービス</AlertTitle>
                         <AlertDescription>{identifiedServices.join(', ')}</AlertDescription>
                       </Alert>
                     )}
                  </div>
                   <DialogFooter>
                     <Button variant="outline" onClick={() => setIsCameraDialogOpen(false)}>閉じる</Button>
                   </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* --- Camera Dialog --- END --- */} 

            {/* --- Updated Settings Dialog --- START --- */} 
            <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
              <DialogTrigger asChild>
                 <Button variant="outline" size="sm" className="gap-1">
                   <Settings className="h-4 w-4" />
                   <span className="hidden sm:inline">編集</span>
                 </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                 <DialogHeader>
                   <DialogTitle>決済アプリの設定</DialogTitle>
                   {/* Use Tabs for selection and ordering */} 
                   <Tabs defaultValue="select" className="pt-2">
                     <TabsList className="grid w-full grid-cols-2">
                       <TabsTrigger value="select">
                         <CirclePlus className="mr-1 h-4 w-4" /> アプリ選択
                       </TabsTrigger>
                       <TabsTrigger value="order" disabled={selectedApps.length === 0}> {/* Disable tab if no apps selected */}
                         <ListOrdered className="mr-1 h-4 w-4" /> 表示順序
                       </TabsTrigger>
                     </TabsList>
                     <TabsContent value="select" className="pt-4">
                       <DialogDescription>
                           利用したいQR決済アプリを選択してください。
                       </DialogDescription>
                       {/* App selection grid */} 
                       <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-4 max-h-60 overflow-y-auto pr-2">
                         {(paymentApps || []).map((app: PaymentApp) => (
                           <div
                             key={app.id}
                             className={`relative p-3 border rounded-lg cursor-pointer transition-all duration-200 ${selectedApps.includes(app.id) ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/30'}`}
                             onClick={() => toggleAppSelection(app.id)}
                           >
                               <div className="absolute top-1 right-1 z-10">
                                 <CheckCircle className={`h-4 w-4 text-primary opacity-0 transition-opacity ${selectedApps.includes(app.id) ? 'opacity-100' : ''}`} />
                               </div>
                               <div className="flex flex-col items-center text-center space-y-2">
                                 {app.logo_url ? (
                                    <div className="w-12 h-12 relative"><Image src={app.logo_url} alt={app.name} width={48} height={48} style={{ objectFit: 'contain', width: '100%', height: '100%' }} className="rounded-md"/></div>
                                  ) : ( <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center shadow-sm"><span className="text-gray-500 text-lg font-bold">{app.name.charAt(0)}</span></div> )}
                                  <span className="text-xs font-medium">{app.name}</span>
                               </div>
                           </div>
                         ))}
                       </div>
                     </TabsContent>
                     <TabsContent value="order" className="pt-4">
                       <DialogDescription>
                         ドラッグ＆ドロップで表示したい順序に並び替えてください。
                         <br/><span className="text-xs text-muted-foreground">(一番上が最も優先度が高くなります)</span>
                       </DialogDescription>
                        {/* Priority Settings Component */} 
                        <PrioritySettings
                            selectedApps={appsToDisplay}
                            allAvailableApps={paymentApps || []}
                            onOrderChange={handleOrderChange}
                        />
                     </TabsContent>
                   </Tabs>
                 </DialogHeader>

                 <DialogFooter className="justify-between pt-4 border-t mt-4">
                    <div className="text-sm text-muted-foreground">
                      {selectedApps.length} アプリを選択中
                    </div>
                    {/* Save button triggers the updated confirmSelection */}
                    <Button onClick={confirmSelection} disabled={isSaving}>
                      {isSaving ? '保存中...' : '設定を保存'}
                    </Button>
                 </DialogFooter>
              </DialogContent>
            </Dialog>
            {/* --- Updated Settings Dialog --- END --- */}
         </div>
       </div>
      {/* --- Header --- END --- */}

      {/* --- App List Card (Add bottom margin) --- */}
      <Card className="shadow-sm mb-8">
         <CardHeader>
            <CardTitle>利用可能な決済アプリ</CardTitle>
         </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {displayApps.map((app: PaymentApp) => (
            <PaymentAppCard
              key={app.id}
              app={app}
              isHighlighted={highlightedAppNames.has(app.name)}
              onAppClick={async () => {
                toast.info(`${app.name} を起動します...`);
                openPaymentApp(app);
              }}
            />
          ))}
          {/* ... Skeleton and Empty State ... */}
        </CardContent>
      </Card>

      {/* --- Identified Services Section (Conditional Rendering with Logging) --- */}
      {(isRecognizing || identifiedServices.length > 0 || cameraError) && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center">
              <ScanEye className="mr-2 h-5 w-5" />
              お店で使える決済サービス (スキャン結果)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              console.log(`[Render Identified Services] isRecognizing: ${isRecognizing}, cameraError: ${cameraError}, services.length: ${identifiedServices.length}`);
              return null;
            })()}
            {isRecognizing ? (
              <div className="flex items-center justify-center py-4 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                認識中...
              </div>
            ) : cameraError ? (
              <Alert variant="destructive" className="mt-0">
                <XCircle className="h-4 w-4" />
                <AlertTitle>認識エラー</AlertTitle>
                <AlertDescription>{cameraError}</AlertDescription>
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
  );
} 