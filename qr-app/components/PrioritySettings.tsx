import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical } from 'lucide-react';
import Image from 'next/image';
import { UserPaymentApp } from '@/app/types'; // パスを確認

interface SortableItemProps {
  id: string;
  item: UserPaymentApp;
  isOverlay?: boolean;
}

export function SortableItem({ id, item, isOverlay }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
    zIndex: isDragging || isOverlay ? 10 : undefined,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`flex items-center py-1 px-2 mb-1 touch-none ${isDragging ? 'shadow-lg' : ''} ${isOverlay ? 'ring-2 ring-primary' : ''} w-full`}
    >
      {/* ドラッグハンドル */}
      <Button
        variant="ghost"
        size="sm"
        {...attributes}
        {...listeners}
        className="cursor-grab px-1 mr-1 flex-shrink-0"
        aria-label="Drag handle"
      >
        <GripVertical className="h-4 w-4" />
      </Button>
      {/* ロゴ */}
      <div className="flex-shrink-0 w-6 h-6 mr-2 relative">
        {item.payment_app?.logo_url && (
          <Image
            src={item.payment_app.logo_url}
            alt={`${item.payment_app?.name || 'App'} logo`}
            layout="fill"
            objectFit="contain"
            unoptimized
          />
        )}
      </div>
      {/* アプリ名 */}
      <span className="flex-grow text-sm truncate">{item.payment_app?.name || 'Unknown App'}</span>
    </Card>
  );
} 