import { useState, useCallback, useRef } from "react";
import { X, Trash2, Edit3 } from "lucide-react";
import { useWardrobeStore } from "@/stores/useWardrobeStore";
import { useAnimatedMount } from "@/hooks/useAnimatedMount";
import { useScrollLock } from "@/hooks/useScrollLock";
import { FIELD_ENUMS } from "@/lib/fieldConfig";
import type { ClothingItem } from "@/types/wardrobe";

interface ClothingDetailSheetProps {
  item: ClothingItem | null;
  onClose: () => void;
  onEdit?: (item: ClothingItem) => void;
}

function pillLabel(key: string, value: string): string {
  const options = FIELD_ENUMS[key];
  if (options) {
    const found = options.find((o) => o.value === value);
    if (found) return found.label;
  }
  return value.replace(/-/g, " ");
}

function DetailPill({ value, label }: { value: string; label?: string }) {
  return (
    <span className="px-2 py-1 rounded-lg bg-[hsl(var(--frost))] text-xs font-medium capitalize">
      {label || value}
    </span>
  );
}

function FormalityBar({ value }: { value: number | null }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-[hsl(var(--frost))] overflow-hidden">
        <div
          className="h-full rounded-full bg-[hsl(var(--glacier))] transition-all"
          style={{ width: `${(value / 10) * 100}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {value}/10 {value <= 3 ? "Casual" : value <= 6 ? "Smart" : "Formal"}
      </span>
    </div>
  );
}

export function ClothingDetailSheet({ item, onClose, onEdit }: ClothingDetailSheetProps) {
  const deleteItem = useWardrobeStore((s) => s.deleteItem);
  const { phase, shouldRender, startExit } = useAnimatedMount({
    open: item !== null,
    enterDuration: 350,
    exitDuration: 300,
  });

  useScrollLock(item !== null);

  const [dragOffset, setDragOffset] = useState(0);
  const touchStartY = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) setDragOffset(delta);
  }, []);

  const onTouchEnd = useCallback(() => {
    const panelHeight = panelRef.current?.offsetHeight || 400;
    if (dragOffset > panelHeight * 0.3) {
      startExit();
      setTimeout(onClose, 300);
    } else {
      setDragOffset(0);
    }
  }, [dragOffset, startExit, onClose]);

  if (!shouldRender || !item) return null;

  const handleDelete = () => {
    deleteItem(item.id);
    startExit();
    setTimeout(onClose, 300);
  };

  const isAnimating = phase === "enter" || phase === "exit";
  const panelTransform =
    phase === "enter" ? "translateY(100%)"
    : phase === "exit" ? "translateY(100%)"
    : dragOffset > 0 ? `translateY(${dragOffset}px)`
    : "translateY(0)";

  // Collect non-empty category-conditional fields
  const detailFields: [string, string][] = [];
  const condKeys: (keyof ClothingItem)[] = [
    "fit", "length", "rise", "legOpening", "sleeveLength", "sleeveStyle", "neckline",
    "collarType", "cuffStyle", "hemStyle", "closureType", "backDetail", "strapStyle",
    "pleatStyle", "waistbandStyle", "distressing", "silhouette", "warmthLevel",
    "waterResistance", "hood", "pockets", "lining", "heelHeight", "heelStyle",
    "toeStyle", "soleType", "shaftHeight", "accessoryType", "bandWidth", "sockHeight",
    "necklaceLength", "hatStyle", "earringStyle", "tieStyle", "watchStyle", "lensColor",
  ];
  for (const key of condKeys) {
    const val = item[key];
    if (val && typeof val === "string" && val.length > 0) {
      detailFields.push([key, val]);
    }
  }

  return (
    <div className="fixed inset-0 z-60 flex items-end md:items-center md:justify-end">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
        style={{ opacity: phase === "visible" ? 1 : 0 }}
        onClick={() => { startExit(); setTimeout(onClose, 300); }}
      />
      <div
        ref={panelRef}
        className="relative w-full md:w-96 md:h-full max-h-[85vh] md:max-h-full overflow-y-auto bg-[hsl(var(--sidebar-surface))] backdrop-blur-2xl border-t md:border-l border-[hsl(var(--sidebar-border)/0.6)] rounded-t-3xl md:rounded-none shadow-2xl"
        style={{
          transform: panelTransform,
          transition: isAnimating ? "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)"
            : dragOffset > 0 ? "none" : "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div
          className="sticky top-0 bg-[hsl(var(--sidebar-surface)/0.92)] backdrop-blur-xl z-10 p-4 flex items-center justify-between border-b border-[hsl(var(--sidebar-border)/0.6)] touch-pan-y"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="md:hidden absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-[hsl(var(--sidebar-border))]" />
          <div>
            <p className="kit-overline">Wardrobe</p>
            <h2 className="font-display text-lg font-semibold kit-strong mt-0.5">Item Details</h2>
          </div>
          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                onClick={() => onEdit(item)}
                className="w-8 h-8 rounded-lg bg-[hsl(var(--sidebar-hover))] border border-[hsl(var(--sidebar-border)/0.7)] flex items-center justify-center hover:bg-[hsl(var(--sidebar-border)/0.4)] transition-colors kit-strong"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => { startExit(); setTimeout(onClose, 300); }}
              className="w-8 h-8 rounded-lg bg-[hsl(var(--sidebar-hover))] border border-[hsl(var(--sidebar-border)/0.7)] flex items-center justify-center hover:bg-[hsl(var(--sidebar-border)/0.4)] transition-colors kit-strong"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-5">
          <div className="rounded-xl overflow-hidden bg-[hsl(var(--sidebar-hover))]">
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-full aspect-[3/4] object-cover"
            />
          </div>

          <div>
            <h3 className="font-display text-xl md:text-2xl font-semibold kit-strong">{item.name}</h3>
            {item.brand && (
              <p className="text-sm kit-muted mt-1">
                {item.brand}
              </p>
            )}
            {item.subcategory && (
              <p className="text-sm kit-muted capitalize">{item.subcategory.replace(/-/g, " ")}</p>
            )}
          </div>

          <div>
            <span className="kit-overline">Category</span>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[hsl(var(--sidebar-accent))] text-black text-xs font-semibold capitalize">
                {item.category}
              </span>
            </div>
            {item.primaryColor && (
              <div className="p-3 rounded-xl bg-[hsl(var(--frost))] flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border border-[hsl(var(--border)/0.5)]" style={{ backgroundColor: item.primaryColor }} />
                <div>
                  <span className="text-xs text-muted-foreground">Color</span>
                  <p className="text-sm font-medium">{item.primaryColor}</p>
                </div>
              </div>
            )}
            {!item.primaryColor && (
              <div className="p-3 rounded-xl bg-[hsl(var(--frost))]">
                <span className="text-xs text-muted-foreground">Color</span>
                <p className="text-sm font-medium capitalize">{item.color}</p>
              </div>
            )}
          </div>

          {/* Secondary colors */}
          {item.secondaryColors && item.secondaryColors.length > 0 && (
            <div>
              <span className="text-xs text-muted-foreground">Secondary Colors</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {item.secondaryColors.map((c) => (
                  <span key={c} className="flex items-center gap-1 text-xs">
                    <span className="w-3 h-3 rounded-full border border-[hsl(var(--border)/0.3)]" style={{ backgroundColor: c }} />
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Formality */}
          {item.formality !== null && item.formality !== undefined && (
            <div>
              <span className="text-xs text-muted-foreground">Formality</span>
              <FormalityBar value={item.formality} />
            </div>
          )}

          {/* Style tags */}
          {item.style && item.style.length > 0 && (
            <div>
              <span className="text-xs text-muted-foreground">Style</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {item.style.map((s) => <DetailPill key={s} value={s} label={pillLabel("style", s)} />)}
              </div>
            </div>
          )}

          {/* Occasion */}
          {item.occasion && item.occasion.length > 0 && (
            <div>
              <span className="text-xs text-muted-foreground">Occasion</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {item.occasion.map((o) => <DetailPill key={o} value={o} label={pillLabel("occasion", o)} />)}
              </div>
            </div>
          )}

          {/* Characteristics: pattern, material, texture, transparency, printType */}
          <div className="grid grid-cols-2 gap-3">
            {item.pattern && (
              <div className="p-3 rounded-xl bg-[hsl(var(--frost))]">
                <span className="text-xs text-muted-foreground">Pattern</span>
                <p className="text-sm font-medium capitalize">{pillLabel("pattern", item.pattern)}</p>
              </div>
            )}
            {item.material && (
              <div className="p-3 rounded-xl bg-[hsl(var(--frost))]">
                <span className="text-xs text-muted-foreground">Material</span>
                <p className="text-sm font-medium capitalize">{pillLabel("material", item.material)}</p>
              </div>
            )}
            {item.texture && (
              <div className="p-3 rounded-xl bg-[hsl(var(--frost))]">
                <span className="text-xs text-muted-foreground">Texture</span>
                <p className="text-sm font-medium capitalize">{pillLabel("texture", item.texture)}</p>
              </div>
            )}
            {item.transparency && (
              <div className="p-3 rounded-xl bg-[hsl(var(--frost))]">
                <span className="text-xs text-muted-foreground">Transparency</span>
                <p className="text-sm font-medium capitalize">{pillLabel("transparency", item.transparency)}</p>
              </div>
            )}
            {item.printType && (
              <div className="p-3 rounded-xl bg-[hsl(var(--frost))]">
                <span className="text-xs text-muted-foreground">Print</span>
                <p className="text-sm font-medium capitalize">{pillLabel("printType", item.printType)}</p>
              </div>
            )}
            {item.gender && (
              <div className="p-3 rounded-xl bg-[hsl(var(--frost))]">
                <span className="text-xs text-muted-foreground">Gender</span>
                <p className="text-sm font-medium capitalize">{pillLabel("gender", item.gender)}</p>
              </div>
            )}
          </div>

          {/* Category-conditional detail fields */}
          {detailFields.length > 0 && (
            <div>
              <span className="text-xs text-muted-foreground">Details</span>
              <div className="grid grid-cols-2 gap-3 mt-1">
                {detailFields.map(([key, val]) => (
                  <div key={key} className="p-3 rounded-xl bg-[hsl(var(--frost))]">
                    <span className="text-xs text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                    <p className="text-sm font-medium capitalize">{pillLabel(key, val)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seasons */}
          {(() => {
            // Legacy items may have used `seasons` (plural) instead of `season`
            const seasonsList: string[] = item.season ?? (item as ClothingItem & { seasons?: string[] }).seasons ?? [];
            if (seasonsList.length === 0) return null;
            return (
          <div>
            <span className="kit-overline">Seasons</span>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {seasonsList.map((s: string) => (
                <span
                  key={s}
                  className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[hsl(var(--sidebar-accent))] text-black text-xs font-semibold capitalize"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
            );
          })()}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div>
              <span className="kit-overline">Tags</span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[hsl(var(--sidebar-accent))] text-black text-xs font-semibold capitalize"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Color metadata */}
          <div className="grid grid-cols-2 gap-3">
            {item.colorTemperature && (
              <div className="p-3 rounded-xl bg-[hsl(var(--frost))]">
                <span className="text-xs text-muted-foreground">Color Temp</span>
                <p className="text-sm font-medium capitalize">{item.colorTemperature}</p>
              </div>
            )}
            {item.colorIntensity && (
              <div className="p-3 rounded-xl bg-[hsl(var(--frost))]">
                <span className="text-xs text-muted-foreground">Intensity</span>
                <p className="text-sm font-medium capitalize">{item.colorIntensity}</p>
              </div>
            )}
          </div>

          {item.aiConfidence !== null && item.aiConfidence !== undefined && (
            <div className="p-3 rounded-xl bg-[hsl(var(--frost))]">
              <span className="text-xs text-muted-foreground">AI Confidence</span>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 rounded-full bg-[hsl(var(--border)/0.3)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[hsl(var(--glacier))]"
                    style={{ width: `${Math.round(item.aiConfidence * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{Math.round(item.aiConfidence * 100)}%</span>
              </div>
            </div>
          )}

          <div className="mt-2 rounded-xl p-4 border border-[hsl(var(--sidebar-danger)/0.4)] bg-[hsl(var(--sidebar-danger)/0.05)]">
            <div className="flex flex-col gap-3">
              <div className="min-w-0">
                <h3 className="kit-overline" style={{ color: "hsl(var(--sidebar-danger))" }}>
                  Danger Zone
                </h3>
                <p className="text-xs kit-muted mt-2">
                  This will permanently remove this item from your wardrobe.
                </p>
              </div>
              <button
                onClick={handleDelete}
                className="self-start inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors border-[hsl(var(--sidebar-danger)/0.4)] text-[hsl(var(--sidebar-danger))] hover:bg-[hsl(var(--sidebar-danger)/0.1)]"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove Item
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
