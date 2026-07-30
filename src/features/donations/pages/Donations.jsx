import React, { useEffect, useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import DonationForm from '@/features/donations/components/DonationForm';
import DonationCounter from '@/features/donations/components/DonationCounter';
import RecentDonations from '@/features/donations/components/RecentDonations';
import { FUND_DESIGNATIONS } from '@/features/donations/impact';
import { useDonationStore } from '@/store/supabaseStore';
import { useDisasterStore, useCampStore } from '@/store';
import { allDistricts } from '@/lib/mapConfig';
import {
    IconCheck, IconShieldCheck, IconSiren, IconTent, IconMapPin,
    IconClipboardList, IconInfo,
} from '@/components/icons/Icons';

const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY
    ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
    : null;

const districtOf = address => {
    if (!address) return null;
    const lower = address.toLowerCase();
    return allDistricts.find(d => lower.includes(d.toLowerCase())) || null;
};

/** Live-need tile. Numbers come from the same tables responders work from. */
function NeedStat({ icon: Icon, value, label }) {
    return (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{label}</span>
            </p>
            <p className="mt-0.5 text-xl font-bold tabular-nums leading-tight text-slate-900 dark:text-white">{value}</p>
        </div>
    );
}

function TrustItem({ icon: Icon, children }) {
    return (
        <li className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
            <Icon className="h-3.5 w-3.5 flex-shrink-0 text-success-600 dark:text-success-400" />
            {children}
        </li>
    );
}

/**
 * Public donation appeal.
 *
 * The persuasion here is carried by real numbers, not decoration: live
 * incident counts establish that the need is current, the progress bar frames
 * a gap worth closing, per-amount impact statements make a gift concrete, and
 * the donor ledger supplies social proof. Nothing on this page states a figure
 * the system cannot evidence — no invented allocation percentages, no fake
 * urgency timers.
 */
function Donations() {
    const { subscribeToDonations } = useDonationStore();
    const { disasters, isInitialized: dInit, subscribeToDisasters } = useDisasterStore();
    const { camps, isInitialized: cInit, subscribeToCamps } = useCampStore();
    const [successMessage, setSuccessMessage] = useState(null);

    useEffect(() => {
        subscribeToDonations?.();
        if (!dInit) subscribeToDisasters?.();
        if (!cInit) subscribeToCamps?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const need = useMemo(() => {
        const active = disasters.filter(d => d.status === 'Active');
        const districts = new Set();
        active.forEach(d => {
            const name = districtOf(d.location?.address);
            if (name) districts.add(name);
        });
        const sheltered = camps
            .filter(c => c.status === 'Active')
            .reduce((sum, c) => sum + (c.current_occupancy || 0), 0);
        return { active: active.length, districts: districts.size, sheltered };
    }, [disasters, camps]);

    const handleSuccess = () => {
        setSuccessMessage('Thank you. Your payment is being confirmed and will appear in the public ledger once processed. A receipt is on its way to your email.');
        setTimeout(() => setSuccessMessage(null), 10000);
    };

    return (
        <div className="min-h-[calc(100dvh-3rem)] bg-slate-100 font-sans dark:bg-slate-950">
            <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-4 lg:px-6">

                {/* Appeal header — the case for giving, stated once, with live figures */}
                <section className="mb-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-white/10 dark:bg-white/[0.04]">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                        <div className="lg:col-span-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                National Disaster Relief Fund
                            </p>
                            <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl dark:text-white">
                                {need.active > 0
                                    ? `${need.active} incident${need.active === 1 ? '' : 's'} are active right now.`
                                    : 'Fund the response before the next disaster.'}
                            </h1>
                            <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                {need.active > 0
                                    ? 'Response teams are already on the ground. Your donation pays for the food, water, medicine and shelter they are handing out today.'
                                    : 'Contributions are held ready so relief teams can move within hours of the next emergency, rather than waiting on funds.'}
                            </p>
                            <ul className="mt-3 flex list-none flex-wrap gap-x-4 gap-y-1.5 p-0">
                                <TrustItem icon={IconClipboardList}>Recorded in a public, auditable ledger</TrustItem>
                                <TrustItem icon={IconShieldCheck}>Processed securely by Stripe</TrustItem>
                                <TrustItem icon={IconCheck}>Emailed receipt for every gift</TrustItem>
                            </ul>
                        </div>

                        <div className="grid grid-cols-3 gap-2 lg:col-span-2 lg:grid-cols-1">
                            <NeedStat icon={IconSiren} value={need.active} label="Active incidents" />
                            <NeedStat icon={IconMapPin} value={need.districts} label="Districts affected" />
                            <NeedStat icon={IconTent} value={need.sheltered.toLocaleString()} label="People in camps" />
                        </div>
                    </div>
                </section>

                <div className="mb-3">
                    <DonationCounter />
                </div>

                {successMessage && (
                    <div
                        role="status"
                        className="mb-3 flex items-start gap-2.5 rounded-lg border border-success-200 bg-success-50 p-3 dark:border-success-500/30 dark:bg-success-500/10"
                    >
                        <IconCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-success-700 dark:text-success-300" />
                        <p className="text-sm leading-snug text-success-900 dark:text-success-100">{successMessage}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                    <div className="lg:col-span-7">
                        {stripePromise ? (
                            <Elements stripe={stripePromise}>
                                <DonationForm onSuccess={handleSuccess} />
                            </Elements>
                        ) : (
                            <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                                <IconInfo className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-700 dark:text-amber-300" />
                                <div>
                                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Online donations are temporarily unavailable</p>
                                    <p className="mt-1 text-xs leading-snug text-amber-800 dark:text-amber-300">
                                        Card processing is not configured on this deployment (missing <code className="font-mono">VITE_STRIPE_PUBLIC_KEY</code>).
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-3 lg:col-span-5">
                        <section className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
                            <header className="flex h-10 items-center gap-1.5 border-b border-slate-200 px-3 dark:border-white/10">
                                <IconClipboardList className="h-4 w-4 flex-shrink-0 text-slate-400" />
                                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Where your donation goes</h2>
                            </header>
                            <dl className="m-0 divide-y divide-slate-200 p-0 dark:divide-white/10">
                                {FUND_DESIGNATIONS.map(item => (
                                    <div key={item.label} className="px-3 py-2">
                                        <dt className="text-[13px] font-semibold text-slate-900 dark:text-white">{item.label}</dt>
                                        <dd className="mt-0.5 text-xs leading-snug text-slate-600 dark:text-slate-400">{item.detail}</dd>
                                    </div>
                                ))}
                            </dl>
                            <p className="border-t border-slate-200 px-3 py-2 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
                                You choose a designation on the form. Undesignated gifts go to the General Relief Fund.
                            </p>
                        </section>

                        <RecentDonations limit={8} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Donations;
