'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import { PaymentApp } from '../types';
import { openPaymentApp, getAppLink, getStoreLink, openAppStore, appLaunchState, didAppLaunch } from '../lib/deepLink';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { X } from 'lucide-react';

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
      setShowQr(true);
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
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-800/50 border-gray-100 dark:border-gray-800">
      <CardContent className="p-0 relative">
        <Button
          variant="ghost"
          className="w-full p-6 h-auto rounded-none flex flex-col items-center justify-center space-y-3 text-left"
          onClick={handleClick}
        >
          <div className="flex flex-col items-center space-y-3">
            {app.logo_url ? (
              <div className="flex-shrink-0 w-16 h-16 relative group-hover:scale-110 transition-transform duration-300">
                <Image
                  src={app.logo_url}
                  alt={app.name}
                  width={64}
                  height={64}
                  className="object-contain rounded-lg"
                />
              </div>
            ) : (
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <span className="text-gray-500 dark:text-gray-300 text-xl font-bold">{app.name.charAt(0)}</span>
              </div>
            )}
            <div className="flex-1 text-center">
              <h3 className="font-medium text-foreground">{app.name}</h3>
              {app.api_available && (
                <Badge variant="secondary" className="mt-1 bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400">
                  API連携可能
                </Badge>
              )}
            </div>
          </div>
        </Button>
        
        {/* ストアオプションのバッジ（モバイルのみ、必要な場合） */}
        {!isPC && showStoreOption && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-indigo-500 to-purple-600 py-2 px-3 rounded-b-lg">
            <div className="flex justify-between items-center">
              <span className="text-white text-xs">アプリをインストール</span>
              <Button 
                variant="secondary"
                size="sm"
                className="h-7 bg-white text-indigo-600 hover:bg-gray-100"
                onClick={handleStoreClick}
              >
                ストアへ
              </Button>
            </div>
          </div>
        )}
        
        {/* QRコードダイアログ（PCの場合のみ） */}
        {isPC && (
          <Dialog open={showQr} onOpenChange={setShowQr}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-center">{app.name}を起動</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center p-4">
                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                  <QRCodeSVG
                    value={getAppLink(app)}
                    size={200}
                    bgColor={"#ffffff"}
                    fgColor={"#000000"}
                    level={"H"}
                    includeMargin={false}
                  />
                </div>
                <p className="mt-4 text-sm text-muted-foreground text-center">
                  スマートフォンでスキャンして{app.name}を開きます
                </p>
                
                {/* PCでもストアリンクを表示 */}
                {getStoreLink(app) && (
                  <div className="mt-4">
                    <Button 
                      asChild
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                    >
                      <a href={getStoreLink(app) || '#'} target="_blank" rel="noopener noreferrer">
                        ストアで見る
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
} 