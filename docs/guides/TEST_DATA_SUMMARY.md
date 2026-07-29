# Test Data Generator - Quick Reference

## 🚀 Quick Start

1. Navigate to `/bulk-test-data` in your application
2. Click **"Generate All (190 records)"**
3. Wait 1-3 minutes for completion
4. Check console (F12) for progress

## 📊 What Gets Generated

| Category         | Count   | Features                                    |
| ---------------- | ------- | ------------------------------------------- |
| Missing Persons  | 50      | Photos, GPS, Sri Lankan names, medical info |
| Disaster Reports | 30      | Disaster-specific photos, severities, needs |
| Animal Rescues   | 40      | Animal photos, breeds, conditions           |
| Relief Camps     | 20      | Camp photos, capacities, facilities         |
| Donations        | 50      | Multiple currencies, payment methods        |
| **TOTAL**        | **190** | **Complete test dataset**                   |

## ✨ Key Features

✅ **Real GPS Coordinates**

- All 25 Sri Lankan districts
- Major cities and towns
- Accurate lat/lng with minor randomization

✅ **Professional Photos**

- Sourced from Unsplash
- High quality (800px width)
- Category-appropriate images
- Royalty-free

✅ **Authentic Data**

- Sri Lankan names (Sinhala conventions)
- Valid phone format (070-078 prefixes)
- Recent dates (last 30 days)
- Realistic descriptions

✅ **Complete Information**

- Contact details
- Status tracking
- Detailed descriptions
- Location addresses

## 📍 Districts Covered

**High Detail Areas** (with specific locations):

- Colombo (Pettah, Fort, Kollupitiya, Nugegoda, Dehiwala)
- Gampaha (Negombo, Ja-Ela, Kadawatha, Wattala)
- Kandy (Peradeniya, Katugastota, Gampola)
- Galle (Fort, Hikkaduwa, Unawatuna)
- Matara (Weligama, Mirissa, Dikwella)
- Jaffna (Nallur, Chunnakam, Point Pedro)
- Batticaloa (Kallady, Kattankudy, Eravur)
- Anuradhapura (Sacred City, Mihintale)
- Kurunegala (Town Center, Maho, Wariyapola)
- Ratnapura (Gem City, Balangoda, Embilipitiya)

**Standard Coverage**:
All other 15 districts with base coordinates

## 📸 Photo Categories

| Type            | Photo Content                          |
| --------------- | -------------------------------------- |
| Missing Persons | Professional portraits (10 variations) |
| Floods          | Water disasters (3 variations)         |
| Landslides      | Hill collapses (2 variations)          |
| Fires           | Fire incidents (3 variations)          |
| Cyclones        | Storm damage (2 variations)            |
| Droughts        | Dry landscapes (2 variations)          |
| Earthquakes     | Structural damage (2 variations)       |
| Dogs            | Dog photos (3 variations)              |
| Cats            | Cat photos (3 variations)              |
| Cattle          | Cattle photos (2 variations)           |
| Buffalo         | Buffalo photos (2 variations)          |
| Goats           | Goat photos (2 variations)             |
| Wild Animals    | Wildlife photos (2 variations)         |
| Camps           | Relief camps/tents (4 variations)      |

## 🎯 Data Distribution

### Missing Persons

- Ages: 10-80 years
- Gender: 50/50 split
- Status: 80% Active, 20% Resolved
- Medical conditions: ~50% have details

### Disasters

- 6 types: flood, landslide, fire, cyclone, drought, earthquake
- 4 severities: low, moderate, high, critical
- Status: 70% Active, 30% Resolved
- People affected: 10-500+

### Animal Rescues

- 6 animal types
- 4 conditions: injured, trapped, lost, healthy
- Status: 70% Pending, 30% Rescued
- Dangerous flag: ~15% marked

### Relief Camps

- 3 types: Emergency, Temporary, Permanent
- Capacity: 50-1000 people
- 5-6 facilities per camp
- Status: 90% Active, 10% Full/Closed

### Donations

- Amounts: 100-50,000
- Currency: 80% LKR, 20% USD
- Donor: 70% named, 30% anonymous
- Payment: card, bank_transfer, mobile_wallet

## ⚡ Usage Tips

### Individual Generation

```
✓ Generate 50 Missing Persons (5 seconds)
✓ Generate 30 Disasters (3 seconds)
✓ Generate 40 Animal Rescues (4 seconds)
✓ Generate 20 Camps (2 seconds)
✓ Generate 50 Donations (2.5 seconds)
```

### Monitoring

- Watch console (F12) for detailed logs
- Each record shows: ✓ success or ✗ failure
- Progress counter displayed

### Best Time to Generate

- ✅ Fresh database setup
- ✅ Demo preparation
- ✅ Testing new features
- ✅ Performance benchmarking

## 🧪 Testing Scenarios

After generation, test:

1. **List Views**
   - Pagination works
   - All records appear
   - Photos load correctly

2. **Maps**
   - All markers plotted
   - Coordinates accurate
   - Click events work

3. **Filters**
   - By district
   - By status
   - By date
   - By severity/condition

4. **Search**
   - Name search
   - Location search
   - Phone number search

5. **Details**
   - All fields populated
   - Photos display
   - Maps show location
   - Contact info correct

## 🔧 Quick Fixes

### Photos Not Loading

```
Check: Internet connection
Check: Browser console for errors
Try: Clear cache and reload
```

### Generation Fails

```
Check: Supabase connection
Check: Database permissions (RLS)
Check: Browser console for errors
Try: Generate smaller batches
```

### Slow Performance

```
Normal: 100ms delay between records
Solution: Generate in smaller batches
Check: Network latency
```

## 📋 Checklist

Before generating:

- [ ] Supabase connection active
- [ ] Database tables exist
- [ ] RLS policies configured
- [ ] Browser console open (F12)

After generating:

- [ ] Check console for completion
- [ ] Verify record counts
- [ ] Test list pages
- [ ] Check maps populated
- [ ] Verify photos loading
- [ ] Test search/filters

## 🗑️ Cleanup

To remove test data:

```sql
-- In Supabase SQL Editor
DELETE FROM missing_persons WHERE created_at > '2026-01-01';
DELETE FROM disasters WHERE created_at > '2026-01-01';
DELETE FROM animal_rescues WHERE created_at > '2026-01-01';
DELETE FROM camps WHERE created_at > '2026-01-01';
DELETE FROM donations WHERE created_at > '2026-01-01';
```

## 📞 Contact Data Format

**Phone Numbers:**

```
070XXXXXXX (70-series)
071XXXXXXX (71-series)
072XXXXXXX (72-series)
075XXXXXXX (75-series)
076XXXXXXX (76-series)
077XXXXXXX (77-series)
078XXXXXXX (78-series)
```

**Emails:**

```
firstname.lastname@email.com
```

**Addresses:**

```
[Area Name], [District], Sri Lanka
Example: Pettah, Colombo, Sri Lanka
```

## 🌍 Coordinate Ranges

- **Latitude:** 5.9-9.8 (South to North)
- **Longitude:** 79.8-81.8 (West to East)
- **Precision:** ±0.01° randomization for variety

## 💾 Database Tables Used

| Table           | Field for Photo | Field for Location |
| --------------- | --------------- | ------------------ |
| missing_persons | photo           | last_seen_location |
| disasters       | photo           | location           |
| animal_rescues  | photo           | location           |
| camps           | photo           | location           |
| donations       | N/A             | N/A                |

## 🎨 Photo URLs Format

```
https://images.unsplash.com/photo-[ID]?w=800
```

All photos optimized for:

- Width: 800px
- Quality: High
- Format: JPEG
- Loading: Fast

---

**Last Updated:** January 28, 2026  
**Version:** 1.0  
**Status:** ✅ Ready for Production

For detailed documentation, see [BULK_TEST_DATA_GUIDE.md](BULK_TEST_DATA_GUIDE.md)
