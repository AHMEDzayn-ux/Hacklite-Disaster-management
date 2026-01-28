# 🧪 Test Data Examples

## Real Sample Outputs

This document shows exactly what kind of data gets generated.

---

## 📋 Missing Person Examples

### Example 1: Active Case
```json
{
  "id": "uuid-1",
  "name": "Nimal Fernando",
  "age": 45,
  "gender": "male",
  "description": "Last seen wearing blue shirt and jeans. Wearing glasses.",
  "last_seen_location": {
    "lat": 6.9353,
    "lng": 79.8519,
    "address": "Pettah, Colombo, Sri Lanka"
  },
  "last_seen_date": "2026-01-15T10:30:00.000Z",
  "reporter_name": "Kamal Silva",
  "contact_number": "0771234567",
  "additional_info": "Has diabetes, needs insulin",
  "status": "Active",
  "photo": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400",
  "created_at": "2026-01-28T10:00:00.000Z"
}
```

### Example 2: Resolved Case
```json
{
  "id": "uuid-2",
  "name": "Samanthi Perera",
  "age": 32,
  "gender": "female",
  "description": "Last seen wearing red dress. Has a birthmark on right cheek.",
  "last_seen_location": {
    "lat": 7.2599,
    "lng": 80.5977,
    "address": "Peradeniya, Kandy, Sri Lanka"
  },
  "last_seen_date": "2026-01-10T14:20:00.000Z",
  "reporter_name": "Sunil Gunasekara",
  "contact_number": "0752345678",
  "additional_info": null,
  "status": "Resolved",
  "photo": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400",
  "created_at": "2026-01-28T10:01:30.000Z"
}
```

---

## ⚠️ Disaster Examples

### Example 1: Critical Flood
```json
{
  "id": "uuid-3",
  "disaster_type": "flood",
  "severity": "critical",
  "description": "Heavy rainfall causing severe flooding in low-lying areas. Roads submerged, houses inundated. Immediate assistance required!",
  "people_affected": "250",
  "casualties": "minor",
  "needs": {
    "rescue": true,
    "medical": true,
    "shelter": true,
    "food": false,
    "water": false
  },
  "location": {
    "lat": 7.2094,
    "lng": 79.8358,
    "address": "Negombo, Gampaha, Sri Lanka"
  },
  "occurred_date": "2026-01-20T08:00:00.000Z",
  "area_size": "5 km²",
  "reporter_name": "Ravi Wickramasinghe",
  "contact_number": "0763456789",
  "status": "Active",
  "photo": "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800",
  "created_at": "2026-01-28T10:05:00.000Z"
}
```

### Example 2: Moderate Landslide (Resolved)
```json
{
  "id": "uuid-4",
  "disaster_type": "landslide",
  "severity": "moderate",
  "description": "Hill slope collapsed after continuous rainfall. Multiple families evacuated. Situation being monitored.",
  "people_affected": "85",
  "casualties": "major",
  "needs": {
    "rescue": false,
    "medical": true,
    "shelter": true,
    "food": true,
    "water": true
  },
  "location": {
    "lat": 6.9497,
    "lng": 80.7891,
    "address": "Area 23, Nuwara Eliya, Sri Lanka"
  },
  "occurred_date": "2026-01-05T16:45:00.000Z",
  "area_size": "2 km²",
  "reporter_name": "Chaminda Bandara",
  "contact_number": "0774567890",
  "status": "Resolved",
  "photo": "https://images.unsplash.com/photo-1514905552197-0610a4d8fd73?w=800",
  "created_at": "2026-01-28T10:06:30.000Z"
}
```

### Example 3: High Severity Fire
```json
{
  "id": "uuid-5",
  "disaster_type": "fire",
  "severity": "high",
  "description": "Forest fire spreading rapidly. Wildlife threatened, nearby villages evacuated. Urgent action needed.",
  "people_affected": "420",
  "casualties": "minor",
  "needs": {
    "rescue": true,
    "medical": false,
    "shelter": true,
    "food": true,
    "water": false
  },
  "location": {
    "lat": 8.3114,
    "lng": 80.4037,
    "address": "Sacred City, Anuradhapura, Sri Lanka"
  },
  "occurred_date": "2026-01-25T11:30:00.000Z",
  "area_size": "8 km²",
  "reporter_name": "Prasad Dissanayake",
  "contact_number": "0785678901",
  "status": "Active",
  "photo": "https://images.unsplash.com/photo-1534871454100-c5c9e4e6e1b6?w=800",
  "created_at": "2026-01-28T10:08:00.000Z"
}
```

---

## 🐕 Animal Rescue Examples

### Example 1: Injured Dog
```json
{
  "id": "uuid-6",
  "animal_type": "dog",
  "breed": "Labrador",
  "description": "Injured dog limping, needs immediate veterinary attention. Location: Kollupitiya, Colombo, Sri Lanka. Current condition: injured.",
  "condition": "injured",
  "is_dangerous": false,
  "location": {
    "lat": 6.9147,
    "lng": 79.8502,
    "address": "Kollupitiya, Colombo, Sri Lanka"
  },
  "reporter_name": "Dilrukshi Jayawardena",
  "contact_number": "0776789012",
  "status": "Pending",
  "photo": "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800",
  "created_at": "2026-01-28T10:10:00.000Z"
}
```

### Example 2: Trapped Cat (Rescued)
```json
{
  "id": "uuid-7",
  "animal_type": "cat",
  "breed": "Persian",
  "description": "Domestic cat stuck on roof, unable to come down. Location: Gampola, Kandy, Sri Lanka. Current condition: trapped.",
  "condition": "trapped",
  "is_dangerous": false,
  "location": {
    "lat": 7.1644,
    "lng": 80.5770,
    "address": "Gampola, Kandy, Sri Lanka"
  },
  "reporter_name": "Nuwan Amarasinghe",
  "contact_number": "0767890123",
  "status": "Rescued",
  "photo": "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800",
  "created_at": "2026-01-28T10:12:00.000Z"
}
```

### Example 3: Wild Elephant (Dangerous)
```json
{
  "id": "uuid-8",
  "animal_type": "wild-animal",
  "breed": null,
  "description": "Wild elephant strayed into village, causing damage. Location: Gem City, Ratnapura, Sri Lanka. Current condition: healthy.",
  "condition": "healthy",
  "is_dangerous": true,
  "location": {
    "lat": 6.6828,
    "lng": 80.3992,
    "address": "Gem City, Ratnapura, Sri Lanka"
  },
  "reporter_name": "Asanka Weerasinghe",
  "contact_number": "0758901234",
  "status": "Pending",
  "photo": "https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=800",
  "created_at": "2026-01-28T10:14:00.000Z"
}
```

### Example 4: Lost Buffalo
```json
{
  "id": "uuid-9",
  "animal_type": "buffalo",
  "breed": null,
  "description": "Lost buffalo found in residential area. Location: Fort Area, Galle, Sri Lanka. Current condition: lost.",
  "condition": "lost",
  "is_dangerous": false,
  "location": {
    "lat": 6.0270,
    "lng": 80.2170,
    "address": "Fort Area, Galle, Sri Lanka"
  },
  "reporter_name": "Thilini Gamage",
  "contact_number": "0779012345",
  "status": "Pending",
  "photo": "https://images.unsplash.com/photo-1581200216484-8a46b6e0b92e?w=800",
  "created_at": "2026-01-28T10:16:00.000Z"
}
```

---

## ⛺ Relief Camp Examples

### Example 1: Active Emergency Camp
```json
{
  "id": "uuid-10",
  "name": "Pettah Relief Camp",
  "type": "Emergency",
  "capacity": 200,
  "current_occupancy": 145,
  "location": {
    "lat": 6.9353,
    "lng": 79.8519,
    "address": "Pettah, Colombo, Sri Lanka"
  },
  "contact_person": "Janith Samarasinghe",
  "contact_number": "0770123456",
  "facilities": [
    "Water",
    "Electricity",
    "Medical",
    "Food",
    "Shelter"
  ],
  "status": "Active",
  "photo": "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800",
  "created_at": "2026-01-28T10:18:00.000Z"
}
```

### Example 2: Full Capacity Camp
```json
{
  "id": "uuid-11",
  "name": "Negombo Relief Camp",
  "type": "Temporary",
  "capacity": 500,
  "current_occupancy": 500,
  "location": {
    "lat": 7.2094,
    "lng": 79.8358,
    "address": "Negombo, Gampaha, Sri Lanka"
  },
  "contact_person": "Madhavi Liyanage",
  "contact_number": "0751234567",
  "facilities": [
    "Water",
    "Medical",
    "Food",
    "Shelter",
    "Sanitation"
  ],
  "status": "Full",
  "photo": "https://images.unsplash.com/photo-1578645510447-e20b4311e3ce?w=800",
  "created_at": "2026-01-28T10:20:00.000Z"
}
```

### Example 3: Permanent Camp
```json
{
  "id": "uuid-12",
  "name": "Peradeniya Relief Camp",
  "type": "Permanent",
  "capacity": 1000,
  "current_occupancy": 680,
  "location": {
    "lat": 7.2599,
    "lng": 80.5977,
    "address": "Peradeniya, Kandy, Sri Lanka"
  },
  "contact_person": "Kasun Herath",
  "contact_number": "0762345678",
  "facilities": [
    "Water",
    "Electricity",
    "Food",
    "Shelter",
    "Electricity",
    "Security"
  ],
  "status": "Active",
  "photo": "https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=800",
  "created_at": "2026-01-28T10:22:00.000Z"
}
```

---

## 💰 Donation Examples

### Example 1: Named LKR Donation with Message
```json
{
  "id": "uuid-13",
  "donor_name": "Tharaka Fernando",
  "donor_email": "tharaka.fernando@email.com",
  "amount": 5000,
  "currency": "LKR",
  "payment_method": "card",
  "message": "Hope this helps those in need. Stay strong!",
  "is_anonymous": false,
  "created_at": "2026-01-26T15:30:00.000Z",
  "status": "completed"
}
```

### Example 2: Anonymous USD Donation
```json
{
  "id": "uuid-14",
  "donor_name": "Anonymous",
  "donor_email": null,
  "amount": 100,
  "currency": "USD",
  "payment_method": "bank_transfer",
  "message": null,
  "is_anonymous": true,
  "created_at": "2026-01-25T10:15:00.000Z",
  "status": "completed"
}
```

### Example 3: Large Named Donation
```json
{
  "id": "uuid-15",
  "donor_name": "Dinesh Silva",
  "donor_email": "dinesh.silva@email.com",
  "amount": 50000,
  "currency": "LKR",
  "payment_method": "mobile_wallet",
  "message": "Every little bit helps. Together we can rebuild.",
  "is_anonymous": false,
  "created_at": "2026-01-22T09:45:00.000Z",
  "status": "completed"
}
```

### Example 4: Small Anonymous Donation
```json
{
  "id": "uuid-16",
  "donor_name": "Anonymous",
  "donor_email": null,
  "amount": 250,
  "currency": "LKR",
  "payment_method": "card",
  "message": "Stay safe and strong. Better days ahead.",
  "is_anonymous": true,
  "created_at": "2026-01-20T16:20:00.000Z",
  "status": "completed"
}
```

---

## 📊 Dataset Statistics

### Names Distribution
```
Most Common First Names:
- Nimal (appears ~4-5 times)
- Kamal (appears ~4-5 times)
- Samanthi (appears ~3-4 times)
- Dilrukshi (appears ~3-4 times)

Most Common Last Names:
- Fernando (appears ~8-10 times)
- Silva (appears ~8-10 times)
- Perera (appears ~7-9 times)
```

### Location Distribution
```
Colombo:        ~8% of records
Gampaha:        ~8% of records
Kandy:          ~8% of records
Galle:          ~8% of records
Other Districts: ~68% of records
```

### Timestamp Distribution
```
Last 7 days:    ~25% of records
8-14 days ago:  ~25% of records
15-21 days ago: ~25% of records
22-30 days ago: ~25% of records
```

---

## 🗺️ Coordinate Examples

### Colombo Locations
```
Pettah:       6.9353, 79.8519
Fort:         6.9344, 79.8428
Kollupitiya:  6.9147, 79.8502
Nugegoda:     6.8649, 79.8997
Dehiwala:     6.8520, 79.8630
```

### Kandy Locations
```
Peradeniya:   7.2599, 80.5977
Katugastota:  7.3215, 80.6347
Gampola:      7.1644, 80.5770
Temple Area:  7.2936, 80.6400
```

### Coastal Locations
```
Negombo:      7.2094, 79.8358
Galle Fort:   6.0270, 80.2170
Hikkaduwa:    6.1408, 80.1033
Weligama:     5.9750, 80.4294
Mirissa:      5.9467, 80.4592
```

---

## 📱 Contact Examples

### Phone Numbers
```
Valid Formats:
0771234567  (070-series)
0752345678  (075-series)
0763456789  (076-series)
0774567890  (077-series)
0785678901  (078-series)
```

### Email Addresses
```
Pattern: firstname.lastname@email.com

Examples:
nimal.fernando@email.com
samanthi.silva@email.com
kamal.perera@email.com
dilrukshi.jayawardena@email.com
```

---

## 🎨 Photo URL Examples

### Person Photos
```
https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400
https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400
https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400
```

### Disaster Photos (Flood)
```
https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800
https://images.unsplash.com/photo-1624024242180-3f86c56c768a?w=800
https://images.unsplash.com/photo-1527482797697-8795b05a13fe?w=800
```

### Animal Photos (Dog)
```
https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800
https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=800
https://images.unsplash.com/photo-1552053831-71594a27632d?w=800
```

---

## 🔍 Search Test Cases

### By Name
```
Search: "Nimal"
Expected: 4-5 missing persons

Search: "Fernando"
Expected: 8-10 records (various types)
```

### By Location
```
Search: "Colombo"
Expected: ~15 records

Search: "Pettah"
Expected: 4-6 records
```

### By District
```
Filter: Colombo
Expected: ~15 records

Filter: Kandy
Expected: ~15 records
```

### By Status
```
Filter: Active
Expected: ~120 records (80% of missing/disasters)

Filter: Resolved
Expected: ~30 records (20% of missing/disasters)
```

---

## ✅ Quality Validation

### Data Completeness
```
✓ All required fields populated
✓ No null values in required fields
✓ Optional fields properly nullable
✓ Timestamps in ISO format
✓ Coordinates within Sri Lanka bounds
```

### Data Validity
```
✓ Phone numbers: 10 digits, valid prefixes
✓ Email format: valid structure
✓ Ages: 10-80 range
✓ Amounts: positive numbers
✓ Status values: from defined enums
```

### Data Variety
```
✓ Multiple first names used
✓ Multiple last names used
✓ All districts represented
✓ All disaster types included
✓ All animal types included
```

---

## 📈 Expected Results

After generating all 190 records:

### List Views Should Show
- 50 missing persons with photos
- 30 disasters with type-specific images
- 40 animal rescues with animal photos
- 20 camps with camp images
- 50 donations with various amounts

### Maps Should Display
- ~150 markers (all except donations)
- Distributed across Sri Lanka
- Clustered in major cities
- Clickable for details

### Filters Should Work
- District filter: 25 options
- Status filter: various per type
- Date range: last 30 days
- Type filter: disaster/animal types

---

**Document Version:** 1.0  
**Last Updated:** January 28, 2026  
**Status:** Complete ✅
