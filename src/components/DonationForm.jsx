import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from '../config/supabase';

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
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
        >
            <h3 className="text-xl font-bold text-gray-800 mb-4">Choose Your Impact</h3>

            {/* Preset Amounts */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                {PRESET_AMOUNTS.map((amount) => (
                    <button
                        key={amount}
                        type="button"
                        onClick={() => handleAmountSelect(amount)}
                        className={`p-4 rounded-lg border-2 transition-all duration-200 ${selectedAmount === amount && !customAmount
                            ? 'border-blue-600 bg-blue-50 shadow-md scale-105'
                            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                            }`}
                    >
                        <div className="text-2xl font-bold text-gray-800">${amount}</div>
                    </button>
                ))}
            </div>

            {/* Custom Amount */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Or enter custom amount
                </label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
                    <input
                        type="text"
                        value={customAmount}
                        onChange={handleCustomAmountChange}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none text-lg"
                    />
                </div>
            </div>

            {/* Impact Preview */}
            {getFinalAmount() >= 25 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <h4 className="font-semibold text-green-800 mb-2">Your Impact:</h4>
                    <ul className="text-sm text-green-700 space-y-1">
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
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors duration-200"
            >
                Continue to Your Information
            </button>
        </motion.div>
    );

    const renderStep2 = () => (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
        >
            <h3 className="text-xl font-bold text-gray-800 mb-4">Your Information</h3>

            {/* Anonymous Checkbox */}
            <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        {...register('is_anonymous')}
                        className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Make my donation anonymous</span>
                </label>
            </div>

            {/* Name */}
            {!isAnonymous && (
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                    </label>
                    <input
                        type="text"
                        {...register('donor_name', {
                            required: !isAnonymous && 'Name is required',
                            minLength: { value: 2, message: 'Name must be at least 2 characters' }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                        placeholder="John Doe"
                    />
                    {errors.donor_name && (
                        <p className="text-red-600 text-sm mt-1">{errors.donor_name.message}</p>
                    )}
                </div>
            )}

            {/* Email */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                    placeholder="john@example.com"
                />
                {errors.donor_email && (
                    <p className="text-red-600 text-sm mt-1">{errors.donor_email.message}</p>
                )}
            </div>

            {/* Phone */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number (Optional)
                </label>
                <input
                    type="tel"
                    {...register('donor_phone')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                    placeholder="+1 (555) 123-4567"
                />
            </div>

            {/* Message */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message (Optional)
                </label>
                <textarea
                    {...register('message')}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none resize-none"
                    placeholder="Leave a message of hope..."
                />
            </div>

            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg transition-colors duration-200"
                >
                    Back
                </button>
                <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors duration-200"
                >
                    Continue to Payment
                </button>
            </div>
        </motion.div>
    );

    const renderStep3 = () => (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
        >
            <h3 className="text-xl font-bold text-gray-800 mb-4">Payment Details</h3>

            {/* Amount Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">Donation Amount:</span>
                    <span className="text-2xl font-bold text-blue-600">
                        {getCurrencySymbol()}{getFinalAmount().toLocaleString()}
                    </span>
                </div>
                <div className="text-xs text-gray-600 mt-1 text-right">
                    Currency: {selectedCurrency}
                </div>
            </div>

            {/* Stripe Card Element */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Card Information *
                </label>
                <div className="p-4 border-2 border-gray-300 rounded-lg focus-within:border-blue-600">
                    <CardElement
                        options={{
                            style: {
                                base: {
                                    fontSize: '16px',
                                    color: '#424770',
                                    '::placeholder': {
                                        color: '#aab7c4',
                                    },
                                },
                                invalid: {
                                    color: '#9e2146',
                                },
                            },
                        }}
                    />
                </div>
            </div>

            {/* Error Display */}
            {paymentError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{paymentError}</p>
                </div>
            )}

            {/* Security Info */}
            <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    <div>
                        <p className="text-sm font-semibold text-green-800">Secure Payment</p>
                        <p className="text-xs text-green-700">Your payment is encrypted and processed securely by Stripe</p>
                    </div>
                </div>
            </div>

            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={isProcessing}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-800 font-semibold py-3 rounded-lg transition-colors duration-200"
                >
                    Back
                </button>
                <button
                    type="submit"
                    disabled={isProcessing || !stripe}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                >
                    {isProcessing ? (
                        <>
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Processing...
                        </>
                    ) : (
                        <>
                            🎁 Donate {getCurrencySymbol()}{getFinalAmount().toLocaleString()}
                        </>
                    )}
                </button>
            </div>
        </motion.div>
    );

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
            {/* Progress Steps */}
            <div className="flex items-center justify-center mb-8">
                {[1, 2, 3].map((s) => (
                    <React.Fragment key={s}>
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                            }`}>
                            {s}
                        </div>
                        {s < 3 && (
                            <div className={`w-16 h-1 ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`} />
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
