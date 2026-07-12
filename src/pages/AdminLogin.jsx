import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { IconShieldLock } from '../components/icons/Icons';
import heroImage from '../assets/dark.png';

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

            // Successfully logged in - redirect to admin dashboard
            navigate('/admin/dashboard');
        } catch (err) {
            setError(err.message || 'Failed to sign in');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4 font-sans">
            {/* Cinematic night-ops background */}
            <div className="absolute inset-0">
                <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover object-center opacity-[0.16]" />
                <div className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-slate-950/90 to-slate-950/95"></div>
            </div>

            <div className="absolute inset-0 overflow-hidden pointer-events-none mix-blend-screen">
                <div className="absolute -top-24 -left-24 w-[28rem] h-[28rem] bg-primary-500/10 rounded-full blur-3xl animate-blob"></div>
                <div className="absolute -bottom-24 -right-24 w-[28rem] h-[28rem] bg-danger-500/10 rounded-full blur-3xl animate-blob [animation-delay:2s]"></div>
            </div>

            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            ></div>

            <div className="relative z-10 max-w-md w-full animate-fade-in-up">
                {/* Back to Home */}
                <button
                    onClick={() => navigate('/')}
                    className="text-slate-400 hover:text-white mb-8 flex items-center gap-2 transition-colors"
                >
                    ← Back to Home
                </button>

                <div className="rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-md shadow-2xl p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500/20 text-primary-300 transition-transform duration-300 hover:scale-110">
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
                            className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:shadow-lg hover:shadow-primary-500/40 text-white font-bold py-3 px-4 rounded-lg shadow-md shadow-primary-500/25 transition-all disabled:opacity-50"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
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
