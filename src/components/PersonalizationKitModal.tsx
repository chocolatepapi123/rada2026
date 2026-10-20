import React, { useState } from 'react';
import {
  X,
  Palette,
  Sparkles,
  Link2,
  Plus,
  Trash2,
  ExternalLink,
  Image as ImageIcon,
  Check,
  Eye,
  Instagram,
  Music,
  Tv,
  Globe,
  Phone,
  MessageCircle,
  FileText,
  Calendar,
  Share2,
  MapPin,
  Star,
  Store,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { BusinessAccount, UserProfile, CustomLink, PinnedHighlight } from '../types.ts';
import { VerifiedBadge } from './VerifiedBadge.tsx';
import { MerchantVerificationBadge } from './MerchantVerificationBadge.tsx';

export interface AccentColorPreset {
  id: string;
  name: string;
  hex: string;
  bgLight: string;
  badgeBg: string;
}

export const ACCENT_COLOR_PRESETS: AccentColorPreset[] = [
  { id: 'terracotta', name: 'Terracotta Nairobi', hex: '#E0533C', bgLight: '#FEF2F0', badgeBg: 'rgba(224, 83, 60, 0.15)' },
  { id: 'amber', name: 'Safari Amber', hex: '#E9C46A', bgLight: '#FEF9EC', badgeBg: 'rgba(233, 196, 106, 0.2)' },
  { id: 'emerald', name: 'Karura Emerald', hex: '#2D6A4F', bgLight: '#ECFDF5', badgeBg: 'rgba(45, 106, 79, 0.15)' },
  { id: 'violet', name: 'Electric Violet', hex: '#8B5CF6', bgLight: '#F5F3FF', badgeBg: 'rgba(139, 92, 246, 0.15)' },
  { id: 'rose', name: 'Sunset Coral', hex: '#F43F5E', bgLight: '#FFF1F2', badgeBg: 'rgba(244, 63, 94, 0.15)' },
  { id: 'cyan', name: 'Nairobi Cyan', hex: '#06B6D4', bgLight: '#ECFEFF', badgeBg: 'rgba(6, 182, 212, 0.15)' },
  { id: 'gold', name: 'Golden Savannah', hex: '#D97706', bgLight: '#FFFBEB', badgeBg: 'rgba(217, 119, 6, 0.15)' },
  { id: 'magenta', name: 'Amapiano Magenta', hex: '#EC4899', bgLight: '#FDF2F8', badgeBg: 'rgba(236, 72, 153, 0.15)' },
  { id: 'midnight', name: 'Midnight Slate', hex: '#334155', bgLight: '#F1F5F9', badgeBg: 'rgba(51, 65, 85, 0.15)' },
];

export const HIGHLIGHT_IMAGE_PRESETS = [
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1511882150382-421056c89033?w=600&auto=format&fit=crop',
];

interface PersonalizationKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'business' | 'professional';
  business?: BusinessAccount | null;
  profile?: UserProfile | null;
  onSaveBusiness?: (updated: BusinessAccount) => void;
  onSaveProfile?: (updated: Partial<UserProfile>) => void;
  showToast: (msg: string) => void;
}

export const PersonalizationKitModal: React.FC<PersonalizationKitModalProps> = ({
  isOpen,
  onClose,
  mode,
  business,
  profile,
  onSaveBusiness,
  onSaveProfile,
  showToast,
}) => {
  if (!isOpen) return null;

  const isBiz = mode === 'business';

  // Local editable draft state
  const [accentColor, setAccentColor] = useState<string>(
    (isBiz ? business?.accentColor : profile?.accentColor) || '#E0533C'
  );
  const [tagline, setTagline] = useState<string>(
    (isBiz ? business?.tagline : profile?.tagline) || ''
  );
  const [typeLabel, setTypeLabel] = useState<string>(
    isBiz
      ? (business?.businessTypeLabel || (business?.category === 'hospitality' ? 'Hospitality & Dining' : 'Event Organizer'))
      : (profile?.professionalTitle || profile?.professionalCategory || 'Curator & Host')
  );
  const [customLinks, setCustomLinks] = useState<CustomLink[]>(
    (isBiz ? business?.customLinks : profile?.customLinks) || []
  );
  const [pinnedHighlights, setPinnedHighlights] = useState<PinnedHighlight[]>(
    (isBiz ? business?.pinnedHighlights : profile?.pinnedHighlights) || []
  );
  const [coverImage, setCoverImage] = useState<string>(
    (isBiz ? business?.coverImage : '') || ''
  );

  // Active sub-tab inside kit
  const [activeKitTab, setActiveKitTab] = useState<'theme' | 'links' | 'highlights' | 'preview'>('theme');

  // New Link form state
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkPlatform, setNewLinkPlatform] = useState<string>('website');

  // New Highlight form state
  const [newHighlightTitle, setNewHighlightTitle] = useState('');
  const [newHighlightImg, setNewHighlightImg] = useState('');
  const [newHighlightDesc, setNewHighlightDesc] = useState('');
  const [newHighlightLink, setNewHighlightLink] = useState('');
  const [isAddingHighlight, setIsAddingHighlight] = useState(false);

  // Handlers for Links
  const handleAddLink = () => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) {
      showToast('Please provide both link title and URL');
      return;
    }
    let url = newLinkUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:') && !url.startsWith('tel:')) {
      url = 'https://' + url;
    }
    const newLink: CustomLink = {
      id: `lnk-${Date.now()}`,
      title: newLinkTitle.trim(),
      url,
      platform: newLinkPlatform
    };
    setCustomLinks(prev => [...prev, newLink]);
    setNewLinkTitle('');
    setNewLinkUrl('');
    setNewLinkPlatform('website');
    showToast(`Added link "${newLink.title}"!`);
  };

  const handleRemoveLink = (id: string) => {
    setCustomLinks(prev => prev.filter(l => l.id !== id));
  };

  // Handlers for Highlights
  const handleAddHighlight = () => {
    if (!newHighlightTitle.trim()) {
      showToast('Please enter a highlight title');
      return;
    }
    const img = newHighlightImg.trim() || HIGHLIGHT_IMAGE_PRESETS[pinnedHighlights.length % HIGHLIGHT_IMAGE_PRESETS.length];
    const newH: PinnedHighlight = {
      id: `hl-${Date.now()}`,
      title: newHighlightTitle.trim(),
      imageUrl: img,
      description: newHighlightDesc.trim() || undefined,
      linkUrl: newHighlightLink.trim() || undefined
    };
    setPinnedHighlights(prev => [...prev, newH]);
    setNewHighlightTitle('');
    setNewHighlightImg('');
    setNewHighlightDesc('');
    setNewHighlightLink('');
    setIsAddingHighlight(false);
    showToast(`Added highlight "${newH.title}"!`);
  };

  const handleRemoveHighlight = (id: string) => {
    setPinnedHighlights(prev => prev.filter(h => h.id !== id));
  };

  // Save changes
  const handleSave = () => {
    if (isBiz && business && onSaveBusiness) {
      const updated: BusinessAccount = {
        ...business,
        accentColor,
        tagline: tagline.trim() || undefined,
        businessTypeLabel: typeLabel.trim() || undefined,
        customLinks,
        pinnedHighlights,
        coverImage: coverImage.trim() || business.coverImage
      };
      onSaveBusiness(updated);
      showToast('Personalization kit saved to your business profile! 🎉');
      onClose();
    } else if (!isBiz && onSaveProfile) {
      onSaveProfile({
        accentColor,
        tagline: tagline.trim() || undefined,
        professionalTitle: typeLabel.trim() || undefined,
        customLinks,
        pinnedHighlights
      });
      showToast('Personalization kit saved to your professional profile! ✨');
      onClose();
    }
  };

  const getPlatformIcon = (platform?: string) => {
    switch (platform) {
      case 'instagram': return <Instagram className="w-4 h-4 text-pink-500" />;
      case 'spotify': return <Music className="w-4 h-4 text-emerald-500" />;
      case 'youtube': return <Tv className="w-4 h-4 text-red-500" />;
      case 'tiktok': return <Music className="w-4 h-4 text-slate-800 dark:text-slate-200" />;
      case 'whatsapp': return <MessageCircle className="w-4 h-4 text-emerald-600" />;
      case 'menu': return <FileText className="w-4 h-4 text-amber-500" />;
      case 'booking': return <Calendar className="w-4 h-4 text-blue-500" />;
      default: return <Globe className="w-4 h-4 text-[#E0533C]" />;
    }
  };

  const entityName = isBiz ? business?.name || 'Your Business' : profile?.handle || 'Your Profile';

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-[#121113] text-slate-900 dark:text-slate-100 rounded-3xl max-w-xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-black/30">
          <div className="flex items-center gap-2.5 min-w-0">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0"
              style={{ backgroundColor: accentColor }}
            >
              <Palette className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black truncate text-slate-900 dark:text-slate-100">
                  Full Personalization Kit
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 shrink-0">
                  {isBiz ? 'Merchant Hub' : 'Creator Mode'}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">
                Customize how users experience {entityName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-2 bg-slate-100/80 dark:bg-black/40 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveKitTab('theme')}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeKitTab === 'theme'
                ? 'bg-white dark:bg-[#1C1A1E] text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Palette className="w-3.5 h-3.5" style={{ color: accentColor }} />
            <span>Accent & Branding</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveKitTab('links')}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeKitTab === 'links'
                ? 'bg-white dark:bg-[#1C1A1E] text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Link2 className="w-3.5 h-3.5 text-blue-500" />
            <span>Unlimited Links ({customLinks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveKitTab('highlights')}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeKitTab === 'highlights'
                ? 'bg-white dark:bg-[#1C1A1E] text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Highlights ({pinnedHighlights.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveKitTab('preview')}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeKitTab === 'preview'
                ? 'bg-white dark:bg-[#1C1A1E] text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-emerald-500" />
            <span>Live Preview</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* =========================================================
              TAB 1: ACCENT COLOR & BRANDING
              ========================================================= */}
          {activeKitTab === 'theme' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Accent Color Selection */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5" style={{ color: accentColor }} />
                    <span>Custom Profile Accent Color</span>
                  </label>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                    {accentColor}
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select a bespoke color theme that will tint your full-screen profile hero, interactive link cards, action buttons, and pinned highlight rings.
                </p>

                {/* Color Swatch Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-1">
                  {ACCENT_COLOR_PRESETS.map((preset) => {
                    const isSelected = accentColor.toLowerCase() === preset.hex.toLowerCase();
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setAccentColor(preset.hex)}
                        className={`p-2.5 rounded-2xl border transition flex flex-col items-center gap-1.5 cursor-pointer text-center ${
                          isSelected
                            ? 'border-slate-900 dark:border-white ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#121113]'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <span 
                          className="w-7 h-7 rounded-full shadow-md flex items-center justify-center text-white"
                          style={{ backgroundColor: preset.hex }}
                        >
                          {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                        </span>
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 leading-tight">
                          {preset.name.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom HEX Code Picker */}
                <div className="p-3 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-3">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent p-0"
                    title="Pick custom color"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-bold block text-slate-700 dark:text-slate-300">
                      Or pick any custom brand hex code:
                    </span>
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      placeholder="#E0533C"
                      className="mt-1 px-3 py-1.5 bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold w-32 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Tagline / Motto */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider block">
                  Tagline / Brand Motto
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  maxLength={100}
                  placeholder={isBiz ? 'e.g. Westlands premier cocktail lounge & vinyl terrace' : 'e.g. Curating underground Nairobi raves & hidden gems'}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2"
                  style={{ outlineColor: accentColor }}
                />
                <p className="text-[10px] text-slate-400">
                  A punchy one-line introduction displayed right beneath your name on the full-screen card.
                </p>
              </div>

              {/* Business / Creator Specific Specialization Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider block">
                  {isBiz ? 'Specialized Venue / Business Type' : 'Professional Title / Creator Niche'}
                </label>
                <input
                  type="text"
                  value={typeLabel}
                  onChange={(e) => setTypeLabel(e.target.value)}
                  maxLength={50}
                  placeholder={isBiz ? 'e.g. Rooftop Cocktail Lounge & Tapas' : 'e.g. Afro-House DJ & Event Producer'}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2"
                  style={{ outlineColor: accentColor }}
                />
              </div>

              {/* Cover Image URL (for business) */}
              {isBiz && (
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider block">
                    Cover Banner Photo URL
                  </label>
                  <input
                    type="url"
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
                  />
                  {coverImage && (
                    <div className="h-24 w-full rounded-2xl overflow-hidden mt-1 border border-slate-200 dark:border-slate-800">
                      <img src={coverImage} alt="Cover preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              TAB 2: UNLIMITED CUSTOM LINKS
              ========================================================= */}
          {activeKitTab === 'links' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-blue-500" />
                    <span>Unlimited Custom Links ({customLinks.length})</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Add unlimited external links (WhatsApp, Instagram, Menu, Ticket Portal, Spotify, etc.)
                  </p>
                </div>
              </div>

              {/* Add New Link Card */}
              <div className="p-4 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 block">
                  + Add a New Link
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Button Label
                    </label>
                    <input
                      type="text"
                      value={newLinkTitle}
                      onChange={(e) => setNewLinkTitle(e.target.value)}
                      placeholder="e.g. Reserve VIP Table / View Menu"
                      className="w-full px-3 py-2 bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Platform Icon
                    </label>
                    <select
                      value={newLinkPlatform}
                      onChange={(e) => setNewLinkPlatform(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:outline-none cursor-pointer"
                    >
                      <option value="website">Website / Direct Link</option>
                      <option value="whatsapp">WhatsApp Order / Chat</option>
                      <option value="instagram">Instagram Profile</option>
                      <option value="tiktok">TikTok Channel</option>
                      <option value="spotify">Spotify Playlist / Track</option>
                      <option value="youtube">YouTube Video / Channel</option>
                      <option value="menu">Food / Drinks Menu PDF</option>
                      <option value="booking">Reservations / Tickets</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Destination URL
                  </label>
                  <input
                    type="text"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddLink}
                  className="w-full py-2.5 text-white font-black rounded-xl text-xs shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                  style={{ backgroundColor: accentColor }}
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Add Custom Link</span>
                </button>
              </div>

              {/* Current Links List */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Configured Profile Links
                </span>

                {customLinks.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                    No custom links added yet. Add your WhatsApp, Instagram, or booking links above!
                  </div>
                ) : (
                  customLinks.map((link, idx) => (
                    <div
                      key={link.id || idx}
                      className="p-3 bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                          {getPlatformIcon(link.platform)}
                        </div>
                        <div className="min-w-0">
                          <h5 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate">
                            {link.title}
                          </h5>
                          <p className="text-[10px] text-slate-400 truncate">
                            {link.url}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          title="Test Link"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRemoveLink(link.id)}
                          className="p-1.5 text-red-400 hover:text-red-600 cursor-pointer"
                          title="Remove link"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* =========================================================
              TAB 3: PINNED HIGHLIGHTS
              ========================================================= */}
          {activeKitTab === 'highlights' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Pinned Highlights & Visual Showcase</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Feature curated story cards, lookbook photo sets, or signature offerings
                  </p>
                </div>

                {!isAddingHighlight && (
                  <button
                    type="button"
                    onClick={() => setIsAddingHighlight(true)}
                    className="px-3 py-1.5 text-white text-xs font-black rounded-xl transition flex items-center gap-1 cursor-pointer"
                    style={{ backgroundColor: accentColor }}
                  >
                    <Plus className="w-3 h-3 stroke-[3]" />
                    <span>Add Highlight</span>
                  </button>
                )}
              </div>

              {/* Add Highlight Form */}
              {isAddingHighlight && (
                <div className="p-4 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                      New Highlight Story
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingHighlight(false)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Highlight Title *
                    </label>
                    <input
                      type="text"
                      value={newHighlightTitle}
                      onChange={(e) => setNewHighlightTitle(e.target.value)}
                      placeholder="e.g. Amapiano Sundays / Chef's Secret Recipe"
                      className="w-full px-3 py-2 bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Photo Image URL (or pick preset below)
                    </label>
                    <input
                      type="url"
                      value={newHighlightImg}
                      onChange={(e) => setNewHighlightImg(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                    />
                  </div>

                  {/* Preset Photo Swatches */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 block font-semibold">Quick Photo Presets:</span>
                    <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1">
                      {HIGHLIGHT_IMAGE_PRESETS.map((imgUrl, i) => (
                        <div
                          key={i}
                          onClick={() => setNewHighlightImg(imgUrl)}
                          className={`w-14 h-14 rounded-xl bg-cover bg-center shrink-0 cursor-pointer border-2 transition ${
                            newHighlightImg === imgUrl ? 'border-slate-900 dark:border-white scale-105' : 'border-transparent opacity-75'
                          }`}
                          style={{ backgroundImage: `url('${imgUrl}')` }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Description / Vibe Note
                    </label>
                    <textarea
                      value={newHighlightDesc}
                      onChange={(e) => setNewHighlightDesc(e.target.value)}
                      rows={2}
                      placeholder="Share quick details or insider tips about this highlight..."
                      className="w-full px-3 py-2 bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Action Link (Optional)
                    </label>
                    <input
                      type="url"
                      value={newHighlightLink}
                      onChange={(e) => setNewHighlightLink(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddHighlight}
                    className="w-full py-2.5 text-white font-black rounded-xl text-xs shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                    style={{ backgroundColor: accentColor }}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Save Pinned Highlight</span>
                  </button>
                </div>
              )}

              {/* Highlights Gallery */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {pinnedHighlights.length === 0 ? (
                  <div className="col-span-full p-8 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                    No pinned highlights yet. Tap &ldquo;+ Add Highlight&rdquo; to showcase your best moments!
                  </div>
                ) : (
                  pinnedHighlights.map((hl) => (
                    <div
                      key={hl.id}
                      className="group relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1C1A1E] shadow-sm flex flex-col"
                    >
                      <div className="h-28 w-full relative">
                        <img
                          src={hl.imageUrl || HIGHLIGHT_IMAGE_PRESETS[0]}
                          alt={hl.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        <button
                          type="button"
                          onClick={() => handleRemoveHighlight(hl.id)}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 hover:bg-red-600 text-white flex items-center justify-center transition cursor-pointer"
                          title="Delete highlight"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <span 
                          className="absolute bottom-2 left-2 right-2 text-xs font-black text-white truncate drop-shadow-md"
                        >
                          {hl.title}
                        </span>
                      </div>
                      {hl.description && (
                        <div className="p-2.5 text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">
                          {hl.description}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* =========================================================
              TAB 4: LIVE CARD PREVIEW
              ========================================================= */}
          {activeKitTab === 'preview' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Here is a live simulation of your full-screen card styled with your custom accent color!</span>
              </div>

              {/* Card Mini Simulation */}
              <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-[#1C1A1E]">
                {/* Banner */}
                <div 
                  className="h-32 w-full relative bg-cover bg-center"
                  style={{ backgroundImage: `url('${coverImage || (isBiz ? business?.coverImage || business?.logo : profile?.avatar)}')` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full text-[10px] font-black text-white shadow-xs" style={{ backgroundColor: accentColor }}>
                    {typeLabel || 'Verified'}
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {/* Identity */}
                  <div className="relative -mt-10 flex items-end gap-3">
                    <img
                      src={isBiz ? business?.logo : profile?.avatar}
                      alt={entityName}
                      className="w-16 h-16 rounded-2xl object-cover border-3 border-white dark:border-[#1C1A1E] shadow-lg shrink-0"
                      style={{ outline: `2px solid ${accentColor}` }}
                    />
                    <div className="min-w-0 pb-1">
                      <h4 className="font-black text-base truncate">{entityName}</h4>
                      {tagline && (
                        <p className="text-xs text-slate-500 font-medium truncate">{tagline}</p>
                      )}
                    </div>
                  </div>

                  {/* Links Row */}
                  {customLinks.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Links
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {customLinks.map((l) => (
                          <div
                            key={l.id}
                            className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5"
                            style={{ borderColor: accentColor, color: accentColor }}
                          >
                            {getPlatformIcon(l.platform)}
                            <span>{l.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Highlights Row */}
                  {pinnedHighlights.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Pinned Highlights
                      </span>
                      <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                        {pinnedHighlights.map((h) => (
                          <div key={h.id} className="w-20 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800">
                            <img src={h.imageUrl} alt={h.title} className="w-full h-14 object-cover" />
                            <p className="p-1 text-[9px] font-extrabold truncate text-center">{h.title}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Save Bar */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-black/20 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 text-white font-black rounded-xl text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            style={{ backgroundColor: accentColor }}
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Save & Apply Personalization</span>
          </button>
        </div>
      </div>
    </div>
  );
};
