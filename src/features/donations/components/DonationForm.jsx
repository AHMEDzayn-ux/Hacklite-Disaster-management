import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from '@/lib/supabase';

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

function DonationForm({ onSuccess }) {
    const stripe = useStripe();
    const elements = useElements();

    const [selectedAmount, setSelectedAmount] = useState(5000); // Default LKR 5000
    const [customAmount, setCustomAmount] = useState('');
    const [selectedCurrency, setSelectedCurrency] = useState('LKR');
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentError, setPaymentError] = useState(null);
    const [step, setStep] = useState(1); // 1: Amount, 2: Info, 3: Payment

    const { register, handleSubmit, formState: { errors }, watch } = useForm({
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

    const getCurrencySymbol = () => {
        const currency = CURRENCIES.find(c => c.code === selectedCurrency);
        return currency ? currency.symbol : 'Rs.';
    };

    const getFinalAmount = () => {
        return customAmount ? parseFloat(customAmount) : selectedAmount;
    };

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

    const renderStep1 = () => (
        <div>
            <h3 className="text-base font-bold text-white mb-3">Choose Your Impact</h3>

            {/* Preset Amounts */}
            <div className="grid grid-cols-3 gap-2 mb-3">
                {PRESET_AMOUNTS.map((amount) => (
                    <button
                        key={amount}
                        type="button"
                        onClick={() => handleAmountSelect(amount)}
                        className={`py-2.5 rounded-lg border text-sm font-semibold ${selectedAmount === amount && !customAmount
                            ? 'bg-primary-600 text-white border-primary-500'
                            : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                            }`}
                    >
                        {getCurrencySymbol()}{amount}
                    </button>
                ))}
            </div>

            {/* Custom Amount */}
            <div className="mb-3">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Or enter custom amount
                </label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{getCurrencySymbol()}</span>
                    <input
                        type="text"
                        value={customAmount}
                        onChange={handleCustomAmountChange}
                        placeholder="0.00"
                        className="input-field pl-8"
                    />
                </div>
            </div>

            {/* Impact Preview */}
            {getFinalAmount() >= 25 && (
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 mb-3">
                    <h4 className="text-xs font-semibold text-slate-300 mb-1.5">Your Impact:</h4>
                    <ul className="text-xs text-slate-400 space-y-1">
                        {getFinalAmount() >= 25 && <li>✓ Emergency supplies for 1 family</li>}
                        {getFinalAmount() >= 50 && <li>✓ Food for a family for 1 week</li>}
                        {getFinalAmount() >= 100 && <li>✓ Temporary shelter setup</li>}
                        {getFinalAmount() >= 250 && <li>✓ Medical supplies for 10+ people</li>}
                        {getFinalAmount() >= 500 && <li>✓ Major relief camp support</li>}
                    </ul>
                </div>
            )}

            <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!getFinalAmount() || getFinalAmount() < 1}
                className="w-full bg-primary-600 hover:bg-primary-500 disabled:bg-white/10 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm"
            >
                Continue to Your Information
            </button>
        </div>
    );

    const renderStep2 = () => (
        <div>
            <h3 className="text-base font-bold text-white mb-3">Your Information</h3>

            {/* Anonymous Checkbox */}
            <div className="mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        {...register('is_anonymous')}
                        className="w-4 h-4 accent-primary-500"
                    />
                    <span className="text-sm text-slate-300">Make my donation anonymous</span>
                </label>
            </div>

            {/* Name */}
            {!isAnonymous && (
                <div className="mb-3">
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                        Full Name *
                    </label>
                    <input
                        type="text"
                        {...register('donor_name', {
                            required: !isAnonymous && 'Name is required',
                            minLength: { value: 2, message: 'Name must be at least 2 characters' }
                        })}
                        className="input-field"
                        placeholder="John Doe"
                    />
                    {errors.donor_name && (
                        <p className="text-danger-400 text-xs mt-1">{errors.donor_name.message}</p>
                    )}
                </div>
            )}

            {/* Email */}
            <div className="mb-3">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Email Address *
                </label>
                <input
                    type="email"
                    {...register('donor_email', {
                        required: 'Email is required',
                        pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Invalid email address'
                        }
                    })}
                    className="input-field"
                    placeholder="john@example.com"
                />
                {errors.donor_email && (
                    <p className="text-danger-400 text-xs mt-1">{errors.donor_email.message}</p>
                )}
            </div>

            {/* Phone */}
            <div className="mb-3">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Phone Number (Optional)
                </label>
                <input
                    type="tel"
                    {...register('donor_phone')}
                    className="input-field"
                    placeholder="+1 (555) 123-4567"
                />
            </div>

            {/* Message */}
            <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Message (Optional)
                </label>
                <textarea
                    {...register('message')}
                    rows={2}
                    className="input-field resize-none"
                    placeholder="Leave a message of hope..."
                />
            </div>

            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 font-semibold py-2.5 rounded-lg text-sm"
                >
                    Back
                </button>
                <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="flex-1 bg-primary-600 hover:bg-primary-500 text-white font-semibold py-2.5 rounded-lg text-sm"
                >
                    Continue to Payment
                </button>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div>
            <h3 className="text-base font-bold text-white mb-3">Payment Details</h3>

            {/* Amount Summary */}
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 mb-3">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-300 font-medium">Donation Amount:</span>
                    <span className="text-lg font-bold text-white">
                        {getCurrencySymbol()}{getFinalAmount().toLocaleString()}
                    </span>
                </div>
                <div className="text-xs text-slate-500 mt-1 text-right">
                    Currency: {selectedCurrency}
                </div>
            </div>

            {/* Stripe Card Element */}
            <div className="mb-3">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Card Information *
                </label>
                <div className="p-3 rounded-lg border border-white/15 bg-white/5 focus-within:border-primary-400/50">
                    <CardElement
                        options={{
                            style: {
                                base: {
                                    fontSize: '15px',
                                    color: '#e2e8f0',
                                    '::placeholder': {
                                        color: '#64748b',
                                    },
                                },
                                invalid: {
                                    color: '#f87171',
                                },
                            },
                        }}
                    />
                </div>
            </div>

            {/* Error Display */}
            {paymentError && (
                <div className="mb-3 p-2.5 rounded-lg border border-danger-400/20 bg-danger-500/10">
                    <p className="text-danger-300 text-sm">{paymentError}</p>
                </div>
            )}

            {/* Security Info */}
            <div className="mb-4 flex items-center gap-2 text-xs text-slate-500">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span>Payments are encrypted and processed securely by Stripe</span>
            </div>

            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={isProcessing}
                    className="flex-1 border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed font-semibold py-2.5 rounded-lg text-sm"
                >
                    Back
                </button>
                <button
                    type="submit"
                    disabled={isProcessing || !stripe}
                    className="flex-1 bg-success-600 hover:bg-success-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2"
                >
                    {isProcessing ? (
                        <>
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Processing...
                        </>
                    ) : (
                        <>Donate {getCurrencySymbol()}{getFinalAmount().toLocaleString()}</>
                    )}
                </button>
            </div>
        </div>
    );

    return (
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 md:p-5">
            {/* Progress Steps */}
            <div className="flex items-center justify-center mb-4">
                {[1, 2, 3].map((s) => (
                    <React.Fragment key={s}>
                        <div className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${step >= s ? 'bg-primary-600 text-white' : 'bg-white/10 text-slate-400'
                            }`}>
                            {s}
                        </div>
                        {s < 3 && (
                            <div className={`w-12 h-0.5 ${step > s ? 'bg-primary-600' : 'bg-white/10'}`} />
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)}>
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
            </form>

        </div>
    );
}

export default DonationForm;
