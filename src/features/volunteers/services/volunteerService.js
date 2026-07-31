/**
 * Volunteer Service
 * =================
 * Volunteering needs no account and no registration. Someone describes what
 * they can contribute and gets AI-ranked, safety-checked open cases they
 * could help with, with the reporter's contact details to reach out directly.
 *
 * Nothing is stored - the request carries the whole profile and the response
 * is purely informational. There is no assignment, no claim, no commitment.
 */

import { supabase } from '@/lib/supabase';

export const VOLUNTEER_SKILLS = [
    'rescue', 'medical', 'logistics', 'driving', 'first_aid', 'construction', 'counseling',
    'missing_person_search', 'house_clearing', 'boat_service',
];

/**
 * Hazardous cases (flood/fire rescue, dangerous animals, hazardous-terrain
 * searches) are filtered out server-side unless the person said they can do
 * rescue, medical, or boat/water work - they are never merely deprioritized.
 */
export const fetchVolunteerSuggestions = async ({ skills, customSkill, groupSize, district, location }) => {
    try {
        const { data, error } = await supabase.functions.invoke('volunteer-suggestions', {
            body: { skills, customSkill, groupSize, district, location },
        });
        if (error) throw new Error(error.message || 'Request failed');
        if (data?.error) throw new Error(data.error);
        return { success: true, suggestions: data?.suggestions || [] };
    } catch (error) {
        console.error('volunteer-suggestions error:', error);
        return { success: false, error: error.message };
    }
};
