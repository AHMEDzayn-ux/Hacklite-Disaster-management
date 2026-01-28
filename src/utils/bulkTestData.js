import { createDocument, TABLES } from '../services/supabaseService';

const SRI_LANKA_DISTRICTS = [
    'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
    'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
    'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
    'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
    'Monaragala', 'Ratnapura', 'Kegalle'
];

const FIRST_NAMES = [
    'Nimal', 'Kamal', 'Sunil', 'Anil', 'Ravi', 'Saman', 'Kumara', 'Prasad',
    'Chaminda', 'Nuwan', 'Samanthi', 'Dilrukshi', 'Madhavi', 'Sachini',
    'Sanduni', 'Thisuri', 'Kaveesha', 'Nimali', 'Chathurika', 'Anusha',
    'Tharaka', 'Janith', 'Kasun', 'Dinesh', 'Ruwan', 'Asanka', 'Buddhika',
    'Thilini', 'Malsha', 'Hiruni', 'Nadeeka', 'Chamari', 'Iresha', 'Harini'
];

const LAST_NAMES = [
    'Fernando', 'Silva', 'Perera', 'de Silva', 'Gunasekara', 'Jayawardena',
    'Wickramasinghe', 'Dissanayake', 'Rajapaksa', 'Mendis', 'Amarasinghe',
    'Weerasinghe', 'Gamage', 'Bandara', 'Kumara', 'Samarasinghe', 'Wijesinghe',
    'Gunawardena', 'Ranasinghe', 'Liyanage', 'Senanayake', 'Herath'
];

const DISASTER_TYPES = ['flood', 'landslide', 'fire', 'cyclone', 'drought', 'earthquake'];
const SEVERITIES = ['low', 'moderate', 'high', 'critical'];
const ANIMAL_TYPES = ['dog', 'cat', 'cattle', 'buffalo', 'goat', 'wild-animal'];
const CONDITIONS = ['injured', 'trapped', 'lost', 'healthy'];

// Photo URLs from reliable sources
const PERSON_PHOTOS = [
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400',
    'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
    'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400'
];

const DISASTER_PHOTOS = {
    flood: [
        'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800',
        'https://images.unsplash.com/photo-1624024242180-3f86c56c768a?w=800',
        'https://images.unsplash.com/photo-1527482797697-8795b05a13fe?w=800'
    ],
    landslide: [
        'https://images.unsplash.com/photo-1514905552197-0610a4d8fd73?w=800',
        'https://images.unsplash.com/photo-1561553590-267fc716698a?w=800'
    ],
    fire: [
        'https://images.unsplash.com/photo-1534871454100-c5c9e4e6e1b6?w=800',
        'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=800',
        'https://images.unsplash.com/photo-1525267219888-bb077b8792cc?w=800'
    ],
    cyclone: [
        'https://images.unsplash.com/photo-1527482937786-6608eea15f5d?w=800',
        'https://images.unsplash.com/photo-1559628376-f3fe5f782a2e?w=800'
    ],
    drought: [
        'https://images.unsplash.com/photo-1591273356488-0a1f51e83e7e?w=800',
        'https://images.unsplash.com/photo-1519491050282-cf00c82424b4?w=800'
    ],
    earthquake: [
        'https://images.unsplash.com/photo-1543722530-d2c3201371e7?w=800',
        'https://images.unsplash.com/photo-1564939558297-fc396f18e5c7?w=800'
    ]
};

const ANIMAL_PHOTOS = {
    dog: [
        'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800',
        'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=800',
        'https://images.unsplash.com/photo-1552053831-71594a27632d?w=800'
    ],
    cat: [
        'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800',
        'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800',
        'https://images.unsplash.com/photo-1573865526739-10c1deaeec60?w=800'
    ],
    cattle: [
        'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=800',
        'https://images.unsplash.com/photo-1524024973431-2ad916746881?w=800'
    ],
    buffalo: [
        'https://images.unsplash.com/photo-1581200216484-8a46b6e0b92e?w=800',
        'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=800'
    ],
    goat: [
        'https://images.unsplash.com/photo-1533318087102-b3ad366ed041?w=800',
        'https://images.unsplash.com/photo-1562690868-60bbe7293e94?w=800'
    ],
    'wild-animal': [
        'https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=800',
        'https://images.unsplash.com/photo-1549480017-d76466a4b7e8?w=800'
    ]
};

const CAMP_PHOTOS = [
    'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800',
    'https://images.unsplash.com/photo-1578645510447-e20b4311e3ce?w=800',
    'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=800',
    'https://images.unsplash.com/photo-1523895665936-7bfe172b757d?w=800'
];

// Detailed location data with real places in Sri Lanka districts
const DISTRICT_LOCATIONS = {
    'Colombo': [
        { area: 'Pettah', lat: 6.9353, lng: 79.8519 },
        { area: 'Fort', lat: 6.9344, lng: 79.8428 },
        { area: 'Kollupitiya', lat: 6.9147, lng: 79.8502 },
        { area: 'Nugegoda', lat: 6.8649, lng: 79.8997 },
        { area: 'Dehiwala', lat: 6.8520, lng: 79.8630 }
    ],
    'Gampaha': [
        { area: 'Negombo', lat: 7.2094, lng: 79.8358 },
        { area: 'Ja-Ela', lat: 7.0747, lng: 79.8919 },
        { area: 'Kadawatha', lat: 7.0008, lng: 79.9533 },
        { area: 'Wattala', lat: 6.9890, lng: 79.8917 }
    ],
    'Kandy': [
        { area: 'Peradeniya', lat: 7.2599, lng: 80.5977 },
        { area: 'Katugastota', lat: 7.3215, lng: 80.6347 },
        { area: 'Gampola', lat: 7.1644, lng: 80.5770 },
        { area: 'Temple Area', lat: 7.2936, lng: 80.6400 }
    ],
    'Galle': [
        { area: 'Fort Area', lat: 6.0270, lng: 80.2170 },
        { area: 'Hikkaduwa', lat: 6.1408, lng: 80.1033 },
        { area: 'Unawatuna', lat: 6.0107, lng: 80.2496 },
        { area: 'Baddegama', lat: 6.1847, lng: 80.1974 }
    ],
    'Matara': [
        { area: 'Weligama', lat: 5.9750, lng: 80.4294 },
        { area: 'Mirissa', lat: 5.9467, lng: 80.4592 },
        { area: 'Dikwella', lat: 5.9678, lng: 80.6833 },
        { area: 'Akuressa', lat: 6.0992, lng: 80.4850 }
    ],
    'Jaffna': [
        { area: 'Nallur', lat: 9.6778, lng: 80.0266 },
        { area: 'Chunnakam', lat: 9.7167, lng: 80.0333 },
        { area: 'Chavakachcheri', lat: 9.6667, lng: 80.1667 },
        { area: 'Point Pedro', lat: 9.8167, lng: 80.2333 }
    ],
    'Batticaloa': [
        { area: 'Kallady', lat: 7.7167, lng: 81.7000 },
        { area: 'Kattankudy', lat: 7.6833, lng: 81.7333 },
        { area: 'Eravur', lat: 7.7833, lng: 81.6000 }
    ],
    'Anuradhapura': [
        { area: 'Sacred City', lat: 8.3114, lng: 80.4037 },
        { area: 'Mihintale', lat: 8.3500, lng: 80.5000 },
        { area: 'Medawachchiya', lat: 8.5408, lng: 80.4958 }
    ],
    'Kurunegala': [
        { area: 'Town Center', lat: 7.4867, lng: 80.3647 },
        { area: 'Maho', lat: 7.8833, lng: 80.2500 },
        { area: 'Wariyapola', lat: 7.4833, lng: 80.1500 }
    ],
    'Ratnapura': [
        { area: 'Gem City', lat: 6.6828, lng: 80.3992 },
        { area: 'Balangoda', lat: 6.6494, lng: 80.6819 },
        { area: 'Embilipitiya', lat: 6.3433, lng: 80.8503 }
    ]
};

// Generate random location within Sri Lanka with detailed address
const generateLocation = (district) => {
    const defaultCoords = { lat: 7.8731, lng: 80.7718 };
    
    // Use detailed locations if available
    if (DISTRICT_LOCATIONS[district]) {
        const locations = DISTRICT_LOCATIONS[district];
        const location = locations[Math.floor(Math.random() * locations.length)];
        return {
            lat: location.lat + (Math.random() - 0.5) * 0.01,
            lng: location.lng + (Math.random() - 0.5) * 0.01,
            address: `${location.area}, ${district}, Sri Lanka`
        };
    }
    
    // Fallback to basic coordinates
    const districtCoords = {
        'Kalutara': { lat: 6.5854, lng: 79.9607 },
        'Matale': { lat: 7.4675, lng: 80.6234 },
        'Nuwara Eliya': { lat: 6.9497, lng: 80.7891 },
        'Hambantota': { lat: 6.1429, lng: 81.1212 },
        'Kilinochchi': { lat: 9.3961, lng: 80.3981 },
        'Mannar': { lat: 8.9810, lng: 79.9044 },
        'Vavuniya': { lat: 8.7542, lng: 80.4982 },
        'Mullaitivu': { lat: 9.2671, lng: 80.8142 },
        'Ampara': { lat: 7.2914, lng: 81.6747 },
        'Trincomalee': { lat: 8.5874, lng: 81.2152 },
        'Puttalam': { lat: 8.0409, lng: 79.8283 },
        'Polonnaruwa': { lat: 7.9403, lng: 81.0188 },
        'Badulla': { lat: 6.9934, lng: 81.0550 },
        'Monaragala': { lat: 6.8728, lng: 81.3507 },
        'Kegalle': { lat: 7.2513, lng: 80.3464 }
    };

    const baseCoords = districtCoords[district] || defaultCoords;
    
    return {
        lat: baseCoords.lat + (Math.random() - 0.5) * 0.1,
        lng: baseCoords.lng + (Math.random() - 0.5) * 0.1,
        address: `Area ${Math.floor(Math.random() * 100) + 1}, ${district}, Sri Lanka`
    };
};

const generatePhone = () => {
    const prefixes = ['070', '071', '072', '075', '076', '077', '078'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
    return `${prefix}${number}`;
};

const generateRecentDate = () => {
    const now = new Date();
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    return date.toISOString();
};

const getRandomPhoto = (photoArray) => {
    return photoArray[Math.floor(Math.random() * photoArray.length)];
};

export const generateMissingPersons = async (count = 50) => {
    const persons = [];
    
    const clothingOptions = [
        'blue shirt and jeans',
        'red dress',
        'white t-shirt and black pants',
        'green saree',
        'yellow kurta',
        'grey jacket and shorts',
        'school uniform',
        'traditional white cloth'
    ];
    
    const distinguishingFeatures = [
        'Wearing glasses',
        'Has a scar on left arm',
        'Has a birthmark on right cheek',
        'Walks with a limp',
        'Has a tattoo on left shoulder',
        'Missing front tooth',
        'Has long hair tied in a ponytail',
        'Wearing a gold necklace',
        'Has a beard',
        'Uses a walking stick'
    ];
    
    const additionalInfoOptions = [
        'Has medical condition requiring medication',
        'Suffers from diabetes, needs insulin',
        'Has asthma, carries inhaler',
        'Suffers from memory loss',
        'Has epilepsy',
        'Recently underwent surgery',
        null,
        null
    ];
    
    for (let i = 0; i < count; i++) {
        const district = SRI_LANKA_DISTRICTS[Math.floor(Math.random() * SRI_LANKA_DISTRICTS.length)];
        const location = generateLocation(district);
        const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
        const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
        const gender = Math.random() > 0.5 ? 'male' : 'female';
        
        const person = {
            name: `${firstName} ${lastName}`,
            age: Math.floor(Math.random() * 70) + 10,
            gender: gender,
            description: `Last seen wearing ${clothingOptions[Math.floor(Math.random() * clothingOptions.length)]}. ${distinguishingFeatures[Math.floor(Math.random() * distinguishingFeatures.length)]}.`,
            last_seen_location: location,
            last_seen_date: generateRecentDate(),
            reporter_name: `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`,
            contact_number: generatePhone(),
            additional_info: additionalInfoOptions[Math.floor(Math.random() * additionalInfoOptions.length)],
            status: Math.random() > 0.8 ? 'Resolved' : 'Active',
            photo: getRandomPhoto(PERSON_PHOTOS)
        };
        
        try {
            const result = await createDocument(TABLES.MISSING_PERSONS, person);
            persons.push(result);
            console.log(`✓ Created missing person ${i + 1}/${count}: ${person.name}`);
        } catch (error) {
            console.error(`✗ Failed to create person ${i + 1}:`, error.message);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return persons;
};

export const generateDisasters = async (count = 30) => {
    const disasters = [];
    
    const disasterDescriptions = {
        flood: [
            'Heavy rainfall causing severe flooding in low-lying areas. Roads submerged, houses inundated.',
            'Flash floods due to overflowing river. Multiple families trapped in upper floors.',
            'Monsoon floods affecting agricultural lands. Crops destroyed, livestock at risk.',
            'Urban flooding due to blocked drainage systems. Traffic severely disrupted.'
        ],
        landslide: [
            'Heavy rains triggered landslide blocking main road. Several houses buried.',
            'Hill slope collapsed after continuous rainfall. Multiple families evacuated.',
            'Massive landslide in hilly area. Search and rescue operations underway.',
            'Rock fall and mud slide blocking highway. Alternative routes being arranged.'
        ],
        fire: [
            'Major fire broke out in residential area. Multiple houses affected.',
            'Forest fire spreading rapidly. Wildlife threatened, nearby villages evacuated.',
            'Industrial fire with toxic smoke. Emergency services deployed.',
            'Market fire destroying shops and goods. No casualties reported yet.'
        ],
        cyclone: [
            'Severe cyclone warning issued. Strong winds and heavy rainfall expected.',
            'Tropical cyclone causing destruction. Trees uprooted, power lines down.',
            'Cyclonic storm affecting coastal areas. Fishing activities suspended.',
            'Post-cyclone damage assessment ongoing. Many buildings damaged.'
        ],
        drought: [
            'Severe water shortage due to prolonged drought. Wells dried up.',
            'Agricultural crisis due to lack of rainfall. Crops failing, livestock suffering.',
            'Drinking water crisis in affected areas. Water bowsers being arranged.',
            'Reservoir levels critically low. Water rationing implemented.'
        ],
        earthquake: [
            'Moderate earthquake felt in the region. Buildings inspected for damage.',
            'Tremors causing panic among residents. Minor structural damages reported.',
            'Seismic activity detected. Aftershocks expected, people advised to stay alert.',
            'Earthquake causing cracks in buildings. Evacuation of unsafe structures ongoing.'
        ]
    };
    
    for (let i = 0; i < count; i++) {
        const district = SRI_LANKA_DISTRICTS[Math.floor(Math.random() * SRI_LANKA_DISTRICTS.length)];
        const location = generateLocation(district);
        const type = DISASTER_TYPES[Math.floor(Math.random() * DISASTER_TYPES.length)];
        const severity = SEVERITIES[Math.floor(Math.random() * SEVERITIES.length)];
        
        const descriptions = disasterDescriptions[type];
        const description = descriptions[Math.floor(Math.random() * descriptions.length)];
        
        const disaster = {
            disaster_type: type,
            severity: severity,
            description: `${description} ${severity === 'critical' ? 'Immediate assistance required!' : severity === 'high' ? 'Urgent action needed.' : 'Situation being monitored.'}`,
            people_affected: `${Math.floor(Math.random() * 500) + 10}`,
            casualties: Math.random() > 0.7 ? 'major' : 'minor',
            needs: {
                rescue: Math.random() > 0.5,
                medical: Math.random() > 0.6,
                shelter: Math.random() > 0.4,
                food: Math.random() > 0.3,
                water: Math.random() > 0.3
            },
            location: location,
            occurred_date: generateRecentDate(),
            area_size: `${Math.floor(Math.random() * 10) + 1} km²`,
            reporter_name: `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`,
            contact_number: generatePhone(),
            status: Math.random() > 0.7 ? 'Resolved' : 'Active',
            photo: getRandomPhoto(DISASTER_PHOTOS[type])
        };
        
        try {
            const result = await createDocument(TABLES.DISASTERS, disaster);
            disasters.push(result);
            console.log(`✓ Created disaster ${i + 1}/${count}: ${type} in ${district}`);
        } catch (error) {
            console.error(`✗ Failed to create disaster ${i + 1}:`, error.message);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return disasters;
};

export const generateAnimalRescues = async (count = 40) => {
    const rescues = [];
    
    const animalDescriptions = {
        dog: [
            'Friendly dog found wandering alone. Appears well-fed but lost.',
            'Stray dog with collar, possibly escaped from home.',
            'Injured dog limping, needs immediate veterinary attention.',
            'Abandoned puppy found near roadside, very frightened.'
        ],
        cat: [
            'Domestic cat stuck on roof, unable to come down.',
            'Injured cat with wound on leg, needs medical care.',
            'Lost kitten meowing continuously, appears hungry.',
            'Trapped cat in abandoned building, rescue needed.'
        ],
        cattle: [
            'Cow wandering on main road causing traffic hazard.',
            'Injured bull after accident, needs urgent treatment.',
            'Lost cattle separated from herd during flooding.',
            'Sick cow unable to stand, owner untraceable.'
        ],
        buffalo: [
            'Buffalo stuck in mud after flooding, rescue equipment needed.',
            'Water buffalo injured in accident, veterinary help required.',
            'Lost buffalo found in residential area.',
            'Buffalo trapped in drain, crane required for rescue.'
        ],
        goat: [
            'Goat trapped in fence, unable to free itself.',
            'Lost goat herd wandering in urban area.',
            'Injured goat after dog attack.',
            'Goat fallen into well, rescue operation needed.'
        ],
        'wild-animal': [
            'Wild elephant strayed into village, causing damage.',
            'Monitor lizard found in residential area, needs relocation.',
            'Snake spotted near school, requires professional handling.',
            'Monkey injured, possibly hit by vehicle.'
        ]
    };
    
    const breedOptions = {
        dog: ['Labrador', 'German Shepherd', 'Golden Retriever', 'Mixed Breed', 'Local Street Dog', null],
        cat: ['Persian', 'Siamese', 'Local', 'Mixed', null]
    };
    
    for (let i = 0; i < count; i++) {
        const district = SRI_LANKA_DISTRICTS[Math.floor(Math.random() * SRI_LANKA_DISTRICTS.length)];
        const location = generateLocation(district);
        const animalType = ANIMAL_TYPES[Math.floor(Math.random() * ANIMAL_TYPES.length)];
        const condition = CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)];
        
        const descriptions = animalDescriptions[animalType];
        const description = descriptions[Math.floor(Math.random() * descriptions.length)];
        
        let breed = null;
        if (breedOptions[animalType]) {
            const breeds = breedOptions[animalType];
            breed = breeds[Math.floor(Math.random() * breeds.length)];
        }
        
        const rescue = {
            animal_type: animalType,
            breed: breed,
            description: `${description} Location: ${location.address}. Current condition: ${condition}.`,
            condition: condition,
            is_dangerous: animalType === 'wild-animal' || Math.random() > 0.85,
            location: location,
            reporter_name: `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`,
            contact_number: generatePhone(),
            status: Math.random() > 0.7 ? 'Rescued' : 'Pending',
            photo: getRandomPhoto(ANIMAL_PHOTOS[animalType])
        };
        
        try {
            const result = await createDocument(TABLES.ANIMAL_RESCUES, rescue);
            rescues.push(result);
            console.log(`✓ Created animal rescue ${i + 1}/${count}: ${animalType} in ${district}`);
        } catch (error) {
            console.error(`✗ Failed to create rescue ${i + 1}:`, error.message);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return rescues;
};

export const generateCamps = async (count = 20) => {
    const camps = [];
    
    const campTypes = ['Emergency', 'Temporary', 'Permanent'];
    const capacityOptions = [50, 100, 150, 200, 300, 500, 750, 1000];
    
    const facilitiesOptions = [
        ['Water', 'Electricity', 'Medical', 'Food', 'Shelter'],
        ['Water', 'Medical', 'Food', 'Shelter', 'Sanitation'],
        ['Water', 'Electricity', 'Food', 'Shelter', 'Toilets'],
        ['Water', 'Medical', 'Food', 'Shelter', 'Electricity', 'Security'],
        ['Water', 'Food', 'Shelter', 'Sanitation', 'Communications']
    ];
    
    for (let i = 0; i < count; i++) {
        const district = SRI_LANKA_DISTRICTS[Math.floor(Math.random() * SRI_LANKA_DISTRICTS.length)];
        const location = generateLocation(district);
        const capacity = capacityOptions[Math.floor(Math.random() * capacityOptions.length)];
        const currentOccupancy = Math.floor(Math.random() * capacity);
        const campType = campTypes[Math.floor(Math.random() * campTypes.length)];
        const facilities = facilitiesOptions[Math.floor(Math.random() * facilitiesOptions.length)];
        
        const camp = {
            name: `${location.address.split(',')[0]} Relief Camp`,
            type: campType,
            capacity: capacity,
            current_occupancy: currentOccupancy,
            location: location,
            contact_person: `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`,
            contact_number: generatePhone(),
            facilities: facilities,
            status: currentOccupancy >= capacity ? 'Full' : (Math.random() > 0.9 ? 'Closed' : 'Active'),
            photo: getRandomPhoto(CAMP_PHOTOS)
        };
        
        try {
            const result = await createDocument(TABLES.CAMPS, camp);
            camps.push(result);
            console.log(`✓ Created camp ${i + 1}/${count}: ${camp.name}`);
        } catch (error) {
            console.error(`✗ Failed to create camp ${i + 1}:`, error.message);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return camps;
};

// Generate donations
export const generateDonations = async (count = 50) => {
    const donations = [];
    
    const donationAmounts = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000];
    const currencies = ['LKR', 'USD'];
    const paymentMethods = ['card', 'bank_transfer', 'mobile_wallet'];
    
    const donorMessages = [
        'Hope this helps those in need. Stay strong!',
        'Praying for everyone affected. We stand with you.',
        'May God bless and protect all victims.',
        'Every little bit helps. Together we can rebuild.',
        'Our thoughts and prayers are with you.',
        'Stay safe and strong. Better days ahead.',
        null,
        null
    ];
    
    for (let i = 0; i < count; i++) {
        const amount = donationAmounts[Math.floor(Math.random() * donationAmounts.length)];
        const currency = Math.random() > 0.8 ? 'USD' : 'LKR';
        const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
        const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
        
        const donation = {
            donor_name: Math.random() > 0.3 ? `${firstName} ${lastName}` : 'Anonymous',
            donor_email: Math.random() > 0.3 ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com` : null,
            amount: amount,
            currency: currency,
            payment_method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
            message: donorMessages[Math.floor(Math.random() * donorMessages.length)],
            is_anonymous: Math.random() > 0.7,
            created_at: generateRecentDate(),
            status: 'completed'
        };
        
        try {
            const result = await createDocument(TABLES.DONATIONS, donation);
            donations.push(result);
            console.log(`✓ Created donation ${i + 1}/${count}: ${currency} ${amount}`);
        } catch (error) {
            console.error(`✗ Failed to create donation ${i + 1}:`, error.message);
        }
        
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    return donations;
};

export const generateAllTestData = async () => {
    console.log('🧪 Starting bulk test data generation...');
    console.log('═══════════════════════════════════════════════');
    
    try {
        console.log('\n📋 Generating 50 Missing Persons...');
        await generateMissingPersons(50);
        
        console.log('\n⚠️  Generating 30 Disasters...');
        await generateDisasters(30);
        
        console.log('\n🐕 Generating 40 Animal Rescues...');
        await generateAnimalRescues(40);
        
        console.log('\n⛺ Generating 20 Camps...');
        await generateCamps(20);
        
        console.log('\n💰 Generating 50 Donations...');
        await generateDonations(50);
        
        console.log('\n═══════════════════════════════════════════════');
        console.log('✅ Bulk test data generation complete!');
        console.log('📊 Total: 50 missing persons, 30 disasters, 40 animal rescues, 20 camps, 50 donations');
        
        return {
            success: true,
            counts: {
                missingPersons: 50,
                disasters: 30,
                animalRescues: 40,
                camps: 20,
                donations: 50,
                total: 190
            }
        };
    } catch (error) {
        console.error('❌ Error generating test data:', error);
        throw error;
    }
};
