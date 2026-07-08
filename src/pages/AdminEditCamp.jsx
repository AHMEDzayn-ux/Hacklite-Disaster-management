import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { checkIsAdmin } from '../services/adminService';
import { SRI_LANKA_DISTRICTS, CAMP_TYPES, FACILITY_OPTIONS, NEEDS_OPTIONS } from '../services/campManagementService';
import LocationPicker from '../components/LocationPicker';
import { regenerateInventoryAccessCode } from '../services/inventoryService';

/**
 * Admin Edit Camp
 * ================
 * Admin page to edit existing camp details
 * - Contact person, phone, email
 * - Capacity and occupancy
 * - Facilities available
 * - Current needs
 * - Supply status
 * - Notes and special requirements
 */
function AdminEditCamp() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();

    const [camp, setCamp] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Admin status
    const [adminStatus, setAdminStatus] = useState({ isAdmin: false, role: null });
    const [regeneratingCode, setRegeneratingCode] = useState(false);

    // Form state - matches camps table schema
    const [formData, setFormData] = useState({
        // Basic Info
        name: '',
        type: '',
        status: 'Active',
        district: '',
        ds_division: '',

        // Capacity
        capacity: '',
        current_occupancy: '',

        // Contact
        contact_person: '',
        contact_number: '',
        contact_email: '',

        // Location
        address: '',
        village_area: '',
        nearby_landmark: '',
        latitude: null,
        longitude: null,

        // Facilities
        facilities: {},

        // Needs
        needs: [],

        // Additional
        special_needs: '',
        notes: ''
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

    // Fetch camp data
    useEffect(() => {
        const loadCamp = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('camps')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                if (!data) throw new Error('Camp not found');

                setCamp(data);

                // Populate form with existing data
                setFormData({
                    name: data.name || '',
                    type: data.type || '',
                    status: data.status || 'Active',
                    district: data.district || '',
                    ds_division: data.ds_division || '',
                    capacity: data.capacity || '',
                    current_occupancy: data.current_occupancy || 0,
                    contact_person: data.contact_person || data.managed_by || '',
                    contact_number: data.contact_number || '',
                    contact_email: data.contact_email || '',
                    address: data.address || '',
                    village_area: data.village_area || '',
                    nearby_landmark: data.nearby_landmark || '',
                    latitude: data.latitude || null,
                    longitude: data.longitude || null,
                    facilities: data.facilities || {},
                    needs: Array.isArray(data.needs) ? data.needs : [],
                    special_needs: data.special_needs || '',
                    notes: data.additional_notes || ''
                });
            } catch (error) {
                console.error('Error fetching camp:', error);
                setError('Failed to load camp data');
            } finally {
                setLoading(false);
            }
        };

        if (user && id) {
            loadCamp();
        }
    }, [user, id]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (name.startsWith('facility_')) {
            const facilityKey = name.replace('facility_', '');
            setFormData(prev => ({
                ...prev,
                facilities: {
                    ...prev.facilities,
                    [facilityKey]: checked
                }
            }));
        } else if (name.startsWith('need_')) {
            const needValue = name.replace('need_', '');
            setFormData(prev => ({
                ...prev,
                needs: checked
                    ? [...prev.needs, needValue]
                    : prev.needs.filter(n => n !== needValue)
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: type === 'number' ? (value === '' ? '' : parseInt(value)) : value
            }));
        }
    };

    const handleLocationSelect = (location) => {
        setFormData(prev => ({
            ...prev,
            latitude: location.lat,
            longitude: location.lng,
            address: location.address || prev.address
        }));
    };

    const handleRegenerateCode = async () => {
        setRegeneratingCode(true);
        const result = await regenerateInventoryAccessCode(id);
        if (result.success) {
            setCamp(prev => ({ ...prev, inventory_access_code: result.accessCode }));
            setSuccess(`New inventory access code: ${result.accessCode}`);
        } else {
            setError(result.error || 'Failed to regenerate access code');
        }
        setRegeneratingCode(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setSaving(true);

        try {
            // Validate required fields
            if (!formData.name.trim()) {
                throw new Error('Camp name is required');
            }
            if (!formData.contact_person.trim()) {
                throw new Error('Contact person is required');
            }
            if (!formData.contact_number.trim()) {
                throw new Error('Contact number is required');
            }

            // Prepare update data - only use columns that exist in camps table
            const updateData = {
                name: formData.name.trim(),
                type: formData.type,
                status: formData.status,
                district: formData.district,
                ds_division: formData.ds_division || null,
                capacity: parseInt(formData.capacity) || 0,
                current_occupancy: parseInt(formData.current_occupancy) || 0,
                contact_person: formData.contact_person.trim(),
                managed_by: formData.contact_person.trim(),
                contact_number: formData.contact_number.trim(),
                contact_email: formData.contact_email.trim() || null,
                address: formData.address.trim(),
                village_area: formData.village_area.trim() || null,
                nearby_landmark: formData.nearby_landmark.trim() || null,
                latitude: formData.latitude,
                longitude: formData.longitude,
                facilities: formData.facilities,
                needs: formData.needs,
                special_needs: formData.special_needs.trim() || null,
                additional_notes: formData.notes.trim() || null,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('camps')
                .update(updateData)
                .eq('id', id);

            if (error) throw error;

            setSuccess('Camp updated successfully!');

            // Redirect after short delay
            setTimeout(() => {
                navigate('/admin/manage-camps');
            }, 1500);

        } catch (error) {
            console.error('Update error:', error);
            setError(error.message || 'Failed to update camp');
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
            </div>
        );
    }

    if (!adminStatus.isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h1>
                    <p className="text-gray-600 mb-4">You need admin privileges to access this page.</p>
                    <Link to="/admin/dashboard" className="btn-primary">Return to Dashboard</Link>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent mb-4"></div>
                    <p className="text-gray-600">Loading camp data...</p>
                </div>
            </div>
        );
    }

    if (!camp) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-800 mb-4">Camp Not Found</h1>
                    <Link to="/admin/manage-camps" className="btn-primary">Back to Camps</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-gray-800 text-white shadow-lg">
                <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link to="/admin/manage-camps" className="text-gray-400 hover:text-white transition-colors">
                                ← Back to Camps
                            </Link>
                            <h1 className="text-xl font-bold">✏️ Edit Camp</h1>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
                <div className="max-w-4xl mx-auto">
                    {/* Camp Info Header */}
                    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">{camp.name || camp.camp_name}</h2>
                        <p className="text-gray-600 mt-1">
                            ID: <span className="font-mono text-sm">{camp.id}</span>
                        </p>
                    </div>

                    {/* Error/Success Messages */}
                    {error && (
                        <div className="bg-danger-50 border border-danger-300 text-danger-700 px-4 py-3 rounded-lg mb-6">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="bg-success-50 border border-success-300 text-success-700 px-4 py-3 rounded-lg mb-6">
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Basic Information */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">📋 Basic Information</h3>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Camp Name <span className="text-danger-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className="input-field"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Camp Type</label>
                                    <select
                                        name="type"
                                        value={formData.type}
                                        onChange={handleInputChange}
                                        className="input-field"
                                    >
                                        <option value="">Select Type</option>
                                        {CAMP_TYPES.map(type => (
                                            <option key={type.value} value={type.value}>{type.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleInputChange}
                                        className="input-field"
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                        <option value="Closed">Closed</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                                    <select
                                        name="district"
                                        value={formData.district}
                                        onChange={handleInputChange}
                                        className="input-field"
                                    >
                                        <option value="">Select District</option>
                                        {SRI_LANKA_DISTRICTS.map(district => (
                                            <option key={district} value={district}>{district}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">DS Division</label>
                                    <input
                                        type="text"
                                        name="ds_division"
                                        value={formData.ds_division}
                                        onChange={handleInputChange}
                                        className="input-field"
                                        placeholder="e.g., Kaduwela"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Capacity Section */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">👥 Capacity</h3>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Capacity</label>
                                    <input
                                        type="number"
                                        name="capacity"
                                        value={formData.capacity}
                                        onChange={handleInputChange}
                                        className="input-field"
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Occupancy</label>
                                    <input
                                        type="number"
                                        name="current_occupancy"
                                        value={formData.current_occupancy}
                                        onChange={handleInputChange}
                                        className="input-field"
                                        min="0"
                                        max={formData.capacity || 999999}
                                    />
                                </div>
                            </div>
                            {formData.capacity && formData.current_occupancy !== '' && (
                                <div className="mt-4">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-600">Occupancy</span>
                                        <span className="font-medium">
                                            {Math.round((formData.current_occupancy / formData.capacity) * 100)}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full ${(formData.current_occupancy / formData.capacity) >= 0.9 ? 'bg-danger-500' :
                                                (formData.current_occupancy / formData.capacity) >= 0.7 ? 'bg-warning-500' :
                                                    'bg-success-500'
                                                }`}
                                            style={{ width: `${Math.min((formData.current_occupancy / formData.capacity) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Contact Information */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">📞 Contact Information</h3>
                            <div className="grid md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Contact Person <span className="text-danger-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="contact_person"
                                        value={formData.contact_person}
                                        onChange={handleInputChange}
                                        className="input-field"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Phone Number <span className="text-danger-500">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        name="contact_number"
                                        value={formData.contact_number}
                                        onChange={handleInputChange}
                                        className="input-field"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        name="contact_email"
                                        value={formData.contact_email}
                                        onChange={handleInputChange}
                                        className="input-field"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Location */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">📍 Location</h3>
                            <div className="grid md:grid-cols-2 gap-4 mb-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                    <input
                                        type="text"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleInputChange}
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Village/Area</label>
                                    <input
                                        type="text"
                                        name="village_area"
                                        value={formData.village_area}
                                        onChange={handleInputChange}
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nearby Landmark</label>
                                    <input
                                        type="text"
                                        name="nearby_landmark"
                                        value={formData.nearby_landmark}
                                        onChange={handleInputChange}
                                        className="input-field"
                                    />
                                </div>
                            </div>
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Map Location
                                    {formData.latitude && formData.longitude && (
                                        <span className="ml-2 text-xs text-gray-500">
                                            ({formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)})
                                        </span>
                                    )}
                                </label>
                                <LocationPicker
                                    onLocationSelect={handleLocationSelect}
                                    initialLocation={formData.latitude && formData.longitude ? {
                                        lat: formData.latitude,
                                        lng: formData.longitude
                                    } : null}
                                />
                            </div>
                        </div>

                        {/* Facilities */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">🏗️ Facilities Available</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {FACILITY_OPTIONS.map(facility => (
                                    <label key={facility.value} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                                        <input
                                            type="checkbox"
                                            name={`facility_${facility.value}`}
                                            checked={formData.facilities[facility.value] || false}
                                            onChange={handleInputChange}
                                            className="w-4 h-4 text-primary-600"
                                        />
                                        <span className="text-lg">{facility.icon}</span>
                                        <span className="text-sm">{facility.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Current Needs */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">⚠️ Current Urgent Needs</h3>
                            <p className="text-sm text-gray-600 mb-4">Select items that the camp urgently requires</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {NEEDS_OPTIONS.map(need => (
                                    <label key={need} className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition-colors ${formData.needs.includes(need) ? 'bg-warning-50 border-warning-300' : 'hover:bg-gray-50'
                                        }`}>
                                        <input
                                            type="checkbox"
                                            name={`need_${need}`}
                                            checked={formData.needs.includes(need)}
                                            onChange={handleInputChange}
                                            className="w-4 h-4 text-warning-600"
                                        />
                                        <span className="text-sm">{need}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Inventory Access Code */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">📦 Inventory Access Code</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Share this code with a volunteer so they can log camp inventory (received/distributed supplies) at
                                <span className="font-mono"> /camp-inventory</span> without needing an account.
                            </p>
                            <div className="flex items-center gap-4">
                                <div className="font-mono text-2xl tracking-widest bg-gray-100 px-4 py-2 rounded-lg border">
                                    {camp.inventory_access_code || 'Not set'}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleRegenerateCode}
                                    disabled={regeneratingCode}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                                >
                                    {regeneratingCode ? 'Generating...' : camp.inventory_access_code ? 'Regenerate Code' : 'Generate Code'}
                                </button>
                            </div>
                        </div>

                        {/* Additional Information */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">📝 Additional Information</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Special Accommodations
                                    </label>
                                    <textarea
                                        name="special_needs"
                                        value={formData.special_needs}
                                        onChange={handleInputChange}
                                        className="input-field"
                                        rows="2"
                                        placeholder="e.g., Wheelchair accessible, elderly care, medical support needed"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                    <textarea
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleInputChange}
                                        className="input-field"
                                        rows="3"
                                        placeholder="Any additional notes about the camp..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Submit Buttons */}
                        <div className="flex gap-4 justify-end">
                            <Link
                                to="/admin/manage-camps"
                                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={saving}
                                className="btn-primary disabled:opacity-50 flex items-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                        Saving...
                                    </>
                                ) : (
                                    <>💾 Save Changes</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}

export default AdminEditCamp;
