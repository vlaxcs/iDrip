import { OutfitSlot } from "./OutfitSlot";
import type { OutfitItem, OutfitSlotKey } from "@/types/outfit";
import type { ClothingItem } from "@/types/wardrobe";

const SLOTS: { key: OutfitSlotKey; label: string }[] = [
  { key: "top", label: "Top" },
  { key: "bottom", label: "Bottom" },
  { key: "shoes", label: "Shoes" },
  { key: "outerwear", label: "Outerwear" },
  { key: "accessory1", label: "Accessory" },
];

function lockedItemToOutfitItem(slot: OutfitSlotKey, item: ClothingItem): OutfitItem {
  return { slot, clothingItemId: item.id, clothingItem: item };
}

interface OutfitBuilderProps {
  currentBuild: Partial<Record<OutfitSlotKey, OutfitItem | null>>;
  lockedItems: Partial<Record<OutfitSlotKey, ClothingItem>>;
  onSlotClick: (slot: OutfitSlotKey) => void;
  onSlotRemove: (slot: OutfitSlotKey) => void;
  isGenerating: boolean;
}

export function OutfitBuilder({
  currentBuild,
  lockedItems,
  onSlotClick,
  onSlotRemove,
  isGenerating,
}: OutfitBuilderProps) {
  return (
    <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
      {SLOTS.map((slot) => {
        const lockedItem = lockedItems[slot.key];
        const displayItem = lockedItem
          ? lockedItemToOutfitItem(slot.key, lockedItem)
          : (currentBuild[slot.key] ?? null);

        return (
          <OutfitSlot
            key={slot.key}
            slotKey={slot.key}
            label={slot.label}
            item={displayItem}
            isLocked={!!lockedItem}
            onSelect={() => onSlotClick(slot.key)}
            onRemove={() => onSlotRemove(slot.key)}
            isGenerating={isGenerating}
          />
        );
      })}
    </div>
  );
}
