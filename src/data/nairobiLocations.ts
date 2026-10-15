export interface NairobiLocationItem {
  name: string;
  neighborhood: string;
  subLocation?: string;
  type: 'bus_stop' | 'landmark' | 'mall' | 'petrol_station' | 'area';
  stageOrLandmark?: string;
  county?: string;
}

export const nairobiLocationsData: NairobiLocationItem[] = [
  // ==========================================
  // NAIROBI COUNTY - WESTLANDS & PARKLANDS
  // ==========================================
  {
    name: 'Mpaka Road Strip',
    neighborhood: 'Westlands',
    subLocation: 'Mpaka Rd',
    type: 'area',
    stageOrLandmark: 'Mpaka Stage • Central Westlands Nightlife Strip',
    county: 'Nairobi'
  },
  {
    name: 'Sarit Centre',
    neighborhood: 'Westlands',
    subLocation: 'Karuna Rd / Lower Kabete',
    type: 'mall',
    stageOrLandmark: 'Sarit Roundabout Stage',
    county: 'Nairobi'
  },
  {
    name: 'Westgate Mall',
    neighborhood: 'Westlands',
    subLocation: 'Mwanzi Rd',
    type: 'mall',
    stageOrLandmark: 'Westgate Bus Drop-off',
    county: 'Nairobi'
  },
  {
    name: 'The Oval',
    neighborhood: 'Westlands',
    subLocation: 'Ring Road Parklands / Jalaram Rd',
    type: 'landmark',
    stageOrLandmark: 'The Oval Stage • Westlands',
    county: 'Nairobi'
  },
  {
    name: 'GTC Tower & JW Marriott',
    neighborhood: 'Westlands',
    subLocation: 'Waiyaki Way / Chiromo Lane',
    type: 'landmark',
    stageOrLandmark: 'GTC Chiromo Bus Stage',
    county: 'Nairobi'
  },
  {
    name: 'Alchemist / Parklands Road',
    neighborhood: 'Westlands',
    subLocation: 'Parklands Rd',
    type: 'bus_stop',
    stageOrLandmark: 'Unga House Stage • Parklands Rd',
    county: 'Nairobi'
  },
  {
    name: 'Shell Waiyaki Way',
    neighborhood: 'Westlands',
    subLocation: 'Waiyaki Way near Curfew',
    type: 'petrol_station',
    stageOrLandmark: 'Shell Westlands Petrol Station',
    county: 'Nairobi'
  },
  {
    name: 'Broadwalk Mall',
    neighborhood: 'Westlands',
    subLocation: 'Ojijo Rd',
    type: 'mall',
    stageOrLandmark: 'Ojijo Stage • Parklands',
    county: 'Nairobi'
  },
  {
    name: 'Diamond Plaza (DP)',
    neighborhood: 'Parklands',
    subLocation: '4th Parklands Ave',
    type: 'mall',
    stageOrLandmark: 'Highridge / Diamond Plaza Stage',
    county: 'Nairobi'
  },
  {
    name: 'Aga Khan Hospital Stage',
    neighborhood: 'Parklands',
    subLocation: '3rd Parklands Ave',
    type: 'bus_stop',
    stageOrLandmark: 'Aga Khan Doctors Plaza Gate',
    county: 'Nairobi'
  },
  {
    name: 'MP Shah Hospital Stage',
    neighborhood: 'Parklands',
    subLocation: 'Shivachi Rd',
    type: 'landmark',
    stageOrLandmark: 'MP Shah Gate • Highridge',
    county: 'Nairobi'
  },

  // ==========================================
  // NAIROBI COUNTY - KILIMANI, HURLINGHAM & KILELESHWA
  // ==========================================
  {
    name: 'Valley Arcade',
    neighborhood: 'Kilimani',
    subLocation: 'Gitanga & Argwings Kodhek Rd',
    type: 'bus_stop',
    stageOrLandmark: 'Valley Arcade Bus Stage & Shopping Arcade',
    county: 'Nairobi'
  },
  {
    name: 'Yaya Centre',
    neighborhood: 'Kilimani',
    subLocation: 'Argwings Kodhek Rd',
    type: 'mall',
    stageOrLandmark: 'Yaya Bus Stage • Near Ring Road Junction',
    county: 'Nairobi'
  },
  {
    name: 'Adlife Plaza',
    neighborhood: 'Kilimani',
    subLocation: 'Chania Ave / Ring Road',
    type: 'landmark',
    stageOrLandmark: 'Adlife Stage • Opposite Yaya',
    county: 'Nairobi'
  },
  {
    name: 'Prestige Plaza',
    neighborhood: 'Kilimani / Ngong Rd',
    subLocation: 'Ngong Road',
    type: 'mall',
    stageOrLandmark: 'Prestige Stage • Near Adams Arcade',
    county: 'Nairobi'
  },
  {
    name: 'TotalEnergies Kilimani',
    neighborhood: 'Kilimani',
    subLocation: 'Argwings Kodhek Rd',
    type: 'petrol_station',
    stageOrLandmark: 'Total Kilimani Station & QuickMart',
    county: 'Nairobi'
  },
  {
    name: 'Shell Argwings Kodhek',
    neighborhood: 'Kilimani',
    subLocation: 'Argwings Kodhek near Rose Ave',
    type: 'petrol_station',
    stageOrLandmark: 'Shell Hurlingham / Kilimani Petrol Station',
    county: 'Nairobi'
  },
  {
    name: 'Dennis Pritt Road Stage',
    neighborhood: 'Kilimani',
    subLocation: 'Dennis Pritt Rd',
    type: 'bus_stop',
    stageOrLandmark: 'Near State House & Cedars',
    county: 'Nairobi'
  },
  {
    name: 'Wood Avenue',
    neighborhood: 'Kilimani',
    subLocation: 'Wood Avenue',
    type: 'area',
    stageOrLandmark: 'Wood Ave Stage • Near CJ\'s Kilimani',
    county: 'Nairobi'
  },
  {
    name: 'Greenhouse Mall',
    neighborhood: 'Kilimani / Adams',
    subLocation: 'Ngong Road',
    type: 'mall',
    stageOrLandmark: 'Greenhouse Stage • Near Adams Arcade',
    county: 'Nairobi'
  },
  {
    name: 'Kasuku Centre',
    neighborhood: 'Kileleshwa',
    subLocation: 'Mandera Rd / Migori Rd',
    type: 'mall',
    stageOrLandmark: 'Kasuku Stage & Shell Kileleshwa',
    county: 'Nairobi'
  },
  {
    name: 'Kileleshwa Ring Road Stage',
    neighborhood: 'Kileleshwa',
    subLocation: 'Ring Road Kileleshwa',
    type: 'bus_stop',
    stageOrLandmark: 'Near Tulips & Arboretum Back Gate',
    county: 'Nairobi'
  },
  {
    name: 'Gatundu Road Stage',
    neighborhood: 'Kileleshwa',
    subLocation: 'Gatundu Rd & Kandara Rd',
    type: 'bus_stop',
    stageOrLandmark: 'Kileleshwa Police Post Stage',
    county: 'Nairobi'
  },

  // ==========================================
  // NAIROBI COUNTY - LAVINGTON, KAREN & LANG'ATA
  // ==========================================
  {
    name: 'Lavington Mall',
    neighborhood: 'Lavington',
    subLocation: 'James Gichuru Rd',
    type: 'mall',
    stageOrLandmark: 'Lavington Mall Stage & Shell Lavington',
    county: 'Nairobi'
  },
  {
    name: 'Lavington Curve',
    neighborhood: 'Lavington',
    subLocation: 'James Gichuru / Muthangari Rd',
    type: 'landmark',
    stageOrLandmark: 'Near Braeburn School Stage',
    county: 'Nairobi'
  },
  {
    name: 'Gitanga Road Junction',
    neighborhood: 'Lavington',
    subLocation: 'Gitanga Rd / Othaya Rd',
    type: 'bus_stop',
    stageOrLandmark: 'Othaya Rd Stage • Near Jaffery Sports Club',
    county: 'Nairobi'
  },
  {
    name: 'The Hub Karen',
    neighborhood: 'Karen',
    subLocation: 'Dagoretti Rd',
    type: 'mall',
    stageOrLandmark: 'The Hub Main Gate Stage',
    county: 'Nairobi'
  },
  {
    name: 'Waterfront Karen',
    neighborhood: 'Karen',
    subLocation: 'Lang\'ata Rd',
    type: 'mall',
    stageOrLandmark: 'Waterfront Roundabout Stage',
    county: 'Nairobi'
  },
  {
    name: 'Karen Crossroads',
    neighborhood: 'Karen',
    subLocation: 'Ngong Rd / Lang\'ata Rd',
    type: 'bus_stop',
    stageOrLandmark: 'Karen Roundabout & TotalEnergies Station',
    county: 'Nairobi'
  },
  {
    name: 'Hardy Stage',
    neighborhood: 'Karen',
    subLocation: 'Ushirika Rd',
    type: 'bus_stop',
    stageOrLandmark: 'Hardy Shopping Centre & Giraffe Centre',
    county: 'Nairobi'
  },
  {
    name: 'Galleria Mall',
    neighborhood: 'Lang\'ata',
    subLocation: 'Lang\'ata Rd & Magadi Rd',
    type: 'mall',
    stageOrLandmark: 'Galleria Roundabout Stage • Bomas of Kenya',
    county: 'Nairobi'
  },
  {
    name: 'Carnivore Stage',
    neighborhood: 'Lang\'ata',
    subLocation: 'Carnivore Rd',
    type: 'landmark',
    stageOrLandmark: 'Carnivore Grounds & Simba Saloon',
    county: 'Nairobi'
  },
  {
    name: 'Wilson Airport Stage',
    neighborhood: 'Lang\'ata',
    subLocation: 'Lang\'ata Road',
    type: 'landmark',
    stageOrLandmark: 'Wilson Terminal 1 & 2 Gate Stage',
    county: 'Nairobi'
  },
  {
    name: 'Clean Shelf Lang\'ata',
    neighborhood: 'Lang\'ata',
    subLocation: 'Lang\'ata Rd near T-Mall',
    type: 'bus_stop',
    stageOrLandmark: 'Lang\'ata High School Stage',
    county: 'Nairobi'
  },

  // ==========================================
  // NAIROBI COUNTY - CBD, UPPER HILL & NGARA
  // ==========================================
  {
    name: 'Kencom House Stage',
    neighborhood: 'CBD',
    subLocation: 'Moi Avenue & City Hall Way',
    type: 'bus_stop',
    stageOrLandmark: 'Kencom Express City Terminal',
    county: 'Nairobi'
  },
  {
    name: 'Ambassadeur Stage',
    neighborhood: 'CBD',
    subLocation: 'Moi Ave & Tom Mboya',
    type: 'bus_stop',
    stageOrLandmark: 'Ambassadeur Hotel Terminal',
    county: 'Nairobi'
  },
  {
    name: 'Kenya National Archives',
    neighborhood: 'CBD',
    subLocation: 'Tom Mboya Street',
    type: 'landmark',
    stageOrLandmark: 'Archives Stage • Hilton Junction',
    county: 'Nairobi'
  },
  {
    name: 'Railways Bus Station',
    neighborhood: 'CBD',
    subLocation: 'Haile Selassie Ave',
    type: 'bus_stop',
    stageOrLandmark: 'Railways Matatu & Train Terminal',
    county: 'Nairobi'
  },
  {
    name: 'Gikomba Market Stall 4B & 9C',
    neighborhood: 'CBD / Gikomba',
    subLocation: 'Gikomba Lane 3',
    type: 'landmark',
    stageOrLandmark: 'Gikomba Bridge Stage • Vintage Thrift Strip',
    county: 'Nairobi'
  },
  {
    name: 'Odeon Cinema Stage',
    neighborhood: 'CBD',
    subLocation: 'Latema Rd / Tom Mboya',
    type: 'bus_stop',
    stageOrLandmark: 'Odeon Matatu Terminus',
    county: 'Nairobi'
  },
  {
    name: 'Khoja Mosque Roundabout',
    neighborhood: 'CBD',
    subLocation: 'River Road / Tom Mboya',
    type: 'bus_stop',
    stageOrLandmark: 'Khoja Stage • Central Bus Terminus',
    county: 'Nairobi'
  },
  {
    name: 'Kenyatta National Hospital (KNH)',
    neighborhood: 'Upper Hill',
    subLocation: 'Hospital Rd',
    type: 'landmark',
    stageOrLandmark: 'KNH Doctors Plaza Stage',
    county: 'Nairobi'
  },
  {
    name: 'Britam Tower Stage',
    neighborhood: 'Upper Hill',
    subLocation: 'Mara Rd / Hospital Rd',
    type: 'landmark',
    stageOrLandmark: 'Upper Hill Financial District Stage',
    county: 'Nairobi'
  },
  {
    name: 'Ngara Fig Tree Stage',
    neighborhood: 'Ngara',
    subLocation: 'Murang\'a Rd',
    type: 'bus_stop',
    stageOrLandmark: 'Fig Tree Market Terminus • Thika Rd Link',
    county: 'Nairobi'
  },

  // ==========================================
  // NAIROBI COUNTY - SOUTH B, SOUTH C & NAIROBI WEST
  // ==========================================
  {
    name: 'Capital Centre',
    neighborhood: 'South B',
    subLocation: 'Mombasa Road',
    type: 'mall',
    stageOrLandmark: 'Capital Centre Footbridge Stage',
    county: 'Nairobi'
  },
  {
    name: 'South B Mosque Stage',
    neighborhood: 'South B',
    subLocation: 'Kapiti Rd',
    type: 'bus_stop',
    stageOrLandmark: 'South B Shopping Centre & Plainsview',
    county: 'Nairobi'
  },
  {
    name: 'South C Shopping Centre',
    neighborhood: 'South C',
    subLocation: 'Muhoho Ave',
    type: 'bus_stop',
    stageOrLandmark: 'South C Flyover & Total South C',
    county: 'Nairobi'
  },
  {
    name: 'Bellevue Mombasa Road Stage',
    neighborhood: 'South C',
    subLocation: 'Mombasa Rd near Bellevue',
    type: 'bus_stop',
    stageOrLandmark: 'Bellevue Stage • Near Boma Hotel',
    county: 'Nairobi'
  },
  {
    name: 'Nairobi West Mall Stage',
    neighborhood: 'Nairobi West',
    subLocation: 'Gandhi Ave',
    type: 'bus_stop',
    stageOrLandmark: 'Nairobi West Hospital & Nightlife Strip',
    county: 'Nairobi'
  },
  {
    name: 'Nyayo National Stadium',
    neighborhood: 'Nairobi West / CBD Link',
    subLocation: 'Aerodrome Rd / Lang\'ata Rd',
    type: 'landmark',
    stageOrLandmark: 'Nyayo Stadium Roundabout Stage',
    county: 'Nairobi'
  },

  // ==========================================
  // NAIROBI COUNTY - NGONG ROAD, KAWANGWARE & DAGORETTI
  // ==========================================
  {
    name: 'The Junction Mall',
    neighborhood: 'Ngong Road',
    subLocation: 'Ngong Rd / King\'ara Rd',
    type: 'mall',
    stageOrLandmark: 'Junction Stage & Shell King\'ara',
    county: 'Nairobi'
  },
  {
    name: 'Adams Arcade',
    neighborhood: 'Ngong Road',
    subLocation: 'Ngong Rd & Elgeyo Marakwet',
    type: 'landmark',
    stageOrLandmark: 'Adams Stage • Java House Adams',
    county: 'Nairobi'
  },
  {
    name: 'Dagoretti Corner',
    neighborhood: 'Ngong Road',
    subLocation: 'Naivasha Rd Junction',
    type: 'bus_stop',
    stageOrLandmark: 'Dagoretti Corner Roundabout Stage',
    county: 'Nairobi'
  },
  {
    name: 'Kawangware 46 Stage',
    neighborhood: 'Kawangware',
    subLocation: 'Naivasha Rd',
    type: 'bus_stop',
    stageOrLandmark: 'Stage 46 Matatu Terminus',
    county: 'Nairobi'
  },
  {
    name: 'Riruta Satellite Stage',
    neighborhood: 'Dagoretti',
    subLocation: 'Wanyee Rd / Kikuyu Rd',
    type: 'bus_stop',
    stageOrLandmark: 'Riruta Health Centre Stage',
    county: 'Nairobi'
  },

  // ==========================================
  // NAIROBI COUNTY - GIGIRI, RUNDA & MUTHAIGA
  // ==========================================
  {
    name: 'Village Market',
    neighborhood: 'Gigiri',
    subLocation: 'Limuru Road',
    type: 'mall',
    stageOrLandmark: 'Village Market Stage • Near UN Gate',
    county: 'Nairobi'
  },
  {
    name: 'TotalEnergies Gigiri',
    neighborhood: 'Gigiri',
    subLocation: 'UN Avenue',
    type: 'petrol_station',
    stageOrLandmark: 'Total UN Avenue Station',
    county: 'Nairobi'
  },
  {
    name: 'Runda Gate Stage',
    neighborhood: 'Runda',
    subLocation: 'Runda Grove / Pan Africa Insurance',
    type: 'landmark',
    stageOrLandmark: 'Runda Water Gate Stage',
    county: 'Nairobi'
  },
  {
    name: 'Muthaiga Country Club & Mini Market',
    neighborhood: 'Muthaiga',
    subLocation: 'Muthaiga Rd',
    type: 'landmark',
    stageOrLandmark: 'Muthaiga Roundabout Stage',
    county: 'Nairobi'
  },
  {
    name: 'Two Rivers Mall',
    neighborhood: 'Limuru Rd / Ruaka Link',
    subLocation: 'Northern Bypass',
    type: 'mall',
    stageOrLandmark: 'Two Rivers Terminus & Ferris Wheel',
    county: 'Nairobi'
  },

  // ==========================================
  // NAIROBI COUNTY - EASTLEIGH, BURUBURU, UMOJA & DONHOLM
  // ==========================================
  {
    name: 'BBS Mall (Business Bay Square)',
    neighborhood: 'Eastleigh',
    subLocation: 'General Waruinge St',
    type: 'mall',
    stageOrLandmark: 'BBS Main Entrance Stage',
    county: 'Nairobi'
  },
  {
    name: 'Garissa Lodge Stage',
    neighborhood: 'Eastleigh',
    subLocation: '1st Avenue Eastleigh',
    type: 'area',
    stageOrLandmark: 'Eastleigh 1st Ave Wholesale Strip',
    county: 'Nairobi'
  },
  {
    name: 'The Point Mall Buruburu',
    neighborhood: 'Buruburu',
    subLocation: 'Mumias South Rd',
    type: 'mall',
    stageOrLandmark: 'Buruburu Phase 4 Stage',
    county: 'Nairobi'
  },
  {
    name: 'Greenspan Mall',
    neighborhood: 'Donholm',
    subLocation: 'Savannah Rd',
    type: 'mall',
    stageOrLandmark: 'Greenspan Gate Stage • Donholm Phase 8',
    county: 'Nairobi'
  },
  {
    name: 'Umoja 1 Innercore Stage',
    neighborhood: 'Umoja',
    subLocation: 'Moi Drive',
    type: 'bus_stop',
    stageOrLandmark: 'Umoja Market Stage • Moi Drive',
    county: 'Nairobi'
  },
  {
    name: 'Komarock Mall Stage',
    neighborhood: 'Komarock',
    subLocation: 'Kangundo Rd',
    type: 'mall',
    stageOrLandmark: 'Koma Stage • Near Mama Lucy Hospital',
    county: 'Nairobi'
  },
  {
    name: 'Fedha & Pipeline Stage',
    neighborhood: 'Embakasi',
    subLocation: 'Outering Rd / Airport North Rd',
    type: 'bus_stop',
    stageOrLandmark: 'Pipeline Railway Footbridge Stage',
    county: 'Nairobi'
  },

  // ==========================================
  // NAIROBI COUNTY - THIKA ROAD CORRIDOR (NAIROBI)
  // ==========================================
  {
    name: 'Garden City Mall',
    neighborhood: 'Thika Road',
    subLocation: 'Thika Road Exit 7',
    type: 'mall',
    stageOrLandmark: 'Garden City Footbridge Stage',
    county: 'Nairobi'
  },
  {
    name: 'Thika Road Mall (TRM)',
    neighborhood: 'Roysambu',
    subLocation: 'Thika Superhighway Exit 8',
    type: 'mall',
    stageOrLandmark: 'TRM Underpass & Roysambu Roundabout Stage',
    county: 'Nairobi'
  },
  {
    name: 'Safari Park Hotel Stage',
    neighborhood: 'Kasarani',
    subLocation: 'Thika Superhighway Exit 7B',
    type: 'landmark',
    stageOrLandmark: 'Safari Park Footbridge Stage',
    county: 'Nairobi'
  },
  {
    name: 'Kasarani Sports View Stage',
    neighborhood: 'Kasarani',
    subLocation: 'Kasarani-Mwiki Rd',
    type: 'bus_stop',
    stageOrLandmark: 'Moi International Sports Centre Gate',
    county: 'Nairobi'
  },
  {
    name: 'Zimmerman Base Stage',
    neighborhood: 'Zimmerman',
    subLocation: 'Kamiti Rd / Mirema Drive',
    type: 'bus_stop',
    stageOrLandmark: 'Mirema Junction Stage',
    county: 'Nairobi'
  },
  {
    name: 'Kahawa West Stage',
    neighborhood: 'Kahawa West',
    subLocation: 'Kamiti Rd',
    type: 'bus_stop',
    stageOrLandmark: 'Kahawa West Roundabout & Market',
    county: 'Nairobi'
  },
  {
    name: 'Kahawa Sukari Gate Stage',
    neighborhood: 'Kahawa Sukari',
    subLocation: 'Thika Road Exit 9',
    type: 'bus_stop',
    stageOrLandmark: 'Sukari Main Avenue Gate Stage',
    county: 'Nairobi'
  },
  {
    name: 'Kahawa Wendani Stage',
    neighborhood: 'Kahawa Wendani',
    subLocation: 'Thika Road Exit 10',
    type: 'bus_stop',
    stageOrLandmark: 'Near Magunas Supermarket Wendani',
    county: 'Nairobi'
  },
  {
    name: 'Githurai 44 Roundabout',
    neighborhood: 'Githurai',
    subLocation: 'Kamiti Rd link',
    type: 'bus_stop',
    stageOrLandmark: 'Stage 44 Bus Terminus',
    county: 'Nairobi'
  },
  {
    name: 'Githurai 45 Flyover',
    neighborhood: 'Githurai',
    subLocation: 'Thika Superhighway Exit 11',
    type: 'bus_stop',
    stageOrLandmark: 'Githurai 45 Market Stage',
    county: 'Nairobi'
  },

  // ==========================================
  // MAJOR TRANSIT CORRIDORS (MOMBASA ROAD, SYOKIMAU, MLOLONGO, ATHI RIVER)
  // ==========================================
  {
    name: 'SGR Nairobi Terminus (Syokimau)',
    neighborhood: 'Syokimau',
    subLocation: 'Mombasa Road / SGR Access Rd',
    type: 'landmark',
    stageOrLandmark: 'Standard Gauge Railway Syokimau Terminal',
    county: 'Mombasa Rd Corridor'
  },
  {
    name: 'JKIA Airport Terminal Stage',
    neighborhood: 'Mombasa Road',
    subLocation: 'Airport South Rd',
    type: 'landmark',
    stageOrLandmark: 'Jomo Kenyatta International Airport Gate 1',
    county: 'Mombasa Rd Corridor'
  },
  {
    name: 'Gateway Mall Syokimau',
    neighborhood: 'Syokimau',
    subLocation: 'Mombasa Rd & Airport Rd Junction',
    type: 'mall',
    stageOrLandmark: 'Gateway Mall Footbridge Stage',
    county: 'Mombasa Rd Corridor'
  },
  {
    name: 'Syokimau Katani Road Junction',
    neighborhood: 'Syokimau',
    subLocation: 'Katani Rd / Mombasa Rd',
    type: 'bus_stop',
    stageOrLandmark: 'Katani Stage • TotalEnergies Syokimau',
    county: 'Mombasa Rd Corridor'
  },
  {
    name: 'Mlolongo Expressway Toll Stage',
    neighborhood: 'Mlolongo',
    subLocation: 'Nairobi Expressway Mlolongo Exit',
    type: 'landmark',
    stageOrLandmark: 'Mlolongo Weighbridge Stage',
    county: 'Mombasa Rd Corridor'
  },
  {
    name: 'Mlolongo Town Stage',
    neighborhood: 'Mlolongo',
    subLocation: 'Old Mombasa Road',
    type: 'bus_stop',
    stageOrLandmark: 'Mlolongo Phase 2 & Shell Mlolongo',
    county: 'Mombasa Rd Corridor'
  },
  {
    name: 'Signature Mall Mlolongo / Sabaki',
    neighborhood: 'Mlolongo / Sabaki',
    subLocation: 'Mombasa Road Sabaki',
    type: 'mall',
    stageOrLandmark: 'Signature Mall Main Gate Stage',
    county: 'Mombasa Rd Corridor'
  },
  {
    name: 'Crystal Rivers Mall (Safaricom)',
    neighborhood: 'Athi River',
    subLocation: 'Mombasa Rd / Athi River',
    type: 'mall',
    stageOrLandmark: 'Crystal Rivers Mall Footbridge Stage',
    county: 'Mombasa Rd Corridor'
  },
  {
    name: 'Athi River Interchange',
    neighborhood: 'Athi River',
    subLocation: 'Namanga Rd / Mombasa Rd Junction',
    type: 'bus_stop',
    stageOrLandmark: 'Athi River Flyover & T-Mall Athi',
    county: 'Mombasa Rd Corridor'
  },
  {
    name: 'Daystar University Junction',
    neighborhood: 'Athi River',
    subLocation: 'Daystar Rd off Mombasa Rd',
    type: 'landmark',
    stageOrLandmark: 'Daystar Athi River Main Gate Stage',
    county: 'Mombasa Rd Corridor'
  },
  {
    name: 'Kitengela Interchange Stage',
    neighborhood: 'Kitengela Corridor',
    subLocation: 'Namanga Road',
    type: 'bus_stop',
    stageOrLandmark: 'Kitengela Town Bus Park & Tarikiville Mall',
    county: 'Mombasa Rd Corridor'
  },

  // ==========================================
  // KIAMBU COUNTY (RUIRU, THIKA, KIAMBU TOWN, KIKUYU, NDENDERU, BANANA, RUAKA, ETC.)
  // ==========================================
  {
    name: 'Ruiru Town Flyover',
    neighborhood: 'Ruiru',
    subLocation: 'Thika Superhighway Exit 12',
    type: 'bus_stop',
    stageOrLandmark: 'Ruiru Main Stage & Railway Station',
    county: 'Kiambu'
  },
  {
    name: 'Spur Mall Kimbo',
    neighborhood: 'Ruiru',
    subLocation: 'Thika Superhighway Exit 13',
    type: 'mall',
    stageOrLandmark: 'Spur Mall Stage • Kimbo / Toll',
    county: 'Kiambu'
  },
  {
    name: 'Tatu City Main Entrance',
    neighborhood: 'Ruiru / Tatu City',
    subLocation: 'Ruiru-Kamiti Rd',
    type: 'landmark',
    stageOrLandmark: 'Tatu City Welcome Centre Stage',
    county: 'Kiambu'
  },
  {
    name: 'Kamakis Bypass Grill Strip',
    neighborhood: 'Ruiru',
    subLocation: 'Eastern Bypass Kamakis',
    type: 'area',
    stageOrLandmark: 'Kamakis Stage • Nyama Choma Hub',
    county: 'Kiambu'
  },
  {
    name: 'Membley Estate Gate Stage',
    neighborhood: 'Ruiru',
    subLocation: 'Northern Bypass / Eastern Bypass',
    type: 'bus_stop',
    stageOrLandmark: 'Membley Gate Stage',
    county: 'Kiambu'
  },
  {
    name: 'Thika Town Chania Falls Stage',
    neighborhood: 'Thika',
    subLocation: 'Garissa Rd / Kenyatta Hwy',
    type: 'bus_stop',
    stageOrLandmark: 'Chania Falls Stage & Blue Post Hotel',
    county: 'Kiambu'
  },
  {
    name: 'Ananas Mall Makongeni',
    neighborhood: 'Thika',
    subLocation: 'Garissa Highway Makongeni',
    type: 'mall',
    stageOrLandmark: 'Ananas Mall Main Stage',
    county: 'Kiambu'
  },
  {
    name: 'Section 9 Thika',
    neighborhood: 'Thika',
    subLocation: 'General Kago Rd',
    type: 'area',
    stageOrLandmark: 'Section 9 Medical Centre Stage',
    county: 'Kiambu'
  },
  {
    name: 'Kiambu Town Main Bus Park',
    neighborhood: 'Kiambu Town',
    subLocation: 'Kiambu-Nairobi Rd',
    type: 'bus_stop',
    stageOrLandmark: 'Kiambu Main Terminus & Eden Square',
    county: 'Kiambu'
  },
  {
    name: 'Kirigiti Stadium Stage',
    neighborhood: 'Kiambu Town',
    subLocation: 'Kirigiti Rd',
    type: 'landmark',
    stageOrLandmark: 'Kirigiti Stadium Gate Stage',
    county: 'Kiambu'
  },
  {
    name: 'Ting\'ang\'a Shopping Centre',
    neighborhood: 'Ting\'ang\'a',
    subLocation: 'Kiambu-Ting\'ang\'a Rd',
    type: 'bus_stop',
    stageOrLandmark: 'Ting\'ang\'a Central Stage',
    county: 'Kiambu'
  },
  {
    name: 'Ruaka Square Stage',
    neighborhood: 'Ruaka',
    subLocation: 'Limuru Rd / Northern Bypass',
    type: 'bus_stop',
    stageOrLandmark: 'Ruaka Bypass Roundabout & QuickMart',
    county: 'Kiambu'
  },
  {
    name: 'Ndenderu Stage',
    neighborhood: 'Ndenderu',
    subLocation: 'Limuru Rd & Western Bypass',
    type: 'bus_stop',
    stageOrLandmark: 'Ndenderu Junction & TotalEnergies',
    county: 'Kiambu'
  },
  {
    name: 'Banana Hill Shopping Centre',
    neighborhood: 'Banana / Karuri',
    subLocation: 'Banana-Raini Rd',
    type: 'bus_stop',
    stageOrLandmark: 'Banana Hill Market Stage',
    county: 'Kiambu'
  },
  {
    name: 'Karuri Market Stage',
    neighborhood: 'Karuri',
    subLocation: 'Banana-Kiambu Rd',
    type: 'bus_stop',
    stageOrLandmark: 'Karuri Sub-County Offices Stage',
    county: 'Kiambu'
  },
  {
    name: 'Muchatha Stage',
    neighborhood: 'Muchatha',
    subLocation: 'Banana-Ruaka Rd',
    type: 'bus_stop',
    stageOrLandmark: 'Muchatha Shopping Strip',
    county: 'Kiambu'
  },
  {
    name: 'Gachie Shopping Centre',
    neighborhood: 'Gachie',
    subLocation: 'Gachie Rd near Kitisuru Link',
    type: 'bus_stop',
    stageOrLandmark: 'Gachie Market Terminus',
    county: 'Kiambu'
  },
  {
    name: 'Kikuyu Town Railway Stage',
    neighborhood: 'Kikuyu',
    subLocation: 'Southern Bypass / Kikuyu Rd',
    type: 'bus_stop',
    stageOrLandmark: 'Kikuyu Main Railway Station & Market',
    county: 'Kiambu'
  },
  {
    name: 'Wangige Market Stage',
    neighborhood: 'Wangige',
    subLocation: 'Lower Kabete Rd / Western Bypass',
    type: 'bus_stop',
    stageOrLandmark: 'Wangige Junction Market Terminus',
    county: 'Kiambu'
  },
  {
    name: 'Limuru Town Stage',
    neighborhood: 'Limuru',
    subLocation: 'Nairobi-Nakuru Hwy link',
    type: 'bus_stop',
    stageOrLandmark: 'Limuru Main Bus Park & Bata Shoe Factory',
    county: 'Kiambu'
  },
  {
    name: 'Tigoni Tea Farms View Stage',
    neighborhood: 'Tigoni / Limuru',
    subLocation: 'Tigoni Rd',
    type: 'landmark',
    stageOrLandmark: 'Brackenhurst & Waterfalls Inn Stage',
    county: 'Kiambu'
  },
  {
    name: 'Juja City Mall Stage',
    neighborhood: 'Juja',
    subLocation: 'Thika Superhighway Exit 14',
    type: 'mall',
    stageOrLandmark: 'Juja Mall & JKUAT Main Gate A Stage',
    county: 'Kiambu'
  },
  {
    name: 'Juja High Point Stage',
    neighborhood: 'Juja',
    subLocation: 'Thika Superhighway',
    type: 'bus_stop',
    stageOrLandmark: 'High Point Bus Stop • Juja',
    county: 'Kiambu'
  },
  // ==========================================
  // NAIROBI ROYSAMBU & KASARANI
  // ==========================================
  {
    name: 'Thika Road Mall (TRM)',
    neighborhood: 'Roysambu',
    subLocation: 'Thika Superhighway Exit 7',
    type: 'mall',
    stageOrLandmark: 'opposite Kasarani stage',
    county: 'Nairobi'
  },
  {
    name: 'Kasarani Sports Stadium',
    neighborhood: 'Kasarani',
    subLocation: 'Kasarani Mwiki Rd',
    type: 'landmark',
    stageOrLandmark: 'Kasarani Aquatic Stage',
    county: 'Nairobi'
  },
  // ==========================================
  // MOMBASA & COASTAL CORRIDOR
  // ==========================================
  {
    name: 'Nyali Cinemax & City Mall',
    neighborhood: 'Nyali',
    subLocation: 'Links Road',
    type: 'mall',
    stageOrLandmark: 'Nyali Bridge / City Mall Stage',
    county: 'Mombasa'
  },
  {
    name: 'Diani Beach Road Strip',
    neighborhood: 'Diani',
    subLocation: 'Beach Road, South Coast',
    type: 'area',
    stageOrLandmark: 'Carrefour Diani / Kongo Mosque Stage',
    county: 'Kwale / Diani'
  },
  {
    name: 'Bamburi Beach Stage',
    neighborhood: 'Bamburi',
    subLocation: 'Malindi Highway',
    type: 'landmark',
    stageOrLandmark: 'Haller Park & Pirates Beach Stage',
    county: 'Mombasa'
  },
  // ==========================================
  // RIFT VALLEY & OUTSKIRTS
  // ==========================================
  {
    name: 'Buffalo Mall Naivasha',
    neighborhood: 'Naivasha',
    subLocation: 'Nairobi-Nakuru Highway',
    type: 'mall',
    stageOrLandmark: 'Buffalo Mall Roundabout Stage',
    county: 'Nakuru'
  },
  {
    name: 'Westside Mall Nakuru',
    neighborhood: 'Nakuru Town',
    subLocation: 'Kenyatta Avenue',
    type: 'mall',
    stageOrLandmark: 'Westside Stage • Nakuru CBD',
    county: 'Nakuru'
  },
  {
    name: 'Rupa Village Mall Eldoret',
    neighborhood: 'Eldoret',
    subLocation: 'Malaba Road',
    type: 'mall',
    stageOrLandmark: 'Rupa Roundabout Stage',
    county: 'Uasin Gishu / Eldoret'
  },
  // ==========================================
  // WESTERN & NYANZA
  // ==========================================
  {
    name: 'Mega City Mall Kisumu',
    neighborhood: 'Kisumu CBD',
    subLocation: 'Nairobi Road',
    type: 'mall',
    stageOrLandmark: 'Mega City Flyover Stage',
    county: 'Kisumu'
  },
  {
    name: 'Dunga Hill Camp',
    neighborhood: 'Dunga, Kisumu',
    subLocation: 'Lake Victoria Shoreline',
    type: 'landmark',
    stageOrLandmark: 'Dunga Beach Stage',
    county: 'Kisumu'
  },
  // ==========================================
  // MACHAKOS & EASTERN
  // ==========================================
  {
    name: 'Machakos People\'s Park',
    neighborhood: 'Machakos Town',
    subLocation: 'Maruba Dam Rd',
    type: 'landmark',
    stageOrLandmark: 'People\'s Park Main Gate Stage',
    county: 'Machakos'
  },
  {
    name: 'Signature Mall Mlolongo',
    neighborhood: 'Mlolongo / Mombasa Rd',
    subLocation: 'Mombasa Highway',
    type: 'mall',
    stageOrLandmark: 'Mlolongo Expressway Stage',
    county: 'Machakos'
  }
];

/**
 * Format exact location tag clearly as:
 * "Town/Area, Neighborhood, Landmark/Stage" (e.g., "Nairobi, Roysambu, opposite Kasarani stage")
 */
export function formatExactLocationTag(townOrArea: string, neighborhood: string, landmarkOrStage: string): string {
  const parts = [
    townOrArea.trim(),
    neighborhood.trim(),
    landmarkOrStage.trim()
  ].filter(Boolean);
  return parts.join(', ');
}

export function searchNairobiLocations(query: string): NairobiLocationItem[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return nairobiLocationsData.slice(0, 12);
  }
  
  const terms = q.split(/\s+/).filter(Boolean);

  return nairobiLocationsData.filter((loc) => {
    const combinedStr = `${loc.name} ${loc.neighborhood} ${loc.subLocation || ''} ${loc.stageOrLandmark || ''} ${loc.county || ''}`.toLowerCase();
    return terms.every(term => combinedStr.includes(term));
  }).slice(0, 15);
}

/**
 * Map-Driven Kenyan Location Auto-suggestion Engine.
 * Fetches actual live places and landmarks directly from OpenStreetMap Nominatim across Kenya,
 * gracefully blending with the offline rich Kenyan location database.
 */
export async function fetchMapDrivenLocations(query: string): Promise<NairobiLocationItem[]> {
  const localResults = searchNairobiLocations(query);
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) {
    return localResults;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2200);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&countrycodes=ke&addressdetails=1&limit=8`,
      { 
        signal: controller.signal,
        headers: {
          'Accept-Language': 'en'
        }
      }
    );
    clearTimeout(timeout);

    if (!res.ok) return localResults;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return localResults;

    const mapItems: NairobiLocationItem[] = data.map((place: any) => {
      const addr = place.address || {};
      const town = addr.city || addr.town || addr.municipality || addr.county || 'Kenya';
      const neighborhood = addr.suburb || addr.neighbourhood || addr.village || addr.quarter || addr.subdistrict || town;
      const landmark = place.name || addr.road || place.display_name.split(',')[0];
      const stageOrStageDesc = `${town}, ${neighborhood}, near ${landmark}`;

      return {
        name: landmark,
        neighborhood,
        subLocation: town,
        type: 'landmark' as const,
        stageOrLandmark: stageOrStageDesc,
        county: addr.state || addr.county || town
      };
    });

    // Merge map results at the top while removing duplicates
    const seen = new Set<string>();
    const merged: NairobiLocationItem[] = [];

    for (const item of [...mapItems, ...localResults]) {
      const key = `${item.name.toLowerCase()}-${item.neighborhood.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(item);
      }
    }

    return merged.slice(0, 16);
  } catch {
    return localResults;
  }
}
