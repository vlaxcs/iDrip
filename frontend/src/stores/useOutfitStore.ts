import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Outfit, OutfitItem, OutfitSlotKey, OutfitGenerationRequest } from "@/types/outfit";
import type { ClothingItem, ClothingCategory } from "@/types/wardrobe";
import { outfitService } from "@/services/outfitService";

function mapCategoryToSlot(category: ClothingCategory): OutfitSlotKey {
  const mapping: Record<ClothingCategory, OutfitSlotKey> = {
    tops: "top",
    bottoms: "bottom",
    shoes: "shoes",
    outerwear: "outerwear",
    dresses: "top",
    accessories: "accessory1",
  };
  return mapping[category];
}

function backendOutfitToFrontend(raw: Record<string, unknown>): Outfit {
  const items: OutfitItem[] = [];
  const rawItems = raw.items as Record<string, unknown>[] | undefined;
  if (rawItems && Array.isArray(rawItems)) {
    for (const rawItem of rawItems) {
      const category = (rawItem.category || "tops") as ClothingCategory;
      const itemId = (rawItem._id || rawItem.id) as string;
      const clothingItem = {
        ...rawItem,
        id: itemId,
      } as unknown as ClothingItem;

      items.push({
        slot: mapCategoryToSlot(category),
        clothingItemId: itemId,
        clothingItem,
      });
    }
  }

  const outfitId = (raw._id || raw.id || `o-${Date.now()}`) as string;

  return {
    id: outfitId,
    name: (raw.name as string) || "Generated Outfit",
    items,
    occasion: (raw.occasion as Outfit["occasion"]) || "casual",
    season: (raw.season as Outfit["season"]) || [],
    aiGenerated: true,
    aiReasoning: (raw.aiReasoning as string) || "",
    score: (raw.score as number) ?? 80,
    createdAt: (raw.createdAt as string) || new Date().toISOString(),
    tags: (raw.tags as string[]) || [],
    collectionName: (raw.collectionName as string) || "",
    colorScheme: (raw.colorScheme as string[]) || [],
    weatherScore: (raw.weatherScore as number | null) ?? null,
    styleScore: (raw.styleScore as number | null) ?? null,
    savedByUser: (raw.savedByUser as boolean) || false,
  };
}

function outfitToSlotBuild(outfit: Outfit): Partial<Record<OutfitSlotKey, OutfitItem | null>> {
  const build: Partial<Record<OutfitSlotKey, OutfitItem | null>> = {};
  for (const item of outfit.items) {
    build[item.slot] = item;
  }
  return build;
}

interface OutfitState {
  outfits: Outfit[];
  currentBuild: Partial<Record<OutfitSlotKey, OutfitItem | null>>;
  pendingOutfit: Outfit | null;
  isGenerating: boolean;
  error: string | null;

  loadOutfits: () => Promise<void>;
  generateOutfit: (params: OutfitGenerationRequest) => Promise<Outfit>;
  confirmOutfit: (id: string, collection?: string) => Promise<void>;
  regenerateOutfit: (feedback: string, previousParams: OutfitGenerationRequest) => Promise<void>;
  dismissPreview: () => void;
  deleteOutfit: (id: string) => void;
  rateOutfit: (id: string, rating: number) => void;
  setSlotItem: (slot: OutfitSlotKey, item: ClothingItem | null) => void;
  clearBuild: () => void;
}

export const useOutfitStore = create<OutfitState>()(
  persist(
    (set, _get) => ({
      outfits: [],
      currentBuild: {},
      pendingOutfit: null,
      isGenerating: false,
      error: null,

      loadOutfits: async () => {
        try {
          const rawOutfits = await outfitService.getAll();
          const outfits = rawOutfits.map((raw: unknown) =>
            backendOutfitToFrontend(raw as Record<string, unknown>)
          );
          set({ outfits });
        } catch (err: any) {
          console.warn("[outfitStore] Failed to load outfits:", err.message);
        }
      },

      generateOutfit: async (params: OutfitGenerationRequest) => {
        set({ isGenerating: true, error: null });
        try {
          const raw = await outfitService.generate({
            ...params,
            locked_item_ids: params.locked_item_ids?.length ? params.locked_item_ids : undefined,
          });
          const outfit = backendOutfitToFrontend(raw as unknown as Record<string, unknown>);
          set({
            pendingOutfit: outfit,
            currentBuild: outfitToSlotBuild(outfit),
            isGenerating: false,
          });
          return outfit;
        } catch (err: any) {
          const message = err.message || "Failed to generate outfit";
          set({ isGenerating: false, error: message });
          throw err;
        }
      },

      confirmOutfit: async (id: string, collection?: string) => {
        try {
          const updated = await outfitService.confirm(id, collection);
          const frontend = backendOutfitToFrontend(updated as unknown as Record<string, unknown>);
          set((state) => ({
            outfits: [frontend, ...state.outfits],
            pendingOutfit: null,
            error: null,
          }));
        } catch (err: any) {
          set({ error: err.message || "Failed to save outfit" });
        }
      },

      regenerateOutfit: async (feedback: string, previousParams: OutfitGenerationRequest) => {
        set({ isGenerating: true, error: null });
        try {
          const outfit = await outfitService.generate({
            ...previousParams,
            feedback,
          });
          set({
            pendingOutfit: outfit,
            currentBuild: outfitToSlotBuild(outfit),
            isGenerating: false,
          });
        } catch (err: any) {
          const message = err.message || "Failed to regenerate outfit";
          set({ isGenerating: false, error: message });
          throw err;
        }
      },

      dismissPreview: () => {
        set({ pendingOutfit: null, error: null });
      },

      deleteOutfit: (id) => {
        outfitService.remove(id).catch(() => {});
        set((state) => ({ outfits: state.outfits.filter((o) => o.id !== id) }));
      },

      rateOutfit: (id, rating) => {
        set((state) => ({
          outfits: state.outfits.map((o) => (o.id === id ? { ...o, rating } : o)),
        }));
      },

      setSlotItem: (slot, item) => {
        set((state) => ({
          currentBuild: {
            ...state.currentBuild,
            [slot]: item ? { slot, clothingItemId: item.id, clothingItem: item } : null,
          },
        }));
      },

      clearBuild: () => set({ currentBuild: {}, pendingOutfit: null, error: null }),
    }),
    {
      name: "idrip-outfits",
      partialize: (state) => ({
        outfits: state.outfits,
      }),
    }
  )
);
