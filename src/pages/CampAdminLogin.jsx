import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';

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

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-700 to-primary-900 flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                <button
                    onClick={() => navigate('/')}
                    className="text-primary-200 hover:text-white mb-8 flex items-center gap-2 transition-colors"
                >
                    ← Back to Home
                </button>

                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    <div className="text-center mb-8">
                        <div className="text-5xl mb-4">📦</div>
                        <h1 className="text-2xl font-bold text-gray-800">Camp Admin Portal</h1>
                        <p className="text-gray-600 mt-2">Manage your camp's inventory</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="bg-danger-50 text-danger-700 px-4 py-3 rounded-lg text-sm">{error}</div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
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
                            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
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
                            className="w-full bg-primary-700 hover:bg-primary-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <p className="text-xs text-gray-500 text-center">
                            Your login is created by an administrator when your camp is registered.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CampAdminLogin;
