import type { ClothingItem, ClothingItemInput } from "@/types/wardrobe";
import { api } from "@/lib/api";

interface WardrobeListResponse {
  items: ClothingItem[];
  count: number;
}

interface UploadImageResponse {
  imageUrl: string;
  publicId: string;
}

// Re-export the analysis type from aiAnalysisService for convenience
export type { ClothingAnalysis } from "./aiAnalysisService";

export const wardrobeService = {
  async getAll(): Promise<ClothingItem[]> {
    const res = await api.get<WardrobeListResponse>("/wardrobe");
    return res.items;
  },

  async getById(id: string): Promise<ClothingItem> {
    return api.get<ClothingItem>(`/wardrobe/${id}`);
  },

  async create(data: ClothingItemInput): Promise<ClothingItem> {
    return api.post<ClothingItem>("/wardrobe", data);
  },

  async update(id: string, updates: Partial<ClothingItemInput>): Promise<ClothingItem> {
    return api.put<ClothingItem>(`/wardrobe/${id}`, updates);
  },

  async remove(id: string): Promise<void> {
    return api.delete<void>(`/wardrobe/${id}`);
  },

  async uploadImage(file: File): Promise<UploadImageResponse> {
    const formData = new FormData();
    formData.append("image", file);
    return api.upload<UploadImageResponse>("/wardrobe/upload-image", formData);
  },
};
