import type { ClothingItem } from "./wardrobe";
import type { Season } from "./wardrobe";

export type OutfitOccasion =
  | "casual" | "business" | "formal" | "date" | "sport"
  | "party" | "travel" | "beach" | "outdoor" | "work";

export type Weather =
  | "rainy" | "snowy" | "sunny" | "cold" | "hot"
  | "windy" | "humid" | "cloudy" | "mild";

export type OutfitSlotKey = "top" | "bottom" | "outerwear" | "shoes" | "accessory1" | "accessory2";

export interface OutfitSlotType {
  slot: OutfitSlotKey;
  label: string;
  required: boolean;
}

export interface Outfit {
  id: string;
  name: string;
  items: OutfitItem[];
  occasion: OutfitOccasion;
  season: Season[];
  rating?: number;
  aiGenerated: boolean;
  aiReasoning?: string;
  score?: number;
  createdAt: string;
  tags: string[];
  collectionName: string;
  colorScheme: string[];
  weatherScore: number | null;
  styleScore: number | null;
  savedByUser: boolean;
}

export interface OutfitItem {
  slot: OutfitSlotKey;
  clothingItemId: string;
  clothingItem: ClothingItem;
}

export interface OutfitGenerationRequest {
  occasion?: OutfitOccasion | null;
  weather?: Weather | null;
  season?: Season | null;
  free_text?: string;
  feedback?: string;
  locked_item_ids?: string[];
}
