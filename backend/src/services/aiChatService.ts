import axios from 'axios';

const SYSTEM_PROMPT = `You are Drizzy, a cool, friendly, and expert AI fashion stylist for the app iDrip.
Keep your answers concise, helpful, and stylish. Use a friendly, conversational tone.
You help users pick outfits, give fashion advice, and suggest clothing combinations.`;

export async function generateChatResponse(messages: { role: string; content: string }[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.FEATHERLESS_API_KEY;
  const baseUrl = process.env.OPENAI_API_KEY ? 'https://api.openai.com/v1' : (process.env.FEATHERLESS_BASE_URL || 'https://api.featherless.ai/v1');
  const model = process.env.OPENAI_API_KEY ? 'gpt-4o-mini' : (process.env.FEATHERLESS_MODEL || 'meta-llama/Meta-Llama-3.1-70B-Instruct');
  
  if (!apiKey) {
    throw new Error('No AI API key configured — set OPENAI_API_KEY or FEATHERLESS_API_KEY');
  }

  // Filter messages to only include allowed roles and structure
  const formattedMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.map(m => ({ 
      role: m.role === 'assistant' ? 'assistant' : 'user', 
      content: m.content || '' 
    }))
  ];

  console.log(`[aiChat] Sending ${formattedMessages.length} messages to ${model}`);

  const response = await axios.post(
    `${baseUrl}/chat/completions`,
    {
      model: model, 
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 1000,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  console.log(`[aiChat] Raw response data:`, JSON.stringify(response.data, null, 2));

  let content = response.data?.choices?.[0]?.message?.content;
  
  if (!content || content.trim() === '') {
    if (response.data?.choices?.[0]?.message?.reasoning) {
       content = response.data.choices[0].message.reasoning;
    } else {
       throw new Error('Empty response from AI chat provider');
    }
  }

  return content;
}

