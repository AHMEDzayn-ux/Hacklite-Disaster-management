import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateAllTestData, generateMissingPersons, generateDisasters, generateAnimalRescues, generateCamps, generateDonations } from '../utils/bulkTestData';
import { IconFlask } from '../components/icons/Icons';

function BulkTestData() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState('');
    const [result, setResult] = useState(null);

    const handleGenerateAll = async () => {
        if (!confirm('⚠️ This will create 140 test records in your database. Continue?')) return;

        setLoading(true);
        setResult(null);
        setProgress('Starting generation...');

        try {
            const res = await generateAllTestData();
            setResult(res);
            setProgress('');
            alert('✅ All test data generated successfully! Check console for details.');
        } catch (error) {
            alert(`❌ Error: ${error.message}`);
            setProgress('');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateType = async (type, count, generator) => {
        if (!confirm(`⚠️ This will create ${count} ${type} records. Continue?`)) return;

        setLoading(true);
        setProgress(`Generating ${count} ${type}...`);

        try {
            await generator(count);
            alert(`✅ ${count} ${type} generated successfully! Check console for details.`);
            setProgress('');
        } catch (error) {
            alert(`❌ Error: ${error.message}`);
            setProgress('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans">
            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            ></div>

            <div className="relative z-10 mx-auto max-w-4xl px-4 py-8 sm:px-6">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/')}
                        className="text-slate-400 hover:text-white mb-4 flex items-center gap-2 transition-colors text-sm font-medium"
                    >
                        ← Back to Home
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-500 text-white shadow-lg shadow-primary-500/30">
                            <IconFlask className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white md:text-4xl">Bulk Test Data Generator</h1>
                            <p className="mt-1 text-slate-300">Generate realistic test data for testing and demo purposes</p>
                        </div>
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="card border-l-4 border-l-primary-400 bg-primary-500/10 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-400 border-t-transparent"></div>
                            <div>
                                <p className="text-primary-200 font-semibold">Generating data...</p>
                                {progress && <p className="text-sm text-primary-300 mt-1">{progress}</p>}
                            </div>
                        </div>
                        <p className="text-sm text-primary-300 mt-3">
                            This may take 1-3 minutes. Check browser console (F12) for detailed progress.
                        </p>
                    </div>
                )}

                {/* Success Result */}
                {result && (
                    <div className="card border-l-4 border-l-success-400 bg-success-500/10 mb-6">
                        <h3 className="font-bold text-success-200 mb-2">✅ Generation Complete!</h3>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                            <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-primary-300">{result.counts.missingPersons}</p>
                                <p className="text-xs text-slate-400">Missing Persons</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-danger-300">{result.counts.disasters}</p>
                                <p className="text-xs text-slate-400">Disasters</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-amber-300">{result.counts.animalRescues}</p>
                                <p className="text-xs text-slate-400">Animal Rescues</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-success-300">{result.counts.camps}</p>
                                <p className="text-xs text-slate-400">Camps</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-blue-300">{result.counts.donations}</p>
                                <p className="text-xs text-slate-400">Donations</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Warning */}
                <div className="card border-l-4 border-l-amber-400 bg-amber-500/10 mb-6">
                    <h3 className="font-bold text-amber-200 mb-2">⚠️ Important Notes</h3>
                    <ul className="text-amber-100/80 text-sm space-y-1">
                        <li>• This creates test records in your Supabase database</li>
                        <li>• Data is realistic but randomly generated</li>
                        <li>• ✨ Photos are included from Unsplash (professional stock images)</li>
                        <li>• ✨ Real GPS coordinates for all Sri Lankan districts</li>
                        <li>• Generation may take 1-3 minutes depending on count</li>
                        <li>• Check browser console (F12) for detailed progress</li>
                    </ul>
                </div>

                {/* Generate All Button */}
                <div className="card mb-6 bg-gradient-to-r from-primary-600/30 to-primary-500/20 border-primary-400/20">
                    <h3 className="font-bold text-xl text-white mb-2">🚀 Generate All Test Data</h3>
                    <p className="text-slate-300 mb-4">
                        Creates 190 records: 50 Missing Persons + 30 Disasters + 40 Animal Rescues + 20 Camps + 50 Donations
                    </p>
                    <button
                        onClick={handleGenerateAll}
                        disabled={loading}
                        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Generating...' : '🎯 Generate All (190 records)'}
                    </button>
                </div>

                {/* Individual Generators */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Missing Persons */}
                    <div className="card">
                        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                            <span className="text-2xl">📋</span>
                            Missing Persons
                        </h3>
                        <p className="text-sm text-slate-400 mb-4">
                            Generates reports with names, ages, locations, and contact details
                        </p>
                        <button
                            onClick={() => handleGenerateType('Missing Persons', 50, generateMissingPersons)}
                            disabled={loading}
                            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Generate 50 Missing Persons
                        </button>
                    </div>

                    {/* Disasters */}
                    <div className="card">
                        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                            <span className="text-2xl">⚠️</span>
                            Disaster Reports
                        </h3>
                        <p className="text-sm text-slate-400 mb-4">
                            Various disaster types with severities and locations across Sri Lanka
                        </p>
                        <button
                            onClick={() => handleGenerateType('Disaster Reports', 30, generateDisasters)}
                            disabled={loading}
                            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Generate 30 Disasters
                        </button>
                    </div>

                    {/* Animal Rescues */}
                    <div className="card">
                        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                            <span className="text-2xl">🐕</span>
                            Animal Rescues
                        </h3>
                        <p className="text-sm text-slate-400 mb-4">
                            Different animal types with various conditions and rescue statuses
                        </p>
                        <button
                            onClick={() => handleGenerateType('Animal Rescues', 40, generateAnimalRescues)}
                            disabled={loading}
                            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Generate 40 Animal Rescues
                        </button>
                    </div>

                    {/* Camps */}
                    <div className="card">
                        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                            <span className="text-2xl">⛺</span>
                            Relief Camps
                        </h3>
                        <p className="text-sm text-slate-400 mb-4">
                            Emergency camps with capacities, facilities, and contact information
                        </p>
                        <button
                            onClick={() => handleGenerateType('Relief Camps', 20, generateCamps)}
                            disabled={loading}
                            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Generate 20 Camps
                        </button>
                    </div>

                    {/* Donations */}
                    <div className="card">
                        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                            <span className="text-2xl">💰</span>
                            Donations
                        </h3>
                        <p className="text-sm text-slate-400 mb-4">
                            Donation records with various amounts, currencies, and donor information
                        </p>
                        <button
                            onClick={() => handleGenerateType('Donations', 50, generateDonations)}
                            disabled={loading}
                            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Generate 50 Donations
                        </button>
                    </div>
                </div>

                {/* Features List */}
                <div className="card mt-6">
                    <h3 className="font-bold text-white mb-3">📦 What's Generated:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-300">
                        <div>
                            <p className="font-semibold text-slate-200 mb-2">✓ Realistic Data:</p>
                            <ul className="space-y-1 ml-4 text-slate-400">
                                <li>• Sri Lankan names</li>
                                <li>• Valid phone numbers (070-078)</li>
                                <li>• All 25 districts with real areas</li>
                                <li>• Recent dates (last 30 days)</li>
                                <li>• Professional photos from Unsplash</li>
                            </ul>
                        </div>
                        <div>
                            <p className="font-semibold text-slate-200 mb-2">✓ Features:</p>
                            <ul className="space-y-1 ml-4 text-slate-400">
                                <li>• Mixed statuses (Active/Resolved)</li>
                                <li>• Various severities & conditions</li>
                                <li>• Real GPS coordinates (accurate)</li>
                                <li>• Detailed contextual descriptions</li>
                                <li>• Donation amounts (LKR & USD)</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default BulkTestData;
