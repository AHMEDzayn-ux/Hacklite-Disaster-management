import { supabase } from '@/lib/supabase';
import { getCachedData, setCachedData, invalidateCache } from '@/lib/cacheManager';

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

// Registry of live table subscriptions, keyed by table name. Every caller of
// subscribeToTable() for the same table shares a single Supabase realtime
// channel and a single in-memory dataset - previously each caller (dashboard,
// list page, detail page, etc.) opened its OWN channel with the identical
// topic name `${table}_changes`. Duplicate joins to the same topic race on
// the socket, so realtime delivery landed unpredictably on only one of the
// channels - the "sometimes it updates, sometimes it doesn't" behavior.
const tableSubscriptions = new Map();

// Apply a postgres_changes payload directly to the in-memory dataset instead
// of refetching the whole table - this is what makes new reports show up
// with no added network round trip (previously: wait for a 500ms debounce,
// then re-select the entire table).
const applyRealtimeChange = (data, payload) => {
    const { eventType, new: newRow, old: oldRow } = payload;
    if (eventType === 'INSERT') {
        if (data.some(r => r.id === newRow.id)) return data;
        return [newRow, ...data];
    }
    if (eventType === 'UPDATE') {
        return data.map(r => (r.id === newRow.id ? { ...r, ...newRow } : r));
    }
    if (eventType === 'DELETE') {
        return data.filter(r => r.id !== oldRow.id);
    }
    return data;
};

// Subscribe to real-time changes - progressive loading with caching, one
// shared channel per table, and incremental (no-refetch) realtime updates.
export const subscribeToTable = async (table, callback) => {
    const INITIAL_CHUNK = 30; // Show first 30 immediately
    const CHUNK_SIZE = 50; // Load remaining in 50-record batches
    const BROADCAST_COALESCE_MS = 50; // Coalesce bursts of events into one render, not a latency hit

    let entry = tableSubscriptions.get(table);
    if (entry) {
        // A channel for this table already exists - just attach this caller
        // as another listener and replay the current data immediately.
        entry.listeners.add(callback);
        if (entry.ready) callback(entry.data, false);
        return () => {
            entry.listeners.delete(callback);
            if (entry.listeners.size === 0) {
                entry.channel.unsubscribe();
                if (entry.broadcastTimer) clearTimeout(entry.broadcastTimer);
                tableSubscriptions.delete(table);
            }
        };
    }

    entry = { data: [], listeners: new Set([callback]), channel: null, ready: false, broadcastTimer: null };
    tableSubscriptions.set(table, entry);

    const broadcast = (data, appendMode = false) => {
        entry.listeners.forEach(cb => cb(data, appendMode));
    };

    const scheduleCacheWrite = () => {
        if (entry.broadcastTimer) clearTimeout(entry.broadcastTimer);
        entry.broadcastTimer = setTimeout(() => {
            entry.broadcastTimer = null;
            setCachedData(table, entry.data, entry.data.length);
        }, BROADCAST_COALESCE_MS);
    };

    const startRealtimeChannel = () => {
        entry.channel = supabase
            .channel(`${table}_changes`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table },
                (payload) => {
                    entry.data = applyRealtimeChange(entry.data, payload);
                    broadcast(entry.data, false);
                    invalidateCache(table);
                    scheduleCacheWrite();
                }
            )
            .subscribe();
    };

    // Check cache first
    const cachedResult = getCachedData(table);
    if (cachedResult) {
        // Use cached data immediately - instant load!
        entry.data = cachedResult.data || [];
        entry.ready = true;
        broadcast(entry.data, false);

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
                if (JSON.stringify(allData) !== JSON.stringify(entry.data)) {
                    entry.data = allData;
                    broadcast(entry.data, false);
                    setCachedData(table, allData, count);
                }
            } catch (err) {
                console.error(`Background fetch error for ${table}:`, err);
            }
        })();

        startRealtimeChannel();

        return () => {
            entry.listeners.delete(callback);
            if (entry.listeners.size === 0) {
                entry.channel.unsubscribe();
                if (entry.broadcastTimer) clearTimeout(entry.broadcastTimer);
                tableSubscriptions.delete(table);
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
            entry.ready = true;
            broadcast([]);
            return () => {
                entry.listeners.delete(callback);
                if (entry.listeners.size === 0) tableSubscriptions.delete(table);
            };
        }

        // Show first chunk immediately - user sees data right away!
        entry.data = initialData || [];
        entry.ready = true;
        broadcast(entry.data);

        // Load remaining data in background (if any)
        const totalRecords = count || 0;
        if (totalRecords > INITIAL_CHUNK) {
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
                            const existingIds = new Set(entry.data.map(r => r.id));
                            const newRows = nextChunk.filter(r => !existingIds.has(r.id));
                            entry.data = [...entry.data, ...newRows];
                            broadcast(nextChunk, true); // true = append mode
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
                setCachedData(table, entry.data, totalRecords);
            };

            // Load in background without blocking UI
            loadRemainingChunks();
        } else {
            // Cache the initial data if it's all we have
            setCachedData(table, entry.data, totalRecords);
        }

        startRealtimeChannel();

        return () => {
            entry.listeners.delete(callback);
            if (entry.listeners.size === 0) {
                entry.channel.unsubscribe();
                if (entry.broadcastTimer) clearTimeout(entry.broadcastTimer);
                tableSubscriptions.delete(table);
            }
        };
    } catch (err) {
        console.error(`Fatal error subscribing to ${table}:`, err);
        entry.ready = true;
        broadcast([]);
        return () => {
            entry.listeners.delete(callback);
            if (entry.listeners.size === 0) tableSubscriptions.delete(table);
        };
    }
};

// Upload photo to Supabase Storage
export const uploadPhoto = async (file, bucket, path) => {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${path}/${fileName}`;

        const { error } = await supabase.storage
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

