import React from 'react';
import { Link } from 'react-router-dom';

function NotFound() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 flex items-center justify-center px-4">
            <div className="text-center max-w-2xl">
                {/* 404 Animation */}
                <div className="mb-8">
                    <h1 className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                        404
                    </h1>
                </div>

                {/* Icon */}
                <div className="text-6xl mb-6">
                    🔍
                </div>

                {/* Message */}
                <div>
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
                        Page Not Found
                    </h2>
                    <p className="text-lg text-gray-600 mb-8">
                        Oops! The page you're looking for doesn't exist or has been moved.
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        to="/"
                        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                    >
                        🏠 Go Home
                    </Link>
                    <Link
                        to="/emergency"
                        className="bg-white text-gray-800 px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 border-2 border-gray-200"
                    >
                        🚨 Emergency Contacts
                    </Link>
                </div>

                {/* Helpful Links */}
                <div className="mt-12 bg-white rounded-xl shadow-md p-6">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">
                        Quick Links
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                        <Link
                            to="/missing-persons"
                            className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                            <span className="text-2xl">📋</span>
                            <div>
                                <p className="font-semibold text-gray-800">Missing Persons</p>
                                <p className="text-sm text-gray-600">View reports</p>
                            </div>
                        </Link>
                        <Link
                            to="/disasters"
                            className="flex items-center gap-3 p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                        >
                            <span className="text-2xl">⚠️</span>
                            <div>
                                <p className="font-semibold text-gray-800">Disaster Reports</p>
                                <p className="text-sm text-gray-600">Check alerts</p>
                            </div>
                        </Link>
                        <Link
                            to="/camps"
                            className="flex items-center gap-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                        >
                            <span className="text-2xl">⛺</span>
                            <div>
                                <p className="font-semibold text-gray-800">Relief Camps</p>
                                <p className="text-sm text-gray-600">Find shelter</p>
                            </div>
                        </Link>
                        <Link
                            to="/animal-rescue"
                            className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
                        >
                            <span className="text-2xl">🐕</span>
                            <div>
                                <p className="font-semibold text-gray-800">Animal Rescue</p>
                                <p className="text-sm text-gray-600">Report animals</p>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Emergency Note */}
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 font-semibold">
                        🚨 In case of emergency, call 117 (Disaster Management Centre)
                    </p>
                </div>
            </div>
        </div>
    );
}

export default NotFound;
