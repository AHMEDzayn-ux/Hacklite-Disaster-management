import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function AdminDashboard() {
    const navigate = useNavigate();
    const { user, signOut, loading } = useAuth();

    // Redirect if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            navigate('/admin/login');
        }
    }, [user, loading, navigate]);

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-gray-800 text-white shadow-lg">
                <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link to="/" className="text-gray-400 hover:text-white transition-colors">
                                ← Home
                            </Link>
                            <h1 className="text-xl font-bold">🔐 Admin Portal</h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-400">{user.email}</span>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="w-full px-4 sm:px-6 lg:px-8 py-6">
                {/* Header & Stats Row */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Admin Dashboard</h2>
                        <p className="text-gray-600 text-sm">Manage camps, records, and system data</p>
                    </div>

                    {/* Quick Stats - Inline */}
                    <div className="flex flex-wrap gap-3">
                        <div className="bg-white rounded-lg px-4 py-2 shadow-sm flex items-center gap-2">
                            <span className="text-warning-600 font-bold text-lg">-</span>
                            <span className="text-xs text-gray-600">Pending</span>
                        </div>
                        <div className="bg-white rounded-lg px-4 py-2 shadow-sm flex items-center gap-2">
                            <span className="text-success-600 font-bold text-lg">-</span>
                            <span className="text-xs text-gray-600">Active Camps</span>
                        </div>
                        <div className="bg-white rounded-lg px-4 py-2 shadow-sm flex items-center gap-2">
                            <span className="text-primary-600 font-bold text-lg">-</span>
                            <span className="text-xs text-gray-600">Capacity</span>
                        </div>
                    </div>
                </div>

                {/* Action Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {/* Emergency Command Dashboard */}
                    <Link to="/admin/command" className="block group">
                        <div className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-all border-l-4 border-danger-500 h-full">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="text-3xl">🚨</div>
                                <h3 className="text-lg font-bold text-gray-800">Command Dashboard</h3>
                            </div>
                            <p className="text-gray-600 text-sm mb-3">
                                AI situation map, priority queue, resource allocation
                            </p>
                            <span className="text-danger-600 font-medium text-sm group-hover:underline">
                                Open Dashboard →
                            </span>
                        </div>
                    </Link>

                    {/* Inventory Overview */}
                    <Link to="/admin/inventory" className="block group">
                        <div className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-all border-l-4 border-blue-500 h-full">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="text-3xl">📦</div>
                                <h3 className="text-lg font-bold text-gray-800">Inventory</h3>
                            </div>
                            <p className="text-gray-600 text-sm mb-3">
                                Cross-camp stock levels and low-stock alerts
                            </p>
                            <span className="text-blue-600 font-medium text-sm group-hover:underline">
                                View Inventory →
                            </span>
                        </div>
                    </Link>

                    {/* Review Camp Requests */}
                    <Link to="/admin/review-requests" className="block group">
                        <div className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-all border-l-4 border-warning-500 h-full">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="text-3xl">📋</div>
                                <h3 className="text-lg font-bold text-gray-800">Review Requests</h3>
                            </div>
                            <p className="text-gray-600 text-sm mb-3">
                                Approve or reject public camp requests
                            </p>
                            <span className="text-warning-600 font-medium text-sm group-hover:underline">
                                View Pending →
                            </span>
                        </div>
                    </Link>

                    {/* Register New Camp */}
                    <Link to="/admin/register-camp" className="block group">
                        <div className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-all border-l-4 border-success-500 h-full">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="text-3xl">⛺</div>
                                <h3 className="text-lg font-bold text-gray-800">Register Camp</h3>
                            </div>
                            <p className="text-gray-600 text-sm mb-3">
                                Directly register a new relief camp
                            </p>
                            <span className="text-success-600 font-medium text-sm group-hover:underline">
                                Add New →
                            </span>
                        </div>
                    </Link>

                    {/* Manage Camps */}
                    <Link to="/admin/manage-camps" className="block group">
                        <div className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-all border-l-4 border-purple-500 h-full">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="text-3xl">🔧</div>
                                <h3 className="text-lg font-bold text-gray-800">Manage Camps</h3>
                            </div>
                            <p className="text-gray-600 text-sm mb-3">
                                View and edit existing relief camps
                            </p>
                            <span className="text-purple-600 font-medium text-sm group-hover:underline">
                                Open Manager →
                            </span>
                        </div>
                    </Link>

                    {/* All Records Management */}
                    <Link to="/admin/records" className="block group">
                        <div className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-all border-l-4 border-red-500 h-full">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="text-3xl">📊</div>
                                <h3 className="text-lg font-bold text-gray-800">All Records</h3>
                            </div>
                            <p className="text-gray-600 text-sm mb-3">
                                View and delete any system records
                            </p>
                            <span className="text-red-600 font-medium text-sm group-hover:underline">
                                Manage Records →
                            </span>
                        </div>
                    </Link>
                </div>
            </main>
        </div>
    );
}

export default AdminDashboard;
