import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { checkIsAdmin } from '../services/adminService';
import { uploadCallRecording } from '../services/supabaseService';

// Sri Lankan phone number: 10 local digits (e.g. 0771234567) or +94 followed by 9 digits.
const PHONE_REGEX = /^(\d{10}|\+94\d{9})$/;

const STATUS_BADGE = {
    pending: 'bg-yellow-100 text-yellow-700',
    processing: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
};

const RECORD_LINK_BASE = {
    disasters: '/disasters-list',
    missing_persons: '/missing-persons-list',
    animal_rescues: '/animal-rescue-list',
};

/**
 * Call Reports
 * ============
 * Staff/volunteers upload local call recordings here. Each upload is
 * transcribed and turned into a structured disaster/missing-person/
 * animal-rescue report by call-transcription-agent (Gemini audio
 * understanding), asynchronously - this page polls for status.
 */
function AdminCallReports() {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();

    const [adminStatus, setAdminStatus] = useState({ isAdmin: false, role: null });
    const [checkingAdmin, setCheckingAdmin] = useState(true);

    const [recordings, setRecordings] = useState([]);
    const [loading, setLoading] = useState(true);

    const [file, setFile] = useState(null);
    const [callerPhone, setCallerPhone] = useState('');
    const [notes, setNotes] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const fileInputRef = useRef(null);

    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/admin/login');
        }
    }, [user, authLoading, navigate]);

    useEffect(() => {
        if (user) {
            setCheckingAdmin(true);
            checkIsAdmin().then((status) => {
                setAdminStatus(status);
                setCheckingAdmin(false);
            });
        } else {
            setCheckingAdmin(false);
        }
    }, [user]);

    const fetchRecordings = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('call_recordings')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            setRecordings(data || []);
        } catch (error) {
            console.error('Error fetching call recordings:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) fetchRecordings();
    }, [user, fetchRecordings]);

    // Poll while anything is still pending/processing - completed/failed rows
    // don't need it, so back off entirely once nothing is in flight.
    useEffect(() => {
        const hasInFlight = recordings.some((r) => r.status === 'pending' || r.status === 'processing');
        if (!hasInFlight) return undefined;

        const interval = setInterval(fetchRecordings, 5000);
        return () => clearInterval(interval);
    }, [recordings, fetchRecordings]);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) {
            setUploadError('Choose an audio file first.');
            return;
        }
        if (callerPhone.trim() && !PHONE_REGEX.test(callerPhone.trim())) {
            setUploadError('Caller phone must be 10 digits (e.g. 0771234567) or +94 followed by 9 digits (e.g. +94771234567).');
            return;
        }

        setUploading(true);
        setUploadError('');
        try {
            await uploadCallRecording(file, { callerPhone, notes });
            setFile(null);
            setCallerPhone('');
            setNotes('');
            if (fileInputRef.current) fileInputRef.current.value = '';
            await fetchRecordings();
        } catch (error) {
            console.error('Upload failed:', error);
            setUploadError(error.message || 'Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    if (authLoading || !user || checkingAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
            </div>
        );
    }

    if (!adminStatus.isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">🚫</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
                    <p className="text-gray-600 mb-4">You are not authorized to access this page.</p>
                    <Link to="/admin/dashboard" className="text-primary-600 hover:underline">
                        Return to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-gray-800 text-white shadow-lg">
                <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link to="/admin/dashboard" className="text-gray-400 hover:text-white transition-colors">
                                ← Dashboard
                            </Link>
                            <h1 className="text-xl font-bold">📞 Call Reports</h1>
                        </div>
                        <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full">
                            Admin: {user.email}
                        </span>
                    </div>
                </div>
            </header>

            <main className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-5xl mx-auto">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">🎙️</span>
                        <div>
                            <h3 className="font-semibold text-amber-800">Upload a call recording</h3>
                            <p className="text-sm text-amber-700">
                                Sinhala, Tamil, English, or mixed-language calls are supported. Transcription and extraction
                                happen in the background - refresh or wait for the status to update automatically.
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleUpload} className="bg-white rounded-xl shadow-sm p-6 mb-8 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Audio file</label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="audio/*"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-600 file:text-white hover:file:bg-primary-700"
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Caller phone (optional)</label>
                            <input
                                type="text"
                                value={callerPhone}
                                onChange={(e) => setCallerPhone(e.target.value)}
                                placeholder="0771234567 or +94771234567"
                                pattern="^(\d{10}|\+94\d{9})$"
                                title="10 digits (e.g. 0771234567) or +94 followed by 9 digits (e.g. +94771234567)"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                            <input
                                type="text"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="e.g. taken by front desk"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                    </div>
                    {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
                    <button
                        type="submit"
                        disabled={uploading}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        {uploading ? 'Uploading…' : 'Upload & Transcribe'}
                    </button>
                </form>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div>
                    </div>
                ) : recordings.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 text-center">
                        <div className="text-6xl mb-4">📭</div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">No call recordings yet</h3>
                        <p className="text-gray-500">Upload one above to get started.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
                        {recordings.map((r) => (
                            <div key={r.id} className="p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <div className="font-medium text-gray-800">{r.original_filename || 'Recording'}</div>
                                        <div className="text-xs text-gray-500">
                                            {formatDate(r.created_at)}
                                            {r.caller_phone ? ` · ${r.caller_phone}` : ''}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600" title={r.device_id ? `Device: ${r.device_id}` : undefined}>
                                            {r.ingestion_source === 'gateway_device' ? '📱 Gateway' : '✋ Manual'}
                                        </span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[r.status] || 'bg-gray-100 text-gray-700'}`}>
                                            {r.status}
                                        </span>
                                        {r.status === 'completed' && r.created_record_table && (
                                            <Link
                                                to={`${RECORD_LINK_BASE[r.created_record_table]}/${r.created_record_id}`}
                                                className="text-sm text-primary-600 hover:underline"
                                            >
                                                View {r.detected_category?.replace('_', ' ')} →
                                            </Link>
                                        )}
                                        {(r.transcript || r.error_message) && (
                                            <button
                                                onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                                                className="text-sm text-gray-500 hover:text-gray-700"
                                            >
                                                {expandedId === r.id ? 'Hide' : 'Details'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {expandedId === r.id && (
                                    <div className="mt-3 bg-gray-50 rounded-lg p-3 text-sm">
                                        {r.status === 'failed' && r.error_message && (
                                            <p className="text-red-600 mb-2">Error: {r.error_message}</p>
                                        )}
                                        {r.detected_language && (
                                            <p className="text-gray-500 mb-1">Language: {r.detected_language}
                                                {typeof r.confidence === 'number' ? ` · Confidence: ${Math.round(r.confidence * 100)}%` : ''}
                                            </p>
                                        )}
                                        {r.transcript && (
                                            <p className="text-gray-700 whitespace-pre-wrap">{r.transcript}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

export default AdminCallReports;
