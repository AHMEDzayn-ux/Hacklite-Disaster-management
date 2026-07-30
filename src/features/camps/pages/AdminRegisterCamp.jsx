import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import {
    registerCampDirect,
    approveCampRequest,
    SRI_LANKA_DISTRICTS,
    CAMP_TYPES,
    FACILITY_OPTIONS,
    NEEDS_OPTIONS
} from '@/features/camps/services/campManagementService';
import LocationPicker from '@/components/map/LocationPicker';
import { BTN } from '@/components/ui/tableStyles';
import { IconTent, IconCheck } from '@/components/icons/Icons';

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
    // Optional camp_admin login provisioned with the camp.
    const [campAdminEmail, setCampAdminEmail] = useState('');
    // Set after a successful registration to show the generated password once:
    // { email, password, campName, next } — cleared when the admin dismisses it.
    const [campAdminResult, setCampAdminResult] = useState(null);

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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNumberChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value === '' ? '' : parseInt(value) || 0 }));
    };

    const autofillTestData = () => {
        setFormData(prev => ({
            ...prev,
            name: 'Central Relief Camp - Colombo',
            type: 'temporary-shelter',
            status: 'Active',
            district: 'Colombo',
            ds_division: 'Colombo DS Division',
            village_area: 'Pettah',
            nearby_landmark: 'Near Town Hall',
            address: '123 Main Street, Pettah, Colombo',
            capacity: 500,
            current_occupancy: 0,
            contact_person: 'Ruwan Perera',
            contact_number: '0771234567',
            contact_email: 'ruwan.test@example.com',
            managed_by: 'Ruwan Perera',
            facilities: ['Food', 'Drinking Water', 'Medical Services', 'Shelter'],
            needs: ['Food', 'Blankets'],
            special_needs: 'Wheelchair accessible entrance, elderly care area.',
            additional_notes: 'Camp is set up in the community hall with backup generator power.'
        }));
        setCampLocation({ lat: 6.9271, lng: 79.8612 });
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

            const email = campAdminEmail.trim() || null;
            const next = fromRequest && requestId ? '/admin/review-requests' : '/admin/manage-camps';

            if (fromRequest && requestId) {
                // Approve request and create camp
                result = await approveCampRequest(requestId, campData, email);
            } else {
                // Direct registration
                result = await registerCampDirect(campData, email);
            }

            if (!result.success) {
                throw new Error(result.error);
            }

            if (result.campAdminError) {
                alert(`✅ Camp registered, but the camp admin login could not be created:\n${result.campAdminError}\n\nYou can add one later.`);
                navigate(next);
            } else if (result.campAdmin) {
                // Show the one-time password before leaving the page.
                setCampAdminResult({ ...result.campAdmin, campName: formData.name, next });
            } else {
                alert('✅ Camp registered successfully!\n\nIt is now visible to the public.');
                navigate(next);
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
            <div className="flex h-full items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        // The section shell owns the viewport; a form this long scrolls inside it
        // so the nav and the section tabs stay put.
        <div className="h-full overflow-y-auto px-4 py-3 sm:px-6">
            <div className="mx-auto max-w-3xl pb-4">
                {/* Form */}
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6 dark:border-white/10 dark:bg-white/[0.03]">
                    {/* Form Header */}
                    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                {fromRequest ? 'Complete Camp Registration' : 'Camp Registration Form'}
                            </h2>
                            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                                {fromRequest
                                    ? 'Review the pre-filled data from the public request, complete any missing fields, and confirm registration.'
                                    : 'Register an official relief camp. All fields will be visible to the public.'}
                            </p>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-2">
                            {/* The section tabs cover the page itself; only the request
                                the admin drilled in from needs a way back. */}
                            {fromRequest && (
                                <Link to="/admin/review-requests" className={BTN}>← Requests</Link>
                            )}
                            <button type="button" onClick={autofillTestData} className={BTN}>
                                Test Fill
                            </button>
                        </div>
                    </div>

                    {/* Request Context */}
                    {fromRequest && prefillData.reason && (
                        <div className="mb-5 rounded-r-md border-l-4 border-slate-300 bg-slate-50 p-3 dark:border-white/20 dark:bg-white/[0.03]">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Original request</p>
                            <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{prefillData.reason}</p>
                            {prefillData.urgency_level && (
                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                    <strong>Urgency:</strong> {prefillData.urgency_level.toUpperCase()}
                                </p>
                            )}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* === SECTION: Basic Information === */}
                        <section>
                            <h3 className="mb-3 border-b border-slate-200 pb-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-slate-400">
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
                                            <option key={type.value} value={type.value} className="text-slate-900">{type.label}</option>
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
                                        <option value="Active" className="text-slate-900">Active</option>
                                        <option value="Closed" className="text-slate-900">Closed</option>
                                        <option value="Full" className="text-slate-900">Full</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        {/* === SECTION: Location Details === */}
                        <section className="border-t border-white/10 pt-6">
                            <h3 className="mb-3 border-b border-slate-200 pb-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-slate-400">
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
                                        <option value="" className="text-slate-900">Select District</option>
                                        {SRI_LANKA_DISTRICTS.map(d => (
                                            <option key={d} value={d} className="text-slate-900">{d}</option>
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
                            <h3 className="mb-3 border-b border-slate-200 pb-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-slate-400">
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
                            <h3 className="mb-3 border-b border-slate-200 pb-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-slate-400">
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
                            <h3 className="mb-3 border-b border-slate-200 pb-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-slate-400">
                                Available Facilities
                            </h3>
                            <p className="text-sm text-slate-400 mb-3">Select all facilities available at this camp</p>
                            <div className="flex flex-wrap gap-2">
                                {FACILITY_OPTIONS.map(facility => (
                                    <button
                                        key={facility}
                                        type="button"
                                        onClick={() => handleArrayToggle('facilities', facility)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium ${formData.facilities.includes(facility)
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
                            <h3 className="mb-3 border-b border-slate-200 pb-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-slate-400">
                                Current Needs
                            </h3>
                            <p className="text-sm text-slate-400 mb-3">Select items/resources currently needed at this camp</p>
                            <div className="flex flex-wrap gap-2">
                                {NEEDS_OPTIONS.map(need => (
                                    <button
                                        key={need}
                                        type="button"
                                        onClick={() => handleArrayToggle('needs', need)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium ${formData.needs.includes(need)
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
                            <h3 className="mb-3 border-b border-slate-200 pb-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-slate-400">
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

                        {/* === Camp Admin Login (optional) === */}
                        <section className="border-t border-white/10 pt-6">
                            <div className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-6">
                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 text-slate-300">
                                    <IconTent className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Camp Admin Login (optional)</h3>
                                    <p className="text-sm text-slate-300 mb-4">
                                        Enter an email to create a Camp Admin account for this camp. They sign in at the
                                        same Admin Portal (/admin/login) and land on this camp's inventory, where they can
                                        add and distribute stock for this camp only. A password is generated and shown
                                        once after registration — leave blank to skip.
                                    </p>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-300 mb-2">Camp Admin Email</label>
                                        <input
                                            type="email"
                                            value={campAdminEmail}
                                            onChange={(e) => setCampAdminEmail(e.target.value)}
                                            className="input-field"
                                            placeholder="camp-admin@example.com"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* === Submit Buttons === */}
                        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row gap-4">
                            <button
                                type="button"
                                onClick={() => navigate(fromRequest ? '/admin/review-requests' : '/admin/dashboard')}
                                className="flex-1 px-6 py-3 border border-white/20 bg-white/5 text-slate-900 dark:text-white hover:bg-white/10 rounded-lg font-medium transition-colors"
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

            {/* One-time camp admin credentials - shown after successful registration */}
            {campAdminResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
                        <div className="mb-4 text-center">
                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success-500/20 text-success-400">
                                <IconCheck className="h-6 w-6" />
                            </div>
                            <h2 className="text-xl font-bold text-white">Camp Admin Created</h2>
                            <p className="mt-1 text-sm text-slate-400">
                                Save this password now — it is shown only once and cannot be recovered.
                            </p>
                        </div>

                        <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
                            <div>
                                <div className="text-xs text-slate-400">Camp</div>
                                <div className="font-medium text-white">{campAdminResult.campName}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-400">Email</div>
                                <div className="break-all font-mono text-sm text-white">{campAdminResult.email}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-400">Password</div>
                                <div className="break-all font-mono text-lg font-bold tracking-wide text-white">{campAdminResult.password}</div>
                            </div>
                        </div>

                        <div className="mt-5 flex gap-3">
                            <button
                                onClick={() => navigator.clipboard?.writeText(`Email: ${campAdminResult.email}\nPassword: ${campAdminResult.password}`)}
                                className="flex-1 rounded-lg border border-white/20 bg-white/5 py-3 font-semibold text-white transition-colors hover:bg-white/10"
                            >
                                Copy
                            </button>
                            <button
                                onClick={() => { const next = campAdminResult.next; setCampAdminResult(null); navigate(next); }}
                                className="flex-1 rounded-lg bg-primary-600 py-3 font-semibold text-white hover:bg-primary-700"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminRegisterCamp;
