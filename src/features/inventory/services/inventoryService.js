/**
 * Camp Inventory Service
 * ======================
 * Code-gated writes/reads for the Smart Relief Inventory ledger, via the
 * camp-inventory edge function. Volunteers authenticate with a per-camp
 * access code (no signup); admins use their session JWT.
 */

import { supabase } from '@/lib/supabase';

const invokeInventory = async (body) => {
    try {
        const { data, error } = await supabase.functions.invoke('camp-inventory', { body });
        if (error) throw new Error(error.message || 'Request failed');
        if (data?.error) throw new Error(data.error);
        return { success: true, ...data };
    } catch (error) {
        console.error('camp-inventory error:', error);
        return { success: false, error: error.message || 'Inventory request failed' };
    }
};

const invokeInventoryAsAdmin = async (body) => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Not authenticated. Please log in again.');
        const { data, error } = await supabase.functions.invoke('camp-inventory', {
            body,
            headers: { Authorization: `Bearer ${session.access_token}` }
        });
        if (error) throw new Error(error.message || 'Request failed');
        if (data?.error) throw new Error(data.error);
        return { success: true, ...data };
    } catch (error) {
        console.error('camp-inventory (admin) error:', error);
        return { success: false, error: error.message || 'Inventory request failed' };
    }
};

/** Volunteer path: record a stock movement using the camp's access code. */
export const recordInventoryTransaction = (campId, accessCode, transaction) =>
    invokeInventory({ action: 'record', campId, accessCode, ...transaction });

/** Volunteer path: fetch current stock + thresholds for one camp. */
export const fetchCampInventoryLevels = (campId, accessCode) =>
    invokeInventory({ action: 'get-levels', campId, accessCode });

/** Admin path: fetch stock across every camp. */
export const fetchAllInventoryLevels = () => invokeInventoryAsAdmin({ action: 'get-levels' });

/** Admin path: record a transaction without needing the camp's code. */
export const recordInventoryTransactionAsAdmin = (campId, transaction) =>
    invokeInventoryAsAdmin({ action: 'record', campId, ...transaction });

/** Admin path: issue a new access code for a camp (invalidates the old one). */
export const regenerateInventoryAccessCode = (campId) =>
    invokeInventoryAsAdmin({ action: 'regenerate-code', campId });

/**
 * The canonical relief-item catalog. Stock entry and requests both pick from
 * this, so two camps referring to the same item resolve to the same item_id -
 * which is what lets the allocation agent match them at all.
 *
 * Read straight from the table rather than the edge function: the catalog is
 * public reference data, and the code-gated volunteer screen needs it too
 * without an admin session.
 */
export const fetchResourceItems = async () => {
    try {
        const { data, error } = await supabase
            .from('resource_items')
            .select('id, name, category, default_unit')
            .eq('is_active', true)
            .order('category')
            .order('name');
        if (error) throw error;
        return { success: true, items: data || [] };
    } catch (error) {
        console.error('resource_items fetch error:', error);
        return { success: false, error: error.message, items: [] };
    }
};

/**
 * Camp admin path: raise a supply request. These requests are the only demand
 * signal the Resource Allocation Engine considers - the agent no longer infers
 * need from stock thresholds.
 */
export const createResourceRequest = (request) =>
    invokeInventoryAsAdmin({ action: 'create-request', ...request });

/** Camp admin sees their own camp's requests; a full admin with no campId sees all. */
export const fetchResourceRequests = (campId) =>
    invokeInventoryAsAdmin({ action: 'list-requests', ...(campId ? { campId } : {}) });

export const cancelResourceRequest = (requestId) =>
    invokeInventoryAsAdmin({ action: 'cancel-request', requestId });

export const REQUEST_URGENCY_LEVELS = ['low', 'normal', 'high', 'critical'];

export const CATEGORY_LABELS = {
    food: '🍚 Food', water: '💧 Water', medical: '⚕️ Medical', shelter: '⛺ Shelter',
    clothing: '👕 Clothing', hygiene: '🧼 Hygiene', other: '📦 Other',
};
