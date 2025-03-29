'use client';

import React from 'react';
import Image from 'next/image';
import { PaymentApp } from '../types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, CirclePlus } from 'lucide-react';

interface AppSelectorProps {
  allPaymentApps: PaymentApp[];
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
        <CardTitle>利用する決済アプリを選択</CardTitle>
        <CardDescription>
          よく使う決済アプリを選んでください。後から変更できます。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(allPaymentApps || []).map((app: PaymentApp) => (
          <div key={app.id} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Image src={app.logo_url || '/placeholder.png'} alt={app.name} width={32} height={32} className="rounded-md" />
              <span>{app.name}</span>
            </div>
            <Button
              variant={selectedAppIds.includes(app.id) ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSelectionChange(app.id)}
            >
              {selectedAppIds.includes(app.id) ? <CheckCircle className="mr-2 h-4 w-4" /> : <CirclePlus className="mr-2 h-4 w-4" />}
              {selectedAppIds.includes(app.id) ? '選択中' : '追加'}
            </Button>
          </div>
        ))}
      </CardContent>
      <CardFooter className="justify-end">
        <Button onClick={onConfirm} disabled={isSaving || selectedAppIds.length === 0}>
          {isSaving ? '保存中...' : '選択を確定'}
        </Button>
      </CardFooter>
    </Card>
  );
}; 