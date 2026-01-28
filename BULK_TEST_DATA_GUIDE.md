# 🧪 Bulk Test Data Generator Guide

## Overview

The Bulk Test Data Generator creates realistic, comprehensive test data for the Disaster Management System. It generates data with real GPS coordinates, professional photos, and authentic Sri Lankan context.

## Features

### ✨ Data Generated

1. **Missing Persons** (50 records)
   - Real Sri Lankan names
   - Ages ranging from 10-80 years
   - Gender distribution
   - Last seen locations with GPS coordinates
   - Recent dates (within last 30 days)
   - Detailed descriptions with clothing and distinguishing features
   - Medical conditions where applicable
   - Reporter contact information
   - Professional portrait photos from Unsplash
   - Mixed statuses (Active/Resolved)

2. **Disaster Reports** (30 records)
   - Multiple disaster types: flood, landslide, fire, cyclone, drought, earthquake
   - Severity levels: low, moderate, high, critical
   - Realistic contextual descriptions
   - People affected counts
   - Casualty assessments (major/minor)
   - Needs assessment (rescue, medical, shelter, food, water)
   - Real GPS locations across Sri Lanka
   - Occurrence dates
   - Area size estimates
   - Reporter information
   - Disaster-specific photos from Unsplash
   - Status tracking

3. **Animal Rescues** (40 records)
   - Animal types: dog, cat, cattle, buffalo, goat, wild-animal
   - Breed information where applicable
   - Condition status: injured, trapped, lost, healthy
   - Detailed rescue scenarios
   - Safety flags (is_dangerous)
   - Location data
   - Reporter details
   - Rescue status tracking
   - Animal-specific photos from Unsplash

4. **Relief Camps** (20 records)
   - Named after location areas
   - Camp types: Emergency, Temporary, Permanent
   - Capacity ranges: 50-1000 people
   - Current occupancy tracking
   - Contact persons and phone numbers
   - Multiple facilities combinations
   - Status: Active, Full, Closed
   - Camp photos from Unsplash
   - GPS coordinates

5. **Donations** (50 records)
   - Donation amounts: 100-50,000
   - Currencies: LKR (80%), USD (20%)
   - Payment methods: card, bank_transfer, mobile_wallet
   - Donor names (70% identified, 30% Anonymous)
   - Email addresses for identified donors
   - Optional personal messages
   - Anonymous flag
   - Timestamps
   - Completed status

### 📍 Location Data

**Real GPS Coordinates for Major Areas:**

- **Colombo District**: Pettah, Fort, Kollupitiya, Nugegoda, Dehiwala
- **Gampaha District**: Negombo, Ja-Ela, Kadawatha, Wattala
- **Kandy District**: Peradeniya, Katugastota, Gampola, Temple Area
- **Galle District**: Fort Area, Hikkaduwa, Unawatuna, Baddegama
- **Matara District**: Weligama, Mirissa, Dikwella, Akuressa
- **Jaffna District**: Nallur, Chunnakam, Chavakachcheri, Point Pedro
- **Batticaloa District**: Kallady, Kattankudy, Eravur
- **Anuradhapura District**: Sacred City, Mihintale, Medawachchiya
- **Kurunegala District**: Town Center, Maho, Wariyapola
- **Ratnapura District**: Gem City, Balangoda, Embilipitiya

All coordinates include minor randomization (±0.01 degrees) for variety while maintaining accuracy.

### 📸 Photo Sources

All photos are sourced from **Unsplash**, ensuring:
- High-quality professional images
- Royalty-free usage
- Appropriate content for each category
- Consistent 800px width for optimal display

**Photo Categories:**
- **Missing Persons**: Professional portrait photos
- **Disasters**: Disaster-specific images (floods, fires, etc.)
- **Animals**: Species-specific photos
- **Camps**: Relief camp and tent images

### 📱 Contact Information

- **Phone Numbers**: Valid Sri Lankan mobile format
  - Prefixes: 070, 071, 072, 075, 076, 077, 078
  - Format: `07XXXXXXXX` (10 digits)
  
- **Email Addresses**: Generated from names
  - Format: `firstname.lastname@email.com`

### 🎯 Data Realism Features

1. **Sri Lankan Context**
   - All 25 districts covered
   - Local names (Sinhala naming conventions)
   - Appropriate disaster types for region
   - Cultural context in descriptions

2. **Time Distribution**
   - Random dates within last 30 days
   - Recent incidents for testing workflows

3. **Status Distribution**
   - ~80% Active, ~20% Resolved (Missing Persons/Disasters)
   - ~70% Pending, ~30% Rescued (Animal Rescues)
   - ~90% Active, ~10% Full/Closed (Camps)
   - 100% Completed (Donations)

4. **Variety**
   - Mixed severities and conditions
   - Diverse descriptions and scenarios
   - Varied needs assessments
   - Different facility combinations

## Usage

### Access the Generator

1. Navigate to the application
2. Go to `/bulk-test-data` route
3. You'll see the Bulk Test Data Generator interface

### Generation Options

#### Option 1: Generate All Data
```
Click "Generate All (190 records)" button
```
This creates:
- 50 Missing Persons
- 30 Disaster Reports  
- 40 Animal Rescues
- 20 Relief Camps
- 50 Donations

**Time Required**: 1-3 minutes

#### Option 2: Generate Individual Categories
Use individual buttons for each category:
- Generate 50 Missing Persons
- Generate 30 Disasters
- Generate 40 Animal Rescues
- Generate 20 Camps
- Generate 50 Donations

### Monitoring Progress

1. **UI Progress Indicator**: Shows current generation status
2. **Browser Console** (Press F12): 
   - Detailed logs for each record
   - Success/failure indicators
   - Record counts and details

### After Generation

- Check the console for confirmation
- Navigate to respective pages to view data
- Verify on maps that locations are properly plotted
- Test filtering, sorting, and search functionality

## Technical Implementation

### File Structure

```
src/
├── utils/
│   └── bulkTestData.js          # Core generation logic
└── pages/
    └── BulkTestData.jsx         # UI component
```

### Key Functions

```javascript
// Generate individual categories
generateMissingPersons(count)
generateDisasters(count)
generateAnimalRescues(count)
generateCamps(count)
generateDonations(count)

// Generate all at once
generateAllTestData()
```

### Database Integration

Uses Supabase service layer:
```javascript
import { createDocument, TABLES } from '../services/supabaseService';
```

Records are inserted with proper delay (50-100ms) to avoid rate limiting.

## Testing Scenarios

### Complete System Test
Generate all data to test:
- ✅ List views with pagination
- ✅ Detail pages
- ✅ Map displays with markers
- ✅ Search and filtering
- ✅ Status updates
- ✅ Data exports
- ✅ Statistics and analytics
- ✅ Photo displays
- ✅ Location accuracy

### Performance Test
- Generate large datasets
- Test load times
- Verify pagination
- Check memory usage

### Map Testing
- Verify all markers appear
- Check clustering functionality
- Test marker click events
- Validate coordinate accuracy

### Filter Testing
- Filter by district
- Filter by status
- Filter by date range
- Filter by severity/condition

## Best Practices

### Before Generation

1. ✅ Ensure Supabase connection is active
2. ✅ Check database has proper tables and permissions
3. ✅ Verify RLS policies allow insertions
4. ✅ Backup any existing test data if needed

### During Generation

1. 📊 Monitor browser console for progress
2. 🚫 Don't close the browser tab
3. 🚫 Don't navigate away from the page
4. ⏳ Wait for completion message

### After Generation

1. ✔️ Verify record counts in database
2. ✔️ Check data quality on list pages
3. ✔️ Test maps are populated correctly
4. ✔️ Confirm photos are loading
5. ✔️ Test search and filters work

## Troubleshooting

### Issue: Generation Fails

**Solutions:**
- Check internet connection (needed for Supabase)
- Verify Supabase credentials in `.env`
- Check browser console for specific errors
- Ensure RLS policies allow insertions
- Check rate limits haven't been exceeded

### Issue: Photos Not Showing

**Solutions:**
- Check internet connection (Unsplash CDN)
- Verify photo URLs are valid
- Check browser console for CORS errors
- Clear browser cache

### Issue: Slow Generation

**Causes:**
- Network latency to Supabase
- Large number of records
- Rate limiting

**Solutions:**
- Generate in smaller batches
- Check network speed
- Increase delay between insertions

### Issue: Duplicate Data

**Solution:**
- Each generation creates new records
- Manually delete old test data from database
- Or add unique constraints to prevent duplicates

## Configuration

### Adjusting Counts

Edit in `bulkTestData.js`:

```javascript
export const generateAllTestData = async () => {
    await generateMissingPersons(50);  // Change count here
    await generateDisasters(30);        // Change count here
    // ... etc
};
```

### Customizing Data

**Add More Names:**
```javascript
const FIRST_NAMES = [
    'Nimal', 'Kamal', 'YourName', ...
];
```

**Add More Districts:**
```javascript
const DISTRICT_LOCATIONS = {
    'YourDistrict': [
        { area: 'Area1', lat: X.XXXX, lng: Y.YYYY }
    ]
};
```

**Change Photo Sources:**
```javascript
const PERSON_PHOTOS = [
    'https://your-image-url.com/photo.jpg',
    // ... more photos
];
```

### Modifying Delays

Adjust rate limiting:
```javascript
await new Promise(resolve => setTimeout(resolve, 100)); // Change 100ms
```

## Data Cleanup

### Delete Test Data

**Option 1: SQL Commands**
```sql
-- Delete all test data
DELETE FROM missing_persons WHERE created_at > '2026-01-01';
DELETE FROM disasters WHERE created_at > '2026-01-01';
DELETE FROM animal_rescues WHERE created_at > '2026-01-01';
DELETE FROM camps WHERE created_at > '2026-01-01';
DELETE FROM donations WHERE created_at > '2026-01-01';
```

**Option 2: Supabase Dashboard**
- Go to Table Editor
- Use filters to identify test data
- Select and delete records

**Option 3: Create Cleanup Script**
```javascript
// Add to bulkTestData.js
export const cleanupTestData = async () => {
    // Implementation for cleanup
};
```

## API Reference

### generateMissingPersons(count)
Generates missing person reports.

**Parameters:**
- `count` (number): Number of records to generate

**Returns:** Promise<Array> - Array of created records

**Example:**
```javascript
const persons = await generateMissingPersons(50);
console.log(`Created ${persons.length} missing person reports`);
```

### generateDisasters(count)
Generates disaster reports with photos.

**Parameters:**
- `count` (number): Number of records to generate

**Returns:** Promise<Array> - Array of created records

### generateAnimalRescues(count)
Generates animal rescue requests.

**Parameters:**
- `count` (number): Number of records to generate

**Returns:** Promise<Array> - Array of created records

### generateCamps(count)
Generates relief camp entries.

**Parameters:**
- `count` (number): Number of records to generate

**Returns:** Promise<Array> - Array of created records

### generateDonations(count)
Generates donation records.

**Parameters:**
- `count` (number): Number of records to generate

**Returns:** Promise<Array> - Array of created records

### generateAllTestData()
Generates all test data categories.

**Parameters:** None

**Returns:** 
```javascript
Promise<{
    success: boolean,
    counts: {
        missingPersons: number,
        disasters: number,
        animalRescues: number,
        camps: number,
        donations: number,
        total: number
    }
}>
```

## Version History

### v1.0 (Current)
- Initial implementation
- 5 data categories
- Real GPS coordinates
- Professional photos from Unsplash
- 190 total records per generation
- Sri Lankan context
- Phone number validation
- Email generation
- Status distribution

## Future Enhancements

### Planned Features

1. **Customization UI**
   - Adjustable record counts
   - Date range selection
   - District selection
   - Status distribution control

2. **Advanced Options**
   - Custom photo uploads
   - CSV import for names
   - Coordinate validation
   - Batch size control

3. **Data Management**
   - Built-in cleanup functionality
   - Export generated data
   - Duplicate detection
   - Data quality reports

4. **Additional Data Types**
   - Volunteers
   - Camp requests
   - Resource inventory
   - Weather data

## Support

For issues or questions:
1. Check browser console for errors
2. Review Supabase logs
3. Verify database permissions
4. Check network connectivity

---

**Last Updated:** January 28, 2026
**Version:** 1.0
**Status:** Production Ready ✅
