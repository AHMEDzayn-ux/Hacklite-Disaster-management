/**
 * Sync Handler - Upload queued offline submissions when connection returns
 * Handles background sync and retry logic
 */

import { 
    getPendingSubmissions, 
    updateSubmissionStatus, 
    deleteSubmission,
    isOnline 
} from '@/lib/offlineManager';
import { createDocument, TABLES } from '@/lib/supabaseService';

// Map submission types to Supabase tables
const TYPE_TO_TABLE = {
    'missing_person': TABLES.MISSING_PERSONS,
    'disaster': TABLES.DISASTERS,
    'animal_rescue': TABLES.ANIMAL_RESCUES
};

/**
 * Sync a single submission to Supabase
 * @param {object} submission - Submission object from IndexedDB
 * @returns {Promise<boolean>} Success status
 */
const syncSubmission = async (submission) => {
    try {
        const table = TYPE_TO_TABLE[submission.type];
        if (!table) {
            throw new Error(`Unknown submission type: ${submission.type}`);
        }

        // Update status to syncing
        await updateSubmissionStatus(submission.id, 'syncing');

        // Upload to Supabase
        await createDocument(table, submission.data);

        // Mark as completed
        await updateSubmissionStatus(submission.id, 'completed');
        
        // Delete from queue after successful sync
        await deleteSubmission(submission.id);

        console.log(`✓ Synced ${submission.type} submission (ID: ${submission.id})`);
        return true;
    } catch (error) {
        console.error(`✗ Failed to sync ${submission.type} submission:`, error);
        
        // Mark as failed
        await updateSubmissionStatus(submission.id, 'failed', error.message);
        return false;
    }
};

/**
 * Sync all pending submissions
 * @returns {Promise<object>} Sync results
 */
export const syncAllPending = async () => {
    if (!isOnline()) {
        console.log('⚠ Cannot sync: offline');
        return { success: 0, failed: 0, skipped: 0 };
    }

    try {
        const pending = await getPendingSubmissions();
        const toSync = pending.filter(s => s.status === 'pending' || s.status === 'failed');

        if (toSync.length === 0) {
            console.log('✓ No pending submissions to sync');
            return { success: 0, failed: 0, skipped: 0 };
        }

        console.log(`⬆ Syncing ${toSync.length} pending submission(s)...`);

        const results = {
            success: 0,
            failed: 0,
            skipped: 0
        };

        // Sync submissions one by one
        for (const submission of toSync) {
            // Skip if too many attempts (max 5)
            if (submission.attempts >= 5) {
                console.log(`⏩ Skipping submission ${submission.id} (max attempts reached)`);
                results.skipped++;
                continue;
            }

            const success = await syncSubmission(submission);
            if (success) {
                results.success++;
            } else {
                results.failed++;
            }

            // Small delay between requests to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log(`✓ Sync complete: ${results.success} success, ${results.failed} failed, ${results.skipped} skipped`);
        return results;
    } catch (error) {
        console.error('Error during sync:', error);
        return { success: 0, failed: 0, skipped: 0, error: error.message };
    }
};

/**
 * Start automatic background sync when connection is restored
 */
export const startAutoSync = () => {
    // Listen for online event
    window.addEventListener('online', async () => {
        console.log('✓ Connection restored - starting auto sync...');
        
        // Wait a bit for connection to stabilize
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Sync all pending submissions
        const results = await syncAllPending();
        
        // Notify user if there were submissions synced
        if (results.success > 0) {
            showSyncNotification(`✓ ${results.success} offline submission(s) uploaded successfully!`);
        }
        
        if (results.failed > 0) {
            showSyncNotification(`⚠ ${results.failed} submission(s) failed to upload. Will retry later.`, 'warning');
        }
    });

    // Listen for offline event
    window.addEventListener('offline', () => {
        console.log('⚠ Connection lost - submissions will be queued');
        showSyncNotification('📡 You are offline. Submissions will be saved and uploaded when connection returns.', 'info');
    });

    // Try to sync on app load if online
    if (isOnline()) {
        console.log('✓ App online - checking for pending submissions...');
        setTimeout(() => syncAllPending(), 3000);
    }

    // Periodic sync every 5 minutes if online
    setInterval(async () => {
        if (isOnline()) {
            await syncAllPending();
        }
    }, 5 * 60 * 1000);
};

/**
 * Show sync notification to user
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, warning, info)
 */
const showSyncNotification = (message, type = 'success') => {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-20 right-4 z-[9999] p-4 rounded-lg shadow-lg max-w-sm transition-all transform ${
        type === 'success' ? 'bg-success-500 text-white' :
        type === 'warning' ? 'bg-warning-500 text-white' :
        'bg-primary-500 text-white'
    }`;
    notification.textContent = message;
    notification.style.animation = 'slideInRight 0.3s ease-out';

    document.body.appendChild(notification);

    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 5000);
};

/**
 * Register background sync (if supported)
 */
export const registerBackgroundSync = async () => {
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.sync.register('sync-submissions');
            console.log('✓ Background sync registered');
        } catch (error) {
            console.log('⚠ Background sync not available:', error.message);
        }
    }
};

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
