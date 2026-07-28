# Camps Table - Complete Schema Reference

## Current Database Schema

```sql
CREATE TABLE public.camps (
  -- Primary Key
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Core Camp Information
  name TEXT NOT NULL,                      -- Camp name (e.g., "Central Relief Camp - Colombo")
  type TEXT NOT NULL,                      -- Camp type: temporary-shelter, emergency-evacuation, long-term-relief, medical-facility
  capacity INTEGER NOT NULL,               -- Maximum number of people the camp can accommodate
  current_occupancy INTEGER DEFAULT 0,     -- Current number of people in camp
  status TEXT DEFAULT 'Active',            -- Camp status: Active, Closed

  -- Location Information (JSONB + Separate Fields)
  location JSONB NOT NULL,                 -- Full location object: {lat, lng, address, district}
  district TEXT,                           -- Sri Lankan district (for filtering)
  address TEXT,                            -- Full camp address (duplicated from location)
  ds_division TEXT,                        -- Divisional Secretariat division
  latitude DECIMAL(10, 8),                 -- GPS latitude (duplicated from location)
  longitude DECIMAL(11, 8),                -- GPS longitude (duplicated from location)

  -- Contact Information
  contact_person TEXT NOT NULL,            -- Name of person in charge
  contact_number TEXT NOT NULL,            -- Phone number for camp
  managed_by TEXT,                         -- Camp manager name (usually same as contact_person)

  -- Facilities & Needs
  facilities JSONB,                        -- Array of available facilities
  needs TEXT[],                            -- Array of needed supplies/resources

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Indexes
  CONSTRAINT camps_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_camps_district ON camps(district);
CREATE INDEX idx_camps_status ON camps(status);
CREATE INDEX idx_camps_type ON camps(type);
CREATE INDEX idx_camps_location ON camps USING GIST ((location::jsonb));
```

## Field Descriptions

### Required Fields (NOT NULL)

| Field            | Type    | Description      | Example                                                                    |
| ---------------- | ------- | ---------------- | -------------------------------------------------------------------------- |
| `name`           | TEXT    | Camp name        | "Central Relief Camp - Colombo"                                            |
| `type`           | TEXT    | Camp type        | "temporary-shelter"                                                        |
| `capacity`       | INTEGER | Max people       | 500                                                                        |
| `location`       | JSONB   | Location object  | `{"lat": 6.9271, "lng": 79.8612, "address": "...", "district": "Colombo"}` |
| `contact_person` | TEXT    | Person in charge | "John Silva"                                                               |
| `contact_number` | TEXT    | Contact phone    | "0771234567"                                                               |

### Optional Fields

| Field               | Type    | Default  | Description                                  |
| ------------------- | ------- | -------- | -------------------------------------------- |
| `current_occupancy` | INTEGER | 0        | Current people count                         |
| `status`            | TEXT    | 'Active' | Active or Closed                             |
| `district`          | TEXT    | NULL     | District name (auto-extracted from location) |
| `address`           | TEXT    | NULL     | Full address (auto-extracted from location)  |
| `ds_division`       | TEXT    | NULL     | DS division name                             |
| `latitude`          | DECIMAL | NULL     | GPS lat (auto-extracted from location)       |
| `longitude`         | DECIMAL | NULL     | GPS lng (auto-extracted from location)       |
| `managed_by`        | TEXT    | NULL     | Manager name                                 |
| `facilities`        | JSONB   | NULL     | Available facilities array                   |
| `needs`             | TEXT[]  | NULL     | Needed supplies array                        |

## Camp Type Values

- `temporary-shelter` - Temporary Shelter 🏕️
- `emergency-evacuation` - Emergency Evacuation 🚨
- `long-term-relief` - Long-term Relief 🏠
- `medical-facility` - Medical Facility 🏥

## Facilities Examples

```json
[
  "Food",
  "Water",
  "Medical",
  "Shelter",
  "Sanitation",
  "Electricity",
  "Communication",
  "Transportation",
  "Child Care",
  "Elder Care"
]
```

## Complete Insert Example

```sql
INSERT INTO camps (
  name,
  type,
  capacity,
  current_occupancy,
  location,
  district,
  address,
  latitude,
  longitude,
  contact_person,
  contact_number,
  managed_by,
  facilities,
  needs,
  status
) VALUES (
  'Central Relief Camp - Colombo',
  'temporary-shelter',
  500,
  0,
  '{"lat": 6.9271, "lng": 79.8612, "address": "123 Main St, Colombo 01", "district": "Colombo"}'::jsonb,
  'Colombo',
  '123 Main St, Colombo 01',
  6.9271,
  79.8612,
  'John Silva',
  '0771234567',
  'John Silva',
  '["Food", "Water", "Medical", "Shelter"]'::jsonb,
  ARRAY['Medicine', 'Blankets'],
  'Active'
);
```

## Migration Required

Run migration `20260102000006_add_missing_camps_fields.sql` to add:

- district (TEXT)
- address (TEXT)
- ds_division (TEXT)
- latitude (DECIMAL)
- longitude (DECIMAL)
- managed_by (TEXT)
- needs (TEXT[])
- Indexes for efficient querying

## Data Consistency

The location JSONB contains the canonical location data:

```json
{
  "lat": 6.9271,
  "lng": 79.8612,
  "address": "123 Main St, Colombo 01",
  "district": "Colombo"
}
```

The separate fields (district, address, latitude, longitude) are duplicated for:

1. **Easier filtering** - `WHERE district = 'Colombo'`
2. **Better indexing** - Separate indexes on district, lat/lng
3. **Query performance** - No need to extract from JSONB every time

When inserting/updating, ALWAYS set both:

- The location JSONB object
- The separate fields (district, address, latitude, longitude)
