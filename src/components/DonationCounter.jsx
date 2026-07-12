import React from 'react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { useDonationStore } from '../store/supabaseStore';
import { IconHeart } from './icons/Icons';

function DonationCounter() {
    const { totalRaised, donationStats } = useDonationStore();

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-md p-8 shadow-xl"
        >
            {/* Background decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-success-500/10 rounded-full -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-500/10 rounded-full -ml-24 -mb-24"></div>

            {/* Content */}
            <div className="relative z-10">
                {/* Title */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-center mb-6"
                >
                    <h2 className="flex items-center justify-center gap-2 text-2xl md:text-3xl font-bold text-white mb-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-success-500 text-white shadow-md shadow-success-500/30">
                            <IconHeart className="h-5 w-5" />
                        </span>
                        Total Contributions
                    </h2>
                    <p className="text-slate-400 text-sm">
                        Thank you to our {donationStats.successfulCount} generous donors
                    </p>
                </motion.div>

                {/* Amount Counter */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
                    className="text-center mb-6"
                >
                    <div className="text-5xl md:text-7xl font-extrabold text-white mb-2">
                        LKR <CountUp
                            start={0}
                            end={totalRaised}
                            duration={2.5}
                            separator=","
                            decimals={0}
                            decimal="."
                        />
                    </div>
                    {donationStats.avgDonation > 0 && (
                        <p className="text-slate-400 text-sm">
                            Average donation: LKR {donationStats.avgDonation.toFixed(2)}
                        </p>
                    )}
                </motion.div>

                {/* Appreciation Message */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-center bg-white/5 border border-white/10 rounded-lg p-4 mb-6"
                >
                    <p className="text-white font-semibold text-lg">
                        🙏 Every Contribution Makes a Difference
                    </p>
                    <p className="text-slate-400 text-sm mt-1">
                        Your generosity helps rebuild lives and communities
                    </p>
                </motion.div>

                {/* Stats Row */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="grid grid-cols-2 gap-6 pt-6 border-t border-white/10"
                >
                    <div className="text-center">
                        <div className="text-3xl font-extrabold text-white">
                            {donationStats.successfulCount}
                        </div>
                        <div className="text-sm text-slate-400 mt-1">Successful Donations</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-extrabold text-white">
                            LKR {totalRaised.toLocaleString()}
                        </div>
                        <div className="text-sm text-slate-400 mt-1">Total Raised</div>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}

export default DonationCounter;
