import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/features/auth/ThemeContext';
import { useDonationStore } from '@/store/supabaseStore';
import { resolveImpact } from '@/features/donations/impact';
import { IconShieldCheck, IconHeart, IconCheck } from '@/components/icons/Icons';

const PRESET_AMOUNTS = [500, 1000, 2500, 5000, 10000, 25000]; // LKR amounts

const CURRENCIES = [
    { code: 'LKR', symbol: 'Rs.', label: 'Sri Lankan Rupee', flag: '🇱🇰' },
    { code: 'USD', symbol: '$', label: 'US Dollar', flag: '🇺🇸' },
    { code: 'EUR', symbol: '€', label: 'Euro', flag: '🇪🇺' },
    { code: 'GBP', symbol: '£', label: 'British Pound', flag: '🇬🇧' },
];

const DONATION_PURPOSES = [
    { value: 'general', label: 'General Relief Fund', category: 'general' },
    { value: 'flood', label: 'Flood Relief Operations', category: 'disaster' },
    { value: 'cyclone', label: 'Cyclone Recovery', category: 'disaster' },
    { value: 'earthquake', label: 'Earthquake Relief', category: 'disaster' },
    { value: 'camp', label: 'Relief Camp Support', category: 'camp' },
    { value: 'food', label: 'Food & Water Supplies', category: 'general' },
    { value: 'medical', label: 'Medical Supplies', category: 'general' },
    { value: 'shelter', label: 'Temporary Shelter Setup', category: 'general' },
];

const STEPS = [
    { n: 1, label: 'Amount' },
    { n: 2, label: 'Your details' },
    { n: 3, label: 'Payment' },
];

const FIELD_LABEL = 'mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400';
const FIELD = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500';
const BTN_PRIMARY = 'inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border-2 border-slate-900 bg-white px-4 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-900 hover:text-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 dark:border-white dark:bg-transparent dark:text-white dark:hover:bg-white dark:hover:text-slate-900 dark:disabled:border-white/10 dark:disabled:bg-white/5 dark:disabled:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1';
const BTN_BACK = 'inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10';

function DonationForm({ onSuccess }) {
    const stripe = useStripe();
    const elements = useElements();
    const { theme } = useTheme();
    const { donations } = useDonationStore();

    const [selectedAmount, setSelectedAmount] = useState(5000); // Default LKR 5000
    const [customAmount, setCustomAmount] = useState('');
    const [selectedCurrency, setSelectedCurrency] = useState('LKR');
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentError, setPaymentError] = useState(null);
    const [step, setStep] = useState(1); // 1: Amount, 2: Info, 3: Payment

    const { register, handleSubmit, formState: { errors }, watch, setValue, trigger } = useForm({
        mode: 'onTouched',
        defaultValues: {
            donor_name: '',
            donor_email: '',
            donor_phone: '',
            is_anonymous: false,
            donation_purpose: 'general',
            message: ''
        }
    });

    const isAnonymous = watch('is_anonymous');

    // Anchor the choice on what donors actually give, not an invented figure.
    // Falls back to the default preset until there is enough data to mean
    // anything, in which case it is labelled as a suggestion instead.
    const popularAmount = useMemo(() => {
        const counts = new Map();
        donations
            .filter(d => d.stripe_payment_status === 'succeeded' && d.currency === 'LKR')
            .forEach(d => {
                const amt = Math.round(parseFloat(d.amount) || 0);
                if (PRESET_AMOUNTS.includes(amt)) counts.set(amt, (counts.get(amt) || 0) + 1);
            });
        const total = [...counts.values()].reduce((a, b) => a + b, 0);
        if (total < 5) return { amount: 5000, evidenced: false };
        const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
        return { amount: top[0], evidenced: true };
    }, [donations]);

    const autofillTestData = () => {
        setSelectedAmount(2500);
        setCustomAmount('');
        setValue('donor_name', 'Kasun Jayasuriya');
        setValue('donor_email', 'kasun.test@example.com');
        setValue('donor_phone', '0771234567');
        setValue('donation_purpose', 'flood');
        setValue('message', 'Hoping this helps get supplies out quickly.');
    };

    const getCurrencySymbol = () => {
        const currency = CURRENCIES.find(c => c.code === selectedCurrency);
        return currency ? currency.symbol : 'Rs.';
    };

    const getFinalAmount = () => (customAmount ? parseFloat(customAmount) : selectedAmount) || 0;

    const impact = resolveImpact(getFinalAmount(), selectedCurrency);
    const formattedAmount = `${getCurrencySymbol()}${getFinalAmount().toLocaleString()}`;

    const handleAmountSelect = (amount) => {
        setSelectedAmount(amount);
        setCustomAmount('');
    };

    const handleCustomAmountChange = (e) => {
        const value = e.target.value;
        if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
            setCustomAmount(value);
            setSelectedAmount(null);
        }
    };

    const onSubmit = async (formData) => {
        if (!stripe || !elements) {
            setPaymentError('Payment system not loaded. Please refresh the page.');
            return;
        }

        const finalAmount = getFinalAmount();
        if (!finalAmount || finalAmount < 1) {
            setPaymentError(`Please enter a valid donation amount (minimum ${getCurrencySymbol()}1)`);
            return;
        }

        setIsProcessing(true);
        setPaymentError(null);

        try {
            const purposeData = DONATION_PURPOSES.find(p => p.value === formData.donation_purpose);

            // Step 1: Create the Stripe PaymentIntent server-side. This also
            // inserts the donations row as 'pending' - the browser never
            // writes to the donations table directly (RLS blocks it anyway).
            const { data, error: intentError } = await supabase.functions.invoke('create-payment-intent', {
                body: {
                    amount: finalAmount,
                    currency: selectedCurrency.toLowerCase(),
                    donor_name: formData.donor_name,
                    donor_email: formData.donor_email,
                    donor_phone: formData.donor_phone,
                    is_anonymous: formData.is_anonymous,
                    donation_purpose: purposeData.label,
                    purpose_category: purposeData.category,
                    message: formData.message,
                }
            });

            if (intentError) throw new Error(intentError.message || 'Failed to initialize payment');
            if (data?.error) throw new Error(data.error);

            const { clientSecret } = data;

            // Step 2: Confirm payment with Stripe. The webhook (server-side)
            // is what actually flips stripe_payment_status to succeeded/failed
            // - this UI reflects Stripe's immediate response for feedback only.
            const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
                clientSecret,
                {
                    payment_method: {
                        card: elements.getElement(CardElement),
                        billing_details: {
                            name: formData.is_anonymous ? 'Anonymous' : formData.donor_name,
                            email: formData.donor_email,
                            phone: formData.donor_phone || undefined,
                        }
                    }
                }
            );

            if (stripeError) {
                throw new Error(stripeError.message);
            }

            if (onSuccess) {
                onSuccess({ amount: finalAmount, currency: selectedCurrency, status: paymentIntent.status });
            }

            // Reset form
            setStep(1);
            setSelectedAmount(5000);
            setCustomAmount('');
            setSelectedCurrency('LKR');

        } catch (error) {
            console.error('Donation error:', error);
            setPaymentError(error.message || 'Payment failed. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    /**
     * Gate step 2 on the fields the payment actually requires. Without this a
     * donor can reach the card form with no name or email, then hit Donate and
     * watch nothing happen: react-hook-form blocks the submit and renders its
     * errors back on step 2, which is no longer on screen.
     */
    const goToPayment = async () => {
        const fields = isAnonymous ? ['donor_email'] : ['donor_name', 'donor_email'];
        if (await trigger(fields)) setStep(3);
    };

    const handleFormSubmit = (e) => {
        if (step === 1) {
            e.preventDefault();
            if (getFinalAmount() < 1) return;
            setStep(2);
            return;
        }
        if (step === 2) {
            e.preventDefault();
            goToPayment();
            return;
        }
        handleSubmit(onSubmit)(e);
    };

    const renderStep1 = () => (
        <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Choose your contribution</h3>
            <p className="mb-3 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Every amount is put to work in the current relief operation.
            </p>

            <div className="mb-3 grid grid-cols-3 gap-2">
                {PRESET_AMOUNTS.map((amount) => {
                    const active = selectedAmount === amount && !customAmount;
                    const flagged = amount === popularAmount.amount;
                    return (
                        <button
                            key={amount}
                            type="button"
                            onClick={() => handleAmountSelect(amount)}
                            aria-pressed={active}
                            className={`relative h-12 rounded-md border-2 text-sm font-bold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 ${active
                                ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                                : 'border-slate-200 bg-white text-slate-800 hover:border-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-white/30'
                                }`}
                        >
                            {getCurrencySymbol()}{amount.toLocaleString()}
                            {flagged && (
                                <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded border border-success-200 bg-success-50 px-1.5 text-[10px] font-bold uppercase tracking-wide text-success-700 dark:border-success-500/40 dark:bg-success-900 dark:text-success-200">
                                    {popularAmount.evidenced ? 'Most chosen' : 'Suggested'}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="mb-3">
                <label htmlFor="custom-amount" className={FIELD_LABEL}>Or enter another amount</label>
                <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">{getCurrencySymbol()}</span>
                    <input
                        id="custom-amount"
                        type="text"
                        inputMode="decimal"
                        value={customAmount}
                        onChange={handleCustomAmountChange}
                        placeholder="0.00"
                        className={`${FIELD} pl-10`}
                    />
                </div>
            </div>

            {/* One concrete outcome beats a list of ticks — it is what the donor
                carries to the confirm button. */}
            {impact && (
                <div className="mb-4 flex items-start gap-2.5 rounded-md border border-success-200 bg-success-50 p-3 dark:border-success-500/30 dark:bg-success-500/10">
                    <IconHeart className="mt-0.5 h-4 w-4 flex-shrink-0 text-success-700 dark:text-success-300" />
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-success-800 dark:text-success-300">
                            {formattedAmount} provides
                        </p>
                        <p className="mt-0.5 text-sm font-semibold leading-snug text-success-900 dark:text-success-100">
                            {impact.headline}
                        </p>
                    </div>
                </div>
            )}

            <button type="submit" disabled={getFinalAmount() < 1} className={BTN_PRIMARY}>
                Continue
            </button>
        </div>
    );

    const renderStep2 = () => (
        <div>
            <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">Your details</h3>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        We use these to send your receipt and record the gift in the public ledger.
                    </p>
                </div>
                {import.meta.env.DEV && (
                    <button
                        type="button"
                        onClick={autofillTestData}
                        className="flex-shrink-0 rounded border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/10"
                    >
                        Test fill
                    </button>
                )}
            </div>

            <label className="mb-3 flex cursor-pointer items-center gap-2">
                <input type="checkbox" {...register('is_anonymous')} className="h-4 w-4 accent-primary-600" />
                <span className="text-sm text-slate-700 dark:text-slate-300">Publish this donation anonymously</span>
            </label>

            {!isAnonymous && (
                <div className="mb-3">
                    <label htmlFor="donor_name" className={FIELD_LABEL}>Full name *</label>
                    <input
                        id="donor_name"
                        type="text"
                        {...register('donor_name', {
                            required: !isAnonymous && 'Name is required',
                            minLength: { value: 2, message: 'Name must be at least 2 characters' }
                        })}
                        className={FIELD}
                        placeholder="Nimal Perera"
                        aria-invalid={errors.donor_name ? 'true' : 'false'}
                    />
                    {errors.donor_name && <p className="mt-1 text-xs text-danger-600 dark:text-danger-400">{errors.donor_name.message}</p>}
                </div>
            )}

            <div className="mb-3">
                <label htmlFor="donor_email" className={FIELD_LABEL}>Email address *</label>
                <input
                    id="donor_email"
                    type="email"
                    {...register('donor_email', {
                        required: 'Email is required',
                        pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Enter a valid email address'
                        }
                    })}
                    className={FIELD}
                    placeholder="you@example.com"
                    aria-invalid={errors.donor_email ? 'true' : 'false'}
                />
                {errors.donor_email && <p className="mt-1 text-xs text-danger-600 dark:text-danger-400">{errors.donor_email.message}</p>}
            </div>

            <div className="mb-3">
                <label htmlFor="donation_purpose" className={FIELD_LABEL}>Direct my donation to</label>
                <select id="donation_purpose" {...register('donation_purpose')} className={FIELD}>
                    {DONATION_PURPOSES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
            </div>

            <div className="mb-3">
                <label htmlFor="donor_phone" className={FIELD_LABEL}>Phone number (optional)</label>
                <input id="donor_phone" type="tel" {...register('donor_phone')} className={FIELD} placeholder="077 123 4567" />
            </div>

            <div className="mb-4">
                <label htmlFor="message" className={FIELD_LABEL}>Message of support (optional)</label>
                <textarea id="message" {...register('message')} rows={2} className={`${FIELD} resize-none`} placeholder="Shown beside your name in the public ledger." />
            </div>

            <div className="flex gap-2">
                <button type="button" onClick={() => setStep(1)} className={BTN_BACK}>Back</button>
                <button type="button" onClick={goToPayment} className={BTN_PRIMARY}>Continue to payment</button>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Payment</h3>
            <p className="mb-3 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Your card is processed directly by Stripe. We never see or store the number.
            </p>

            <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm text-slate-600 dark:text-slate-300">You are donating</span>
                    <span className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">{formattedAmount}</span>
                </div>
                {impact && (
                    <p className="mt-1.5 border-t border-slate-200 pt-1.5 text-xs leading-snug text-slate-600 dark:border-white/10 dark:text-slate-400">
                        {impact.headline}
                    </p>
                )}
            </div>

            <div className="mb-3">
                <label className={FIELD_LABEL}>Card information *</label>
                <div className="rounded-md border border-slate-300 bg-white p-3 focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500 dark:border-white/15 dark:bg-white/5">
                    <CardElement
                        options={{
                            style: {
                                // Stripe renders in an iframe and cannot inherit our
                                // theme, so the ink has to be handed to it explicitly.
                                // It was hardcoded near-white, which made typed card
                                // numbers invisible against the light-mode field.
                                base: {
                                    fontSize: '15px',
                                    color: theme === 'dark' ? '#e5e5e5' : '#171717',
                                    iconColor: theme === 'dark' ? '#a3a3a3' : '#525252',
                                    '::placeholder': { color: theme === 'dark' ? '#737373' : '#a3a3a3' },
                                },
                                invalid: { color: '#dc2626', iconColor: '#dc2626' },
                            },
                        }}
                    />
                </div>
            </div>

            {paymentError && (
                <div role="alert" className="mb-3 rounded-md border border-danger-200 bg-danger-50 p-2.5 dark:border-danger-500/30 dark:bg-danger-500/10">
                    <p className="text-sm text-danger-800 dark:text-danger-200">{paymentError}</p>
                </div>
            )}

            <p className="mb-4 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <IconShieldCheck className="h-4 w-4 flex-shrink-0" />
                Encrypted and processed securely by Stripe
            </p>

            <div className="flex gap-2">
                <button type="button" onClick={() => setStep(2)} disabled={isProcessing} className={BTN_BACK}>Back</button>
                <button type="submit" disabled={isProcessing || !stripe} className={BTN_PRIMARY}>
                    {isProcessing ? (
                        <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Processing…
                        </>
                    ) : (
                        <>
                            <IconHeart className="h-4 w-4" />
                            Donate {formattedAmount}
                        </>
                    )}
                </button>
            </div>
        </div>
    );

    return (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-white/10 dark:bg-white/[0.04]">
            {/* Labelled progress — a donor should always know how much is left. */}
            <ol className="mb-4 flex list-none items-center gap-1 p-0">
                {STEPS.map(({ n, label }, i) => (
                    <React.Fragment key={n}>
                        <li className="flex items-center gap-1.5" aria-current={step === n ? 'step' : undefined}>
                            <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${step > n
                                ? 'bg-success-600 text-white'
                                : step === n
                                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                    : 'bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400'
                                }`}>
                                {step > n ? <IconCheck className="h-3.5 w-3.5" /> : n}
                            </span>
                            <span className={`hidden text-xs font-medium sm:inline ${step >= n ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                                {label}
                            </span>
                        </li>
                        {i < STEPS.length - 1 && (
                            <li aria-hidden="true" className={`h-px flex-1 ${step > n ? 'bg-success-600' : 'bg-slate-200 dark:bg-white/10'}`} />
                        )}
                    </React.Fragment>
                ))}
            </ol>

            <form onSubmit={handleFormSubmit} noValidate>
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
            </form>
        </section>
    );
}

export default DonationForm;
