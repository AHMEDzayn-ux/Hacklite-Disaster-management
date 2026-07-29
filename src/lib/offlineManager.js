/**
 * Offline Manager - IndexedDB for storing offline submissions
 * Handles queueing form submissions when offline and retrieving them for sync
 */

const DB_NAME = 'disaster_management_offline';
const DB_VERSION = 1;
const STORES = {
    PENDING_SUBMISSIONS: 'pending_submissions',
    CACHED_DATA: 'cached_data'
};

/**
 * Initialize IndexedDB
 */
const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Store for pending submissions
            if (!db.objectStoreNames.contains(STORES.PENDING_SUBMISSIONS)) {
                const store = db.createObjectStore(STORES.PENDING_SUBMISSIONS, {
                    keyPath: 'id',
                    autoIncrement: true
                });
                store.createIndex('timestamp', 'timestamp', { unique: false });
                store.createIndex('type', 'type', { unique: false });
                store.createIndex('status', 'status', { unique: false });
            }

            // Store for cached data
            if (!db.objectStoreNames.contains(STORES.CACHED_DATA)) {
                const store = db.createObjectStore(STORES.CACHED_DATA, { keyPath: 'key' });
                store.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
};

/**
 * Add a submission to the offline queue
 * @param {string} type - Type of submission (missing_person, disaster, animal_rescue)
 * @param {object} data - Form data to submit
 * @returns {Promise<number>} ID of the queued item
 */
export const queueOfflineSubmission = async (type, data) => {
    try {
        const db = await initDB();
        const transaction = db.transaction([STORES.PENDING_SUBMISSIONS], 'readwrite');
        const store = transaction.objectStore(STORES.PENDING_SUBMISSIONS);

        const submission = {
            type,
            data,
            timestamp: new Date().toISOString(),
            status: 'pending',
            attempts: 0,
            error: null
        };

        return new Promise((resolve, reject) => {
            const request = store.add(submission);
            request.onsuccess = () => {
                console.log(`✓ Queued ${type} submission offline (ID: ${request.result})`);
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error queuing offline submission:', error);
        throw error;
    }
};

/**
 * Get all pending submissions
 * @returns {Promise<Array>} Array of pending submissions
 */
export const getPendingSubmissions = async () => {
    try {
        const db = await initDB();
        const transaction = db.transaction([STORES.PENDING_SUBMISSIONS], 'readonly');
        const store = transaction.objectStore(STORES.PENDING_SUBMISSIONS);

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error getting pending submissions:', error);
        return [];
    }
};

/**
 * Update submission status
 * @param {number} id - Submission ID
 * @param {string} status - New status (pending, syncing, completed, failed)
 * @param {string} error - Error message if failed
 */
export const updateSubmissionStatus = async (id, status, error = null) => {
    try {
        const db = await initDB();
        const transaction = db.transaction([STORES.PENDING_SUBMISSIONS], 'readwrite');
        const store = transaction.objectStore(STORES.PENDING_SUBMISSIONS);

        return new Promise((resolve, reject) => {
            const getRequest = store.get(id);
            
            getRequest.onsuccess = () => {
                const submission = getRequest.result;
                if (!submission) {
                    reject(new Error('Submission not found'));
                    return;
                }

                submission.status = status;
                submission.attempts = (submission.attempts || 0) + 1;
                submission.error = error;
                submission.lastAttempt = new Date().toISOString();

                const updateRequest = store.put(submission);
                updateRequest.onsuccess = () => resolve();
                updateRequest.onerror = () => reject(updateRequest.error);
            };
            
            getRequest.onerror = () => reject(getRequest.error);
        });
    } catch (error) {
        console.error('Error updating submission status:', error);
    }
};

/**
 * Delete a submission from the queue
 * @param {number} id - Submission ID
 */
export const deleteSubmission = async (id) => {
    try {
        const db = await initDB();
        const transaction = db.transaction([STORES.PENDING_SUBMISSIONS], 'readwrite');
        const store = transaction.objectStore(STORES.PENDING_SUBMISSIONS);

        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => {
                console.log(`✓ Deleted submission ${id} from queue`);
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error deleting submission:', error);
    }
};

/**
 * Get count of pending submissions
 * @returns {Promise<number>} Number of pending submissions
 */
export const getPendingCount = async () => {
    try {
        const pending = await getPendingSubmissions();
        return pending.filter(s => s.status === 'pending').length;
    } catch (error) {
        console.error('Error getting pending count:', error);
        return 0;
    }
};

/**
 * Clear all completed submissions older than 7 days
 */
export const cleanupOldSubmissions = async () => {
    try {
        const db = await initDB();
        const transaction = db.transaction([STORES.PENDING_SUBMISSIONS], 'readwrite');
        const store = transaction.objectStore(STORES.PENDING_SUBMISSIONS);
        const index = store.index('status');

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const request = index.openCursor(IDBKeyRange.only('completed'));
        
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                const submission = cursor.value;
                const timestamp = new Date(submission.timestamp);
                
                if (timestamp < sevenDaysAgo) {
                    cursor.delete();
                }
                cursor.continue();
            }
        };
    } catch (error) {
        console.error('Error cleaning up old submissions:', error);
    }
};

/**
 * Check if browser is online
 * @returns {boolean} Online status
 */
export const isOnline = () => {
    return navigator.onLine;
};

/**
 * Get offline storage statistics
 */
export const getStorageStats = async () => {
    try {
        const pending = await getPendingSubmissions();
        const byType = pending.reduce((acc, submission) => {
            acc[submission.type] = (acc[submission.type] || 0) + 1;
            return acc;
        }, {});

        return {
            total: pending.length,
            pending: pending.filter(s => s.status === 'pending').length,
            syncing: pending.filter(s => s.status === 'syncing').length,
            failed: pending.filter(s => s.status === 'failed').length,
            completed: pending.filter(s => s.status === 'completed').length,
            byType
        };
    } catch (error) {
        console.error('Error getting storage stats:', error);
        return { total: 0, pending: 0, syncing: 0, failed: 0, completed: 0, byType: {} };
    }
};

// Initialize DB and cleanup on module load
initDB().then(() => {
    console.log('✓ Offline database initialized');
    cleanupOldSubmissions();
}).catch(error => {
    console.error('Failed to initialize offline database:', error);
});
