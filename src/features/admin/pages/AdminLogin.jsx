import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { IconShieldLock } from '@/components/icons/Icons';

/**
 * Admin Portal
 * ============
 * The single sign-in for every staff account. There is no separate camp-admin
 * login: on success the account's role decides where it lands - a camp_admin
 * goes to its own camp's inventory, everyone else to the admin dashboard.
 */
function AdminLogin() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const signIn = async (loginEmail, loginPassword) => {
        setLoading(true);
        setError('');

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email: loginEmail,
                password: loginPassword
            });

            if (authError) {
                throw authError;
            }

            // A camp_admin belongs on its scoped inventory page, not the full
            // admin dashboard - route by the role in the session metadata (no
            // admin_users query: that table's RLS is super_admin-only and would
            // hang here).
            const role = data.user?.user_metadata?.role;
            navigate(role === 'camp_admin' ? '/camp-admin/inventory' : '/admin/dashboard');
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

    const handleDemoLogin = (demoEmail) => {
        setEmail(demoEmail);
        setPassword('Demo@1234');
        signIn(demoEmail, 'Demo@1234');
    };

    return (
        <div className="page-shell flex items-center justify-center px-4 font-sans">
            <div className="absolute inset-0 overflow-hidden pointer-events-none mix-blend-screen">
                <div className="absolute -top-24 -left-24 w-[28rem] h-[28rem] bg-slate-500/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-24 -right-24 w-[28rem] h-[28rem] bg-danger-500/10 rounded-full blur-3xl"></div>
            </div>


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
                    <div className="text-center mb-6">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-slate-300 ring-1 ring-inset ring-white/10">
                            <IconShieldLock className="h-6 w-6" />
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Admin Portal</h1>
                        <p className="text-slate-400 text-sm mt-1">
                            Admins &amp; camp admins - sign in here
                        </p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="bg-danger-500/10 border border-danger-400/30 text-danger-300 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-semibold text-slate-300 mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-field"
                                placeholder="admin@example.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-300 mb-2">
                                Password
                            </label>
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

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => handleDemoLogin('admin@demo.com')}
                                disabled={loading}
                                className="btn-outline py-3 disabled:opacity-50"
                            >
                                Demo Super Admin
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDemoLogin('campadmin@demo.com')}
                                disabled={loading}
                                className="btn-outline py-3 disabled:opacity-50"
                            >
                                Demo Camp Admin
                            </button>
                        </div>
                    </form>

                    {/* Info */}
                    <div className="mt-6 pt-6 border-t border-white/10">
                        <p className="text-xs text-slate-500 text-center">
                            This portal is for authorized personnel only. You are taken to
                            your own screens based on your account role.
                            <br />
                            For camp requests, please use the public form.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminLogin;
