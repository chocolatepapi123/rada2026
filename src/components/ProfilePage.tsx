import { siteOrigin } from '../lib/siteUrl';
import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  Bookmark,
  Share2,
  Loader2,
  X,
  AlertCircle,
  Folder,
} from 'lucide-react';
import { UserProfile, OutingPlan, BusinessAccount, SavedItem, CollectionFolder, SpotItem, EventItem, BusinessOffer } from '../types';
import { NotificationBell } from './NotificationBell';
import {
  AvatarHero,
  IdentityFields,
  Section,
  useOwnProfile,
} from './ProfileSettingsKit';
import {
  DEFAULT_THEME,
  MAX_TAGS,
  MAX_TAG_LEN,
  cleanTag,
  themeColor,
  fetchProfileLook,
  saveMyProfileLook,
} from '../lib/profileLook';
import type { ToastOptions } from './Toast.tsx';
import { HangoutsTab, type HangoutSpotOption } from './HangoutsTab';
import { CategoryIcon } from './CategoryIcon';
import { buildPublicCollectionSnapshot } from '../lib/publicCollections';

interface ProfilePageProps {
  onClose: () => void;
  session: any;
  currentUserProfile?: UserProfile;
  showToast: (msg: string, options?: ToastOptions) => void;
  onOpenAuth?: () => void;
  /** Called on every save/switch/upload so the parent App state updates immediately. */
  onProfileChange?: (patch: Partial<UserProfile>) => void;
  professionalStats?: { profileViews?: number; outingsHosted?: number; joinRequests?: number };
  outings?: OutingPlan[];
  myBusinesses?: BusinessAccount[];
  savedCount?: number;
  ticketCount?: number;
  onOpenSaved?: () => void;
  isDarkMode: boolean;
  /** Spots people can link a diary entry to. */
  spots?: HangoutSpotOption[];
  /** Hydrated collections support for Collections tab (visible on public profile). */
  savedItems?: SavedItem[];
  savedFolders?: CollectionFolder[];
  allSpots?: SpotItem[];
  events?: EventItem[];
  offers?: BusinessOffer[];
  onOpenSpot?: (spot: SpotItem) => void;
  onOpenEvent?: (event: EventItem) => void;
  initialTab?: Tab;
}

export type ProfileTab = 'diary' | 'collections' | 'settings';
type Tab = ProfileTab;

export const ProfilePage: React.FC<ProfilePageProps> = ({
  onClose,
  session,
  currentUserProfile,
  showToast,
  onOpenAuth,
  onProfileChange,
  professionalStats,
  outings = [],
  savedCount = 0,
  ticketCount = 0,
  onOpenSaved,
  spots = [],
  savedItems = [],
  savedFolders = [],
  allSpots = [],
  events = [],
  offers = [],
  onOpenSpot,
  onOpenEvent,
  initialTab = 'diary',
}) => {
  const user = session?.user;
  const isLoggedIn = !!user;
  const [tab, setTab] = useState<Tab>(initialTab);
  const [selectedCollectionFolder, setSelectedCollectionFolder] = useState<string>('all');
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const requireLogin = () => {
    showToast('Please sign in first.', { type: 'error' });
    onOpenAuth?.();
  };

  const own = useOwnProfile({
    profile: currentUserProfile || {},
    userId: user?.id,
    active: isLoggedIn,
    onProfileChange,
    showToast,
    onRequireLogin: requireLogin,
    statsFallback: professionalStats,
  });
  const handle = own.handle;

  // Keep the inputs in step with the stored profile (same as the old account window did)
  useEffect(() => {
    own.resetDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, currentUserProfile?.name, currentUserProfile?.username, currentUserProfile?.bio]);

  const hostedOutings = outings.filter((o) => user?.id && o.hostId === user.id);

  // ---- Profile look: tags. Public (saved in the database) so other people see it too. ----
  const themeId = DEFAULT_THEME; // profile colour is locked
  const [tags, setTags] = useState<string[]>([]);
  const [savedTags, setSavedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [lookSaving, setLookSaving] = useState(false);
  const accent = themeColor(themeId);
  const tagsDirty = JSON.stringify(tags) !== JSON.stringify(savedTags);

  useEffect(() => {
    let off = false;
    if (!user?.id) return;
    fetchProfileLook(user.id).then((look) => {
      if (off || !look) return;
      setTags(look.tags);
      setSavedTags(look.tags);
    });
    return () => { off = true; };
  }, [user?.id]);

  const shareLook = async (theme: string, nextTags: string[]) => {
    const err = await saveMyProfileLook({ theme, tags: nextTags });
    if (err) showToast('Saved on this phone only. Run profile_look.sql in Supabase so others can see it.', { type: 'error' });
    return !err;
  };
  const addTag = () => {
    const t = cleanTag(tagInput);
    if (!t) return;
    if (tags.some((x) => x.toLowerCase() === t.toLowerCase())) { setTagInput(''); return; }
    if (tags.length >= MAX_TAGS) { showToast(`You can add up to ${MAX_TAGS} tags.`, { type: 'error' }); return; }
    setTags([...tags, t]);
    setTagInput('');
  };
  const saveAll = async () => {
    setLookSaving(true);
    try {
      if (own.dirty) await own.save();
      if (tagsDirty) {
        if (await shareLook(themeId, tags)) { setSavedTags(tags); showToast('Tags saved.'); }
      }
    } finally {
      setLookSaving(false);
    }
  };

  const p: any = currentUserProfile || {};
  const name = p.name || handle || 'Your profile';
  const initial = String(name).replace(/^@/, '').charAt(0).toUpperCase() || 'R';

  const share = async () => {
    const url = siteOrigin();
    try {
      if ((navigator as any).share) await (navigator as any).share({ title: 'RADA', text: `${handle || name} on RADA`, url });
      else { await navigator.clipboard.writeText(url); showToast('Link copied.'); }
    } catch {}
  };

  const goSettings = () => {
    setTab('settings');
    requestAnimationFrame(() => tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const tabs: [Tab, string][] = [
    ['diary', 'Diary'],
    ['collections', 'Collections'],
    ['settings', 'Settings'],
  ];

  const myCollectionSnapshot = user?.id
    ? buildPublicCollectionSnapshot({
        userId: user.id,
        savedItems,
        savedFolders,
        spots: allSpots,
        events,
        offers,
      })
    : null;

  return (
    <div
      className="fixed inset-0 z-50 bg-white dark:bg-[#121113] text-slate-900 dark:text-slate-100 flex flex-col animate-in fade-in duration-200"
      style={{ ['--rp-accent' as any]: accent }}
    >
      {/* Theme wash over the whole page */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `linear-gradient(180deg, ${accent}38 0px, ${accent}16 280px, ${accent}0A 100%)` }}
      />
      {/* Top bar */}
      <div className="relative shrink-0 px-2 py-2 flex items-center gap-1">
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
          aria-label="Back"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="flex-1 text-center text-[17px] font-black tracking-tight">Profile</h2>
        {isLoggedIn && <NotificationBell userId={user.id} />}
        {onOpenSaved && (
          <button
            type="button"
            onClick={onOpenSaved}
            className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
            aria-label="Saved items"
          >
            <Bookmark className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="relative flex-1 overflow-y-auto pb-6">
        {!isLoggedIn ? (
          <div className="mx-4 mt-6 p-4 rounded-2xl bg-amber-500/10 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-black text-amber-800 dark:text-amber-300">You&apos;re browsing as a guest</p>
              <p className="text-xs mt-0.5 text-amber-700 dark:text-amber-300/80">Log in to build your profile, save collections, and keep your RADA diary.</p>
              {onOpenAuth && (
                <button
                  type="button"
                  onClick={() => { onClose(); onOpenAuth(); }}
                  className="mt-3 px-4 py-2 text-white font-black text-xs rounded-xl cursor-pointer"
                  style={{ background: accent }}
                >
                  Log In / Create Account
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Identity */}
            <div className="px-4 pt-3 flex items-center gap-4">
              <div
                className="w-[88px] h-[88px] rounded-full overflow-hidden shrink-0 flex items-center justify-center text-white text-3xl font-black"
                style={{ background: accent, boxShadow: `0 0 0 3px ${accent}33` }}
              >
                {p.avatar ? (
                  <img src={p.avatar} alt="" className="w-full h-full object-cover" decoding="async" />
                ) : (
                  initial
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[22px] leading-tight font-black truncate">{name}</h3>
                {handle && <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{handle}</p>}
              </div>
            </div>

            <p className="px-4 mt-3 text-[15px] leading-snug text-slate-800 dark:text-slate-200">
              {p.bio || <span className="text-slate-400">No bio yet. Tap Edit Profile to add one.</span>}
            </p>

            {/* Tags */}
            {savedTags.length > 0 && (
              <div className="px-4 mt-3 flex flex-wrap gap-2">
                {savedTags.map((t) => (
                  <span key={t} className="text-[12px] font-semibold px-3 py-1.5 rounded-full" style={{ background: `${accent}1F`, color: accent }}>
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* Stats + actions */}
            <div className="px-4 mt-4 flex items-center gap-5">
              <button
                type="button"
                onClick={() => {
                  if (onOpenSaved) onOpenSaved();
                  else setTab('collections');
                }}
                className="text-center cursor-pointer hover:opacity-80 transition"
                title="Open Saved Items"
              >
                <p className="text-[22px] leading-none font-black">{savedCount}</p>
                <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1">Saved</p>
              </button>
              {[
                [hostedOutings.length, 'Hosted'],
                [ticketCount, 'Tickets'],
              ].map(([n, label]) => (
                <div key={String(label)} className="text-center">
                  <p className="text-[22px] leading-none font-black">{n}</p>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1">{label}</p>
                </div>
              ))}
              <div className="flex-1" />
              <button type="button" onClick={goSettings} className="text-[14px] font-black cursor-pointer" style={{ color: accent }}>
                Edit Profile
              </button>
              <button
                type="button"
                onClick={share}
                className="w-11 h-11 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center cursor-pointer"
                aria-label="Share"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div ref={tabsRef} className="mt-4 flex overflow-x-auto hide-scrollbar border-y border-slate-200 dark:border-slate-800 sticky top-0 bg-white/80 dark:bg-[#121113]/80 backdrop-blur-md z-10">
              {tabs.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`flex-1 min-w-[76px] py-3.5 px-2 text-[12.5px] font-bold relative cursor-pointer whitespace-nowrap ${tab === id ? '' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  {label}
                  {tab === id && <span className="absolute left-3 right-3 bottom-0 h-[3px] rounded-full" style={{ background: accent }} />}
                </button>
              ))}
            </div>

            {/* ===== Diary ===== */}
            {tab === 'diary' && user?.id && (
              <HangoutsTab userId={user.id} accent={accent} showToast={showToast} spots={spots} />
            )}

            {/* ===== Saved Collections (Public on Profile) ===== */}
            {tab === 'collections' && (
              <div className="px-4 pt-4 pb-8 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Bookmark className="w-3.5 h-3.5" style={{ color: accent }} />
                      <span>My Saved Collections</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Other RADA users can see your saved places &amp; collections when they view your profile.
                    </p>
                  </div>
                  {onOpenSaved && (
                    <button
                      type="button"
                      onClick={onOpenSaved}
                      className="px-3 py-1.5 rounded-xl text-[11px] font-black text-white shrink-0 cursor-pointer flex items-center gap-1.5"
                      style={{ background: accent }}
                    >
                      <Bookmark className="w-3 h-3" />
                      <span>Saved Items</span>
                    </button>
                  )}
                </div>

                {savedFolders.length > 0 && (
                  <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
                    <button
                      type="button"
                      onClick={() => setSelectedCollectionFolder('all')}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 cursor-pointer border ${
                        selectedCollectionFolder === 'all'
                          ? 'text-white border-transparent'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent'
                      }`}
                      style={selectedCollectionFolder === 'all' ? { background: accent } : undefined}
                    >
                      All ({myCollectionSnapshot?.items.length || 0})
                    </button>
                    {savedFolders.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setSelectedCollectionFolder(f.id)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 cursor-pointer flex items-center gap-1.5 ${
                          selectedCollectionFolder === f.id
                            ? 'text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                        style={selectedCollectionFolder === f.id ? { background: accent } : undefined}
                      >
                        <CategoryIcon name={f.emoji} className="w-3 h-3" />
                        <span>{f.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {(() => {
                  const list = (myCollectionSnapshot?.items || []).filter(
                    (it) => selectedCollectionFolder === 'all' || it.folderId === selectedCollectionFolder
                  );
                  if (list.length === 0) {
                    return (
                      <div className="py-10 text-center space-y-2 bg-slate-50 dark:bg-[#1C1A1E] rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                        <Folder className="w-7 h-7 text-slate-400 mx-auto" />
                        <p className="text-xs font-bold text-slate-500">
                          Bookmark spots, events or deals to build a collection on your profile.
                        </p>
                      </div>
                    );
                  }
                  return (
                    <div className="grid grid-cols-2 gap-2.5">
                      {list.map((it) => {
                        const folder = savedFolders.find((f) => f.id === it.folderId);
                        return (
                          <button
                            key={`${it.kind}-${it.id}`}
                            type="button"
                            onClick={() => {
                              if (it.kind === 'spot') {
                                const spot = allSpots.find((s) => String(s.id) === String(it.id));
                                if (spot && onOpenSpot) { onClose(); onOpenSpot(spot); }
                              } else if (it.kind === 'event') {
                                const ev = events.find((e) => String(e.id) === String(it.id));
                                if (ev && onOpenEvent) { onClose(); onOpenEvent(ev); }
                              } else {
                                onOpenSaved?.();
                              }
                            }}
                            className="text-left rounded-2xl p-2 bg-slate-50 dark:bg-[#1C1A1E] border border-slate-200/80 dark:border-slate-800 hover:border-[#E0533C] transition cursor-pointer flex flex-col gap-1.5"
                          >
                            <div
                              className="h-24 rounded-xl bg-slate-200 dark:bg-slate-800 bg-cover bg-center relative overflow-hidden"
                              style={it.image ? { backgroundImage: `url('${it.image}')` } : undefined}
                            >
                              <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-black/65 text-white text-[9px] font-black uppercase">
                                {it.kind}
                              </span>
                            </div>
                            <p className="text-xs font-black text-slate-900 dark:text-slate-100 line-clamp-1">{it.title}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{it.subtitle}</p>
                            {folder && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full w-fit bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                <CategoryIcon name={folder.emoji} className="w-2.5 h-2.5" />
                                <span>{folder.name}</span>
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}


            {/* ===== Settings (this profile + RADA) ===== */}
            {tab === 'settings' && (
              <div className="pt-2">
                <AvatarHero p={own} subtitle={<p className="mt-1 text-[11px] text-slate-400">Only your @username is shown to others</p>} />

                <Section title="Identity & bio" description="Your public @username, private display name and bio. Updated everywhere when you save.">
                  <IdentityFields p={own} />
                </Section>


                <Section title="Tags" description={`Short labels shown on your profile, like Founder or Foodie. Up to ${MAX_TAGS}.`}>
                  <div className="p-4 space-y-3">
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {tags.map((t) => (
                          <span key={t} className="inline-flex items-center gap-1 text-[12px] font-semibold pl-3 pr-1.5 py-1.5 rounded-full" style={{ background: `${accent}1F`, color: accent }}>
                            {t}
                            <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} aria-label={`Remove ${t}`} className="w-5 h-5 rounded-full flex items-center justify-center cursor-pointer">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value.slice(0, MAX_TAG_LEN))}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }}
                        placeholder="Add a tag"
                        className="flex-1 px-3 py-2.5 text-[13px] rounded-xl bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-2 text-slate-900 dark:text-slate-100"
                        style={{ ['--tw-ring-color' as any]: `${accent}66` }}
                      />
                      <button type="button" onClick={addTag} disabled={!tagInput.trim()} className="px-4 rounded-xl text-white text-[13px] font-black disabled:opacity-40 cursor-pointer" style={{ background: accent }}>
                        Add
                      </button>
                    </div>
                  </div>
                </Section>

                <p className="mx-4 mt-5 text-[11px] text-slate-400">
                  Email, password, switching accounts and log out are in the ••• menu on the home screen.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Save bar (settings tab only) */}
      {isLoggedIn && tab === 'settings' && (
        <div className="shrink-0 px-3 py-3 bg-white dark:bg-[#1C1A1E] shadow-[0_-1px_6px_rgba(0,0,0,0.06)]">
          <button
            type="button"
            onClick={saveAll}
            disabled={(!own.dirty && !tagsDirty) || own.saving || lookSaving}
            className="w-full py-3 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl text-[13px] transition flex items-center justify-center gap-2 cursor-pointer"
            style={{ background: accent }}
          >
            {own.saving || lookSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Save changes</span>}
          </button>
        </div>
      )}
    </div>
  );
};
