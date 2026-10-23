/**
 * RADA Internationalization (i18n) Engine
 * Supported languages: English (KE) & Kiswahili
 * (Sheng removed per system guidelines)
 */

export type AppLanguage = 'en' | 'sw';

export interface Translations {
  // Navigation
  tabHome: string;
  tabSpots: string;
  tabOutings: string;
  tabSocials: string;
  tabVault: string;
  tabBusinessHub: string;

  // Header & Search
  searchPlaceholder: string;
  emergencySos: string;
  settings: string;
  savedPlaces: string;
  guestMode: string;
  signIn: string;
  adminControls: string;

  // Home Sections
  trendingSpots: string;
  restaurantsDining: string;
  clubsLounges: string;
  natureTrails: string;
  actionSports: string;
  techGaming: string;
  creativeLeisure: string;
  cafesBakeries: string;
  dateSpots: string;
  viewAll: string;
  explore: string;
  details: string;
  bookSyncVault: string;
  openDaily: string;
  budgetLow: string;
  budgetMid: string;
  budgetHigh: string;

  // Community Status
  statusFeedTitle: string;
  statusPlaceholder: string;
  postStatus: string;
  shareWhereAt: string;

  // Emergency & SOS
  sosHubTitle: string;
  liveGpsBroadcast: string;
  liveGpsDesc: string;
  broadcastPanicAlert: string;
  policeHotline: string;
  ambulanceHotline: string;
  hospitalsTitle: string;
  savedEmergencyContacts: string;
  addEmergencyContact: string;
  contactNamePlaceholder: string;
  contactPhonePlaceholder: string;
  saveContactBtn: string;
  textLocationSms: string;
  callDirect: string;
  emergencySiren: string;
  emergencySirenDesc: string;
  fakeCall: string;
  fakeCallDesc: string;
  shareLocationWhatsApp: string;

  // Settings
  preferencesTitle: string;
  darkAppearance: string;
  darkAppearanceDesc: string;
  pushNotifications: string;
  pushNotificationsDesc: string;
  languageSelect: string;
  privacyTitle: string;
  discoverableSocials: string;
  twoFactorAuth: string;
  securitySafety: string;

  // Modals & Actions
  close: string;
  save: string;
  cancel: string;
  directions: string;
  uberRide: string;
  boltRide: string;
  exactGps: string;
}

export const translations: Record<AppLanguage, Translations> = {
  en: {
    tabHome: 'Home',
    tabSpots: 'Spots',
    tabOutings: 'Outings',
    tabSocials: 'Socials',
    tabVault: 'Vault',
    tabBusinessHub: 'Business Hub',

    searchPlaceholder: 'Search Kenyan events, venues, movies, or DJs...',
    emergencySos: 'Emergency & SOS',
    settings: 'Settings',
    savedPlaces: 'Saved Places',
    guestMode: 'Guest Mode',
    signIn: 'Sign In',
    adminControls: 'Admin Controls',

    trendingSpots: 'Trending Spots Near You',
    restaurantsDining: 'Restaurants & Dinner',
    clubsLounges: 'Clubs & Lounges',
    natureTrails: 'Nature Trails & Outdoors',
    actionSports: 'Action & Sports',
    techGaming: 'Tech & Gaming',
    creativeLeisure: 'Creative & Leisure',
    cafesBakeries: 'Cafés & Bakeries',
    dateSpots: 'Date Spots & Romantic Dinners',
    viewAll: 'View All',
    explore: 'Explore',
    details: 'Details',
    bookSyncVault: 'Book & Sync Vault',
    openDaily: 'Open Daily',
    budgetLow: 'Budget $',
    budgetMid: 'Mid $$',
    budgetHigh: 'Luxury $$$',

    statusFeedTitle: 'Where Are You At? Live Community Feed',
    statusPlaceholder: 'Where are you hanging out right now?',
    postStatus: 'Post Status',
    shareWhereAt: 'Share where you are hanging out',

    sosHubTitle: 'Emergency & SOS Hub',
    liveGpsBroadcast: 'Live Emergency GPS Broadcast',
    liveGpsDesc: 'Broadcasts your real-time coordinates to emergency contacts & authorities.',
    broadcastPanicAlert: '🚨 Broadcast SOS Panic Alert (SMS Location)',
    policeHotline: 'Police Hotline (999 / 112)',
    ambulanceHotline: 'Ambulance / Red Cross (1199 / 999)',
    hospitalsTitle: 'Hospitals (Nairobi 24/7 Casualty)',
    savedEmergencyContacts: 'My Saved Emergency Contacts',
    addEmergencyContact: 'Add Trusted Emergency Contact',
    contactNamePlaceholder: 'Name / Relation (e.g. Sister, Best Friend)',
    contactPhonePlaceholder: '+254 700 000 000',
    saveContactBtn: 'Save Emergency Contact',
    textLocationSms: 'Draft SMS Location',
    callDirect: 'Call Now',
    emergencySiren: 'Loud Siren Alarm',
    emergencySirenDesc: 'High-volume sound alarm + visual strobe',
    fakeCall: 'Fake Incoming Call',
    fakeCallDesc: 'Realistic phone call to safely excuse yourself',
    shareLocationWhatsApp: 'Share Location via WhatsApp',

    preferencesTitle: 'Preferences & Appearance',
    darkAppearance: 'Dark Appearance',
    darkAppearanceDesc: 'Toggle between Light and Dark mode',
    pushNotifications: 'Push Notifications',
    pushNotificationsDesc: 'Match alerts, event drops & ticket passes',
    languageSelect: 'Language / Lugha',
    privacyTitle: 'Privacy & Interactions',
    discoverableSocials: 'Discoverable in Socials',
    twoFactorAuth: 'Two-Factor Authentication (2FA)',
    securitySafety: 'Security & Safety',

    close: 'Close',
    save: 'Save',
    cancel: 'Cancel',
    directions: 'Directions',
    uberRide: 'Uber Ride',
    boltRide: 'Bolt Ride',
    exactGps: 'Exact GPS Coordinates',
  },
  sw: {
    tabHome: 'Nyumbani',
    tabSpots: 'Maeneo',
    tabOutings: 'Mitoko',
    tabSocials: 'Marafiki',
    tabVault: 'Hifadhi',
    tabBusinessHub: 'Kituo cha Biashara',

    searchPlaceholder: 'Tafuta matukio, maeneo, filamu, au ma-DJ...',
    emergencySos: 'Dharura & SOS',
    settings: 'Mipangilio',
    savedPlaces: 'Maeneo Yaliyohifadhiwa',
    guestMode: 'Mgeni',
    signIn: 'Ingia',
    adminControls: 'Usimamizi',

    trendingSpots: 'Maeneo Yanayovuma Karibu Nawe',
    restaurantsDining: 'Migahawa & Chakula cha Jioni',
    clubsLounges: 'Klabu & Sebule za Burudani',
    natureTrails: 'Njia za Asili na Mazingira',
    actionSports: 'Michezo na Shughuli za Nguvu',
    techGaming: 'Teknolojia na Michezo ya Video',
    creativeLeisure: 'Sanaa na Burudani ya Utulivu',
    cafesBakeries: 'Kahawa & Mikate',
    dateSpots: 'Maeneo ya Miadi & Chakula cha Kimapenzi',
    viewAll: 'Tazama Yote',
    explore: 'Chunguza',
    details: 'Maelezo',
    bookSyncVault: 'Weka Nafasi & Hifadhi',
    openDaily: 'Wazi Kila Siku',
    budgetLow: 'Nafuu $',
    budgetMid: 'Kawaida $$',
    budgetHigh: 'Kifahari $$$',

    statusFeedTitle: 'Uko Wapi Sasa Hivi? Taarifa za Jamii',
    statusPlaceholder: 'Uko wapi unajivinjari sasa hivi?',
    postStatus: 'Tuma Hali',
    shareWhereAt: 'Shiriki eneo unaloburudika',

    sosHubTitle: 'Kituo cha Dharura & SOS',
    liveGpsBroadcast: 'Utangazaji wa Moja kwa Moja wa GPS',
    liveGpsDesc: 'Hutuma kuratibu zako halisi kwa watu wako wa dharura na usalama.',
    broadcastPanicAlert: '🚨 Tuma Arifa ya Dharura (SMS ya Eneo)',
    policeHotline: 'Nambari ya Polisi (999 / 112)',
    ambulanceHotline: 'Gari la Wagonjwa / Msalaba Mwekundu (1199 / 999)',
    hospitalsTitle: 'Hospitali (Nairobi Huduma ya Dharura 24/7)',
    savedEmergencyContacts: 'Watu Wangu wa Dharura Waliohifadhiwa',
    addEmergencyContact: 'Ongeza Mtu wa Dharura Anayeaminika',
    contactNamePlaceholder: 'Jina / Uhusiano (mf. Dada, Rafiki)',
    contactPhonePlaceholder: '+254 700 000 000',
    saveContactBtn: 'Hifadhi Mtu wa Dharura',
    textLocationSms: 'Andaa Ujumbe wa Eneo (SMS)',
    callDirect: 'Piga Sasa',
    emergencySiren: 'Kengele Kubwa ya Dharura',
    emergencySirenDesc: 'Sauti kubwa ya tahadhari + mwangaza wa skrini',
    fakeCall: 'Simu Bandia ya Kujinasua',
    fakeCallDesc: 'Simu halisi ya kukuwezesha kuondoka kwa usalama',
    shareLocationWhatsApp: 'Shiriki Eneo kupitia WhatsApp',

    preferencesTitle: 'Mapendeleo & Muonekano',
    darkAppearance: 'Muonekano wa Giza',
    darkAppearanceDesc: 'Badilisha kati ya Hali ya Mwangaza na Giza',
    pushNotifications: 'Arifa za Papo Hapo',
    pushNotificationsDesc: 'Arifa za marafiki, matukio mapya na tiketi',
    languageSelect: 'Lugha / Language',
    privacyTitle: 'Faragha & Maingiliano',
    discoverableSocials: 'Kuonekana katika Marafiki',
    twoFactorAuth: 'Uthibitishaji wa Hatua Mbili (2FA)',
    securitySafety: 'Usalama & Ulinzi',

    close: 'Funga',
    save: 'Hifadhi',
    cancel: 'Ghairi',
    directions: 'Elekezo',
    uberRide: 'Gari la Uber',
    boltRide: 'Gari la Bolt',
    exactGps: 'Kuratibu Halisi za GPS',
  },
};

const LANG_STORAGE_KEY = 'rada_app_language';

export function getStoredLanguage(): AppLanguage {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'sw' || saved === 'en') return saved;
  } catch (_) {}
  return 'en';
}

export function saveStoredLanguage(lang: AppLanguage): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    window.dispatchEvent(new CustomEvent('rada_language_changed', { detail: lang }));
  } catch (_) {}
}
