import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useAnimalRescueStore } from '../store';
import LocationPicker from './LocationPicker';
import LiteModeBanner from './shared/LiteModeBanner';
import { useConnectionQuality } from '../utils/connectionQuality';
import { isOnline, queueOfflineSubmission } from '../utils/offlineManager';
import { IconPawPrint, IconCamera, IconInfo, IconCheck, IconFlask, IconArrowRight } from './icons/Icons';

function AnimalRescueForm() {
    const { register, handleSubmit, formState: { errors }, reset, watch, control, setValue } = useForm();
    const { addAnimalRescue } = useAnimalRescueStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [fadeOut, setFadeOut] = useState(false);
    const [photoPreview, setPhotoPreview] = useState(null);
    const { isSlow: liteMode } = useConnectionQuality();

    const isDangerous = watch('isDangerous');
    const testPhotoDataURL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

    const autofillTestData = () => {
        setValue('animalType', 'dog');
        setValue('breed', 'Labrador Mix');
        setValue('description', 'Large brown dog, appears injured. Limping on front left leg. Seems friendly but scared.');
        setValue('condition', 'injured');
        setValue('isDangerous', false);
        setValue('location', {
            lat: 6.9271,
            lng: 79.8612,
            address: 'Near Galle Face, Colombo'
        });
        setValue('reporterName', 'Saman Fernando');
        setValue('contactNumber', '0771234567');
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
                animal_type: data.animalType,
                breed: data.breed || null,
                description: data.description,
                condition: data.condition,
                is_dangerous: data.isDangerous || false,
                location: data.location,
                reporter_name: data.reporterName,
                contact_number: data.contactNumber,
                photo: photoPreview,
                status: 'Active'
            };

            if (!isOnline()) {
                console.log('📡 Offline - queueing animal rescue report');
                await queueOfflineSubmission('animal_rescue', newReport);
                alert('📡 You are offline. Your report has been saved and will be submitted automatically when connection returns.');
            } else {
                await addAnimalRescue(newReport);
            }

            // Show success message
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
            console.error('Error submitting animal rescue:', error);
            alert(`Failed to submit report: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="card">
                <h2 className="mb-6 flex items-center gap-3 text-2xl font-bold text-white">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-500 text-white shadow-lg shadow-primary-500/30">
                        <IconPawPrint className="h-5 w-5" />
                    </span>
                    Animal Rescue Report
                </h2>

                {liteMode && <LiteModeBanner photoHidden={false} />}

                {submitSuccess && (
                    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-success-600 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 transition-all duration-300 ease-in-out ${fadeOut ? 'animate-fade-out' : 'animate-fade-in'}`}>
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
                            <IconCheck className="h-4 w-4" />
                        </span>
                        <div>
                            <p className="font-bold text-lg">Report Submitted Successfully!</p>
                            <p className="text-sm text-success-100">Your animal rescue request has been recorded.</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Photo Upload - Primary Identification */}
                    <div>
                        <h3 className="mb-4 flex items-center gap-2 border-b border-white/10 pb-2 text-lg font-semibold text-slate-200">
                            <IconCamera className="h-5 w-5 text-slate-400" />
                            Photo
                        </h3>

                        <div className="flex flex-col md:flex-row gap-4 items-start">
                            <div className="flex-1">
                                <label className="block text-slate-200 font-medium mb-2">
                                    Upload Photo <span className="text-danger-500">*</span>
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    {...register('photo', {
                                        required: 'Photo helps rescue team identify the animal'
                                    })}
                                    onChange={handlePhotoChange}
                                    className="input-field"
                                />
                                {errors.photo && (
                                    <span className="text-danger-400 text-sm mt-1 block">
                                        {errors.photo.message}
                                    </span>
                                )}
                                <p className="text-sm text-slate-500 mt-1">
                                    Clear photo showing the animal (max 5MB)
                                </p>
                            </div>

                            {photoPreview && (
                                <div className="flex-shrink-0">
                                    <img
                                        src={photoPreview}
                                        alt="Preview"
                                        className="w-32 h-32 object-cover rounded-lg border-2 border-primary-400/40 shadow-lg shadow-black/30"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Animal Information */}
                    <div>
                        <h3 className="mb-4 border-b border-white/10 pb-2 text-lg font-semibold text-slate-200">
                            Animal Information
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-slate-200 font-medium mb-2">
                                    Animal Type <span className="text-danger-500">*</span>
                                </label>
                                <select
                                    {...register('animalType', { required: 'Animal type is required' })}
                                    className="input-field"
                                >
                                    <option value="">Select type</option>
                                    <option value="dog">Dog</option>
                                    <option value="cat">Cat</option>
                                    <option value="cattle">Cattle (Cow/Buffalo)</option>
                                    <option value="goat">Goat/Sheep</option>
                                    <option value="bird">Bird</option>
                                    <option value="wildlife">Other Wildlife</option>
                                    <option value="other">Other</option>
                                </select>
                                {errors.animalType && (
                                    <span className="text-danger-400 text-sm mt-1 block">
                                        {errors.animalType.message}
                                    </span>
                                )}
                            </div>

                            <div>
                                <label className="block text-slate-200 font-medium mb-2">
                                    Size/Breed (if known)
                                </label>
                                <input
                                    {...register('breed')}
                                    className="input-field"
                                    placeholder="e.g., Large dog, Small cat"
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="block text-slate-200 font-medium mb-2">
                                Description <span className="text-danger-500">*</span>
                            </label>
                            <textarea
                                {...register('description', {
                                    required: 'Description is required'
                                })}
                                className="input-field"
                                rows="2"
                                placeholder="Color, markings, condition, etc."
                            />
                            {errors.description && (
                                <span className="text-danger-400 text-sm mt-1 block">
                                    {errors.description.message}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Safety Information */}
                    <div>
                        <h3 className="mb-4 flex items-center gap-2 border-b border-white/10 pb-2 text-lg font-semibold text-slate-200">
                            <IconInfo className="h-5 w-5 text-danger-400" />
                            Safety Information
                        </h3>

                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    {...register('isDangerous')}
                                    className="mt-1 w-5 h-5 text-danger-500 focus:ring-danger-500"
                                />
                                <div>
                                    <label className="text-slate-200 font-medium">
                                        Animal is dangerous or may bite
                                    </label>
                                    <p className="text-sm text-slate-500">
                                        Check if the animal shows aggressive behavior
                                    </p>
                                </div>
                            </div>

                            {isDangerous && (
                                <div className="bg-danger-500/10 border border-danger-400/30 border-l-4 border-l-danger-500 p-4 rounded">
                                    <p className="flex items-center gap-2 text-danger-200 font-medium mb-2">
                                        <IconInfo className="h-4 w-4 flex-shrink-0 text-danger-300" />
                                        Warning: Professional rescue team required
                                    </p>
                                    <textarea
                                        {...register('dangerDetails')}
                                        className="input-field mt-2"
                                        rows="2"
                                        placeholder="Describe the danger: aggressive, biting, venomous, etc."
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-slate-200 font-medium mb-2">
                                    Condition <span className="text-danger-500">*</span>
                                </label>
                                <select
                                    {...register('condition', { required: 'Condition is required' })}
                                    className="input-field"
                                >
                                    <option value="">Select condition</option>
                                    <option value="healthy">Healthy/Unharmed</option>
                                    <option value="injured">Injured</option>
                                    <option value="trapped">Trapped</option>
                                    <option value="sick">Sick/Weak</option>
                                    <option value="critical">Critical Condition</option>
                                </select>
                                {errors.condition && (
                                    <span className="text-danger-400 text-sm mt-1 block">
                                        {errors.condition.message}
                                    </span>
                                )}
                            </div>

                            <div>
                                <label className="block text-slate-200 font-medium mb-2">
                                    Injury/Health Details (Optional)
                                </label>
                                <textarea
                                    {...register('healthDetails')}
                                    className="input-field"
                                    rows="2"
                                    placeholder="Describe any visible injuries or health issues"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Location */}
                    <div>
                        <h3 className="mb-4 border-b border-white/10 pb-2 text-lg font-semibold text-slate-200">
                            Location
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <Controller
                                    name="location"
                                    control={control}
                                    rules={{ required: 'Location is required for rescue' }}
                                    render={({ field }) => (
                                        <LocationPicker
                                            value={field.value}
                                            onChange={field.onChange}
                                            label="Current Location"
                                            required
                                            error={errors.location?.message}
                                        />
                                    )}
                                />
                            </div>

                            <div>
                                <label className="block text-slate-200 font-medium mb-2">
                                    Accessibility
                                </label>
                                <select
                                    {...register('accessibility')}
                                    className="input-field"
                                >
                                    <option value="easy">Easy Access</option>
                                    <option value="moderate">Moderate (needs tools)</option>
                                    <option value="difficult">Difficult (special equipment needed)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-slate-200 font-medium mb-2">
                                    Date & Time Spotted
                                </label>
                                <input
                                    type="datetime-local"
                                    {...register('spottedDate')}
                                    className="input-field"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 className="mb-4 border-b border-white/10 pb-2 text-lg font-semibold text-slate-200">
                            Your Contact
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-slate-200 font-medium mb-2">
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
                                    <span className="text-danger-400 text-sm mt-1 block">
                                        {errors.reporterName.message}
                                    </span>
                                )}
                            </div>

                            <div>
                                <label className="block text-slate-200 font-medium mb-2">
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
                                    <span className="text-danger-400 text-sm mt-1 block">
                                        {errors.contactNumber.message}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                'Submitting...'
                            ) : (
                                <>
                                    Submit Rescue Request
                                    <IconArrowRight className="h-4 w-4" />
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={autofillTestData}
                            className="px-6 py-2 bg-primary-500/80 text-white rounded-lg hover:bg-primary-500 transition-colors flex items-center justify-center gap-2"
                        >
                            <IconFlask className="h-4 w-4" />
                            Test Autofill
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                reset();
                                setPhotoPreview(null);
                            }}
                            className="px-6 py-2 border border-white/20 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                        >
                            Clear
                        </button>
                    </div>

                    <p className="flex items-center justify-center gap-1.5 text-sm text-slate-400 text-center">
                        <span className="text-danger-500">*</span> Required fields
                        <span className="text-slate-600">|</span>
                        <IconCheck className="h-3.5 w-3.5 text-success-400" />
                        Works offline
                    </p>
                </form>
            </div>
        </div>
    );
}

export default AnimalRescueForm;
