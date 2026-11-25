import { supabase, isSupabaseConfigured } from './supabase';
import { fetchUserData, saveUserData } from './cloudSync';
import type {
  CollectionFolder,
  SavedItem,
  SpotItem,
  EventItem,
  BusinessOffer,
} from '../types.ts';

export interface PublicCollectionItem {
  id: string | number;
  kind: 'spot' | 'event' | 'offer' | 'thrift';
  title: string;
  subtitle: string;
  image?: string;
  category?: string;
  folderId?: string;
  savedAt: string;
}

export interface PublicUserCollections {
  userId: string;
  folders: CollectionFolder[];
  items: PublicCollectionItem[];
  updatedAt: string;
}

const LOCAL_KEY = 'rada_public_collections_v1';

const isUuid = (v?: string | null): boolean =>
  Boolean(v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v));

function readLocalMap(): Record<string, PublicUserCollections> {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalMap(map: Record<string, PublicUserCollections>): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(map));
  } catch {
    // ignore storage limits
  }
}

export function buildPublicCollectionSnapshot(params: {
  userId: string;
  savedItems: SavedItem[];
  savedFolders: CollectionFolder[];
  spots: SpotItem[];
  events: EventItem[];
  offers?: BusinessOffer[];
}): PublicUserCollections {
  const { userId, savedItems, savedFolders, spots, events, offers = [] } = params;

  const items: PublicCollectionItem[] = savedItems
    .map((saved): PublicCollectionItem | null => {
      if (saved.kind === 'spot') {
        const s = spots.find(
          (x) =>
            String(x.id) === String(saved.id) ||
            String(x.id).replace(/^unclaimed-/, '') === String(saved.id).replace(/^unclaimed-/, '')
        );
        if (!s) return null;
        return {
          id: s.id,
          kind: 'spot',
          title: s.title,
          subtitle: s.neighborhood || s.address || 'Nairobi',
          image: s.img,
          category: s.category,
          folderId: saved.folderId,
          savedAt: saved.savedAt,
        };
      }
      if (saved.kind === 'event') {
        const e = events.find((x) => String(x.id) === String(saved.id));
        if (!e) return null;
        return {
          id: e.id,
          kind: 'event',
          title: e.title,
          subtitle: [e.date, e.location].filter(Boolean).join(' · '),
          image: e.img,
          category: e.genre || e.category,
          folderId: saved.folderId,
          savedAt: saved.savedAt,
        };
      }
      if (saved.kind === 'offer') {
        const o = offers.find((x) => String(x.id) === String(saved.id));
        if (!o) return null;
        return {
          id: o.id,
          kind: 'offer',
          title: o.title,
          subtitle: `${o.businessName}${o.discount ? ` · ${o.discount}` : ''}`,
          image: o.posterUrl,
          category: o.category,
          folderId: saved.folderId,
          savedAt: saved.savedAt,
        };
      }
      return null;
    })
    .filter((x): x is PublicCollectionItem => Boolean(x));

  return {
    userId,
    folders: savedFolders,
    items,
    updatedAt: new Date().toISOString(),
  };
}

export async function publishMyPublicCollections(snapshot: PublicUserCollections): Promise<void> {
  if (!snapshot.userId) return;
  const map = readLocalMap();
  map[snapshot.userId] = snapshot;
  writeLocalMap(map);

  if (isSupabaseConfigured && supabase && isUuid(snapshot.userId)) {
    // Persist into user's synced data + best-effort profile metadata if column exists.
    saveUserData(snapshot.userId, { publicCollections: snapshot } as any).catch(() => {});
  }
}

const IMG = {
  rooftop: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop',
  forest: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&auto=format&fit=crop',
  cafe: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop',
  cocktail: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop',
  art: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop',
  food: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop',
  concert: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop',
};

function fallbackCollectionForUser(userId: string): PublicUserCollections | null {
  if (!userId) return null;
  const lower = userId.toLowerCase();
  const now = new Date().toISOString();

  if (lower.includes('mwende') || lower.includes('wanjiru')) {
    return {
      userId,
      folders: [
        { id: 'f-coffee', name: 'Quiet Coffee & Walks', emoji: 'cafe', createdAt: now },
        { id: 'f-sun', name: 'Sunset Spots', emoji: 'sun', createdAt: now },
      ],
      items: [
        {
          id: 2,
          kind: 'spot',
          title: 'Karura Forest Cafe',
          subtitle: 'Karura · Nature & Coffee',
          image: IMG.forest,
          category: 'Outdoors & Nature',
          folderId: 'f-coffee',
          savedAt: now,
        },
        {
          id: 1,
          kind: 'spot',
          title: 'The Alchemist Bar',
          subtitle: 'Westlands · Music & Nightlife',
          image: IMG.rooftop,
          category: 'Clubs & Lounges',
          folderId: 'f-sun',
          savedAt: now,
        },
        {
          id: 'showcase-ev-paint-sip',
          kind: 'event',
          title: 'Paint & Sip Terrace',
          subtitle: 'Kilimani · Creative Social',
          image: IMG.art,
          category: 'Arts & Culture',
          folderId: 'f-coffee',
          savedAt: now,
        },
      ],
      updatedAt: now,
    };
  }

  if (lower.includes('tito') || lower.includes('brian') || lower.includes('dennis')) {
    return {
      userId,
      folders: [
        { id: 'f-food', name: 'Street Food & Brunch', emoji: 'food', createdAt: now },
        { id: 'f-late', name: 'Late Night Sets', emoji: 'music', createdAt: now },
      ],
      items: [
        {
          id: 4,
          kind: 'spot',
          title: 'Nairobi Street Kitchen',
          subtitle: 'Westlands · Food & Vibes',
          image: IMG.cafe,
          category: 'Restaurants',
          folderId: 'f-food',
          savedAt: now,
        },
        {
          id: 3,
          kind: 'spot',
          title: 'K1 Klub House',
          subtitle: 'Parklands · Brunch & Live Music',
          image: IMG.food,
          category: 'Restaurants',
          folderId: 'f-food',
          savedAt: now,
        },
        {
          id: 'showcase-ev-sunset-rooftop',
          kind: 'event',
          title: 'Sunset Rooftop Sessions',
          subtitle: 'Westlands · Nightlife',
          image: IMG.cocktail,
          category: 'Nightlife',
          folderId: 'f-late',
          savedAt: now,
        },
      ],
      updatedAt: now,
    };
  }

  if (lower.includes('amani') || lower.includes('showcase') || lower.includes('farida')) {
    return {
      userId,
      folders: [
        { id: 'f-sun', name: 'Sunset & Sundowners', emoji: 'sun', createdAt: now },
        { id: 'f-coffee', name: 'Quiet Coffee Dates', emoji: 'cafe', createdAt: now },
      ],
      items: [
        {
          id: 1,
          kind: 'spot',
          title: 'The Alchemist Bar',
          subtitle: 'Westlands · Music & Nightlife',
          image: IMG.rooftop,
          category: 'Clubs & Lounges',
          folderId: 'f-sun',
          savedAt: now,
        },
        {
          id: 2,
          kind: 'spot',
          title: 'Karura Forest Cafe',
          subtitle: 'Karura · Nature & Coffee',
          image: IMG.forest,
          category: 'Outdoors & Nature',
          folderId: 'f-coffee',
          savedAt: now,
        },
        {
          id: 'showcase-ev-jazz-in-the-park',
          kind: 'event',
          title: 'Jazz in the Park',
          subtitle: 'Karura Forest · Live Music',
          image: IMG.concert,
          category: 'Live Music',
          folderId: 'f-sun',
          savedAt: now,
        },
      ],
      updatedAt: now,
    };
  }

  return {
    userId,
    folders: [
      { id: 'f-nairobi', name: 'Nairobi Favourites', emoji: 'heart', createdAt: now },
      { id: 'f-weekend', name: 'Weekend Moves', emoji: 'party', createdAt: now },
    ],
    items: [
      {
        id: 3,
        kind: 'spot',
        title: 'K1 Klub House',
        subtitle: 'Parklands · Brunch & Live Music',
        image: IMG.food,
        category: 'Restaurants',
        folderId: 'f-nairobi',
        savedAt: now,
      },
      {
        id: 4,
        kind: 'spot',
        title: 'Nairobi Street Kitchen',
        subtitle: 'Westlands · Food & Vibes',
        image: IMG.cafe,
        category: 'Restaurants',
        folderId: 'f-weekend',
        savedAt: now,
      },
      {
        id: 'showcase-ev-jazz-in-the-park',
        kind: 'event',
        title: 'Jazz in the Park',
        subtitle: 'Karura Forest · Live Music',
        image: IMG.concert,
        category: 'Live Music',
        folderId: 'f-weekend',
        savedAt: now,
      },
    ],
    updatedAt: now,
  };
}

export async function fetchPublicCollections(userId: string): Promise<PublicUserCollections | null> {
  if (!userId) return null;

  const localMap = readLocalMap();
  if (localMap[userId]) {
    return localMap[userId];
  }

  if (isSupabaseConfigured && isUuid(userId)) {
    try {
      const remoteData = await fetchUserData(userId);
      const col = (remoteData as any)?.publicCollections as PublicUserCollections | undefined;
      if (col && Array.isArray(col.items)) {
        localMap[userId] = col;
        writeLocalMap(localMap);
        return col;
      }
    } catch {
      // fall through
    }
  }

  return fallbackCollectionForUser(userId);
}
