/**
 * Camp Inventory Service
 * ======================
 * Code-gated writes/reads for the Smart Relief Inventory ledger, via the
 * camp-inventory edge function. Volunteers authenticate with a per-camp
 * access code (no signup); admins use their session JWT.
 */

import { supabase } from '../config/supabase';

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

export const INVENTORY_CATEGORIES = ['food', 'water', 'medical', 'shelter', 'clothing', 'hygiene', 'other'];
