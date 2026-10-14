/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { Navigation } from './components/Navigation.tsx';
import { MerchantHubTab } from './components/MerchantHubTab.tsx';
import { PublicBusinessProfileModal } from './components/PublicBusinessProfileModal.tsx';
import { HomeTab } from './components/HomeTab.tsx';
import { SpotsTab } from './components/SpotsTab.tsx';
import { LukuTab } from './components/LukuTab.tsx';
import { SocialsTab } from './components/SocialsTab.tsx';
import { VaultTab } from './components/VaultTab.tsx';
import { Overlays } from './components/Overlays.tsx';
import { LocationMapModal } from './components/LocationMapModal.tsx';
import { UserProfileModal } from './components/UserProfileModal.tsx';

import {
  initialBusinesses,
  initialOffers,
  initialSpots,
  initialEvents,
  initialThriftItems,
  cinemaMovies,
  initialStatuses,
  discoveryProfiles,
  initialConversations,
  initialTickets,
  initialContacts
} from './data/initialData.ts';

import {
  BusinessAccount,
  BusinessOffer,
  SpotItem,
  EventItem,
  ThriftItem,
  CinemaMovie,
  StatusPost,
  StatusReply,
  ChatConversation,
  VaultTicket,
  EmergencyContact,
  Review,
  UserProfile
} from './types.ts';

export default function App() {
  // Theme State: Default to pure white / light mode as requested!
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('rada_theme');
    return saved === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      localStorage.setItem('rada_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      localStorage.setItem('rada_theme', 'light');
    }
  }, [isDarkMode]);

  const handleToggleTheme = () => {
    setIsDarkMode(prev => !prev);
    showToast(!isDarkMode ? 'Dark theme enabled.' : 'Switched to Light theme (Default White).');
  };

  // Navigation
  const [activeTab, setActiveTab] = useState('home');

  // Business Hub State
  const [businesses, setBusinesses] = useState<BusinessAccount[]>(() => {
    const saved = localStorage.getItem('rada_businesses');
    return saved ? JSON.parse(saved) : initialBusinesses;
  });
  const [activeBusinessId, setActiveBusinessId] = useState<string>(() => {
    return businesses[0]?.id || 'biz-1';
  });
  const [isBusinessHubOpen, setIsBusinessHubOpen] = useState(false);

  // Core Data State
  const [spots, setSpots] = useState<SpotItem[]>(() => {
    const saved = localStorage.getItem('rada_spots');
    return saved ? JSON.parse(saved) : initialSpots;
  });

  const [events, setEvents] = useState<EventItem[]>(() => {
    const saved = localStorage.getItem('rada_events');
    return saved ? JSON.parse(saved) : initialEvents;
  });

  const [thriftItems, setThriftItems] = useState<ThriftItem[]>(() => {
    const saved = localStorage.getItem('rada_thrift');
    return saved ? JSON.parse(saved) : initialThriftItems;
  });

  const [statuses, setStatuses] = useState<StatusPost[]>(() => {
    const saved = localStorage.getItem('rada_statuses');
    return saved ? JSON.parse(saved) : initialStatuses;
  });

  const [conversations, setConversations] = useState<ChatConversation[]>(() => {
    const saved = localStorage.getItem('rada_conversations');
    return saved ? JSON.parse(saved) : initialConversations;
  });

  const [tickets, setTickets] = useState<VaultTicket[]>(() => {
    const saved = localStorage.getItem('rada_tickets');
    return saved ? JSON.parse(saved) : initialTickets;
  });

  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>(() => {
    const saved = localStorage.getItem('rada_contacts');
    return saved ? JSON.parse(saved) : initialContacts;
  });

  // Independent Offers & Promotions State (SPEC 4)
  const [offers, setOffers] = useState<BusinessOffer[]>(() => {
    const saved = localStorage.getItem('rada_offers');
    return saved ? JSON.parse(saved) : initialOffers;
  });

  // Public Business Profile View Modal State
  const [selectedPublicBusiness, setSelectedPublicBusiness] = useState<BusinessAccount | null>(null);

  // Overlays state
  const [activeOverlay, setActiveOverlay] = useState<string | null>(null);
  const [isWagwanOpen, setIsWagwanOpen] = useState(false);
  const [selectedSpotModal, setSelectedSpotModal] = useState<SpotItem | null>(null);
  const [selectedEventModal, setSelectedEventModal] = useState<EventItem | null>(null);
  const [qrPassTitle, setQrPassTitle] = useState<string | null>(null);

  // "View Location" Specific Spot Modal
  const [selectedLocationMapSpot, setSelectedLocationMapSpot] = useState<SpotItem | null>(null);

  // Date planning workflow
  const [isPlanDateModalOpen, setIsPlanDateModalOpen] = useState(false);
  const [datePlanningSpot, setDatePlanningSpot] = useState<SpotItem | null>(null);

  // Group creation modal
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  // Dedicated View All
  const [viewAllTitle, setViewAllTitle] = useState<string | null>(null);
  const [viewAllCategory, setViewAllCategory] = useState<string | null>(null);

  // User location & GPS override state (SPEC 2)
  const [currentLocation, setCurrentLocation] = useState<string>(() => {
    return localStorage.getItem('rada_current_location') || 'Westlands, Nairobi';
  });
  const [isGpsActive, setIsGpsActive] = useState<boolean>(() => {
    const saved = localStorage.getItem('rada_gps_active');
    return saved !== null ? saved === 'true' : true;
  });

  const handleUpdateLocation = (newLoc: string, isGps: boolean) => {
    setCurrentLocation(newLoc);
    setIsGpsActive(isGps);
    localStorage.setItem('rada_current_location', newLoc);
    localStorage.setItem('rada_gps_active', String(isGps));
    if (isGps) {
      showToast(`Device GPS active: ${newLoc}`);
    } else {
      showToast(`Location set to: ${newLoc}`);
    }
  };

  // GPS Broadcast
  const [isGpsBroadcasting, setIsGpsBroadcasting] = useState(false);

  // Going Events Tracking (Only clickable once; click again to remove count)
  const [goingEventIds, setGoingEventIds] = useState<number[]>(() => {
    const saved = localStorage.getItem('rada_going_events');
    return saved ? JSON.parse(saved) : [];
  });

  // Current logged in user profile with Single / Not Single status
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('rada_current_user');
    return saved ? JSON.parse(saved) : {
      name: 'Wayne Waweru',
      handle: '@lowk3yFX',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500&auto=format&fit=crop',
      bio: 'Exploring Nairobi spots, amapiano vibes, and fashion setups. Hit me up for hangouts! ✨',
      loc: 'Westlands, Nairobi',
      relationshipStatus: 'single',
      vibes: ['Nightlife', 'Cocktails', 'Amapiano', 'Art', 'Thrifting']
    };
  });

  // Profile View Modal state (to view anyone's profile and bio)
  const [viewingProfile, setViewingProfile] = useState<UserProfile | null>(null);

  // Toast Notification System
  const [toasts, setToasts] = useState<Array<{ id: number; text: string }>>([]);

  const showToast = (text: string) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, text }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2800);
  };

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('rada_businesses', JSON.stringify(businesses));
  }, [businesses]);

  useEffect(() => {
    localStorage.setItem('rada_spots', JSON.stringify(spots));
  }, [spots]);

  useEffect(() => {
    localStorage.setItem('rada_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('rada_thrift', JSON.stringify(thriftItems));
  }, [thriftItems]);

  useEffect(() => {
    localStorage.setItem('rada_statuses', JSON.stringify(statuses));
  }, [statuses]);

  useEffect(() => {
    localStorage.setItem('rada_tickets', JSON.stringify(tickets));
  }, [tickets]);

  useEffect(() => {
    localStorage.setItem('rada_going_events', JSON.stringify(goingEventIds));
  }, [goingEventIds]);

  useEffect(() => {
    localStorage.setItem('rada_current_user', JSON.stringify(currentUserProfile));
  }, [currentUserProfile]);

  useEffect(() => {
    localStorage.setItem('rada_offers', JSON.stringify(offers));
  }, [offers]);

  // Lock body scroll and handle Escape key for Business Hub modal
  useEffect(() => {
    if (isBusinessHubOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsBusinessHubOpen(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isBusinessHubOpen]);

  // Active business reference
  const currentBusiness = businesses.find(b => b.id === activeBusinessId) || businesses[0];

  // Handlers for Business Hub
  const handleCreateBusiness = (newBiz: BusinessAccount) => {
    setBusinesses(prev => [newBiz, ...prev]);
    setActiveBusinessId(newBiz.id);
  };

  const handleUpdateBusiness = (updatedBiz: BusinessAccount) => {
    setBusinesses(prev => prev.map(b => b.id === updatedBiz.id ? updatedBiz : b));
  };

  // Offers Handlers (SPEC 4: Decoupled Independent Engine)
  const handleCreateOffer = (newOffer: BusinessOffer) => {
    setOffers(prev => [newOffer, ...prev]);
  };

  const handleUpdateOffer = (updatedOffer: BusinessOffer) => {
    setOffers(prev => prev.map(o => o.id === updatedOffer.id ? updatedOffer : o));
  };

  const handleDeleteOffer = (offerId: string) => {
    setOffers(prev => prev.filter(o => o.id !== offerId));
  };

  // Spot Claiming (SPEC 3A: Exclusive to Spot Merchants)
  const handleClaimSpot = (spotId: number, businessId: string) => {
    setSpots(prev => prev.map(s => {
      if (s.id === spotId) {
        return {
          ...s,
          businessId,
          isUserUploaded: false
        };
      }
      return s;
    }));
  };

  const handleReleaseSpot = (spotId: number) => {
    setSpots(prev => prev.map(s => {
      if (s.id === spotId) {
        return {
          ...s,
          businessId: undefined,
          isUserUploaded: true
        };
      }
      return s;
    }));
  };

  const handleOpenBusinessProfile = (bizId: string) => {
    const biz = businesses.find(b => b.id === bizId);
    if (biz) {
      setSelectedPublicBusiness(biz);
    }
  };

  const handleAddOrUpdateSpot = (spot: SpotItem) => {
    setSpots(prev => {
      const idx = prev.findIndex(s => s.id === spot.id || s.title.toLowerCase() === spot.title.toLowerCase());
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = spot;
        return updated;
      }
      return [spot, ...prev];
    });
  };

  const handleAddEvent = (event: EventItem) => {
    setEvents(prev => [event, ...prev]);
  };

  const handleAddThriftItem = (item: ThriftItem) => {
    setThriftItems(prev => [item, ...prev]);
  };

  const handleDeleteListing = (type: 'spot' | 'event' | 'thrift', id: number) => {
    if (type === 'spot') {
      setSpots(prev => prev.filter(s => s.id !== id));
      showToast('Spot listing removed.');
    } else if (type === 'event') {
      setEvents(prev => prev.filter(e => e.id !== id));
      showToast('Event listing removed.');
    } else {
      setThriftItems(prev => prev.filter(t => t.id !== id));
      showToast('Thrift item removed.');
    }
  };

  // Post Review with Images Handler
  const handlePostReview = (spotId: number, review: Review) => {
    setSpots(prev => prev.map(s => {
      if (s.id === spotId) {
        const existingReviews = s.reviews || [];
        const updatedReviews = [review, ...existingReviews];
        const sumRatings = updatedReviews.reduce((sum, r) => sum + r.rating, 0);
        const avgRating = (sumRatings / updatedReviews.length).toFixed(1);

        // Append review images into spot images gallery
        const existingImages = (s.images && s.images.length > 0) ? s.images : [s.img];
        const newImages = review.images ? [...existingImages, ...review.images] : existingImages;

        const updatedSpot = {
          ...s,
          rating: avgRating,
          reviewCount: (s.reviewCount || 0) + 1,
          reviews: updatedReviews,
          images: newImages
        };

        if (selectedSpotModal?.id === spotId) {
          setSelectedSpotModal(updatedSpot);
        }

        return updatedSpot;
      }
      return s;
    }));

    showToast(`Review posted for ★ ${review.rating} rating!`);
  };

  // Add Spot Image Handler
  const handleAddSpotImage = (spotId: number, imgUrl: string) => {
    setSpots(prev => prev.map(s => {
      if (s.id === spotId) {
        const currentImages = s.images || [s.img];
        const updatedSpot = { ...s, images: [...currentImages, imgUrl] };
        if (selectedSpotModal?.id === spotId) {
          setSelectedSpotModal(updatedSpot);
        }
        return updatedSpot;
      }
      return s;
    }));
  };

  // Cinema Booking & Vault Sync
  const handleBookCinema = (movie: CinemaMovie) => {
    const newPass: VaultTicket = {
      id: `pass-${Date.now()}`,
      title: movie.title,
      dateStr: movie.date,
      locationStr: movie.locationName,
      type: 'Cinema Movie Pass'
    };
    setTickets(prev => [newPass, ...prev]);
    showToast(`Booked ${movie.title}! Synced to Vault Calendar.`);
    setTimeout(() => {
      window.open(movie.url, '_blank');
    }, 700);
  };

  // Status Posting with clean location (e.g. Westlands, Nairobi - no GPS coordinates)
  const handlePostStatus = (text: string, mediaUrl?: string, locationName?: string) => {
    const newPost: StatusPost = {
      id: `s-${Date.now()}`,
      author: currentUserProfile.name,
      handle: currentUserProfile.handle,
      avatar: currentUserProfile.avatar,
      timeAgo: 'Just now',
      text,
      mediaUrl,
      mediaType: 'image',
      locationName: locationName || 'Westlands, Nairobi',
      replies: []
    };
    setStatuses(prev => [newPost, ...prev]);
    showToast('Status posted live!');
  };

  // Reply to someone's status
  const handleReplyStatus = (statusId: string, text: string) => {
    const newReply: StatusReply = {
      id: `rep-${Date.now()}`,
      author: currentUserProfile.name,
      handle: currentUserProfile.handle,
      avatar: currentUserProfile.avatar,
      timeAgo: 'Just now',
      text
    };
    setStatuses(prev => prev.map(s => {
      if (s.id === statusId) {
        return {
          ...s,
          replies: [...(s.replies || []), newReply]
        };
      }
      return s;
    }));
    showToast('Reply posted to status!');
  };

  // Event "I'm Going" Toggle: clickable once to go; if clicked again, remove count
  const handleToggleGoing = (event: EventItem) => {
    const isAlreadyGoing = goingEventIds.includes(event.id);
    if (isAlreadyGoing) {
      // Untoggle: remove count
      setGoingEventIds(prev => prev.filter(id => id !== event.id));
      setEvents(prev => prev.map(e => e.id === event.id ? { ...e, goingCount: Math.max(0, e.goingCount - 1) } : e));
      if (selectedEventModal && selectedEventModal.id === event.id) {
        setSelectedEventModal(prev => prev ? { ...prev, goingCount: Math.max(0, prev.goingCount - 1) } : null);
      }
      setTickets(prev => prev.filter(t => t.title !== event.title));
      showToast(`Removed from going list for ${event.title}`);
    } else {
      // Toggle: add count
      setGoingEventIds(prev => [...prev, event.id]);
      setEvents(prev => prev.map(e => e.id === event.id ? { ...e, goingCount: e.goingCount + 1 } : e));
      if (selectedEventModal && selectedEventModal.id === event.id) {
        setSelectedEventModal(prev => prev ? { ...prev, goingCount: prev.goingCount + 1 } : null);
      }
      const newPass: VaultTicket = {
        id: `going-${Date.now()}`,
        title: event.title,
        dateStr: event.date,
        locationStr: event.location.split(',')[0],
        type: 'Vault Synced Outing'
      };
      setTickets(prev => [newPass, ...prev]);
      showToast(`You're going to ${event.title}! Synced to Vault.`);
    }
  };

  // Update current user profile
  const handleUpdateCurrentUserProfile = (updates: Partial<UserProfile>) => {
    setCurrentUserProfile(prev => ({ ...prev, ...updates }));
    showToast('Profile updated!');
  };

  const handleBuyEventTicket = (event: EventItem) => {
    const newPass: VaultTicket = {
      id: `tkt-${Date.now()}`,
      title: event.title,
      dateStr: event.date,
      locationStr: event.location.split(',')[0],
      type: 'Verified Ticket Pass'
    };
    setTickets(prev => [newPass, ...prev]);
    showToast(`Ticket pass for ${event.title} added to Vault! Redirecting to checkout...`);
    setTimeout(() => {
      window.open(event.url, '_blank');
    }, 750);
  };

  // Plan a Date workflow
  const handlePlanDateFromSpot = (spot: SpotItem) => {
    setSelectedSpotModal(null);
    setDatePlanningSpot(spot);
    setIsPlanDateModalOpen(true);
  };

  const handleConfirmDateInvite = (spot: SpotItem, date: string, time: string) => {
    setIsPlanDateModalOpen(false);
    setDatePlanningSpot(null);

    const activeConv = conversations[0];
    if (activeConv) {
      activeConv.messages.push({
        id: `invite-${Date.now()}`,
        sender: 'me',
        text: `Sent a Date Invitation for ${spot.title}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        dateInvite: {
          spotTitle: spot.title,
          address: spot.address,
          date,
          time,
          accepted: false
        }
      });
      activeConv.lastMessage = `Date Invite: ${spot.title} on ${date}`;
    }

    setTickets(prev => [{
      id: `date-${Date.now()}`,
      title: `Date with Jane @ ${spot.title}`,
      dateStr: `${date} (${time})`,
      locationStr: spot.address,
      type: 'Vault Synced Outing'
    }, ...prev]);

    setActiveTab('socials');
    showToast(`Date invitation for ${spot.title} sent to chat!`);
  };

  // Accept Dating Request
  const handleAcceptRequest = (name: string, avatar: string) => {
    const newConv: ChatConversation = {
      id: `c-${Date.now()}`,
      name,
      avatar,
      type: 'direct',
      lastMessage: 'Matched! Say hi ✨',
      messages: [
        {
          id: `m-init-${Date.now()}`,
          sender: 'them',
          text: `Hey! Excited to connect on RADA. Where do you like to hang out in Nairobi?`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]
    };
    setConversations(prev => [newConv, ...prev]);
    setActiveTab('socials');
  };

  // Create Group Chat
  const handleCreateGroup = (name: string, members: string[]) => {
    setIsCreateGroupOpen(false);
    const newGroupConv: ChatConversation = {
      id: `group-${Date.now()}`,
      name,
      avatar: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=500&auto=format&fit=crop',
      type: 'group',
      lastMessage: `Group created with ${members.length} members`,
      members,
      messages: [
        {
          id: `m-grp-1`,
          sender: 'system',
          text: `Created group "${name}" with ${members.join(', ')}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]
    };
    setConversations(prev => [newGroupConv, ...prev]);
    setActiveTab('socials');
    showToast(`Group "${name}" created!`);
  };

  const handleOpenOverlay = (overlayId: string) => {
    if (overlayId === 'businessHub') {
      setIsBusinessHubOpen(true);
    } else {
      setActiveOverlay(overlayId);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-[#121113] dark:text-slate-100 flex flex-col transition-colors duration-200 antialiased overflow-x-hidden">
      
      {/* Toast Notification Container */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center gap-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="toast-notification bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-black px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 border border-slate-800 dark:border-slate-200"
          >
            <span className="w-2 h-2 rounded-full bg-[#2D6A4F] animate-ping" />
            <span>{toast.text}</span>
          </div>
        ))}
      </div>

      {/* Top Header */}
      <Header
        onOpenOverlay={handleOpenOverlay}
        onOpenWagwanAI={() => setIsWagwanOpen(true)}
        onSwitchTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        currentLocation={currentLocation}
        isGpsActive={isGpsActive}
        onUpdateLocation={handleUpdateLocation}
        hasBusinessAccount={Boolean(currentBusiness)}
        businessName={currentBusiness?.name}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Content Viewports */}
      <main className="flex-1 pb-24 max-w-lg mx-auto w-full relative px-0">
        {activeTab === 'home' && (
          <HomeTab
            events={events}
            cinemaMovies={cinemaMovies}
            statuses={statuses}
            offers={offers}
            spots={spots}
            onOpenSpotDetails={(spot) => setSelectedSpotModal(spot)}
            onOpenEventDetails={(evt) => setSelectedEventModal(evt)}
            onBookCinema={handleBookCinema}
            onPostStatus={handlePostStatus}
            onReplyStatus={handleReplyStatus}
            onViewUserProfile={(profile) => setViewingProfile(profile)}
            onOpenDedicatedViewAll={(title, cat) => {
              setViewAllTitle(title);
              setViewAllCategory(cat);
            }}
            onOpenCreateEvent={() => {
              setIsBusinessHubOpen(true);
            }}
            onOpenBusinessProfile={handleOpenBusinessProfile}
            showToast={showToast}
          />
        )}

        {activeTab === 'spots' && (
          <SpotsTab
            spots={spots}
            onOpenSpotFullView={(spot) => setSelectedSpotModal(spot)}
            onViewLocation={(spot) => setSelectedLocationMapSpot(spot)}
            onOpenDedicatedViewAll={(title, cat) => {
              setViewAllTitle(title);
              setViewAllCategory(cat);
            }}
            onOpenCreateSpot={() => {
              setIsBusinessHubOpen(true);
            }}
            showToast={showToast}
          />
        )}

        {activeTab === 'luku' && (
          <LukuTab
            thriftItems={thriftItems}
            businesses={businesses}
            onOpenStore={(storeName) => {
              const biz = businesses.find(b => b.name.toLowerCase() === storeName.toLowerCase());
              if (biz) setSelectedPublicBusiness(biz);
              else showToast(`Browsing ${storeName} official catalog!`);
            }}
            onOpenCreateFit={() => {
              setIsBusinessHubOpen(true);
            }}
            showToast={showToast}
          />
        )}

        {/* ========================================================
            STANDALONE DEDICATED UNCOMPRESSED BUSINESS & MERCHANT HUB
            ======================================================== */}
        {activeTab === 'merchant' && (
          <MerchantHubTab
            businesses={businesses}
            activeBusinessId={activeBusinessId}
            onSelectBusiness={(id) => {
              setActiveBusinessId(id);
              const b = businesses.find(item => item.id === id);
              if (b) showToast(`Switched active business to "${b.name}"`);
            }}
            onCreateBusiness={handleCreateBusiness}
            onUpdateBusiness={handleUpdateBusiness}
            spots={spots}
            onAddOrUpdateSpot={handleAddOrUpdateSpot}
            onDeleteListing={handleDeleteListing}
            events={events}
            onAddEvent={handleAddEvent}
            thriftItems={thriftItems}
            onAddThriftItem={handleAddThriftItem}
            offers={offers}
            onCreateOffer={handleCreateOffer}
            onUpdateOffer={handleUpdateOffer}
            onDeleteOffer={handleDeleteOffer}
            onClaimSpot={handleClaimSpot}
            onReleaseSpot={handleReleaseSpot}
            onViewSpotDetails={(spot) => setSelectedSpotModal(spot)}
            onViewEventDetails={(event) => setSelectedEventModal(event)}
            onOpenPublicProfile={(biz) => setSelectedPublicBusiness(biz)}
            showToast={showToast}
          />
        )}

        {activeTab === 'socials' && (
          <SocialsTab
            discoveryProfiles={discoveryProfiles}
            conversations={conversations}
            onOpenPlanDateModal={() => setIsPlanDateModalOpen(true)}
            onOpenCreateGroupModal={() => setIsCreateGroupOpen(true)}
            onAcceptRequest={handleAcceptRequest}
            onViewUserProfile={(profile) => setViewingProfile(profile)}
            showToast={showToast}
          />
        )}

        {activeTab === 'vault' && (
          <VaultTab
            tickets={tickets}
            onShowQrCode={(title) => setQrPassTitle(title)}
          />
        )}
      </main>

      {/* Bottom Sticky Navigation */}
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* BUSINESS & MERCHANT HUB (FULL-SCREEN DEDICATED MODAL VIEW) */}
      {isBusinessHubOpen && (
        <div className="fixed inset-0 z-50 bg-[#FBFBF9] dark:bg-[#121113] overflow-y-auto animate-in slide-in-from-bottom duration-200">
          <MerchantHubTab
            businesses={businesses}
            activeBusinessId={activeBusinessId}
            onSelectBusiness={(id) => {
              setActiveBusinessId(id);
              const b = businesses.find(item => item.id === id);
              if (b) showToast(`Switched active business to "${b.name}"`);
            }}
            onCreateBusiness={handleCreateBusiness}
            onUpdateBusiness={handleUpdateBusiness}
            spots={spots}
            onAddOrUpdateSpot={handleAddOrUpdateSpot}
            onDeleteListing={handleDeleteListing}
            events={events}
            onAddEvent={handleAddEvent}
            thriftItems={thriftItems}
            onAddThriftItem={handleAddThriftItem}
            offers={offers}
            onCreateOffer={handleCreateOffer}
            onUpdateOffer={handleUpdateOffer}
            onDeleteOffer={handleDeleteOffer}
            onClaimSpot={handleClaimSpot}
            onReleaseSpot={handleReleaseSpot}
            onViewSpotDetails={(spot) => setSelectedSpotModal(spot)}
            onViewEventDetails={(event) => setSelectedEventModal(event)}
            onOpenPublicProfile={(biz) => setSelectedPublicBusiness(biz)}
            onClose={() => setIsBusinessHubOpen(false)}
            showToast={showToast}
          />
        </div>
      )}

      {/* "VIEW LOCATION" DEDICATED MAP MODAL */}
      <LocationMapModal
        spot={selectedLocationMapSpot}
        onClose={() => setSelectedLocationMapSpot(null)}
        showToast={showToast}
      />

      {/* ALL OVERLAYS & MODALS */}
      <Overlays
        activeOverlay={activeOverlay}
        onCloseOverlay={() => setActiveOverlay(null)}
        isWagwanOpen={isWagwanOpen}
        onCloseWagwan={() => setIsWagwanOpen(false)}
        spots={spots}
        events={events}
        cinemaMovies={cinemaMovies}
        thriftItems={thriftItems}
        onOpenSpotDetails={(spot) => setSelectedSpotModal(spot)}
        onOpenEventDetails={(evt) => setSelectedEventModal(evt)}
        onBookCinema={handleBookCinema}
        selectedSpot={selectedSpotModal}
        onCloseSpotModal={() => setSelectedSpotModal(null)}
        onPlanDateFromSpot={handlePlanDateFromSpot}
        onPostReview={handlePostReview}
        onAddSpotImage={handleAddSpotImage}
        selectedEvent={selectedEventModal}
        onCloseEventModal={() => setSelectedEventModal(null)}
        onToggleGoing={handleToggleGoing}
        goingEventIds={goingEventIds}
        onBuyEventTicket={handleBuyEventTicket}
        currentUserProfile={currentUserProfile}
        onUpdateCurrentUserProfile={handleUpdateCurrentUserProfile}
        qrPassTitle={qrPassTitle}
        onCloseQrModal={() => setQrPassTitle(null)}
        isPlanDateModalOpen={isPlanDateModalOpen}
        onClosePlanDateModal={() => {
          setIsPlanDateModalOpen(false);
          setDatePlanningSpot(null);
        }}
        onSelectSpotForDate={(spot) => setDatePlanningSpot(spot)}
        datePlanningSpot={datePlanningSpot}
        onConfirmDateInvite={handleConfirmDateInvite}
        isCreateGroupOpen={isCreateGroupOpen}
        onCloseCreateGroup={() => setIsCreateGroupOpen(false)}
        discoveryProfiles={discoveryProfiles}
        onCreateGroup={handleCreateGroup}
        viewAllTitle={viewAllTitle}
        viewAllCategory={viewAllCategory}
        onCloseViewAll={() => {
          setViewAllTitle(null);
          setViewAllCategory(null);
        }}
        isGpsBroadcasting={isGpsBroadcasting}
        onToggleGps={() => {
          setIsGpsBroadcasting(!isGpsBroadcasting);
          showToast(!isGpsBroadcasting ? 'Live Emergency GPS Broadcast activated!' : 'GPS Broadcast stopped.');
        }}
        emergencyContacts={emergencyContacts}
        onAddEmergencyContact={(name, phone) => {
          setEmergencyContacts(prev => [...prev, { id: `ec-${Date.now()}`, name, phone }]);
          showToast(`Emergency contact "${name}" saved!`);
        }}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
        showToast={showToast}
      />

      {/* USER PROFILE & BIO MODAL */}
      <UserProfileModal
        user={viewingProfile}
        onClose={() => setViewingProfile(null)}
        onSendMatchRequest={(u) => {
          showToast(`Hangout & Match request sent to ${u.name}!`);
          setViewingProfile(null);
        }}
        onSendMessage={(u) => {
          showToast(`Direct message opened with ${u.name}!`);
          setActiveTab('socials');
          setViewingProfile(null);
        }}
        showToast={showToast}
      />

      {/* PUBLIC BUSINESS & MERCHANT PROFILE MODAL */}
      <PublicBusinessProfileModal
        business={selectedPublicBusiness}
        onClose={() => setSelectedPublicBusiness(null)}
        offers={offers}
        spots={spots}
        events={events}
        thriftItems={thriftItems}
        onOpenSpotDetails={(spot) => setSelectedSpotModal(spot)}
        onOpenEventDetails={(event) => setSelectedEventModal(event)}
        showToast={showToast}
      />

    </div>
  );
}
