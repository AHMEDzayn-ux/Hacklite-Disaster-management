import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useMissingPersonStore } from '../store';
import LocationPicker from './LocationPicker';
import LiteModeBanner from './shared/LiteModeBanner';
import { useConnectionQuality } from '../utils/connectionQuality';
import { isOnline, queueOfflineSubmission } from '../utils/offlineManager';
import { IconCamera, IconCheck, IconArrowRight } from '../components/icons/Icons';

function MissingPersonForm() {
    const { register, handleSubmit, formState: { errors }, reset, control, setValue } = useForm();
    const { addMissingPerson } = useMissingPersonStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [fadeOut, setFadeOut] = useState(false);
    const [photoPreview, setPhotoPreview] = useState(null);
    const { isSlow: liteMode } = useConnectionQuality();

    // Sample test photo (1x1 red pixel PNG)
    const testPhotoDataURL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

    const autofillTestData = () => {
        setValue('name', 'John Silva');
        setValue('age', '35');
        setValue('gender', 'male');
        setValue('description', 'Wearing blue shirt and black pants. Has a scar on left arm.');
        setValue('lastSeenLocation', {
            lat: 6.9271,
            lng: 79.8612,
            address: 'Colombo Fort Railway Station, Colombo'
        });
        setValue('lastSeenDate', new Date().toISOString().slice(0, 16));
        setValue('reporterName', 'Mary Silva');
        setValue('contactNumber', '0771234567');
        setValue('additionalInfo', 'Last seen near the bus station around 3 PM.');
        setPhotoPreview(testPhotoDataURL);
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Check file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('Photo size must be less than 5MB');
                e.target.value = '';
                return;
            }

            // Create preview
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
                name: data.name,
                age: parseInt(data.age),
                gender: data.gender,
                description: data.description || null,
                last_seen_location: data.lastSeenLocation,
                last_seen_date: data.lastSeenDate,
                reporter_name: data.reporterName,
                contact_number: data.contactNumber,
                additional_info: data.additionalInfo || null,
                photo: photoPreview,
                status: 'Active'
            };

            // Check if offline
            if (!isOnline()) {
                console.log('📡 Offline - queueing missing person report');
                await queueOfflineSubmission('missing_person', newReport);

                // Show offline success message
                alert('📡 You are offline. Your report has been saved and will be submitted automatically when connection returns.');
            } else {
                // Online - submit normally
                await addMissingPerson(newReport);
            }

            // Show success message and scroll to top
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
            console.error('Error submitting missing person:', error);
            alert(`Failed to submit report: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="card">
                <h2 className="text-2xl font-bold text-white mb-6">
                    Report Missing Person
                </h2>

                {liteMode && <LiteModeBanner photoHidden={false} />}

                {submitSuccess && (
                    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-success-600 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 transition-all duration-300 ease-in-out ${fadeOut ? 'animate-fade-out' : 'animate-fade-in'}`}>
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
                            <IconCheck className="h-5 w-5" />
                        </span>
                        <div>
                            <p className="font-bold text-lg">Report Submitted Successfully!</p>
                            <p className="text-sm text-success-100">Your missing person report has been recorded.</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Photo Upload - Most Important */}
                    <div>
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-200 mb-4 border-b border-white/10 pb-2">
                            <IconCamera className="h-5 w-5 text-fuchsia-400" />
                            Photo (Primary Identification)
                        </h3>

                        <div className="flex flex-col md:flex-row gap-4 items-start">
                            <div className="flex-1">
                                <label className="block text-slate-300 font-semibold mb-2">
                                    Upload Photo <span className="text-danger-500">*</span>
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    {...register('photo', {
                                        required: 'Photo is required for identification'
                                    })}
                                    onChange={handlePhotoChange}
                                    className="input-field"
                                />
                                {errors.photo && (
                                    <span className="text-danger-500 text-sm mt-1 block">
                                        {errors.photo.message}
                                    </span>
                                )}
                                <p className="text-sm text-slate-400 mt-1">
                                    Clear, recent photo (max 5MB). Works offline.
                                </p>
                            </div>

                            {photoPreview && (
                                <div className="flex-shrink-0">
                                    <img
                                        src={photoPreview}
                                        alt="Preview"
                                        className="w-32 h-32 object-cover rounded-lg border-2 border-primary-400/50 shadow-md"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Basic Information */}
                    <div>
                        <h3 className="text-lg font-semibold text-slate-200 mb-4 border-b border-white/10 pb-2">
                            Basic Information
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-slate-300 font-semibold mb-2">
                                    Name <span className="text-danger-500">*</span>
                                </label>
                                <input
                                    {...register('name', {
                                        required: 'Name is required',
                                        minLength: { value: 2, message: 'Minimum 2 characters' }
                                    })}
                                    className="input-field"
                                    placeholder="Enter name"
                                />
                                {errors.name && (
                                    <span className="text-danger-500 text-sm mt-1 block">
                                        {errors.name.message}
                                    </span>
                                )}
                            </div>

                            <div>
                                <label className="block text-slate-300 font-semibold mb-2">
                                    Age <span className="text-danger-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    {...register('age', {
                                        required: 'Age is required',
                                        min: { value: 0, message: 'Invalid age' },
                                        max: { value: 150, message: 'Invalid age' }
                                    })}
                                    className="input-field"
                                    placeholder="Enter age"
                                />
                                {errors.age && (
                                    <span className="text-danger-500 text-sm mt-1 block">
                                        {errors.age.message}
                                    </span>
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-slate-300 font-semibold mb-2">
                                    Gender <span className="text-danger-500">*</span>
                                </label>
                                <select
                                    {...register('gender', { required: 'Gender is required' })}
                                    className="input-field"
                                >
                                    <option value="">Select gender</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                                {errors.gender && (
                                    <span className="text-danger-500 text-sm mt-1 block">
                                        {errors.gender.message}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="block text-slate-300 font-semibold mb-2">
                                Description (Optional)
                            </label>
                            <textarea
                                {...register('description')}
                                className="input-field"
                                rows="2"
                                placeholder="Clothing, distinguishing features, etc."
                            />
                        </div>
                    </div>

                    {/* Last Seen */}
                    <div>
                        <h3 className="text-lg font-semibold text-slate-200 mb-4 border-b border-white/10 pb-2">
                            Last Seen
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <Controller
                                    name="lastSeenLocation"
                                    control={control}
                                    rules={{ required: 'Location is required' }}
                                    render={({ field }) => (
                                        <LocationPicker
                                            value={field.value}
                                            onChange={field.onChange}
                                            label="Last Seen Location"
                                            required
                                            error={errors.lastSeenLocation?.message}
                                        />
                                    )}
                                />
                            </div>

                            <div>
                                <label className="block text-slate-300 font-semibold mb-2">
                                    Date & Time <span className="text-danger-500">*</span>
                                </label>
                                <input
                                    type="datetime-local"
                                    {...register('lastSeenDate', {
                                        required: 'Date is required'
                                    })}
                                    className="input-field"
                                />
                                {errors.lastSeenDate && (
                                    <span className="text-danger-500 text-sm mt-1 block">
                                        {errors.lastSeenDate.message}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 className="text-lg font-semibold text-slate-200 mb-4 border-b border-white/10 pb-2">
                            Your Contact
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-slate-300 font-semibold mb-2">
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
                                <label className="block text-slate-300 font-semibold mb-2">
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

                    {/* Additional Info */}
                    <div>
                        <label className="block text-slate-300 font-semibold mb-2">
                            Additional Information (Optional)
                        </label>
                        <textarea
                            {...register('additionalInfo')}
                            className="input-field"
                            rows="2"
                            placeholder="Any other details that might help..."
                        />
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? 'Submitting...' : (
                                <>
                                    Submit Report
                                    <IconArrowRight className="h-4 w-4" />
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={autofillTestData}
                            className="px-6 py-2 rounded-lg bg-primary-500/80 text-white hover:bg-primary-500 transition-colors"
                        >
                            Test Autofill
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                reset();
                                setPhotoPreview(null);
                            }}
                            className="px-6 py-2 rounded-lg border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-colors"
                        >
                            Clear
                        </button>
                    </div>

                    <p className="text-sm text-slate-400 text-center">
                        <span className="text-danger-500">*</span> Required fields | ✓ Works offline
                    </p>
                </form>
            </div>
        </div>
    );
}

export default MissingPersonForm;
