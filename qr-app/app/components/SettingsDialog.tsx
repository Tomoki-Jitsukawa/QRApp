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

  // Reset state when initial props change (e.g., when dialog reopens after save)
  useEffect(() => {
    setSelectedIds(initialSelectedAppIds);
  }, [initialSelectedAppIds]);

  useEffect(() => {
    setOrderedIds(initialOrderedAppIds);
  }, [initialOrderedAppIds]);

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
    setOrderedIds(newOrder);
  }, []);

  const handleSave = () => {
    // Determine the final list to save based on login state
    // Guests save based on selection unless ordered; logged-in save based on order filtered by selection.
    let finalSelectionToSave: string[];
    if (!isUserLoggedIn) {
      if (orderedIds.length > 0 && orderedIds.some(id => initialOrderedAppIds.includes(id))) { // Check if order was manually changed
        finalSelectionToSave = orderedIds.filter(id => selectedIds.includes(id));
      } else {
        finalSelectionToSave = [...selectedIds];
      }
    } else {
      finalSelectionToSave = orderedIds.filter(id => selectedIds.includes(id));
    }
    onSave(finalSelectionToSave, orderedIds);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>ポイントアプリの設定</DialogTitle>
          <Tabs defaultValue="select" className="pt-2">
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
              {/* App Selection Grid */} 
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-4 max-h-60 overflow-y-auto pr-2">
                {(allPaymentApps || []).map((app: PointApp) => (
                  <div
                    key={app.id}
                    className={`relative p-3 border rounded-lg cursor-pointer transition-all duration-200 ${selectedIds.includes(app.id) ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/30'}`}
                    onClick={() => handleSelectionChange(app.id)}
                  >
                    <div className="absolute top-1 right-1 z-10">
                      <CheckCircle className={`h-4 w-4 text-primary opacity-0 transition-opacity ${selectedIds.includes(app.id) ? 'opacity-100' : ''}`} />
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