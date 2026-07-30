// Outbound SMS
// ============
// sms-report/index.ts already receives inbound SMS from an Android SMS Gateway
// (sms-gate.app) webhook; this is the other direction, through the same
// gateway's 3rd-party send API. Nothing else in the project sent SMS before, so
// this is the one place that talks to the provider - callers deal in
// "send this text to this person" and never in HTTP.
//
// Two rules that matter for anything built on top of this:
//   1. The recipient's number is only ever handled server-side. A caller passes
//      a number it read with the service role; it is never returned to a
//      browser and never appears in a response body.
//   2. Send failures are non-fatal by contract. A closure SMS failing must not
//      roll back a case closure - the caller records the failure and moves on.

const DEFAULT_ENDPOINT = 'https://api.sms-gate.app/3rdparty/v1/message'

export type SmsStatus = 'sent' | 'failed' | 'no_recipient' | 'not_configured'

export interface SmsSendResult {
    status: SmsStatus
    providerMessageId: string | null
    error: string | null
    /** E.164 number the message was addressed to, for the audit log only. */
    normalisedPhone: string | null
}

/**
 * Normalise a Sri Lankan or international number to E.164.
 * Returns null when the input cannot be a dialable number - callers treat that
 * as "no recipient" rather than attempting a send.
 */
export function normalisePhone(raw: string | null | undefined): string | null {
    if (!raw) return null

    let digits = String(raw).replace(/[^\d+]/g, '')
    if (digits.startsWith('00')) digits = `+${digits.slice(2)}`

    if (!digits.startsWith('+')) {
        if (digits.startsWith('94') && digits.length === 11) {
            digits = `+${digits}`                      // 947XXXXXXXX
        } else if (digits.startsWith('0') && digits.length === 10) {
            digits = `+94${digits.slice(1)}`           // 07XXXXXXXX (local form)
        } else if (digits.length === 9) {
            digits = `+94${digits}`                    // 7XXXXXXXX (leading zero dropped)
        } else {
            return null
        }
    }

    return /^\+\d{9,15}$/.test(digits) ? digits : null
}

/**
 * Send one SMS. Never throws: every failure path comes back as a status the
 * caller can persist.
 */
export async function sendSms(rawPhone: string | null | undefined, body: string): Promise<SmsSendResult> {
    const phone = normalisePhone(rawPhone)
    if (!phone) {
        return { status: 'no_recipient', providerMessageId: null, error: 'No usable phone number on file', normalisedPhone: null }
    }

    const endpoint = Deno.env.get('SMS_GATEWAY_API_URL') || DEFAULT_ENDPOINT
    const username = Deno.env.get('SMS_GATEWAY_USERNAME')
    const password = Deno.env.get('SMS_GATEWAY_PASSWORD')

    if (!username || !password) {
        // Deployments without gateway credentials still work - the message is
        // recorded as not_configured so administrators can follow up by hand.
        console.warn('SMS gateway credentials not configured; message not sent')
        return { status: 'not_configured', providerMessageId: null, error: 'SMS gateway credentials not configured', normalisedPhone: phone }
    }

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Basic ${btoa(`${username}:${password}`)}`,
            },
            body: JSON.stringify({ message: body, phoneNumbers: [phone] }),
        })

        const text = await response.text()

        if (!response.ok) {
            return {
                status: 'failed',
                providerMessageId: null,
                error: `Gateway responded ${response.status}: ${text.slice(0, 200)}`,
                normalisedPhone: phone,
            }
        }

        let providerMessageId: string | null = null
        try {
            providerMessageId = (JSON.parse(text) as { id?: string })?.id ?? null
        } catch {
            // Gateway accepted it but returned something other than JSON.
        }

        return { status: 'sent', providerMessageId, error: null, normalisedPhone: phone }
    } catch (error) {
        return {
            status: 'failed',
            providerMessageId: null,
            error: error instanceof Error ? error.message : String(error),
            normalisedPhone: phone,
        }
    }
}

export interface OutboundSmsLogEntry {
    relatedTable: string
    relatedId: string | null
    template: string
    recipientPhone: string
    messageBody: string
    result: SmsSendResult
}

/** Record what was sent (or why it was not). Best-effort - never blocks the caller. */
// deno-lint-ignore no-explicit-any
export async function logOutboundSms(supabase: any, entry: OutboundSmsLogEntry): Promise<void> {
    try {
        await supabase.from('outbound_sms_log').insert({
            related_table: entry.relatedTable,
            related_id: entry.relatedId,
            template: entry.template,
            recipient_phone: entry.result.normalisedPhone || entry.recipientPhone || 'unknown',
            message_body: entry.messageBody,
            status: entry.result.status,
            provider_message_id: entry.result.providerMessageId,
            error_message: entry.result.error,
        })
    } catch (error) {
        console.error('outbound_sms_log insert failed:', error)
    }
}
