/**
 * Browser Cache Manager for Disaster Management App
 * Stores fetched data in localStorage with timestamp-based invalidation
 */

const CACHE_PREFIX = 'disaster_mgmt_cache_';
const CACHE_DURATION = 1 * 60 * 1000; // 1 minute in milliseconds

/**
 * Generate cache key for a table
 */
const getCacheKey = (table) => `${CACHE_PREFIX}${table}`;

/**
 * Get cached data if valid
 * @param {string} table - Table name
 * @returns {object|null} - Cached data with items array or null if invalid/expired
 */
export const getCachedData = (table) => {
    try {
        const cacheKey = getCacheKey(table);
        const cached = localStorage.getItem(cacheKey);
        
        if (!cached) return null;
        
        const { data, timestamp, total } = JSON.parse(cached);
        const now = Date.now();
        
        // Check if cache is still valid (within 1 minute)
        if (now - timestamp < CACHE_DURATION) {
            console.log(`✓ Using cached data for ${table} (${data.length} items, ${Math.round((now - timestamp) / 1000)}s old)`);
            return { data, total };
        } else {
            // Cache expired, remove it
            console.log(`✗ Cache expired for ${table}, removing...`);
            localStorage.removeItem(cacheKey);
            return null;
        }
    } catch (error) {
        console.error(`Error reading cache for ${table}:`, error);
        return null;
    }
};

/**
 * Save data to cache
 * @param {string} table - Table name
 * @param {array} data - Data to cache
 * @param {number} total - Total count of records
 */
export const setCachedData = (table, data, total) => {
    const cacheKey = getCacheKey(table);
    const cacheData = {
        data,
        total,
        timestamp: Date.now()
    };
    
    try {
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        console.log(`✓ Cached ${data.length} items for ${table}`);
    } catch (error) {
        // If localStorage is full, clear old caches
        if (error.name === 'QuotaExceededError') {
            console.warn('💾 Cache storage full, clearing old caches...');
            clearExpiredCaches();
            // Try again
            try {
                localStorage.setItem(cacheKey, JSON.stringify(cacheData));
                console.log(`✓ Cached ${data.length} items for ${table} after cleanup`);
            } catch (retryError) {
                console.error('❌ Failed to cache data even after cleanup:', retryError);
            }
        } else {
            console.error(`Error caching data for ${table}:`, error);
        }
    }
};

/**
 * Invalidate cache for a specific table
 * @param {string} table - Table name
 */
export const invalidateCache = (table) => {
    try {
        const cacheKey = getCacheKey(table);
        localStorage.removeItem(cacheKey);
        console.log(`✓ Invalidated cache for ${table}`);
    } catch (error) {
        console.error(`Error invalidating cache for ${table}:`, error);
    }
};

/**
 * Clear all expired caches
 */
export const clearExpiredCaches = () => {
    try {
        const now = Date.now();
        const keysToRemove = [];
        
        // Find all cache keys
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(CACHE_PREFIX)) {
                try {
                    const cached = JSON.parse(localStorage.getItem(key));
                    if (now - cached.timestamp >= CACHE_DURATION) {
                        keysToRemove.push(key);
                    }
                } catch {
                    // Invalid cache entry, mark for removal
                    keysToRemove.push(key);
                }
            }
        }
        
        // Remove expired caches
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        if (keysToRemove.length > 0) {
            console.log(`✓ Cleared ${keysToRemove.length} expired cache entries`);
        }
    } catch (error) {
        console.error('Error clearing expired caches:', error);
    }
};

/**
 * Clear all caches for the app
 */
export const clearAllCaches = () => {
    try {
        const keysToRemove = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(CACHE_PREFIX)) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log(`✓ Cleared all app caches (${keysToRemove.length} entries)`);
    } catch (error) {
        console.error('Error clearing all caches:', error);
    }
};

// Clear expired caches on module load
clearExpiredCaches();
