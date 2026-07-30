import React, { useState, useEffect, useCallback } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { IconTent } from '@/components/icons/Icons';

/**
 * Admin Camps section
 * ===================
 * The camp lifecycle is one job done in three steps - the public asks for a camp
 * (Requests), an admin creates it (Register), and from then on it is maintained
 * (Camps) - so they sit behind one section with a sub-nav rather than three
 * unrelated entries in the top bar. Approving a request routes straight into
 * Register with the request's details prefilled; keeping both a click apart is
 * the point.
 *
 * This is the fixed frame: nav bar above, section tabs here, and one scroll
 * region for the page. Children size themselves with `h-full` and scroll their
 * own body, so the tabs never scroll away.
 */

const TABS = [
    { path: '/admin/manage-camps', label: 'Camps', also: ['/admin/edit-camp'] },
    { path: '/admin/review-requests', label: 'Requests' },
    { path: '/admin/register-camp', label: 'Register' },
];

export default function AdminCampsLayout() {
    const location = useLocation();
    const [pending, setPending] = useState(null);

    // How many requests are waiting is the one number that decides where an
    // operator goes next, so it rides on the tab itself. Counted head-only - the
    // rows themselves belong to the Requests page.
    const refreshPending = useCallback(async () => {
        const { count } = await supabase
            .from('camp_requests')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending');
        setPending(count ?? 0);
    }, []);

    // Re-counted on every move within the section: approving or rejecting a
    // request navigates, and a stale badge is worse than none.
    useEffect(() => { refreshPending(); }, [location.pathname, refreshPending]);

    const isActive = ({ path, also = [] }) =>
        [path, ...also].some(p => location.pathname === p || location.pathname.startsWith(p + '/'));

    return (
        // 3rem is the admin nav bar (h-12); the section fills what's left of the
        // viewport so each page scrolls inside it rather than under it.
        <div className="page-shell flex h-[calc(100dvh-3rem)] flex-col overflow-hidden">
            <div className="flex flex-none items-stretch gap-3 border-b border-slate-200 bg-white px-4 dark:border-white/10 dark:bg-slate-950 sm:px-6">
                <div className="flex items-center gap-2 border-r border-slate-200 pr-3 dark:border-white/10">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                        <IconTent className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">Camps</span>
                </div>

                <nav className="flex gap-1" aria-label="Camp management">
                    {TABS.map((tab) => {
                        const active = isActive(tab);
                        return (
                            <Link
                                key={tab.path}
                                to={tab.path}
                                aria-current={active ? 'page' : undefined}
                                className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${active
                                    ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                    }`}
                            >
                                {tab.label}
                                {tab.path === '/admin/review-requests' && pending > 0 && (
                                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-400/15 dark:text-amber-300">
                                        {pending}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
                <Outlet context={{ refreshPending }} />
            </div>
        </div>
    );
}
