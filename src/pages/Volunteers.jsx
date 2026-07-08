import React, { useState, useEffect } from 'react';
import LocationPicker from '../components/LocationPicker';
import {
    registerVolunteer, updateVolunteerAvailability, respondToAssignment,
    fetchVolunteerAssignments, VOLUNTEER_SKILLS,
} from '../services/volunteerService';
import { SRI_LANKA_DISTRICTS } from '../services/campManagementService';

const STORAGE_KEY = 'resqlink_volunteer';

const SKILL_LABELS = {
    rescue: '🚑 Rescue', medical: '⚕️ Medical', logistics: '📦 Logistics',
    driving: '🚗 Driving', first_aid: '🩹 First Aid', construction: '🏗️ Construction',
    counseling: '💬 Counseling',
};

function Volunteers() {
    const [saved, setSaved] = useState(null); // { id, phone, name }
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [skills, setSkills] = useState([]);
    const [district, setDistrict] = useState('');
    const [location, setLocation] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [assignments, setAssignments] = useState([]);

    useEffect(() => {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            try { setSaved(JSON.parse(raw)); } catch { /* ignore corrupt value */ }
        }
    }, []);

    useEffect(() => {
        if (saved) loadAssignments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [saved]);

    const loadAssignments = async () => {
        const result = await fetchVolunteerAssignments(saved.id);
        if (result.success) setAssignments(result.data);
    };

    const toggleSkill = (skill) => {
        setSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        if (!name.trim() || !phone.trim()) { setError('Name and phone are required.'); return; }

        setSubmitting(true);
        const result = await registerVolunteer({
            name: name.trim(), phone: phone.trim(), email: email.trim() || null,
            skills, district: district || null, location,
        });
        setSubmitting(false);

        if (result.success) {
            const record = { id: result.volunteer.id, phone: result.volunteer.phone, name: result.volunteer.name };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
            setSaved(record);
            setSuccess('Registered! You will see proposed assignments here when the AI matcher finds a task for you.');
        } else {
            setError(result.error || 'Registration failed');
        }
    };

    const handleAvailability = async (status) => {
        const result = await updateVolunteerAvailability(saved.id, saved.phone, status);
        if (result.success) setSuccess(`Status updated to ${status}`);
        else setError(result.error);
    };

    const handleAssignmentResponse = async (assignmentId, response) => {
        const result = await respondToAssignment(saved.id, saved.phone, assignmentId, response);
        if (result.success) loadAssignments();
        else setError(result.error);
    };

    const handleForget = () => {
        localStorage.removeItem(STORAGE_KEY);
        setSaved(null);
        setAssignments([]);
    };

    if (saved) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-2xl">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Welcome, {saved.name} 👋</h1>
                    <button onClick={handleForget} className="text-xs text-gray-400 underline">Not you? Switch volunteer</button>
                </div>

                {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
                {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{success}</div>}

                <div className="card mb-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-3">Your Availability</h2>
                    <div className="flex gap-2">
                        {['available', 'busy', 'offline'].map(status => (
                            <button
                                key={status}
                                onClick={() => handleAvailability(status)}
                                className="flex-1 capitalize py-2 rounded-lg border hover:bg-gray-50"
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="card">
                    <h2 className="text-lg font-bold text-gray-800 mb-3">Your Assignments</h2>
                    {assignments.length === 0 && <p className="text-gray-500 text-sm">No assignments yet. The volunteer-matching AI runs periodically and will propose a task here when one fits your skills and location.</p>}
                    <div className="space-y-3">
                        {assignments.map(a => (
                            <div key={a.id} className="border rounded-lg p-3">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold capitalize">{a.task_type.replace('_', ' ')}</span>
                                    <span className={`text-xs px-2 py-1 rounded-full ${a.status === 'proposed' ? 'bg-yellow-100 text-yellow-800' : a.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                        {a.status}
                                    </span>
                                </div>
                                {a.distance_km && <p className="text-sm text-gray-600">~{a.distance_km.toFixed(1)}km away</p>}
                                {a.status === 'proposed' && (
                                    <div className="flex gap-2 mt-2">
                                        <button onClick={() => handleAssignmentResponse(a.id, 'accepted')} className="flex-1 bg-green-600 text-white rounded py-1.5 text-sm">Accept</button>
                                        <button onClick={() => handleAssignmentResponse(a.id, 'declined')} className="flex-1 bg-gray-200 rounded py-1.5 text-sm">Decline</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Volunteer Registration</h1>
            <p className="text-gray-600 mb-6">
                Register once - no password needed. The AI assignment matcher will propose the nearest task that fits your skills, and you can accept or decline.
            </p>

            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

            <form onSubmit={handleRegister} className="card space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" required />
                    <p className="text-xs text-gray-400 mt-1">Used to identify you later - no password, no verification code.</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {VOLUNTEER_SKILLS.map(skill => (
                            <label key={skill} className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer text-sm ${skills.includes(skill) ? 'bg-primary-50 border-primary-300' : 'hover:bg-gray-50'}`}>
                                <input type="checkbox" checked={skills.includes(skill)} onChange={() => toggleSkill(skill)} className="w-4 h-4" />
                                {SKILL_LABELS[skill] || skill}
                            </label>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                    <select value={district} onChange={(e) => setDistrict(e.target.value)} className="input-field">
                        <option value="">Select District</option>
                        {SRI_LANKA_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Location</label>
                    <LocationPicker value={location} onChange={setLocation} label="" />
                </div>
                <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-50">
                    {submitting ? 'Registering...' : 'Register as Volunteer'}
                </button>
            </form>
        </div>
    );
}

export default Volunteers;
