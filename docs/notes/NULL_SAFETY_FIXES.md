# Null Safety Fixes

## Overview

Fixed React runtime errors caused by null/undefined data and intermittent "no camps" display issue.

## Changes Made

### 1. Data Store Layer (`src/store/supabaseStore.js`)

#### All Subscription Functions

Added array safety checks to prevent null data from breaking the UI:

```javascript
// Before:
set({ camps, loading: false, error: null, isInitialized: true });

// After:
const safeCamps = Array.isArray(camps) ? camps : [];
set({ camps: safeCamps, loading: false, error: null, isInitialized: true });
```

**Affected Functions:**

- `subscribeToCamps()`
- `subscribeToMissingPersons()`
- `subscribeToDisasters()`
- `subscribeToAnimalRescues()`

**Impact:** Ensures data is always an array, even if backend returns null/undefined.

### 2. Service Layer (`src/services/supabaseService.js`)

#### `getAllDocuments()` Function

Added graceful error handling:

```javascript
// Before:
return { data: data || [], total: count };

// After:
return { data: Array.isArray(data) ? data : [], total: count || 0 };

// On error (before): throw error
// On error (after): return { data: [], total: 0 }
```

**Impact:** Prevents UI crashes when database queries fail.

### 3. Components

#### `src/components/CampsList.jsx`

**Subscription Logic:**

```javascript
// Before: Always invalidated cache and re-subscribed
useEffect(() => {
    invalidateCache('camps');
    await subscribeToCamps();
}, []);

// After: Only subscribe if not already initialized
useEffect(() => {
    if (!isInitialized) {
        invalidateCache('camps');
        await subscribeToCamps();
    }
}, [isInitialized, subscribeToCamps]);
```

**Null-Safe Rendering:**

- `camp.current_occupancy || 0` - default to 0
- `camp.capacity || 1` - prevent division by zero
- `camp.name || 'Unnamed Camp'` - show fallback name
- `camp.type || 'unknown'` - default type
- `camp.supplies?.food?.stock || 'none'` - optional chaining with fallback
- `camp.needs && camp.supplies` - conditional rendering only if data exists
- `Array.isArray(camp.needs)` - verify array before operations

**Array Operations:**

```javascript
// Before:
const allNeeds = [...new Set(camps.flatMap((c) => c.needs))];

// After:
const allNeeds = [
  ...new Set(camps.flatMap((c) => (Array.isArray(c.needs) ? c.needs : []))),
];
```

#### `src/pages/CampDetail.jsx`

**Null-Safe Calculations:**

```javascript
// Before:
const occupancyPercent = Math.round(
  (camp.current_occupancy / camp.capacity) * 100
);

// After:
const occupancyPercent = Math.round(
  ((camp.current_occupancy || 0) / (camp.capacity || 1)) * 100
);
```

**Facilities Access:**

```javascript
// Before:
camp.facilities.shelter;

// After:
camp.facilities?.shelter;
```

## Fixed Issues

### 1. React Runtime Errors

**Problem:** Accessing properties on null/undefined values

```
TypeError: Cannot read property 'join' of undefined (camp.needs)
TypeError: Cannot read property 'stock' of undefined (camp.supplies.food)
```

**Solution:**

- Optional chaining (`?.`)
- Nullish coalescing (`||`)
- Array.isArray() checks
- Conditional rendering

### 2. Intermittent Empty Camps Display

**Problem:** Camps array would sometimes reset to empty even after successful load

**Root Cause:**

- Multiple subscriptions being created
- Cache invalidation happening too frequently
- Re-subscription clearing existing data

**Solution:**

- Check `isInitialized` flag before subscribing
- Only invalidate cache on first mount
- Don't unsubscribe on component unmount to maintain data
- Use dependency array `[isInitialized, subscribeToCamps]` instead of `[]`

### 3. Division by Zero

**Problem:** `camp.current_occupancy / camp.capacity` when capacity is 0 or null

**Solution:** Default capacity to 1: `(camp.capacity || 1)`

## Data Flow Protection

### Layer 1: Database Query

```
supabaseService.getAllDocuments()
↓
Always returns { data: [], total: 0 } on error
```

### Layer 2: Store Subscription

```
subscribeToTable() → callback
↓
Array.isArray() check ensures safe array
↓
Store state always contains valid array
```

### Layer 3: Component Rendering

```
Component receives data from store
↓
Optional chaining & nullish coalescing
↓
Safe rendering with fallback values
```

## Testing Checklist

- [x] Camps display correctly with all fields populated
- [x] Camps display correctly with missing optional fields (needs, supplies)
- [x] No React errors when camp.facilities is null
- [x] No React errors when camp.needs is null/undefined
- [x] No React errors when camp.supplies is null/undefined
- [x] Occupancy calculation doesn't cause division by zero
- [x] Camp list doesn't disappear after initial load
- [x] Cache invalidation works correctly
- [x] Re-navigation to camps page shows cached data immediately
- [x] Background refresh updates data without clearing display

## Edge Cases Handled

1. **Null Name:** Shows "Unnamed Camp"
2. **Null Type:** Shows "Unknown" and uses ⛺ icon
3. **Null Occupancy:** Treats as 0
4. **Zero Capacity:** Uses 1 to prevent division by zero
5. **Null Needs Array:** Treats as empty array `[]`
6. **Null Supplies Object:** Treats as empty object `{}`
7. **Null Facilities:** All facility checks return false
8. **Database Error:** Returns empty array instead of crashing
9. **Cache Miss:** Returns null, triggers fresh fetch

## Files Modified

1. `src/store/supabaseStore.js` - Added array safety checks to all subscribe functions
2. `src/services/supabaseService.js` - Added error handling to getAllDocuments
3. `src/components/CampsList.jsx` - Fixed subscription logic and null-safe rendering
4. `src/pages/CampDetail.jsx` - Added optional chaining for facilities

## Notes

- All changes are backward compatible
- No database schema changes required
- Existing data works without migration
- Performance impact: negligible (just null checks)
