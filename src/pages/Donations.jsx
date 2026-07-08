import React, { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { motion } from 'framer-motion';
import DonationForm from '../components/DonationForm';
import DonationCounter from '../components/DonationCounter';
import RecentDonations from '../components/RecentDonations';
import { useDonationStore } from '../store/supabaseStore';

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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="container mx-auto px-4 py-10">
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">Support Disaster Relief</h1>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Every donation is recorded in a public, auditable ledger. Payments are processed securely via Stripe.
                    </p>
                </motion.div>

                <div className="max-w-md mx-auto mb-8">
                    <DonationCounter />
                </div>

                {successMessage && (
                    <div className="max-w-2xl mx-auto mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-center">
                        {successMessage}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
                    <div>
                        {stripePromise ? (
                            <Elements stripe={stripePromise}>
                                <DonationForm onSuccess={handleSuccess} />
                            </Elements>
                        ) : (
                            <div className="bg-white rounded-xl shadow-lg p-6 text-center text-gray-600">
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
