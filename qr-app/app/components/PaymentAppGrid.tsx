'use client';

import React, { useMemo } from 'react';
import { PaymentApp } from '../types';
import PaymentAppCard from './PaymentAppCard';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from 'lucide-react';

interface PaymentAppGridProps {
  apps: PaymentApp[];
  orderedAppIds: string[];
  onAppClick: (app: PaymentApp) => void;
  getBrandColor: (app: PaymentApp) => { bg: string, text: string, hover: string };
  isLoading?: boolean; // Add optional loading state
}

export const PaymentAppGrid: React.FC<PaymentAppGridProps> = ({
  apps,
  orderedAppIds,
  onAppClick,
  getBrandColor,
  isLoading = false,
}) => {

  // Sort apps based on the orderedAppIds
  const sortedAppsToDisplay = useMemo(() => {
    return [...apps].sort((a, b) => {
      const indexA = orderedAppIds.indexOf(a.id);
      const indexB = orderedAppIds.indexOf(b.id);
      const priorityA = indexA === -1 ? Infinity : indexA;
      const priorityB = indexB === -1 ? Infinity : indexB;
      return priorityA - priorityB;
    });
  }, [apps, orderedAppIds]);

  // Display skeletons while loading (optional)
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="p-4 border rounded-lg shadow-sm animate-pulse bg-muted">
            <div className="h-16 w-16 mx-auto mb-3 rounded-md bg-muted-foreground/20"></div>
            <div className="h-4 w-3/4 mx-auto rounded bg-muted-foreground/20"></div>
          </div>
        ))}
      </div>
    );
  }

  // Display empty state if no apps are available
  if (sortedAppsToDisplay.length === 0) {
    return (
      <Alert className="mt-6">
        <Info className="h-4 w-4" />
        <AlertTitle>利用可能なアプリがありません</AlertTitle>
        <AlertDescription>
          利用する決済アプリを設定画面から追加してください。
        </AlertDescription>
      </Alert>
    );
  }

  // Display the grid of payment app cards
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {sortedAppsToDisplay.map((app) => (
        <PaymentAppCard
          key={app.id}
          app={app}
          onAppClick={() => onAppClick(app)}
        />
      ))}
    </div>
  );
}; 