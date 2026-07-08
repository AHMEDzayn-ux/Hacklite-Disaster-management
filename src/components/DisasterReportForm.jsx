import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useDisasterStore } from '../store';
import LocationPicker from './LocationPicker';
import LiteModeBanner from './shared/LiteModeBanner';
import { useConnectionQuality } from '../utils/connectionQuality';
import { isOnline, queueOfflineSubmission } from '../utils/offlineManager';

function DisasterReportForm() {
    const { register, handleSubmit, formState: { errors }, reset, control, watch, setValue } = useForm();
    const { addDisaster } = useDisasterStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [fadeOut, setFadeOut] = useState(false);
    const [photoPreview, setPhotoPreview] = useState(null);
    const { isSlow: liteMode } = useConnectionQuality();

    const disasterType = watch('disasterType');
    const testPhotoDataURL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

    const autofillTestData = () => {
        setValue('disasterType', 'flood');
        setValue('severity', 'high');
        setValue('description', 'Heavy rainfall has caused severe flooding in the area. Water levels are rising rapidly. Several homes are affected and people need immediate evacuation.');
        setValue('peopleAffected', '51-100');
        setValue('casualties', 'minor');
        setValue('needs.rescue', true);
        setValue('needs.medical', true);
        setValue('needs.shelter', true);
        setValue('needs.food', true);
        setValue('location', {
            lat: 6.9271,
            lng: 79.8612,
            address: 'Colombo Fort, Colombo'
        });
        setValue('occurredDate', new Date().toISOString().slice(0, 16));
        setValue('areaSize', 'medium');
        setValue('reporterName', 'Nimal Perera');
        setValue('contactNumber', '0771234567');
        setPhotoPreview(testPhotoDataURL);
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('Photo size must be less than 5MB');
                e.target.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const onSubmit = async (data) => {
        setIsSubmitting(true);
        setSubmitSuccess(false);

        try {
            // Convert camelCase to snake_case for database
            const newReport = {
                disaster_type: data.disasterType,
                severity: data.severity,
                description: data.description,
                people_affected: data.peopleAffected || null,
                casualties: data.casualties || null,
                needs: data.needs || {},
                location: data.location,
                occurred_date: data.occurredDate || null,
                area_size: data.areaSize || null,
                reporter_name: data.reporterName,
                contact_number: data.contactNumber,
                photo: photoPreview,
                status: 'Active'
            };

            if (!isOnline()) {
                console.log('📡 Offline - queueing disaster report');
                await queueOfflineSubmission('disaster', newReport);
                alert('📡 You are offline. Your report has been saved and will be submitted automatically when connection returns.');
            } else {
                await addDisaster(newReport);
            }

            setSubmitSuccess(true);
            setFadeOut(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            reset();
            setPhotoPreview(null);

            // Auto-dismiss with fade-out after 2.7 seconds
            setTimeout(() => setFadeOut(true), 2700);
            setTimeout(() => {
                setSubmitSuccess(false);
                setFadeOut(false);
            }, 3000);
        } catch (error) {
            console.error('Error submitting disaster report:', error);
            alert(`Failed to submit report: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="card">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                    🚨 Report Disaster
                </h2>

                {submitSuccess && (
                    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-success-600 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 transition-all duration-300 ease-in-out ${fadeOut ? 'animate-fade-out' : 'animate-fade-in'}`}>
                        <span className="text-2xl">✅</span>
                        <div>
                            <p className="font-bold text-lg">Report Submitted Successfully!</p>
                            <p className="text-sm text-success-100">Your disaster report has been recorded.</p>
                        </div>
                    </div>
                )}

                {liteMode && <LiteModeBanner />}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Disaster Information */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">
                            Disaster Information
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-700 font-medium mb-2">
                                    Disaster Type <span className="text-danger-500">*</span>
                                </label>
                                <select
                                    {...register('disasterType', { required: 'Disaster type is required' })}
                                    className="input-field"
                                >
                                    <option value="">Select type</option>
                                    <option value="flood">Flood</option>
                                    <option value="landslide">Landslide</option>
                                    <option value="fire">Fire</option>
                                    <option value="earthquake">Earthquake</option>
                                    <option value="cyclone">Cyclone/Storm</option>
                                    <option value="drought">Drought</option>
                                    <option value="tsunami">Tsunami</option>
                                    <option value="building-collapse">Building Collapse</option>
                                    <option value="other">Other</option>
                                </select>
                                {errors.disasterType && (
                                    <span className="text-danger-500 text-sm mt-1 block">
                                        {errors.disasterType.message}
                                    </span>
                                )}
                            </div>

                            <div>
                                <label className="block text-gray-700 font-medium mb-2">
                                    Severity Level <span className="text-danger-500">*</span>
                                </label>
                                <select
                                    {...register('severity', { required: 'Severity is required' })}
                                    className="input-field"
                                >
                                    <option value="">Select severity</option>
                                    <option value="low">Low - Minor damage</option>
                                    <option value="moderate">Moderate - Significant damage</option>
                                    <option value="high">High - Severe damage</option>
                                    <option value="critical">Critical - Life threatening</option>
                                </select>
                                {errors.severity && (
                                    <span className="text-danger-500 text-sm mt-1 block">
                                        {errors.severity.message}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Photo Upload - hidden in Lite Mode: a multi-MB base64 image is the
                        single biggest bandwidth cost in this form and could cause the whole
                        submission to fail on a real 2G connection. */}
                    {!liteMode && (
                        <div>
                            <h3 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">
                                📸 Photo Evidence (Optional)
                            </h3>

                            <div className="flex flex-col md:flex-row gap-4 items-start">
                                <div className="flex-1">
                                    <label className="block text-gray-700 font-medium mb-2">
                                        Upload Photo
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        {...register('photo')}
                                        onChange={handlePhotoChange}
                                        className="input-field"
                                    />
                                    <p className="text-sm text-gray-500 mt-1">
                                        Photo helps assess the situation (max 5MB)
                                    </p>
                                </div>

                                {photoPreview && (
                                    <div className="flex-shrink-0">
                                        <img
                                            src={photoPreview}
                                            alt="Preview"
                                            className="w-32 h-32 object-cover rounded-lg border-2 border-primary-300 shadow-md"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Impact Assessment */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">
                            Impact Assessment
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-700 font-medium mb-2">
                                    People Affected (Estimate)
                                </label>
                                <select
                                    {...register('peopleAffected')}
                                    className="input-field"
                                >
                                    <option value="0">None/Unknown</option>
                                    <option value="1-10">1-10 people</option>
                                    <option value="11-50">11-50 people</option>
                                    <option value="51-100">51-100 people</option>
                                    <option value="100+">More than 100</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-gray-700 font-medium mb-2">
                                    Casualties/Injuries
                                </label>
                                <select
                                    {...register('casualties')}
                                    className="input-field"
                                >
                                    <option value="none">None known</option>
                                    <option value="minor">Minor injuries</option>
                                    <option value="serious">Serious injuries</option>
                                    <option value="fatalities">Fatalities reported</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="block text-gray-700 font-medium mb-2">
                                Immediate Needs (Check all that apply)
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" {...register('needs.rescue')} className="w-4 h-4" />
                                    <span className="text-sm">🆘 Rescue</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" {...register('needs.medical')} className="w-4 h-4" />
                                    <span className="text-sm">🏥 Medical</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" {...register('needs.shelter')} className="w-4 h-4" />
                                    <span className="text-sm">🏠 Shelter</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" {...register('needs.food')} className="w-4 h-4" />
                                    <span className="text-sm">🍚 Food</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" {...register('needs.water')} className="w-4 h-4" />
                                    <span className="text-sm">💧 Water</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" {...register('needs.evacuation')} className="w-4 h-4" />
                                    <span className="text-sm">🚶 Evacuation</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Location */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">
                            Location
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <Controller
                                    name="location"
                                    control={control}
                                    rules={{ required: 'Location is required' }}
                                    render={({ field }) => (
                                        <LocationPicker
                                            value={field.value}
                                            onChange={field.onChange}
                                            label="Disaster Location"
                                            required
                                            error={errors.location?.message}
                                        />
                                    )}
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 font-medium mb-2">
                                    Date & Time Occurred
                                </label>
                                <input
                                    type="datetime-local"
                                    {...register('occurredDate')}
                                    className="input-field"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 font-medium mb-2">
                                    Affected Area Size
                                </label>
                                <select
                                    {...register('areaSize')}
                                    className="input-field"
                                >
                                    <option value="small">Small (single building/area)</option>
                                    <option value="medium">Medium (multiple buildings)</option>
                                    <option value="large">Large (neighborhood/village)</option>
                                    <option value="massive">Massive (entire district)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">
                            Your Contact
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-700 font-medium mb-2">
                                    Your Name <span className="text-danger-500">*</span>
                                </label>
                                <input
                                    {...register('reporterName', {
                                        required: 'Your name is required'
                                    })}
                                    className="input-field"
                                    placeholder="Your name"
                                />
                                {errors.reporterName && (
                                    <span className="text-danger-500 text-sm mt-1 block">
                                        {errors.reporterName.message}
                                    </span>
                                )}
                            </div>

                            <div>
                                <label className="block text-gray-700 font-medium mb-2">
                                    Phone Number <span className="text-danger-500">*</span>
                                </label>
                                <input
                                    type="tel"
                                    {...register('contactNumber', {
                                        required: 'Phone number is required',
                                        pattern: {
                                            value: /^[0-9]{10}$/,
                                            message: 'Enter valid 10-digit number'
                                        }
                                    })}
                                    className="input-field"
                                    placeholder="07XXXXXXXX"
                                />
                                {errors.contactNumber && (
                                    <span className="text-danger-500 text-sm mt-1 block">
                                        {errors.contactNumber.message}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Description - Moved to bottom */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">
                            Description
                        </h3>
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">
                                Description <span className="text-danger-500">*</span>
                            </label>
                            <textarea
                                {...register('description', {
                                    required: 'Description is required',
                                    minLength: { value: 10, message: 'Minimum 10 characters' }
                                })}
                                className="input-field"
                                rows="4"
                                placeholder="Describe what happened, extent of damage, current situation, etc."
                            />
                            {errors.description && (
                                <span className="text-danger-500 text-sm mt-1 block">
                                    {errors.description.message}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Submitting...' : '📤 Submit Disaster Report'}
                        </button>
                        <button
                            type="button"
                            onClick={autofillTestData}
                            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                            🧪 Test Autofill
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                reset();
                                setPhotoPreview(null);
                            }}
                            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Clear
                        </button>
                    </div>

                    <p className="text-sm text-gray-600 text-center">
                        <span className="text-danger-500">*</span> Required fields | ✓ Works offline
                    </p>
                </form>
            </div>
        </div>
    );
}

export default DisasterReportForm;
