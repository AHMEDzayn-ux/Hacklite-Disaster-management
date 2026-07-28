import React, { useState, useEffect } from 'react';
import LocationPicker from '../components/LocationPicker';
import {
    registerVolunteer, updateVolunteerAvailability, respondToAssignment,
    fetchVolunteerAssignments, VOLUNTEER_SKILLS,
} from '../services/volunteerService';
import { SRI_LANKA_DISTRICTS } from '../services/campManagementService';
import { IconUsers, IconCheck, IconX, IconClock } from '../components/icons/Icons';
import heroImage from '../assets/yellow.png';

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
            <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans">
                <div
                    className="absolute inset-0 pointer-events-none opacity-10"
                    style={{
                        backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                        backgroundSize: '28px 28px',
                    }}
                ></div>

                <div className="relative z-10 mx-auto max-w-2xl px-6 py-10 sm:px-10">
                    <div className="mb-8 flex items-center justify-between gap-5">
                        <div className="flex items-center gap-5">
                            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-500 text-white shadow-lg shadow-primary-500/30">
                                <IconUsers className="h-7 w-7" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-white md:text-4xl">Welcome, {saved.name}</h1>
                                <p className="mt-1 text-slate-300">Manage your availability and assignments</p>
                            </div>
                        </div>
                        <button onClick={handleForget} className="flex-shrink-0 text-xs text-slate-400 underline hover:text-white transition-colors">
                            Not you? Switch volunteer
                        </button>
                    </div>

                    {error && (
                        <div className="mb-4 rounded-lg border border-danger-400/20 bg-danger-500/10 p-3 text-sm text-danger-300">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="mb-4 rounded-lg border border-success-400/20 bg-success-500/10 p-3 text-sm text-success-300">
                            {success}
                        </div>
                    )}

                    <div className="card mb-6">
                        <h2 className="text-lg font-bold text-white mb-3">Your Availability</h2>
                        <div className="flex gap-2">
                            {['available', 'busy', 'offline'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => handleAvailability(status)}
                                    className="flex-1 capitalize py-2 rounded-lg border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 transition-colors"
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="card">
                        <h2 className="text-lg font-bold text-white mb-3">Your Assignments</h2>
                        {assignments.length === 0 && (
                            <p className="text-slate-400 text-sm">No assignments yet. The volunteer-matching AI runs periodically and will propose a task here when one fits your skills and location.</p>
                        )}
                        <div className="space-y-3">
                            {assignments.map(a => (
                                <div key={a.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-semibold capitalize text-white">{a.task_type.replace('_', ' ')}</span>
                                        <span className={`text-xs px-2 py-1 rounded-full ${a.status === 'proposed' ? 'bg-amber-500/15 text-amber-300' : a.status === 'accepted' ? 'bg-success-500/15 text-success-300' : 'bg-white/10 text-slate-300'}`}>
                                            {a.status}
                                        </span>
                                    </div>
                                    {a.distance_km && (
                                        <p className="flex items-center gap-1 text-sm text-slate-400">
                                            <IconClock className="h-3.5 w-3.5 flex-shrink-0" />
                                            ~{a.distance_km.toFixed(1)}km away
                                        </p>
                                    )}
                                    {a.status === 'proposed' && (
                                        <div className="flex gap-2 mt-2">
                                            <button
                                                onClick={() => handleAssignmentResponse(a.id, 'accepted')}
                                                className="flex-1 flex items-center justify-center gap-1.5 bg-success-600 hover:bg-success-500 text-white rounded py-1.5 text-sm font-medium transition-colors"
                                            >
                                                <IconCheck className="h-3.5 w-3.5" />
                                                Accept
                                            </button>
                                            <button
                                                onClick={() => handleAssignmentResponse(a.id, 'declined')}
                                                className="flex-1 flex items-center justify-center gap-1.5 border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 rounded py-1.5 text-sm font-medium transition-colors"
                                            >
                                                <IconX className="h-3.5 w-3.5" />
                                                Decline
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans">
            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            ></div>

            {/* Cinematic community banner */}
            <div className="relative z-10 h-32 w-full overflow-hidden sm:h-40 animate-fade-in-up">
                <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/10"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-slate-950/80"></div>
            </div>

            <div className="relative z-10 mx-auto -mt-8 max-w-2xl px-6 pb-10 sm:px-10">
                <div className="mb-8 flex items-center gap-5">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-500 text-white shadow-lg shadow-primary-500/30">
                        <IconUsers className="h-7 w-7" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white md:text-4xl">Volunteer Registration</h1>
                        <p className="mt-1 text-slate-300">
                            Register once - no password needed. The AI assignment matcher will propose the nearest task that fits your skills, and you can accept or decline.
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 rounded-lg border border-danger-400/20 bg-danger-500/10 p-3 text-sm text-danger-300">
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister} className="card space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">Full Name *</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" required />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">Phone Number *</label>
                        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" required />
                        <p className="text-xs text-slate-500 mt-1">Used to identify you later - no password, no verification code.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">Email (optional)</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">Skills</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {VOLUNTEER_SKILLS.map(skill => (
                                <label
                                    key={skill}
                                    className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer text-sm transition-colors ${skills.includes(skill)
                                        ? 'bg-primary-500/15 border-primary-400/40 text-primary-200'
                                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                                        }`}
                                >
                                    <input type="checkbox" checked={skills.includes(skill)} onChange={() => toggleSkill(skill)} className="w-4 h-4" />
                                    {SKILL_LABELS[skill] || skill}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">District</label>
                        <select value={district} onChange={(e) => setDistrict(e.target.value)} className="input-field">
                            <option value="">Select District</option>
                            {SRI_LANKA_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">Your Location</label>
                        <LocationPicker value={location} onChange={setLocation} label="" />
                    </div>
                    <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-50">
                        {submitting ? 'Registering...' : 'Register as Volunteer'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Volunteers;
