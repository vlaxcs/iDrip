import axios from 'axios';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export interface AIGenerationRequest {
  user_id: string;
  wardrobe_items: Record<string, unknown>[];
  preferences: {
    occasion?: string | null;
    weather?: string | null;
    season?: string | null;
    free_text?: string | null;
    feedback?: string | null;
    surprise_me?: boolean;
  };
  locked_item_ids?: string[];
}

export interface AIGenerationResponse {
  selected_item_ids: string[];
  outfit_name: string;
  score: number;
  reasoning: string;
  occasion: string;
  color_scheme: string[];
  weather_score: number;
  style_score: number;
  warnings?: string[];
}

const MAX_RETRIES = 1;
const RETRY_DELAY = 3000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateOutfitAI(
  request: AIGenerationRequest
): Promise<AIGenerationResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.post(
        `${AI_SERVICE_URL}/generate-outfit`,
        {
          user_id: request.user_id,
          wardrobe_items: request.wardrobe_items,
          preferences: request.preferences,
          locked_item_ids: request.locked_item_ids ?? [],
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 300000,
        }
      );

      const data = response.data;

      // Validate
      if (!data.selected_item_ids || !Array.isArray(data.selected_item_ids)) {
        throw new Error('AI response missing selected_item_ids');
      }
      if (data.selected_item_ids.length === 0) {
        throw new Error('AI returned empty outfit');
      }
      if (typeof data.score !== 'number' || data.score < 0 || data.score > 100) {
        data.score = Math.max(1, Math.min(100, Number(data.score) || 80));
      }

      return {
        selected_item_ids: data.selected_item_ids,
        outfit_name: data.outfit_name || 'Generated Outfit',
        score: data.score,
        reasoning: data.reasoning || '',
        occasion: data.occasion || request.preferences.occasion || 'casual',
        color_scheme: data.color_scheme || [],
        weather_score: data.weather_score ?? 7,
        style_score: data.style_score ?? 7,
        warnings: data.warnings,
      };
    } catch (err: any) {
      lastError = err;

      if (err.response) {
        console.error('[aiGeneration] Error response:', err.response.status, JSON.stringify(err.response.data));
      }

      if (attempt >= MAX_RETRIES) break;

      const status = err.response?.status;
      // Don't retry 4xx errors or timeouts
      if (status && status >= 400 && status < 500) break;
      if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') break;

      const delay = RETRY_DELAY * Math.pow(2, attempt);
      console.warn(
        `[aiGeneration] Attempt ${attempt + 1} failed: ${err.message}. Retrying in ${delay}ms...`
      );
      await sleep(delay);
    }
  }

  if (lastError && (lastError as any).code === 'ECONNREFUSED') {
    throw new Error('AI generation service is not available');
  }
  if (lastError && (lastError as any).code === 'ETIMEDOUT' || (lastError as any).code === 'ECONNABORTED') {
    throw new Error('AI generation timed out — please try again');
  }
  throw lastError || new Error('AI generation failed');
}
