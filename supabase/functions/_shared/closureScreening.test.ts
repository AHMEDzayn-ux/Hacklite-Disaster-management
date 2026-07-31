// Regression suite for the case-closure screener.
//
//   deno test supabase/functions/_shared/closureScreening.test.ts
//
// Run this after ANY change to a term list. The screener sits between a
// responder and a family waiting for news, and it fails in two directions that
// are both harmful:
//
//   - a miss delivers an extortion demand to someone whose relative is missing;
//   - a false positive tells a responder with genuine news that their closure
//     looks like extortion, and the family hears nothing.
//
// The MUST_PASS block exists because the second kind actually happened: an
// earlier version matched substrings against the text with all whitespace
// removed, so "he got parents nearby" became "gotparents" and tripped `otp`,
// and "she ran somewhere" became "ransomewhere" and tripped `ransom`.

import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { screenClosureText } from './closureScreening.ts'
import type { FlagReason, ScreeningField } from './closureScreening.ts'

const notes = (value: string): ScreeningField[] => [{ key: 'notes', value }]
const field = (key: ScreeningField['key'], value: string): ScreeningField[] => [{ key, value }]

/** Ordinary closure text. Every one of these must be allowed through. */
const MUST_PASS: Array<[string, ScreeningField[]]> = [
    // Word-merge regressions - these are the ones that were broken.
    ['"got parents" must not read as otp', notes('He got parents nearby who came for him')],
    ['"ran somewhere" must not read as ransom', notes('She ran somewhere near the canal and a farmer found her')],
    ['a responder named Simon is not an imo handle', field('resolved_by_name', 'Simon Rajapakse')],

    // Boundary regressions.
    ['"rewarding" is not "reward"', notes('It was rewarding to see the family together again')],
    ['"cashew" is not "in cash"', field('found_person_location', 'A cashew estate off the Puttalam road')],
    ['"cryptography" is not "crypto"', notes('Her father works in cryptography at the university')],

    // Phrases deliberately kept out of the term lists.
    ['no police station nearby', notes('There is no police station nearby so we went to the hospital')],
    ['a small amount of water', notes('She drank a small amount of water and rested')],
    ['she had some money with her', notes('She had some money and her ID card with her')],
    ['fare paid in cash', notes('The bus fare was paid in cash by a neighbour')],

    // Full realistic closures.
    ['hospital closure', [
        { key: 'resolved_by_name', value: 'Nimal Perera' },
        { key: 'found_person_location', value: 'Teaching Hospital Kandy, ward 4' },
        { key: 'authority_contact', value: 'Kandy Police Station, 081-2222222' },
        { key: 'notes', value: 'Found near the river bank at about 4pm and walked to the hospital with neighbours. Her son is with her now.' },
    ]],
    ['camp closure', [
        { key: 'found_person_location', value: 'Relief camp at Mahiyanganaya Maha Vidyalaya' },
        { key: 'authority_contact', value: 'Camp registration desk, 1990' },
        { key: 'notes', value: 'Registered at the camp two days ago. Safe and eating well.' },
    ]],
    ['deceased, careful wording', [
        { key: 'found_person_location', value: 'Base Hospital Matara mortuary' },
        { key: 'authority_contact', value: 'Matara Base Hospital, 041-2222261' },
        { key: 'notes', value: 'Identified this morning. Please come to the hospital administration counter.' },
    ]],
    ['official landline is allowed', field('authority_contact', 'Colombo North Divisional Secretariat, 011-2911111')],
    ['short hotline is allowed', field('authority_contact', 'Police emergency 119')],
    ['house number in an address', field('found_person_location', "No 105/3, Temple Road, Gampaha - her sister's house")],
    ['empty fields', [{ key: 'authority_contact', value: '' }, { key: 'notes', value: null }]],
]

/** Extortion and off-platform-contact attempts. Every one must be flagged. */
const MUST_FLAG: Array<[string, ScreeningField[], FlagReason]> = [
    ['plain bribe', notes('I want a bribe for this'), 'payment_demand'],
    ['plain ransom', notes('consider this a ransom'), 'payment_demand'],
    ['reward demand', notes('I expect a reward for finding her'), 'payment_demand'],
    ['compensation demand', notes('need some compensation for my time'), 'payment_demand'],
    ['gift card', notes('buy me a google play card'), 'payment_demand'],
    ['money amount', notes('Rs 50,000 and I will bring her'), 'money_amount'],
    ['bank details', notes('deposit to my bank account first'), 'financial_credentials'],
    ['otp', notes('tell me the OTP you receive'), 'financial_credentials'],
    ['crypto', notes('pay in usdt and she is yours'), 'financial_credentials'],
    ['conditional release', notes('not releasing her unless you pay'), 'coercion'],
    ['avoid police', notes('she is fine, come alone, do not tell police'), 'coercion'],
    ['sinhala money demand', notes('ඇය මා සමඟ ඇත, සල්ලි එවන්න'), 'payment_demand'],
    ['tamil bribe demand', notes('அவள் பாதுகாப்பாக உள்ளார், கைக்கூலி வேண்டும்'), 'payment_demand'],

    // Obfuscation.
    ['leet money', notes('send m0n3y first'), 'payment_demand'],
    ['leet send', notes('5end money and I will bring her'), 'payment_demand'],
    ['spaced letters', notes('a small b r i b e will fix this'), 'payment_demand'],
    ['dotted letters', notes('just a b.r.i.b.e for me'), 'payment_demand'],
    ['dotted otp', notes('share the o.t.p you get'), 'financial_credentials'],
    ['hyphenated', notes('pay-first then I bring her'), 'payment_demand'],
    ['whitespace stripped', notes('sendmoney and she is yours'), 'payment_demand'],
    ['whitespace stripped credential', notes('my bankaccount is ready'), 'financial_credentials'],

    // Off-platform contact routes.
    ['phone in notes', notes('Call me on 0771234567 for details'), 'off_platform_contact'],
    ['phone in location', field('found_person_location', 'with me, ring 077 123 4567'), 'off_platform_contact'],
    ['email', notes('mail me at finder@gmail.com'), 'off_platform_contact'],
    ['url', notes('see wa.me/94771234567'), 'off_platform_contact'],
    ['messaging app', notes('message me on whatsapp'), 'off_platform_contact'],
    ['personal mobile as official desk', field('authority_contact', 'Kandy Police, 0712345678'), 'personal_number_in_authority_contact'],
]

Deno.test('genuine closure text is never flagged', () => {
    for (const [label, fields] of MUST_PASS) {
        const result = screenClosureText(fields)
        assertEquals(result.flagged, false, `${label} -> unexpectedly flagged as ${result.reasons.join(', ')}`)
    }
})

Deno.test('extortion and off-platform contact are flagged with the right reason', () => {
    for (const [label, fields, expectedReason] of MUST_FLAG) {
        const result = screenClosureText(fields)
        assertEquals(result.flagged, true, `${label} -> was NOT flagged`)
        assertEquals(
            result.reasons.includes(expectedReason),
            true,
            `${label} -> expected ${expectedReason}, got ${result.reasons.join(', ')}`,
        )
    }
})

Deno.test('a flag reports the offending field and actionable guidance', () => {
    const result = screenClosureText([
        { key: 'resolved_by_name', value: 'Nimal Perera' },
        { key: 'notes', value: 'send money first' },
    ])
    assertEquals(result.flagged, true)
    assertEquals(result.fields, ['notes'])
    assertEquals(result.guidance.length > 0, true)
})
