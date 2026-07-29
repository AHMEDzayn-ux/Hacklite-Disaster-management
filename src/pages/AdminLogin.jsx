import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { IconShieldLock } from '../components/icons/Icons';

function AdminLogin() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password
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

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4 font-sans">
            {/* Static colour glow - CSS gradient only, no image/filter/animation */}
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    backgroundImage:
                        'radial-gradient(circle at 15% 10%, rgba(59,130,246,0.12), transparent 45%), radial-gradient(circle at 85% 90%, rgba(239,68,68,0.10), transparent 45%)',
                }}
            ></div>

            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            ></div>

            <div className="relative z-10 max-w-sm w-full animate-fade-in-up">
                {/* Back to Home */}
                <button
                    onClick={() => navigate('/')}
                    className="text-slate-400 hover:text-white mb-5 flex items-center gap-2 text-sm transition-colors"
                >
                    ← Back to Home
                </button>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/15 text-primary-300 ring-1 ring-inset ring-primary-400/20">
                            <IconShieldLock className="h-6 w-6" />
                        </div>
                        <h1 className="text-xl font-bold text-primary-300">Admin Portal</h1>
                        <p className="text-slate-400 text-sm mt-1">
                            Camp Management & Verification
                        </p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-4">
                        {error && (
                            <div className="bg-danger-500/10 border border-danger-400/30 text-danger-300 px-3 py-2 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-semibold text-slate-300 mb-1.5">
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
                            <label className="block text-sm font-semibold text-slate-300 mb-1.5">
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
                            className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-2.5 px-4 rounded-lg transition-colors duration-150 disabled:opacity-50"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    {/* Info */}
                    <div className="mt-4 pt-4 border-t border-white/10">
                        <p className="text-xs text-slate-400 text-center">
                            This portal is for authorized personnel only.
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
