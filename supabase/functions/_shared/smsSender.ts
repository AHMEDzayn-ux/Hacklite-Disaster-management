// Outbound SMS (TextBee)
// ======================
// sms-report/index.ts receives inbound SMS from the Android gateway app's
// webhook; this is the other direction, through TextBee's send API. Nothing else
// in the project sent SMS before, so this is the one place that talks to the
// provider - callers deal in "send this text to this person", never in HTTP.
//
// Two rules that matter for anything built on top of this:
//   1. The recipient's number is only ever handled server-side. A caller passes
//      a number it read with the service role; it is never returned to a
//      browser and never appears in a response body.
//   2. Send failures are non-fatal by contract. A closure SMS failing must not
//      roll back a case closure - the caller records the failure and moves on.
//
// TextBee needs BOTH a key and a device id, and they are both UUIDs - it is easy
// to set one to the other's value. That mistake surfaces as a 401/404 from the
// provider, recorded as a `failed` row in outbound_sms_log, not as a crash.

const DEFAULT_API_BASE = 'https://api.textbee.dev/api/v1'

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

    const apiBase = (Deno.env.get('TEXTBEE_API_BASE') || DEFAULT_API_BASE).replace(/\/+$/, '')
    const apiKey = Deno.env.get('TEXTBEE_API_KEY')
    const deviceId = Deno.env.get('TEXTBEE_DEVICE_ID')

    if (!apiKey || !deviceId) {
        // Deployments without gateway credentials still work - the message is
        // recorded as not_configured so administrators can follow up by hand.
        const missing = [!apiKey && 'TEXTBEE_API_KEY', !deviceId && 'TEXTBEE_DEVICE_ID'].filter(Boolean).join(' and ')
        console.warn(`SMS gateway not configured (${missing} unset); message not sent`)
        return { status: 'not_configured', providerMessageId: null, error: `${missing} not configured`, normalisedPhone: phone }
    }

    try {
        const response = await fetch(`${apiBase}/gateway/devices/${deviceId}/send-sms`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
            },
            body: JSON.stringify({ recipients: [phone], message: body }),
        })

        const text = await response.text()

        if (!response.ok) {
            // 401 means the key is wrong; 404 usually means the device id is wrong
            // (or the two UUIDs were swapped). Keep the provider's own words - they
            // are what an administrator needs to fix it.
            return {
                status: 'failed',
                providerMessageId: null,
                error: `TextBee responded ${response.status}: ${text.slice(0, 200)}`,
                normalisedPhone: phone,
            }
        }

        // TextBee wraps its result in { data: ... }. The id field has moved around
        // between versions, so treat every shape as optional rather than assuming.
        let providerMessageId: string | null = null
        try {
            const parsed = JSON.parse(text) as {
                data?: { _id?: string; id?: string; smsBatchId?: string }
                _id?: string
                id?: string
            }
            providerMessageId = parsed?.data?.smsBatchId ?? parsed?.data?._id ?? parsed?.data?.id
                ?? parsed?._id ?? parsed?.id ?? null
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
