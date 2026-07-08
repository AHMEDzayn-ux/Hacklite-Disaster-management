/**
 * AI Agent Service
 * ================
 * Invokes the multi-agent pipeline's edge functions and fetches their
 * blackboard output tables. Mirrors the getAuthToken() + supabase.functions
 * .invoke() pattern already established in campManagementService.js.
 *
 * SECURITY: agent edge functions require an admin JWT (this file's calls) or
 * an x-agent-cron-secret header (the scheduled GitHub Actions trigger, not
 * used from the browser). All agent output tables are admin-only SELECT.
 */

import { supabase } from '../config/supabase';

const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
        throw new Error('Not authenticated. Please log in again.');
    }
    return session.access_token;
};

const invokeAgent = async (functionName, body = {}) => {
    try {
        const token = await getAuthToken();
        const { data, error } = await supabase.functions.invoke(functionName, {
            body,
            headers: { Authorization: `Bearer ${token}` }
        });

        if (error) throw new Error(error.message || `${functionName} failed`);
        if (data?.error) throw new Error(data.error);

        return { success: true, ...data };
    } catch (error) {
        console.error(`${functionName} error:`, error);
        return { success: false, error: error.message || `Failed to run ${functionName}` };
    }
};

export const runSituationAwarenessAgent = () => invokeAgent('situation-awareness-agent');
export const runIncidentPrioritizationAgent = () => invokeAgent('incident-prioritization-agent');
export const runResourceAllocationAgent = () => invokeAgent('resource-allocation-agent');
export const runRouteOptimizationAgent = () => invokeAgent('route-optimization-agent');
export const runVolunteerAssignmentAgent = () => invokeAgent('volunteer-assignment-agent');
export const runMultiStopRoute = (originCampId, stopCampIds) =>
    invokeAgent('route-optimization-agent', { action: 'multi-stop', originCampId, stopCampIds });

const latestSuccessfulRunId = async (agentName) => {
    const { data, error } = await supabase
        .from('agent_runs')
        .select('id')
        .eq('agent_name', agentName)
        .in('status', ['success', 'partial_failure'])
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error || !data) return null;
    return data.id;
};

export const fetchLatestSituationReports = async () => {
    try {
        const runId = await latestSuccessfulRunId('situation_awareness');
        if (!runId) return { success: true, data: [] };
        const { data, error } = await supabase
            .from('situation_reports').select('*').eq('run_id', runId).order('risk_score', { ascending: false });
        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error) {
        return { success: false, error: error.message, data: [] };
    }
};

export const fetchLatestPriorityQueue = async () => {
    try {
        const runId = await latestSuccessfulRunId('incident_prioritization');
        if (!runId) return { success: true, data: [] };
        const { data, error } = await supabase
            .from('incident_priority_queue')
            .select('*, disasters(id, disaster_type, severity, description, location, district, status)')
            .eq('run_id', runId).order('rank', { ascending: true });
        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error) {
        return { success: false, error: error.message, data: [] };
    }
};

export const fetchPendingAllocationPlans = async () => {
    try {
        const { data, error } = await supabase
            .from('allocation_plans')
            .select('*, from_camp:from_camp_id(id, name, district), to_camp:to_camp_id(id, name, district)')
            .eq('status', 'pending')
            .order('generated_at', { ascending: false });
        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error) {
        return { success: false, error: error.message, data: [] };
    }
};

export const reviewAllocationPlan = async (planId, action, reason) => {
    try {
        const token = await getAuthToken();
        const { data, error } = await supabase.functions.invoke('allocation-plan-review', {
            body: { action, planId, reason },
            headers: { Authorization: `Bearer ${token}` }
        });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
        return { success: true, ...data };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const fetchLatestRoutePlans = async () => {
    try {
        const { data, error } = await supabase
            .from('route_plans').select('*').order('generated_at', { ascending: false }).limit(50);
        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error) {
        return { success: false, error: error.message, data: [] };
    }
};

export const fetchLatestVolunteerAssignments = async () => {
    try {
        const { data, error } = await supabase
            .from('volunteer_assignments')
            .select('*, volunteers(id, name, phone, skills)')
            .order('proposed_at', { ascending: false })
            .limit(50);
        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error) {
        return { success: false, error: error.message, data: [] };
    }
};

export const fetchAgentRunHistory = async (agentName, limit = 10) => {
    try {
        const { data, error } = await supabase
            .from('agent_runs').select('*').eq('agent_name', agentName)
            .order('started_at', { ascending: false }).limit(limit);
        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error) {
        return { success: false, error: error.message, data: [] };
    }
};
