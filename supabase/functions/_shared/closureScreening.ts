// Closure text screening
// ======================
// "I found your missing daughter - transfer Rs 50,000 and I'll tell you where
// she is" is the attack this module exists to stop. Anyone can close a missing
// person case (responding is deliberately account-free), and closing one now
// sends the closure text to the reporter by SMS. That makes the closure form a
// delivery channel straight to a frightened family member, so the text has to
// be screened before it is stored or sent.
//
// Screening is deliberately plain pattern matching, not an AI call:
//   - it cannot be prompt-injected by the text it is screening,
//   - it is deterministic, so a flag can be explained to an administrator,
//   - it costs nothing and cannot time out on the critical path.
//
// A flag REJECTS the closure. The case stays Active and no SMS is sent - a
// false positive costs a responder one rewrite, while a false negative sends
// an extortion demand to someone whose child is missing.

export type FlagReason =
    | 'payment_demand'                      // money/bribe/ransom vocabulary
    | 'financial_credentials'               // bank, card, OTP, crypto details
    | 'money_amount'                        // "Rs 50,000", "LKR 20000"
    | 'off_platform_contact'                // phone/email/URL/messaging app in free text
    | 'personal_number_in_authority_contact'// mobile number passed off as an official desk
    | 'coercion'                            // conditional release, "don't tell police"

export interface ScreeningField {
    /** Field id, used to decide which rules apply. */
    key: 'resolved_by_name' | 'found_person_location' | 'authority_contact' | 'notes'
    value: string | null | undefined
}

export interface ScreeningResult {
    flagged: boolean
    /** Rule ids that fired - stored for administrators, never shown to the submitter. */
    reasons: FlagReason[]
    /** Field keys that tripped a rule, so the UI can highlight them. */
    fields: string[]
    /** Neutral, actionable guidance safe to show the submitter (leaks no rule detail). */
    guidance: string[]
}

// --- vocabulary ------------------------------------------------------------
// Kept to high-signal terms. A closure note describing a genuine rescue has no
// reason to contain any of these; "the hospital bill" style false positives are
// preferred over letting a demand through.

const PAYMENT_TERMS = [
    'bribe', 'bribery', 'ransom', 'kickback', 'hush money', 'blood money',
    'finders fee', "finder's fee", 'reward', 'compensation', 'service charge', 'handling charge',
    'processing fee', 'facilitation fee', 'my fee', 'my charges', 'my commission',
    'send money', 'transfer money', 'send cash', 'wire money', 'money first',
    'pay me', 'pay first', 'payment first', 'pay up', 'give me money', 'need money',
    'want money', 'cash only',
    // Deliberately absent: "some money", "small amount", "in cash". Each has an
    // ordinary use in a rescue note ("she had some money with her", "she drank a
    // small amount of water"), and the demand forms above already cover the
    // phrasings that matter.
    'western union', 'moneygram', 'ez cash', 'ezcash', 'mcash', 'frimi',
    'gift card', 'giftcard', 'google play card', 'voucher code', 'reload my',
    'top up my', 'topup my',
    // Sinhala / Tamil, native script and common romanisations
    'සල්ලි', 'මුදල්', 'අල්ලස', 'අල්ලසක්', 'ගෙවන්න',
    'பணம்', 'கைக்கூலி', 'லஞ்சம்',
    'salli', 'lanjaya', 'lanjam', 'allasa', 'kaikkuli',
]

const CREDENTIAL_TERMS = [
    'bank account', 'account number', 'account no', 'acc no', 'acct no',
    'card number', 'debit card', 'credit card', 'cvv', 'card pin',
    'otp', 'one time password', 'pin number', 'pin code',
    'ifsc', 'iban', 'swift code', 'routing number',
    'bitcoin', 'btc wallet', 'usdt', 'crypto', 'binance', 'ethereum',
    'paypal', 'upi id', 'payoneer', 'skrill',
]

const COERCION_TERMS = [
    'before i release', 'before releasing', 'will not release', 'wont release',
    "won't release", 'not release her', 'not release him', 'hand over only',
    'only after payment', 'only after you pay', 'once you pay', 'if you pay',
    'unless you pay', 'after payment', 'no money no', 'keep this quiet',
    'keep quiet', 'do not tell police', "don't tell police", 'dont tell police',
    'not tell the police', 'do not involve police', 'dont involve police',
    'without police', 'without the police', 'no police involved',
    'come alone', 'meet me alone',
    // Deliberately absent: bare "no police" - "there is no police station nearby"
    // is a normal thing to write when explaining why someone went to a hospital.
]

const MESSAGING_TERMS = [
    'whatsapp', 'wa.me', 'telegram', 'viber', 'imo', 'signal app',
    'messenger', 'facebook', 'instagram', 'tiktok', 'snapchat',
]

// --- patterns --------------------------------------------------------------

/** "Rs 5000", "rs.5,000", "LKR 20000", "$300", "5000 rupees". */
const MONEY_AMOUNT = /(?:\brs\b\.?|\blkr\b|\busd\b|₨|රු|ரூ|\$)\s*[\d,.]{3,}|\b[\d,]{3,}\s*(?:rupees|rupee|rs\b|lkr\b|dollars?)/i

/** Any Sri Lankan or international-looking phone number. */
const ANY_PHONE = /(?:\+\d{1,3}[\s-]?)?(?:\d[\s-]?){9,}/

/** Sri Lankan personal mobile: 07x / +947x / 947x. Official desks are 0xx landlines or short codes. */
const LK_MOBILE = /(?:\+94|94|0)\s*7\d(?:[\s-]?\d){7}/

const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i

const URL_LIKE = /https?:\/\/|www\.|\b[a-z0-9-]{2,}\.(?:com|net|org|lk|io|me|info|xyz|link)\b/i

// Terms an attacker may write with the spaces already removed ("sendmoney"). Only
// long, distinctive sequences belong here: this list is the one matched against
// text with whitespace stripped, so a short entry would collide across word
// boundaries. "ransom" is deliberately absent - it hides inside "ran somewhere".
const JOINED_PAYMENT_TERMS = [
    'sendmoney', 'sendcash', 'payfirst', 'paymefirst', 'moneyfirst', 'giftcard',
    'westernunion', 'moneygram',
]
const JOINED_CREDENTIAL_TERMS = [
    'bankaccount', 'accountnumber', 'cardnumber', 'onetimepassword',
]

// --- normalisation ---------------------------------------------------------

const LEET: Record<string, string> = {
    '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's',
}

/** Lowercase and undo simple character substitution, so "m0n3y" reads as "money". */
function normalise(text: string): string {
    return text.toLowerCase().replace(/[013457@$]/g, ch => LEET[ch] ?? ch)
}

/**
 * The forms of a field that term lists are tested against.
 *
 * Every variant preserves word boundaries. An earlier version stripped all
 * whitespace, which merged adjacent words and produced exactly the failure that
 * matters most here: "he got parents nearby" became "gotparents" and tripped the
 * `otp` rule, "she ran somewhere" became "ransomewhere" and tripped `ransom`. A
 * responder with genuine news was told their closure looked like extortion. So
 * de-obfuscation now only ever collapses characters *within* one token.
 */
function variantsOf(raw: string): string[] {
    const soft = normalise(raw)
    return [
        soft,
        // "b.r.i.b.e", "o.t.p", "pay-first" - punctuation dropped, spaces kept.
        soft.replace(/[^\p{L}\p{N}\s]/gu, ''),
        // "b r i b e" - a run of three or more lone letters, collapsed in place.
        soft.replace(/\b\p{L}(?:[\s._*-]+\p{L}){2,}\b/gu, run => run.replace(/[^\p{L}]/gu, '')),
    ]
}

/** Whitespace-free form, matched only against JOINED_TERMS. */
function joined(raw: string): string {
    return normalise(raw).replace(/[^\p{L}\p{N}]/gu, '')
}

type Matcher = string | RegExp

/**
 * Compile a term list once. ASCII terms become boundary-anchored regexes, so
 * "imo" no longer fires on "Simon" and "reward" no longer fires on "rewarding".
 * Sinhala and Tamil terms stay plain substrings - \b and \p{L} boundaries are
 * unreliable for those scripts, and they carry no English-word collision risk.
 */
function compileTerms(terms: string[]): Matcher[] {
    return terms.map(term => {
        if (!/^[\x20-\x7F]+$/.test(term)) return term
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'u')
    })
}

function matchesAny(haystacks: string[], matchers: Matcher[]): boolean {
    return matchers.some(matcher => haystacks.some(text =>
        typeof matcher === 'string' ? text.includes(matcher) : matcher.test(text)
    ))
}

const PAYMENT_MATCHERS = compileTerms(PAYMENT_TERMS)
const CREDENTIAL_MATCHERS = compileTerms(CREDENTIAL_TERMS)
const COERCION_MATCHERS = compileTerms(COERCION_TERMS)
const MESSAGING_MATCHERS = compileTerms(MESSAGING_TERMS)
// Not compiled: the whitespace-free form has no word boundaries left to anchor
// to, which is precisely why only long, distinctive terms are allowed in these
// two lists. They are matched as plain substrings.
const JOINED_PAYMENT_MATCHERS: Matcher[] = JOINED_PAYMENT_TERMS
const JOINED_CREDENTIAL_MATCHERS: Matcher[] = JOINED_CREDENTIAL_TERMS

// --- screening -------------------------------------------------------------

const GUIDANCE: Record<FlagReason, string> = {
    payment_demand:
        'Closure details must not mention money, payment, rewards or fees. No one is ever paid for reporting a person found, and nobody involved in this case will be asked to pay anything.',
    financial_credentials:
        'Closure details must not contain bank, card, OTP or wallet information.',
    money_amount:
        'Closure details must not contain money amounts.',
    off_platform_contact:
        'Do not include phone numbers, email addresses, links or messaging-app handles. The reporter is contacted through this platform only - personal contact details are never passed on.',
    personal_number_in_authority_contact:
        'The verification contact must be an official desk (police station, hospital or division office) and its official landline or hotline - not a personal mobile number.',
    coercion:
        'Closure details must not make the person\'s whereabouts or release conditional on anything.',
}

/**
 * Screen every free-text field submitted with a case closure.
 *
 * Rules by field:
 *  - all fields: payment vocabulary, credential vocabulary, money amounts, coercion.
 *  - resolved_by_name / found_person_location / notes: no phone numbers, emails,
 *    URLs or messaging handles at all - the reporter reaches people through the
 *    platform, so there is no legitimate reason to inject a contact route here.
 *  - authority_contact: a landline or hotline is expected and allowed, but a
 *    personal mobile number (07x) is not - that is the obvious way to smuggle
 *    "call me directly" past the other rules.
 */
export function screenClosureText(fields: ScreeningField[]): ScreeningResult {
    const reasons = new Set<FlagReason>()
    const flaggedFields = new Set<string>()

    for (const { key, value } of fields) {
        if (!value || !value.trim()) continue

        const raw = value
        const texts = variantsOf(raw)
        const spaceless = [joined(raw)]

        const hit = (reason: FlagReason) => { reasons.add(reason); flaggedFields.add(key) }

        if (matchesAny(texts, PAYMENT_MATCHERS) || matchesAny(spaceless, JOINED_PAYMENT_MATCHERS)) {
            hit('payment_demand')
        }
        if (matchesAny(texts, CREDENTIAL_MATCHERS) || matchesAny(spaceless, JOINED_CREDENTIAL_MATCHERS)) {
            hit('financial_credentials')
        }
        if (MONEY_AMOUNT.test(raw)) {
            hit('money_amount')
        }
        if (matchesAny(texts, COERCION_MATCHERS)) {
            hit('coercion')
        }

        if (key === 'authority_contact') {
            // An official hotline is fine here; a personal mobile is the tell.
            if (LK_MOBILE.test(raw.replace(/[()]/g, ''))) hit('personal_number_in_authority_contact')
            if (EMAIL.test(raw) || URL_LIKE.test(raw) || matchesAny(texts, MESSAGING_MATCHERS)) hit('off_platform_contact')
        } else {
            if (ANY_PHONE.test(raw.replace(/[()]/g, '')) || EMAIL.test(raw) || URL_LIKE.test(raw) || matchesAny(texts, MESSAGING_MATCHERS)) {
                hit('off_platform_contact')
            }
        }
    }

    const reasonList = [...reasons]
    return {
        flagged: reasonList.length > 0,
        reasons: reasonList,
        fields: [...flaggedFields],
        guidance: reasonList.map(reason => GUIDANCE[reason]),
    }
}
