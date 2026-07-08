/**
 * Volunteer Service
 * =================
 * Public self-registration (no account) plus availability/assignment
 * self-service via the volunteer-self-service edge function, identity
 * proven by (volunteerId, phone) - the id is returned at registration and
 * expected to be kept in the browser (localStorage) by the caller.
 */

import { supabase } from '../config/supabase';

export const VOLUNTEER_SKILLS = ['rescue', 'medical', 'logistics', 'driving', 'first_aid', 'construction', 'counseling'];

export const registerVolunteer = async ({ name, phone, email, skills, district, location }) => {
    try {
        const { data, error } = await supabase.from('volunteers').insert({
            name, phone, email: email || null,
            skills: skills || [], district: district || null,
            location: location || null,
            availability_status: 'available',
        }).select().single();

        if (error) throw error;
        return { success: true, volunteer: data };
    } catch (error) {
        console.error('Volunteer registration error:', error);
        return { success: false, error: error.message || 'Failed to register' };
    }
};

const invokeSelfService = async (body) => {
    try {
        const { data, error } = await supabase.functions.invoke('volunteer-self-service', { body });
        if (error) throw new Error(error.message || 'Request failed');
        if (data?.error) throw new Error(data.error);
        return { success: true, ...data };
    } catch (error) {
        console.error('volunteer-self-service error:', error);
        return { success: false, error: error.message };
    }
};

export const updateVolunteerAvailability = (volunteerId, phone, availabilityStatus) =>
    invokeSelfService({ action: 'update-availability', volunteerId, phone, availabilityStatus });

export const respondToAssignment = (volunteerId, phone, assignmentId, response) =>
    invokeSelfService({ action: 'respond-assignment', volunteerId, phone, assignmentId, response });

export const fetchVolunteerAssignments = async (volunteerId) => {
    try {
        const { data, error } = await supabase
            .from('volunteer_assignments').select('*').eq('volunteer_id', volunteerId)
            .order('proposed_at', { ascending: false });
        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error) {
        return { success: false, error: error.message, data: [] };
    }
};

export const fetchAllVolunteers = async () => {
    try {
        const { data, error } = await supabase.from('volunteers').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error) {
        return { success: false, error: error.message, data: [] };
    }
};
