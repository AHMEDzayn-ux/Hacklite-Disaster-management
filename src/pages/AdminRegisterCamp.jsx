import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { checkIsAdmin } from '../services/adminService';
import {
    registerCampDirect,
    approveCampRequest,
    SRI_LANKA_DISTRICTS,
    CAMP_TYPES,
    FACILITY_OPTIONS,
    NEEDS_OPTIONS
} from '../services/campManagementService';
import LocationPicker from '../components/LocationPicker';
import { IconTent, IconCheck } from '../components/icons/Icons';

/**
 * Admin Register Camp Page
 * ========================
 * Unified form for:
 * 1. Direct camp registration by admin
 * 2. Approving a public camp request (pre-filled data)
 *
 * All fields match the camps table schema
 */
function AdminRegisterCamp() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, loading: authLoading } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [adminStatus, setAdminStatus] = useState({ isAdmin: false, role: null });

    // Check if coming from a request approval
    const requestData = location.state;
    const fromRequest = requestData?.fromRequest || false;
    const requestId = requestData?.requestId;
    const prefillData = requestData?.prefillData || {};

    // Form state - matches camps table schema
    const [formData, setFormData] = useState({
        // Basic Info
        name: prefillData.camp_name || '',
        type: prefillData.type || 'temporary-shelter',
        status: 'Active',

        // Location
        district: prefillData.district || '',
        ds_division: prefillData.ds_division || '',
        village_area: prefillData.village_area || '',
        nearby_landmark: prefillData.nearby_landmark || '',
        address: prefillData.address || '',

        // Capacity
        capacity: prefillData.estimated_capacity || '',
        current_occupancy: 0,

        // Contact Info (Camp In-Charge)
        contact_person: prefillData.requester_name || '',
        contact_number: prefillData.requester_phone || '',
        contact_email: prefillData.requester_email || '',
        managed_by: prefillData.requester_name || '',

        // Facilities & Needs
        facilities: prefillData.facilities_needed || [],
        needs: [],
        special_needs: prefillData.special_needs || '',

        // Notes
        additional_notes: prefillData.additional_notes || ''
    });

    // Location coordinates
    const [campLocation, setCampLocation] = useState({
        lat: prefillData.latitude || null,
        lng: prefillData.longitude || null
    });

    // Redirect if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/admin/login');
        }
    }, [user, authLoading, navigate]);

    // Check admin status
    useEffect(() => {
        if (user) {
            checkIsAdmin().then(setAdminStatus);
        }
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNumberChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value === '' ? '' : parseInt(value) || 0 }));
    };

    const handleArrayToggle = (fieldName, item) => {
        setFormData(prev => ({
            ...prev,
            [fieldName]: prev[fieldName].includes(item)
                ? prev[fieldName].filter(i => i !== item)
                : [...prev[fieldName], item]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate required fields
        if (!formData.name || !formData.district || !formData.address) {
            alert('❌ Please fill in all required fields (Name, District, Address)');
            return;
        }

        if (!formData.capacity || formData.capacity <= 0) {
            alert('❌ Please enter a valid capacity (must be greater than 0)');
            return;
        }

        if (!formData.contact_person || !formData.contact_number) {
            alert('❌ Please provide camp-in-charge contact information');
            return;
        }

        if (!campLocation.lat || !campLocation.lng) {
            alert('❌ Please select a location on the map by clicking on it');
            return;
        }

        setSubmitting(true);

        try {
            // Prepare camp data matching camps table schema exactly
            const campData = {
                name: formData.name,
                type: formData.type,
                status: formData.status,

                // Location fields
                district: formData.district,
                ds_division: formData.ds_division || null,
                village_area: formData.village_area || null,
                nearby_landmark: formData.nearby_landmark || null,
                address: formData.address,
                latitude: campLocation.lat,
                longitude: campLocation.lng,

                // Capacity
                capacity: parseInt(formData.capacity),
                current_occupancy: parseInt(formData.current_occupancy) || 0,

                // Contact
                contact_person: formData.contact_person,
                contact_number: formData.contact_number,
                contact_email: formData.contact_email || null,
                managed_by: formData.managed_by || formData.contact_person,

                // Facilities & Needs (JSONB)
                facilities: formData.facilities.length > 0 ? { items: formData.facilities } : null,
                needs: formData.needs,
                special_needs: formData.special_needs || null,

                // Notes
                additional_notes: formData.additional_notes || null
            };

            let result;

            if (fromRequest && requestId) {
                // Approve request and create camp
                result = await approveCampRequest(requestId, campData);

                if (result.success) {
                    alert('✅ Camp request approved and registered successfully!\n\nThe camp is now visible to the public.');
                    navigate('/admin/review-requests');
                } else {
                    throw new Error(result.error);
                }
            } else {
                // Direct registration
                result = await registerCampDirect(campData);

                if (result.success) {
                    alert('✅ Camp registered successfully!\n\nIt is now visible to the public.');
                    navigate('/admin/manage-camps');
                } else {
                    throw new Error(result.error);
                }
            }
        } catch (error) {
            console.error('Error registering camp:', error);
            alert('❌ Failed to register camp:\n' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (authLoading || !user) {
        return (
            <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans py-8 px-4">
            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            ></div>

            <div className="relative z-10 max-w-3xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <Link
                        to={fromRequest ? '/admin/review-requests' : '/admin/dashboard'}
                        className="text-slate-400 hover:text-white mb-4 flex items-center gap-2 transition-colors w-fit"
                    >
                        ← {fromRequest ? 'Back to Requests' : 'Dashboard'}
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-500/30">
                            <IconTent className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">
                                {fromRequest ? 'Approve & Register Camp' : 'Register New Camp'}
                            </h1>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <div className="bg-white/[0.05] border border-white/10 backdrop-blur-md rounded-xl shadow-xl p-6 md:p-8">
                    {/* Form Header */}
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-white">
                            {fromRequest ? 'Complete Camp Registration' : 'Camp Registration Form'}
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                            {fromRequest
                                ? 'Review the pre-filled data from the public request, complete any missing fields, and confirm registration.'
                                : 'Register an official relief camp. All fields will be visible to the public.'}
                        </p>
                    </div>

                    {/* Request Context */}
                    {fromRequest && prefillData.reason && (
                        <div className="mb-6 p-4 bg-primary-500/10 border-l-4 border-primary-400 rounded-r-lg">
                            <p className="text-sm font-semibold text-white mb-1">Original Request Reason:</p>
                            <p className="text-sm text-slate-300">{prefillData.reason}</p>
                            {prefillData.urgency_level && (
                                <p className="text-sm text-slate-300 mt-2">
                                    <strong>Urgency:</strong> {prefillData.urgency_level.toUpperCase()}
                                </p>
                            )}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* === SECTION: Basic Information === */}
                        <section>
                            <h3 className="text-lg font-bold text-white mb-4">
                                Basic Information
                            </h3>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                                        Camp Name <span className="text-danger-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="input-field"
                                        placeholder="e.g., Central Relief Camp - Colombo"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                                        Camp Type <span className="text-danger-400">*</span>
                                    </label>
                                    <select
                                        name="type"
                                        value={formData.type}
                                        onChange={handleChange}
                                        className="input-field"
                                        required
                                    >
                                        {CAMP_TYPES.map(type => (
                                            <option key={type.value} value={type.value}>{type.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                                        Status
                                    </label>
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}
                                        className="input-field"
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Closed">Closed</option>
                                        <option value="Full">Full</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        {/* === SECTION: Location Details === */}
                        <section className="border-t border-white/10 pt-6">
                            <h3 className="text-lg font-bold text-white mb-4">
                                Location Details
                            </h3>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                                        District <span className="text-danger-400">*</span>
                                    </label>
                                    <select
                                        name="district"
                                        value={formData.district}
                                        onChange={handleChange}
                                        className="input-field"
                                        required
                                    >
                                        <option value="">Select District</option>
                                        {SRI_LANKA_DISTRICTS.map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                                        DS Division
                                    </label>
                                    <input
                                        type="text"
                                        name="ds_division"
                                        value={formData.ds_division}
                                        onChange={handleChange}
                                        className="input-field"
                                        placeholder="e.g., Colombo DS Division"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                                        Village/Area
                                    </label>
                                    <input
                                        type="text"
                                        name="village_area"
                                        value={formData.village_area}
                                        onChange={handleChange}
                                        className="input-field"
                                        placeholder="e.g., Pettah"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                                        Nearby Landmark
                                    </label>
                                    <input
                                        type="text"
                                        name="nearby_landmark"
                                        value={formData.nearby_landmark}
                                        onChange={handleChange}
                                        className="input-field"
                                        placeholder="e.g., Near Town Hall"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                                        Full Address <span className="text-danger-400">*</span>
                                    </label>
                                    <textarea
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        className="input-field h-20"
                                        placeholder="Complete address of the camp location"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Map Location Picker */}
                            <div className="mt-4">
                                <label className="block text-sm font-semibold text-slate-300 mb-2">
                                    Exact Location <span className="text-danger-400">*</span>
                                    <span className="font-normal text-slate-500 ml-2">(Click on map to select)</span>
                                </label>
                                <LocationPicker
                                    value={campLocation}
                                    onChange={setCampLocation}
                                    required={true}
                                />
                                {campLocation.lat && campLocation.lng ? (
                                    <p className="flex items-center gap-1.5 text-sm text-success-400 mt-2">
                                        <IconCheck className="h-4 w-4" />
                                        Location selected: {campLocation.lat.toFixed(6)}, {campLocation.lng.toFixed(6)}
                                    </p>
                                ) : (
                                    <p className="text-sm text-amber-400 mt-2">
                                        ⚠️ Click on the map to set the exact camp location
                                    </p>
                                )}
                            </div>
                        </section>

                        {/* === SECTION: Capacity === */}
                        <section className="border-t border-white/10 pt-6">
                            <h3 className="text-lg font-bold text-white mb-4">
                                Capacity
                            </h3>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                                        Maximum Capacity (people) <span className="text-danger-400">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        name="capacity"
                                        value={formData.capacity}
                                        onChange={handleNumberChange}
                                        className="input-field"
                                        placeholder="e.g., 500"
                                        min="1"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                                        Current Occupancy
                                    </label>
                                    <input
                                        type="number"
                                        name="current_occupancy"
                                        value={formData.current_occupancy}
                                        onChange={handleNumberChange}
                                        className="input-field"
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* === SECTION: Contact Information === */}
                        <section className="border-t border-white/10 pt-6">
                            <h3 className="text-lg font-bold text-white mb-4">
                                Camp-in-Charge Contact
                            </h3>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                                        Contact Person Name <span className="text-danger-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="contact_person"
                                        value={formData.contact_person}
                                        onChange={handleChange}
                                        className="input-field"
                                        placeholder="Full name"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                                        Contact Phone <span className="text-danger-400">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        name="contact_number"
                                        value={formData.contact_number}
                                        onChange={handleChange}
                                        className="input-field"
                                        placeholder="e.g., 077-1234567"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                                        Contact Email
                                    </label>
                                    <input
                                        type="email"
                                        name="contact_email"
                                        value={formData.contact_email}
                                        onChange={handleChange}
                                        className="input-field"
                                        placeholder="email@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                                        Managed By
                                    </label>
                                    <input
                                        type="text"
                                        name="managed_by"
                                        value={formData.managed_by}
                                        onChange={handleChange}
                                        className="input-field"
                                        placeholder="Organization or person name"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* === SECTION: Facilities === */}
                        <section className="border-t border-white/10 pt-6">
                            <h3 className="text-lg font-bold text-white mb-4">
                                Available Facilities
                            </h3>
                            <p className="text-sm text-slate-400 mb-3">Select all facilities available at this camp</p>
                            <div className="flex flex-wrap gap-2">
                                {FACILITY_OPTIONS.map(facility => (
                                    <button
                                        key={facility}
                                        type="button"
                                        onClick={() => handleArrayToggle('facilities', facility)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${formData.facilities.includes(facility)
                                            ? 'bg-primary-600 text-white shadow-md shadow-primary-500/30'
                                            : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                                            }`}
                                    >
                                        {formData.facilities.includes(facility) ? '✓ ' : ''}{facility}
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* === SECTION: Current Needs === */}
                        <section className="border-t border-white/10 pt-6">
                            <h3 className="text-lg font-bold text-white mb-4">
                                Current Needs
                            </h3>
                            <p className="text-sm text-slate-400 mb-3">Select items/resources currently needed at this camp</p>
                            <div className="flex flex-wrap gap-2">
                                {NEEDS_OPTIONS.map(need => (
                                    <button
                                        key={need}
                                        type="button"
                                        onClick={() => handleArrayToggle('needs', need)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${formData.needs.includes(need)
                                            ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                                            : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                                            }`}
                                    >
                                        {formData.needs.includes(need) ? '✓ ' : ''}{need}
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* === SECTION: Special Needs & Notes === */}
                        <section className="border-t border-white/10 pt-6">
                            <h3 className="text-lg font-bold text-white mb-4">
                                Additional Information
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                                        Special Needs / Circumstances
                                    </label>
                                    <textarea
                                        name="special_needs"
                                        value={formData.special_needs}
                                        onChange={handleChange}
                                        className="input-field h-24"
                                        placeholder="e.g., Facilities for disabled, elderly care, pregnant women, medical equipment needs..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                                        Additional Notes
                                    </label>
                                    <textarea
                                        name="additional_notes"
                                        value={formData.additional_notes}
                                        onChange={handleChange}
                                        className="input-field h-24"
                                        placeholder="Any other important information about the camp..."
                                    />
                                </div>
                            </div>
                        </section>

                        {/* === Submit Buttons === */}
                        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row gap-4">
                            <button
                                type="button"
                                onClick={() => navigate(fromRequest ? '/admin/review-requests' : '/admin/dashboard')}
                                className="flex-1 px-6 py-3 border border-white/20 bg-white/5 text-white hover:bg-white/10 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex-1 btn-success disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting
                                    ? '⏳ Processing...'
                                    : fromRequest
                                        ? '✅ Approve & Register Camp'
                                        : 'Register Camp'
                                }
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default AdminRegisterCamp;
