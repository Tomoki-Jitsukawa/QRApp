'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { PointApp } from '../types';
import PrioritySettings from './PrioritySettings';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, CirclePlus, ListOrdered } from 'lucide-react';

interface SettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  allPaymentApps: PointApp[];
  initialSelectedAppIds: string[];
  initialOrderedAppIds: string[];
  appsToDisplay: PointApp[];
  onSave: (finalSelectionToSave: string[], finalOrderedIds: string[]) => Promise<void>;
  isSaving: boolean;
  isLoadingApps: boolean;
  isUserLoggedIn: boolean;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  isOpen,
  onOpenChange,
  allPaymentApps,
  initialSelectedAppIds,
  initialOrderedAppIds,
  appsToDisplay, // Use this for PrioritySettings
  onSave,
  isSaving,
  isLoadingApps, // Use this for potential loading states within the dialog
  isUserLoggedIn
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedAppIds);
  const [orderedIds, setOrderedIds] = useState<string[]>(initialOrderedAppIds);
  const [activeTab, setActiveTab] = useState<string>("select");

  // Reset state when initial props change (e.g., when dialog reopens after save)
  useEffect(() => {
    console.log('Settings dialog: updating selected IDs with', initialSelectedAppIds);
    setSelectedIds(initialSelectedAppIds);
  }, [initialSelectedAppIds]);

  useEffect(() => {
    console.log('Settings dialog: updating ordered IDs with', initialOrderedAppIds);
    setOrderedIds(initialOrderedAppIds);
  }, [initialOrderedAppIds]);

  // タブが変更されたときの処理
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // 順序タブに切り替えたとき、現在の選択状態と順序に基づいて順序を再設定
    if (value === "order") {
      console.log('Settings dialog: タブを順序タブに切り替えました');
      
      // 現在の選択と初期順序を考慮して最適な順序を計算
      const selectedAppsInInitialOrder = initialOrderedAppIds
        .filter(id => selectedIds.includes(id));
        
      // 選択されているが初期順序にないIDを追加
      const remainingSelectedIds = selectedIds
        .filter(id => !initialOrderedAppIds.includes(id));
        
      // 合体させて新しい順序を生成
      const newOrderedIds = [...selectedAppsInInitialOrder, ...remainingSelectedIds];
      
      console.log('Settings dialog: 順序を再計算しました', newOrderedIds);
      setOrderedIds(newOrderedIds);
    }
  };

  const handleSelectionChange = (appId: string) => {
    setSelectedIds(prev => {
      if (prev.includes(appId)) {
        return prev.filter(id => id !== appId);
      } else {
        return [...prev, appId];
      }
    });
  };

  const handleOrderChange = useCallback((newOrder: string[]) => {
    console.log('Settings dialog: 新しい並び順を受け取りました', newOrder);
    setOrderedIds(newOrder);
  }, []);

  const handleSave = () => {
    // Determine the final list to save based on login state
    // Guests save based on selection unless ordered; logged-in save based on order filtered by selection.
    let finalSelectionToSave: string[];
    if (!isUserLoggedIn) {
      if (orderedIds.length > 0 && orderedIds.some(id => selectedIds.includes(id))) {
        finalSelectionToSave = orderedIds.filter(id => selectedIds.includes(id));
      } else {
        finalSelectionToSave = [...selectedIds];
      }
    } else {
      finalSelectionToSave = orderedIds.filter(id => selectedIds.includes(id));
    }
    
    // 現在選択されているIDと並べ替えられた順序を優先順位付きで保存
    const finalOrderedIds = [...orderedIds.filter(id => selectedIds.includes(id))];
    
    // 選択されているが、並び順に含まれていないIDがあれば追加
    selectedIds.forEach(id => {
      if (!finalOrderedIds.includes(id)) {
        finalOrderedIds.push(id);
      }
    });
    
    console.log('Settings dialog: 保存します', {
      selectedIds,
      orderedIds,
      finalSelectionToSave,
      finalOrderedIds
    });
    
    onSave(finalSelectionToSave, finalOrderedIds);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>ポイントアプリの設定</DialogTitle>
          <Tabs defaultValue="select" className="pt-2" onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="select">
                <CirclePlus className="mr-1 h-4 w-4" /> アプリ選択
              </TabsTrigger>
              <TabsTrigger value="order" disabled={selectedIds.length === 0}>
                <ListOrdered className="mr-1 h-4 w-4" /> 表示順序
              </TabsTrigger>
            </TabsList>
            <TabsContent value="select" className="pt-4">
              <DialogDescription>
                利用したいポイントアプリを選択してください。
              </DialogDescription>
              {/* App Selection List - 一行一アプリのリストに変更 */} 
              <div className="flex flex-col space-y-2 py-4 max-h-60 overflow-y-auto pr-2">
                {(allPaymentApps || []).map((app: PointApp) => (
                  <div
                    key={app.id}
                    className={`relative p-3 border rounded-lg cursor-pointer transition-all duration-200 flex items-center ${selectedIds.includes(app.id) ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/30'}`}
                    onClick={() => handleSelectionChange(app.id)}
                  >
                    <div className="flex-shrink-0 mr-3">
                      {app.logo_url ? (
                        <Image 
                          src={app.logo_url} 
                          alt={app.name} 
                          width={32} 
                          height={32} 
                          className="rounded-md object-contain"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-muted rounded-md flex items-center justify-center shadow-sm">
                          <span className="text-gray-500 text-md font-bold">{app.name.charAt(0)}</span>
                        </div>
                      )}
                    </div>
                    <span className="flex-grow font-medium text-sm">{app.name}</span>
                    <CheckCircle className={`h-5 w-5 text-primary transition-opacity ml-2 ${selectedIds.includes(app.id) ? 'opacity-100' : 'opacity-0'}`} />
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
                   // Pass apps that are currently selected for ordering
                   selectedApps={allPaymentApps.filter(app => selectedIds.includes(app.id))}
                   allAvailableApps={allPaymentApps} // Keep passing all for potential future use? Or filter based on selectedIds?
                   onOrderChange={handleOrderChange}
               />
            </TabsContent>
          </Tabs>
        </DialogHeader>

        <DialogFooter className="justify-between pt-4 border-t mt-4">
          <div className="text-sm text-muted-foreground">
            {selectedIds.length} アプリを選択中
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? '保存中...' : '設定を保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 