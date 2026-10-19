import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  // Initialize Gemini API client if API key is present
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      hasGeminiKey: Boolean(apiKey),
      timestamp: new Date().toISOString(),
    });
  });

  // Dynamic Wagwan AI chat endpoint
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const { message, conversationHistory = [], spots = [], events = [], thriftItems = [] } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'A valid text prompt message is required.' });
      }

      // If Gemini client is active, execute dynamic model inference
      if (ai) {
        const spotsContext = (spots || []).slice(0, 35).map((s: any) => ({
          id: s.id,
          title: s.title,
          category: s.category,
          neighborhood: s.neighborhood,
          rating: s.rating,
          price: s.price,
          description: s.description,
          address: s.address,
        }));

        const eventsContext = (events || []).slice(0, 20).map((e: any) => ({
          id: e.id,
          title: e.title,
          category: e.category,
          location: e.location,
          date: e.date,
          price: e.price,
          genre: e.genre,
          goingCount: e.goingCount,
        }));

        const thriftContext = (thriftItems || []).slice(0, 20).map((t: any) => ({
          id: t.id,
          name: t.name,
          category: t.category,
          price: t.price,
          seller: t.seller,
          storeLocation: t.storeLocation,
          condition: t.condition,
        }));

        const systemInstruction = `You are Wagwan AI, the premier lifestyle, hangout, dining, nightlife, and thrift concierge for RADA.
Tone: Warm, conversational, urban, knowledgeable, and upbeat with friendly energy.
Your responsibility:
- Analyze the user's specific prompt, mood, questions, and conversation context.
- Provide intelligent, tailored advice, tips, recommendations, and atmosphere insights.
- If their prompt relates to any hangout spot, restaurant, cafe, nature walk, date night, party, concert, or thrift fit, select the closest matching item ID from the provided database.
- Return structured JSON with:
  "message": A rich, personalized, insightful response answering their exact prompt.
  "matchedSpotId": (integer) ID of the matched spot from the database, or 0 if none.
  "matchedEventId": (integer) ID of the matched event from the database, or 0 if none.
  "matchedThriftId": (integer) ID of the matched thrift item from the database, or 0 if none.`;

        const recentHistory = (conversationHistory || [])
          .slice(-6)
          .map((h: any) => `${h.sender === 'user' ? 'User' : 'Wagwan AI'}: ${h.text}`)
          .join('\n');

        const promptText = `Conversation History:
${recentHistory ? recentHistory + '\n' : 'No previous history.'}
User Prompt: "${message}"

Available Hangout Spots in database:
${JSON.stringify(spotsContext)}

Available Events in database:
${JSON.stringify(eventsContext)}

Available Thrift / Luku Items in database:
${JSON.stringify(thriftContext)}

Generate a helpful, dynamic concierge response in JSON format.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: promptText,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                message: {
                  type: Type.STRING,
                  description: 'Dynamic conversational recommendation tailored specifically to the user prompt and context.',
                },
                matchedSpotId: {
                  type: Type.INTEGER,
                  description: 'ID of best matching spot or 0',
                },
                matchedEventId: {
                  type: Type.INTEGER,
                  description: 'ID of best matching event or 0',
                },
                matchedThriftId: {
                  type: Type.INTEGER,
                  description: 'ID of best matching thrift item or 0',
                },
              },
              required: ['message'],
            },
          },
        });

        const rawText = response.text || '';
        try {
          const parsed = JSON.parse(rawText);
          return res.json({
            reply: parsed.message,
            matchedSpotId: parsed.matchedSpotId || 0,
            matchedEventId: parsed.matchedEventId || 0,
            matchedThriftId: parsed.matchedThriftId || 0,
            source: 'gemini',
          });
        } catch {
          return res.json({
            reply: rawText,
            matchedSpotId: 0,
            matchedEventId: 0,
            matchedThriftId: 0,
            source: 'gemini-text',
          });
        }
      }

      // Contextual prompt handler when GEMINI_API_KEY is not configured
      const qLower = message.toLowerCase();
      let matchedSpotId = 0;
      let matchedEventId = 0;
      let matchedThriftId = 0;
      let replyText = '';

      if (qLower.includes('thrift') || qLower.includes('luku') || qLower.includes('fit') || qLower.includes('vintage') || qLower.includes('denim')) {
        const item = (thriftItems || [])[0];
        if (item) {
          matchedThriftId = item.id;
          replyText = `Looking for clean thrift fits? I recommend "${item.name}" from ${item.seller} (${item.storeLocation}) for ${item.price}! Condition: ${item.condition}. Tap below to connect with the merchant!`;
        }
      } else if (qLower.includes('party') || qLower.includes('event') || qLower.includes('rave') || qLower.includes('concert') || qLower.includes('amapiano')) {
        const evt = (events || [])[0];
        if (evt) {
          matchedEventId = evt.id;
          replyText = `Turn up! For "${message}", I recommend checking out "${evt.title}" at ${evt.location} on ${evt.date}! Over ${evt.goingCount} people going with verified ticketing.`;
        }
      } else {
        const sp = (spots || [])[0];
        if (sp) {
          matchedSpotId = sp.id;
          replyText = `For "${message}", check out ${sp.title} in ${sp.neighborhood}! Rating: ★${sp.rating} (${sp.price}). ${sp.description || 'Verified local hangout.'}`;
        } else {
          replyText = `Wagwan! I found awesome hangouts matching "${message}". Check out our verified spots tab for curated options!`;
        }
      }

      return res.json({
        reply: replyText,
        matchedSpotId,
        matchedEventId,
        matchedThriftId,
        source: 'smart-fallback',
      });
    } catch (err: any) {
      console.error('Server error in /api/ai/chat:', err);
      return res.status(500).json({
        error: err.message || 'Internal server error processing AI chat prompt',
        reply: "Wagwan! I'm temporarily unable to reach the AI models, please try again in a moment.",
      });
    }
  });

  // Mount Vite middleware in development or serve static files in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RADA Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
