/**
 * Camp Management Service
 * =======================
 * Handles all camp-related admin operations through the unified edge function
 * 
 * Operations:
 * - Direct camp registration by admin
 * - Approve camp request (creates camp)
 * - Reject camp request
 * 
 * SECURITY:
 * - All operations go through secure edge function
 * - JWT token sent automatically via supabase.functions.invoke
 * - All operations are audit logged server-side
 */

import { supabase } from '../config/supabase';

/**
 * Helper to get current session token
 */
const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
        throw new Error('Not authenticated. Please log in again.');
    }
    return session.access_token;
};

/**
 * Register Camp Directly
 * ======================
 * Admin directly registers a camp without a public request
 * 
 * @param campData - Complete camp data to create
 * @returns Promise with success/error status and created camp
 */
export const registerCampDirect = async (campData, campAdminEmail = null) => {
    try {
        // Ensure we have a valid session
        const token = await getAuthToken();

        console.log('Calling camp-management (register):', campData);

        const { data, error } = await supabase.functions.invoke('camp-management', {
            body: {
                action: 'register',
                campData,
                campAdminEmail
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        console.log('Edge function response:', { data, error });

        if (error) {
            // supabase-js hides the function's real error body behind a generic
            // "non-2xx" message - dig it out of error.context (the raw Response).
            let detail = error.message || 'Registration failed';
            try {
                const body = await error.context.json();
                detail = body.details ? `${body.error} (${body.details})` : (body.error || detail);
            } catch { /* body not JSON - keep generic message */ }
            console.error('camp-management error body:', detail);
            throw new Error(detail);
        }

        if (data?.error) {
            const errorMsg = data.details
                ? `${data.error} (${data.details})`
                : data.error;
            throw new Error(errorMsg);
        }

        return {
            success: true,
            message: data.message || 'Camp registered successfully',
            camp: data.camp,
            campAdmin: data.campAdmin ?? null,          // { email, password } to show once
            campAdminError: data.campAdminError ?? null // camp created but admin failed
        };

    } catch (error) {
        console.error('Register camp error:', error);
        return {
            success: false,
            error: error.message || 'Failed to register camp'
        };
    }
};

/**
 * Approve Camp Request
 * ====================
 * Approves a public camp request and creates the camp
 * 
 * @param requestId - UUID of the camp request to approve
 * @param campData - Complete camp data (pre-filled from request + admin additions)
 * @returns Promise with success/error status and created camp
 */
export const approveCampRequest = async (requestId, campData, campAdminEmail = null) => {
    try {
        // Ensure we have a valid session
        const token = await getAuthToken();

        console.log('Calling camp-management (approve):', { requestId, campData });

        const { data, error } = await supabase.functions.invoke('camp-management', {
            body: {
                action: 'approve',
                requestId,
                campData,
                campAdminEmail
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        console.log('Edge function response:', { data, error });

        if (error) {
            throw new Error(error.message || 'Approval failed');
        }

        if (data?.error) {
            const errorMsg = data.details 
                ? `${data.error} (${data.details})`
                : data.error;
            throw new Error(errorMsg);
        }

        return {
            success: true,
            message: data.message || 'Camp request approved successfully',
            camp: data.camp,
            requestId: data.requestId,
            campAdmin: data.campAdmin ?? null,
            campAdminError: data.campAdminError ?? null
        };

    } catch (error) {
        console.error('Approve request error:', error);
        return {
            success: false,
            error: error.message || 'Failed to approve camp request'
        };
    }
};

/**
 * Reject Camp Request
 * ===================
 * Rejects a public camp request with reason
 * 
 * @param requestId - UUID of the camp request to reject
 * @param rejectionReason - Required reason for rejection
 * @returns Promise with success/error status
 */
export const rejectCampRequest = async (requestId, rejectionReason) => {
    try {
        // Ensure we have a valid session
        const token = await getAuthToken();
        
        console.log('Calling camp-management (reject):', { requestId, rejectionReason });

        const { data, error } = await supabase.functions.invoke('camp-management', {
            body: {
                action: 'reject',
                requestId,
                rejectionReason
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        console.log('Edge function response:', { data, error });

        if (error) {
            throw new Error(error.message || 'Rejection failed');
        }

        if (data?.error) {
            throw new Error(data.error);
        }

        return {
            success: true,
            message: data.message || 'Camp request rejected successfully',
            requestId: data.requestId
        };

    } catch (error) {
        console.error('Reject request error:', error);
        return {
            success: false,
            error: error.message || 'Failed to reject camp request'
        };
    }
};

/**
 * Fetch Camp Requests
 * ===================
 * Fetches camp requests with optional filtering
 * 
 * @param filter - 'pending', 'approved', 'rejected', or 'all'
 * @returns Promise with requests array
 */
export const fetchCampRequests = async (filter = 'all') => {
    try {
        let query = supabase
            .from('camp_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (filter !== 'all') {
            query = query.eq('status', filter);
        }

        const { data, error } = await query;

        if (error) throw error;

        return { success: true, data: data || [] };

    } catch (error) {
        console.error('Fetch requests error:', error);
        return { success: false, error: error.message, data: [] };
    }
};

/**
 * Fetch Camps
 * ===========
 * Fetches camps with optional filtering
 * 
 * @param filter - 'Active', 'Closed', or 'all'
 * @returns Promise with camps array
 */
export const fetchCamps = async (filter = 'all') => {
    try {
        let query = supabase
            .from('camps')
            .select('*')
            .order('created_at', { ascending: false });

        if (filter !== 'all') {
            query = query.ilike('status', filter);
        }

        const { data, error } = await query;

        if (error) throw error;

        return { success: true, data: data || [] };

    } catch (error) {
        console.error('Fetch camps error:', error);
        return { success: false, error: error.message, data: [] };
    }
};

/**
 * Update Camp Status
 * ==================
 * Updates a camp's status (e.g., mark as closed)
 * 
 * @param campId - UUID of the camp
 * @param status - New status ('Active', 'Closed', etc.)
 * @returns Promise with success/error status
 */
export const updateCampStatus = async (campId, status) => {
    try {
        const { data, error } = await supabase
            .from('camps')
            .update({
                status,
                updated_at: new Date().toISOString()
            })
            .eq('id', campId)
            .select()
            .single();

        if (error) throw error;

        return { success: true, camp: data };

    } catch (error) {
        console.error('Update camp status error:', error);
        return { success: false, error: error.message };
    }
};

// Sri Lanka Districts for form dropdowns
export const SRI_LANKA_DISTRICTS = [
    'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
    'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
    'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
    'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
    'Monaragala', 'Ratnapura', 'Kegalle'
];

// Camp type options
export const CAMP_TYPES = [
    { value: 'temporary-shelter', label: 'Temporary Shelter' },
    { value: 'emergency-evacuation', label: 'Emergency Evacuation Center' },
    { value: 'long-term-relief', label: 'Long-term Relief Camp' },
    { value: 'medical-facility', label: 'Medical Facility' },
    { value: 'distribution-center', label: 'Distribution Center' }
];

// Facility options for camps
export const FACILITY_OPTIONS = [
    'Food', 'Drinking Water', 'Medical Services', 'Shelter', 'Sanitation',
    'Electricity', 'Communication', 'Transportation', 'Child Care',
    'Elder Care', 'Disability Support', 'Security'
];

// Needs/resources options
export const NEEDS_OPTIONS = [
    'Food', 'Drinking Water', 'Medical Supplies', 'Blankets', 'Clothing',
    'Hygiene Items', 'Baby Products', 'Medicines', 'Volunteers', 'Generators',
    'Tents', 'Mattresses', 'First Aid Kits', 'Wheelchairs'
];
