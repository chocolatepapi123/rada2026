import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  MapPin,
  Tag,
  DollarSign,
  Compass,
  FileText,
  Sparkles,
  Check,
  Plus,
  Trash2,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { SpotCategory, SpotItem } from '../types.ts';
import { submitCommunitySpot } from '../lib/cloudSync.ts';
import { LocationCombobox } from './LocationCombobox.tsx';

interface SuggestSpotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess?: (spot: SpotItem) => void;
  showToast: (msg: string) => void;
  currentUserId?: string;
  currentUserProfile?: {
    name?: string;
    handle?: string;
    avatar?: string;
  };
}

const CATEGORY_OPTIONS: { id: SpotCategory; label: string; icon: string }[] = [
  { id: 'restaurants_dining', label: 'Restaurants & Dining', icon: '🍽️' },
  { id: 'cafes_bakeries', label: 'Cafés & Bakeries', icon: '☕' },
  { id: 'clubs_lounges', label: 'Clubs & Lounges', icon: '🍸' },
  { id: 'date_spots', label: 'Date Spots', icon: '✨' },
  { id: 'nature', label: 'Nature & Outdoors', icon: '🌿' },
  { id: 'creative_leisure', label: 'Creative & Leisure', icon: '🎨' },
  { id: 'tech_gaming', label: 'Tech & Gaming', icon: '🎮' },
  { id: 'action_sports', label: 'Action & Sports', icon: '🎳' },
  { id: 'hotels_luxury', label: 'Hotels & Luxury', icon: '🏨' },
  { id: 'vacation_escapes', label: 'Vacation Escapes', icon: '🌴' },
];

const PRICE_TIERS = [
  { id: 'KES < 1,000', label: 'KES < 1,000', desc: 'Budget-friendly' },
  { id: 'KES 1,000 - 2,500', label: 'KES 1,000 - 2,500', desc: 'Moderate' },
  { id: 'KES 2,500 - 5,000', label: 'KES 2,500 - 5,000', desc: 'Upscale' },
  { id: 'KES 5,000+', label: 'KES 5,000+', desc: 'Luxury / Splurge' },
];

const POPULAR_TAGS = [
  'Outdoor Seating',
  'Fast Wi-Fi',
  'Great Cocktails',
  'Scenic View',
  'Live Music',
  'Cozy Vibe',
  'Pet Friendly',
  'Free Parking',
  'Work Friendly',
  'Romantic',
  'Vegan Options',
  'Kid Friendly'
];

export const SuggestSpotModal: React.FC<SuggestSpotModalProps> = ({
  isOpen,
  onClose,
  onSubmitSuccess,
  showToast,
  currentUserId,
  currentUserProfile
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<SpotCategory>('restaurants_dining');
  const [neighborhood, setNeighborhood] = useState('Westlands');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('KES 1,000 - 2,500');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Outdoor Seating', 'Cozy Vibe']);
  const [customTagInput, setCustomTagInput] = useState('');

  // Multi-photo upload state
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const newFiles = Array.from(e.target.files);

    // Filter valid images under 10MB
    const validFiles = newFiles.filter(file => {
      if (!file.type.startsWith('image/')) {
        showToast(`Skipped ${file.name}: Not an image.`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        showToast(`Skipped ${file.name}: File is larger than 10MB.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Create object URLs for previews
    const newUrls = validFiles.map(file => URL.createObjectURL(file));

    setImageFiles(prev => [...prev, ...validFiles]);
    setPreviewUrls(prev => [...prev, ...newUrls]);

    // Reset input value so same files can be chosen again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => {
      const urlToRevoke = prev[index];
      if (urlToRevoke && urlToRevoke.startsWith('blob:')) {
        URL.revokeObjectURL(urlToRevoke);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const trimmed = customTagInput.trim();
    if (!trimmed) return;
    if (!selectedTags.includes(trimmed)) {
      setSelectedTags(prev => [...prev, trimmed]);
    }
    setCustomTagInput('');
  };

  const resetForm = () => {
    setTitle('');
    setCategory('restaurants_dining');
    setNeighborhood('Westlands');
    setAddress('');
    setDescription('');
    setPrice('KES 1,000 - 2,500');
    setSelectedTags(['Outdoor Seating', 'Cozy Vibe']);
    setCustomTagInput('');
    previewUrls.forEach(url => {
      if (url.startsWith('blob:')) URL.revokeObjectURL(url);
    });
    setImageFiles([]);
    setPreviewUrls([]);
    setIsSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      showToast('Please enter the spot name.');
      return;
    }

    if (!neighborhood.trim()) {
      showToast('Please select or specify a location / neighborhood.');
      return;
    }

    if (!description.trim()) {
      showToast('Please add a short description of the spot.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { spot, error } = await submitCommunitySpot(
        {
          title: title.trim(),
          category,
          neighborhood: neighborhood.trim(),
          address: address.trim() || `${neighborhood.trim()}, Nairobi`,
          description: description.trim(),
          price,
          tags: selectedTags,
          submitted_by_user_id: currentUserId,
          submitted_by_name: currentUserProfile?.name || 'Community Member',
        },
        imageFiles
      );

      if (error) {
        showToast(`Submission failed: ${error}`);
        setIsSubmitting(false);
        return;
      }

      showToast('Spot submitted! It will appear on RADA once approved by an admin.');
      if (spot && onSubmitSuccess) {
        onSubmitSuccess(spot);
      }
      resetForm();
      onClose();
    } catch (err: any) {
      console.error('Error submitting spot:', err);
      showToast(err?.message || 'Something went wrong submitting spot.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col bg-white dark:bg-[#1C1A1E] text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 dark:bg-orange-500/20 text-[#E0533C] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                Suggest a Spot
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Share a venue, café, or hidden gem with the Nairobi community.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
          
          {/* 1. Spot Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Spot Name <span className="text-[#E0533C]">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Pallet Café, Alchemist, Karura Canopy Trail"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E0533C] transition"
            />
          </div>

          {/* 2. Category Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Category <span className="text-[#E0533C]">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORY_OPTIONS.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition text-left ${
                      isSelected
                        ? 'bg-orange-50 dark:bg-orange-950/40 border-[#E0533C] text-[#E0533C]'
                        : 'bg-slate-50 dark:bg-[#121113] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Location (Neighborhood & Address) */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Neighborhood / Area <span className="text-[#E0533C]">*</span>
              </label>
              <LocationCombobox
                value={neighborhood}
                onChange={(val) => setNeighborhood(val || 'Nairobi')}
                placeholder="Select or search neighborhood (e.g. Westlands, Kilimani)..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Street Address or Landmark (Optional)
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Mpaka Road, near Sarit Centre"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E0533C] transition"
                />
              </div>
            </div>
          </div>

          {/* 4. Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Description & Vibe <span className="text-[#E0533C]">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What makes this spot worth visiting? Describe the atmosphere, popular items, best time to go, or what to expect..."
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E0533C] transition resize-none"
            />
          </div>

          {/* 5. Price Range */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Price Range
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRICE_TIERS.map((tier) => {
                const isSelected = price === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setPrice(tier.id)}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      isSelected
                        ? 'bg-orange-50 dark:bg-orange-950/40 border-[#E0533C] text-[#E0533C]'
                        : 'bg-slate-50 dark:bg-[#121113] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xs font-black">{tier.label}</span>
                    <span className="text-[10px] opacity-75">{tier.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. Key Features / Tags */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Key Features & Tags
            </label>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_TAGS.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 border ${
                      active
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    {active && <Check className="w-3 h-3" />}
                    {tag}
                  </button>
                );
              })}
            </div>

            {/* Custom Tag Input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={handleAddCustomTag}
                placeholder="Add another tag (e.g. Rooftop, Sunset view)..."
                className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#E0533C]"
              />
              <button
                type="button"
                onClick={handleAddCustomTag}
                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition"
              >
                Add
              </button>
            </div>
          </div>

          {/* 7. Multi-Photo Upload Picker */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Photos from Device
              </label>
              <span className="text-[11px] text-slate-500 font-bold">
                {previewUrls.length} {previewUrls.length === 1 ? 'photo' : 'photos'} added
              </span>
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Upload Click Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-[#E0533C] dark:hover:border-[#E0533C] rounded-2xl p-4 text-center cursor-pointer transition bg-slate-50/50 dark:bg-[#121113]/50 flex flex-col items-center justify-center gap-2 group"
            >
              <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-[#E0533C] flex items-center justify-center group-hover:scale-105 transition">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Tap to choose photos from your device
              </p>
              <p className="text-[10px] text-slate-400">
                JPG, PNG, WebP up to 10MB each (Multi-select allowed)
              </p>
            </div>

            {/* Thumbnail Previews Grid */}
            {previewUrls.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2">
                {previewUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 group"
                  >
                    <img
                      src={url}
                      alt={`Upload preview ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/80 text-white hover:bg-red-600 transition shadow-xs"
                      title="Remove Photo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    {idx === 0 && (
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md bg-slate-950/70 text-[9px] font-bold text-white">
                        Cover
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submission Notice */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400">
            <Sparkles className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
            <p>
              Community submissions undergo a quick review by the RADA moderation team before appearing in the main directory.
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 bg-[#E0533C] hover:bg-orange-700 active:scale-[0.99] text-white rounded-2xl font-bold text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading photos & submitting...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Submit Spot for Review</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
