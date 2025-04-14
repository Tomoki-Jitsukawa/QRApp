'use client';

import { UserPointApp } from '../types';
import PointAppCard from './PointAppCard';

interface PointAppGridProps {
  apps: UserPointApp[];
  isLoading?: boolean;
}

export default function PointAppGrid({ apps, isLoading = false }: PointAppGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
        {[...Array(5)].map((_, i) => (
          <div 
            key={`skeleton-${i}`}
            className="bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md p-4 h-32 animate-pulse"
          />
        ))}
      </div>
    );
  }
  
  if (!apps || apps.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500 dark:text-gray-400">
          ポイントアプリが選択されていません。設定から追加してください。
        </p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
      {apps.map(userApp => (
        <PointAppCard 
          key={userApp.id} 
          app={userApp.point_app!}
        />
      ))}
    </div>
  );
} 