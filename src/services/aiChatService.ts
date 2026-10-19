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
  recommendedSpots?: SpotItem[];
  recommendedEvents?: EventItem[];
  recommendedThrift?: ThriftItem[];
  source?: 'gemini' | 'gemini-stream' | 'gemini-text' | 'smart-fallback';
}

export interface SendWagwanChatParams {
  message: string;
  conversationHistory: ChatMessageContext[];
  selectedLocation?: string;
  activeCategory?: string;
  activeCategories?: string[];
  spots: SpotItem[];
  events?: EventItem[];
  thriftItems?: ThriftItem[];
  onStreamChunk?: (chunk: string, accumulated: string) => void;
}

/**
 * Sends user prompt dynamically to the Wagwan AI concierge endpoint
 * with full context of user location, active category, database listings, and chat turns.
 * Supports real-time fast streaming responses.
 */
export async function sendWagwanChatMessage(params: SendWagwanChatParams): Promise<WagwanAIResponse> {
  const { 
    message, 
    conversationHistory, 
    selectedLocation = '', 
    activeCategory = '', 
    activeCategories = [], 
    spots = [], 
    events = [], 
    thriftItems = [],
    onStreamChunk 
  } = params;

  const payload = {
    message,
    conversationHistory: conversationHistory.slice(-6),
    selectedLocation,
    activeCategory,
    activeCategories,
    spots: spots.map(s => ({
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
  };

  // Attempt fast streaming endpoint first if onStreamChunk is supplied
  if (typeof onStreamChunk === 'function') {
    try {
      const streamRes = await fetch('/api/ai/chat-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(payload),
      });

      if (streamRes.ok && streamRes.body) {
        const reader = streamRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let accumulatedText = '';
        let finalPayload: any = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const block of lines) {
            const eventMatch = block.match(/event:\s*(\w+)/);
            const dataMatch = block.match(/data:\s*(.+)/);
            if (!dataMatch) continue;

            const eventType = eventMatch ? eventMatch[1] : 'message';
            try {
              const parsedData = JSON.parse(dataMatch[1]);
              if (eventType === 'chunk') {
                accumulatedText = parsedData.text || (accumulatedText + (parsedData.chunk || ''));
                onStreamChunk(parsedData.chunk || '', accumulatedText);
              } else if (eventType === 'complete') {
                finalPayload = parsedData;
              }
            } catch (e) {
              // Ignore partial parse failures
            }
          }
        }

        if (finalPayload || accumulatedText) {
          const replyText = finalPayload?.reply || accumulatedText;
          const { matchedSpots, matchedEvents, matchedThrift } = resolveMatches({
            replyText,
            spots,
            events,
            thriftItems,
            matchedSpotId: finalPayload?.matchedSpotId,
            matchedEventId: finalPayload?.matchedEventId,
            matchedThriftId: finalPayload?.matchedThriftId,
            matchedSpotIds: finalPayload?.matchedSpotIds,
            matchedEventIds: finalPayload?.matchedEventIds,
            matchedThriftIds: finalPayload?.matchedThriftIds,
          });

          return {
            text: replyText,
            spotMatch: matchedSpots[0],
            eventMatch: matchedEvents[0],
            thriftMatch: matchedThrift[0],
            recommendedSpots: matchedSpots,
            recommendedEvents: matchedEvents,
            recommendedThrift: matchedThrift,
            source: (finalPayload?.source as any) || 'gemini-stream',
          };
        }
      }
    } catch (streamErr) {
      console.warn('Wagwan AI streaming fetch error, falling back to standard JSON API:', streamErr);
    }
  }

  // Standard JSON API call
  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      const replyText = data.reply || data.text || '';

      // If onStreamChunk provided, simulate smooth fast streaming
      if (typeof onStreamChunk === 'function' && replyText) {
        await simulateFastStream(replyText, onStreamChunk);
      }

      const { matchedSpots, matchedEvents, matchedThrift } = resolveMatches({
        replyText,
        spots,
        events,
        thriftItems,
        matchedSpotId: data.matchedSpotId,
        matchedEventId: data.matchedEventId,
        matchedThriftId: data.matchedThriftId,
        matchedSpotIds: data.matchedSpotIds,
        matchedEventIds: data.matchedEventIds,
        matchedThriftIds: data.matchedThriftIds,
      });

      return {
        text: replyText,
        spotMatch: matchedSpots[0],
        eventMatch: matchedEvents[0],
        thriftMatch: matchedThrift[0],
        recommendedSpots: matchedSpots,
        recommendedEvents: matchedEvents,
        recommendedThrift: matchedThrift,
        source: data.source || 'gemini',
      };
    }
  } catch (err) {
    console.warn('Wagwan AI API call error, falling back to intelligent dynamic matcher:', err);
  }

  // Resilient fallback with intelligent contextual prompt parsing
  const fallback = generateDynamicClientFallback({
    query: message,
    selectedLocation,
    activeCategory,
    spots,
    events,
    thriftItems,
  });

  if (typeof onStreamChunk === 'function' && fallback.text) {
    await simulateFastStream(fallback.text, onStreamChunk);
  }

  return fallback;
}

/**
 * Resolves matched objects from IDs or text mentions in the AI output
 */
function resolveMatches(params: {
  replyText: string;
  spots: SpotItem[];
  events: EventItem[];
  thriftItems: ThriftItem[];
  matchedSpotId?: number;
  matchedEventId?: number;
  matchedThriftId?: number;
  matchedSpotIds?: number[];
  matchedEventIds?: number[];
  matchedThriftIds?: number[];
}) {
  const {
    replyText,
    spots,
    events,
    thriftItems,
    matchedSpotId,
    matchedEventId,
    matchedThriftId,
    matchedSpotIds = [],
    matchedEventIds = [],
    matchedThriftIds = [],
  } = params;

  const matchedSpots: SpotItem[] = [];
  const matchedEvents: EventItem[] = [];
  const matchedThrift: ThriftItem[] = [];

  // Match by explicit ID arrays
  if (Array.isArray(matchedSpotIds)) {
    for (const sid of matchedSpotIds) {
      const sp = spots.find(s => Number(s.id) === Number(sid));
      if (sp && !matchedSpots.some(s => s.id === sp.id)) matchedSpots.push(sp);
    }
  }
  if (matchedSpotId && matchedSpotId > 0 && !matchedSpots.some(s => Number(s.id) === Number(matchedSpotId))) {
    const sp = spots.find(s => Number(s.id) === Number(matchedSpotId));
    if (sp) matchedSpots.unshift(sp);
  }

  if (Array.isArray(matchedEventIds)) {
    for (const eid of matchedEventIds) {
      const ev = events.find(e => Number(e.id) === Number(eid));
      if (ev && !matchedEvents.some(e => e.id === ev.id)) matchedEvents.push(ev);
    }
  }
  if (matchedEventId && matchedEventId > 0 && !matchedEvents.some(e => Number(e.id) === Number(matchedEventId))) {
    const ev = events.find(e => Number(e.id) === Number(matchedEventId));
    if (ev) matchedEvents.unshift(ev);
  }

  if (Array.isArray(matchedThriftIds)) {
    for (const tid of matchedThriftIds) {
      const th = thriftItems.find(t => Number(t.id) === Number(tid));
      if (th && !matchedThrift.some(t => t.id === th.id)) matchedThrift.push(th);
    }
  }
  if (matchedThriftId && matchedThriftId > 0 && !matchedThrift.some(t => Number(t.id) === Number(matchedThriftId))) {
    const th = thriftItems.find(t => Number(t.id) === Number(matchedThriftId));
    if (th) matchedThrift.unshift(th);
  }

  // If no explicit IDs, match by spot or event title in replyText
  if (matchedSpots.length === 0 && matchedEvents.length === 0 && matchedThrift.length === 0) {
    const textLower = replyText.toLowerCase();
    for (const s of spots) {
      if (textLower.includes(s.title.toLowerCase()) && !matchedSpots.some(item => item.id === s.id)) {
        matchedSpots.push(s);
      }
    }
    for (const e of events) {
      if (textLower.includes(e.title.toLowerCase()) && !matchedEvents.some(item => item.id === e.id)) {
        matchedEvents.push(e);
      }
    }
    for (const t of thriftItems) {
      if (textLower.includes(t.name.toLowerCase()) && !matchedThrift.some(item => item.id === t.id)) {
        matchedThrift.push(t);
      }
    }
  }

  return { matchedSpots, matchedEvents, matchedThrift };
}

/**
 * Fast streaming token simulation for responsive UI feedback
 */
async function simulateFastStream(
  fullText: string,
  callback: (chunk: string, accumulated: string) => void
) {
  const words = fullText.split(' ');
  let accumulated = '';
  for (let i = 0; i < words.length; i++) {
    const chunk = (i === 0 ? '' : ' ') + words[i];
    accumulated += chunk;
    callback(chunk, accumulated);
    await new Promise(r => setTimeout(r, 15));
  }
}

/**
 * Intelligent client-side fallback with open-ended query understanding and location awareness
 */
function generateDynamicClientFallback(params: {
  query: string;
  selectedLocation?: string;
  activeCategory?: string;
  spots: SpotItem[];
  events: EventItem[];
  thriftItems: ThriftItem[];
}): WagwanAIResponse {
  const { query, selectedLocation = '', spots, events, thriftItems } = params;
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
      text: `Wagwan! For your drip search "${query}", check out "${matched.name}" from ${matched.seller} over at ${matched.storeLocation} for ${matched.price}! Condition: ${matched.condition}. Tap below to connect directly with the merchant! 🔥`,
      thriftMatch: matched,
      recommendedThrift: [matched],
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
      text: `Wagwan! If you want to turn up proper, I recommend "${matched.title}" at ${matched.location} on ${matched.date}! Over ${matched.goingCount} people going with verified ticketing. Tap View Details below to secure tickets! 🎉`,
      eventMatch: matched,
      recommendedEvents: [matched],
      source: 'smart-fallback',
    };
  }

  // 3. Spots dynamic multi-criteria match with open-ended query understanding
  if (spots.length > 0) {
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

    const isDate =
      qLower.includes('date') ||
      qLower.includes('romantic') ||
      qLower.includes('intimate') ||
      qLower.includes('candlelit') ||
      qLower.includes('wine');

    const isNature =
      qLower.includes('nature') ||
      qLower.includes('trail') ||
      qLower.includes('hike') ||
      qLower.includes('forest') ||
      qLower.includes('waterfall') ||
      qLower.includes('biking');

    const scoredSpots = spots.map(s => {
      let score = 0;
      const title = s.title.toLowerCase();
      const neigh = s.neighborhood.toLowerCase();
      const cat = s.category.toLowerCase();
      const desc = (s.description || '').toLowerCase();
      const addr = (s.address || '').toLowerCase();
      const act = (s.activityType || '').toLowerCase();

      // Proximity boost
      if (selectedLocation && neigh.includes(selectedLocation.toLowerCase())) {
        score += 14;
      }

      // Indoor sports
      if (isIndoorSports) {
        if (title.includes('bowling') || cat === 'action_sports') score += 28;
        if (title.includes('vr') || cat === 'tech_gaming') score += 26;
        if (title.includes('kart') || desc.includes('racing')) score += 24;
      }

      // Quiet cafe with good Wi-Fi
      if (isQuietCafe) {
        if (cat === 'cafes' || cat === 'cafes_bakeries') score += 20;
        if (desc.includes('quiet') || desc.includes('workspace')) score += 25;
        if (desc.includes('coffee') || title.includes('pallet') || title.includes('cj')) score += 15;
      }

      // Date night
      if (isDate) {
        if (cat === 'date_spots') score += 26;
        if (desc.includes('candlelit') || desc.includes('romantic')) score += 20;
      }

      // Nature
      if (isNature) {
        if (cat === 'connect_with_nature' || cat === 'nature') score += 26;
        if (desc.includes('forest') || desc.includes('waterfall') || desc.includes('hiking')) score += 22;
      }

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
        if (act.includes(w)) score += 4;
      }

      return { spot: s, score };
    });

    scoredSpots.sort((a, b) => b.score - a.score);
    const topMatch = scoredSpots[0].score > 0 ? scoredSpots[0].spot : spots[0];
    const secondMatch = scoredSpots[1]?.score > 15 && scoredSpots[1].spot.id !== topMatch.id ? scoredSpots[1].spot : null;

    let responseText = '';
    if (isQuietCafe) {
      responseText = `Wagwan! For a peaceful remote work session with fast Wi-Fi and artisan brews, I recommend ${topMatch.title} in ${topMatch.neighborhood}! Rating: ★${topMatch.rating} (${topMatch.price}). ${topMatch.description}`;
    } else if (isIndoorSports) {
      responseText = `Rada safi! Looking for indoor sports and competitive action in Nairobi? Check out ${topMatch.title} in ${topMatch.neighborhood}! ${topMatch.description} Tap View Details below to check pricing, lane times, and squad bookings! 🎳`;
    } else if (isDate) {
      responseText = `Wagwan! For an intimate date night with exceptional ambiance, ${topMatch.title} in ${topMatch.neighborhood} is a prime pick! ★${topMatch.rating} (${topMatch.price}). ${topMatch.description}`;
    } else if (isNature) {
      responseText = `Rada safi! Need fresh air away from Nairobi traffic? Head out to ${topMatch.title} in ${topMatch.neighborhood}! ${topMatch.description}`;
    } else {
      const locNotice = selectedLocation ? ` near ${selectedLocation}` : '';
      responseText = `Wagwan! For "${query}"${locNotice}, my top pick is ${topMatch.title} in ${topMatch.neighborhood}! Rating: ★${topMatch.rating} (${topMatch.price}). ${topMatch.description || 'Verified local hangout.'}`;
    }

    const recommendedSpots = [topMatch];
    if (secondMatch) recommendedSpots.push(secondMatch);

    return {
      text: responseText,
      spotMatch: topMatch,
      recommendedSpots,
      source: 'smart-fallback',
    };
  }

  return {
    text: `Wagwan! I found great vibes matching "${query}". Check out our verified spots and events tab for curated recommendations!`,
    source: 'smart-fallback',
  };
}

