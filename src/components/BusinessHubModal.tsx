import { supabase } from '../lib/supabase.ts'; // Adjust path if needed based on your folder structure
import React, { useState } from 'react';
import { 
  Building2, 
  X, 
  Plus, 
  CheckCircle2, 
  Store, 
  CalendarDays, 
  Shirt, 
  BarChart3, 
  Upload, 
  Trash2, 
  Sparkles, 
  ExternalLink,
  ChevronRight,
  Phone,
  MapPin,
  Tag,
  Clock,
  DollarSign,
  Users,
  Star
} from 'lucide-react';
import { 
  BusinessAccount, 
  BusinessCategory, 
  SpotItem, 
  EventItem, 
  ThriftItem, 
  MenuItem, 
  Artist, 
  TicketTier 
} from '../types.ts';

interface BusinessHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  businesses: BusinessAccount[];
  activeBusinessId: string;
  onSelectBusiness: (bizId: string) => void;
  onCreateBusiness: (newBiz: BusinessAccount) => void;
  onAddOrUpdateSpot: (spot: SpotItem) => void;
  onAddEvent: (event: EventItem) => void;
  onAddThriftItem: (item: ThriftItem) => void;
  onDeleteListing: (type: 'spot' | 'event' | 'thrift', id: number) => void;
  spots: SpotItem[];
  events: EventItem[];
  thriftItems: ThriftItem[];
  showToast: (msg: string) => void;
}

export const BusinessHubModal: React.FC<BusinessHubModalProps> = ({
  isOpen,
  onClose,
  businesses,
  activeBusinessId,
  onSelectBusiness,
  onCreateBusiness,
  onAddOrUpdateSpot,
  onAddEvent,
  onAddThriftItem,
  onDeleteListing,
  spots,
  events,
  thriftItems,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<'spots' | 'events' | 'thrift' | 'analytics' | 'account'>('spots');
  const [isRegisteringAccount, setIsRegisteringAccount] = useState(false);

  // Success Confirmation Popup State
  const [successModalData, setSuccessModalData] = useState<{
    title: string;
    message: string;
    subDetails: string;
    listingName: string;
    categoryBadge: string;
  } | null>(null);

  // Active business
  const currentBiz = businesses.find(b => b.id === activeBusinessId) || businesses[0];

  // ----------------------------------------------------
  // ACCOUNT REGISTRATION FORM STATE
  // ----------------------------------------------------
  const [regName, setRegName] = useState('');
  const [regCategory, setRegCategory] = useState<BusinessCategory>('hospitality');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('+254 ');
  const [regWhatsapp, setRegWhatsapp] = useState('+254 ');
  const [regNeighborhood, setRegNeighborhood] = useState('Westlands');
  const [regAddress, setRegAddress] = useState('');
  const [regBio, setRegBio] = useState('');
  const [regLogo, setRegLogo] = useState('');
  const [regInstagram, setRegInstagram] = useState('@');

  const handleRegisterBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) {
      showToast('Please enter a business name.');
      return;
    }
    const newBiz: BusinessAccount = {
      id: `biz-${Date.now()}`,
      name: regName.trim(),
      category: regCategory,
      email: regEmail || 'contact@business.ke',
      phone: regPhone || '+254 700 000 000',
      whatsapp: regWhatsapp.replace(/\s+/g, '') || '+254700000000',
      neighborhood: regNeighborhood,
      address: regAddress || `${regNeighborhood}, Nairobi`,
      bio: regBio || 'Official verified partner on RADA.',
      logo: regLogo || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&auto=format&fit=crop',
      verified: true,
      instagram: regInstagram,
      createdDate: new Date().toISOString().split('T')[0]
    };

    onCreateBusiness(newBiz);
    setIsRegisteringAccount(false);

    // Explicit "Successful" upload confirmation for the merchant
    setSuccessModalData({
      title: 'Successful! Business Uploaded & Live',
      message: `Your business account "${newBiz.name}" has been successfully uploaded to RADA. Your profile is live, verified, and ready for customers!`,
      listingName: newBiz.name,
      categoryBadge: 'Registration Successful',
      subDetails: 'Analytics unlocked! Real-time visitor impressions, clicks, and menu views are now live.'
    });

    showToast(`Upload Successful! "${newBiz.name}" is now live on RADA.`);
    
    // Auto switch to relevant tab
    if (newBiz.category === 'hospitality') setActiveTab('spots');
    else if (newBiz.category === 'event_organizer') setActiveTab('events');
    else setActiveTab('thrift');
  };

  // ----------------------------------------------------
  // SPOT & MENU FORM STATE
  // ----------------------------------------------------
  const [spotTitle, setSpotTitle] = useState(currentBiz?.name || 'Ink & Drink Westlands');
  const [spotCategory, setSpotCategory] = useState<'restaurants' | 'nightlife' | 'cafes'>('restaurants');
  const [spotNeighborhood, setSpotNeighborhood] = useState(currentBiz?.neighborhood || 'Westlands');
  const [spotAddress, setSpotAddress] = useState(currentBiz?.address || 'Mpaka Road, Westlands, Nairobi');
  const [spotPrice, setSpotPrice] = useState('KES $$$');
  const [spotHours, setSpotHours] = useState('12:00 PM - 02:00 AM');
  const [spotDescription, setSpotDescription] = useState('Cocktails, tapas, and vibrant ambiance.');
  const [spotImg, setSpotImg] = useState('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop');
  
  // Dynamic menu items
  const [menuItemsList, setMenuItemsList] = useState<MenuItem[]>([
    { id: 'm-sample1', name: 'Signature Dawa Cocktail', category: 'Cocktails', price: 'KES 950', description: 'Fresh lime, honey & premium vodka' },
    { id: 'm-sample2', name: 'Slow-Smoked Brisket Sliders', category: 'Mains', price: 'KES 1,450', description: 'Trio of tender beef brisket sliders' },
  ]);
  const [newMenuItemName, setNewMenuItemName] = useState('');
  const [newMenuItemCategory, setNewMenuItemCategory] = useState('Cocktails');
  const [newMenuItemPrice, setNewMenuItemPrice] = useState('KES 850');
  const [newMenuItemDesc, setNewMenuItemDesc] = useState('');

  const handleAddMenuItem = () => {
    if (!newMenuItemName.trim()) {
      showToast('Enter menu item name.');
      return;
    }
    const item: MenuItem = {
      id: `m-${Date.now()}`,
      name: newMenuItemName.trim(),
      category: newMenuItemCategory,
      price: newMenuItemPrice.trim().startsWith('KES') ? newMenuItemPrice.trim() : `KES ${newMenuItemPrice.trim()}`,
      description: newMenuItemDesc.trim() || 'Prepared fresh with local Nairobi ingredients'
    };
    setMenuItemsList(prev => [...prev, item]);
    setNewMenuItemName('');
    setNewMenuItemDesc('');
    showToast(`Added "${item.name}" to menu!`);
  };

  const handleRemoveMenuItem = (id: string) => {
    setMenuItemsList(prev => prev.filter(m => m.id !== id));
  };

      const handlePublishSpot = async () => {
    if (!spotTitle.trim()) {
      showToast('Please enter a spot title.');
      return;
    }

    const payload = {
      title: spotTitle.trim(),
      category: spotCategory,
      neighborhood: spotNeighborhood,
      lat: -1.2675 + (Math.random() - 0.5) * 0.02,
      lng: 36.8115 + (Math.random() - 0.5) * 0.02,
      rating: '4.8',
      price: spotPrice,
      address: spotAddress,
      img: spotImg,
      description: spotDescription,
      phone: currentBiz?.phone || '+254 700 000 000',
      opening_hours: spotHours,
      business_id: currentBiz?.id || null,
      menu_images: [spotImg],
      menu_items: menuItemsList
    };

    // 1. Send to Supabase Database
    const { data, error } = await supabase
      .from('spots')
      .insert([payload])
      .select();

    // 2. If Supabase fails, SHOW THE ERROR ON YOUR PHONE SCREEN
    if (error) {
      alert(`SUPABASE ERROR: ${error.message} (Details: ${error.details || 'None'})`);
      return;
    }

    // 3. Update local state & show success
    const publishedSpot = data && data.length > 0 ? data[0] : { id: Date.now(), ...payload };
    onAddOrUpdateSpot(publishedSpot);

    setSuccessModalData({
      title: 'Successful! Spot Uploaded',
      message: `Your spot "${spotTitle}" is live in Supabase!`,
      listingName: spotTitle,
      categoryBadge: 'Spot Upload Successful',
      subDetails: 'Customers can now view location, menus, and reviews.'
    });

    showToast(`Upload Successful! Spot "${spotTitle}" is live in Supabase.`);
  };


    const payload = {
      title: spotTitle.trim(),
      category: spotCategory,
      neighborhood: spotNeighborhood,
      lat: -1.2675 + (Math.random() - 0.5) * 0.02,
      lng: 36.8115 + (Math.random() - 0.5) * 0.02,
      rating: '4.8',
      price: spotPrice,
      address: spotAddress,
      img: spotImg,
      description: spotDescription,
      phone: currentBiz?.phone || '+254 700 000 000',
      openingHours: spotHours,
      businessId: currentBiz?.id,
      menuImages: [spotImg],
      menuItems: menuItemsList
    };

    // 1. Insert directly into Supabase database
    const { data, error } = await supabase
      .from('spots')
      .insert([payload])
      .select();

    if (error) {
      console.error('Supabase Error:', error);
      showToast(`Database Error: ${error.message}`);
      return;
    }

    // 2. Update local state
    const publishedSpot = data && data.length > 0 ? data[0] : { id: Date.now(), ...payload };
    onAddOrUpdateSpot(publishedSpot);

    // 3. Trigger success modal
    setSuccessModalData({
      title: 'Successful! Spot Uploaded',
      message: `Your spot "${spotTitle}" and digital menu (${menuItemsList.length} items) are successfully uploaded and published live!`,
      listingName: spotTitle,
      categoryBadge: 'Spot Upload Successful',
      subDetails: 'Customers can now view location, discover directions, view food/drink items, and post reviews.'
    });

    showToast(`Upload Successful! Spot "${spotTitle}" is live in Supabase.`);
  };

    const spot: SpotItem = {
      id: Date.now(),
      title: spotTitle.trim(),
      category: spotCategory,
      neighborhood: spotNeighborhood,
      lat: -1.2675 + (Math.random() - 0.5) * 0.02,
      lng: 36.8115 + (Math.random() - 0.5) * 0.02,
      rating: '4.8',
      price: spotPrice,
      address: spotAddress,
      img: spotImg,
      description: spotDescription,
      phone: currentBiz?.phone || '+254 700 000 000',
      openingHours: spotHours,
      businessId: currentBiz?.id,
      menuImages: [spotImg],
      menuItems: menuItemsList
    };
    onAddOrUpdateSpot(spot);
    setSuccessModalData({
      title: 'Successful! Spot Uploaded',
      message: `Your spot "${spot.title}" and digital menu (${menuItemsList.length} items) are successfully uploaded and published live on RADA!`,
      listingName: spot.title,
      categoryBadge: 'Spot Upload Successful',
      subDetails: 'Customers can now view location, discover directions, view food/drink items, and post reviews.'
    });
    showToast(`Upload Successful! Spot "${spot.title}" is live on RADA.`);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setter(event.target.result as string);
          showToast('Image uploaded successfully!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // ----------------------------------------------------
  // EVENT CREATION FORM STATE
  // ----------------------------------------------------
  const [eventTitle, setEventTitle] = useState('');
  const [eventCategory, setEventCategory] = useState<'concerts' | 'nightlife' | 'art' | 'cinemas'>('concerts');
  const [eventDate, setEventDate] = useState('2026-11-06');
  const [eventTime, setEventTime] = useState('08:00 PM - 04:00 AM');
  const [eventLocation, setEventLocation] = useState('Village Market, Westlands, Nairobi');
  const [eventPrice, setEventPrice] = useState('KES 1,500');
  const [eventDressCode, setEventDressCode] = useState('Dress to Impress / Casual Chic');
  const [eventDescription, setEventDescription] = useState('The ultimate weekend party vibe in Nairobi.');
  const [eventBannerImg, setEventBannerImg] = useState('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop');
  const [eventTicketUrl, setEventTicketUrl] = useState('https://hustlesasa.shop/');

  // Lineup state
  const [artistsList, setArtistsList] = useState<Artist[]>([
    { name: 'DJ Joe Mfalme', role: 'Headliner DJ', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop' }
  ]);
  const [newArtistName, setNewArtistName] = useState('');
  const [newArtistRole, setNewArtistRole] = useState('Guest DJ');

  // Ticket Tiers state
  const [ticketTiersList, setTicketTiersList] = useState<TicketTier[]>([
    { name: 'Early Bird Pass', price: 'KES 1,500', perks: 'Free welcome drink' },
    { name: 'VIP Lounge Pass', price: 'KES 4,000', perks: 'Fast-track entry & VIP deck' }
  ]);
  const [newTierName, setNewTierName] = useState('');
  const [newTierPrice, setNewTierPrice] = useState('KES 2,000');
  const [newTierPerks, setNewTierPerks] = useState('');

  const handleAddArtist = () => {
    if (!newArtistName.trim()) return;
    setArtistsList(prev => [...prev, {
      name: newArtistName.trim(),
      role: newArtistRole.trim(),
      img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop'
    }]);
    setNewArtistName('');
    showToast(`Added ${newArtistName} to lineup!`);
  };

  const handleAddTier = () => {
    if (!newTierName.trim()) return;
    setTicketTiersList(prev => [...prev, {
      name: newTierName.trim(),
      price: newTierPrice.trim().startsWith('KES') ? newTierPrice.trim() : `KES ${newTierPrice.trim()}`,
      perks: newTierPerks.trim() || 'Standard admission'
    }]);
    setNewTierName('');
    setNewTierPerks('');
    showToast(`Added tier "${newTierName}"!`);
  };

  const handlePublishEvent = () => {
    if (!eventTitle.trim()) {
      showToast('Please enter an event title.');
      return;
    }
    const event: EventItem = {
      id: Date.now(),
      title: eventTitle.trim(),
      category: eventCategory,
      date: new Date(eventDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
      time: eventTime,
      location: eventLocation,
      lat: -1.2295 + (Math.random() - 0.5) * 0.02,
      lng: 36.8124 + (Math.random() - 0.5) * 0.02,
      img: eventBannerImg,
      goingCount: 1,
      url: eventTicketUrl || 'https://hustlesasa.shop/',
      dressCode: eventDressCode,
      description: eventDescription,
      businessId: currentBiz?.id,
      artists: artistsList.length > 0 ? artistsList : [{ name: 'Featured Nairobi DJs', role: 'Main Stage', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop' }],
      tiers: ticketTiersList.length > 0 ? ticketTiersList : [{ name: 'Regular Gate Pass', price: eventPrice, perks: 'All-night access' }]
    };

    onAddEvent(event);
    setEventTitle('');
    setSuccessModalData({
      title: 'Successful! Event Uploaded',
      message: `Your event "${event.title}" has been successfully uploaded to the RADA Home Feed with artist lineups and ticket tiers!`,
      listingName: event.title,
      categoryBadge: 'Event Upload Successful',
      subDetails: 'Real-time attendee clicks, "I\'m Going" counts, and ticket links are active in your Analytics.'
    });
    showToast(`Upload Successful! Event "${event.title}" is live on RADA.`);
  };

  // ----------------------------------------------------
  // THRIFT STORE & FITS FORM STATE
  // ----------------------------------------------------
  const [thriftStoreName, setThriftStoreName] = useState(currentBiz?.name || 'Gikomba Stall 4B & 9C Vintage');
  const [thriftStoreMarket, setThriftStoreMarket] = useState('Gikomba Market, Nairobi');
  const [thriftStoreStall, setThriftStoreStall] = useState('Stall 4B');
  const [thriftWhatsapp, setThriftWhatsapp] = useState(currentBiz?.whatsapp || '+254711554433');
  const [thriftStoreRegistered, setThriftStoreRegistered] = useState(currentBiz?.category === 'thrift_store');

  // Single Fit Upload
  const [fitName, setFitName] = useState('');
  const [fitPrice, setFitPrice] = useState('1,500');
  const [fitCategory, setFitCategory] = useState('Jackets & Coats');
  const [fitCondition, setFitCondition] = useState('Vintage Wash');
  const [fitSize, setFitSize] = useState('XL (Oversized Fit)');
  const [fitImg, setFitImg] = useState('https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600&auto=format&fit=crop');

  const handleRegisterThriftStore = () => {
    if (!thriftStoreName.trim()) {
      showToast('Enter thrift store name.');
      return;
    }
    setThriftStoreRegistered(true);
    setSuccessModalData({
      title: 'Successful! Thrift Store Registered',
      message: `Store "${thriftStoreName}" has been successfully registered and verified on RADA Luku!`,
      listingName: thriftStoreName,
      categoryBadge: 'Store Registration Successful',
      subDetails: 'Your seller profile and stall details are now verified for shoppers across Nairobi.'
    });
    showToast(`Registration Successful! "${thriftStoreName}" verified on Luku.`);
  };

  const handlePublishThriftFit = () => {
    if (!fitName.trim()) {
      showToast('Please enter an item title / fit name.');
      return;
    }
    const item: ThriftItem = {
      id: Date.now(),
      name: fitName.trim(),
      price: fitPrice.startsWith('KES') ? fitPrice : `KES ${fitPrice}`,
      seller: thriftStoreName,
      storeLocation: thriftStoreMarket,
      stallNumber: thriftStoreStall,
      category: fitCategory,
      condition: fitCondition,
      size: fitSize,
      img: fitImg,
      verified: true,
      businessId: currentBiz?.id,
      whatsapp: thriftWhatsapp
    };

    onAddThriftItem(item);
    setFitName('');
    setSuccessModalData({
      title: 'Successful! Thrift Item Uploaded',
      message: `"${item.name}" is successfully uploaded to the Luku feed with verified seller badge and direct WhatsApp checkout!`,
      listingName: item.name,
      categoryBadge: 'Thrift Upload Successful',
      subDetails: 'Direct buyer inquiries will route straight to your WhatsApp number.'
    });
    showToast(`Upload Successful! "${item.name}" published to Luku Catalog.`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#FBFBF9] dark:bg-[#121113] flex flex-col overflow-y-auto animate-in fade-in duration-200">
      {/* Top App Header */}
      <div className="sticky top-0 z-20 bg-[#FBFBF9]/95 dark:bg-[#121113]/95 backdrop-blur-md px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#E0533C] to-[#E9C46A] text-white flex items-center justify-center font-black shadow-sm">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-black text-sm uppercase tracking-wide text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>RADA Business & Merchant Hub</span>
              <span className="text-[9px] bg-emerald-100 text-[#2D6A4F] dark:bg-emerald-950/80 dark:text-emerald-300 font-extrabold px-1.5 py-0.5 rounded">
                PRO
              </span>
            </h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Active: <strong className="text-[#E0533C]">{currentBiz ? currentBiz.name : 'No Business Selected'}</strong>
            </p>
          </div>
        </div>

        <button 
          onClick={onClose} 
          className="w-8 h-8 rounded-full bg-[#F1F1EE] dark:bg-[#1C1A1E] text-slate-700 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="max-w-lg mx-auto w-full p-4 space-y-5 flex-1 pb-16">
        
        {/* Business Selector / Account Switcher Bar */}
        <div className="bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <div 
              className="w-10 h-10 rounded-xl bg-cover bg-center shrink-0 border border-slate-300 dark:border-slate-700"
              style={{ backgroundImage: `url('${currentBiz?.logo || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&auto=format&fit=crop'}')` }}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate">
                  {currentBiz?.name}
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#2D6A4F] shrink-0" />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {currentBiz?.category === 'hospitality' ? 'Restaurant & Bar Venue' : currentBiz?.category === 'event_organizer' ? 'Events & Nightlife Organizer' : 'Thrift & Fashion Merchant'} • {currentBiz?.neighborhood}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <select
              value={activeBusinessId}
              onChange={(e) => onSelectBusiness(e.target.value)}
              className="text-[11px] font-bold bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#E0533C]"
            >
              {businesses.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            <button
              onClick={() => setIsRegisteringAccount(!isRegisteringAccount)}
              className="p-1.5 bg-[#E0533C] text-white rounded-xl text-xs font-bold hover:bg-orange-700 transition"
              title="Create new business profile"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* REGISTER NEW BUSINESS DROPDOWN / FORM */}
        {isRegisteringAccount && (
          <form onSubmit={handleRegisterBusiness} className="bg-white dark:bg-[#1C1A1E] border-2 border-[#E0533C]/40 rounded-3xl p-4 space-y-3.5 shadow-md animate-in slide-in-from-top-4 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-[#E0533C]">
                <Building2 className="w-4 h-4" />
                <h3 className="font-black text-xs uppercase tracking-wider">Register New Business on RADA</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsRegisteringAccount(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Business or Merchant Name *</label>
              <input 
                type="text" 
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="e.g. Nairobi Rooftop Lounge / Toi Vintage Vault" 
                className="w-full p-2.5 bg-[#F1F1EE] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#E0533C]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Category Type</label>
                <select
                  value={regCategory}
                  onChange={(e) => setRegCategory(e.target.value as BusinessCategory)}
                  className="w-full p-2.5 bg-[#F1F1EE] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                >
                  <option value="hospitality">Spot / Venue / Bar / Cafe</option>
                  <option value="event_organizer">Event Promoter / Organizer</option>
                  <option value="thrift_store">Thrift Store / Luku Vendor</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Neighborhood</label>
                <select
                  value={regNeighborhood}
                  onChange={(e) => setRegNeighborhood(e.target.value)}
                  className="w-full p-2.5 bg-[#F1F1EE] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                >
                  <option value="Westlands">Westlands</option>
                  <option value="Kilimani">Kilimani</option>
                  <option value="CBD">CBD / Central</option>
                  <option value="Karen">Karen</option>
                  <option value="Lavington">Lavington</option>
                  <option value="Gikomba">Gikomba Market</option>
                  <option value="Toi Market">Toi Market</option>
                  <option value="Ngara">Ngara</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">WhatsApp / Inquiries (+254)</label>
                <input 
                  type="text" 
                  value={regWhatsapp}
                  onChange={(e) => setRegWhatsapp(e.target.value)}
                  placeholder="+254 700 000 000" 
                  className="w-full p-2.5 bg-[#F1F1EE] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Instagram Handle</label>
                <input 
                  type="text" 
                  value={regInstagram}
                  onChange={(e) => setRegInstagram(e.target.value)}
                  placeholder="@yourbusiness_ke" 
                  className="w-full p-2.5 bg-[#F1F1EE] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Exact Street Address or Stall Number</label>
              <input 
                type="text" 
                value={regAddress}
                onChange={(e) => setRegAddress(e.target.value)}
                placeholder="e.g. Mpaka Road, Westlands OR Gikomba Lane 3 Stall 4B" 
                className="w-full p-2.5 bg-[#F1F1EE] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Short Bio / Description</label>
              <textarea 
                rows={2}
                value={regBio}
                onChange={(e) => setRegBio(e.target.value)}
                placeholder="Tell Nairobi partygoers & shoppers what makes your spot or store iconic..." 
                className="w-full p-2.5 bg-[#F1F1EE] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-[#E0533C] to-[#E9C46A] text-white font-black text-xs rounded-xl shadow-md hover:opacity-95 transition"
            >
              Confirm & Create Business Profile
            </button>
          </form>
        )}

        {/* 4 PRIMARY SECTIONS TABS */}
        <div className="grid grid-cols-4 gap-1 bg-[#F1F1EE] dark:bg-[#1C1A1E] p-1 rounded-2xl text-center shadow-inner text-xs">
          <button
            onClick={() => setActiveTab('spots')}
            className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1 transition ${
              activeTab === 'spots'
                ? 'bg-white dark:bg-[#121113] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Store className="w-3.5 h-3.5 text-[#E0533C]" />
            <span>Spots & Menus</span>
          </button>

          <button
            onClick={() => setActiveTab('events')}
            className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1 transition ${
              activeTab === 'events'
                ? 'bg-white dark:bg-[#121113] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 text-[#2D6A4F]" />
            <span>Events</span>
          </button>

          <button
            onClick={() => setActiveTab('thrift')}
            className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1 transition ${
              activeTab === 'thrift'
                ? 'bg-white dark:bg-[#121113] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Shirt className="w-3.5 h-3.5 text-[#E9C46A]" />
            <span>Thrift Luku</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1 transition ${
              activeTab === 'analytics'
                ? 'bg-white dark:bg-[#121113] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#E0533C]" />
            <span>Analytics</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* SUB-VIEW 1: SPOTS & MENUS UPLOAD */}
        {/* ======================================================== */}
        {activeTab === 'spots' && (
          <div className="space-y-4 text-xs">
            <div className="bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <div>
                  <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Store className="w-4 h-4 text-[#E0533C]" />
                    <span>Upload Spot Profile & Location</span>
                  </h3>
                  <p className="text-[10px] text-slate-500">Add your restaurant, bar, club, or cafe to RADA Spots & map</p>
                </div>
                <span className="text-[10px] bg-red-100 text-[#E0533C] font-extrabold px-2 py-0.5 rounded-md">Live Preview</span>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Spot Name</label>
                <input 
                  type="text" 
                  value={spotTitle} 
                  onChange={(e) => setSpotTitle(e.target.value)}
                  placeholder="e.g. Ink & Drink"
                  className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E0533C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Category</label>
                  <select 
                    value={spotCategory}
                    onChange={(e) => setSpotCategory(e.target.value as any)}
                    className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                  >
                    <option value="restaurants">Restaurants & Dining</option>
                    <option value="nightlife">Nightlife, Clubs & Lounges</option>
                    <option value="cafes">Cafes & Bakeries</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Neighborhood</label>
                  <select 
                    value={spotNeighborhood}
                    onChange={(e) => setSpotNeighborhood(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                  >
                    <option value="Westlands">Westlands</option>
                    <option value="Kilimani">Kilimani</option>
                    <option value="CBD">CBD</option>
                    <option value="Karen">Karen</option>
                    <option value="Lavington">Lavington</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Price Tier</label>
                  <select 
                    value={spotPrice}
                    onChange={(e) => setSpotPrice(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                  >
                    <option value="KES $">Budget (KES $)</option>
                    <option value="KES $$">Moderate (KES $$)</option>
                    <option value="KES $$$">Upscale (KES $$$)</option>
                    <option value="KES $$$$">Fine Dining / VIP (KES $$$$)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Hours</label>
                  <input 
                    type="text" 
                    value={spotHours} 
                    onChange={(e) => setSpotHours(e.target.value)}
                    placeholder="e.g. 12:00 PM - 02:00 AM"
                    className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Exact Address / Directions</label>
                <input 
                  type="text" 
                  value={spotAddress} 
                  onChange={(e) => setSpotAddress(e.target.value)}
                  placeholder="e.g. Mpaka Road, Westlands, Nairobi"
                  className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                />
              </div>

              {/* Photo Upload for Spot */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Spot Cover Photo</span>
                  <span className="text-[10px] text-slate-400">JPG, PNG or photo upload</span>
                </label>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-20 h-16 rounded-xl bg-cover bg-center shrink-0 border border-slate-300 dark:border-slate-700 shadow-sm"
                    style={{ backgroundImage: `url('${spotImg}')` }}
                  />
                  <label className="flex-1 cursor-pointer py-2.5 px-3 bg-white dark:bg-[#121113] border border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:border-[#E0533C] text-center transition">
                    <span className="text-[11px] font-bold text-[#E0533C] flex items-center justify-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" /> Upload Spot Image
                    </span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleImageFileChange(e, setSpotImg)}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* MENUS & SPECIALS SECTION */}
            <div className="bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <div>
                  <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-[#2D6A4F]" />
                    <span>Digital Menu & Price Catalog</span>
                  </h3>
                  <p className="text-[10px] text-slate-500">Customers can browse your drinks, cocktails & dishes</p>
                </div>
                <span className="text-[10px] bg-emerald-100 text-[#2D6A4F] font-bold px-2 py-0.5 rounded-md">
                  {menuItemsList.length} items
                </span>
              </div>

              {/* Existing items list */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {menuItemsList.map(item => (
                  <div key={item.id} className="p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-2 shadow-xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">{item.name}</span>
                        <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-semibold">{item.category}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{item.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-extrabold text-xs text-[#E0533C]">{item.price}</span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveMenuItem(item.id)}
                        className="text-slate-400 hover:text-red-500 p-1"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Menu Item Form */}
              <div className="p-3 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2.5">
                <p className="font-extrabold text-[11px] text-slate-700 dark:text-slate-300">Add New Dish or Drink</p>
                
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="text" 
                    value={newMenuItemName}
                    onChange={(e) => setNewMenuItemName(e.target.value)}
                    placeholder="Item Name (e.g. Dawa, Ribeye)" 
                    className="p-2 bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none"
                  />
                  <select
                    value={newMenuItemCategory}
                    onChange={(e) => setNewMenuItemCategory(e.target.value)}
                    className="p-2 bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none"
                  >
                    <option value="Cocktails">Cocktails & Drinks</option>
                    <option value="Mains">Main Courses</option>
                    <option value="Tapas">Tapas & Starters</option>
                    <option value="Wine">Wine & Beer</option>
                    <option value="Coffee">Coffee & Bakery</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="text" 
                    value={newMenuItemPrice}
                    onChange={(e) => setNewMenuItemPrice(e.target.value)}
                    placeholder="Price (e.g. KES 950)" 
                    className="p-2 bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none"
                  />
                  <input 
                    type="text" 
                    value={newMenuItemDesc}
                    onChange={(e) => setNewMenuItemDesc(e.target.value)}
                    placeholder="Short description / ingredients" 
                    className="p-2 bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none"
                  />
                </div>

                <button 
                  type="button" 
                  onClick={handleAddMenuItem}
                  className="w-full py-2 bg-[#2D6A4F] text-white font-bold rounded-xl text-xs hover:bg-emerald-800 transition flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Item to Menu
                </button>
              </div>

              <button 
                type="button"
                onClick={handlePublishSpot}
                className="w-full py-3.5 bg-gradient-to-r from-[#E0533C] to-orange-600 text-white font-black rounded-2xl shadow-md hover:opacity-95 transition flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Publish Spot & Menu to RADA
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SUB-VIEW 2: EVENTS & NIGHTLIFE CREATION */}
        {/* ======================================================== */}
        {activeTab === 'events' && (
          <div className="space-y-4 text-xs">
            <div className="bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <div>
                  <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-[#2D6A4F]" />
                    <span>Create & Publish Event Listing</span>
                  </h3>
                  <p className="text-[10px] text-slate-500">All details required to sell tickets and hype Nairobi partygoers</p>
                </div>
                <span className="text-[10px] bg-emerald-100 text-[#2D6A4F] font-extrabold px-2 py-0.5 rounded-md">Event Hub</span>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Event Title *</label>
                <input 
                  type="text" 
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g. Afrobeats Night Out Nairobi / Halloween Masquerade" 
                  className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E0533C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Category / Vibe</label>
                  <select 
                    value={eventCategory}
                    onChange={(e) => setEventCategory(e.target.value as any)}
                    className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                  >
                    <option value="concerts">Concerts & Festivals</option>
                    <option value="nightlife">Nightlife & Club Nights</option>
                    <option value="art">Art & Cultural Pop-ups</option>
                    <option value="cinemas">Cinema & Screenings</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Event Date</label>
                  <input 
                    type="date" 
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Hours / Time</label>
                  <input 
                    type="text" 
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    placeholder="e.g. 08:00 PM - 04:00 AM" 
                    className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Starting Price</label>
                  <input 
                    type="text" 
                    value={eventPrice}
                    onChange={(e) => setEventPrice(e.target.value)}
                    placeholder="e.g. KES 1,500" 
                    className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Venue & Location Address</label>
                <input 
                  type="text" 
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="e.g. Village Market, Limuru Road, Westlands, Nairobi" 
                  className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Dress Code / "What To Wear"</label>
                <input 
                  type="text" 
                  value={eventDressCode}
                  onChange={(e) => setEventDressCode(e.target.value)}
                  placeholder="e.g. Spooky Glam / All Black / 90s Streetwear" 
                  className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                />
              </div>

              {/* Event Banner Upload */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Event Banner Flyer</span>
                  <span className="text-[10px] text-slate-400">High-resolution poster</span>
                </label>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-24 h-16 rounded-xl bg-cover bg-center shrink-0 border border-slate-300 dark:border-slate-700 shadow-sm"
                    style={{ backgroundImage: `url('${eventBannerImg}')` }}
                  />
                  <label className="flex-1 cursor-pointer py-2.5 px-3 bg-white dark:bg-[#121113] border border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:border-[#2D6A4F] text-center transition">
                    <span className="text-[11px] font-bold text-[#2D6A4F] flex items-center justify-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" /> Upload Event Poster
                    </span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleImageFileChange(e, setEventBannerImg)}
                    />
                  </label>
                </div>
              </div>

              {/* Performing Lineup Sub-section */}
              <div className="p-3 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[11px] text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-[#E0533C]" /> Performing Artists & DJs
                  </span>
                  <span className="text-[10px] text-slate-400">{artistsList.length} headliners</span>
                </div>

                <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1">
                  {artistsList.map((a, idx) => (
                    <div key={idx} className="bg-[#F1F1EE] dark:bg-[#1C1A1E] px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-cover bg-center" style={{ backgroundImage: `url('${a.img}')` }} />
                      <div>
                        <p className="font-bold text-[11px] leading-tight">{a.name}</p>
                        <p className="text-[9px] text-slate-400">{a.role}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newArtistName}
                    onChange={(e) => setNewArtistName(e.target.value)}
                    placeholder="Artist / DJ Name" 
                    className="flex-1 p-2 bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none"
                  />
                  <input 
                    type="text" 
                    value={newArtistRole}
                    onChange={(e) => setNewArtistRole(e.target.value)}
                    placeholder="Role (e.g. Resident DJ)" 
                    className="w-28 p-2 bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none"
                  />
                  <button 
                    type="button" 
                    onClick={handleAddArtist}
                    className="px-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold rounded-lg text-xs"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Ticket Tiers Sub-section */}
              <div className="p-3 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[11px] text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-[#2D6A4F]" /> Ticket Tiers & Pricing
                  </span>
                  <span className="text-[10px] text-slate-400">{ticketTiersList.length} tiers</span>
                </div>

                <div className="space-y-1.5">
                  {ticketTiersList.map((tier, idx) => (
                    <div key={idx} className="p-2 bg-[#F1F1EE] dark:bg-[#1C1A1E] rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold">{tier.name}</span>
                        {tier.perks && <span className="text-[10px] text-slate-400 block">{tier.perks}</span>}
                      </div>
                      <span className="font-extrabold text-[#E0533C]">{tier.price}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="text" 
                    value={newTierName}
                    onChange={(e) => setNewTierName(e.target.value)}
                    placeholder="Tier (e.g. Early Bird / VIP)" 
                    className="p-2 bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none"
                  />
                  <input 
                    type="text" 
                    value={newTierPrice}
                    onChange={(e) => setNewTierPrice(e.target.value)}
                    placeholder="Price (e.g. KES 2,500)" 
                    className="p-2 bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none"
                  />
                </div>
                <button 
                  type="button" 
                  onClick={handleAddTier}
                  className="w-full py-1.5 bg-[#F1F1EE] dark:bg-[#1C1A1E] hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold rounded-lg text-[11px] transition"
                >
                  + Add Ticket Tier
                </button>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Ticket Portal Link (HustleSasa, TicketSasa, etc.)</label>
                <input 
                  type="text" 
                  value={eventTicketUrl}
                  onChange={(e) => setEventTicketUrl(e.target.value)}
                  placeholder="https://hustlesasa.shop/..." 
                  className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                />
              </div>

              <button 
                type="button"
                onClick={handlePublishEvent}
                className="w-full py-3.5 bg-gradient-to-r from-[#2D6A4F] to-emerald-700 text-white font-black rounded-2xl shadow-md hover:opacity-95 transition flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Publish Event to RADA Home Feed
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SUB-VIEW 3: THRIFT SHOPS & LUKU VENDOR HUB */}
        {/* ======================================================== */}
        {activeTab === 'thrift' && (
          <div className="space-y-4 text-xs">
            {/* Step 1: Thrift Store Profile */}
            <div className="bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <div>
                  <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Shirt className="w-4 h-4 text-[#E9C46A]" />
                    <span>Step 1: Register Your Thrift Store / Stall</span>
                  </h3>
                  <p className="text-[10px] text-slate-500">Official merchant badge on RADA Luku Visual Search Engine</p>
                </div>
                {thriftStoreRegistered ? (
                  <span className="text-[10px] bg-emerald-100 text-[#2D6A4F] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Registered
                  </span>
                ) : (
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded-md">
                    Required First
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Store / Merchant Name *</label>
                <input 
                  type="text" 
                  value={thriftStoreName}
                  onChange={(e) => setThriftStoreName(e.target.value)}
                  placeholder="e.g. Gikomba Stall 4B & 9C Vintage" 
                  className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Market / Location</label>
                  <select 
                    value={thriftStoreMarket}
                    onChange={(e) => setThriftStoreMarket(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                  >
                    <option value="Gikomba Market, Nairobi">Gikomba Market</option>
                    <option value="Toi Market, Adams Arcade, Nairobi">Toi Market (Adams Arcade)</option>
                    <option value="Ngara Market, Nairobi">Ngara Market</option>
                    <option value="Nairobi CBD Pop-up">Nairobi CBD</option>
                    <option value="Online / Courier Delivery KE">Online / Courier Delivery</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Stall Number / Lane</label>
                  <input 
                    type="text" 
                    value={thriftStoreStall}
                    onChange={(e) => setThriftStoreStall(e.target.value)}
                    placeholder="e.g. Stall 4B, Lane 3" 
                    className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">WhatsApp Number for Customer Orders</label>
                <input 
                  type="text" 
                  value={thriftWhatsapp}
                  onChange={(e) => setThriftWhatsapp(e.target.value)}
                  placeholder="+254 711 554 433" 
                  className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                />
              </div>

              {!thriftStoreRegistered && (
                <button
                  type="button"
                  onClick={handleRegisterThriftStore}
                  className="w-full py-2.5 bg-[#E9C46A] hover:bg-amber-400 text-slate-900 font-black rounded-xl shadow transition"
                >
                  Register Store & Unlock Single Fits Upload
                </button>
              )}
            </div>

            {/* Step 2: Upload Single Fits (Drops) */}
            <div className={`bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm space-y-3.5 transition-all ${
              !thriftStoreRegistered ? 'opacity-60 pointer-events-none' : ''
            }`}>
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <div>
                  <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-[#E0533C]" />
                    <span>Step 2: Upload Single Fits & Drops</span>
                  </h3>
                  <p className="text-[10px] text-slate-500">Post vintage tees, jackets, pants, and sneakers to Luku</p>
                </div>
                <span className="text-[10px] bg-red-100 text-[#E0533C] font-extrabold px-2 py-0.5 rounded-md">Catalog Upload</span>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Fit / Garment Title *</label>
                <input 
                  type="text" 
                  value={fitName}
                  onChange={(e) => setFitName(e.target.value)}
                  placeholder="e.g. 90s Carhartt Detroit Jacket / Graphic Band Tee" 
                  className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E0533C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Price (KES)</label>
                  <input 
                    type="text" 
                    value={fitPrice}
                    onChange={(e) => setFitPrice(e.target.value)}
                    placeholder="1,800" 
                    className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Category</label>
                  <select 
                    value={fitCategory}
                    onChange={(e) => setFitCategory(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                  >
                    <option value="Tees & Tops">Tees & Tops</option>
                    <option value="Jackets & Coats">Jackets & Coats</option>
                    <option value="Pants & Jeans">Pants & Jeans</option>
                    <option value="Shoes & Sneakers">Shoes & Sneakers</option>
                    <option value="Accessories">Accessories & Caps</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Size</label>
                  <select 
                    value={fitSize}
                    onChange={(e) => setFitSize(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                  >
                    <option value="XL (Oversized Fit)">XL (Oversized)</option>
                    <option value="L">Large (L)</option>
                    <option value="M">Medium (M)</option>
                    <option value="S">Small (S)</option>
                    <option value="W32 L32">W32 L32 (Denim)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Condition</label>
                  <select 
                    value={fitCondition}
                    onChange={(e) => setFitCondition(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                  >
                    <option value="Mint Condition">Mint Condition (10/10)</option>
                    <option value="Vintage Wash">Vintage Wash</option>
                    <option value="Distressed Raw">Distressed Raw</option>
                    <option value="Brand New with Tags">Brand New with Tags</option>
                  </select>
                </div>
              </div>

              {/* Fit Photo Upload */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Fit Photo</span>
                  <span className="text-[10px] text-slate-400">Clear hanger or model shot</span>
                </label>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-16 h-20 rounded-xl bg-cover bg-center shrink-0 border border-slate-300 dark:border-slate-700 shadow-sm"
                    style={{ backgroundImage: `url('${fitImg}')` }}
                  />
                  <label className="flex-1 cursor-pointer py-3 px-3 bg-white dark:bg-[#121113] border border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:border-[#E0533C] text-center transition">
                    <span className="text-[11px] font-bold text-[#E0533C] flex items-center justify-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" /> Upload Fit Image
                    </span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleImageFileChange(e, setFitImg)}
                    />
                  </label>
                </div>
              </div>

              <button 
                type="button"
                onClick={handlePublishThriftFit}
                className="w-full py-3.5 bg-gradient-to-r from-[#2D6A4F] to-[#E0533C] text-white font-black rounded-2xl shadow-md hover:opacity-95 transition flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Publish Fit to Luku Catalog
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SUB-VIEW 4: ACTIVE LISTINGS & ADVANCED ANALYTICS */}
        {/* ======================================================== */}
        {activeTab === 'analytics' && (
          <div className="space-y-4 text-xs">
            {/* Unlocked Celebration Banner */}
            <div className="bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-red-500/10 border border-emerald-500/30 rounded-2xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#2D6A4F] text-white flex items-center justify-center font-bold shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate">
                    Analytics Active: {currentBiz?.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 truncate">
                    Real-time Nairobi customer impressions, ride hails & WhatsApp leads
                  </p>
                </div>
              </div>
              <span className="text-[9px] bg-emerald-100 text-[#2D6A4F] font-black px-2 py-0.5 rounded-full shrink-0">
                LIVE METRICS
              </span>
            </div>

            {/* Core KPI Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-center shadow-xs">
                <span className="text-[10px] text-slate-400 uppercase font-black">Spot / Feed Views</span>
                <p className="text-xl font-black text-[#E0533C] mt-0.5">3,420</p>
                <span className="text-[9px] text-[#2D6A4F] font-bold">+24% this week</span>
              </div>
              <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-center shadow-xs">
                <span className="text-[10px] text-slate-400 uppercase font-black">Uber / Bolt Hails</span>
                <p className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5">418</p>
                <span className="text-[9px] text-[#2D6A4F] font-bold">Ride to venue</span>
              </div>
              <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-center shadow-xs">
                <span className="text-[10px] text-slate-400 uppercase font-black">Ticket / RSVPs</span>
                <p className="text-xl font-black text-[#2D6A4F] mt-0.5">342</p>
                <span className="text-[9px] text-slate-400">Synced to Vault</span>
              </div>
              <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-center shadow-xs">
                <span className="text-[10px] text-slate-400 uppercase font-black">WhatsApp Orders</span>
                <p className="text-xl font-black text-[#E9C46A] mt-0.5">76</p>
                <span className="text-[9px] text-[#2D6A4F] font-bold">Luku & Menu leads</span>
              </div>
            </div>

            {/* Weekly Customer Traffic Graph */}
            <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Weekly Nairobi Customer Footfall Trend
                  </h4>
                  <p className="text-[10px] text-slate-400">Peak hours: Fri & Sat (08:00 PM - 02:00 AM)</p>
                </div>
                <span className="text-[10px] font-bold text-[#E0533C]">Last 7 Days</span>
              </div>

              {/* Bar Chart Visual */}
              <div className="grid grid-cols-7 gap-2 items-end h-28 pt-4 pb-1 px-1 border-b border-slate-200 dark:border-slate-800">
                {[
                  { day: 'Mon', count: 180, pct: '35%' },
                  { day: 'Tue', count: 240, pct: '45%' },
                  { day: 'Wed', count: 390, pct: '60%' },
                  { day: 'Thu', count: 520, pct: '75%' },
                  { day: 'Fri', count: 980, pct: '100%', highlight: true },
                  { day: 'Sat', count: 860, pct: '90%', highlight: true },
                  { day: 'Sun', count: 410, pct: '50%' }
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[9px] font-bold text-slate-400">{item.count}</span>
                    <div 
                      className={`w-full rounded-t-lg transition-all ${
                        item.highlight 
                          ? 'bg-gradient-to-t from-[#E0533C] to-[#E9C46A]' 
                          : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                      style={{ height: item.pct }}
                    />
                    <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-300">{item.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Rating & Reviews Summary */}
            <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Customer Ratings & Community Feedback
                </h4>
                <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-lg text-xs font-black">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>★ 4.8 / 5.0</span>
                </div>
              </div>

              {/* Rating Bars */}
              <div className="space-y-1.5">
                {[
                  { star: '5 Stars', pct: '82%', count: 116 },
                  { star: '4 Stars', pct: '14%', count: 20 },
                  { star: '3 Stars', pct: '4%', count: 6 }
                ].map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-[11px]">
                    <span className="w-14 font-bold text-slate-500">{row.star}</span>
                    <div className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div className="bg-[#E0533C] h-full rounded-full" style={{ width: row.pct }} />
                    </div>
                    <span className="w-8 text-right font-bold text-slate-400">{row.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Published Spots List */}
            <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 space-y-3 shadow-xs">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>My Published Spots ({spots.filter(s => !s.businessId || s.businessId === currentBiz?.id).length})</span>
                <button onClick={() => setActiveTab('spots')} className="text-[#E0533C] hover:underline font-bold text-[11px]">+ Add Spot</button>
              </h3>
              <div className="space-y-2">
                {spots.slice(0, 3).map(spot => (
                  <div key={spot.id} className="p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-cover bg-center shrink-0" style={{ backgroundImage: `url('${spot.img}')` }} />
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs truncate">{spot.title}</h4>
                        <p className="text-[10px] text-slate-400 truncate">{spot.neighborhood} • {spot.menuItems?.length || 0} menu items • ★{spot.rating}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => onDeleteListing('spot', spot.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition"
                      title="Delete listing"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Published Events List */}
            <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 space-y-3 shadow-xs">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>My Published Events ({events.length})</span>
                <button onClick={() => setActiveTab('events')} className="text-[#2D6A4F] hover:underline font-bold text-[11px]">+ Add Event</button>
              </h3>
              <div className="space-y-2">
                {events.map(event => (
                  <div key={event.id} className="p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-cover bg-center shrink-0" style={{ backgroundImage: `url('${event.img}')` }} />
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs truncate">{event.title}</h4>
                        <p className="text-[10px] text-slate-400 truncate">{event.date} • {event.goingCount} going</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => onDeleteListing('event', event.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition"
                      title="Delete listing"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Published Thrift Fits */}
            <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 space-y-3 shadow-xs">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>My Luku Thrift Fits ({thriftItems.length})</span>
                <button onClick={() => setActiveTab('thrift')} className="text-[#E9C46A] hover:underline font-bold text-[11px]">+ Add Fit</button>
              </h3>
              <div className="space-y-2">
                {thriftItems.map(item => (
                  <div key={item.id} className="p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-cover bg-center shrink-0" style={{ backgroundImage: `url('${item.img}')` }} />
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs truncate">{item.name}</h4>
                        <p className="text-[10px] text-slate-400 truncate">{item.price} • {item.seller}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => onDeleteListing('thrift', item.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition"
                      title="Delete listing"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* SUCCESS CONFIRMATION MODAL POPUP */}
      {successModalData && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1C1A1E] text-slate-900 dark:text-slate-100 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                {successModalData.categoryBadge}
              </span>
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 pt-1.5">
                {successModalData.title}
              </h3>
              <p className="text-xs font-bold text-[#E0533C]">
                "{successModalData.listingName}"
              </p>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-[#F8F8F6] dark:bg-[#121113] p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
              {successModalData.message}
            </p>

            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-[11px] text-amber-900 dark:text-amber-200 font-medium">
              📊 {successModalData.subDetails}
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => {
                  setSuccessModalData(null);
                  setActiveTab('analytics');
                }}
                className="flex-1 py-3 bg-[#2D6A4F] hover:bg-emerald-800 text-white font-black rounded-xl text-xs shadow-md transition"
              >
                View Analytics
              </button>
              <button
                onClick={() => setSuccessModalData(null)}
                className="flex-1 py-3 bg-[#F8F8F6] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-bold rounded-xl text-xs transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
