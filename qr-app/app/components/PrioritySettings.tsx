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
  const [isInternalUpdate, setIsInternalUpdate] = useState(false); // Flag to track internal updates

  // Initialize items based on props
  useEffect(() => {
    const appMap = new Map(allAvailableApps.map(app => [app.id, app]));
    const newItems = initialSelectedApps
      .map(app => appMap.get(app.id))
      .filter((app): app is PaymentApp => !!app)
      .map(app => ({ ...app, dndId: app.id }));

    // Only update if props actually changed the list content/order
    if (JSON.stringify(newItems.map(i => i.id)) !== JSON.stringify(items.map(i => i.id))) {
       setItems(newItems);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSelectedApps, allAvailableApps]); // Depends on props

  // <<< Effect to call onOrderChange when items change internally >>>
  useEffect(() => {
     // Only call onOrderChange if the update was internal (drag end)
     if (isInternalUpdate) {
         console.log("Internal update detected, calling onOrderChange");
         onOrderChange(items.map(item => item.id));
         setIsInternalUpdate(false); // Reset the flag
     }
   // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, isInternalUpdate]); // Dependency on items and the flag

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // Start dragging after 5px move
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => { // <<< Wrap in useCallback
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((currentItems) => {
        const oldIndex = currentItems.findIndex((item) => item.dndId === active.id);
        const newIndex = currentItems.findIndex((item) => item.dndId === over.id);
        const newOrderedItems = arrayMove(currentItems, oldIndex, newIndex);
        // Set flag to indicate internal update
        setIsInternalUpdate(true);
        return newOrderedItems;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // No dependencies needed for useCallback if it only uses setItems

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