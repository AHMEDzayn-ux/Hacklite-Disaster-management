// Resolve a missing person case
// ==============================
// The only path that may close a missing person case and tell the reporter.
//
// Why this is a server function rather than a table update from the browser:
//
//   1. The reporter's phone number stays server-side. The function reads it
//      with the service role, sends the SMS itself, and returns nothing that
//      identifies the reporter. No responder screen ever holds that number, so
//      "found her, call me on my mobile and we'll discuss" has no channel.
//   2. Closure text is screened for payment demands and off-platform contact
//      details before anything is written or sent (_shared/closureScreening.ts).
//      A flagged closure does NOT close the case - a bad actor must not be able
//      to shut down a live search - it is parked in flagged_closure_attempts for
//      an administrator.
//   3. Closure is structured. The reporter needs to know where the person is,
//      what condition they are in, and which official desk can confirm it -
//      not one free-text sentence. Those fields are what the SMS is built from.
//
// Note that RLS still permits an anonymous direct UPDATE on missing_persons, so
// this is not a hard write boundary; it is the boundary on the thing an
// extortionist actually wants, which is reaching the reporter. Sending is only
// possible here, and only after screening.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { screenClosureText } from '../_shared/closureScreening.ts'
import { sendSms, logOutboundSms, normalisePhone } from '../_shared/smsSender.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(status: number, body: unknown) {
    return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

const SMS_TEMPLATE = 'missing_person_resolved'

/** Condition values accepted by missing_persons_found_condition_check, with SMS wording. */
const CONDITIONS: Record<string, string> = {
    safe: 'Found safe and unharmed',
    injured_treated: 'Injured, receiving treatment',
    hospitalised: 'Admitted to hospital',
    in_official_care: 'In the care of officials',
    deceased: 'Deceased',
}

// Field caps. These bound the SMS as well as the stored record - an
// unbounded note becomes a 12-segment message to someone who may be paying
// per message to receive it.
const LIMITS = {
    resolved_by_name: 80,
    found_person_location: 160,
    authority_contact: 120,
    notes: 300,
}

// The fixed part of the message (headers + safety paragraph + verification link)
// is already ~500 characters, so this has to leave real room for the responder's
// note or the note gets trimmed away every time. ~900 caps a worst-case closure
// at six SMS segments.
const MAX_SMS_CHARS = 900

interface RequestBody {
    case_id?: string
    resolved_by_name?: string
    resolver_contact?: string | null
    found_person_location?: string
    found_person_condition?: string
    authority_contact?: string | null
    notes?: string | null
}

const clean = (value: unknown): string =>
    typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''

/**
 * Build the reporter's SMS.
 *
 * The safety paragraph is not boilerplate - it is the point. The reporter is
 * getting an unverified claim about a missing relative from a stranger, which
 * is exactly the moment they are most likely to hand money to whoever asks. So
 * the message states plainly that it is machine-generated, that no payment is
 * ever part of this process, and that the only place to verify or escalate is
 * the platform itself.
 */
function buildReporterSms(params: {
    caseId: string
    personName: string
    resolvedByName: string
    location: string
    conditionLabel: string
    authorityContact: string
    notes: string
    brand: string
    siteUrl: string
}): string {
    const ref = params.caseId.slice(0, 8).toUpperCase()
    const lines = [
        `${params.brand} - AUTOMATED UPDATE (do not reply)`,
        `Case #${ref}: ${params.personName} has been reported FOUND.`,
        `Condition: ${params.conditionLabel}`,
        `Where: ${params.location}`,
        `Closed by: ${params.resolvedByName}`,
    ]
    if (params.authorityContact) lines.push(`Verify with: ${params.authorityContact}`)

    const safety =
        'Automated message from an unverified public report. No payment is ever part of this process - never send ' +
        'money, bank or card details, OTP codes or gift cards to anyone claiming to have found this person. ' +
        `Verify this update, or report anyone demanding money, at ${params.siteUrl}/missing-persons/${params.caseId}`

    // The safety paragraph and the whereabouts are never what gets cut: whatever
    // budget is left after them is what the free-text note may use.
    const withoutNote = `${lines.join('\n')}\n\n${safety}`
    if (!params.notes) return withoutNote

    const budget = MAX_SMS_CHARS - withoutNote.length - '\nNote: '.length
    if (budget < 40) return withoutNote  // no room worth using

    const note = params.notes.length <= budget
        ? params.notes
        : `${params.notes.slice(0, budget - 1).trimEnd()}…`

    return `${[...lines, `Note: ${note}`].join('\n')}\n\n${safety}`
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
    if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceKey) return json(500, { error: 'Server not configured' })

    const supabase = createClient(supabaseUrl, serviceKey)

    const brand = Deno.env.get('PUBLIC_BRAND_NAME') || 'Disaster Management LK'
    const siteUrl = (Deno.env.get('PUBLIC_SITE_URL') || 'https://disaster-management.lk').replace(/\/+$/, '')

    let body: RequestBody
    try {
        body = await req.json()
    } catch {
        return json(400, { error: 'Invalid JSON body' })
    }

    // --- validate ----------------------------------------------------------
    const caseId = clean(body.case_id)
    const resolvedByName = clean(body.resolved_by_name)
    const location = clean(body.found_person_location)
    const condition = clean(body.found_person_condition)
    const authorityContact = clean(body.authority_contact)
    const notes = clean(body.notes)
    const resolverContact = clean(body.resolver_contact)

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(caseId)) {
        return json(400, { error: 'A valid case id is required' })
    }
    if (resolvedByName.length < 2) return json(400, { error: 'Your name is required so the reporter knows who closed the case' })
    if (location.length < 3) return json(400, { error: 'Where the person is now is required - this is the update the reporter needs most' })
    if (!CONDITIONS[condition]) return json(400, { error: 'A valid condition is required' })

    const submitted: Array<[keyof typeof LIMITS, string]> = [
        ['resolved_by_name', resolvedByName],
        ['found_person_location', location],
        ['authority_contact', authorityContact],
        ['notes', notes],
    ]
    const tooLong = submitted.find(([key, value]) => value.length > LIMITS[key])
    if (tooLong) {
        return json(400, { error: `${tooLong[0].replace(/_/g, ' ')} must be ${LIMITS[tooLong[0]]} characters or fewer` })
    }

    // --- load the case -----------------------------------------------------
    // Before screening, so that a flagged attempt always references a real, open
    // case and an administrator is never handed a review item about nothing.
    const { data: person, error: fetchError } = await supabase
        .from('missing_persons')
        // Only what is needed: the case state, the person's name for the message,
        // and the number to send to. The reporter's name is not read at all.
        .select('id, name, status, contact_number, sms_sender_phone, found_at')
        .eq('id', caseId)
        .maybeSingle()

    if (fetchError) {
        console.error('Case lookup failed:', fetchError)
        return json(500, { error: 'Could not load the case' })
    }
    if (!person) return json(404, { error: 'Case not found' })
    if (person.status !== 'Active') {
        return json(409, { error: 'This case has already been closed', code: 'already_resolved' })
    }

    // --- screen ------------------------------------------------------------
    const screening = screenClosureText([
        { key: 'resolved_by_name', value: resolvedByName },
        { key: 'found_person_location', value: location },
        { key: 'authority_contact', value: authorityContact },
        { key: 'notes', value: notes },
    ])

    if (screening.flagged) {
        // Park the attempt with its full text - that text is the evidence - and
        // leave the case Active. The submitter gets category-level guidance so a
        // genuine responder can rewrite, but never the rule that matched.
        try {
            await supabase.from('flagged_closure_attempts').insert({
                related_table: 'missing_persons',
                related_id: caseId,
                submitted_by_name: resolvedByName.slice(0, 120),
                submitted_contact: resolverContact ? normalisePhone(resolverContact) || resolverContact.slice(0, 40) : null,
                payload: {
                    resolved_by_name: resolvedByName,
                    found_person_location: location,
                    found_person_condition: condition,
                    authority_contact: authorityContact,
                    notes,
                    resolver_contact: resolverContact || null,
                },
                flag_reasons: screening.reasons,
            })
        } catch (error) {
            console.error('flagged_closure_attempts insert failed:', error)
        }

        console.warn(`Closure for case ${caseId} rejected by screener: ${screening.reasons.join(', ')}`)

        return json(422, {
            error: 'This closure could not be submitted.',
            code: 'closure_flagged',
            guidance: screening.guidance,
            fields: screening.fields,
            review: 'The submission has been recorded for review by a coordinator. The case remains open.',
        })
    }

    // --- close it ----------------------------------------------------------
    const foundAt = new Date().toISOString()
    const updates: Record<string, unknown> = {
        status: 'Resolved',
        found_at: foundAt,
        resolved_by_name: resolvedByName,
        found_person_location: location,
        found_person_condition: condition,
        authority_contact: authorityContact || null,
        found_notes: notes || null,
        found_by_contact: resolverContact ? normalisePhone(resolverContact) || resolverContact : null,
        updated_at: foundAt,
    }

    // Compare-and-swap on status: two responders hitting "Mark Found" at the same
    // moment must not both get through, or the family gets the news twice from
    // two different strangers.
    const { data: closed, error: updateError } = await supabase
        .from('missing_persons')
        .update(updates)
        .eq('id', caseId)
        .eq('status', 'Active')
        .select('id')

    if (updateError) {
        console.error('Case closure update failed:', updateError)
        return json(500, { error: 'Could not close the case' })
    }
    if (!closed || closed.length === 0) {
        return json(409, { error: 'This case has already been closed', code: 'already_resolved' })
    }

    // --- notify the reporter ----------------------------------------------
    // Past this point the case IS closed. A notification failure is recorded,
    // never surfaced as a closure failure - otherwise a responder retries and
    // hits "already closed".
    const message = buildReporterSms({
        caseId,
        personName: person.name || 'The reported person',
        resolvedByName,
        location,
        conditionLabel: CONDITIONS[condition],
        authorityContact,
        notes,
        brand,
        siteUrl,
    })

    // Cases that arrived through the SMS gateway may only carry the sender's
    // number, so fall back to it rather than dropping the notification.
    const reporterPhone = person.contact_number || person.sms_sender_phone || null
    const sendResult = await sendSms(reporterPhone, message)

    await logOutboundSms(supabase, {
        relatedTable: 'missing_persons',
        relatedId: caseId,
        template: SMS_TEMPLATE,
        recipientPhone: reporterPhone || '',
        messageBody: message,
        result: sendResult,
    })

    const { error: notifyStampError } = await supabase
        .from('missing_persons')
        .update({
            reporter_notification_status: sendResult.status,
            reporter_notified_at: sendResult.status === 'sent' ? new Date().toISOString() : null,
        })
        .eq('id', caseId)
    if (notifyStampError) console.error('Notification status update failed:', notifyStampError)

    if (sendResult.status !== 'sent') {
        console.warn(`Reporter notification for case ${caseId}: ${sendResult.status} - ${sendResult.error}`)
    }

    // Deliberately no reporter name, phone, or message body in the response:
    // whoever closed the case has no need for any of it.
    return json(200, {
        success: true,
        case_id: caseId,
        found_at: foundAt,
        resolution: {
            resolved_by_name: resolvedByName,
            found_person_location: location,
            found_person_condition: condition,
            authority_contact: authorityContact || null,
            found_notes: notes || null,
        },
        notification: {
            // 'sent' | 'not_sent' only - the reason is server-side detail.
            status: sendResult.status === 'sent' ? 'sent' : 'not_sent',
        },
    })
})
