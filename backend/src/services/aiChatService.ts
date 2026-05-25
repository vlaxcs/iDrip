import axios from 'axios';
import WardrobeItem from '../models/WardrobeItem';

export async function generateChatResponse(userId: string, messages: { role: string; content: string }[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.FEATHERLESS_API_KEY;
  const baseUrl = process.env.OPENAI_API_KEY ? 'https://api.openai.com/v1' : (process.env.FEATHERLESS_BASE_URL || 'https://api.featherless.ai/v1');
  const model = process.env.OPENAI_API_KEY ? 'gpt-4o-mini' : (process.env.FEATHERLESS_MODEL || 'meta-llama/Meta-Llama-3.1-70B-Instruct');
  
  if (!apiKey) {
    throw new Error('No AI API key configured — set OPENAI_API_KEY or FEATHERLESS_API_KEY');
  }

  // Fetch user's wardrobe items with style/formality metadata
  const items = await WardrobeItem.find({ userId })
    .select('name category primaryColor style occasion formality brand imageUrl')
    .lean();
  
  const wardrobeContext = items.length > 0 
    ? `The user has the following clothing items in their wardrobe:\n` + items.map(i => {
        const styles = Array.isArray(i.style) && i.style.length ? i.style.join(', ') : 'unknown style';
        const occasions = Array.isArray(i.occasion) && i.occasion.length ? i.occasion.join(', ') : 'unknown occasion';
        const formality = typeof i.formality === 'number' ? `formality ${i.formality}/10` : '';
        return `- ${i.category}: "${i.name}" | style: [${styles}] | occasion: [${occasions}]${formality ? ` | ${formality}` : ''} | Image URL: ${i.imageUrl || 'none'}`;
      }).join('\n')
    : `The user currently doesn't have any items in their wardrobe. Ask them to upload some!`;

  const SYSTEM_PROMPT = `You are Drizzy, a cool, friendly, and expert AI fashion stylist for the app iDrip.
Keep your answers extremely concise, conversational, and direct. Treat the user like a friend. NO robotic lists or long paragraphs!

IMPORTANT: Do NOT output any internal thinking processes, reasoning steps, or "Here's a thinking process" blocks. Output ONLY the exact final message you want to show to the user.

STYLE MATCHING RULES — follow these strictly:
- Each wardrobe item has a "style" tag list and a "formality" score (0 = casual/sporty, 10 = very formal).
- ONLY recommend an item for a requested style if its style tags or formality score genuinely match.
  - Sporty = style includes "sporty", "athletic", "casual" OR formality ≤ 3
  - Casual = formality ≤ 5
  - Elegant/Formal = formality ≥ 7
- If an item does NOT match the requested style, DO NOT include it in the outfit — even if nothing else is available.
- If the wardrobe has NO items that match the style, be honest: tell the user their wardrobe doesn't have what they need for that look, and suggest 2-3 specific items to buy with prices and search links.

When suggesting an outfit from their wardrobe:
- Keep it simple and conversational.
- You MUST show pictures of the exact items you recommend using Markdown images: ![item name](Image URL).

When recommending new items to buy:
- You MUST invent a realistic estimated price.
- You MUST link to a SEARCH PAGE, never a direct product URL (direct URLs will 404). Use these exact search URL patterns:
  - Nike: https://www.nike.com/search?q=SEARCH+TERM
  - Adidas: https://www.adidas.com/us/search?q=SEARCH+TERM
  - Zara: https://www.zara.com/us/en/search?searchTerm=SEARCH+TERM
  - ASOS: https://www.asos.com/search/?q=SEARCH+TERM
  Replace SEARCH+TERM with the item name (spaces as +). Example: [White Joggers - ~$45](https://www.asos.com/search/?q=white+joggers)
- Do NOT hallucinate images for external items — links only.

--- WARDROBE CONTEXT ---
${wardrobeContext}`;

  // Filter messages to only include allowed roles and structure
  const formattedMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.map(m => ({ 
      role: m.role === 'assistant' ? 'assistant' : 'user', 
      content: m.content || '' 
    }))
  ];

  console.log(`[aiChat] Sending ${formattedMessages.length} messages to ${model}`);

  // Disable Qwen3's internal thinking step — it burns 30-90s before any output
  const isQwen3 = model.toLowerCase().includes('qwen3') || model.toLowerCase().includes('qwen/qwen3');

  const requestBody: Record<string, unknown> = {
    model,
    messages: formattedMessages,
    temperature: 0.7,
    max_tokens: 2000,
    ...(isQwen3 && { enable_thinking: false }),
  };
  const requestConfig = {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 240000, // 4 minutes
  };

  let response;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      response = await axios.post(`${baseUrl}/chat/completions`, requestBody, requestConfig);
      break;
    } catch (err: any) {
      lastError = err;
      const isRetryable = err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET' || err.response?.status >= 500;
      if (attempt === 1 && isRetryable) {
        console.warn(`[aiChat] Attempt 1 failed (${err.code || err.response?.status}), retrying...`);
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      throw err;
    }
  }

  if (!response) throw lastError!;

  console.log(`[aiChat] Response status: ${response.status}`);

  let content = response.data?.choices?.[0]?.message?.content;
  
  if (!content || content.trim() === '') {
    throw new Error('Empty response from AI provider — model may have timed out.');
  }

  // Strip leaked thinking blocks
  content = content.replace(/Here's a thinking process[\s\S]*?(?=\n\n|\n[A-Z]|$)/i, '').trim();
  content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  return content;
}

