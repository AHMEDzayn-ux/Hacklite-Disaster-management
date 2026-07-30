/**
 * Missing Person Closure Service
 * ==============================
 * Closing a case is not a table update from the browser - it goes through the
 * resolve-missing-person edge function, because closing a case sends an SMS to
 * the reporter and the reporter's phone number must never reach this code.
 *
 * The function screens the closure text for payment demands and off-platform
 * contact details before it writes or sends anything. A rejected closure comes
 * back as { success: false, flagged: true, guidance: [...] } and the case stays
 * open - see supabase/functions/_shared/closureScreening.ts.
 */

import { supabase } from '@/lib/supabase';

/** Condition options, matching missing_persons_found_condition_check. */
export const FOUND_CONDITIONS = [
    { value: 'safe', label: 'Found safe and unharmed' },
    { value: 'injured_treated', label: 'Injured, receiving treatment' },
    { value: 'hospitalised', label: 'Admitted to hospital' },
    { value: 'in_official_care', label: 'In the care of officials (police / camp / child protection)' },
    { value: 'deceased', label: 'Deceased' },
];

export const FOUND_CONDITION_LABELS = Object.fromEntries(
    FOUND_CONDITIONS.map(({ value, label }) => [value, label])
);

export const CLOSURE_FIELD_LIMITS = {
    resolvedByName: 80,
    foundPersonLocation: 160,
    authorityContact: 120,
    notes: 300,
};

/**
 * Close a case and notify the reporter.
 *
 * @returns {Promise<{success: boolean, resolution?: object, foundAt?: string,
 *   notified?: boolean, error?: string, flagged?: boolean, guidance?: string[],
 *   fields?: string[], alreadyResolved?: boolean}>}
 */
export const resolveMissingPersonCase = async ({
    caseId,
    resolvedByName,
    resolverContact,
    foundPersonLocation,
    foundPersonCondition,
    authorityContact,
    notes,
}) => {
    try {
        const { data, error } = await supabase.functions.invoke('resolve-missing-person', {
            body: {
                case_id: caseId,
                resolved_by_name: resolvedByName,
                resolver_contact: resolverContact || null,
                found_person_location: foundPersonLocation,
                found_person_condition: foundPersonCondition,
                authority_contact: authorityContact || null,
                notes: notes || null,
            },
        });

        // A screener rejection is a 422, which supabase-js surfaces as an error
        // with the body attached to error.context - the guidance lives there, so
        // read the response before treating this as a transport failure.
        if (error) {
            const payload = await readErrorPayload(error);
            if (payload) return failureFrom(payload);
            return { success: false, error: error.message || 'Could not close the case' };
        }

        if (data?.error) return failureFrom(data);

        return {
            success: true,
            resolution: data?.resolution || null,
            foundAt: data?.found_at || null,
            notified: data?.notification?.status === 'sent',
        };
    } catch (err) {
        console.error('resolve-missing-person error:', err);
        return { success: false, error: err.message || 'Could not close the case' };
    }
};

/** supabase-js puts the non-2xx Response on error.context; the JSON body is where our detail is. */
async function readErrorPayload(error) {
    try {
        const response = error?.context;
        if (typeof response?.json !== 'function') return null;
        return await response.json();
    } catch {
        return null;
    }
}

function failureFrom(payload) {
    return {
        success: false,
        error: payload.error || 'Could not close the case',
        flagged: payload.code === 'closure_flagged',
        alreadyResolved: payload.code === 'already_resolved',
        guidance: Array.isArray(payload.guidance) ? payload.guidance : [],
        fields: Array.isArray(payload.fields) ? payload.fields : [],
        review: payload.review || null,
    };
}
