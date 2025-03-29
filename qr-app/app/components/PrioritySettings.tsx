'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PaymentApp } from '../types'; // Adjust path as needed
import { GripVertical } from 'lucide-react';
import { Card } from '@/components/ui/card'; // Assuming shadcn/ui Card

// Represents an app item with its ID for dnd-kit
interface SortableAppItem extends PaymentApp {
  dndId: string; // dnd-kit requires a unique string ID
}

interface SortableItemProps {
  item: SortableAppItem;
}

// Individual sortable item component
function SortableItem({ item }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.dndId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <Card
        ref={setNodeRef}
        style={style}
        className={`mb-2 p-2 flex items-center bg-background shadow-sm border ${isDragging ? 'shadow-lg border-primary' : ''}`}
    >
        <button
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none mr-2 p-1 text-muted-foreground hover:text-foreground"
            aria-label={`並び替えハンドル ${item.name}`}
        >
            <GripVertical size={18} />
        </button>
        <div className="flex-shrink-0 mr-2">
         {item.logo_url ? (
            <Image
             src={item.logo_url}
             alt={item.name}
             width={24}
             height={24}
             className="rounded-sm object-contain"
            />
          ) : (
            <div className="w-6 h-6 bg-muted rounded-sm flex items-center justify-center">
              <span className="text-muted-foreground font-semibold text-xs">{item.name.charAt(0)}</span>
            </div>
          )}
        </div>
        <span className="text-sm font-medium truncate">{item.name}</span>
    </Card>
  );
}


interface PrioritySettingsProps {
  selectedApps: PaymentApp[]; // The currently selected apps by the user
  allAvailableApps: PaymentApp[]; // All possible apps to derive details from
  onOrderChange: (orderedAppIds: string[]) => void; // Callback when order changes
}

// Main Priority Settings component
export default function PrioritySettings({ selectedApps: initialSelectedApps, allAvailableApps, onOrderChange }: PrioritySettingsProps) {
  const [items, setItems] = useState<SortableAppItem[]>([]);

  // Initialize items based on props, preserving internal order if ID sets match
  useEffect(() => {
    const appMap = new Map(allAvailableApps.map(app => [app.id, app]));

    // props から渡された ID のセット (ソート済み)
    const propAppIdsSorted = JSON.stringify([...initialSelectedApps.map(app => app.id)].sort());
    // 現在の内部 state の ID のセット (ソート済み)
    const currentItemIdsSorted = JSON.stringify([...items.map(item => item.id)].sort());

    // ID のセット自体が変更されたか比較
    if (propAppIdsSorted !== currentItemIdsSorted) {
        // 選択されているアプリのリストが変わった場合のみ、props ベースで items を再構築する
        console.log("PrioritySettings: Set of selected app IDs changed. Resetting items based on props.");
        const newItems = initialSelectedApps
          .map(app => appMap.get(app.id)) // Get full app details
          .filter((app): app is PaymentApp => !!app) // Filter out any potential misses
          .map(app => ({ ...app, dndId: app.id })); // Add dndId
        setItems(newItems);
    } else {
        // IDセットが変わっていない（順序だけが変わった可能性がある）場合は、
        // ユーザーのドラッグ操作による内部順序を維持するため、何もしない。
        console.log("PrioritySettings: IDs match, preserving internal order.");
    }
    // この Effect は、選択されているアプリのリスト (initialSelectedApps) か
    // 全アプリリスト (allAvailableApps) が変更されたときのみ実行されるべき
    // items を依存配列に加えるとループのリスクがあるため含めない
  }, [initialSelectedApps, allAvailableApps]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // Start dragging after 5px move
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      let newOrderedItems: SortableAppItem[] = [];
      setItems((currentItems) => {
        const oldIndex = currentItems.findIndex((item) => item.dndId === active.id);
        const newIndex = currentItems.findIndex((item) => item.dndId === over.id);
        newOrderedItems = arrayMove(currentItems, oldIndex, newIndex);
        console.log("PrioritySettings: Items reordered internally via drag", newOrderedItems.map(i => i.id));
        return newOrderedItems;
      });

      if (newOrderedItems.length > 0) {
          console.log("PrioritySettings: Drag end, calling onOrderChange directly with order:", newOrderedItems.map(item => item.id));
          onOrderChange(newOrderedItems.map(item => item.id));
      } else {
          console.warn("PrioritySettings: newOrderedItems was empty after setItems call in handleDragEnd. onOrderChange not called.");
      }
    }
  }, [onOrderChange]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map(item => item.dndId)} // Pass array of dndIds
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1 py-2 max-h-60 overflow-y-auto pr-2"> {/* Add scroll */}
          {items.length > 0 ? (
             items.map((item) => <SortableItem key={item.dndId} item={item} />)
           ) : (
             <p className="text-sm text-muted-foreground text-center py-4">
               表示するアプリが選択されていません。まずアプリを選択してください。
             </p>
           )}
        </div>
      </SortableContext>
    </DndContext>
  );
} 