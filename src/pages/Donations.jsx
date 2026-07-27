import React, { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { motion } from 'framer-motion';
import DonationForm from '../components/DonationForm';
import DonationCounter from '../components/DonationCounter';
import RecentDonations from '../components/RecentDonations';
import { useDonationStore } from '../store/supabaseStore';
import { IconHeart, IconCheck } from '../components/icons/Icons';
import heroImage from '../assets/yellow.png';

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
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans">
            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            ></div>

            {/* Cinematic community banner */}
            <div className="relative z-10 h-32 w-full overflow-hidden sm:h-40 animate-fade-in-up">
                <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/10"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-slate-950/80"></div>
            </div>

            <div className="relative z-10 mx-auto -mt-8 max-w-[1600px] px-6 pb-10 sm:px-10">
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-center sm:text-left"
                >
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-success-500 text-white shadow-lg shadow-success-500/30">
                        <IconHeart className="h-7 w-7" />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-white mb-1">Support Disaster Relief</h1>
                        <p className="text-slate-300 max-w-2xl mx-auto sm:mx-0">
                            Every donation is recorded in a public, auditable ledger. Payments are processed securely via Stripe.
                        </p>
                    </div>
                </motion.div>

                <div className="max-w-md mx-auto mb-8">
                    <DonationCounter />
                </div>

                {successMessage && (
                    <div className="max-w-2xl mx-auto mb-6 flex items-center gap-3 rounded-2xl border border-success-400/20 bg-success-500/10 p-4 text-center text-success-200 backdrop-blur-md">
                        <IconCheck className="h-5 w-5 flex-shrink-0 text-success-300" />
                        <span>{successMessage}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
                    <div>
                        {stripePromise ? (
                            <Elements stripe={stripePromise}>
                                <DonationForm onSuccess={handleSuccess} />
                            </Elements>
                        ) : (
                            <div className="rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-md p-6 text-center text-slate-400 shadow-xl">
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
