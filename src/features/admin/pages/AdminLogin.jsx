import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { IconShieldLock } from '@/components/icons/Icons';

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

    const handleDemoLogin = () => {
        setEmail('admin@demo.com');
        setPassword('Demo@1234');
        signIn('admin@demo.com', 'Demo@1234');
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4 font-sans">
            <div className="absolute inset-0 overflow-hidden pointer-events-none mix-blend-screen">
                <div className="absolute -top-24 -left-24 w-[28rem] h-[28rem] bg-primary-500/10 rounded-full blur-3xl"></div>
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
                    className="text-slate-400 hover:text-white mb-8 flex items-center gap-2"
                >
                    ← Back to Home
                </button>

                <div className="rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-md shadow-2xl p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500/20 text-primary-300">
                            <IconShieldLock className="h-8 w-8" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">Admin Portal</h1>
                        <p className="text-slate-400 mt-2">
                            Camp Management & Verification
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
                            className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:shadow-lg hover:shadow-primary-500/40 text-white font-bold py-3 px-4 rounded-lg shadow-md shadow-primary-500/25 disabled:opacity-50"
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

                    {/* Info */}
                    <div className="mt-6 pt-6 border-t border-white/10">
                        <p className="text-xs text-slate-500 text-center">
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
