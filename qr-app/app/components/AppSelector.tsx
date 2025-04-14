'use client';

import React from 'react';
import Image from 'next/image';
import { PointApp } from '../types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, CirclePlus } from 'lucide-react';

interface AppSelectorProps {
  allPaymentApps: PointApp[];
  selectedAppIds: string[];
  onSelectionChange: (appId: string) => void;
  onConfirm: () => void;
  isSaving: boolean;
  isLoading?: boolean; // Optional loading state for apps
}

export const AppSelector: React.FC<AppSelectorProps> = ({
  allPaymentApps,
  selectedAppIds,
  onSelectionChange,
  onConfirm,
  isSaving,
  isLoading = false, // Default to false
}) => {

  if (isLoading) {
    return (
        <Card className="w-full max-w-2xl mx-auto mt-8">
            <CardHeader>
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-64 mt-1" />
            </CardHeader>
            <CardContent className="space-y-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <Skeleton className="h-8 w-8 rounded-md" />
                            <Skeleton className="h-5 w-24" />
                        </div>
                        <Skeleton className="h-9 w-24 rounded-md" />
                    </div>
                ))}
            </CardContent>
            <CardFooter className="justify-end">
                <Skeleton className="h-10 w-32 rounded-md" />
            </CardFooter>
        </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8">
        <CardHeader>
            <CardTitle>ポイントアプリの選択</CardTitle>
            <CardDescription>
                利用したいポイントアプリを選択してください
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {allPaymentApps.map((app) => (
                <div key={app.id} className="flex items-center justify-between p-3 border rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-700">
                    <div className="flex items-center space-x-3">
                        {app.logo_url ? (
                            <Image 
                                src={app.logo_url} 
                                alt={app.name} 
                                width={32} 
                                height={32} 
                                className="rounded-md"
                            />
                        ) : (
                            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center">
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                    {app.name.charAt(0)}
                                </span>
                            </div>
                        )}
                        <span className="font-medium">{app.name}</span>
                    </div>
                    <Button
                        variant={selectedAppIds.includes(app.id) ? "default" : "outline"}
                        size="sm"
                        onClick={() => onSelectionChange(app.id)}
                    >
                        {selectedAppIds.includes(app.id) ? (
                            <>
                                <CheckCircle className="mr-1 h-4 w-4" />
                                選択中
                            </>
                        ) : (
                            <>
                                <CirclePlus className="mr-1 h-4 w-4" />
                                選択する
                            </>
                        )}
                    </Button>
                </div>
            ))}
        </CardContent>
        <CardFooter className="justify-between pt-4 border-t mt-4">
            <div className="text-sm text-muted-foreground">
                {selectedAppIds.length} アプリを選択中
            </div>
            <Button 
                onClick={onConfirm}
                disabled={isSaving || selectedAppIds.length === 0}
            >
                {isSaving ? '保存中...' : '完了'}
            </Button>
        </CardFooter>
    </Card>
  );
}; 