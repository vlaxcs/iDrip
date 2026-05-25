import { Router, Request, Response } from 'express';
import Outfit from '../models/Outfit';
import WardrobeItem from '../models/WardrobeItem';
import { checkGenerationLimit, incrementGenerationCount } from '../middleware/featureGate';
import { generateOutfitAI } from '../services/aiGenerationService';
import { buildQueryText, generateEmbedding, getVectorDB } from '../services/embeddingService';
import type { IWardrobeItem } from '../models/WardrobeItem';

const router = Router();

const REQUIRED_CATEGORIES = ['tops', 'bottoms', 'shoes'] as const;
const OPTIONAL_CATEGORIES = ['outerwear', 'dresses', 'accessories'] as const;
const ALL_CATEGORIES = [...REQUIRED_CATEGORIES, ...OPTIONAL_CATEGORIES] as const;

const TOP_N_PER_CATEGORY = 15;

async function retrieveRelevantItems(
  userId: string,
  preferences: { occasion?: string | null; weather?: string | null; season?: string | null; free_text?: string | null }
): Promise<{ items: IWardrobeItem[]; debug: Record<string, number> }> {
  const queryText = buildQueryText(preferences);
  let queryEmbedding: number[];

  try {
    queryEmbedding = await generateEmbedding(queryText);
  } catch (err: any) {
    console.warn('[outfits] Embedding generation failed, falling back to all items:', err.message);
    // Fallback: return all items, capped per category
    const allItems = await WardrobeItem.find({ userId }).lean();
    return { items: capPerCategory(allItems), debug: { fallback: allItems.length } };
  }

  const vectorDB = getVectorDB();
  const selectedItems: IWardrobeItem[] = [];
  const debug: Record<string, number> = { total_items: 0 };

  // Fetch all items once for fallback
  const allItems = await WardrobeItem.find({ userId }).lean();
  debug.total_items = allItems.length;

  // Separate into categories
  const byCategory: Record<string, IWardrobeItem[]> = {};
  for (const cat of ALL_CATEGORIES) {
    byCategory[cat] = allItems.filter((i) => i.category === cat);
    debug[cat] = byCategory[cat].length;
  }

  // For each required category, try vector search first
  for (const cat of REQUIRED_CATEGORIES) {
    const catItems = byCategory[cat];
    if (catItems.length === 0) continue;

    try {
      const results = await vectorDB.search(queryEmbedding, { category: cat }, TOP_N_PER_CATEGORY, userId);
      const resultIds = new Set(results.map((r) => r.id));
      const matched = catItems.filter((it) => resultIds.has(it._id.toString()));

      if (matched.length >= 3) {
        selectedItems.push(...matched);
        debug[`${cat}_vector`] = matched.length;
        continue;
      }
    } catch (err: any) {
      console.warn(`[outfits] Vector search failed for ${cat}:`, err.message);
    }

    // Fallback: take top items by aiConfidence
    const sorted = [...catItems].sort((a, b) => (b.aiConfidence || 0) - (a.aiConfidence || 0));
    selectedItems.push(...sorted.slice(0, TOP_N_PER_CATEGORY));
    debug[`${cat}_fallback`] = Math.min(sorted.length, TOP_N_PER_CATEGORY);
  }

  // For optional categories, try vector search with relaxed thresholds
  for (const cat of OPTIONAL_CATEGORIES) {
    const catItems = byCategory[cat];
    if (catItems.length === 0) continue;

    try {
      const results = await vectorDB.search(queryEmbedding, { category: cat }, TOP_N_PER_CATEGORY, userId);
      const resultIds = new Set(results.map((r) => r.id));
      const matched = catItems.filter((it) => resultIds.has(it._id.toString()));
      if (matched.length > 0) {
        selectedItems.push(...matched);
        debug[`${cat}_vector`] = matched.length;
        continue;
      }
    } catch (_) { /* fall through */ }

    // Include all items in this optional category if few
    if (catItems.length <= TOP_N_PER_CATEGORY) {
      selectedItems.push(...catItems);
      debug[`${cat}_all`] = catItems.length;
    } else {
      const sorted = [...catItems].sort((a, b) => (b.aiConfidence || 0) - (a.aiConfidence || 0));
      selectedItems.push(...sorted.slice(0, TOP_N_PER_CATEGORY));
      debug[`${cat}_fallback`] = Math.min(sorted.length, TOP_N_PER_CATEGORY);
    }
  }

  return { items: selectedItems, debug };
}

function capPerCategory(items: IWardrobeItem[]): IWardrobeItem[] {
  const byCategory: Record<string, IWardrobeItem[]> = {};
  for (const it of items) {
    if (!byCategory[it.category]) byCategory[it.category] = [];
    byCategory[it.category].push(it);
  }
  const result: IWardrobeItem[] = [];
  for (const cat of Object.keys(byCategory)) {
    const sorted = byCategory[cat].sort((a, b) => (b.aiConfidence || 0) - (a.aiConfidence || 0));
    result.push(...sorted.slice(0, TOP_N_PER_CATEGORY));
  }
  return result;
}

router.post('/generate', checkGenerationLimit, async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { occasion, weather, season, free_text, feedback, locked_item_ids } = req.body;

  const preferences = {
    occasion: occasion || null,
    weather: weather || null,
    season: season || null,
    free_text: free_text || null,
    feedback: feedback || null,
  };

  const lockedItemIds: string[] = Array.isArray(locked_item_ids) ? locked_item_ids : [];

  console.log(`[outfits] Generate request — preferences:`, preferences);

  // Step 1: Retrieve relevant items via hybrid vector search
  const { items: retrievedItems, debug } = await retrieveRelevantItems(userId, preferences);
  console.log(`[outfits] Retrieved ${retrievedItems.length} items for AI (debug:`, debug, ')');

  // Step 2: Validate minimum items
  const tops = retrievedItems.filter((i) => i.category === 'tops');
  const bottoms = retrievedItems.filter((i) => i.category === 'bottoms');
  const shoes = retrievedItems.filter((i) => i.category === 'shoes');
  const dresses = retrievedItems.filter((i) => i.category === 'dresses');

  const hasStandardCombo = tops.length >= 1 && bottoms.length >= 1 && shoes.length >= 1;
  const hasDressCombo = dresses.length >= 1 && shoes.length >= 1;

  if (!hasStandardCombo && !hasDressCombo) {
    res.status(400).json({
      error: 'Not enough wardrobe items to generate an outfit. Need at least 1 top, 1 bottom, and 1 pair of shoes (or 1 dress and 1 pair of shoes).',
    });
    return;
  }

  // Step 3: Ensure locked items are always included (vector search may have omitted them)
  if (lockedItemIds.length > 0) {
    const retrievedIds = new Set(retrievedItems.map((i) => i._id.toString()));
    const allUserItems = await WardrobeItem.find({ userId, _id: { $in: lockedItemIds } }).lean();
    for (const lockedItem of allUserItems) {
      if (!retrievedIds.has(lockedItem._id.toString())) {
        retrievedItems.push(lockedItem as IWardrobeItem);
      }
    }
  }

  // Step 4: Call AI service to select and generate the outfit
  const serialized = retrievedItems.map((item) => {
    const obj = item.toObject ? item.toObject() : item;
    // Convert ObjectId to string
    if (obj._id) obj.id = obj._id.toString();
    return obj;
  });

  console.log('[outfits] Sending to AI — locked_item_ids:', lockedItemIds, 'items count:', serialized.length);

  try {
    const aiResponse = await generateOutfitAI({
      user_id: userId,
      wardrobe_items: serialized,
      preferences,
      locked_item_ids: lockedItemIds,
    });

    // Step 4: Validate all returned IDs exist in the user's full wardrobe
    const allUserItems = await WardrobeItem.find({ userId }).lean();
    const allIds = new Set(allUserItems.map((i) => i._id.toString()));
    const validIds = aiResponse.selected_item_ids.filter((id) => allIds.has(id));

    if (validIds.length < 2) {
      res.status(502).json({ error: 'AI returned invalid or insufficient item IDs' });
      return;
    }

    // Step 5: Create outfit document (unsaved — preview mode)
    const count = await Outfit.countDocuments({ userId });
    const outfit = await Outfit.create({
      userId,
      name: aiResponse.outfit_name,
      items: validIds,
      occasion: aiResponse.occasion,
      score: aiResponse.score,
      aiReasoning: aiResponse.reasoning,
      savedByUser: false,
      colorScheme: aiResponse.color_scheme,
      weatherScore: aiResponse.weather_score,
      styleScore: aiResponse.style_score,
      feedback: feedback || '',
    });

    const populated = await outfit.populate('items');
    await incrementGenerationCount(userId);
    res.status(201).json({ outfit: populated });
  } catch (err: any) {
    console.error('[outfits] AI generation error:', err.message);
    res.status(503).json({ error: `AI generation failed: ${err.message}` });
  }
});

router.patch('/:id/confirm', async (req: Request, res: Response) => {
  const outfit = await Outfit.findById(req.params.id).populate('items');
  if (!outfit) {
    res.status(404).json({ error: 'Outfit not found' });
    return;
  }

  outfit.savedByUser = true;
  if (req.body.collection) {
    outfit.collectionName = req.body.collection;
  }

  // Auto-tag: extract occasion, season, and unique style tags from items
  const tags = new Set<string>();
  tags.add(outfit.occasion);
  if (outfit.items && Array.isArray(outfit.items)) {
    for (const item of outfit.items as any) {
      if (item.season && Array.isArray(item.season)) {
        item.season.forEach((s: string) => s !== 'all' && tags.add(s));
      }
      if (item.style && Array.isArray(item.style)) {
        item.style.forEach((s: string) => tags.add(s));
      }
    }
  }
  outfit.tags = Array.from(tags);

  await outfit.save();
  res.json(outfit);
});

router.get('/', async (req: Request, res: Response) => {
  const userId = req.userId;
  const { occasion, collection } = req.query;

  const filter: Record<string, unknown> = { userId };
  if (occasion) filter.occasion = occasion;
  if (collection) filter.collectionName = collection;

  const outfits = await Outfit.find(filter).populate('items').sort({ createdAt: -1 });
  res.json({ outfits, count: outfits.length });
});

router.get('/:id', async (req: Request, res: Response) => {
  const outfit = await Outfit.findById(req.params.id).populate('items');
  if (!outfit) {
    res.status(404).json({ error: 'Outfit not found' });
    return;
  }
  res.json(outfit);
});

router.patch('/:id/save', async (req: Request, res: Response) => {
  const outfit = await Outfit.findById(req.params.id);
  if (!outfit) {
    res.status(404).json({ error: 'Outfit not found' });
    return;
  }
  outfit.savedByUser = !outfit.savedByUser;
  await outfit.save();
  res.json(outfit);
});

router.delete('/:id', async (req: Request, res: Response) => {
  const outfit = await Outfit.findByIdAndDelete(req.params.id);
  if (!outfit) {
    res.status(404).json({ error: 'Outfit not found' });
    return;
  }
  res.status(204).send();
});

export default router;
