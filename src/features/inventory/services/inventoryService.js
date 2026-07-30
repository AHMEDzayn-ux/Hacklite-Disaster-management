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

/**
 * Admin path: one camp's stock sheet, with that camp's reorder thresholds -
 * which the all-camps read deliberately omits, since thresholds are per camp.
 * This is what lets an admin drill into a single camp and see exactly the sheet
 * its camp admin sees.
 */
export const fetchCampInventoryLevelsAsAdmin = (campId) =>
    invokeInventoryAsAdmin({ action: 'get-levels', campId });

/** Admin path: record a transaction without needing the camp's code. */
export const recordInventoryTransactionAsAdmin = (campId, transaction) =>
    invokeInventoryAsAdmin({ action: 'record', campId, ...transaction });

/**
 * Admin path: the append-only movement ledger for a camp - every receipt,
 * distribution, correction and count, each with the note recorded at the time.
 * This is the version history behind a current-stock figure: how it got there
 * and who said so. Omit campId as a full admin to read every camp.
 */
export const fetchInventoryTransactions = (campId, limit = 150) =>
    invokeInventoryAsAdmin({ action: 'list-transactions', ...(campId ? { campId } : {}), limit });

/**
 * Admin path: save an edited stock table as a counted sheet.
 *
 * `counts` is [{ itemId, unit, quantity }] holding the counted figure for every
 * row on screen, not just the changed ones - saving the table asserts the whole
 * sheet was counted. The server writes one ledger row per item: a signed
 * 'adjusted' correction where the count differs from the ledger, and a
 * zero-quantity 'verified' row where it agrees. Nothing is ever overwritten.
 */
export const saveInventoryCount = (campId, counts, notes) =>
    invokeInventoryAsAdmin({ action: 'save-count', campId, counts, notes: notes || null });

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

/** The same categories without the pictograms, for tables and dense reports. */
export const CATEGORY_NAMES = {
    food: 'Food', water: 'Water', medical: 'Medical', shelter: 'Shelter',
    clothing: 'Clothing', hygiene: 'Hygiene', other: 'Other',
};

/**
 * How a ledger row reads in the history. `sign` is how the row moves stock, so
 * the history can show a signed change without re-deriving it from the type.
 */
export const TRANSACTION_TYPES = {
    received: { label: 'Received', sign: 1 },
    transferred_in: { label: 'Transferred in', sign: 1 },
    distributed: { label: 'Distributed', sign: -1 },
    transferred_out: { label: 'Transferred out', sign: -1 },
    adjusted: { label: 'Correction', sign: 1 },
    verified: { label: 'Counted', sign: 0 },
};

/** Stock is recounted twice a day, so anything older than this is overdue. */
export const STOCK_COUNT_INTERVAL_HOURS = 12;
