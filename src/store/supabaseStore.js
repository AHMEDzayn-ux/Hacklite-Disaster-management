import { create } from 'zustand';
import { 
    createDocument, 
    getAllDocuments, 
    updateDocument, 
    deleteDocument,
    subscribeToTable,
    TABLES
} from '@/lib/supabaseService';

/**
 * Supabase-integrated Zustand stores
 * Combines local state management with Supabase real-time sync
 */

// Missing Persons Store
export const useMissingPersonStore = create((set, get) => ({
    missingPersons: [],
    loading: false,
    error: null,
    unsubscribe: null,
    isInitialized: false,

    // Initialize real-time listener
    subscribeToMissingPersons: async () => {
        // Skip if already initialized and subscribed
        const { isInitialized, unsubscribe } = get();
        if (isInitialized && unsubscribe) {
            return;
        }
        
        set({ loading: true });
        const unsubscribeFn = await subscribeToTable(
            TABLES.MISSING_PERSONS,
            (persons, appendMode = false) => {
                // Ensure persons is always an array
                const safePersons = Array.isArray(persons) ? persons : [];
                
                if (appendMode) {
                    // Append new data, filtering out duplicates
                    set((state) => {
                        const existingIds = new Set(state.missingPersons.map(p => p.id));
                        const newPersons = safePersons.filter(p => !existingIds.has(p.id));
                        return { 
                            missingPersons: [...state.missingPersons, ...newPersons]
                        };
                    });
                } else {
                    // Replace all data
                    set({ 
                        missingPersons: safePersons, 
                        loading: false, 
                        error: null, 
                        isInitialized: true 
                    });
                }
            }
        );
        set({ unsubscribe: unsubscribeFn });
    },

    // Unsubscribe from listener
    unsubscribeFromMissingPersons: () => {
        const { unsubscribe } = get();
        if (unsubscribe) {
            unsubscribe();
            set({ unsubscribe: null });
        }
    },

    // Fetch all
    fetchMissingPersons: async () => {
        try {
            set({ loading: true, error: null });
            const persons = await getAllDocuments(TABLES.MISSING_PERSONS);
            set({ missingPersons: persons, loading: false });
        } catch (error) {
            set({ error: error.message, loading: false });
        }
    },

    // Add missing person
    addMissingPerson: async (person) => {
        try {
            set({ loading: true, error: null });
            const newPerson = await createDocument(TABLES.MISSING_PERSONS, person);
            set((state) => ({
                missingPersons: [newPerson, ...state.missingPersons],
                loading: false
            }));
            return newPerson;
        } catch (error) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    // Update missing person
    updateMissingPerson: async (id, updatedPerson) => {
        try {
            set({ loading: true, error: null });
            await updateDocument(TABLES.MISSING_PERSONS, id, updatedPerson);
            set((state) => ({
                missingPersons: state.missingPersons.map(person =>
                    person.id === id ? { ...person, ...updatedPerson } : person
                ),
                loading: false
            }));
        } catch (error) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    // Delete missing person
    deleteMissingPerson: async (id) => {
        try {
            set({ loading: true, error: null });
            await deleteDocument(TABLES.MISSING_PERSONS, id);
            set((state) => ({
                missingPersons: state.missingPersons.filter(person => person.id !== id),
                loading: false
            }));
        } catch (error) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    // Mark as found by responder
    markFoundByResponder: async (id, foundByContact, foundNotes) => {
        try {
            const updates = {
                status: 'Resolved',
                found_at: new Date().toISOString(),
                found_by_contact: foundByContact,
                found_notes: foundNotes,
                updated_at: new Date().toISOString()
            };
            await updateDocument(TABLES.MISSING_PERSONS, id, updates);
            set((state) => ({
                missingPersons: state.missingPersons.map(person =>
                    person.id === id ? { ...person, ...updates } : person
                )
            }));
        } catch (error) {
            set({ error: error.message });
            throw error;
        }
    },
}));

// Disaster Reports Store
export const useDisasterStore = create((set, get) => ({
    disasters: [],
    loading: false,
    error: null,
    unsubscribe: null,
    isInitialized: false,

    subscribeToDisasters: async () => {
        // Skip if already initialized and subscribed
        const { isInitialized, unsubscribe } = get();
        if (isInitialized && unsubscribe) {
            return;
        }
        
        set({ loading: true });
        const unsubscribeFn = await subscribeToTable(
            TABLES.DISASTERS,
            (disasters, appendMode = false) => {
                // Ensure disasters is always an array
                const safeDisasters = Array.isArray(disasters) ? disasters : [];
                
                if (appendMode) {
                    set((state) => {
                        const existingIds = new Set(state.disasters.map(d => d.id));
                        const newDisasters = safeDisasters.filter(d => !existingIds.has(d.id));
                        return { 
                            disasters: [...state.disasters, ...newDisasters]
                        };
                    });
                } else {
                    set({ 
                        disasters: safeDisasters, 
                        loading: false, 
                        error: null, 
                        isInitialized: true 
                    });
                }
            }
        );
        set({ unsubscribe: unsubscribeFn });
    },

    unsubscribeFromDisasters: () => {
        const { unsubscribe } = get();
        if (unsubscribe) {
            unsubscribe();
            set({ unsubscribe: null });
        }
    },

    fetchDisasters: async () => {
        try {
            set({ loading: true, error: null });
            const disasters = await getAllDocuments(TABLES.DISASTERS);
            set({ disasters, loading: false });
        } catch (error) {
            set({ error: error.message, loading: false });
        }
    },

    addDisaster: async (disaster) => {
        try {
            set({ loading: true, error: null });
            const newDisaster = await createDocument(TABLES.DISASTERS, disaster);
            set((state) => ({
                disasters: [newDisaster, ...state.disasters],
                loading: false
            }));
            return newDisaster;
        } catch (error) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    updateDisaster: async (id, updatedDisaster) => {
        try {
            set({ loading: true, error: null });
            await updateDocument(TABLES.DISASTERS, id, updatedDisaster);
            set((state) => ({
                disasters: state.disasters.map(disaster =>
                    disaster.id === id ? { ...disaster, ...updatedDisaster } : disaster
                ),
                loading: false
            }));
        } catch (error) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    deleteDisaster: async (id) => {
        try {
            set({ loading: true, error: null });
            await deleteDocument(TABLES.DISASTERS, id);
            set((state) => ({
                disasters: state.disasters.filter(disaster => disaster.id !== id),
                loading: false
            }));
        } catch (error) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    // Mark disaster as resolved
    markResolvedByResponder: async (id, resolvedBy, responderNotes) => {
        try {
            set({ loading: true, error: null });
            const updates = {
                status: 'Resolved',
                resolved_at: new Date().toISOString(),
                resolved_by: resolvedBy,
                responder_notes: responderNotes,
                updated_at: new Date().toISOString()
            };
            await updateDocument(TABLES.DISASTERS, id, updates);
            set((state) => ({
                disasters: state.disasters.map(disaster =>
                    disaster.id === id ? { ...disaster, ...updates } : disaster
                ),
                loading: false
            }));
        } catch (error) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },
}));

// Animal Rescue Store
export const useAnimalRescueStore = create((set, get) => ({
    animalRescues: [],
    loading: false,
    error: null,
    unsubscribe: null,
    isInitialized: false,

    subscribeToAnimalRescues: async () => {
        // Skip if already initialized and subscribed
        const { isInitialized, unsubscribe } = get();
        if (isInitialized && unsubscribe) {
            return;
        }
        
        set({ loading: true });
        const unsubscribeFn = await subscribeToTable(
            TABLES.ANIMAL_RESCUES,
            (rescues, appendMode = false) => {
                // Ensure rescues is always an array
                const safeRescues = Array.isArray(rescues) ? rescues : [];
                
                if (appendMode) {
                    set((state) => {
                        const existingIds = new Set(state.animalRescues.map(r => r.id));
                        const newRescues = safeRescues.filter(r => !existingIds.has(r.id));
                        return { 
                            animalRescues: [...state.animalRescues, ...newRescues]
                        };
                    });
                } else {
                    set({ 
                        animalRescues: safeRescues, 
                        loading: false, 
                        error: null, 
                        isInitialized: true 
                    });
                }
            }
        );
        set({ unsubscribe: unsubscribeFn });
    },

    unsubscribeFromAnimalRescues: () => {
        const { unsubscribe } = get();
        if (unsubscribe) {
            unsubscribe();
            set({ unsubscribe: null });
        }
    },

    fetchAnimalRescues: async () => {
        try {
            set({ loading: true, error: null });
            const rescues = await getAllDocuments(TABLES.ANIMAL_RESCUES);
            set({ animalRescues: rescues, loading: false });
        } catch (error) {
            set({ error: error.message, loading: false });
        }
    },

    addAnimalRescue: async (rescue) => {
        try {
            set({ loading: true, error: null });
            const newRescue = await createDocument(TABLES.ANIMAL_RESCUES, rescue);
            set((state) => ({
                animalRescues: [newRescue, ...state.animalRescues],
                loading: false
            }));
            return newRescue;
        } catch (error) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    updateAnimalRescue: async (id, updatedRescue) => {
        try {
            set({ loading: true, error: null });
            await updateDocument(TABLES.ANIMAL_RESCUES, id, updatedRescue);
            set((state) => ({
                animalRescues: state.animalRescues.map(rescue =>
                    rescue.id === id ? { ...rescue, ...updatedRescue } : rescue
                ),
                loading: false
            }));
        } catch (error) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    deleteAnimalRescue: async (id) => {
        try {
            set({ loading: true, error: null });
            await deleteDocument(TABLES.ANIMAL_RESCUES, id);
            set((state) => ({
                animalRescues: state.animalRescues.filter(rescue => rescue.id !== id),
                loading: false
            }));
        } catch (error) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    // Mark as rescued by responder
    markFoundByResponder: async (id, foundByContact, foundNotes) => {
        try {
            const updates = {
                status: 'Resolved',
                found_at: new Date().toISOString(),
                found_by_contact: foundByContact,
                found_notes: foundNotes,
                updated_at: new Date().toISOString()
            };
            await updateDocument(TABLES.ANIMAL_RESCUES, id, updates);
            set((state) => ({
                animalRescues: state.animalRescues.map(rescue =>
                    rescue.id === id ? { ...rescue, ...updates } : rescue
                )
            }));
        } catch (error) {
            set({ error: error.message });
            throw error;
        }
    },
}));

// Camps Store
export const useCampStore = create((set, get) => ({
    camps: [],
    loading: false,
    error: null,
    unsubscribe: null,
    isInitialized: false,

    subscribeToCamps: async () => {
        // Skip if already initialized and subscribed
        const { isInitialized, unsubscribe } = get();
        if (isInitialized && unsubscribe) {
            return;
        }
        
        set({ loading: true });
        const unsubscribeFn = await subscribeToTable(
            TABLES.CAMPS,
            (camps, appendMode = false) => {
                // Ensure camps is always an array
                const safeCamps = Array.isArray(camps) ? camps : [];
                
                if (appendMode) {
                    set((state) => {
                        const existingIds = new Set(state.camps.map(c => c.id));
                        const newCamps = safeCamps.filter(c => !existingIds.has(c.id));
                        return { 
                            camps: [...state.camps, ...newCamps]
                        };
                    });
                } else {
                    set({ 
                        camps: safeCamps, 
                        loading: false, 
                        error: null, 
                        isInitialized: true 
                    });
                }
            }
        );
        set({ unsubscribe: unsubscribeFn });
    },

    unsubscribeFromCamps: () => {
        const { unsubscribe } = get();
        if (unsubscribe) {
            unsubscribe();
            set({ unsubscribe: null });
        }
    },

    fetchCamps: async () => {
        try {
            set({ loading: true, error: null });
            const camps = await getAllDocuments(TABLES.CAMPS);
            set({ camps, loading: false });
        } catch (error) {
            set({ error: error.message, loading: false });
        }
    },

    addCamp: async (camp) => {
        try {
            set({ loading: true, error: null });
            const newCamp = await createDocument(TABLES.CAMPS, camp);
            set((state) => ({
                camps: [newCamp, ...state.camps],
                loading: false
            }));
            return newCamp;
        } catch (error) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    updateCamp: async (id, updatedCamp) => {
        try {
            set({ loading: true, error: null });
            await updateDocument(TABLES.CAMPS, id, updatedCamp);
            set((state) => ({
                camps: state.camps.map(camp =>
                    camp.id === id ? { ...camp, ...updatedCamp } : camp
                ),
                loading: false
            }));
        } catch (error) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    deleteCamp: async (id) => {
        try {
            set({ loading: true, error: null });
            await deleteDocument(TABLES.CAMPS, id);
            set((state) => ({
                camps: state.camps.filter(camp => camp.id !== id),
                loading: false
            }));
        } catch (error) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },
}));

// Donations Store
export const useDonationStore = create((set, get) => ({
    donations: [],
    totalRaised: 0,
    donationStats: {
        totalAmount: 0,
        totalCount: 0,
        avgDonation: 0,
        successfulCount: 0,
        pendingCount: 0
    },
    loading: false,
    error: null,
    unsubscribe: null,
    isInitialized: false,

    // Initialize real-time listener
    subscribeToDonations: async () => {
        const { isInitialized, unsubscribe } = get();
        if (isInitialized && unsubscribe) {
            return;
        }
        
        set({ loading: true });
        const unsubscribeFn = await subscribeToTable(
            TABLES.DONATIONS,
            (donations, appendMode = false) => {
                if (appendMode) {
                    set((state) => {
                        const existingIds = new Set(state.donations.map(d => d.id));
                        const newDonations = donations.filter(d => !existingIds.has(d.id));
                        return { 
                            donations: [...state.donations, ...newDonations]
                        };
                    });
                } else {
                    // Calculate total from successful payments
                    const total = donations
                        .filter(d => d.stripe_payment_status === 'succeeded')
                        .reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
                    
                    set({ 
                        donations,
                        totalRaised: total,
                        loading: false, 
                        error: null, 
                        isInitialized: true 
                    });
                }
                
                // Update stats
                get().calculateStats();
            }
        );
        set({ unsubscribe: unsubscribeFn });
    },

    unsubscribeFromDonations: () => {
        const { unsubscribe } = get();
        if (unsubscribe) {
            unsubscribe();
            set({ unsubscribe: null });
        }
    },

    // Calculate donation statistics
    calculateStats: () => {
        const { donations } = get();
        const successful = donations.filter(d => d.stripe_payment_status === 'succeeded');
        const pending = donations.filter(d => d.stripe_payment_status === 'pending');
        
        const totalAmount = successful.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
        const avgDonation = successful.length > 0 ? totalAmount / successful.length : 0;
        
        set({
            donationStats: {
                totalAmount,
                totalCount: donations.length,
                avgDonation,
                successfulCount: successful.length,
                pendingCount: pending.length
            },
            totalRaised: totalAmount
        });
    },

    // Fetch all donations
    fetchDonations: async () => {
        try {
            set({ loading: true, error: null });
            const donations = await getAllDocuments(TABLES.DONATIONS);
            const total = donations
                .filter(d => d.stripe_payment_status === 'succeeded')
                .reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
            
            set({ donations, totalRaised: total, loading: false });
            get().calculateStats();
        } catch (error) {
            set({ error: error.message, loading: false });
        }
    },

    // Add donation (called after Stripe payment intent created)
    addDonation: async (donation) => {
        try {
            set({ loading: true, error: null });
            const newDonation = await createDocument(TABLES.DONATIONS, donation);
            set((state) => ({
                donations: [newDonation, ...state.donations],
                loading: false
            }));
            get().calculateStats();
            return newDonation;
        } catch (error) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    // Update donation (for Stripe webhook status updates)
    updateDonation: async (id, updatedDonation) => {
        try {
            set({ loading: true, error: null });
            await updateDocument(TABLES.DONATIONS, id, updatedDonation);
            set((state) => ({
                donations: state.donations.map(donation =>
                    donation.id === id ? { ...donation, ...updatedDonation } : donation
                ),
                loading: false
            }));
            get().calculateStats();
        } catch (error) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    // Update payment status (webhook callback)
    updatePaymentStatus: async (stripePaymentId, status) => {
        try {
            const { donations } = get();
            const donation = donations.find(d => d.stripe_payment_id === stripePaymentId);
            
            if (donation) {
                await get().updateDonation(donation.id, {
                    stripe_payment_status: status,
                    updated_at: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error('Error updating payment status:', error);
            throw error;
        }
    },

    deleteDonation: async (id) => {
        try {
            set({ loading: true, error: null });
            await deleteDocument(TABLES.DONATIONS, id);
            set((state) => ({
                donations: state.donations.filter(donation => donation.id !== id),
                loading: false
            }));
            get().calculateStats();
        } catch (error) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },
}));
