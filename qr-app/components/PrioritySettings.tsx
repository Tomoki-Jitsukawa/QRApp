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
    // padding や marginBottom は className で制御するため削除 or コメントアウト
    zIndex: isDragging || isOverlay ? 10 : undefined, // ドラッグ中は手前に表示
    opacity: isDragging ? 0.5 : undefined,
    // cursor はハンドルに設定するため削除 or コメントアウト
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      // ドラッグハンドルにリスナーを移動したため削除
      // {...attributes}
      // {...listeners}
      className={`flex items-center p-2 mb-2 touch-none ${isDragging ? 'shadow-lg' : ''} ${isOverlay ? 'ring-2 ring-primary' : ''} w-full`} // w-full を追加し、padding (p-2) を調整
    >
      {/* ドラッグハンドル */}
      <Button
        variant="ghost"
        size="sm"
        {...attributes} // ドラッグハンドルにリスナーと属性を設定
        {...listeners}
        className="cursor-grab mr-2 px-2 flex-shrink-0" // 右マージン、padding調整、縮まないように設定
        aria-label="Drag handle"
      >
        <GripVertical className="h-5 w-5" />
      </Button>
      {/* ロゴ */}
      <div className="flex-shrink-0 w-8 h-8 mr-3 relative"> {/* ロゴのコンテナ、右マージン追加、サイズ指定 */}
        {item.payment_app?.logo_url && (
          <Image
            src={item.payment_app.logo_url}
            alt={`${item.payment_app?.name || 'App'} logo`}
            layout="fill"
            objectFit="contain"
            unoptimized // 必要に応じて unoptimized を追加 (外部URLの場合など)
          />
        )}
      </div>
      {/* アプリ名 */}
      <span className="flex-grow text-sm mr-2">{item.payment_app?.name || 'Unknown App'}</span> {/* Optional chaining と fallback を使用 */}
      {/* 優先度 (表示不要なら削除) */}
      {/* <span className="text-xs text-muted-foreground ml-auto">
        Priority: {item.priority ?? 'N/A'}
      </span> */}
    </Card>
  );
} 