import { useEffect, useRef, useState } from "react";
import { X, Loader2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAnimatedMount } from "@/hooks/useAnimatedMount";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useWardrobeStore } from "@/stores/useWardrobeStore";
import type { ClothingItem, ClothingCategory } from "@/types/wardrobe";
import type { OutfitSlotKey } from "@/types/outfit";

const SLOT_TO_CATEGORY: Record<OutfitSlotKey, ClothingCategory | null> = {
  top: "tops",
  bottom: "bottoms",
  shoes: "shoes",
  outerwear: "outerwear",
  accessory1: "accessories",
  accessory2: "accessories",
};

interface WardrobePickerModalProps {
  open: boolean;
  slotKey: OutfitSlotKey | null;
  slotLabel: string;
  items: ClothingItem[];
  onSelect: (item: ClothingItem) => void;
  onClose: () => void;
}

export function WardrobePickerModal({
  open,
  slotKey,
  slotLabel,
  items,
  onSelect,
  onClose,
}: WardrobePickerModalProps) {
  const { phase, shouldRender } = useAnimatedMount({ open });
  useScrollLock(open);
  const visible = phase === "visible";
  const overlayRef = useRef<HTMLDivElement>(null);
  const isLoading = useWardrobeStore((s) => s.isLoading);
  const navigate = useNavigate();

  // Freeze slotKey/slotLabel during exit animation so the filtered list doesn't flash to "all items".
  // The effect-driven update is intentional: we want to remember the last non-null prop value
  // across the animation window where the parent has already set slotKey back to null.
  const [frozenSlotKey, setFrozenSlotKey] = useState(slotKey);
  const [frozenSlotLabel, setFrozenSlotLabel] = useState(slotLabel);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (slotKey !== null) setFrozenSlotKey(slotKey);
  }, [slotKey]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (slotLabel) setFrozenSlotLabel(slotLabel);
  }, [slotLabel]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!shouldRender) return null;

  const category = frozenSlotKey ? SLOT_TO_CATEGORY[frozenSlotKey] : null;
  const filtered = category ? items.filter((i) => i.category === category) : items;

  return (
    <div
      ref={overlayRef}
      className={cn(
        "fixed inset-0 z-50 flex items-end md:items-center justify-center transition-all duration-300",
        visible ? "opacity-100" : "opacity-0"
      )}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        className={cn(
          "relative w-full max-w-lg bg-background rounded-t-3xl md:rounded-3xl shadow-2xl transition-transform duration-300 max-h-[80vh] flex flex-col",
          visible ? "translate-y-0" : "translate-y-8"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[hsl(var(--border)/0.4)]">
          <div>
            <p className="kit-overline">Select item</p>
            <h3 className="font-semibold text-base mt-0.5">{frozenSlotLabel}</h3>
          </div>
          <button
            onClick={onClose}
            className="kit-icon-btn"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Grid */}
        <div className="overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 kit-muted">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading wardrobe...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm kit-muted">
                No {frozenSlotLabel.toLowerCase()} items in your wardrobe yet.
              </p>
              <button
                onClick={() => { onClose(); navigate("/wardrobe"); }}
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold bg-[hsl(var(--sidebar-accent))] text-black hover:brightness-95 transition-all"
              >
                Go to Wardrobe <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { onSelect(item); onClose(); }}
                  className="group relative rounded-xl overflow-hidden border border-[hsl(var(--border)/0.4)] hover:border-[hsl(var(--sidebar-accent)/0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  <div className="aspect-3/4">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/65 to-transparent p-2">
                    <p className="text-[10px] text-white font-medium truncate">{item.name}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
