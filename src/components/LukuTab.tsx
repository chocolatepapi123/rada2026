import React, { useState } from 'react';
import { 
  Search, 
  CheckCircle2, 
  MessageCircle, 
  Store, 
  Mic, 
  Plus, 
  X, 
  ExternalLink,
  Sparkles,
  ShoppingBag,
  Disc3,
  MapPin,
  Phone,
  ChevronLeft,
  ChevronRight,
  Share2
} from 'lucide-react';
import { ThriftItem, BusinessAccount } from '../types.ts';
import { MerchantVerificationBadge } from './MerchantVerificationBadge.tsx';
import { shareContent } from '../utils/shareUtils.ts';

interface LukuTabProps {
  thriftItems: ThriftItem[];
  businesses: BusinessAccount[];
  onOpenStore?: (sellerName: string) => void;
  onOpenCreateFit?: (initialTitle?: string) => void;
  showToast: (msg: string) => void;
}

export const LukuTab: React.FC<LukuTabProps> = ({
  thriftItems,
  businesses,
  onOpenStore,
  onOpenCreateFit,
  showToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCondition, setSelectedCondition] = useState('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState('all');
  const [isListening, setIsListening] = useState(false);
  const [activeStoreModal, setActiveStoreModal] = useState<BusinessAccount | null>(null);
  const [activeImageIndices, setActiveImageIndices] = useState<Record<number, number>>({});

  const handlePrevImage = (e: React.MouseEvent, itemId: number, maxImages: number) => {
    e.stopPropagation();
    setActiveImageIndices(prev => {
      const current = prev[itemId] || 0;
      return { ...prev, [itemId]: (current - 1 + maxImages) % maxImages };
    });
  };

  const handleNextImage = (e: React.MouseEvent, itemId: number, maxImages: number) => {
    e.stopPropagation();
    setActiveImageIndices(prev => {
      const current = prev[itemId] || 0;
      return { ...prev, [itemId]: (current + 1) % maxImages };
    });
  };

  // Web Speech API Voice Search
  const handleToggleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Voice search not supported in this browser. Try Chrome/Edge!');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-KE';

      recognition.onstart = () => {
        setIsListening(true);
        showToast('Listening... Speak a fit or style');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
        setIsListening(false);
        showToast(`Searching for: "${transcript}"`);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const filteredItems = thriftItems.filter(item => {
    const matchesCat = selectedCategory === 'all' || item.category.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchesCondition = selectedCondition === 'all' || (item.condition && item.condition.toLowerCase().includes(selectedCondition.toLowerCase()));

    let matchesPrice = true;
    const numPrice = parseInt(item.price.replace(/[^0-9]/g, ''), 10) || 0;
    if (selectedPriceRange === 'under2k') matchesPrice = numPrice < 2000;
    else if (selectedPriceRange === '2k-3.5k') matchesPrice = numPrice >= 2000 && numPrice <= 3500;
    else if (selectedPriceRange === '3.5k+') matchesPrice = numPrice > 3500;

    const matchesQuery = !searchQuery.trim() || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.seller.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.condition && item.condition.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesCondition && matchesPrice && matchesQuery;
  });

  const handleInquireWhatsApp = (item: ThriftItem) => {
    const phone = item.whatsapp || '+254711554433';
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Hi ${item.seller}! I saw "${item.name}" on RADA LUKU (${item.price}, Size: ${item.size}). Is this available?`);
    showToast(`Connecting to ${item.seller}...`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const thriftStores = businesses.filter(b => b.category === 'thrift_store');

  const handleViewStore = (store: BusinessAccount) => {
    setActiveStoreModal(store);
    if (onOpenStore) onOpenStore(store.name);
  };

  return (
    <section className="px-4 py-4 space-y-6">
      {/* Header with requested title "LUKU: What to wear" (badges removed) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black tracking-wider uppercase text-slate-500 dark:text-slate-400">
            LUKU: What to wear
          </h2>
          <span className="text-[10px] text-slate-400 font-bold">
            Curated Nairobi Streetwear & Fits
          </span>
        </div>

        {/* Search Input with Microphone */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search fits, streetwear, vintage tees, jackets, sneakers..."
            className="w-full pl-10 pr-20 py-3 bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#E0533C] text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />

          <div className="absolute right-2.5 flex items-center gap-1">
            {isListening && (
              <span className="w-2 h-2 rounded-full bg-[#E0533C] animate-ping mr-1" />
            )}
            <button
              type="button"
              onClick={handleToggleVoiceSearch}
              title={isListening ? 'Stop Listening' : 'Voice Search with Web Speech API'}
              className={`p-2 rounded-xl transition ${
                isListening 
                  ? 'bg-[#E0533C] text-white shadow-md' 
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-[#E0533C] hover:text-white'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {[
            { id: 'all', label: 'All Fits' },
            { id: 'tees', label: 'Tees & Tops' },
            { id: 'jackets', label: 'Jackets & Coats' },
            { id: 'pants', label: 'Pants & Denim' },
            { id: 'footwear', label: 'Footwear & Sneakers' },
            { id: 'accessories', label: 'Accessories & Caps' }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs shrink-0 transition ${
                selectedCategory === cat.id
                  ? 'bg-[#E9C46A] text-slate-900 font-black shadow-xs'
                  : 'bg-[#F1F1EE] dark:bg-[#1C1A1E] text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Condition & Price Range Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Condition:</span>
          {[
            { id: 'all', label: 'All' },
            { id: 'mint', label: 'Mint Condition' },
            { id: 'grade a', label: 'Grade A Vintage' },
            { id: 'like new', label: 'Like New' }
          ].map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCondition(c.id)}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 transition ${
                selectedCondition === c.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-[#F1F1EE] dark:bg-[#1C1A1E] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {c.label}
            </button>
          ))}

          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 ml-2">Budget:</span>
          {[
            { id: 'all', label: 'All' },
            { id: 'under2k', label: '< KES 2K' },
            { id: '2k-3.5k', label: 'KES 2K-3.5K' },
            { id: '3.5k+', label: 'KES 3.5K+' }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPriceRange(p.id)}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 transition ${
                selectedPriceRange === p.id
                  ? 'bg-[#2D6A4F] text-white'
                  : 'bg-[#F1F1EE] dark:bg-[#1C1A1E] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Thrift Items Grid (badges removed) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">
            Catalog ({filteredItems.length})
          </span>
          <span className="text-[10px] text-slate-400">
            {selectedCategory === 'all' ? 'All categories' : selectedCategory}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {filteredItems.map((item) => {
            const itemImages = [item.img, ...(item.images || [])].filter((v, i, a) => a.indexOf(v) === i);
            const activeIdx = (activeImageIndices[item.id] || 0) % itemImages.length;
            const currentImg = itemImages[activeIdx] || item.img;

            return (
              <div
                key={item.id}
                className="bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 shadow-sm flex flex-col justify-between hover:border-[#E9C46A] transition group"
              >
                <div>
                  <div
                    className="h-44 rounded-xl bg-cover bg-center mb-2 relative overflow-hidden group/img select-none"
                    style={{ backgroundImage: `url('${currentImg}')` }}
                  >
                    <span className="absolute top-2 right-2 bg-black/75 backdrop-blur-md text-white text-[10px] font-black px-2 py-0.5 rounded-md z-10">
                      {item.price}
                    </span>
                    <span className="absolute bottom-2 left-2 bg-[#2D6A4F] text-white text-[9px] font-bold px-1.5 py-0.5 rounded z-10">
                      {item.size}
                    </span>

                    {/* Multi-Image Navigation Controls */}
                    {itemImages.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => handlePrevImage(e, item.id, itemImages.length)}
                          className="absolute left-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition z-10 cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleNextImage(e, item.id, itemImages.length)}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition z-10 cursor-pointer"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>

                        <div className="absolute bottom-2 right-2 flex items-center gap-1 z-10 bg-black/60 px-1.5 py-0.5 rounded-full">
                          {itemImages.map((_, i) => (
                            <div 
                              key={i} 
                              className={`w-1 h-1 rounded-full transition-all ${i === activeIdx ? 'w-2.5 bg-amber-400' : 'bg-white/60'}`} 
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                <div className="flex items-start justify-between gap-1">
                  <h4 className="font-extrabold text-xs line-clamp-1 text-slate-900 dark:text-slate-100 group-hover:text-[#E0533C] transition">
                    {item.name}
                  </h4>
                  {item.verified && (
                    <MerchantVerificationBadge category="thrift_store" size="xs" showLabel={false} />
                  )}
                </div>

                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                  {item.condition} • {item.seller}
                </p>
                <p className="text-[9px] text-[#2D6A4F] font-bold truncate mt-0.5">
                  {item.storeLocation} {item.stallNumber ? `(${item.stallNumber})` : ''}
                </p>
              </div>

              <div className="mt-2.5 space-y-1.5">
                <button
                  onClick={() => {
                    const store = businesses.find(b => b.name === item.seller || b.id === item.businessId) || {
                      id: `store-${item.id}`,
                      name: item.seller,
                      category: 'thrift_store' as const,
                      email: 'contact@store.ke',
                      phone: item.whatsapp || '+254700000000',
                      whatsapp: item.whatsapp || '+254700000000',
                      neighborhood: item.storeLocation,
                      address: `${item.storeLocation} ${item.stallNumber || ''}`,
                      bio: `Curated streetwear & thrift drops from ${item.seller} at ${item.storeLocation}.`,
                      logo: item.img,
                      verified: item.verified,
                      createdDate: '2026',
                      discography: ['Vintage Streetwear Archive', 'Rare Denim & Outerwear', 'Graphic Tees Showcase'],
                      pinnedImages: [item.img]
                    };
                    handleViewStore(store);
                  }}
                  className="w-full py-2 px-2.5 bg-white dark:bg-[#121113] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap cursor-pointer"
                >
                  <Store className="w-3.5 h-3.5 text-[#E0533C] shrink-0" />
                  <span>View Store</span>
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleInquireWhatsApp(item)}
                    className="flex-1 py-1.5 px-2 bg-[#2D6A4F] hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs cursor-pointer whitespace-nowrap"
                    title="Direct WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Inquire</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      shareContent({
                        title: `RADA LUKU: ${item.name}`,
                        text: `🔥 Check out "${item.name}" by ${item.seller} on RADA LUKU (${item.price}, Size ${item.size}, ${item.storeLocation})!`,
                        url: window.location.href,
                        onSuccess: showToast,
                        onError: showToast
                      });
                    }}
                    className="py-1.5 px-2.5 bg-white dark:bg-[#121113] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl transition flex items-center justify-center shadow-xs shrink-0 cursor-pointer"
                    title="Share Fit"
                  >
                    <Share2 className="w-3.5 h-3.5 text-[#E0533C]" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

          {/* Empty Search Result State */}
          {filteredItems.length === 0 && (
            <div className="col-span-2 py-8 px-4 text-center text-xs text-slate-400 bg-[#F1F1EE] dark:bg-[#1C1A1E] rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
              <p>No fits found matching "{searchQuery || selectedCategory}".</p>
              <button
                onClick={() => onOpenCreateFit ? onOpenCreateFit(searchQuery) : showToast('Open Business Hub from menu to post fits')}
                className="px-4 py-2 bg-[#E0533C] hover:bg-orange-700 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Fit Listing</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stores & Merchants Directory */}
      <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black tracking-wider uppercase text-slate-500 dark:text-slate-400">
            Stores & Vendors Directory
          </h2>
          <span className="text-[10px] text-slate-400 font-bold">Nairobi Markets</span>
        </div>

        <div className="space-y-2.5">
          {thriftStores.map((store) => (
            <div
              key={store.id}
              className="bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-11 h-11 rounded-full bg-cover bg-center shrink-0 border border-slate-300 dark:border-slate-700"
                  style={{ backgroundImage: `url('${store.logo}')` }}
                />
                <div className="min-w-0">
                  <h4 className="font-extrabold text-xs text-[#2D6A4F] flex items-center gap-1 truncate">
                    <span>{store.name}</span>
                    <CheckCircle2 className="w-3 h-3 text-[#2D6A4F] shrink-0" />
                  </h4>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">
                    {store.address} • {store.bio}
                  </p>
                </div>
              </div>

              {/* View Store opens full Store Account & Discography */}
              <button
                onClick={() => handleViewStore(store)}
                className="px-3.5 py-1.5 bg-[#2D6A4F] hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shrink-0 transition flex items-center gap-1"
              >
                <span>View Store</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* STORE ACCOUNT & DISCOGRAPHY MODAL */}
      {activeStoreModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1C1A1E] text-slate-900 dark:text-slate-100 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            {/* Header Banner */}
            <div className="relative h-32 bg-gradient-to-r from-[#2D6A4F] to-[#E9C46A] p-4 flex justify-between items-start">
              <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase flex items-center gap-1">
                <Store className="w-3 h-3" /> Official Store Profile
              </span>
              <button
                onClick={() => setActiveStoreModal(null)}
                className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 pt-0 relative flex-1 overflow-y-auto space-y-4">
              {/* Logo & Verified Badge */}
              <div className="flex items-end justify-between -mt-10 mb-2">
                <div
                  className="w-20 h-20 rounded-2xl bg-cover bg-center border-4 border-white dark:border-[#1C1A1E] shadow-xl bg-slate-200 dark:bg-slate-800"
                  style={{ backgroundImage: `url('${activeStoreModal.logo}')` }}
                />
                <span className="bg-emerald-100 text-[#2D6A4F] dark:bg-emerald-950/80 dark:text-emerald-300 font-extrabold px-3 py-1 rounded-full text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified Merchant
                </span>
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                  {activeStoreModal.name}
                </h3>
                <p className="text-xs text-[#2D6A4F] font-bold flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />
                  <span>{activeStoreModal.address}</span>
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  {activeStoreModal.bio}
                </p>
              </div>

              {/* Discography & Curated Drops */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <h4 className="font-black text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Disc3 className="w-3.5 h-3.5 text-[#E0533C]" />
                  <span>Store Discography & Curated Collections</span>
                </h4>
                <div className="space-y-1.5">
                  {(activeStoreModal.discography && activeStoreModal.discography.length > 0 ? activeStoreModal.discography : [
                    'Spring 2026 Archive Lookbook',
                    'Heavyweight Streetwear Vault Collection',
                    'Rare Graphic Tees Selection'
                  ]).map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-[#F1F1EE] dark:bg-[#121113] rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold flex items-center justify-between"
                    >
                      <span className="truncate">{item}</span>
                      <span className="text-[10px] text-[#2D6A4F] font-bold shrink-0">Catalog</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pinned Images */}
              {activeStoreModal.pinnedImages && activeStoreModal.pinnedImages.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-500">
                    Pinned Showcase Items
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {activeStoreModal.pinnedImages.map((img, i) => (
                      <div
                        key={i}
                        className="h-28 rounded-xl bg-cover bg-center border border-slate-200 dark:border-slate-800"
                        style={{ backgroundImage: `url('${img}')` }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => {
                    const phone = activeStoreModal.whatsapp || activeStoreModal.phone;
                    const cleanPhone = phone.replace(/\D/g, '');
                    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hi ${activeStoreModal.name}! I saw your store on RADA LUKU.`)}`, '_blank');
                  }}
                  className="flex-1 py-2.5 bg-[#2D6A4F] hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Contact on WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    shareContent({
                      title: `Thrift Store: ${activeStoreModal.name}`,
                      text: `Check out ${activeStoreModal.name} at ${activeStoreModal.address} on RADA LUKU! ${activeStoreModal.bio}`,
                      url: window.location.href,
                      onSuccess: showToast,
                      onError: showToast
                    });
                  }}
                  className="p-2.5 bg-[#F1F1EE] dark:bg-[#121113] hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl transition flex items-center justify-center shadow-xs"
                  title="Share Store Link"
                >
                  <Share2 className="w-4 h-4 text-[#E0533C]" />
                </button>
                <button
                  onClick={() => setActiveStoreModal(null)}
                  className="px-4 py-2.5 bg-[#F1F1EE] dark:bg-[#121113] text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
