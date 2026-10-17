import React, { useState } from 'react';
import { 
  Store, 
  Ticket, 
  Shirt, 
  Plus, 
  Search, 
  CheckCircle2, 
  Edit3, 
  Trash2, 
  MapPin, 
  Clock, 
  Phone, 
  ExternalLink, 
  Sparkles, 
  Percent, 
  Tag, 
  ChevronRight, 
  Image as ImageIcon, 
  ArrowRight, 
  ShieldCheck, 
  CalendarDays, 
  Users, 
  Sliders, 
  DollarSign, 
  Flame, 
  Copy, 
  Check, 
  AlertCircle,
  Building2,
  Share2,
  RefreshCw,
  UtensilsCrossed,
  X,
  ArrowLeft,
  Upload,
  Camera
} from 'lucide-react';
import { 
  BusinessAccount, 
  BusinessCategory, 
  BusinessOffer, 
  OfferCategory,
  SpotItem, 
  SpotCategory,
  EventItem, 
  ThriftItem, 
  MenuItem, 
  ActivityItem,
  TicketTier, 
  Artist 
} from '../types.ts';
import { BusinessBadge } from './BusinessBadge.tsx';
import { DynamicLocationSelector } from './DynamicLocationSelector.tsx';

interface MerchantHubTabProps {
  businesses: BusinessAccount[];
  activeBusinessId: string;
  userId?: string;
  onSelectBusiness: (bizId: string) => void;
  onCreateBusiness: (newBiz: BusinessAccount) => Promise<string | null> | string | null | void;
  onUpdateBusiness: (updatedBiz: BusinessAccount) => void;
  spots: SpotItem[];
  onAddOrUpdateSpot: (spot: SpotItem) => void;
  onDeleteListing: (type: 'spot' | 'event' | 'thrift', id: number) => void;
  events: EventItem[];
  onAddEvent: (event: EventItem) => void;
  thriftItems: ThriftItem[];
  onAddThriftItem: (item: ThriftItem) => void;
  offers: BusinessOffer[];
  onCreateOffer: (offer: BusinessOffer) => void;
  onUpdateOffer: (offer: BusinessOffer) => void;
  onDeleteOffer: (offerId: string) => void;
  onClaimSpot: (spotId: number, businessId: string) => void;
  onReleaseSpot: (spotId: number) => void;
  onViewSpotDetails: (spot: SpotItem) => void;
  onViewEventDetails: (event: EventItem) => void;
  onOpenPublicProfile: (biz: BusinessAccount) => void;
  onClose?: () => void;
  showToast: (msg: string) => void;
}
export const MerchantHubTab: React.FC<MerchantHubTabProps> = ({
  businesses,
  activeBusinessId,
  userId,
  onSelectBusiness,
  onCreateBusiness,
  onUpdateBusiness,
  spots,
  onAddOrUpdateSpot,
  onDeleteListing,
  events,
  onAddEvent,
  thriftItems,
  onAddThriftItem,
  offers,
  onCreateOffer,
  onUpdateOffer,
  onDeleteOffer,
  onClaimSpot,
  onReleaseSpot,
  onViewSpotDetails,
  onViewEventDetails,
  onOpenPublicProfile,
  onClose,
  showToast
}) => {
// Only businesses actually owned by the logged-in merchant
const ownedBusinesses = businesses.filter(
  business => business.ownerId && business.ownerId === userId
);

// Safe fallback placeholder if they don't own any business yet
const currentBiz =
  ownedBusinesses.find(b => b.id === activeBusinessId) ||
  ownedBusinesses[0] || {
    id: 'placeholder-biz',
    ownerId: undefined,
    name: 'Your Business',
    category: 'hospitality',
    email: '',
    phone: '',
    whatsapp: '',
    neighborhood: 'Westlands',
    address: '',
    bio: '',
    logo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&auto=format&fit=crop',
    coverImage: '',
    verified: false,
    verificationStatus: 'pending',
    createdDate: new Date().toISOString().split('T')[0],
    discography: [],
    pinnedImages: []
  };

const [isOnboardingOpen, setIsOnboardingOpen] = useState(ownedBusinesses.length === 0);

  const [onboardingStep, setOnboardingStep] = useState<1 | 2>(1);

  // Active sub-tab inside the vertical dashboard
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'manage' | 'claim' | 'offers' | 'profile'>('overview');

  // Business Switcher Dropdown
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  // ----------------------------------------------------
  // ONBOARDING FORM STATE
  // ----------------------------------------------------
  const [onboardName, setOnboardName] = useState('');
  const [onboardBio, setOnboardBio] = useState('');
  const [onboardLogo, setOnboardLogo] = useState('');
  const [onboardEmail, setOnboardEmail] = useState('');
  const [onboardPhone, setOnboardPhone] = useState('+254 ');
  const [onboardWhatsapp, setOnboardWhatsapp] = useState('+254 ');
  const [onboardNeighborhood, setOnboardNeighborhood] = useState('Westlands');
  const [onboardAddress, setOnboardAddress] = useState('');
  const [onboardInstagram, setOnboardInstagram] = useState('@');
  const [selectedVertical, setSelectedVertical] = useState<BusinessCategory>('hospitality');

  // Quick preset logos for fast creation
  const presetLogos = [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop'
  ];

  const handleStartOnboarding = () => {
    setOnboardName('');
    setOnboardBio('');
    setOnboardLogo(presetLogos[0]);
    setOnboardEmail('');
    setOnboardPhone('+254 ');
    setOnboardWhatsapp('+254 ');
    setOnboardNeighborhood('Westlands');
    setOnboardAddress('');
    setOnboardInstagram('@');
    setSelectedVertical('hospitality');
    setOnboardingStep(1);
    setIsOnboardingOpen(true);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleCompleteOnboarding = async () => {
    if (isSubmitting) return;
    setSubmitError('');
    if (!onboardName.trim()) {
      setSubmitError('Please enter your business name (go back to the profile step).');
      showToast('Please enter your business name.');
      setOnboardingStep(1);
      return;
    }
    if (!userId) {
      setSubmitError('You are not signed in. Sign in first, then create your merchant account.');
      showToast('Please sign in first to create a merchant account.');
      return;
    }

    const newBizId = `biz-${Date.now()}`;
    const newBiz: BusinessAccount = {
      id: newBizId,
      ownerId: userId,
      name: onboardName.trim(),
      category: selectedVertical,
      email: onboardEmail || 'contact@business.ke',
      phone: onboardPhone || '+254 700 000 000',
      whatsapp: onboardWhatsapp.replace(/\s+/g, '') || '+254700000000',
      neighborhood: onboardNeighborhood,
      address: onboardAddress || `${onboardNeighborhood}, Nairobi`,
      bio: onboardBio || `Official ${selectedVertical === 'hospitality' ? 'Spot' : selectedVertical === 'event_organizer' ? 'Event Organizer' : 'Luku Thrift Store'} verified on RADA.`,
      logo: onboardLogo || presetLogos[0],
      coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop',
      verified: false,
      verificationStatus: 'pending',
      instagram: onboardInstagram,
      createdDate: new Date().toISOString().split('T')[0],
      discography: [
        `${onboardName.trim()} Curated Showcase 2026`,
        'Official Resident Highlights'
      ],
      pinnedImages: [
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop'
      ]
    };

    setIsSubmitting(true);
    try {
      // App.handleCreateBusiness saves to Supabase (once) and updates local state.
      const err = await onCreateBusiness(newBiz);
      if (typeof err === 'string' && err) {
        console.error('Create business error:', err);
        setSubmitError(`Could not save business: ${err}`);
        showToast(`Could not save business: ${err}`);
        return;
      }
      onSelectBusiness(newBizId);
      setIsOnboardingOpen(false);
      setActiveSubTab('overview');
      showToast(`Welcome! ${newBiz.name} submitted for admin review.`);
    } catch (e) {
      console.error('Onboarding failed:', e);
      setSubmitError(`Something went wrong: ${e instanceof Error ? e.message : String(e)}`);
      showToast('Something went wrong saving your business.');
    } finally {
      setIsSubmitting(false);
    }
  };


  // ----------------------------------------------------
  // SPOT MERCHANT: CREATE / EDIT SPOT FORM
  // ----------------------------------------------------
  const [isSpotFormOpen, setIsSpotFormOpen] = useState(false);
  const [editingSpotId, setEditingSpotId] = useState<number | null>(null);
  const [spotTitle, setSpotTitle] = useState('');
  const [spotCategory, setSpotCategory] = useState<SpotCategory>('restaurants');
  const [spotNeighborhood, setSpotNeighborhood] = useState('Westlands');
  const [spotAddress, setSpotAddress] = useState('');
  const [spotExactLocationTag, setSpotExactLocationTag] = useState('');
  const [spotLandmark, setSpotLandmark] = useState('');
  const [spotPrice, setSpotPrice] = useState('KES $$');
  const [spotPhone, setSpotPhone] = useState('+254 ');
  const [spotOpeningHours, setSpotOpeningHours] = useState('11:00 AM - 11:00 PM');
  const [spotDescription, setSpotDescription] = useState('');
  const [spotCoverImg, setSpotCoverImg] = useState('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop');
  const [spotGalleryImgs, setSpotGalleryImgs] = useState<string[]>([]);
  const [newGalleryInput, setNewGalleryInput] = useState('');
  const [spotMenuItems, setSpotMenuItems] = useState<MenuItem[]>([]);
  const [newMenuName, setNewMenuName] = useState('');
  const [newMenuPrice, setNewMenuPrice] = useState('KES ');
  const [newMenuCategory, setNewMenuCategory] = useState('Mains');
  const [newMenuDesc, setNewMenuDesc] = useState('');

  // Native file upload handlers for Spot Cover Image and Gallery
  const handleSpotCoverFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setSpotCoverImg(reader.result);
        showToast('Cover photo uploaded successfully!');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSpotGalleryFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setSpotGalleryImgs(prev => [...prev, ...results]);
      showToast(`Added ${results.length} photo(s) to gallery.`);
    });
  };

  const handleRemoveGalleryImage = (indexToRemove: number) => {
    setSpotGalleryImgs(prev => prev.filter((_, idx) => idx !== indexToRemove));
    showToast('Gallery image removed.');
  };

  const openCreateSpotModal = () => {
    setEditingSpotId(null);
    setSpotTitle(currentBiz?.name || '');
    setSpotCategory('restaurants');
    setSpotNeighborhood(currentBiz?.neighborhood || 'Westlands');
    setSpotAddress(currentBiz?.address || 'Westlands, Nairobi');
    setSpotExactLocationTag(`${currentBiz?.address || 'Westlands'}, near Stage`);
    setSpotLandmark('Nearest Stage / Roundabout');
    setSpotPrice('KES $$');
    setSpotPhone(currentBiz?.phone || '+254 ');
    setSpotOpeningHours('12:00 PM - 01:00 AM');
    setSpotDescription(currentBiz?.bio || '');
    setSpotCoverImg('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop');
    setSpotGalleryImgs(['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop']);
    setSpotMenuItems([
      { id: 'm-init-1', name: 'Signature House Dish', category: 'Mains', price: 'KES 1,200', description: 'Fresh local ingredients crafted by our head chef' }
    ]);
    setIsSpotFormOpen(true);
  };

  const openEditSpotModal = (spot: SpotItem) => {
    setEditingSpotId(spot.id);
    setSpotTitle(spot.title);
    setSpotCategory(spot.category);
    setSpotNeighborhood(spot.neighborhood);
    setSpotAddress(spot.address);
    setSpotExactLocationTag(spot.exactLocationTag || '');
    setSpotLandmark(spot.landmark || '');
    setSpotPrice(spot.price);
    setSpotPhone(spot.phone || '');
    setSpotOpeningHours(spot.openingHours || '11:00 AM - 11:00 PM');
    setSpotDescription(spot.description || '');
    setSpotCoverImg(spot.img);
    setSpotGalleryImgs(spot.images && spot.images.length > 0 ? spot.images : [spot.img]);
    setSpotMenuItems(spot.menuItems || []);
    setIsSpotFormOpen(true);
  };

  const handleSaveSpot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spotTitle.trim()) {
      showToast('Please enter a spot title.');
      return;
    }

    const targetId = editingSpotId || Date.now();
    const existing = spots.find(s => s.id === targetId);

    const savedSpot: SpotItem = {
      id: targetId,
      title: spotTitle.trim(),
      category: spotCategory,
      neighborhood: spotNeighborhood,
      address: spotAddress || `${spotNeighborhood}, Nairobi`,
      exactLocationTag: spotExactLocationTag || `${spotNeighborhood}, Nairobi`,
      landmark: spotLandmark || 'Central Stage',
      lat: existing?.lat || -1.2675,
      lng: existing?.lng || 36.8115,
      rating: existing?.rating || '4.8',
      reviewCount: existing?.reviewCount || 12,
      price: spotPrice || 'KES $$',
      img: spotCoverImg,
      images: spotGalleryImgs.length > 0 ? spotGalleryImgs : [spotCoverImg],
      description: spotDescription || 'Verified spot on RADA.',
      phone: spotPhone,
      openingHours: spotOpeningHours,
      businessId: currentBiz.id,
      isUserUploaded: false,
      menuItems: spotMenuItems,
      reviews: existing?.reviews || []
    };

    onAddOrUpdateSpot(savedSpot);
    setIsSpotFormOpen(false);
    showToast(editingSpotId ? `Updated "${savedSpot.title}" details.` : `Spot "${savedSpot.title}" published live!`);
  };

  // Add menu item in spot form
  const handleAddMenuItem = () => {
    if (!newMenuName.trim()) return;
    const item: MenuItem = {
      id: `m-${Date.now()}`,
      name: newMenuName.trim(),
      price: newMenuPrice.trim() || 'KES 800',
      category: newMenuCategory.trim() || 'Mains',
      description: newMenuDesc.trim() || 'Artisanal preparation.'
    };
    setSpotMenuItems(prev => [...prev, item]);
    setNewMenuName('');
    setNewMenuPrice('KES ');
    setNewMenuDesc('');
    showToast(`Added ${item.name} to menu!`);
  };

  // ----------------------------------------------------
  // SPOT CLAIMING SEARCH UTILITY (EXCLUSIVE TO SPOTS)
  // ----------------------------------------------------
  const [claimSearchQuery, setClaimSearchQuery] = useState('');
  const claimableCommunitySpots = spots.filter(s => {
    // Spot is claimable if it was user-uploaded or has no businessId or is not claimed by current biz
    const isUnclaimedOrUserUploaded = s.isUserUploaded || !s.businessId || s.businessId !== currentBiz?.id;
    if (!isUnclaimedOrUserUploaded) return false;

    if (!claimSearchQuery.trim()) return true;
    const q = claimSearchQuery.toLowerCase().trim();
    return (
      s.title.toLowerCase().includes(q) ||
      s.neighborhood.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.address.toLowerCase().includes(q)
    );
  });

  // Spots owned by current business
  const myClaimedSpots = spots.filter(s => s.businessId === currentBiz?.id);

  // ----------------------------------------------------
  // EVENT ORGANIZER WORKFLOW STATE (Full-Screen + Multi-Image + Dynamic Locations)
  // ----------------------------------------------------
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventCategory, setEventCategory] = useState<'concerts' | 'nightlife' | 'art' | 'cinemas'>('concerts');
  const [eventGenre, setEventGenre] = useState('Afrobeats & Amapiano');
  const [eventDate, setEventDate] = useState('Sat, 28 Nov 2026');
  const [eventTime, setEventTime] = useState('08:00 PM - 04:00 AM');
  const [eventLocation, setEventLocation] = useState('Westlands, Nairobi');
  const [eventExactLocationTag, setEventExactLocationTag] = useState('');
  const [eventUrl, setEventUrl] = useState('https://hustlesasa.com/');
  const [eventImg, setEventImg] = useState('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop');
  const [eventGalleryImgs, setEventGalleryImgs] = useState<string[]>([]);
  const [eventDescription, setEventDescription] = useState('');
  const [eventTiers, setEventTiers] = useState<TicketTier[]>([
    { name: 'Early Bird Pass', price: 'KES 1,500', perks: 'Fast-track entry' },
    { name: 'Regular Gate', price: 'KES 2,000', perks: 'All-night access' },
    { name: 'VIP Pass Lounge', price: 'KES 4,500', perks: 'VIP bar access & welcome drink' }
  ]);
  const [newTierName, setNewTierName] = useState('');
  const [newTierPrice, setNewTierPrice] = useState('KES ');
  const [newTierPerks, setNewTierPerks] = useState('');

  const [eventArtists, setEventArtists] = useState<Artist[]>([
    { name: 'DJ Joe Mfalme', role: 'Main Stage Headliner', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop' }
  ]);
  const [newArtistName, setNewArtistName] = useState('');
  const [newArtistRole, setNewArtistRole] = useState('Guest DJ / Performer');

  // Native file upload handlers for Event Poster and Gallery
  const handleEventPosterFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setEventImg(reader.result);
        showToast('Event artwork poster uploaded successfully!');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleEventGalleryFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setEventGalleryImgs(prev => [...prev, ...results]);
      showToast(`Added ${results.length} photo(s) to event gallery.`);
    });
  };

  const handleRemoveEventGalleryImage = (indexToRemove: number) => {
    setEventGalleryImgs(prev => prev.filter((_, idx) => idx !== indexToRemove));
    showToast('Event gallery image removed.');
  };

  const openCreateEventModal = () => {
    setEditingEventId(null);
    setEventTitle('');
    setEventCategory('concerts');
    setEventGenre('Afrobeats & Amapiano');
    setEventDate('Sat, 28 Nov 2026');
    setEventTime('08:00 PM - 04:00 AM');
    setEventLocation(currentBiz?.address || 'Westlands, Nairobi');
    setEventExactLocationTag('Courtyard / Arena Main Stage');
    setEventUrl('https://hustlesasa.com/');
    setEventImg('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop');
    setEventGalleryImgs(['https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop']);
    setEventDescription('Official event curated by ' + currentBiz?.name);
    setEventArtists([
      { name: 'DJ Joe Mfalme', role: 'Main Stage Headliner', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop' }
    ]);
    setEventTiers([
      { name: 'Early Bird Pass', price: 'KES 1,500', perks: 'Fast-track entry' },
      { name: 'Regular Gate', price: 'KES 2,000', perks: 'All-night access' },
      { name: 'VIP Pass Lounge', price: 'KES 4,500', perks: 'VIP bar access & welcome drink' }
    ]);
    setIsEventFormOpen(true);
  };

  const openEditEventModal = (evt: EventItem) => {
    setEditingEventId(evt.id);
    setEventTitle(evt.title);
    setEventCategory(evt.category);
    setEventGenre(evt.genre || 'Afrobeats & Amapiano');
    setEventDate(evt.date);
    setEventTime(evt.time || '08:00 PM - 04:00 AM');
    setEventLocation(evt.location);
    setEventExactLocationTag(evt.location);
    setEventUrl(evt.url || 'https://hustlesasa.com/');
    setEventImg(evt.img);
    setEventGalleryImgs(evt.images && evt.images.length > 0 ? evt.images : [evt.img]);
    setEventDescription(evt.description || '');
    setEventArtists(evt.artists || []);
    setEventTiers(evt.tiers || []);
    setIsEventFormOpen(true);
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) {
      showToast('Please enter an event title.');
      return;
    }
    const finalLocation = eventExactLocationTag.trim() && !eventLocation.includes(eventExactLocationTag.trim())
      ? `${eventLocation} • ${eventExactLocationTag.trim()}`
      : eventLocation;

    const newEvt: EventItem = {
      id: editingEventId || Date.now(),
      title: eventTitle.trim(),
      category: eventCategory,
      genre: eventGenre,
      date: eventDate,
      time: eventTime,
      location: finalLocation,
      lat: -1.2675,
      lng: 36.8115,
      img: eventImg,
      images: eventGalleryImgs.length > 0 ? eventGalleryImgs : [eventImg],
      goingCount: editingEventId ? (events.find(e => e.id === editingEventId)?.goingCount || 1) : 1,
      url: eventUrl || 'https://hustlesasa.com/',
      description: eventDescription,
      businessId: currentBiz.id,
      artists: eventArtists,
      tiers: eventTiers
    };
    onAddEvent(newEvt);
    setIsEventFormOpen(false);
    showToast(editingEventId ? `Event "${newEvt.title}" updated successfully!` : `Event "${newEvt.title}" published live with verified ticketing!`);
  };

  const myEvents = events.filter(e => e.businessId === currentBiz?.id);

  // ----------------------------------------------------
  // THRIFT / LUKU SELLER WORKFLOW STATE (Full-Screen + Multi-Image + Dynamic Locations)
  // ----------------------------------------------------
  const [isThriftFormOpen, setIsThriftFormOpen] = useState(false);
  const [editingThriftId, setEditingThriftId] = useState<number | null>(null);
  const [thriftName, setThriftName] = useState('');
  const [thriftPrice, setThriftPrice] = useState('KES 1,800');
  const [thriftCategory, setThriftCategory] = useState('Jackets');
  const [thriftCondition, setThriftCondition] = useState('Thrift Grade A');
  const [thriftSize, setThriftSize] = useState('L');
  const [thriftStoreLoc, setThriftStoreLoc] = useState(currentBiz?.address || 'Gikomba Market, Nairobi');
  const [thriftStallNumber, setThriftStallNumber] = useState('Stall 4B');
  const [thriftImg, setThriftImg] = useState('https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop');
  const [thriftGalleryImgs, setThriftGalleryImgs] = useState<string[]>([]);

  // Native file upload handlers for Thrift Fit and Multi-Angle Gallery
  const handleThriftCoverFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setThriftImg(reader.result);
        showToast('Main fit photo uploaded successfully!');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleThriftGalleryFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setThriftGalleryImgs(prev => [...prev, ...results]);
      showToast(`Added ${results.length} angle photo(s) to garment gallery.`);
    });
  };

  const handleRemoveThriftGalleryImage = (indexToRemove: number) => {
    setThriftGalleryImgs(prev => prev.filter((_, idx) => idx !== indexToRemove));
    showToast('Garment photo removed.');
  };

  const openCreateThriftModal = () => {
    setEditingThriftId(null);
    setThriftName('');
    setThriftPrice('KES 1,800');
    setThriftCategory('Jackets');
    setThriftCondition('Thrift Grade A');
    setThriftSize('L (Oversized)');
    setThriftStoreLoc(currentBiz?.address || 'Gikomba Market, Nairobi');
    setThriftStallNumber('Lane 3, Stall 4B');
    setThriftImg('https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop');
    setThriftGalleryImgs(['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&auto=format&fit=crop']);
    setIsThriftFormOpen(true);
  };

  const openEditThriftModal = (item: ThriftItem) => {
    setEditingThriftId(item.id);
    setThriftName(item.name);
    setThriftPrice(item.price);
    setThriftCategory(item.category);
    setThriftCondition(item.condition);
    setThriftSize(item.size);
    setThriftStoreLoc(item.storeLocation);
    setThriftStallNumber(item.stallNumber || '');
    setThriftImg(item.img);
    setThriftGalleryImgs(item.images && item.images.length > 0 ? item.images : [item.img]);
    setIsThriftFormOpen(true);
  };

  const handleSaveThrift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!thriftName.trim()) {
      showToast('Please enter item name.');
      return;
    }
    const item: ThriftItem = {
      id: editingThriftId || Date.now(),
      name: thriftName.trim(),
      price: thriftPrice.startsWith('KES') ? thriftPrice : `KES ${thriftPrice}`,
      seller: currentBiz.name,
      storeLocation: thriftStoreLoc,
      stallNumber: thriftStallNumber,
      category: thriftCategory,
      condition: thriftCondition,
      size: thriftSize,
      img: thriftImg,
      images: thriftGalleryImgs.length > 0 ? thriftGalleryImgs : [thriftImg],
      verified: true,
      businessId: currentBiz.id,
      whatsapp: currentBiz.whatsapp
    };
    onAddThriftItem(item);
    setIsThriftFormOpen(false);
    showToast(editingThriftId ? `"${item.name}" updated in LUKU catalog!` : `"${item.name}" listed in LUKU catalog!`);
  };

  const myThriftItems = thriftItems.filter(t => t.businessId === currentBiz?.id || t.seller === currentBiz?.name);

  // ----------------------------------------------------
  // DECOUPLED OFFERS & PROMOTIONS MANAGEMENT
  // ----------------------------------------------------
  const [isOfferFormOpen, setIsOfferFormOpen] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDesc, setOfferDesc] = useState('');
  const [offerCategory, setOfferCategory] = useState<OfferCategory>('Drinks');
  const [offerDiscount, setOfferDiscount] = useState('BUY 1 GET 1');
  const [offerPosterUrl, setOfferPosterUrl] = useState('https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop');
  const [offerValidUntil, setOfferValidUntil] = useState('Valid this weekend');
  const [offerClaimCode, setOfferClaimCode] = useState('RADA-DEAL');

  const openCreateOfferModal = () => {
    setEditingOfferId(null);
    setOfferTitle('');
    setOfferDesc('');
    setOfferCategory(currentBiz?.category === 'event_organizer' ? 'Tickets' : currentBiz?.category === 'thrift_store' ? 'Apparel' : 'Drinks');
    setOfferDiscount(currentBiz?.category === 'event_organizer' ? '15% OFF VIP' : currentBiz?.category === 'thrift_store' ? 'BUNDLE DEAL' : 'BUY 1 GET 1');
    setOfferPosterUrl(currentBiz?.coverImage || 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop');
    setOfferValidUntil('Valid through end of month');
    setOfferClaimCode(`RADA-${Math.random().toString(36).substring(2, 6).toUpperCase()}`);
    setIsOfferFormOpen(true);
  };

  const openEditOfferModal = (offer: BusinessOffer) => {
    setEditingOfferId(offer.id);
    setOfferTitle(offer.title);
    setOfferDesc(offer.description);
    setOfferCategory(offer.category);
    setOfferDiscount(offer.discount);
    setOfferPosterUrl(offer.posterUrl || currentBiz?.coverImage || '');
    setOfferValidUntil(offer.validUntil || 'Valid this month');
    setOfferClaimCode(offer.claimCode || 'RADA-DEAL');
    setIsOfferFormOpen(true);
  };

  const handleSaveOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerTitle.trim()) {
      showToast('Please enter an offer title.');
      return;
    }

    const offerPayload: BusinessOffer = {
      id: editingOfferId || `off-${Date.now()}`,
      businessId: currentBiz.id,
      businessName: currentBiz.name,
      businessCategory: currentBiz.category,
      title: offerTitle.trim(),
      description: offerDesc.trim() || 'Exclusive promotion verified on RADA.',
      category: offerCategory,
      discount: offerDiscount.trim() || 'SPECIAL DEAL',
      posterUrl: offerPosterUrl,
      validUntil: offerValidUntil.trim() || 'Valid while stocks last',
      claimCode: offerClaimCode.trim() || 'RADADEAL',
      createdAt: new Date().toISOString().split('T')[0]
    };

    if (editingOfferId) {
      onUpdateOffer(offerPayload);
      showToast('Promotional offer updated!');
    } else {
      onCreateOffer(offerPayload);
      showToast('New promotion live on Home running feed!');
    }

    setIsOfferFormOpen(false);
  };

  // Offers belonging to active business
  const myOffers = offers.filter(o => o.businessId === currentBiz?.id);

  // ----------------------------------------------------
  // RENDER: ONBOARDING VIEW
  // ----------------------------------------------------
  if (isOnboardingOpen || !currentBiz) {
    return (
      <div className="min-h-screen bg-[#FBFBF9] dark:bg-[#121113] text-slate-900 dark:text-slate-100 pb-28 px-4 py-6">
        <div className="max-w-md mx-auto">
          {/* Top Bar with Cancel / Exit if businesses exist */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#E0533C] to-[#E9C46A] flex items-center justify-center text-white shadow-md">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">Merchant Onboarding</h1>
                <p className="text-xs text-slate-500 font-medium">Step {onboardingStep} of 2</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {businesses.length > 0 && (
                <button 
                  onClick={() => setIsOnboardingOpen(false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-white dark:bg-[#1C1A1E] px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>Dashboard</span>
                </button>
              )}
              {onClose && (
                <button 
                  onClick={onClose}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-white dark:bg-[#1C1A1E] px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 flex items-center gap-1 cursor-pointer"
                  title="Close Merchant Hub"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Exit</span>
                </button>
              )}
            </div>
          </div>

          {/* Stepper progress indicator */}
          <div className="flex items-center gap-2 mb-8">
            <div className={`flex-1 h-1.5 rounded-full transition-all ${onboardingStep >= 1 ? 'bg-[#E0533C]' : 'bg-slate-200 dark:bg-slate-800'}`} />
            <div className={`flex-1 h-1.5 rounded-full transition-all ${onboardingStep >= 2 ? 'bg-[#E0533C]' : 'bg-slate-200 dark:bg-slate-800'}`} />
          </div>

          {/* STEP 1: MASTER BUSINESS PROFILE CREATION */}
          {onboardingStep === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-200">
              <div className="bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-2 text-[#E0533C] font-extrabold text-xs uppercase tracking-wider mb-2">
                  <Building2 className="w-4 h-4" />
                  <span>Step 1: Master Business Identity</span>
                </div>
                <h2 className="text-lg font-black tracking-tight">Create your business presence</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Establish your brand on Nairobi's premier guide. This information is displayed across your listings and public profile.
                </p>

                <div className="space-y-4 mt-6">
                  {/* Business Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Business Name <span className="text-[#E0533C]">*</span>
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. Ink & Drink Lounge, Nairobi Waves, 90s Vintage"
                      value={onboardName}
                      onChange={(e) => setOnboardName(e.target.value)}
                      className="w-full text-sm bg-[#FBFBF9] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 focus:outline-none focus:border-[#E0533C]"
                    />
                  </div>

                  {/* Global Bio */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Global Bio / Tagline
                    </label>
                    <textarea 
                      rows={3}
                      placeholder="Tell Nairobi what makes your venue, rave, or streetwear drop extraordinary..."
                      value={onboardBio}
                      onChange={(e) => setOnboardBio(e.target.value)}
                      className="w-full text-sm bg-[#FBFBF9] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 focus:outline-none focus:border-[#E0533C]"
                    />
                  </div>

                  {/* Profile Logo / Picture */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Profile Picture / Logo *
                    </label>
                    <div className="flex items-center gap-3">
                      <img 
                        src={onboardLogo || presetLogos[0]} 
                        alt="Logo Preview" 
                        className="w-14 h-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs shrink-0" 
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="cursor-pointer px-3 py-1.5 bg-[#E0533C] hover:bg-[#d04630] text-white text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5 shadow-xs">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Photo</span>
                            <input 
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    if (event.target?.result) {
                                      setOnboardLogo(event.target.result as string);
                                      showToast('Profile photo selected!');
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                          {onboardLogo && (
                            <button
                              type="button"
                              onClick={() => setOnboardLogo('')}
                              className="px-2.5 py-1.5 text-xs text-red-500 hover:text-red-600 font-bold border border-red-200 dark:border-red-900/50 rounded-xl"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400">Or pick preset:</span>
                          {presetLogos.map((preset, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setOnboardLogo(preset)}
                              className={`w-6 h-6 rounded-lg overflow-hidden border ${onboardLogo === preset ? 'ring-2 ring-[#E0533C]' : 'opacity-70'}`}
                            >
                              <img src={preset} alt="preset" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Neighborhood & Address */}
                  <div className="space-y-3 pt-2">
                    <DynamicLocationSelector
                      value={onboardNeighborhood}
                      onChange={(loc) => setOnboardNeighborhood(loc)}
                      label="Neighborhood / Location Area *"
                      placeholder="Search neighborhood, sub-location or type custom..."
                    />

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Full Address / Building / Stall Number
                      </label>
                      <input 
                        type="text"
                        placeholder="e.g. Mpaka Rd, 2nd Floor / Gikomba Stall 4B"
                        value={onboardAddress}
                        onChange={(e) => setOnboardAddress(e.target.value)}
                        className="w-full text-xs sm:text-sm bg-[#FBFBF9] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 font-medium focus:outline-none focus:border-[#E0533C]"
                      />
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Phone Number
                      </label>
                      <input 
                        type="text"
                        placeholder="+254 700 000 000"
                        value={onboardPhone}
                        onChange={(e) => setOnboardPhone(e.target.value)}
                        className="w-full text-xs bg-[#FBFBF9] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-2.5 focus:outline-none focus:border-[#E0533C]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        WhatsApp (Orders)
                      </label>
                      <input 
                        type="text"
                        placeholder="+254 700 000 000"
                        value={onboardWhatsapp}
                        onChange={(e) => setOnboardWhatsapp(e.target.value)}
                        className="w-full text-xs bg-[#FBFBF9] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-2.5 focus:outline-none focus:border-[#E0533C]"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!onboardName.trim()) {
                      showToast('Please specify a Business Name first.');
                      return;
                    }
                    setOnboardingStep(2);
                  }}
                  className="w-full mt-8 bg-[#E0533C] hover:bg-[#c9432d] text-white font-black text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-[0.99] transition cursor-pointer"
                >
                  <span>Continue to Vertical Selection</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: VERTICAL SELECTION */}
          {onboardingStep === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-3 duration-200">
              <div className="bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-2 text-[#E0533C] font-extrabold text-xs uppercase tracking-wider mb-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Step 2: Choose Merchant Vertical</span>
                </div>
                <h2 className="text-lg font-black tracking-tight">Select your operation model</h2>
                <p className="text-xs text-slate-500 mt-1">
                  We customize your dashboard tools, listing capabilities, and verification badge to match your vertical precisely.
                </p>

                {/* 3 Vertical Options */}
                <div className="space-y-3 mt-6">
                  {/* Vertical 1: Spot Merchant */}
                  <div 
                    onClick={() => setSelectedVertical('hospitality')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      selectedVertical === 'hospitality'
                        ? 'border-amber-500 bg-amber-500/5 ring-2 ring-amber-500/20 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-[#FBFBF9] dark:bg-[#121113]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                          <Store className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-sm text-slate-900 dark:text-slate-100">Spot Merchant</h3>
                            <BusinessBadge businessId={currentBiz.id} category="hospitality" size="xs" />
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium">Restaurants, Clubs, Lounges, Cafes & Hotels</p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        selectedVertical === 'hospitality' ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {selectedVertical === 'hospitality' && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                    <ul className="text-[10px] text-slate-500 space-y-1 mt-3 pl-1 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-amber-500 shrink-0" />
                        <span>Interactive Digital Menu builder with prices</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-amber-500 shrink-0" />
                        <span>Exact location tags with nearest Bus Stop & Landmark</span>
                      </li>
                      <li className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
                        <Sparkles className="w-3 h-3 shrink-0" />
                        <span>EXCLUSIVE: Search & Claim community user-uploaded spots</span>
                      </li>
                    </ul>
                  </div>

                  {/* Vertical 2: Event Organizer */}
                  <div 
                    onClick={() => setSelectedVertical('event_organizer')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      selectedVertical === 'event_organizer'
                        ? 'border-purple-500 bg-purple-500/5 ring-2 ring-purple-500/20 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-[#FBFBF9] dark:bg-[#121113]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                          <Ticket className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-sm text-slate-900 dark:text-slate-100">Event Organizer</h3>
                            <BusinessBadge businessId={currentBiz.id} category="event_organizer" size="xs" />
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium">Parties, Raves, Concerts, Festivals & Art Shows</p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        selectedVertical === 'event_organizer' ? 'border-purple-500 bg-purple-500 text-white' : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {selectedVertical === 'event_organizer' && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                    <ul className="text-[10px] text-slate-500 space-y-1 mt-3 pl-1 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-purple-500 shrink-0" />
                        <span>Direct ticketing links (HustleSasa, Tikiti, Mtickets)</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-purple-500 shrink-0" />
                        <span>Tiered ticketing passes & multi-artist lineup manager</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-purple-500 shrink-0" />
                        <span>Primary Ticketing Verified authenticity badge</span>
                      </li>
                    </ul>
                  </div>

                  {/* Vertical 3: Thrift / Luku Seller */}
                  <div 
                    onClick={() => setSelectedVertical('thrift_store')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      selectedVertical === 'thrift_store'
                        ? 'border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/20 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-[#FBFBF9] dark:bg-[#121113]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                          <Shirt className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-sm text-slate-900 dark:text-slate-100">Thrift & Luku Seller</h3>
                            <BusinessBadge businessId={currentBiz.id} category="thrift_store" size="xs" />
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium">Vintage Apparel, Streetwear & Market Stalls</p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        selectedVertical === 'thrift_store' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {selectedVertical === 'thrift_store' && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                    <ul className="text-[10px] text-slate-500 space-y-1 mt-3 pl-1 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span>Direct sync with RADA's "LUKU: What to wear" engine</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span>Condition rating (Vintage Mint, Grade A) & sizing matrix</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span>Instant WhatsApp order trigger & Gikomba/Toi stall routing</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {submitError && (
                  <div className="mt-6 rounded-2xl border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 text-red-800 dark:text-red-200 text-xs font-semibold p-3 break-words">
                    {submitError}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-8">
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(1)}
                    className="w-full sm:w-auto sm:px-6 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs py-3.5 rounded-2xl transition text-center shrink-0 order-2 sm:order-1 cursor-pointer"
                  >
                    Back to Profile
                  </button>
                  <button
                    type="button"
                    onClick={handleCompleteOnboarding}
                    disabled={isSubmitting}
                    className="w-full flex-1 bg-[#E0533C] hover:bg-[#c9432d] disabled:opacity-60 disabled:cursor-not-allowed text-white font-extrabold text-xs sm:text-sm px-6 py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-[0.99] transition cursor-pointer leading-tight text-center whitespace-normal order-1 sm:order-2"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{isSubmitting ? 'Launching…' : 'Launch Merchant Dashboard'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: FULL DEDICATED MERCHANT DASHBOARD VIEWPORT
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-[#FBFBF9] dark:bg-[#121113] text-slate-900 dark:text-slate-100 pb-28">
      {/* Top Merchant Workspace Banner */}
      <div className="bg-white dark:bg-[#1C1A1E] border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            {/* Merchant Identity & Account Switcher */}
            <div className="relative flex-1 min-w-0">
              <button 
                onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                className="flex items-center gap-2.5 text-left group w-full truncate"
              >
                <img 
                  src={currentBiz.logo} 
                  alt={currentBiz.name} 
                  className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0" 
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <h2 className="font-black text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-[#E0533C] transition">
                      {currentBiz.name}
                    </h2>
                    <span className="text-[10px] text-slate-400">▼</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <BusinessBadge businessId={currentBiz.id} category={currentBiz.category} size="xs" />
                  </div>
                </div>
              </button>

              {/* Business Switcher Dropdown */}
              {isSwitcherOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Your Merchant Accounts ({ownedBusinesses.length})
                  </div>
                  <div className="space-y-1">
                    {ownedBusinesses.map((biz) => (
                      <button
                        key={biz.id}
                        onClick={() => {
                          onSelectBusiness(biz.id);
                          setIsSwitcherOpen(false);
                          showToast(`Switched to ${biz.name}`);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between text-xs transition ${
                          biz.id === currentBiz.id
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-[#E0533C] font-bold'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img src={biz.logo} alt={biz.name} className="w-6 h-6 rounded-lg object-cover" />
                          <span className="truncate">{biz.name}</span>
                        </div>
                        <BusinessBadge businessId={biz.id} category={biz.category} size="xs" />
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 mt-2 pt-2">
                    <button
                      onClick={() => {
                        setIsSwitcherOpen(false);
                        handleStartOnboarding();
                      }}
                      className="w-full text-left p-2 rounded-xl text-xs font-bold text-[#E0533C] hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add New Merchant Account</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button 
                onClick={() => onOpenPublicProfile(currentBiz)}
                className="text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition flex items-center gap-1 cursor-pointer"
                title="View your public merchant storefront"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Storefront</span>
              </button>

              {onClose && (
                <button
                  onClick={onClose}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center gap-1 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
                  title="Close Merchant Hub"
                  aria-label="Close Merchant Hub"
                >
                  <X className="w-4 h-4" />
                  <span>Exit</span>
                </button>
              )}
            </div>
          </div>

          {/* Sub Navigation Bar for this Vertical */}
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <button
              onClick={() => setActiveSubTab('overview')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                activeSubTab === 'overview'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              Overview
            </button>

            {/* Spot Merchant Specific Tabs */}
            {currentBiz.category === 'hospitality' && (
              <>
                <button
                  onClick={() => setActiveSubTab('manage')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                    activeSubTab === 'manage'
                      ? 'bg-[#E0533C] text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>My Spots ({myClaimedSpots.length})</span>
                </button>

                <button
                  onClick={() => setActiveSubTab('claim')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                    activeSubTab === 'claim'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Claim Spots</span>
                </button>
              </>
            )}

            {/* Event Organizer Specific Tabs */}
            {currentBiz.category === 'event_organizer' && (
              <button
                onClick={() => setActiveSubTab('manage')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  activeSubTab === 'manage'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>Events Suite ({myEvents.length})</span>
              </button>
            )}

            {/* Thrift Store Specific Tabs */}
            {currentBiz.category === 'thrift_store' && (
              <button
                onClick={() => setActiveSubTab('manage')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  activeSubTab === 'manage'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Shirt className="w-3.5 h-3.5" />
                <span>LUKU Catalog ({myThriftItems.length})</span>
              </button>
            )}

            {/* Independent Offers & Deals tab for ALL merchants */}
            <button
              onClick={() => setActiveSubTab('offers')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'offers'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Percent className="w-3.5 h-3.5" />
              <span>Offers & Deals ({myOffers.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Dashboard Container */}
      <div className="max-w-lg mx-auto px-4 py-5 space-y-6">

        {/* =========================================================================
            SUB-TAB: OVERVIEW
            ========================================================================= */}
        {activeSubTab === 'overview' && (
          <div 
 className="space-y-6 animate-in fade-in duration-150">
            {/* ACTUAL BUSINESS VERIFICATION STATUS */}
{(() => {
  const status =
    currentBiz.verificationStatus ||
    (currentBiz.verified ? 'approved' : 'pending');

  const statusStyles = {
    pending: 'border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200',
    approved: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-200',
    rejected: 'border-red-300 bg-red-50 text-red-900 dark:bg-red-950/30 dark:border-red-800 dark:text-red-200',
  };

  const statusContent = {
    pending: {
      title: 'Verification pending',
      message: 'Your business profile has been submitted and is waiting for RADA admin review.',
    },
    approved: {
      title: 'Business verified',
      message: 'Your business has been approved by RADA.',
    },
    rejected: {
      title: 'Verification rejected',
      message: currentBiz.verificationNote
        ? `Reason: ${currentBiz.verificationNote}`
        : 'Your business was not approved. Please review your details and contact RADA support.',
    },
  };

  return (
    <div className={`rounded-2xl border p-4 ${statusStyles[status]}`}>
      <div className="flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-black">
            {statusContent[status].title}
          </p>
          <p className="text-xs mt-1 leading-relaxed">
            {statusContent[status].message}
          </p>
        </div>
      </div>
    </div>
  );
})()}
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-center shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Managed</span>
                <span className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5 block">
                  {currentBiz.category === 'hospitality' 
                    ? myClaimedSpots.length 
                    : currentBiz.category === 'event_organizer' 
                    ? myEvents.length 
                    : myThriftItems.length}
                </span>
                <span className="text-[10px] text-[#E0533C] font-semibold">Active Listings</span>
              </div>

              <div className="bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-center shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Promotions</span>
                <span className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5 block">
                  {myOffers.length}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold">Live on Feed</span>
              </div>

              <div className="bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-center shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Trust Score</span>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <span className="text-xl font-black text-slate-900 dark:text-slate-100">100%</span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Verified Merchant</span>
              </div>
            </div>

            {/* Operational Hub Action Cards */}
            <div className="bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">Quick Operations</h3>
                  <p className="text-[11px] text-slate-500">Fast tasks for {currentBiz.name}</p>
                </div>
                <BusinessBadge businessId={currentBiz.id} category={currentBiz.category} size="xs" />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {currentBiz.category === 'hospitality' && (
                  <>
                    <button
                      onClick={openCreateSpotModal}
                      className="p-3.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/30 rounded-2xl text-left transition group cursor-pointer"
                    >
                      <Plus className="w-5 h-5 text-amber-600 mb-2 group-hover:scale-110 transition" />
                      <span className="font-extrabold text-xs block">Add New Spot</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Menus, exact hours & bus stop</span>
                    </button>

                    <button
                      onClick={() => setActiveSubTab('claim')}
                      className="p-3.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-900 dark:text-orange-200 border border-orange-500/30 rounded-2xl text-left transition group cursor-pointer"
                    >
                      <Sparkles className="w-5 h-5 text-orange-600 mb-2 group-hover:scale-110 transition" />
                      <span className="font-extrabold text-xs block">Claim Community Spots</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">{claimableCommunitySpots.length} spots in area</span>
                    </button>
                  </>
                )}

                {currentBiz.category === 'event_organizer' && (
                  <>
                    <button
                      onClick={openCreateEventModal}
                      className="p-3.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-900 dark:text-purple-200 border border-purple-500/30 rounded-2xl text-left transition group cursor-pointer"
                    >
                      <Plus className="w-5 h-5 text-purple-600 mb-2 group-hover:scale-110 transition" />
                      <span className="font-extrabold text-xs block">Publish Event Rave</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Tickets, lineup & venue</span>
                    </button>

                    <button
                      onClick={() => setActiveSubTab('manage')}
                      className="p-3.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-900 dark:text-indigo-200 border border-indigo-500/30 rounded-2xl text-left transition group cursor-pointer"
                    >
                      <Ticket className="w-5 h-5 text-indigo-600 mb-2 group-hover:scale-110 transition" />
                      <span className="font-extrabold text-xs block">Ticket Tiers & Links</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">HustleSasa, Tikiti setup</span>
                    </button>
                  </>
                )}

                {currentBiz.category === 'thrift_store' && (
                  <>
                    <button
                      onClick={openCreateThriftModal}
                      className="p-3.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 border border-emerald-500/30 rounded-2xl text-left transition group cursor-pointer"
                    >
                      <Plus className="w-5 h-5 text-emerald-600 mb-2 group-hover:scale-110 transition" />
                      <span className="font-extrabold text-xs block">Upload LUKU Fit</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Streetwear, size & price</span>
                    </button>

                    <button
                      onClick={() => setActiveSubTab('manage')}
                      className="p-3.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-900 dark:text-teal-200 border border-teal-500/30 rounded-2xl text-left transition group cursor-pointer"
                    >
                      <Tag className="w-5 h-5 text-teal-600 mb-2 group-hover:scale-110 transition" />
                      <span className="font-extrabold text-xs block">Stall & Delivery Info</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Gikomba & Toi routing</span>
                    </button>
                  </>
                )}

                {/* Independent Offer Button (Shared) */}
                <button
                  onClick={openCreateOfferModal}
                  className="p-3.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-900 dark:text-rose-200 border border-rose-500/30 rounded-2xl text-left transition group cursor-pointer"
                >
                  <Percent className="w-5 h-5 text-rose-600 mb-2 group-hover:scale-110 transition" />
                  <span className="font-extrabold text-xs block">Post Promo Offer</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Decoupled deal banner</span>
                </button>

                <button
                  onClick={() => onOpenPublicProfile(currentBiz)}
                  className="p-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-2xl text-left transition group cursor-pointer"
                >
                  <Share2 className="w-5 h-5 text-slate-600 dark:text-slate-300 mb-2 group-hover:scale-110 transition" />
                  <span className="font-extrabold text-xs block">View Storefront</span>
                  <span className="text-[10px] text-slate-500">Public customer view</span>
                </button>
              </div>
            </div>

            {/* Running Offers Spotlight */}
            <div className="bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-[#E0533C]" />
                    <span>Active Offers on Home Feed ({myOffers.length})</span>
                  </h3>
                  <p className="text-[10px] text-slate-500">Promotions showcased to all users on RADA Home</p>
                </div>
                <button 
                  onClick={openCreateOfferModal}
                  className="text-[10px] font-black text-[#E0533C] hover:underline"
                >
                  + Create Offer
                </button>
              </div>

              {myOffers.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <Percent className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400">No active promotions right now</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Post an offer or deal to drive weekend traffic!</p>
                  <button 
                    onClick={openCreateOfferModal}
                    className="mt-3 text-xs bg-[#E0533C] text-white font-bold px-3 py-1.5 rounded-xl shadow-xs"
                  >
                    Post an Offer
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {myOffers.map(offer => (
                    <div 
                      key={offer.id}
                      className="p-3 bg-[#FBFBF9] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {offer.posterUrl && (
                          <img src={offer.posterUrl} alt={offer.title} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black bg-rose-500 text-white px-1.5 py-0.2 rounded-md">
                              {offer.discount}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">{offer.category}</span>
                          </div>
                          <h4 className="font-extrabold text-xs truncate mt-0.5">{offer.title}</h4>
                          <p className="text-[10px] text-slate-400 truncate">{offer.validUntil}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button 
                          onClick={() => openEditOfferModal(offer)}
                          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500"
                          title="Edit Offer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => {
                            onDeleteOffer(offer.id);
                            showToast('Offer removed from Home feed.');
                          }}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-red-500"
                          title="Delete Offer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            SUB-TAB: MANAGE (VERTICAL-SPECIFIC)
            ========================================================================= */}
        {activeSubTab === 'manage' && (
          <div className="space-y-6 animate-in fade-in duration-150">

            {/* A. SPOT MERCHANT MANAGEMENT */}
            {currentBiz.category === 'hospitality' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black tracking-tight">My Managed Spots ({myClaimedSpots.length})</h3>
                    <p className="text-xs text-slate-500">Spots owned by {currentBiz.name} with editing rights</p>
                  </div>
                  <button 
                    onClick={openCreateSpotModal}
                    className="text-xs font-black bg-[#E0533C] text-white px-3.5 py-2 rounded-xl flex items-center gap-1 shadow-md shadow-orange-500/20 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Spot</span>
                  </button>
                </div>

                {myClaimedSpots.length === 0 ? (
                  <div className="text-center py-10 bg-white dark:bg-[#1C1A1E] border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-6">
                    <Store className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <h4 className="font-black text-sm">No spots claimed or added yet</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                      Create your own spot or claim an existing community-uploaded listing to manage digital menus and exact bus stops.
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <button 
                        onClick={openCreateSpotModal}
                        className="text-xs bg-[#E0533C] text-white font-bold px-4 py-2 rounded-xl"
                      >
                        Create Spot
                      </button>
                      <button 
                        onClick={() => setActiveSubTab('claim')}
                        className="text-xs bg-amber-500 text-white font-bold px-4 py-2 rounded-xl"
                      >
                        Claim a Spot
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myClaimedSpots.map(spot => (
                      <div 
                        key={spot.id}
                        className="bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-xs space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          <img src={spot.img} alt={spot.title} className="w-16 h-16 rounded-2xl object-cover shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-black text-sm truncate">{spot.title}</h4>
                              <BusinessBadge businessId={currentBiz.id} category="hospitality" size="xs" />
                            </div>
                            <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-[#E0533C]" />
                              <span>{spot.exactLocationTag || spot.address}</span>
                            </p>
                            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400 font-semibold">
                              <span>★ {spot.rating} ({spot.reviewCount || 0} reviews)</span>
                              <span>•</span>
                              <span>{spot.menuItems?.length || 0} Menu Items</span>
                              <span>•</span>
                              <span className="text-emerald-600 font-bold">Claimed & Verified</span>
                            </div>
                          </div>
                        </div>

                        {/* Location & Bus stop info */}
                        {spot.landmark && (
                          <div className="bg-[#FBFBF9] dark:bg-[#121113] p-2.5 rounded-xl text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>Stage / Landmark: <strong className="text-slate-900 dark:text-slate-100">{spot.landmark}</strong></span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                          <button
                            onClick={() => onViewSpotDetails(spot)}
                            className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-[#E0533C] flex items-center gap-1"
                          >
                            <span>Preview Listing</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditSpotModal(spot)}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold flex items-center gap-1"
                            >
                              <Edit3 className="w-3 h-3 text-slate-600 dark:text-slate-300" />
                              <span>Edit Spot & Menu</span>
                            </button>
                            <button
                              onClick={() => {
                                onReleaseSpot(spot.id);
                                showToast(`Released ownership of "${spot.title}".`);
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-500 hover:bg-red-100 text-xs font-bold"
                              title="Release Spot Ownership"
                            >
                              Release
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* B. EVENT ORGANIZER MANAGEMENT */}
            {currentBiz.category === 'event_organizer' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black tracking-tight">Active Events Suite ({myEvents.length})</h3>
                    <p className="text-xs text-slate-500">Concerts, parties & raves hosted by {currentBiz.name}</p>
                  </div>
                  <button 
                    onClick={openCreateEventModal}
                    className="text-xs font-black bg-purple-600 text-white px-3.5 py-2 rounded-xl flex items-center gap-1 shadow-md shadow-purple-500/20 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Publish Event</span>
                  </button>
                </div>

                {myEvents.length === 0 ? (
                  <div className="text-center py-10 bg-white dark:bg-[#1C1A1E] border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-6">
                    <Ticket className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <h4 className="font-black text-sm">No events published yet</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                      List your upcoming club night, concert, or festival with verified ticketing and multi-tier passes.
                    </p>
                    <button 
                      onClick={openCreateEventModal}
                      className="mt-4 text-xs bg-purple-600 text-white font-bold px-4 py-2 rounded-xl"
                    >
                      Publish First Event
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myEvents.map(evt => (
                      <div 
                        key={evt.id}
                        className="bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-xs space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          <img src={evt.img} alt={evt.title} className="w-16 h-16 rounded-2xl object-cover shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-black text-sm truncate">{evt.title}</h4>
                              <BusinessBadge businessId={currentBiz.id} category="event_organizer" size="xs" />
                            </div>
                            <p className="text-xs text-slate-500 truncate mt-0.5">{evt.date} • {evt.time}</p>
                            <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-purple-500" />
                              <span>{evt.location}</span>
                            </p>
                          </div>
                        </div>

                        {/* Ticket tiers pills */}
                        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar py-1">
                          {evt.tiers?.map((tier, idx) => (
                            <span 
                              key={idx} 
                              className="text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-lg whitespace-nowrap"
                            >
                              {tier.name}: {tier.price}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                          <button
                            onClick={() => onViewEventDetails(evt)}
                            className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-purple-600 flex items-center gap-1"
                          >
                            <span>Preview Event</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditEventModal(evt)}
                              className="px-2.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-xs font-bold flex items-center gap-1 transition"
                              title="Edit Event"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <a
                              href={evt.url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-600 text-xs font-bold flex items-center gap-1"
                            >
                              <span>Tickets</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <button
                              onClick={() => {
                                onDeleteListing('event', evt.id);
                                showToast(`Deleted "${evt.title}".`);
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-500 text-xs font-bold"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* C. THRIFT STORE MANAGEMENT */}
            {currentBiz.category === 'thrift_store' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black tracking-tight">LUKU Wardrobe Items ({myThriftItems.length})</h3>
                    <p className="text-xs text-slate-500">Live apparel items synced to "LUKU: What to wear"</p>
                  </div>
                  <button 
                    onClick={openCreateThriftModal}
                    className="text-xs font-black bg-emerald-600 text-white px-3.5 py-2 rounded-xl flex items-center gap-1 shadow-md shadow-emerald-500/20 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Upload Fit</span>
                  </button>
                </div>

                {myThriftItems.length === 0 ? (
                  <div className="text-center py-10 bg-white dark:bg-[#1C1A1E] border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-6">
                    <Shirt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <h4 className="font-black text-sm">No thrift items listed yet</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                      List your curated streetwear pieces, vintage denim, or sneakers to be recommended in the LUKU styling engine.
                    </p>
                    <button 
                      onClick={openCreateThriftModal}
                      className="mt-4 text-xs bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl"
                    >
                      Upload First Piece
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {myThriftItems.map(item => (
                      <div 
                        key={item.id}
                        className="bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xs space-y-2 flex flex-col justify-between"
                      >
                        <div>
                          <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-2">
                            <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
                            <span className="absolute top-1.5 left-1.5 bg-black/70 backdrop-blur-md text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded">
                              {item.condition}
                            </span>
                          </div>
                          <h4 className="font-bold text-xs truncate">{item.name}</h4>
                          <p className="text-xs font-black text-[#E0533C] mt-0.5">{item.price}</p>
                          <p className="text-[10px] text-slate-400 truncate">Size: {item.size} • {item.storeLocation}</p>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80">
                          <BusinessBadge businessId={currentBiz.id} category="thrift_store" size="xs" />
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditThriftModal(item)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition"
                              title="Edit Piece"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                onDeleteListing('thrift', item.id);
                                showToast(`Removed "${item.name}".`);
                              }}
                              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
                              title="Delete Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            SUB-TAB: CLAIM COMMUNITY SPOTS (EXCLUSIVE TO SPOT MERCHANTS)
            ========================================================================= */}
        {activeSubTab === 'claim' && currentBiz.category === 'hospitality' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            {/* Header / Info Banner */}
            <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/30 rounded-3xl p-5">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-black text-xs uppercase tracking-wider mb-1">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Exclusive Merchant Privilege</span>
              </div>
              <h3 className="text-base font-black tracking-tight">Search & Claim Community Spots</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Find spots originally added by the community or unassigned. Claiming instantly grants <strong className="text-slate-900 dark:text-slate-100">{currentBiz.name}</strong> official merchant ownership, unlocking menu updates, photo curation, and verification badges!
              </p>

              {/* Search input */}
              <div className="relative mt-4">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder="Search spots by name, neighborhood (e.g. Hurlingham, Westlands)..."
                  value={claimSearchQuery}
                  onChange={(e) => setClaimSearchQuery(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-[#1C1A1E] border border-amber-500/40 rounded-2xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>
            </div>

            {/* Results List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-500">
                  Available to Claim ({claimableCommunitySpots.length})
                </span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                  Verified Spot Merchant Exclusive
                </span>
              </div>

              {claimableCommunitySpots.length === 0 ? (
                <div className="text-center py-8 bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs font-bold">No unclaimed spots matching "{claimSearchQuery}"</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">All matching listings are already claimed or verified.</p>
                </div>
              ) : (
                claimableCommunitySpots.map(spot => (
                  <div 
                    key={spot.id}
                    className="bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-xs flex items-center justify-between gap-3 hover:border-amber-400/50 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={spot.img} alt={spot.title} className="w-14 h-14 rounded-2xl object-cover shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-xs truncate">{spot.title}</h4>
                          {spot.isUserUploaded && (
                            <span className="text-[9px] bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded font-bold">
                              Community Upload
                            </span>
                          )}
                        </div>
                        <p class
