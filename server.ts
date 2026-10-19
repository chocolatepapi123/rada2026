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

  // Dynamic Wagwan AI chat endpoint with full location, category & listings context
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const { 
        message, 
        conversationHistory = [], 
        selectedLocation = '', 
        activeCategory = '', 
        activeCategories = [], 
        spots = [], 
        events = [], 
        thriftItems = [] 
      } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'A valid text prompt message is required.' });
      }

      // If Gemini client is active, execute dynamic model inference with comprehensive context
      if (ai) {
        const spotsContext = (spots || []).map((s: any) => ({
          id: s.id,
          title: s.title,
          category: s.category,
          neighborhood: s.neighborhood,
          rating: s.rating,
          price: s.price,
          description: s.description,
          address: s.address,
          exactLocationTag: s.exactLocationTag,
          activityType: s.activityType,
          equipmentProvided: s.equipmentProvided,
          amenitiesAV: s.amenitiesAV,
          featuredDishes: s.featuredDishes,
        }));

        const eventsContext = (events || []).map((e: any) => ({
          id: e.id,
          title: e.title,
          category: e.category,
          location: e.location,
          date: e.date,
          time: e.time,
          price: e.price || e.tiers?.[0]?.price || 'KES 1,000',
          genre: e.genre,
          description: e.description,
          goingCount: e.goingCount,
        }));

        const thriftContext = (thriftItems || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          category: t.category,
          price: t.price,
          seller: t.seller,
          storeLocation: t.storeLocation,
          condition: t.condition,
        }));

        const systemInstruction = `You are Wagwan AI, Nairobi's premier hangouts, dining, nightlife, and lifestyle concierge on RADA.
Persona: Warm, witty, urban, and authentic to Nairobi culture. Use natural Kenyan / Sheng expressions tastefully ('Wagwan!', 'rada safi', 'vibes', 'turn up', 'shikisha', 'choma', 'luku').
Current User Context:
- User's Selected Location: "${selectedLocation || 'Nairobi (General)'}"
- Active Category: "${activeCategory || 'All Hangout Categories'}"
- Available Categories: ${Array.isArray(activeCategories) && activeCategories.length > 0 ? activeCategories.join(', ') : 'Restaurants & Dining, Cafés & Bakeries, Clubs & Lounges, Date Spots, Connect with Nature, Creative Leisure, Tech & Gaming, Action & Sports, Hotels & Luxury, Vacation Escapes'}

Guidelines for Recommendations:
1. Always analyze the user's specific requirements, vibe, and location against the provided database listings.
2. For open-ended queries like:
   - "Find me a quiet café with good Wi-Fi": recommend spots categorized as cafés with quiet workspaces and specialty coffee (e.g. Pallet Cafe Lavington, CJ's Koinange Street).
   - "Where can we do indoor sports?": recommend indoor physical/social activities like 10-pin bowling (Pins & Strikes Luxury Bowling Alley), motion VR gaming (Nairobi VR & Simulator Gaming Arena), or indoor/tactical sport arenas.
   - "Romantic date night": recommend intimate candlelit garden dining or cocktail terraces (e.g. The Talisman Restaurant & Gardens, Ink & Drink Bar & Lounge).
   - "Nature trails & hikes": recommend Karura Forest Canopy & Biking Trails, Oloolua Nature Trail & Waterfall Caves, or Ngong Hills Ridge Hike.
   - "Amapiano rave / party": recommend events or nightlife spots like Amapiano & Chill All-White Rave, The Alchemist Weekend Block Party, or Cravers Grill.
   - "Vintage denim / streetwear / thrift": recommend thrift items or vintage stalls like Gikomba Stall 4B Vintage.
3. If the user is in or specifies a location like "${selectedLocation || 'Westlands'}", prioritize matching spots in that neighborhood first if suitable.
4. Output structured JSON:
   - "message": A warm, witty, localized concierge recommendation directly answering the query with insider tips.
   - "matchedSpotIds": array of integer spot IDs from the provided database matching the recommendation (can be 1 or 2 spots).
   - "matchedEventIds": array of integer event IDs from the provided database (or empty).
   - "matchedThriftIds": array of integer thrift IDs from the provided database (or empty).
   - "matchedSpotId": ID of the primary recommended spot, or 0.
   - "matchedEventId": ID of the primary recommended event, or 0.
   - "matchedThriftId": ID of the primary recommended thrift item, or 0.`;

        const recentHistory = (conversationHistory || [])
          .slice(-6)
          .map((h: any) => `${h.sender === 'user' ? 'User' : 'Wagwan AI'}: ${h.text}`)
          .join('\n');

        const promptText = `User Context Location: ${selectedLocation || 'Nairobi'}
Active Category: ${activeCategory || 'All Categories'}
Conversation History:
${recentHistory ? recentHistory + '\n' : 'No previous history.'}
User Prompt: "${message}"

Available Hangout Spots in database:
${JSON.stringify(spotsContext)}

Available Events in database:
${JSON.stringify(eventsContext)}

Available Thrift / Luku Items in database:
${JSON.stringify(thriftContext)}

Respond as Wagwan AI in JSON format.`;

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
                matchedSpotIds: {
                  type: Type.ARRAY,
                  items: { type: Type.INTEGER },
                  description: 'List of recommended spot IDs from database',
                },
                matchedEventIds: {
                  type: Type.ARRAY,
                  items: { type: Type.INTEGER },
                  description: 'List of recommended event IDs from database',
                },
                matchedThriftIds: {
                  type: Type.ARRAY,
                  items: { type: Type.INTEGER },
                  description: 'List of recommended thrift IDs from database',
                },
                matchedSpotId: {
                  type: Type.INTEGER,
                  description: 'Primary matching spot ID or 0',
                },
                matchedEventId: {
                  type: Type.INTEGER,
                  description: 'Primary matching event ID or 0',
                },
                matchedThriftId: {
                  type: Type.INTEGER,
                  description: 'Primary matching thrift ID or 0',
                },
              },
              required: ['message'],
            },
          },
        });

        const rawText = response.text || '';
        try {
          const parsed = JSON.parse(rawText);
          const spotIds: number[] = Array.isArray(parsed.matchedSpotIds) 
            ? parsed.matchedSpotIds.filter((id: any) => typeof id === 'number' && id > 0)
            : (parsed.matchedSpotId > 0 ? [parsed.matchedSpotId] : []);
          const eventIds: number[] = Array.isArray(parsed.matchedEventIds)
            ? parsed.matchedEventIds.filter((id: any) => typeof id === 'number' && id > 0)
            : (parsed.matchedEventId > 0 ? [parsed.matchedEventId] : []);
          const thriftIds: number[] = Array.isArray(parsed.matchedThriftIds)
            ? parsed.matchedThriftIds.filter((id: any) => typeof id === 'number' && id > 0)
            : (parsed.matchedThriftId > 0 ? [parsed.matchedThriftId] : []);

          return res.json({
            reply: parsed.message,
            matchedSpotId: spotIds[0] || parsed.matchedSpotId || 0,
            matchedEventId: eventIds[0] || parsed.matchedEventId || 0,
            matchedThriftId: thriftIds[0] || parsed.matchedThriftId || 0,
            matchedSpotIds: spotIds,
            matchedEventIds: eventIds,
            matchedThriftIds: thriftIds,
            source: 'gemini',
          });
        } catch {
          return res.json({
            reply: rawText,
            matchedSpotId: 0,
            matchedEventId: 0,
            matchedThriftId: 0,
            matchedSpotIds: [],
            matchedEventIds: [],
            matchedThriftIds: [],
            source: 'gemini-text',
          });
        }
      }

      // Comprehensive, intelligent fallback when GEMINI_API_KEY is not configured
      const fallbackResult = generateIntelligentFallbackResponse({
        message,
        selectedLocation,
        activeCategory,
        spots,
        events,
        thriftItems
      });

      return res.json(fallbackResult);
    } catch (err: any) {
      console.error('Server error in /api/ai/chat:', err);
      return res.status(500).json({
        error: err.message || 'Internal server error processing AI chat prompt',
        reply: "Wagwan! I'm temporarily unable to reach the AI models, please try again in a moment.",
      });
    }
  });

  // Fast streaming Wagwan AI chat endpoint via Server-Sent Events (SSE)
  app.post('/api/ai/chat-stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendSSE = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const { 
        message, 
        conversationHistory = [], 
        selectedLocation = '', 
        activeCategory = '', 
        activeCategories = [], 
        spots = [], 
        events = [], 
        thriftItems = [] 
      } = req.body;

      if (!message || typeof message !== 'string') {
        sendSSE('error', { error: 'Valid prompt message is required.' });
        return res.end();
      }

      if (ai) {
        const spotsContext = (spots || []).map((s: any) => ({
          id: s.id,
          title: s.title,
          category: s.category,
          neighborhood: s.neighborhood,
          rating: s.rating,
          price: s.price,
          description: s.description,
          activityType: s.activityType,
          equipmentProvided: s.equipmentProvided,
          address: s.address,
        }));

        const eventsContext = (events || []).map((e: any) => ({
          id: e.id,
          title: e.title,
          category: e.category,
          genre: e.genre,
          location: e.location,
          date: e.date,
          goingCount: e.goingCount,
        }));

        const thriftContext = (thriftItems || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          category: t.category,
          price: t.price,
          seller: t.seller,
          storeLocation: t.storeLocation,
        }));

        const systemInstruction = `You are Wagwan AI, Nairobi's premier hangouts & nightlife concierge on RADA.
Tone: Warm, witty, urban Nairobi persona with natural local Sheng ('Wagwan!', 'rada safi', 'vibes', 'turn up', 'shikisha').
User Selected Location: "${selectedLocation || 'Nairobi'}"
Active Category: "${activeCategory || 'All Hangout Categories'}"
Available Categories: ${Array.isArray(activeCategories) && activeCategories.length > 0 ? activeCategories.join(', ') : 'Restaurants & Dining, Cafés & Bakeries, Clubs & Lounges, Date Spots, Connect with Nature, Creative Leisure, Tech & Gaming, Action & Sports, Hotels & Luxury, Vacation Escapes'}

Guidelines for Recommendations:
1. Recommend real spots, events, or thrift items from the provided database that match the user's inquiry, vibe, and location.
2. For open-ended queries:
   - "Find me a quiet café with good Wi-Fi": recommend spots like Pallet Cafe Lavington or CJ's Koinange Street.
   - "Where can we do indoor sports?": recommend indoor physical/social activities like 10-pin bowling (Pins & Strikes Luxury Bowling Alley) or motion VR (Nairobi VR & Simulator Gaming Arena).
   - "Romantic date night": recommend intimate candlelit garden dining or cocktail terraces (The Talisman, Ink & Drink).
   - "Nature trails & hikes": recommend Karura Forest Canopy & Biking Trails, Oloolua Nature Trail, or Ngong Hills.
   - "Amapiano rave / party": recommend Amapiano & Chill or The Alchemist.
3. Explicitly mention the exact spot or event title in your text so it displays recommendation cards.
4. At the very end of your response on a new line, add a tag for card matching:
[RECOMMENDATIONS: spots=id1,id2; events=id3; thrift=id4] (use 0 if none).`;

        const recentHistory = (conversationHistory || [])
          .slice(-6)
          .map((h: any) => `${h.sender === 'user' ? 'User' : 'Wagwan AI'}: ${h.text}`)
          .join('\n');

        const stream = await ai.models.generateContentStream({
          model: 'gemini-3.8-flash',
          contents: `User in ${selectedLocation || 'Nairobi'}: "${message}".
Context History:
${recentHistory}
Spots Database: ${JSON.stringify(spotsContext)}
Events Database: ${JSON.stringify(eventsContext)}
Thrift Database: ${JSON.stringify(thriftContext)}`,
          config: {
            systemInstruction,
          },
        });

        let fullRawText = '';
        for await (const chunk of stream) {
          const chunkText = chunk.text || '';
          if (chunkText) {
            fullRawText += chunkText;
            // Filter out the [RECOMMENDATIONS: tag from the user-visible stream
            const cleanStreamText = fullRawText.replace(/\[RECOMMENDATIONS:[^\]]*\]?/gi, '').trimEnd();
            sendSSE('chunk', { chunk: chunkText, text: cleanStreamText });
          }
        }

        // Parse recommendation tag from fullRawText
        let parsedSpotIds: number[] = [];
        let parsedEventIds: number[] = [];
        let parsedThriftIds: number[] = [];

        const tagMatch = fullRawText.match(/\[RECOMMENDATIONS:\s*spots=([\d,\s]*);\s*events=([\d,\s]*);\s*thrift=([\d,\s]*)\]/i);
        if (tagMatch) {
          parsedSpotIds = tagMatch[1].split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0);
          parsedEventIds = tagMatch[2].split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0);
          parsedThriftIds = tagMatch[3].split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0);
        }

        const cleanFinalText = fullRawText.replace(/\[RECOMMENDATIONS:[^\]]*\]/gi, '').trim();

        // Also do name/token-level matching across database listings as a resilient safeguard
        const textLower = cleanFinalText.toLowerCase();
        const matchedSpotsFromText = spots.filter((s: any) => {
          const title = (s.title || '').toLowerCase();
          const firstWords = title.split(/\s+/).slice(0, 2).join(' ');
          return textLower.includes(title) || (firstWords.length > 5 && textLower.includes(firstWords));
        });

        const matchedEventsFromText = events.filter((e: any) => {
          const title = (e.title || '').toLowerCase();
          const firstWords = title.split(/\s+/).slice(0, 2).join(' ');
          return textLower.includes(title) || (firstWords.length > 5 && textLower.includes(firstWords));
        });

        const matchedThriftFromText = thriftItems.filter((t: any) => {
          return textLower.includes((t.name || '').toLowerCase());
        });

        const allSpotIds = Array.from(new Set([...parsedSpotIds, ...matchedSpotsFromText.map((s: any) => s.id)]));
        const allEventIds = Array.from(new Set([...parsedEventIds, ...matchedEventsFromText.map((e: any) => e.id)]));
        const allThriftIds = Array.from(new Set([...parsedThriftIds, ...matchedThriftFromText.map((t: any) => t.id)]));

        sendSSE('complete', {
          reply: cleanFinalText,
          matchedSpotId: allSpotIds[0] || 0,
          matchedEventId: allEventIds[0] || 0,
          matchedThriftId: allThriftIds[0] || 0,
          matchedSpotIds: allSpotIds,
          matchedEventIds: allEventIds,
          matchedThriftIds: allThriftIds,
          source: 'gemini-stream',
        });
        return res.end();
      }

      // Stream fallback tokens smoothly
      const fallbackResult = generateIntelligentFallbackResponse({
        message,
        selectedLocation,
        activeCategory,
        spots,
        events,
        thriftItems
      });

      const words = fallbackResult.reply.split(' ');
      let currentText = '';
      for (let i = 0; i < words.length; i++) {
        const piece = (i === 0 ? '' : ' ') + words[i];
        currentText += piece;
        sendSSE('chunk', { chunk: piece, text: currentText });
        await new Promise(r => setTimeout(r, 18));
      }

      sendSSE('complete', fallbackResult);
      res.end();
    } catch (err: any) {
      console.error('Error in /api/ai/chat-stream:', err);
      sendSSE('error', { error: err.message || 'Stream processing error' });
      res.end();
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

/**
 * Intelligent localized fallback parser for Wagwan AI when Gemini API key is absent or offline.
 * Accurately parses open-ended user queries against real database spots, events, and thrift items,
 * taking into account user location and active category.
 */
function generateIntelligentFallbackResponse(params: {
  message: string;
  selectedLocation?: string;
  activeCategory?: string;
  spots: any[];
  events: any[];
  thriftItems: any[];
}) {
  const { message, selectedLocation = '', activeCategory = '', spots = [], events = [], thriftItems = [] } = params;
  const qLower = message.toLowerCase().trim();

  // 1. Thrift / Streetwear query
  const isThrift =
    qLower.includes('thrift') ||
    qLower.includes('luku') ||
    qLower.includes('streetwear') ||
    qLower.includes('vintage') ||
    qLower.includes('denim') ||
    qLower.includes('jacket') ||
    qLower.includes('sneaker') ||
    qLower.includes('hoodie') ||
    qLower.includes('fit');

  if (isThrift && thriftItems.length > 0) {
    const matched =
      thriftItems.find(t =>
        qLower.includes(t.name.toLowerCase()) ||
        qLower.includes(t.category.toLowerCase()) ||
        qLower.includes(t.seller.toLowerCase())
      ) || thriftItems[0];

    return {
      reply: `Wagwan fam! Looking for that fresh Nairobi drip? I scouted "${matched.name}" from ${matched.seller} over at ${matched.storeLocation}! Going for ${matched.price} (condition: ${matched.condition}). Check the direct merchant link below to cop! 🔥`,
      matchedSpotId: 0,
      matchedEventId: 0,
      matchedThriftId: matched.id,
      matchedSpotIds: [],
      matchedEventIds: [],
      matchedThriftIds: [matched.id],
      source: 'smart-fallback',
    };
  }

  // 2. Events & Nightlife Party queries
  const isEvent =
    qLower.includes('party') ||
    qLower.includes('rave') ||
    qLower.includes('concert') ||
    qLower.includes('amapiano') ||
    qLower.includes('afro-house') ||
    qLower.includes('festival') ||
    qLower.includes('ticket') ||
    qLower.includes('this weekend') ||
    qLower.includes('tonight');

  if (isEvent && events.length > 0) {
    const matchedEvt =
      events.find(e =>
        qLower.includes(e.title.toLowerCase()) ||
        (e.genre && qLower.includes(e.genre.toLowerCase())) ||
        (e.location && qLower.includes(e.location.toLowerCase()))
      ) || events[0];

    return {
      reply: `Wagwan! If you want to turn up proper, lock in "${matchedEvt.title}" at ${matchedEvt.location} on ${matchedEvt.date}! ${matchedEvt.goingCount}+ party lovers already going. Tap View Details below to secure tickets! 🎉`,
      matchedSpotId: 0,
      matchedEventId: matchedEvt.id,
      matchedThriftId: 0,
      matchedSpotIds: [],
      matchedEventIds: [matchedEvt.id],
      matchedThriftIds: [],
      source: 'smart-fallback',
    };
  }

  // 3. Spots Matching - Open-ended queries & Location filtering
  if (spots.length > 0) {
    // Check specific intents:
    // a) Indoor sports / bowling / gaming / indoor activities
    const isIndoorSports =
      qLower.includes('indoor sport') ||
      qLower.includes('indoor') ||
      qLower.includes('bowling') ||
      qLower.includes('arcade') ||
      qLower.includes('gaming') ||
      qLower.includes('kart') ||
      qLower.includes('vr') ||
      qLower.includes('simulator') ||
      qLower.includes('sports');

    // b) Quiet cafe with good Wi-Fi / work / coffee
    const isQuietCafe =
      qLower.includes('quiet') ||
      qLower.includes('cafe') ||
      qLower.includes('café') ||
      qLower.includes('wifi') ||
      qLower.includes('wi-fi') ||
      qLower.includes('laptop') ||
      qLower.includes('work') ||
      qLower.includes('coffee') ||
      qLower.includes('co-work');

    // c) Romantic date / date night
    const isDate =
      qLower.includes('date') ||
      qLower.includes('romantic') ||
      qLower.includes('intimate') ||
      qLower.includes('candlelit') ||
      qLower.includes('wine');

    // d) Nature / outdoor walks / trails
    const isNature =
      qLower.includes('nature') ||
      qLower.includes('trail') ||
      qLower.includes('hike') ||
      qLower.includes('forest') ||
      qLower.includes('waterfall') ||
      qLower.includes('biking');

    const scored = spots.map(s => {
      let score = 0;
      const title = (s.title || '').toLowerCase();
      const neigh = (s.neighborhood || '').toLowerCase();
      const cat = (s.category || '').toLowerCase();
      const desc = (s.description || '').toLowerCase();
      const act = (s.activityType || '').toLowerCase();
      const equip = (s.equipmentProvided || '').toLowerCase();
      const addr = (s.address || '').toLowerCase();

      // Proximity boost to user location
      if (selectedLocation && neigh.includes(selectedLocation.toLowerCase())) {
        score += 14;
      }

      // Indoor sports intent boost
      if (isIndoorSports) {
        if (title.includes('bowling') || desc.includes('bowling') || cat === 'action_sports') score += 28;
        if (title.includes('vr') || desc.includes('virtual reality') || cat === 'tech_gaming') score += 26;
        if (title.includes('kart') || desc.includes('karting')) score += 24;
        if (title.includes('paintball') || act.includes('tactical')) score += 22;
      }

      // Quiet cafe / Wi-Fi intent boost
      if (isQuietCafe) {
        if (cat === 'cafes' || cat === 'cafes_bakeries') score += 20;
        if (desc.includes('quiet') || desc.includes('workspace')) score += 25;
        if (desc.includes('coffee') || desc.includes('brunch')) score += 12;
        if (desc.includes('fast') || title.includes('pallet') || title.includes('cj')) score += 15;
      }

      // Date intent boost
      if (isDate) {
        if (cat === 'date_spots') score += 26;
        if (desc.includes('candlelit') || desc.includes('romantic') || desc.includes('garden')) score += 20;
        if (title.includes('talisman') || title.includes('ink')) score += 18;
      }

      // Nature intent boost
      if (isNature) {
        if (cat === 'connect_with_nature' || cat === 'nature') score += 26;
        if (desc.includes('forest') || desc.includes('waterfall') || desc.includes('trail')) score += 22;
      }

      // General keyword matching
      const words = qLower.split(/\s+/).filter(w => w.length > 2);
      for (const w of words) {
        if (title.includes(w)) score += 10;
        if (neigh.includes(w)) score += 8;
        if (cat.includes(w)) score += 6;
        if (desc.includes(w)) score += 4;
        if (act.includes(w)) score += 5;
        if (equip.includes(w)) score += 4;
        if (addr.includes(w)) score += 4;
      }

      return { spot: s, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const topMatch = scored[0]?.score > 0 ? scored[0].spot : spots[0];
    const secondMatch = scored[1]?.score > 15 && scored[1].spot.id !== topMatch.id ? scored[1].spot : null;

    let responsePersonaText = '';
    if (isQuietCafe) {
      responsePersonaText = `Wagwan! For a peaceful remote work vibe with good Wi-Fi and artisan brews, I highly recommend ${topMatch.title} in ${topMatch.neighborhood}! Rating: ★${topMatch.rating} (${topMatch.price}). ${topMatch.description} Perfect for getting focused work done or quiet one-on-ones.`;
    } else if (isIndoorSports) {
      responsePersonaText = `Rada safi! Looking for indoor sports and action in Nairobi? Check out ${topMatch.title} in ${topMatch.neighborhood}! ${topMatch.description} Tap View Details below to check pricing, lane times, and squad bookings! 🎳`;
    } else if (isDate) {
      responsePersonaText = `Wagwan! For a memorable date night with intimate atmosphere, ${topMatch.title} in ${topMatch.neighborhood} is unmatched! ★${topMatch.rating} (${topMatch.price}). ${topMatch.description} Great wine selection and cozy seating.`;
    } else if (isNature) {
      responsePersonaText = `Rada safi! Need fresh air away from Nairobi traffic? I recommend heading over to ${topMatch.title} (${topMatch.neighborhood})! ${topMatch.description} Trail fee is super affordable and great for a Saturday morning jog.`;
    } else {
      const locNotice = selectedLocation ? ` near ${selectedLocation}` : '';
      responsePersonaText = `Wagwan! For your prompt "${message}"${locNotice}, my top pick is ${topMatch.title} in ${topMatch.neighborhood}! ★${topMatch.rating} (${topMatch.price}). ${topMatch.description || 'Verified local hangout.'}`;
    }

    const matchedSpotIds = [topMatch.id];
    if (secondMatch) matchedSpotIds.push(secondMatch.id);

    return {
      reply: responsePersonaText,
      matchedSpotId: topMatch.id,
      matchedEventId: 0,
      matchedThriftId: 0,
      matchedSpotIds,
      matchedEventIds: [],
      matchedThriftIds: [],
      source: 'smart-fallback',
    };
  }

  return {
    reply: `Wagwan! I'm your RADA hangout concierge. Whatever you're after in Nairobi — date nights, coffee hubs, indoor games, raves, or luku fits — I've got you covered!`,
    matchedSpotId: 0,
    matchedEventId: 0,
    matchedThriftId: 0,
    matchedSpotIds: [],
    matchedEventIds: [],
    matchedThriftIds: [],
    source: 'smart-fallback',
  };
}

