import { SpotItem, EventItem, ThriftItem } from '../types';

export interface ChatMessageContext {
  sender: 'user' | 'ai';
  text: string;
}

export interface WagwanAIResponse {
  text: string;
  spotMatch?: SpotItem;
  eventMatch?: EventItem;
  thriftMatch?: ThriftItem;
  source?: 'gemini' | 'gemini-text' | 'smart-fallback';
}

/**
 * Sends the user prompt dynamically to the backend Gemini AI concierge endpoint
 * with full context of spots, events, thrift items, and past chat turns.
 */
export async function sendWagwanChatMessage(params: {
  message: string;
  conversationHistory: ChatMessageContext[];
  spots: SpotItem[];
  events?: EventItem[];
  thriftItems?: ThriftItem[];
}): Promise<WagwanAIResponse> {
  const { message, conversationHistory, spots = [], events = [], thriftItems = [] } = params;

  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        conversationHistory: conversationHistory.slice(-6),
        spots: spots.map(s => ({
          id: s.id,
          title: s.title,
          category: s.category,
          neighborhood: s.neighborhood,
          rating: s.rating,
          price: s.price,
          description: s.description,
          address: s.address,
        })),
        events: events.map(e => ({
          id: e.id,
          title: e.title,
          category: e.category,
          location: e.location,
          date: e.date,
          price: e.tiers?.[0]?.price || 'KES 1,000',
          tiers: e.tiers?.map(t => `${t.name}: ${t.price}`).join(', '),
          genre: e.genre,
          description: e.description,
          goingCount: e.goingCount,
        })),
        thriftItems: thriftItems.map(t => ({
          id: t.id,
          name: t.name,
          category: t.category,
          price: t.price,
          seller: t.seller,
          storeLocation: t.storeLocation,
          condition: t.condition,
          whatsapp: t.whatsapp,
        })),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const replyText = data.reply || data.text || '';
      
      let matchedSpot: SpotItem | undefined;
      let matchedEvent: EventItem | undefined;
      let matchedThrift: ThriftItem | undefined;

      if (data.matchedSpotId && data.matchedSpotId > 0) {
        matchedSpot = spots.find(s => Number(s.id) === Number(data.matchedSpotId));
      }
      if (data.matchedEventId && data.matchedEventId > 0) {
        matchedEvent = events.find(e => Number(e.id) === Number(data.matchedEventId));
      }
      if (data.matchedThriftId && data.matchedThriftId > 0) {
        matchedThrift = thriftItems.find(t => Number(t.id) === Number(data.matchedThriftId));
      }

      // If text mentions any specific spot or event by title, also resolve
      if (!matchedSpot && !matchedEvent && !matchedThrift) {
        const textLower = replyText.toLowerCase();
        matchedSpot = spots.find(s => textLower.includes(s.title.toLowerCase()));
        if (!matchedSpot) {
          matchedEvent = events.find(e => textLower.includes(e.title.toLowerCase()));
        }
        if (!matchedSpot && !matchedEvent) {
          matchedThrift = thriftItems.find(t => textLower.includes(t.name.toLowerCase()));
        }
      }

      return {
        text: replyText,
        spotMatch: matchedSpot,
        eventMatch: matchedEvent,
        thriftMatch: matchedThrift,
        source: data.source || 'gemini',
      };
    }
  } catch (err) {
    console.warn('Wagwan AI API call error, falling back to intelligent dynamic matcher:', err);
  }

  // Resilient fallback with intelligent contextual prompt parsing
  return generateDynamicClientFallback(message, spots, events, thriftItems);
}

/**
 * Intelligent client-side fallback when server API is unavailable or during network offline state
 */
function generateDynamicClientFallback(
  query: string,
  spots: SpotItem[],
  events: EventItem[],
  thriftItems: ThriftItem[]
): WagwanAIResponse {
  const qLower = query.toLowerCase().trim();

  // 1. Thrift / Streetwear detection
  const isThriftQuery =
    qLower.includes('thrift') ||
    qLower.includes('luku') ||
    qLower.includes('streetwear') ||
    qLower.includes('vintage') ||
    qLower.includes('denim') ||
    qLower.includes('jean') ||
    qLower.includes('jacket') ||
    qLower.includes('hoodie') ||
    qLower.includes('kicks') ||
    qLower.includes('sneaker') ||
    qLower.includes('fit') ||
    qLower.includes('wear');

  if (isThriftQuery && thriftItems.length > 0) {
    const matched =
      thriftItems.find(t =>
        qLower.includes(t.name.toLowerCase()) ||
        qLower.includes(t.category.toLowerCase()) ||
        qLower.includes(t.seller.toLowerCase()) ||
        qLower.includes(t.storeLocation.toLowerCase())
      ) || thriftItems[0];

    return {
      text: `For your fit search "${query}", check out "${matched.name}" from ${matched.seller} (${matched.storeLocation}) for ${matched.price}! Condition: ${matched.condition}. You can reach the thrift merchant directly below:`,
      thriftMatch: matched,
      source: 'smart-fallback',
    };
  }

  // 2. Event detection
  const isEventQuery =
    qLower.includes('party') ||
    qLower.includes('event') ||
    qLower.includes('rave') ||
    qLower.includes('concert') ||
    qLower.includes('ticket') ||
    qLower.includes('festival') ||
    qLower.includes('amapiano') ||
    qLower.includes('afro') ||
    qLower.includes('tonight') ||
    qLower.includes('weekend');

  if (isEventQuery && events.length > 0) {
    const matched =
      events.find(e =>
        qLower.includes(e.title.toLowerCase()) ||
        (e.genre && qLower.includes(e.genre.toLowerCase())) ||
        qLower.includes(e.location.toLowerCase()) ||
        (e.description && qLower.includes(e.description.toLowerCase()))
      ) || events[0];

    return {
      text: `Turn up! Based on your search for "${query}", I recommend "${matched.title}" at ${matched.location} on ${matched.date}! Over ${matched.goingCount} people going with verified ticketing.`,
      eventMatch: matched,
      source: 'smart-fallback',
    };
  }

  // 3. Spots dynamic multi-criteria match
  if (spots.length > 0) {
    const scoredSpots = spots.map(s => {
      let score = 0;
      const title = s.title.toLowerCase();
      const neigh = s.neighborhood.toLowerCase();
      const cat = s.category.toLowerCase();
      const desc = (s.description || '').toLowerCase();
      const addr = (s.address || '').toLowerCase();

      // Direct text matching
      if (title.includes(qLower)) score += 15;
      if (neigh.includes(qLower)) score += 10;
      if (cat.includes(qLower)) score += 8;
      if (desc.includes(qLower)) score += 5;
      if (addr.includes(qLower)) score += 5;

      // Word-level token matching
      const words = qLower.split(/\s+/).filter(w => w.length > 2);
      for (const w of words) {
        if (title.includes(w)) score += 6;
        if (neigh.includes(w)) score += 5;
        if (cat.includes(w)) score += 4;
        if (desc.includes(w)) score += 3;
      }

      // Keyword intents
      if ((qLower.includes('date') || qLower.includes('romantic')) && (cat.includes('date') || parseFloat(s.rating) >= 4.7)) score += 6;
      if ((qLower.includes('rooftop') || qLower.includes('view')) && (title.includes('rooftop') || desc.includes('rooftop'))) score += 7;
      if ((qLower.includes('coffee') || qLower.includes('cafe') || qLower.includes('work') || qLower.includes('wifi')) && cat.includes('cafe')) score += 7;
      if ((qLower.includes('drink') || qLower.includes('club') || qLower.includes('cocktail')) && cat.includes('club')) score += 7;
      if ((qLower.includes('nature') || qLower.includes('park') || qLower.includes('hike')) && cat.includes('nature')) score += 7;

      return { spot: s, score };
    });

    scoredSpots.sort((a, b) => b.score - a.score);
    const matched = scoredSpots[0].score > 0 ? scoredSpots[0].spot : spots[0];

    return {
      text: `For your request "${query}", I recommend ${matched.title} in ${matched.neighborhood}! Rating: ★${matched.rating} (${matched.price}). Location: ${matched.address}. Vibe: ${matched.description || 'Verified local hangout.'}`,
      spotMatch: matched,
      source: 'smart-fallback',
    };
  }

  return {
    text: `Wagwan! I found great vibes matching "${query}". Check out our verified spots and events tab for curated recommendations!`,
    source: 'smart-fallback',
  };
}
