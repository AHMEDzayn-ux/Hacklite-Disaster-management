import React from 'react';
import { useNavigate } from 'react-router-dom';

function RoleSelection() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center px-4">
            {/* Portal Links - Top Right */}
            <div className="absolute top-4 right-4 flex items-center gap-4">
                <button
                    onClick={() => navigate('/camp-admin/login')}
                    className="text-white/70 hover:text-white text-sm transition-colors flex items-center gap-1"
                >
                    <span>📦</span>
                    <span>Camp Admin</span>
                </button>
                <button
                    onClick={() => navigate('/admin/login')}
                    className="text-white/70 hover:text-white text-sm transition-colors flex items-center gap-1"
                >
                    <span>🔐</span>
                    <span>Admin Portal</span>
                </button>
            </div>

            <div className="max-w-6xl w-full">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        🚨 Disaster Management System
                    </h1>
                    <p className="text-xl text-primary-100">
                        Sri Lanka Emergency Response Platform
                    </p>
                </div>

                {/* Role Selection Cards */}
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Reporter/Victim Card */}
                    <div
                        onClick={() => navigate('/report')}
                        className="bg-white rounded-2xl shadow-2xl p-8 cursor-pointer transform transition-all hover:scale-105 hover:shadow-3xl"
                    >
                        <div className="text-center">
                            <div className="text-6xl mb-6">📢</div>
                            <h2 className="text-3xl font-bold text-gray-800 mb-4">
                                Report Emergency
                            </h2>
                            <p className="text-gray-600 mb-6 text-lg">
                                I need to report a missing person, disaster, or request help
                            </p>

                            <div className="space-y-3 mb-6 text-left">
                                <div className="flex items-start gap-3">
                                    <span className="text-danger-500 text-xl">→</span>
                                    <span className="text-gray-700">Report missing persons</span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="text-danger-500 text-xl">→</span>
                                    <span className="text-gray-700">Report disasters</span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="text-danger-500 text-xl">→</span>
                                    <span className="text-gray-700">Request animal rescue</span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="text-danger-500 text-xl">→</span>
                                    <span className="text-gray-700">Access emergency contacts</span>
                                </div>
                            </div>

                            <button className="btn-danger w-full text-lg py-3">
                                Report Emergency →
                            </button>
                        </div>
                    </div>

                    {/* Responder/Helper Card */}
                    <div
                        onClick={() => navigate('/respond')}
                        className="bg-white rounded-2xl shadow-2xl p-8 cursor-pointer transform transition-all hover:scale-105 hover:shadow-3xl"
                    >
                        <div className="text-center">
                            <div className="text-6xl mb-6">🤝</div>
                            <h2 className="text-3xl font-bold text-gray-800 mb-4">
                                Respond & Help
                            </h2>
                            <p className="text-gray-600 mb-6 text-lg">
                                I want to help, volunteer, or coordinate rescue efforts
                            </p>

                            <div className="space-y-3 mb-6 text-left">
                                <div className="flex items-start gap-3">
                                    <span className="text-success-500 text-xl">→</span>
                                    <span className="text-gray-700">View missing persons list</span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="text-success-500 text-xl">→</span>
                                    <span className="text-gray-700">See active disasters</span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="text-success-500 text-xl">→</span>
                                    <span className="text-gray-700">Register as volunteer</span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="text-success-500 text-xl">→</span>
                                    <span className="text-gray-700">Manage camps & donate</span>
                                </div>
                            </div>

                            <button className="btn-success w-full text-lg py-3">
                                I Want to Help →
                            </button>
                        </div>
                    </div>
                </div>

                {/* Emergency Hotline */}
                <div className="mt-12 text-center">
                    <div className="inline-block bg-white/10 backdrop-blur-sm rounded-xl px-8 py-4">
                        <p className="text-primary-100 mb-2">Emergency Hotline</p>
                        <p className="text-4xl font-bold text-white">119 | 117</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RoleSelection;
