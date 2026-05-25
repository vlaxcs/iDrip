import { useEffect, useState, useCallback, useMemo } from "react";
import { Wand2, Layers, Sparkles, Flower, Sun, Leaf, Snowflake, Coffee, Briefcase, Crown, Heart, Dumbbell, Plane } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { OutfitBuilder } from "@/components/outfit/OutfitBuilder";
import { GenerateButton } from "@/components/outfit/GenerateButton";
import { OutfitGrid } from "@/components/outfit/OutfitGrid";
import { OutfitPreviewModal } from "@/components/outfit/OutfitPreviewModal";
import { WardrobePickerModal } from "@/components/outfit/WardrobePickerModal";
import { EmptyState } from "@/components/shared/EmptyState";
import { OptionWheel, type WheelOption } from "@/components/shared/OptionWheel";
import { useOutfitStore } from "@/stores/useOutfitStore";
import { useWardrobeStore } from "@/stores/useWardrobeStore";

import { cn } from "@/lib/utils";
import type { OutfitOccasion, OutfitSlotKey, Weather } from "@/types/outfit";
import type { ClothingItem, Season } from "@/types/wardrobe";

const OCCASION_WHEEL: WheelOption<OutfitOccasion>[] = [
  { value: "casual", label: "Casual", Icon: Coffee },
  { value: "work", label: "Work", Icon: Briefcase },
  { value: "formal", label: "Formal", Icon: Crown },
  { value: "date", label: "Date", Icon: Heart },
  { value: "sport", label: "Sport", Icon: Dumbbell },
  { value: "travel", label: "Travel", Icon: Plane },
];

const SEASON_WHEEL: WheelOption<Season>[] = [
  { value: "spring", label: "Spring", Icon: Flower },
  { value: "summer", label: "Summer", Icon: Sun },
  { value: "fall", label: "Fall", Icon: Leaf },
  { value: "winter", label: "Winter", Icon: Snowflake },
];

const SLOT_LABELS: Record<OutfitSlotKey, string> = {
  top: "Top",
  bottom: "Bottom",
  shoes: "Shoes",
  outerwear: "Outerwear",
  accessory1: "Accessory",
  accessory2: "Accessory 2",
};

export default function OutfitGeneratorPage() {
  const {
    outfits,
    currentBuild,
    pendingOutfit,
    isGenerating,
    error,
    loadOutfits,
    generateOutfit,
    confirmOutfit,
    regenerateOutfit,
    dismissPreview,
    deleteOutfit,
  } = useOutfitStore();
  const { items, loadItems } = useWardrobeStore();
  const [activeTab, setActiveTab] = useState<"builder" | "saved">("builder");
  const [occasion, setOccasion] = useState<OutfitOccasion>("casual");
  const [weather, setWeather] = useState<Weather | null>(null);
  const [season, setSeason] = useState<Season>("all");
  const [freeText, setFreeText] = useState("");

  // Locked items: user-selected items that must be included in the generated outfit
  const [lockedItems, setLockedItems] = useState<Partial<Record<OutfitSlotKey, ClothingItem>>>({});
  const [pickerSlot, setPickerSlot] = useState<OutfitSlotKey | null>(null);

  useEffect(() => {
    loadItems();
    loadOutfits();
  }, [loadItems, loadOutfits]);

  const lockedItemIds = useMemo(
    () => Object.values(lockedItems).map((item) => item!.id),
    [lockedItems]
  );

  const currentParams = useMemo(() => ({
    occasion: occasion || undefined,
    weather: weather || undefined,
    season: season !== "all" ? season : undefined,
    free_text: freeText || undefined,
    locked_item_ids: lockedItemIds.length > 0 ? lockedItemIds : undefined,
  }), [occasion, weather, season, freeText, lockedItemIds]);

  const handleGenerate = useCallback(async () => {
    if (items.length < 3) return;
    try {
      await generateOutfit(currentParams);
    } catch (_) {
      // Error is set in the store
    }
  }, [items, generateOutfit, currentParams]);

  const handleSurpriseMe = useCallback(async () => {
    setOccasion("casual");
    setWeather(null);
    setSeason("all");
    setFreeText("");
    try {
      await generateOutfit({ locked_item_ids: lockedItemIds.length > 0 ? lockedItemIds : undefined });
    } catch (_) {
      // Error is set in the store
    }
  }, [generateOutfit, lockedItemIds]);

  const handleConfirm = useCallback(
    async (outfit: typeof pendingOutfit extends null ? never : NonNullable<typeof pendingOutfit>) => {
      if (!outfit) return;
      const collection = outfit.collectionName?.trim() || undefined;
      await confirmOutfit(outfit.id, collection);
      setLockedItems({});
    },
    [confirmOutfit]
  );

  const handleRegenerate = useCallback(
    async (feedback: string) => {
      try {
        await regenerateOutfit(feedback, currentParams);
      } catch (_) {
        // Error is set in the store
      }
    },
    [regenerateOutfit, currentParams]
  );

  const handleSlotClick = useCallback((slot: OutfitSlotKey) => {
    // If already locked, clicking opens picker to change the item
    setPickerSlot(slot);
  }, []);

  const handleSlotRemove = useCallback((slot: OutfitSlotKey) => {
    setLockedItems((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
  }, []);

  const handlePickerSelect = useCallback((slot: OutfitSlotKey, item: ClothingItem) => {
    setLockedItems((prev) => ({ ...prev, [slot]: item }));
  }, []);

  const hasEnoughItems =
    items.filter((i) => i.category === "tops").length > 0 &&
    items.filter((i) => i.category === "bottoms").length > 0 &&
    items.filter((i) => i.category === "shoes").length > 0;

  const latestReasoning = pendingOutfit?.aiReasoning || outfits[0]?.aiReasoning;

  return (
    <PageContainer>
      <div className="mb-6">
        <p className="kit-overline">Outfit</p>
        <h2 className="kit-display text-3xl md:text-4xl mt-1.5">Generator</h2>
        <p className="text-sm kit-muted mt-2">AI-powered outfit combos</p>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-6 md:flex md:w-fit">
        {[
          { key: "builder" as const, label: "Builder" },
          { key: "saved" as const, label: `Saved (${outfits.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "kit-chip justify-center w-full md:w-auto",
              activeTab === tab.key && "kit-chip-active"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "builder" ? (
        <div className="space-y-8">
          <div className="grid gap-8 md:grid-cols-2 md:items-start">
            <div className="flex flex-col items-center gap-3">
              <p className="kit-overline self-center">Occasion</p>
              <OptionWheel
                options={OCCASION_WHEEL}
                value={occasion}
                onChange={(v) => setOccasion(v)}
                size={280}
              />
            </div>

            <div className="flex flex-col items-center gap-3">
              <p className="kit-overline self-center">Season</p>
              <OptionWheel
                options={SEASON_WHEEL}
                value={season}
                onChange={setSeason}
                center={{ value: "all", label: "All" }}
                size={260}
              />
            </div>
          </div>

          {/* Free-text input */}
          <div>
            <label className="kit-overline block mb-2">
              Custom request <span className="text-xs kit-muted">(optional)</span>
            </label>
            <input
              type="text"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="e.g., I want something with a pop of red, cozy evening vibe..."
              className="kit-input w-full"
            />
          </div>

          {/* Error banner */}
          {error && (
            <div className="p-3 rounded-xl border border-[hsl(var(--sidebar-danger)/0.4)] bg-[hsl(var(--sidebar-danger)/0.08)] text-sm text-[hsl(var(--sidebar-danger))]">
              {error}
            </div>
          )}

          <OutfitBuilder
            currentBuild={currentBuild}
            lockedItems={lockedItems}
            onSlotClick={handleSlotClick}
            onSlotRemove={handleSlotRemove}
            isGenerating={isGenerating}
          />

          {lockedItemIds.length > 0 && (
            <p className="text-xs kit-muted text-center">
              {lockedItemIds.length} item{lockedItemIds.length > 1 ? "s" : ""} locked — AI will build around {lockedItemIds.length > 1 ? "them" : "it"}
            </p>
          )}

          {currentBuild.top && !isGenerating && (
            <div className="kit-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wand2 className="w-4 h-4 text-[hsl(var(--sidebar-accent))]" />
                <span className="kit-overline">AI Reasoning</span>
              </div>
              <p className="text-sm kit-muted leading-relaxed">
                {latestReasoning || "Generate an outfit to see AI reasoning."}
              </p>
            </div>
          )}

          {/* Generate + Surprise Me buttons */}
          <div className="space-y-3">
            <GenerateButton
              onClick={handleGenerate}
              isGenerating={isGenerating}
              disabled={!hasEnoughItems}
            />

            <button
              onClick={handleSurpriseMe}
              disabled={isGenerating || items.length < 3}
              className="kit-btn-secondary w-full justify-center"
            >
              <Sparkles className="w-4 h-4" />
              Surprise Me
            </button>
          </div>

          {!hasEnoughItems && (
            <p className="text-xs kit-muted text-center">
              Add at least 1 top, 1 bottom, and 1 pair of shoes to generate outfits.
            </p>
          )}
        </div>
      ) : (
        <div>
          {outfits.length > 0 ? (
            <OutfitGrid outfits={outfits} onDelete={deleteOutfit} />
          ) : (
            <EmptyState
              icon={Layers}
              title="No saved outfits"
              description="Generate your first outfit using the builder tab"
              action={{ label: "Go to Builder", onClick: () => setActiveTab("builder") }}
            />
          )}
        </div>
      )}

      {/* Preview Modal */}
      <OutfitPreviewModal
        open={pendingOutfit !== null}
        outfit={pendingOutfit}
        onConfirm={handleConfirm}
        onRegenerate={handleRegenerate}
        onDismiss={() => { dismissPreview(); setLockedItems({}); }}
        isRegenerating={isGenerating}
      />

      {/* Wardrobe Picker Modal */}
      <WardrobePickerModal
        open={pickerSlot !== null}
        slotKey={pickerSlot}
        slotLabel={pickerSlot ? SLOT_LABELS[pickerSlot] : ""}
        items={items}
        onSelect={(item) => {
          if (pickerSlot) handlePickerSelect(pickerSlot, item);
        }}
        onClose={() => setPickerSlot(null)}
      />
    </PageContainer>
  );
}
