'use client';

import Image from 'next/image';
import { useState } from 'react';
import { PointApp } from '../types';
import { openPaymentApp } from '../lib/deepLink';

interface PointAppCardProps {
  app: PointApp;
  onClick?: (app: PointApp) => void;
}

export default function PointAppCard({ app, onClick }: PointAppCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleClick = async () => {
    if (onClick) {
      onClick(app);
      return;
    }
    
    setIsLoading(true);
    try {
      openPaymentApp(app);
    } catch (error) {
      console.error('Failed to open app:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      onClick={handleClick}
    >
      {app.logo_url ? (
        <div className="relative w-16 h-16 mb-2">
          <Image
            src={app.logo_url}
            alt={`${app.name} logo`}
            fill
            className="object-contain"
          />
        </div>
      ) : (
        <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full mb-2 flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-500 dark:text-gray-400">
            {app.name.charAt(0)}
          </span>
        </div>
      )}
      
      <h3 className="text-sm font-medium text-center">{app.name}</h3>
      
      {isLoading && (
        <div className="mt-2 animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-white"></div>
      )}
    </div>
  );
} 