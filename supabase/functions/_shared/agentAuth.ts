// Shared auth for every AI/OR agent edge function. Two paths:
//  1. Admin JWT (Authorization: Bearer <user token>) -> verified via
//     supabaseAdmin.auth.getUser(token), then checked against admin_users
//     (is_active=true) - exactly the pattern already used by
//     secure-admin-delete/camp-management. Used by the manual "Run AI
//     Analysis" button.
//  2. Cron secret (x-agent-cron-secret header) -> constant-time compared
//     against the AGENT_CRON_SECRET edge function secret, mirroring the HMAC
//     verification style already used in sms-report/index.ts. Used by the
//     unattended scheduled trigger (GitHub Actions), which has no user session.
// Reject with neither path succeeding.

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

export type AgentAuthResult =
    | { ok: true; source: 'manual' | 'api'; userId: string }
    | { ok: true; source: 'cron'; userId: null }
    | { ok: false; reason: string };

function constantTimeEquals(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

export async function authenticateAgentCaller(
    req: Request,
    supabaseAdmin: SupabaseClient
): Promise<AgentAuthResult> {
    const cronSecretHeader = req.headers.get('x-agent-cron-secret');
    const expectedCronSecret = Deno.env.get('AGENT_CRON_SECRET');

    if (cronSecretHeader && expectedCronSecret && constantTimeEquals(cronSecretHeader, expectedCronSecret)) {
        return { ok: true, source: 'cron', userId: null };
    }

    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !user) {
            return { ok: false, reason: 'Invalid or expired token' };
        }

        const { data: adminUser, error: adminError } = await supabaseAdmin
            .from('admin_users')
            .select('id, is_active')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .single();

        if (adminError || !adminUser) {
            return { ok: false, reason: 'Unauthorized: not an active admin' };
        }

        return { ok: true, source: 'manual', userId: user.id };
    }

    return { ok: false, reason: 'Missing authorization: provide an admin Bearer token or x-agent-cron-secret header' };
}
