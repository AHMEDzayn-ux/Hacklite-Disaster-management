import { supabase } from '../config/supabase';
import { getCachedData, setCachedData, invalidateCache } from '../utils/cacheManager';

/**
 * Supabase service layer
 * Provides CRUD operations and real-time subscriptions for all collections
 * 
 * SECURITY NOTES:
 * - Uses anon key only (no service role key in frontend)
 * - RLS policies enforce access control server-side
 * - All operations go through Supabase Row Level Security
 */

// Table names
export const TABLES = {
    MISSING_PERSONS: 'missing_persons',
    DISASTERS: 'disasters',
    ANIMAL_RESCUES: 'animal_rescues',
    CAMPS: 'camps',
    CAMP_REQUESTS: 'camp_requests',
    DONATIONS: 'donations'
};

// Debounce utility for realtime updates
const debounceMap = new Map();
const debounce = (key, callback, delay = 300) => {
    if (debounceMap.has(key)) {
        clearTimeout(debounceMap.get(key));
    }
    debounceMap.set(key, setTimeout(() => {
        callback();
        debounceMap.delete(key);
    }, delay));
};

// Create a new document
export const createDocument = async (table, data) => {
    try {
        const { data: result, error } = await supabase
            .from(table)
            .insert([data])
            .select()
            .single();

        if (error) throw error;
        
        // Invalidate cache when new data is created
        invalidateCache(table);
        
        return result;
    } catch (error) {
        console.error(`Error creating document in ${table}:`, error);
        throw error;
    }
};

// Get a single document by ID
export const getDocument = async (table, id) => {
    try {
        const { data, error } = await supabase
            .from(table)
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error(`Error getting document from ${table}:`, error);
        throw error;
    }
};

// Get all documents from a table
export const getAllDocuments = async (table, options = {}) => {
    try {
        const { limit, offset = 0 } = options;
        let query = supabase
            .from(table)
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false });
        
        if (limit) {
            query = query.range(offset, offset + limit - 1);
        }

        const { data, error, count } = await query;

        if (error) throw error;
        // Ensure data is always an array
        return { data: Array.isArray(data) ? data : [], total: count || 0 };
    } catch (error) {
        console.error(`Error getting all documents from ${table}:`, error);
        // Return empty array instead of throwing to prevent UI breaks
        return { data: [], total: 0 };
    }
};

// Update a document
export const updateDocument = async (table, id, updates) => {
    try {
        const { data, error } = await supabase
            .from(table)
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        
        // Invalidate cache when data is updated
        invalidateCache(table);
        
        return data;
    } catch (error) {
        console.error(`Error updating document in ${table}:`, error);
        throw error;
    }
};

// Delete a document
export const deleteDocument = async (table, id) => {
    try {
        const { error } = await supabase
            .from(table)
            .delete()
            .eq('id', id);

        if (error) throw error;
        
        // Invalidate cache when data is deleted
        invalidateCache(table);
        
        return true;
    } catch (error) {
        console.error(`Error deleting document from ${table}:`, error);
        throw error;
    }
};

// Subscribe to real-time changes - progressive loading with caching and debouncing
export const subscribeToTable = async (table, callback) => {
    const INITIAL_CHUNK = 30; // Show first 30 immediately
    const CHUNK_SIZE = 50; // Load remaining in 50-record batches
    const DEBOUNCE_DELAY = 500; // Debounce realtime updates by 500ms

    // Check cache first
    const cachedResult = getCachedData(table);
    if (cachedResult) {
        // Use cached data immediately - instant load!
        callback(cachedResult.data || []);
        
        // ALWAYS fetch fresh data in background to ensure we have the latest
        (async () => {
            try {
                const { data: freshData, count, error } = await supabase
                    .from(table)
                    .select('*', { count: 'exact' })
                    .order('created_at', { ascending: false });
                
                if (error) {
                    console.error(`Error fetching fresh ${table}:`, error);
                    return;
                }
                
                const allData = freshData || [];
                // Only update if data is different
                if (JSON.stringify(allData) !== JSON.stringify(cachedResult.data)) {
                    console.log(`✓ Fresh data loaded for ${table} (${allData.length} items)`);
                    callback(allData, false); // false = replace mode
                    setCachedData(table, allData, count);
                }
            } catch (err) {
                console.error(`Background fetch error for ${table}:`, err);
            }
        })();
        
        // Still subscribe to real-time updates
        const subscription = supabase
            .channel(`${table}_changes`)
            .on('postgres_changes', 
                { event: '*', schema: 'public', table }, 
                async (payload) => {
                    // Debounce updates to prevent UI thrashing
                    debounce(`realtime_${table}`, async () => {
                        // Invalidate cache on any change
                        invalidateCache(table);
                        
                        // Refetch all data
                        try {
                            const { data: updatedData, count, error } = await supabase
                                .from(table)
                                .select('*', { count: 'exact' })
                                .order('created_at', { ascending: false });
                            
                            if (error) {
                                console.error(`Error refetching ${table}:`, error);
                                return;
                            }
                            
                            const allData = updatedData || [];
                            callback(allData, false); // false = replace mode
                            
                            // Update cache
                            setCachedData(table, allData, count);
                        } catch (err) {
                            console.error(`Realtime update error for ${table}:`, err);
                        }
                    }, DEBOUNCE_DELAY);
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
            // Clear any pending debounced updates
            if (debounceMap.has(`realtime_${table}`)) {
                clearTimeout(debounceMap.get(`realtime_${table}`));
                debounceMap.delete(`realtime_${table}`);
            }
        };
    }

    // No cache - fetch and show first chunk INSTANTLY
    try {
        const { data: initialData, error, count } = await supabase
            .from(table)
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(0, INITIAL_CHUNK - 1);
        
        if (error) {
            console.error(`Error fetching ${table}:`, error);
            callback([]);
            return () => {};
        }

        // Show first chunk immediately - user sees data right away!
        callback(initialData || []);

        // Array to collect all data for caching
        let allData = [...(initialData || [])];

        // Load remaining data in background (if any)
        const totalRecords = count || 0;
        if (totalRecords > INITIAL_CHUNK) {
            // Load remaining chunks without blocking
            let offset = INITIAL_CHUNK;
            
            const loadRemainingChunks = async () => {
                while (offset < totalRecords) {
                    try {
                        const { data: nextChunk, error: chunkError } = await supabase
                            .from(table)
                            .select('*')
                            .order('created_at', { ascending: false })
                            .range(offset, offset + CHUNK_SIZE - 1);
                        
                        if (chunkError) {
                            console.error(`Error loading chunk for ${table}:`, chunkError);
                            break;
                        }
                        
                        if (nextChunk && nextChunk.length > 0) {
                            // Append new data as it arrives (no delay!)
                            callback(nextChunk, true); // true = append mode
                            allData = [...allData, ...nextChunk];
                            offset += nextChunk.length;
                        } else {
                            break;
                        }
                    } catch (err) {
                        console.error(`Chunk load error for ${table}:`, err);
                        break;
                    }
                }
                
                // Cache all data after loading completes
                setCachedData(table, allData, totalRecords);
            };
            
            // Load in background without blocking UI
            loadRemainingChunks();
        } else {
            // Cache the initial data if it's all we have
            setCachedData(table, allData, totalRecords);
        }

        // Subscribe to real-time updates with debouncing
        const subscription = supabase
            .channel(`${table}_changes`)
            .on('postgres_changes', 
                { event: '*', schema: 'public', table }, 
                async (payload) => {
                    // Debounce updates to prevent UI thrashing
                    debounce(`realtime_${table}`, async () => {
                        // Invalidate cache on any change
                        invalidateCache(table);
                        
                        // Refetch all data on changes to ensure consistency
                        try {
                            const { data: updatedData, count, error: updateError } = await supabase
                                .from(table)
                                .select('*', { count: 'exact' })
                                .order('created_at', { ascending: false });
                            
                            if (updateError) {
                                console.error(`Error updating ${table}:`, updateError);
                                return;
                            }
                            
                            const freshData = updatedData || [];
                            callback(freshData, false); // false = replace mode
                            
                            // Update cache with fresh data
                            setCachedData(table, freshData, count);
                        } catch (err) {
                            console.error(`Realtime refresh error for ${table}:`, err);
                        }
                    }, DEBOUNCE_DELAY);
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
            // Clear any pending debounced updates
            if (debounceMap.has(`realtime_${table}`)) {
                clearTimeout(debounceMap.get(`realtime_${table}`));
                debounceMap.delete(`realtime_${table}`);
            }
        };
    } catch (err) {
        console.error(`Fatal error subscribing to ${table}:`, err);
        callback([]);
        return () => {};
    }
};

// Upload photo to Supabase Storage
export const uploadPhoto = async (file, bucket, path) => {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${path}/${fileName}`;

        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filePath, file);

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

        return { url: publicUrl, path: filePath };
    } catch (error) {
        console.error('Error uploading photo:', error);
        throw error;
    }
};

// Delete photo from Supabase Storage
export const deletePhoto = async (bucket, path) => {
    try {
        const { error } = await supabase.storage
            .from(bucket)
            .remove([path]);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting photo:', error);
        throw error;
    }
};

// Upload a call recording, create its call_recordings row, then trigger
// call-transcription-agent's fast path (fire-and-forget - the UI polls
// call_recordings.status rather than waiting on this call to resolve).
export const uploadCallRecording = async (file, { callerPhone, notes } = {}) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `recordings/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('call-recordings')
        .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { user } } = await supabase.auth.getUser();

    const { data: row, error: insertError } = await supabase
        .from('call_recordings')
        .insert({
            storage_path: filePath,
            original_filename: file.name,
            uploaded_by: user?.id || null,
            caller_phone: callerPhone || null,
            notes: notes || null,
            status: 'pending',
        })
        .select('*')
        .single();

    if (insertError) throw insertError;

    // Fast path: kick off processing now; the GitHub Actions cron sweep is
    // the safety net if this invoke fails to reach the function.
    supabase.functions.invoke('call-transcription-agent', {
        body: { call_recording_id: row.id },
    }).catch((err) => console.error('call-transcription-agent invoke failed:', err));

    return row;
};
