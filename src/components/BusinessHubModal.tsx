import { supabase } from '../lib/supabase.ts';
import React, { useState, useEffect } from 'react';
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
  Star,
  Edit3,
  ShieldCheck,
  Disc3,
  Image as ImageIcon,
  Check,
  Percent,
  Compass,
  Camera
} from 'lucide-react';
import { 
  BusinessAccount, 
  BusinessCategory, 
  SpotItem, 
  SpotCategory,
  EventItem, 
  ThriftItem, 
  MenuItem, 
  SpecialOffer,
  Artist, 
  TicketTier 
} from '../types.ts';
import { DynamicLocationSelector } from './DynamicLocationSelector.tsx';

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
  const [activeTab, setActiveTab] = useState<'spots' | 'manage_spots' | 'events' | 'thrift' | 'profile' | 'analytics'>('spots');
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
      coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop',
      verified: true,
      instagram: regInstagram,
      createdDate: new Date().toISOString().split('T')[0],
      discography: [
        `${regName.trim()} Launch Lookbook / Showcase`,
        'Curated Resident Selections 2026'
      ],
      pinnedImages: [
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop'
      ],
      specialOffers: [
        { id: `so-${Date.now()}`, title: 'Welcome Launch Offer', discount: '10% OFF', description: 'Mention RADA for 10% off your first order!' }
      ]
    };

    onCreateBusiness(newBiz);
    setIsRegisteringAccount(false);

    setSuccessModalData({
      title: 'Successful! Business Profile Live',
      message: `Your verified business account "${newBiz.name}" is now live on RADA with full profile, verified badge, and analytics unlocked.`,
      listingName: newBiz.name,
      categoryBadge: 'Verified Partner Active',
      subDetails: 'You can now publish spots, events, or luku fits, manage multiple photos, and claim community spots.'
    });

    showToast(`Upload Successful! "${newBiz.name}" is live on RADA.`);
  };

  // ----------------------------------------------------
  // SPOT & MENU EDITING STATE (SPEC 1: Re-edit, Multiple Images, Exact Location & Dynamic Landmarks)
  // ----------------------------------------------------
  const [editingSpotId, setEditingSpotId] = useState<number | null>(null);
  const [spotTitle, setSpotTitle] = useState(currentBiz?.name || 'Ink & Drink Westlands');
  const [spotCategory, setSpotCategory] = useState<SpotCategory>('restaurants');
  const [spotNeighborhood, setSpotNeighborhood] = useState(currentBiz?.neighborhood || 'Westlands');
  const [spotExactLocationTag, setSpotExactLocationTag] = useState('Hurlingham, Petrol Station');
  const [spotLandmark, setSpotLandmark] = useState('TotalEnergies Hurlingham Petrol Station');
  const [isCustomLandmark, setIsCustomLandmark] = useState(false);
  const [customLandmarkInput, setCustomLandmarkInput] = useState('');
  const [spotAddress, setSpotAddress] = useState(currentBiz?.address || 'Mpaka Road, Westlands, Nairobi');
  const [spotPrice, setSpotPrice] = useState('KES $$$');
  const [spotHours, setSpotHours] = useState('12:00 PM - 02:00 AM');
  const [spotDescription, setSpotDescription] = useState('Cocktails, artisanal dining, and vibrant Nairobi ambiance.');
  
  // SPEC 1: Allow business merchants to upload/remove multiple images
  const [spotImagesList, setSpotImagesList] = useState<string[]>([
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop'
  ]);

  // Menus: image upload AND typed text entry (dish items: Name, Price, Description ONLY)
  const [menuFlyerImages, setMenuFlyerImages] = useState<string[]>([
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop'
  ]);
  const [menuItemsList, setMenuItemsList] = useState<MenuItem[]>([
    { id: 'm-sample1', name: 'Signature Dawa Cocktail', price: 'KES 950', description: 'Fresh lime, honey & premium vodka' },
    { id: 'm-sample2', name: 'Slow-Smoked Brisket Sliders', price: 'KES 1,450', description: 'Trio of tender beef brisket sliders with chimichurri' },
  ]);
  const [newMenuItemName, setNewMenuItemName] = useState('');
  const [newMenuItemPrice, setNewMenuItemPrice] = useState('KES 850');
  const [newMenuItemDesc, setNewMenuItemDesc] = useState('');

  // Offers & Specials section for profiles
  const [specialOffersList, setSpecialOffersList] = useState<SpecialOffer[]>([
    { id: 'so-sample-1', title: 'Happy Hour Dawa 2-for-1', discount: 'BUY 1 GET 1', description: 'Weekdays 5:00 PM - 8:00 PM on signature cocktails' }
  ]);
  const [newOfferTitle, setNewOfferTitle] = useState('');
  const [newOfferDiscount, setNewOfferDiscount] = useState('BUY 1 GET 1');
  const [newOfferDesc, setNewOfferDesc] = useState('');

  // Dynamic landmark and bus stop dictionary based on neighborhood
  const landmarkOptionsByNeighborhood: Record<string, string[]> = {
    'Hurlingham': [
      'TotalEnergies Hurlingham Petrol Station',
      'Yaya Matatu Stage',
      'Chaka Place Stage',
      'Argwings Kodhek Matatu Stop',
      'Four Points by Sheraton Stage'
    ],
    'Westlands': [
      'Sarit Bus Stage',
      'Westgate Mall Stage',
      'Mpaka Road Shell Station',
      'Curio Market Bus Stop',
      'Sankara Stage'
    ],
    'Kilimani': [
      'Yaya Centre Main Stage',
      'Adlife Plaza Stage',
      'Prestige Plaza Stage',
      'Dennis Pritt Matatu Stage',
      'Wood Avenue Stage'
    ],
    'CBD': [
      'Kencom Bus Stage',
      'Ambassadeur Stage',
      'National Archives',
      'Odeon Cinema Stage',
      'Railways Bus Terminus'
    ],
    'Karen': [
      'Karen Cross Roads Stage',
      'The Hub Karen Stage',
      'Karen Roundabout Petrol Station',
      'Hardy Shopping Centre Stage'
    ],
    'Lavington': [
      'Lavington Mall Stage',
      'Jaffery Sports Club Stage',
      'James Gichuru Shell Station'
    ],
    'Naivasha / Outskirts': [
      'Green Park Airstrip Gate',
      'Buffalo Mall Naivasha Stage',
      'Moi South Lake Junction',
      'Delamere Stage'
    ]
  };

  const currentLandmarkOptions = landmarkOptionsByNeighborhood[spotNeighborhood] || [
    'Main Stage / Petrol Station',
    'Roundabout Bus Stop',
    'Commercial Mall Stage'
  ];

  // Update dynamic landmark when neighborhood changes
  useEffect(() => {
    if (!editingSpotId) {
      const opts = landmarkOptionsByNeighborhood[spotNeighborhood];
      if (opts && opts.length > 0) {
        setSpotLandmark(opts[0]);
      }
    }
  }, [spotNeighborhood]);

  const handleAddSpotImage = (url: string) => {
    if (!url.trim()) return;
    setSpotImagesList(prev => [...prev, url.trim()]);
    setNewImageInputUrl('');
    showToast('Photo added to spot images gallery!');
  };

  const handleRemoveSpotImage = (index: number) => {
    if (spotImagesList.length <= 1) {
      showToast('Spots must have at least one primary image.');
      return;
    }
    setSpotImagesList(prev => prev.filter((_, i) => i !== index));
    showToast('Image removed.');
  };

  const handleSetCoverSpotImage = (index: number) => {
    const selected = spotImagesList[index];
    const rest = spotImagesList.filter((_, i) => i !== index);
    setSpotImagesList([selected, ...rest]);
    showToast('Cover photo updated!');
  };

  const handleAddMenuItem = () => {
    if (!newMenuItemName.trim()) {
      showToast('Enter dish or drink name.');
      return;
    }
    const item: MenuItem = {
      id: `m-${Date.now()}`,
      name: newMenuItemName.trim(),
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

  const handleAddSpecialOffer = () => {
    if (!newOfferTitle.trim()) {
      showToast('Enter special offer title.');
      return;
    }
    const offer: SpecialOffer = {
      id: `so-${Date.now()}`,
      title: newOfferTitle.trim(),
      discount: newOfferDiscount.trim(),
      description: newOfferDesc.trim() || 'Exclusive special for RADA customers'
    };
    setSpecialOffersList(prev => [...prev, offer]);
    setNewOfferTitle('');
    setNewOfferDesc('');
    showToast(`Added offer "${offer.title}"!`);
  };

  const handleRemoveSpecialOffer = (id: string) => {
    setSpecialOffersList(prev => prev.filter(o => o.id !== id));
  };

  const handleLoadSpotForEditing = (spot: SpotItem) => {
    setEditingSpotId(spot.id);
    setSpotTitle(spot.title);
    setSpotCategory(spot.category);
    setSpotNeighborhood(spot.neighborhood);
    setSpotExactLocationTag(spot.exactLocationTag || `${spot.neighborhood}, Petrol Station`);
    setSpotLandmark(spot.landmark || currentLandmarkOptions[0]);
    setSpotAddress(spot.address);
    setSpotPrice(spot.price);
    setSpotHours(spot.openingHours || '12:00 PM - 02:00 AM');
    setSpotDescription(spot.description || '');
    setSpotImagesList(spot.images && spot.images.length > 0 ? spot.images : [spot.img]);
    setMenuItemsList(spot.menuItems || []);
    setMenuFlyerImages(spot.menuImages || []);
    setSpecialOffersList(spot.specialOffers || []);
    setActiveTab('spots');
    showToast(`Editing "${spot.title}". Make changes and click Update!`);
  };

  const handleResetSpotForm = () => {
    setEditingSpotId(null);
    setSpotTitle(currentBiz?.name || '');
    setSpotNeighborhood(currentBiz?.neighborhood || 'Westlands');
    setSpotAddress(currentBiz?.address || 'Westlands, Nairobi');
    setSpotPrice('KES $$$');
    setSpotHours('12:00 PM - 02:00 AM');
    setSpotDescription('Cocktails, dining and relaxed ambiance.');
    setSpotImagesList(['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop']);
    setMenuItemsList([]);
    setSpecialOffersList([]);
  };

  const handlePublishSpot = async () => {
    if (!spotTitle.trim()) {
      showToast('Please enter a spot title.');
      return;
    }

    const landmarkValue = isCustomLandmark && customLandmarkInput.trim() 
      ? customLandmarkInput.trim() 
      : spotLandmark;

    const spot: SpotItem = {
      id: editingSpotId || Date.now(),
      title: spotTitle.trim(),
      category: spotCategory,
      neighborhood: spotNeighborhood,
      exactLocationTag: spotExactLocationTag.trim(),
      landmark: landmarkValue,
      lat: -1.2675 + (Math.random() - 0.5) * 0.02,
      lng: 36.8115 + (Math.random() - 0.5) * 0.02,
      rating: '4.8',
      price: spotPrice,
      address: spotAddress,
      img: spotImagesList[0] || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop',
      images: spotImagesList,
      description: spotDescription,
      phone: currentBiz?.phone || '+254 700 000 000',
      openingHours: spotHours,
      businessId: currentBiz?.id,
      isUserUploaded: false,
      menuImages: menuFlyerImages,
      menuItems: menuItemsList,
      specialOffers: specialOffersList
    };

    onAddOrUpdateSpot(spot);

    setSuccessModalData({
      title: editingSpotId ? 'Successful! Spot Re-edited & Saved' : 'Successful! Spot Uploaded Live',
      message: `Your spot "${spot.title}" with ${spotImagesList.length} photos, digital menu (${menuItemsList.length} dishes), and offers is published live!`,
      listingName: spot.title,
      categoryBadge: editingSpotId ? 'Spot Updated' : 'Spot Live on Map',
      subDetails: `Exact location tagged: ${spot.exactLocationTag} • Landmark: ${spot.landmark}`
    });

    showToast(editingSpotId ? `Spot "${spot.title}" updated successfully!` : `Upload Successful! "${spot.title}" is live on RADA.`);
    handleResetSpotForm();
  };

  // SPEC 1: Claim user-uploaded spots
  const handleClaimSpot = (spotToClaim: SpotItem) => {
    const updatedSpot: SpotItem = {
      ...spotToClaim,
      businessId: currentBiz?.id,
      isUserUploaded: false,
      phone: currentBiz?.phone || spotToClaim.phone
    };
    onAddOrUpdateSpot(updatedSpot);
    showToast(`Claimed "${spotToClaim.title}" as official merchant! You can now edit its menu and photos.`);
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
  // EVENT CREATION FORM STATE (Dresscode removed, Primary links only)
  // ----------------------------------------------------
  const [eventTitle, setEventTitle] = useState('');
  const [eventCategory, setEventCategory] = useState<'concerts' | 'nightlife' | 'art' | 'cinemas'>('concerts');
  const [eventGenre, setEventGenre] = useState('Afrobeats & Live');
  const [eventDate, setEventDate] = useState('2026-11-06');
  const [eventTime, setEventTime] = useState('08:00 PM - 04:00 AM');
  const [eventLocation, setEventLocation] = useState('Village Market, Westlands, Nairobi');
  const [eventPrice, setEventPrice] = useState('KES 1,500');
  const [eventDescription, setEventDescription] = useState('The ultimate weekend party vibe in Nairobi.');
  const [eventBannerImg, setEventBannerImg] = useState('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop');
  const [eventGalleryImgs, setEventGalleryImgs] = useState<string[]>([
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop'
  ]);
  const [eventTicketUrl, setEventTicketUrl] = useState('https://hustlesasa.com/');

  const [artistsList, setArtistsList] = useState<Artist[]>([
    { name: 'DJ Joe Mfalme', role: 'Headliner DJ', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop' }
  ]);
  const [newArtistName, setNewArtistName] = useState('');
  const [newArtistRole, setNewArtistRole] = useState('Guest DJ');

  const [ticketTiersList, setTicketTiersList] = useState<TicketTier[]>([
    { name: 'Early Bird Pass', price: 'KES 1,500', perks: 'Free welcome drink' },
    { name: 'VIP Lounge Pass', price: 'KES 4,000', perks: 'Fast-track entry & VIP deck' }
  ]);
  const [newTierName, setNewTierName] = useState('');
  const [newTierPrice, setNewTierPrice] = useState('KES 2,000');
  const [newTierPerks, setNewTierPerks] = useState('');

  const handleMultipleFilesChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const readers = Array.from(files).map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          }
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then(results => {
      setter(prev => [...prev, ...results]);
      showToast(`Added ${results.length} photo(s) to gallery.`);
    });
  };

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
      genre: eventGenre,
      date: new Date(eventDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
      time: eventTime,
      location: eventLocation,
      lat: -1.2295 + (Math.random() - 0.5) * 0.02,
      lng: 36.8124 + (Math.random() - 0.5) * 0.02,
      img: eventBannerImg,
      images: eventGalleryImgs.length > 0 ? eventGalleryImgs : [eventBannerImg],
      goingCount: 1,
      url: eventTicketUrl || 'https://hustlesasa.com/',
      description: eventDescription,
      businessId: currentBiz?.id,
      artists: artistsList.length > 0 ? artistsList : [{ name: 'Featured Nairobi DJs', role: 'Main Stage', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop' }],
      tiers: ticketTiersList.length > 0 ? ticketTiersList : [{ name: 'Regular Gate Pass', price: eventPrice, perks: 'All-night access' }]
    };

    onAddEvent(event);
    setEventTitle('');
    setSuccessModalData({
      title: 'Successful! Event Uploaded',
      message: `Your event "${event.title}" has been successfully uploaded to the RADA Home Feed with official primary ticketing links!`,
      listingName: event.title,
      categoryBadge: 'Event Live on RADA',
      subDetails: `Genre: ${event.genre} • Lineup: ${artistsList.length} artists`
    });
    showToast(`Upload Successful! "${event.title}" is live on RADA.`);
  };

  // ----------------------------------------------------
  // THRIFT LUKU FORM STATE
  // ----------------------------------------------------
  const [fitName, setFitName] = useState('');
  const [fitPrice, setFitPrice] = useState('KES 1,500');
  const [fitCategory, setFitCategory] = useState('Tees & Tops');
  const [fitCondition, setFitCondition] = useState('Vintage Wash');
  const [fitSize, setFitSize] = useState('XL (Oversized)');
  const [thriftStoreLocation, setThriftStoreLocation] = useState('Gikomba Market, Nairobi');
  const [thriftStallNumber, setThriftStallNumber] = useState('Lane 3, Stall 4B');
  const [fitImg, setFitImg] = useState('https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600&auto=format&fit=crop');
  const [thriftGalleryImgs, setThriftGalleryImgs] = useState<string[]>([
    'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&auto=format&fit=crop'
  ]);

  const handlePublishThriftFit = () => {
    if (!fitName.trim()) {
      showToast('Please enter item name.');
      return;
    }
    const item: ThriftItem = {
      id: Date.now(),
      name: fitName.trim(),
      price: fitPrice.trim().startsWith('KES') ? fitPrice.trim() : `KES ${fitPrice.trim()}`,
      seller: currentBiz?.name || 'Gikomba Vault',
      storeLocation: thriftStoreLocation || currentBiz?.address || 'Gikomba Market, Nairobi',
      stallNumber: thriftStallNumber || 'Official Stall',
      category: fitCategory,
      condition: fitCondition,
      size: fitSize,
      img: fitImg,
      images: thriftGalleryImgs.length > 0 ? thriftGalleryImgs : [fitImg],
      verified: true,
      businessId: currentBiz?.id,
      whatsapp: currentBiz?.whatsapp || '+254711554433'
    };

    onAddThriftItem(item);
    setFitName('');
    setSuccessModalData({
      title: 'Successful! Fit Uploaded',
      message: `Your piece "${item.name}" has been uploaded to the RADA Luku catalog with store account integration!`,
      listingName: item.name,
      categoryBadge: 'Luku Fit Live',
      subDetails: `Store: ${item.seller} • WhatsApp leads connected.`
    });
    showToast(`Fit "${item.name}" uploaded to LUKU!`);
  };

  // Authored spots by this merchant
  const myAuthoredSpots = spots.filter(s => s.businessId === currentBiz?.id || s.title.toLowerCase().includes(currentBiz?.name?.toLowerCase() || ''));
  // User-uploaded / claimable spots
  const claimableCommunitySpots = spots.filter(s => s.isUserUploaded || !s.businessId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-[#121113] text-slate-900 dark:text-slate-100 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-[#F8F8F6] dark:bg-[#1C1A1E]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E0533C] to-[#E9C46A] text-white flex items-center justify-center shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Business & Merchant Hub
                </h2>
                <span className="text-[9px] bg-red-100 text-[#E0533C] font-black px-1.5 py-0.5 rounded uppercase">
                  Verified
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Managing: <strong className="text-[#E0533C]">{currentBiz?.name || 'Official Account'}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:scale-105 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-1 overflow-x-auto hide-scrollbar p-2 bg-[#F1F1EE] dark:bg-[#1C1A1E] border-b border-slate-200 dark:border-slate-800 text-xs">
          {[
            { id: 'spots', label: editingSpotId ? '✏️ Edit Spot' : 'Upload Spot', icon: Store },
            { id: 'manage_spots', label: 'My Spots & Claim', icon: Compass },
            { id: 'events', label: 'Events', icon: CalendarDays },
            { id: 'thrift', label: 'Thrift Luku', icon: Shirt },
            { id: 'profile', label: 'Business Profile', icon: ShieldCheck },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 }
          ].map((tab) => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-2 rounded-xl font-bold shrink-0 transition flex items-center gap-1.5 ${
                  isSel
                    ? 'bg-white dark:bg-[#121113] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSel ? 'text-[#E0533C]' : ''}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-5 text-xs">

          {/* ======================================================== */}
          {/* TAB 1: SPOTS UPLOAD & RE-EDIT (SPEC 1) */}
          {/* ======================================================== */}
          {activeTab === 'spots' && (
            <div className="space-y-4">
              <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <div>
                    <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Store className="w-4 h-4 text-[#E0533C]" />
                      <span>{editingSpotId ? `Re-edit Spot: ${spotTitle}` : 'Create & Publish Spot Profile'}</span>
                    </h3>
                    <p className="text-[10px] text-slate-500">Official verified spot with multiple photos, digital menu & offers</p>
                  </div>
                  {editingSpotId && (
                    <button
                      type="button"
                      onClick={handleResetSpotForm}
                      className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-lg font-bold"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                {/* Spot Name */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Spot Name *</label>
                  <input 
                    type="text" 
                    value={spotTitle} 
                    onChange={(e) => setSpotTitle(e.target.value)}
                    placeholder="e.g. Ink & Drink Westlands"
                    className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E0533C]"
                  />
                </div>

                {/* Category & Neighborhood */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Category *</label>
                    <select 
                      value={spotCategory}
                      onChange={(e) => setSpotCategory(e.target.value as SpotCategory)}
                      className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                    >
                      <option value="restaurants">Restaurants & Dining</option>
                      <option value="nightlife">Nightlife, Clubs & Lounges</option>
                      <option value="cafes">Cafes & Bakeries</option>
                      <option value="date_spots">Romantic Date Spots</option>
                      <option value="hotels">Hotels & Luxury Stays</option>
                      <option value="vacation">Vacation Spots & Escapes</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Neighborhood *</label>
                    <select 
                      value={spotNeighborhood}
                      onChange={(e) => setSpotNeighborhood(e.target.value)}
                      className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                    >
                      <option value="Hurlingham">Hurlingham</option>
                      <option value="Westlands">Westlands</option>
                      <option value="Kilimani">Kilimani</option>
                      <option value="CBD">CBD</option>
                      <option value="Karen">Karen</option>
                      <option value="Lavington">Lavington</option>
                      <option value="Naivasha / Outskirts">Naivasha / Outskirts</option>
                    </select>
                  </div>
                </div>

                {/* SPEC 1: Exact Location Tagging & Dynamic Landmark / Bus Stop Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-[#E0533C]" />
                      <span>Exact Location Tagging (Required)</span>
                    </label>
                    <input 
                      type="text" 
                      value={spotExactLocationTag} 
                      onChange={(e) => setSpotExactLocationTag(e.target.value)}
                      placeholder="e.g. Hurlingham, Petrol Station"
                      className="w-full p-2 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none font-medium"
                    />
                    <span className="text-[10px] text-slate-400">e.g. Hurlingham, Petrol Station (TotalEnergies)</span>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between text-[11px]">
                      <span>Dynamic Bus Stop / Landmark</span>
                      <button 
                        type="button" 
                        onClick={() => setIsCustomLandmark(!isCustomLandmark)}
                        className="text-[9px] text-[#E0533C] font-bold hover:underline"
                      >
                        {isCustomLandmark ? 'Pick Pre-set' : '+ Custom'}
                      </button>
                    </label>

                    {isCustomLandmark ? (
                      <input 
                        type="text" 
                        value={customLandmarkInput} 
                        onChange={(e) => setCustomLandmarkInput(e.target.value)}
                        placeholder="Type custom bus stop / landmark..."
                        className="w-full p-2 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                      />
                    ) : (
                      <select 
                        value={spotLandmark}
                        onChange={(e) => setSpotLandmark(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                      >
                        {currentLandmarkOptions.map((lm, i) => (
                          <option key={i} value={lm}>{lm}</option>
                        ))}
                      </select>
                    )}
                    <span className="text-[10px] text-slate-400">Auto-updates based on {spotNeighborhood}</span>
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
                    <label className="font-bold text-slate-700 dark:text-slate-300">Opening Hours</label>
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
                  <label className="font-bold text-slate-700 dark:text-slate-300">Physical Address / Street</label>
                  <input 
                    type="text" 
                    value={spotAddress} 
                    onChange={(e) => setSpotAddress(e.target.value)}
                    placeholder="e.g. Argwings Kodhek Rd, Hurlingham, Nairobi"
                    className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Spot Description</label>
                  <textarea 
                    rows={2}
                    value={spotDescription} 
                    onChange={(e) => setSpotDescription(e.target.value)}
                    placeholder="Describe the atmosphere, signature dishes, cocktails, seating..."
                    className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none resize-none"
                  />
                </div>

                {/* SPEC 1: Allow business merchants to upload/remove MULTIPLE images */}
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-[#E0533C]" />
                        <span>Merchant Photos Gallery ({spotImagesList.length})</span>
                      </h4>
                      <p className="text-[10px] text-slate-400">Merchants can upload and manage multiple venue photos</p>
                    </div>
                  </div>

                  {/* Thumbnail gallery */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {spotImagesList.map((imgUrl, idx) => (
                      <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 group h-24">
                        <img src={imgUrl} alt={`Photo ${idx}`} className="w-full h-full object-cover" />
                        {idx === 0 && (
                          <span className="absolute top-1 left-1 bg-[#E0533C] text-white text-[8px] font-black px-1.5 py-0.5 rounded">
                            Cover
                          </span>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-1 p-1">
                          {idx !== 0 && (
                            <button
                              type="button"
                              onClick={() => handleSetCoverSpotImage(idx)}
                              className="text-[9px] bg-white text-slate-900 px-1.5 py-0.5 rounded font-bold"
                            >
                              Make Cover
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveSpotImage(idx)}
                            className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded font-bold"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Add Image Card */}
                    <label className="h-24 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-[#E0533C] cursor-pointer flex flex-col items-center justify-center p-2 text-center transition">
                      <Upload className="w-4 h-4 text-[#E0533C] mb-1" />
                      <span className="text-[10px] font-bold text-[#E0533C]">+ Upload Photo</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) handleAddSpotImage(event.target.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* SPEC 1: MENUS (Image Upload AND Typed Text Entry. Dish items: Name, Price, Description ONLY) */}
              <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <div>
                    <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-[#2D6A4F]" />
                      <span>Digital Menu (Image Flyers + Typed Text Entry)</span>
                    </h3>
                    <p className="text-[10px] text-slate-500">Dish items require Name, Price, and Description only</p>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-[#2D6A4F] font-bold px-2 py-0.5 rounded-md">
                    {menuItemsList.length} items
                  </span>
                </div>

                {/* Menu Flyer Image Upload */}
                <div className="p-3 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px]">Upload Menu Board / Flyer Image</span>
                    <label className="cursor-pointer text-[10px] bg-[#2D6A4F] text-white px-2.5 py-1 rounded-lg font-bold flex items-center gap-1">
                      <Upload className="w-3 h-3" /> Add Menu Image
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const res = event.target?.result;
                              if (res) {
                                setMenuFlyerImages(prev => [...prev, res as string]);
                                showToast('Menu flyer uploaded!');
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                  {menuFlyerImages.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto py-1">
                      {menuFlyerImages.map((mImg, i) => (
                        <div key={i} className="relative w-20 h-24 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 shrink-0">
                          <img src={mImg} alt={`Menu ${i}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setMenuFlyerImages(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute top-1 right-1 w-4 h-4 bg-black/80 text-white rounded-full flex items-center justify-center text-[9px]"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Typed Menu Items List */}
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {menuItemsList.map(item => (
                    <div key={item.id} className="p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-2 shadow-xs">
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate block">{item.name}</span>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{item.description}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-extrabold text-xs text-[#E0533C]">{item.price}</span>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveMenuItem(item.id)}
                          className="text-slate-400 hover:text-red-500 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Typed Entry Form: Name, Price, and Description ONLY (No Price Tier) */}
                <div className="p-3 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                  <p className="font-extrabold text-[11px] text-slate-700 dark:text-slate-300">Typed Dish Item (Name, Price, Description only)</p>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="text" 
                      value={newMenuItemName}
                      onChange={(e) => setNewMenuItemName(e.target.value)}
                      placeholder="Dish Name (e.g. Prime Mbuzi Choma)" 
                      className="p-2 bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none"
                    />
                    <input 
                      type="text" 
                      value={newMenuItemPrice}
                      onChange={(e) => setNewMenuItemPrice(e.target.value)}
                      placeholder="Price (e.g. KES 900)" 
                      className="p-2 bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none"
                    />
                  </div>

                  <input 
                    type="text" 
                    value={newMenuItemDesc}
                    onChange={(e) => setNewMenuItemDesc(e.target.value)}
                    placeholder="Description (e.g. Flame-grilled goat meat served with kachumbari)" 
                    className="w-full p-2 bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none"
                  />

                  <button 
                    type="button" 
                    onClick={handleAddMenuItem}
                    className="w-full py-2 bg-[#2D6A4F] text-white font-bold rounded-xl text-xs hover:bg-emerald-800 transition flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Dish to Menu
                  </button>
                </div>
              </div>

              {/* SPEC 1: OFFERS & SPECIALS SECTION */}
              <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <div>
                    <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Percent className="w-4 h-4 text-[#E0533C]" />
                      <span>Offers & Specials Section</span>
                    </h3>
                    <p className="text-[10px] text-slate-500">Showcase happy hours, brunch packages, discount perks on your profile</p>
                  </div>
                  <span className="text-[10px] bg-red-100 text-[#E0533C] font-bold px-2 py-0.5 rounded-md">
                    {specialOffersList.length} specials
                  </span>
                </div>

                <div className="space-y-1.5">
                  {specialOffersList.map(o => (
                    <div key={o.id} className="p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-[#E0533C]">{o.discount}</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">• {o.title}</span>
                        </div>
                        <p className="text-[10px] text-slate-500">{o.description}</p>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveSpecialOffer(o.id)}
                        className="text-slate-400 hover:text-red-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="text" 
                      value={newOfferTitle}
                      onChange={(e) => setNewOfferTitle(e.target.value)}
                      placeholder="Offer Title (e.g. Friday Pizza Night)" 
                      className="p-2 bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none"
                    />
                    <input 
                      type="text" 
                      value={newOfferDiscount}
                      onChange={(e) => setNewOfferDiscount(e.target.value)}
                      placeholder="Discount Tag (e.g. 20% OFF / BUY 1 GET 1)" 
                      className="p-2 bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none"
                    />
                  </div>
                  <input 
                    type="text" 
                    value={newOfferDesc}
                    onChange={(e) => setNewOfferDesc(e.target.value)}
                    placeholder="Offer description (e.g. Buy any 2 large pizzas and get free garlic bread)" 
                    className="w-full p-2 bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none"
                  />
                  <button 
                    type="button" 
                    onClick={handleAddSpecialOffer}
                    className="w-full py-2 bg-[#E0533C] text-white font-bold rounded-xl text-xs hover:bg-orange-700 transition"
                  >
                    + Add Special Offer
                  </button>
                </div>
              </div>

              {/* Submit / Publish Button */}
              <button 
                type="button"
                onClick={handlePublishSpot}
                className="w-full py-3.5 bg-gradient-to-r from-[#E0533C] to-orange-600 text-white font-black rounded-2xl shadow-md hover:opacity-95 transition flex items-center justify-center gap-2 text-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{editingSpotId ? 'Update & Save Spot Changes' : 'Publish Spot & Menus to RADA'}</span>
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: MANAGE SPOTS, RE-EDIT, REMOVE & CLAIM USER SPOTS (SPEC 1) */}
          {/* ======================================================== */}
          {activeTab === 'manage_spots' && (
            <div className="space-y-5">
              {/* My Authored Spots Section */}
              <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <div>
                    <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Store className="w-4 h-4 text-[#E0533C]" />
                      <span>My Authored Spots ({myAuthoredSpots.length})</span>
                    </h3>
                    <p className="text-[10px] text-slate-500">Edit, re-edit, or remove spots managed by your official business</p>
                  </div>
                  <button
                    onClick={() => {
                      handleResetSpotForm();
                      setActiveTab('spots');
                    }}
                    className="px-2.5 py-1 bg-[#E0533C] text-white rounded-lg text-[10px] font-bold"
                  >
                    + New Spot
                  </button>
                </div>

                {myAuthoredSpots.length === 0 ? (
                  <p className="text-slate-400 py-3 text-center">No spots authored yet. Click "+ New Spot" to add one!</p>
                ) : (
                  <div className="space-y-2">
                    {myAuthoredSpots.map((spot) => (
                      <div
                        key={spot.id}
                        className="p-3 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div 
                            className="w-12 h-12 rounded-xl bg-cover bg-center shrink-0 border border-slate-300 dark:border-slate-700"
                            style={{ backgroundImage: `url('${spot.img}')` }}
                          />
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate flex items-center gap-1">
                              <span>{spot.title}</span>
                              <span className="text-[9px] bg-red-100 text-[#E0533C] px-1.5 py-0.2 rounded font-bold">{spot.category}</span>
                            </h4>
                            <p className="text-[10px] text-slate-500 truncate">
                              {spot.neighborhood} • {spot.price} • ★{spot.rating}
                            </p>
                            {spot.exactLocationTag && (
                              <p className="text-[9px] text-[#E0533C] font-semibold truncate">
                                📍 {spot.exactLocationTag}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleLoadSpotForEditing(spot)}
                            className="px-2.5 py-1.5 bg-[#2D6A4F] hover:bg-emerald-800 text-white rounded-xl text-[10px] font-bold flex items-center gap-1 shadow-xs"
                            title="Edit / Re-edit spot"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteListing('spot', spot.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition"
                            title="Remove spot"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SPEC 1: Claim User-Uploaded Spots */}
              <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <div>
                    <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#2D6A4F]" />
                      <span>Claim Community & User-Uploaded Spots ({claimableCommunitySpots.length})</span>
                    </h3>
                    <p className="text-[10px] text-slate-500">Official accounts can claim user-uploaded listings to manage menus & photos</p>
                  </div>
                </div>

                {claimableCommunitySpots.length === 0 ? (
                  <p className="text-slate-400 py-3 text-center">All spots in your area are claimed by official merchants.</p>
                ) : (
                  <div className="space-y-2">
                    {claimableCommunitySpots.map((spot) => (
                      <div
                        key={spot.id}
                        className="p-3 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div 
                            className="w-12 h-12 rounded-xl bg-cover bg-center shrink-0 border border-slate-300 dark:border-slate-700"
                            style={{ backgroundImage: `url('${spot.img}')` }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate">{spot.title}</h4>
                              <span className="text-[8px] bg-amber-100 text-amber-800 px-1 rounded font-bold uppercase">Community Upload</span>
                            </div>
                            <p className="text-[10px] text-slate-500 truncate">
                              {spot.neighborhood} • {spot.address}
                            </p>
                            {spot.exactLocationTag && (
                              <p className="text-[9px] text-[#2D6A4F] font-semibold truncate">
                                📍 {spot.exactLocationTag}
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleClaimSpot(spot)}
                          className="px-3 py-1.5 bg-[#E0533C] hover:bg-orange-700 text-white rounded-xl text-[10px] font-black shrink-0 shadow-sm transition flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>Claim Spot</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: EVENTS LISTINGS (SPEC 3: Primary Links, No Dresscode) */}
          {/* ======================================================== */}
          {activeTab === 'events' && (
            <div className="space-y-4">
              <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <div>
                    <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <CalendarDays className="w-4 h-4 text-[#2D6A4F]" />
                      <span>Create & Publish Event Listing</span>
                    </h3>
                    <p className="text-[10px] text-slate-500">Direct links to official primary ticketing portals only (no affiliate tracking)</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Event Title *</label>
                  <input 
                    type="text" 
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="e.g. Halloween Fright Night 2026" 
                    className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Category</label>
                    <select
                      value={eventCategory}
                      onChange={(e) => setEventCategory(e.target.value as any)}
                      className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                    >
                      <option value="concerts">Concerts & Live</option>
                      <option value="nightlife">Nightlife & Rave</option>
                      <option value="art">Art & Cultural Showcase</option>
                      <option value="cinemas">Cinema Special Screening</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Genre</label>
                    <input 
                      type="text" 
                      value={eventGenre}
                      onChange={(e) => setEventGenre(e.target.value)}
                      placeholder="e.g. Afrobeats / Amapiano / Acoustic"
                      className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Date</label>
                    <input 
                      type="date" 
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Time</label>
                    <input 
                      type="text" 
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                      placeholder="08:00 PM - 04:00 AM" 
                      className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <DynamicLocationSelector
                    value={eventLocation}
                    onChange={(loc) => setEventLocation(loc)}
                    label="Venue Location *"
                    placeholder="Search venue estate, Kiambu, Mombasa Rd stages..."
                  />
                </div>

                {/* Event Poster Upload */}
                <div className="space-y-2">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block text-xs">Event Poster / Cover Artwork *</label>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-20 h-24 rounded-xl bg-cover bg-center shrink-0 border border-slate-300 dark:border-slate-700 shadow-sm relative group overflow-hidden"
                      style={{ backgroundImage: `url('${eventBannerImg}')` }}
                    >
                      <button
                        type="button"
                        onClick={() => setEventBannerImg('')}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white cursor-pointer"
                        title="Remove poster"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                    <label className="flex-1 cursor-pointer py-3 px-3 bg-white dark:bg-[#121113] border border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:border-[#2D6A4F] text-center transition">
                      <span className="text-[11px] font-bold text-[#2D6A4F] flex items-center justify-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" /> Upload Event Artwork File
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

                {/* Event Multi-Image Gallery */}
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-700 dark:text-slate-300 text-xs block">Event Atmosphere Gallery ({eventGalleryImgs.length})</span>
                      <span className="text-[10px] text-slate-400">Add crowd, stage production, or VIP lounge photos</span>
                    </div>
                    <label className="cursor-pointer text-[11px] font-extrabold text-[#2D6A4F] hover:underline flex items-center gap-1 bg-[#2D6A4F]/10 px-2.5 py-1 rounded-lg transition">
                      <Plus className="w-3 h-3" /> Add Photos
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleMultipleFilesChange(e, setEventGalleryImgs)}
                      />
                    </label>
                  </div>
                  {eventGalleryImgs.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto py-1">
                      {eventGalleryImgs.map((imgUrl, idx) => (
                        <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-300 dark:border-slate-700 group">
                          <img src={imgUrl} alt="Gallery" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setEventGalleryImgs(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Primary Ticketing Portal Link */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Official Primary Ticketing Site Link *</label>
                  <input 
                    type="text" 
                    value={eventTicketUrl}
                    onChange={(e) => setEventTicketUrl(e.target.value)}
                    placeholder="e.g. https://hustlesasa.com/ OR https://kenyabuzz.com/events" 
                    className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none font-medium"
                  />
                  <span className="text-[10px] text-slate-400">Direct official ticketing only (no affiliate codes or redirects)</span>
                </div>

                {/* Artists and Tiers */}
                <div className="p-3 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                  <span className="font-extrabold text-[11px]">Performing Artists ({artistsList.length})</span>
                  <div className="flex gap-2 overflow-x-auto py-1">
                    {artistsList.map((a, idx) => (
                      <div key={idx} className="bg-[#F1F1EE] dark:bg-[#1C1A1E] px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0 flex items-center gap-2">
                        <span className="font-bold text-xs">{a.name}</span>
                        <span className="text-[9px] text-slate-400">({a.role})</span>
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
                    <button 
                      type="button" 
                      onClick={handleAddArtist}
                      className="px-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold rounded-lg text-xs"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={handlePublishEvent}
                  className="w-full py-3.5 bg-gradient-to-r from-[#2D6A4F] to-emerald-700 text-white font-black rounded-2xl shadow-md hover:opacity-95 transition flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Publish Event to RADA
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: THRIFT LUKU (SPEC 4) */}
          {/* ======================================================== */}
          {activeTab === 'thrift' && (
            <div className="space-y-4">
              <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <div>
                    <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Shirt className="w-4 h-4 text-[#E9C46A]" />
                      <span>Post Item to LUKU: What to wear</span>
                    </h3>
                    <p className="text-[10px] text-slate-500">Streetwear & vintage catalog item with store discography linkage</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Piece Name *</label>
                  <input 
                    type="text" 
                    value={fitName}
                    onChange={(e) => setFitName(e.target.value)}
                    placeholder="e.g. 90s Carhartt Carpenter Pant" 
                    className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Price</label>
                    <input 
                      type="text" 
                      value={fitPrice}
                      onChange={(e) => setFitPrice(e.target.value)}
                      placeholder="KES 2,000" 
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
                      <option value="Pants & Denim">Pants & Denim</option>
                      <option value="Footwear">Footwear</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Condition</label>
                    <input 
                      type="text" 
                      value={fitCondition}
                      onChange={(e) => setFitCondition(e.target.value)}
                      placeholder="e.g. Mint Condition / Vintage Wash" 
                      className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Size</label>
                    <input 
                      type="text" 
                      value={fitSize}
                      onChange={(e) => setFitSize(e.target.value)}
                      placeholder="e.g. XL (Oversized)" 
                      className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                    />
                  </div>
                </div>

                {/* Store Location & Stall Number with Dynamic Auto-search */}
                <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                  <DynamicLocationSelector
                    value={thriftStoreLocation}
                    onChange={(loc) => setThriftStoreLocation(loc)}
                    label="Market / Store Location *"
                    placeholder="Search market (Gikomba, Toi, Ngara, Westlands) or estate stage..."
                  />

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 text-xs">Stall / Lane Details</label>
                    <input 
                      type="text" 
                      value={thriftStallNumber} 
                      onChange={(e) => setThriftStallNumber(e.target.value)} 
                      placeholder="e.g. Lane 3, Stall 4B, Opposite Posta"
                      className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-xs"
                    />
                  </div>
                </div>

                {/* Primary Photo Upload */}
                <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block text-xs">Primary Fit Cover Photo *</label>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-16 h-20 rounded-xl bg-cover bg-center shrink-0 border border-slate-300 dark:border-slate-700 shadow-sm relative group overflow-hidden"
                      style={{ backgroundImage: `url('${fitImg}')` }}
                    >
                      <button
                        type="button"
                        onClick={() => setFitImg('')}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white cursor-pointer"
                        title="Remove photo"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                    <label className="flex-1 cursor-pointer py-3 px-3 bg-white dark:bg-[#121113] border border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:border-[#E0533C] text-center transition">
                      <span className="text-[11px] font-bold text-[#E0533C] flex items-center justify-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" /> Upload Primary Fit File
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

                {/* Thrift Multi-Angle Gallery */}
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-700 dark:text-slate-300 text-xs block">Multi-Angle Gallery ({thriftGalleryImgs.length})</span>
                      <span className="text-[10px] text-slate-400">Add back angle, tag label, and fabric texture shots</span>
                    </div>
                    <label className="cursor-pointer text-[11px] font-extrabold text-[#E0533C] hover:underline flex items-center gap-1 bg-[#E0533C]/10 px-2.5 py-1 rounded-lg transition">
                      <Plus className="w-3 h-3" /> Add Angles
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleMultipleFilesChange(e, setThriftGalleryImgs)}
                      />
                    </label>
                  </div>
                  {thriftGalleryImgs.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto py-1">
                      {thriftGalleryImgs.map((imgUrl, idx) => (
                        <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-300 dark:border-slate-700 group">
                          <img src={imgUrl} alt="Gallery Angle" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setThriftGalleryImgs(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button 
                  type="button"
                  onClick={handlePublishThriftFit}
                  className="w-full py-3.5 bg-gradient-to-r from-[#2D6A4F] to-[#E0533C] text-white font-black rounded-2xl shadow-md hover:opacity-95 transition flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Publish Fit to LUKU
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: OFFICIAL VERIFIED BUSINESS PROFILE (SPEC 1) */}
          {/* ======================================================== */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#2D6A4F]" />
                    <div>
                      <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100">
                        Official Verified Business Profile
                      </h3>
                      <p className="text-[10px] text-slate-500">Name, Bio, Profile Pic, Discography & Pinned Images</p>
                    </div>
                  </div>
                  <span className="bg-emerald-100 dark:bg-emerald-950/80 text-[#2D6A4F] font-black text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Verified Badge
                  </span>
                </div>

                {/* Profile Pic & Cover */}
                <div className="relative">
                  <div 
                    className="h-28 rounded-2xl bg-cover bg-center border border-slate-300 dark:border-slate-700"
                    style={{ backgroundImage: `url('${currentBiz?.coverImage || currentBiz?.logo}')` }}
                  />
                  <div className="absolute -bottom-4 left-4 flex items-end gap-3">
                    <div 
                      className="w-16 h-16 rounded-2xl bg-cover bg-center border-4 border-white dark:border-[#1C1A1E] shadow-md"
                      style={{ backgroundImage: `url('${currentBiz?.logo}')` }}
                    />
                    <div className="mb-4">
                      <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1">
                        <span>{currentBiz?.name}</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#2D6A4F]" />
                      </h3>
                      <span className="text-[10px] text-slate-500">{currentBiz?.category} • {currentBiz?.neighborhood}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 space-y-2">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Official Bio</label>
                  <p className="p-3 bg-white dark:bg-[#121113] rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {currentBiz?.bio}
                  </p>
                </div>

                {/* Discography */}
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Disc3 className="w-3.5 h-3.5 text-[#E0533C]" />
                    <span>Business Discography & Showcase Media</span>
                  </h4>
                  <div className="space-y-1.5">
                    {(currentBiz?.discography && currentBiz.discography.length > 0 ? currentBiz.discography : [
                      'Official Opening Showcase Vol. 1',
                      'Nairobi Weekend Resident Set',
                      'Curated Lookbook 2026'
                    ]).map((disco, i) => (
                      <div key={i} className="p-2.5 bg-white dark:bg-[#121113] rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                        <span className="font-semibold">{disco}</span>
                        <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 px-2 py-0.5 rounded font-bold">Discography</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pinned Images */}
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-[#2D6A4F]" />
                    <span>Pinned Showcase Photos</span>
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {(currentBiz?.pinnedImages && currentBiz.pinnedImages.length > 0 ? currentBiz.pinnedImages : [
                      currentBiz?.logo || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop'
                    ]).map((pImg, i) => (
                      <div key={i} className="h-20 rounded-xl bg-cover bg-center border border-slate-300 dark:border-slate-700" style={{ backgroundImage: `url('${pImg}')` }} />
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsRegisteringAccount(true)}
                  className="w-full py-2.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold rounded-xl text-xs hover:opacity-90 transition"
                >
                  Register Another Business Account
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 6: ANALYTICS & METRICS */}
          {/* ======================================================== */}
          {activeTab === 'analytics' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-center shadow-xs">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Spot Impressions</span>
                  <p className="text-xl font-black text-[#E0533C] mt-0.5">3,420</p>
                  <span className="text-[9px] text-[#2D6A4F] font-bold">+24% this week</span>
                </div>
                <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-center shadow-xs">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Uber & Bolt Hails</span>
                  <p className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5">418</p>
                  <span className="text-[9px] text-[#2D6A4F] font-bold">Rides booked</span>
                </div>
                <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-center shadow-xs">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Ticket Passes</span>
                  <p className="text-xl font-black text-[#2D6A4F] mt-0.5">342</p>
                  <span className="text-[9px] text-slate-400">Synced to Vault</span>
                </div>
                <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-center shadow-xs">
                  <span className="text-[10px] text-slate-400 uppercase font-black">WhatsApp Orders</span>
                  <p className="text-xl font-black text-[#E9C46A] mt-0.5">76</p>
                  <span className="text-[9px] text-[#2D6A4F] font-bold">Customer inquiries</span>
                </div>
              </div>

              {/* Weekly Footfall Trend */}
              <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Nairobi Customer Activity (Last 7 Days)
                  </h4>
                  <span className="text-[10px] font-bold text-[#E0533C]">Peak: Fri & Sat</span>
                </div>
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
            </div>
          )}

        </div>

        {/* ACCOUNT REGISTRATION POPUP MODAL */}
        {isRegisteringAccount && (
          <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <form 
              onSubmit={handleRegisterBusiness}
              className="bg-white dark:bg-[#1C1A1E] text-slate-900 dark:text-slate-100 rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-black text-xs uppercase tracking-wider text-[#E0533C]">Register Business on RADA</h3>
                <button type="button" onClick={() => setIsRegisteringAccount(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold">Business Name *</label>
                <input 
                  type="text" 
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Hurlingham Choma Hub" 
                  className="w-full p-2 bg-[#F1F1EE] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold">Category</label>
                  <select
                    value={regCategory}
                    onChange={(e) => setRegCategory(e.target.value as BusinessCategory)}
                    className="w-full p-2 bg-[#F1F1EE] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                  >
                    <option value="hospitality">Spot / Venue / Bar / Cafe</option>
                    <option value="event_organizer">Event Promoter / Organizer</option>
                    <option value="thrift_store">Thrift Store / Luku Vendor</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold">Neighborhood</label>
                  <select
                    value={regNeighborhood}
                    onChange={(e) => setRegNeighborhood(e.target.value)}
                    className="w-full p-2 bg-[#F1F1EE] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                  >
                    <option value="Hurlingham">Hurlingham</option>
                    <option value="Westlands">Westlands</option>
                    <option value="Kilimani">Kilimani</option>
                    <option value="CBD">CBD</option>
                    <option value="Karen">Karen</option>
                    <option value="Lavington">Lavington</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-[#E0533C] to-[#E9C46A] text-white font-black text-xs rounded-xl shadow mt-2"
              >
                Create Official Account
              </button>
            </form>
          </div>
        )}

        {/* SUCCESS CONFIRMATION MODAL POPUP */}
        {successModalData && (
          <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#1C1A1E] text-slate-900 dark:text-slate-100 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                  {successModalData.categoryBadge}
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 pt-1">
                  {successModalData.title}
                </h3>
                <p className="text-xs font-bold text-[#E0533C]">
                  "{successModalData.listingName}"
                </p>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-[#F8F8F6] dark:bg-[#121113] p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                {successModalData.message}
              </p>

              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-[10px] text-amber-900 dark:text-amber-200 font-medium">
                📍 {successModalData.subDetails}
              </div>

              <button
                onClick={() => setSuccessModalData(null)}
                className="w-full py-2.5 bg-[#E0533C] text-white font-black rounded-xl text-xs shadow"
              >
                Done
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
