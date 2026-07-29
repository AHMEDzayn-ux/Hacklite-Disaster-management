/**
 * Secure Admin Service
 * ====================
 * Handles all admin-only operations through Supabase Edge Functions
 * 
 * SECURITY:
 * - All delete operations go through secure edge function
 * - Service role key is NEVER exposed to frontend
 * - JWT token is sent for admin verification (handled automatically by supabase.functions.invoke)
 * - All operations are audit logged server-side
 */

import { supabase } from '@/lib/supabase';

/**
 * Check if current user is an admin
 * This is a CLIENT-SIDE check for UI purposes only
 * The REAL verification happens server-side in the edge function
 */
export const checkIsAdmin = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { isAdmin: false, role: null };

        const { data: adminUser, error } = await supabase
            .from('admin_users')
            .select('role, is_active')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .single();

        if (error || !adminUser) {
            return { isAdmin: false, role: null };
        }

        return { isAdmin: true, role: adminUser.role };
    } catch (error) {
        console.error('Admin check error:', error);
        return { isAdmin: false, role: null };
    }
};

/**
 * Secure Delete Record
 * ====================
 * Deletes a record through the secure edge function
 * Uses supabase.functions.invoke() which automatically handles JWT authentication
 * 
 * @param table - The table to delete from
 * @param recordId - The UUID of the record to delete
 * @param reason - Optional reason for deletion (for audit log)
 * @returns Promise with success/error status
 */
export const secureDeleteRecord = async (table, recordId, reason = '') => {
    try {
        console.log('Calling secure-admin-delete with:', { table, recordId, reason });

        // Use supabase.functions.invoke() - automatically handles JWT auth
        const { data, error } = await supabase.functions.invoke('secure-admin-delete', {
            body: {
                table,
                recordId,
                reason
            }
        });

        console.log('Edge function response:', { data, error });

        if (error) {
            throw new Error(error.message || 'Delete operation failed');
        }

        // Check if the response indicates an error
        if (data?.error) {
            const errorMsg = data.details 
                ? `${data.error} - ${data.details}${data.userId ? ` (User: ${data.userId})` : ''}`
                : data.error;
            throw new Error(errorMsg);
        }

        return {
            success: true,
            message: data.message,
            deletedRecord: data.deletedRecord
        };

    } catch (error) {
        console.error('Secure delete error:', error);
        return {
            success: false,
            error: error.message || 'Failed to delete record'
        };
    }
};

/**
 * Secure Approve Camp Request
 * ============================
 * Approves a camp request and creates the camp
 * 
 * @param requestId - The UUID of the camp request
 * @param campData - The camp data to create
 * @returns Promise with success/error status
 */
export const secureApproveCampRequest = async (requestId, campData) => {
    try {
        const { data, error } = await supabase.functions.invoke('secure-camp-approval', {
            body: {
                requestId,
                action: 'approve',
                campData
            }
        });

        if (error) {
            throw new Error(error.message || 'Approval operation failed');
        }

        if (data?.error) {
            throw new Error(data.error);
        }

        return {
            success: true,
            message: data.message,
            camp: data.result?.camp
        };

    } catch (error) {
        console.error('Secure approval error:', error);
        return {
            success: false,
            error: error.message || 'Failed to approve camp request'
        };
    }
};

/**
 * Secure Register Camp (Direct)
 * =============================
 * Directly registers a camp without a public request
 * Uses the same secure-camp-approval edge function (action: 'register')
 * to ensure identical insert logic as the approve flow
 * 
 * @param campData - The camp data to create
 * @returns Promise with success/error status
 */
export const secureRegisterCamp = async (campData) => {
    try {
        // Use the same edge function as approval, just with action: 'register'
        // This ensures identical insert logic and validation
        const { data, error } = await supabase.functions.invoke('secure-camp-approval', {
            body: {
                action: 'register',
                campData: campData
            }
        });

        if (error) {
            console.error('Edge function invoke error:', error);
            throw new Error(error.message || 'Registration operation failed');
        }

        if (data?.error) {
            console.error('Server returned error:', data);
            const errorMsg = data.details 
                ? `${data.error} (${data.details})` 
                : data.error;
            throw new Error(errorMsg);
        }

        return {
            success: true,
            message: data.message || 'Camp registered successfully',
            camp: data.result?.camp
        };

    } catch (error) {
        console.error('Secure registration error:', error);
        return {
            success: false,
            error: error.message || 'Failed to register camp'
        };
    }
};

/**
 * Secure Reject Camp Request
 * ===========================
 * Rejects a camp request with reason
 * 
 * @param requestId - The UUID of the camp request
 * @param rejectionReason - Required reason for rejection
 * @returns Promise with success/error status
 */
export const secureRejectCampRequest = async (requestId, rejectionReason) => {
    try {
        const { data, error } = await supabase.functions.invoke('secure-camp-approval', {
            body: {
                requestId,
                action: 'reject',
                rejectionReason
            }
        });

        if (error) {
            throw new Error(error.message || 'Rejection operation failed');
        }

        if (data?.error) {
            throw new Error(data.error);
        }

        return {
            success: true,
            message: data.message
        };

    } catch (error) {
        console.error('Secure rejection error:', error);
        return {
            success: false,
            error: error.message || 'Failed to reject camp request'
        };
    }
};

/**
 * Get Audit Logs
 * ==============
 * Fetches audit logs for admin review
 * Only accessible by admins due to RLS
 */
export const getAuditLogs = async (options = {}) => {
    try {
        const { limit = 50, offset = 0, table = null, adminId = null } = options;

        let query = supabase
            .from('audit_logs')
            .select('*', { count: 'exact' })
            .order('performed_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (table) {
            query = query.eq('table_name', table);
        }

        if (adminId) {
            query = query.eq('admin_id', adminId);
        }

        const { data, error, count } = await query;

        if (error) throw error;

        return { data: data || [], total: count, error: null };

    } catch (error) {
        console.error('Fetch audit logs error:', error);
        return { data: [], total: 0, error: error.message };
    }
};

/**
 * Allowed tables for deletion
 * Must match the edge function's ALLOWED_TABLES
 * Admin can delete from ALL these tables
 */
export const DELETABLE_TABLES = {
    CAMP_REQUESTS: 'camp_requests',
    CAMPS: 'camps',
    MISSING_PERSONS: 'missing_persons',
    DISASTERS: 'disasters',
    ANIMAL_RESCUES: 'animal_rescues',
    DONATIONS: 'donations'
};

/**
 * Table display names for UI
 */
export const TABLE_DISPLAY_NAMES = {
    camp_requests: 'Camp Request',
    camps: 'Relief Camp',
    missing_persons: 'Missing Person Report',
    disasters: 'Disaster Report',
    animal_rescues: 'Animal Rescue Report',
    donations: 'Donation'
};

/**
 * No super_admin restrictions - all admins can delete
 */
export const SUPER_ADMIN_TABLES = [];
