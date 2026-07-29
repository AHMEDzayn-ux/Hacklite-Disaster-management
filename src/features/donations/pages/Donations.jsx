import React, { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import DonationForm from '@/features/donations/components/DonationForm';
import DonationCounter from '@/features/donations/components/DonationCounter';
import RecentDonations from '@/features/donations/components/RecentDonations';
import { useDonationStore } from '@/store/supabaseStore';
import { IconHeart, IconCheck } from '@/components/icons/Icons';

const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY
    ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
    : null;

function Donations() {
    const { subscribeToDonations } = useDonationStore();
    const [successMessage, setSuccessMessage] = useState(null);

    useEffect(() => {
        subscribeToDonations?.();
    }, [subscribeToDonations]);

    const handleSuccess = () => {
        setSuccessMessage('Thank you! Your payment is being confirmed - it will appear in the public ledger once processed.');
        setTimeout(() => setSuccessMessage(null), 8000);
    };

    return (
        <div className="page-shell">
            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            ></div>

            <div className="relative z-10 mx-auto max-w-6xl px-4 pt-3 pb-3 sm:px-6">
                <div className="mb-2 flex flex-col items-center gap-1.5 text-center sm:flex-row sm:justify-center sm:text-left">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-success-500/15 text-success-400">
                        <IconHeart className="h-4 w-4" />
                    </div>
                    <div>
                        <h1 className="text-lg md:text-xl font-black text-slate-900 dark:text-white mb-0.5">Support Disaster Relief</h1>
                        <p className="text-sm text-slate-300 max-w-2xl mx-auto sm:mx-0">
                            Every donation is recorded in a public, auditable ledger. Payments are processed securely via Stripe.
                        </p>
                    </div>
                </div>

                {successMessage && (
                    <div className="max-w-2xl mx-auto mb-3 flex items-center gap-3 rounded-xl border border-success-400/20 bg-success-500/10 p-3 text-center text-sm text-success-200 backdrop-blur-md">
                        <IconCheck className="h-5 w-5 flex-shrink-0 text-success-300" />
                        <span>{successMessage}</span>
                    </div>
                )}

                <div className="mb-3">
                    <DonationCounter />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                        {stripePromise ? (
                            <Elements stripe={stripePromise}>
                                <DonationForm onSuccess={handleSuccess} />
                            </Elements>
                        ) : (
                            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-6 text-center text-slate-400">
                                Payment processing is not configured (missing VITE_STRIPE_PUBLIC_KEY).
                            </div>
                        )}
                    </div>
                    <div>
                        <RecentDonations limit={10} showTicker={false} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Donations;
