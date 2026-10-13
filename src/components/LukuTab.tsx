import React, { useState } from 'react';
import { Search, CheckCircle2, MessageCircle, ShoppingBag, Store } from 'lucide-react';
import { ThriftItem, BusinessAccount } from '../types.ts';

interface LukuTabProps {
  thriftItems: ThriftItem[];
  businesses: BusinessAccount[];
  onOpenStore: (sellerName: string) => void;
  showToast: (msg: string) => void;
}

export const LukuTab: React.FC<LukuTabProps> = ({
  thriftItems,
  businesses,
  onOpenStore,
  showToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredItems = thriftItems.filter(item => {
    const matchesCat = selectedCategory === 'all' || item.category.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchesQuery = !searchQuery.trim() || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.seller.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const handleInquireWhatsApp = (item: ThriftItem) => {
    const phone = item.whatsapp || '+254711554433';
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Hi ${item.seller}! I saw "${item.name}" on RADA Luku (${item.price}, Size: ${item.size}). Is this still available at ${item.storeLocation}?`);
    showToast(`Opening WhatsApp with ${item.seller}...`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const thriftStores = businesses.filter(b => b.category === 'thrift_store');

  return (
    <section className="px-4 py-4 space-y-6">
      {/* Search Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black tracking-wider uppercase text-slate-500 dark:text-slate-400">
            Thrift Visual Search Engine
          </h2>
          <span className="text-[10px] bg-emerald-100 text-[#2D6A4F] dark:bg-emerald-950/80 dark:text-emerald-300 font-extrabold px-2.5 py-0.5 rounded-md flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Verified Sellers Only
          </span>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search fits e.g. Vintage Graphic Tee, Leather Puffer..."
              className="w-full pl-10 pr-4 py-3 bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#E0533C] text-slate-900 dark:text-slate-100"
            />
          </div>
          <button
            onClick={() => showToast(`Searching Luku for "${searchQuery || 'All'}"`)}
            className="px-4 py-3 bg-[#2D6A4F] hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            Search
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {[
            { id: 'all', label: 'All Fits' },
            { id: 'tees', label: 'Tees & Tops' },
            { id: 'jackets', label: 'Jackets & Coats' },
            { id: 'pants', label: 'Pants & Denim' },
            { id: 'shoes', label: 'Footwear' }
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
      </div>

      {/* Thrift Items Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">
            Available Thrift Drops ({filteredItems.length})
          </span>
          <span className="text-[10px] text-slate-400">Direct WhatsApp Checkout</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 shadow-sm flex flex-col justify-between hover:border-[#E9C46A] transition group"
            >
              <div>
                <div
                  className="h-40 rounded-xl bg-cover bg-center mb-2 relative overflow-hidden"
                  style={{ backgroundImage: `url('${item.img}')` }}
                >
                  <span className="absolute top-2 right-2 bg-black/75 backdrop-blur-md text-white text-[10px] font-black px-2 py-0.5 rounded-md">
                    {item.price}
                  </span>
                  <span className="absolute bottom-2 left-2 bg-[#2D6A4F] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                    {item.size}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-1">
                  <h4 className="font-extrabold text-xs line-clamp-1 text-slate-900 dark:text-slate-100 group-hover:text-[#E0533C] transition">
                    {item.name}
                  </h4>
                  {item.verified && (
                    <span title="Verified Seller" className="inline-flex shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2D6A4F]" />
                    </span>
                  )}
                </div>

                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                  {item.condition} • {item.seller}
                </p>
                <p className="text-[9px] text-[#2D6A4F] font-bold truncate mt-0.5">
                  {item.storeLocation} {item.stallNumber ? `(${item.stallNumber})` : ''}
                </p>
              </div>

              <button
                onClick={() => handleInquireWhatsApp(item)}
                className="mt-2.5 w-full py-2 bg-[#2D6A4F] hover:bg-emerald-800 text-white rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 shadow-xs"
              >
                <MessageCircle className="w-3 h-3" />
                <span>Buy via WhatsApp</span>
              </button>
            </div>
          ))}

          {filteredItems.length === 0 && (
            <div className="col-span-2 py-8 text-center text-xs text-slate-400 bg-[#F1F1EE] dark:bg-[#1C1A1E] rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
              No fits matching your search. Merchants can upload items via the Business Hub!
            </div>
          )}
        </div>
      </div>

      {/* Verified Sellers Directory */}
      <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black tracking-wider uppercase text-slate-500 dark:text-slate-400">
            Verified App Sellers Directory
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

              <button
                onClick={() => onOpenStore(store.name)}
                className="px-3 py-1.5 bg-[#2D6A4F] hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shrink-0 transition"
              >
                View Store
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
