import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { IconTent } from '@/components/icons/Icons';

/**
 * Camp Admin Portal
 * =================
 * Login for a camp_admin - a user scoped to one camp who records that camp's
 * inventory. Distinct from the full Admin Portal: on success it routes to the
 * camp's inventory page, and it rejects anyone who isn't actually a camp_admin.
 */
function CampAdminLogin() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const signIn = async (loginEmail, loginPassword) => {
        setLoading(true);
        setError('');

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
            if (authError) throw authError;

            // Confirm this account is a camp_admin from the session metadata (no
            // admin_users query: that table's RLS is super_admin-only and would
            // hang here).
            const role = data.user?.user_metadata?.role;
            if (role === 'camp_admin') {
                navigate('/camp-admin/inventory');
            } else if (role) {
                // A full admin logged in here - send them to their own portal.
                navigate('/admin/dashboard');
            } else {
                await supabase.auth.signOut();
                setError('This account is not a camp admin.');
            }
        } catch (err) {
            setError(err.message || 'Failed to sign in');
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = (e) => {
        e.preventDefault();
        signIn(email, password);
    };

    const handleDemoLogin = () => {
        setEmail('campadmin@demo.com');
        setPassword('Demo@1234');
        signIn('campadmin@demo.com', 'Demo@1234');
    };

    return (
        <div className="page-shell flex items-center justify-center px-4 font-sans">
            {/* Static colour glow - CSS gradient only, no image/filter/animation */}
            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            ></div>

            <div className="relative z-10 max-w-md w-full">
                {/* Back to Home */}
                <button
                    onClick={() => navigate('/')}
                    className="text-slate-400 hover:text-slate-900 dark:hover:text-white mb-5 flex items-center gap-2 text-sm transition-colors"
                >
                    ← Back to Home
                </button>

                <div className="rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-md shadow-2xl p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-300">
                            <IconTent className="h-8 w-8" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Camp Admin Portal</h1>
                        <p className="text-slate-400 mt-2">Manage your camp's inventory</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="bg-danger-500/10 border border-danger-400/30 text-danger-300 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-semibold text-slate-300 mb-2">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-field"
                                placeholder="camp-admin@example.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-300 mb-2">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-field"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full border-2 border-slate-900 dark:border-white bg-white dark:bg-transparent hover:bg-slate-900 dark:hover:bg-white text-slate-900 dark:text-white hover:text-white dark:hover:text-slate-900 font-bold py-2.5 px-4 rounded-lg transition-colors duration-150 disabled:opacity-50"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>

                        <button
                            type="button"
                            onClick={handleDemoLogin}
                            disabled={loading}
                            className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-4 rounded-lg border border-white/20 disabled:opacity-50"
                        >
                            Use Demo Account
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-white/10">
                        <p className="text-xs text-slate-500 text-center">
                            Your login is created by an administrator when your camp is registered.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CampAdminLogin;
