import React, { useState } from 'react';

/**
 * Delete Confirmation Modal
 * =========================
 * A secure confirmation modal for delete operations
 * Simple confirmation with optional reason
 */
function DeleteConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    itemName,
    itemType = 'record',
    requireReason = false,
    isProcessing = false,
    warningMessage = null
}) {
    const [reason, setReason] = useState('');

    const canConfirm = !requireReason || reason.trim().length > 0;

    const handleConfirm = () => {
        if (canConfirm) {
            onConfirm(reason);
        }
    };

    const handleClose = () => {
        setReason('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
                {/* Warning Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-50 text-danger-700 dark:bg-danger-500/15 dark:text-danger-300">
                        <span className="text-2xl">⚠️</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Confirm Deletion</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">This action cannot be undone</p>
                    </div>
                </div>

                {/* Item Info */}
                <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-sm text-slate-600 mb-1 dark:text-slate-300">You are about to delete:</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{itemName}</p>
                    <p className="text-xs text-slate-500 mt-1 dark:text-slate-400">Type: {itemType}</p>
                </div>

                {/* Custom Warning */}
                {warningMessage && (
                    <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-400/20 dark:bg-amber-500/10">
                        <p className="text-sm text-amber-800 dark:text-amber-200">{warningMessage}</p>
                    </div>
                )}

                {/* Reason Input */}
                {requireReason && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-1 dark:text-slate-300">
                            Reason for deletion <span className="text-danger-400">*</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Enter reason for deletion (required for audit log)"
                            className="h-20 w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-danger-500 focus:ring-2 focus:ring-danger-500 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
                            disabled={isProcessing}
                        />
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                        onClick={handleClose}
                        disabled={isProcessing}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/20 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!canConfirm || isProcessing}
                        className="flex items-center justify-center gap-2 rounded-lg border border-danger-600 bg-danger-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-danger-700 disabled:cursor-not-allowed disabled:border-danger-200 disabled:bg-danger-100 disabled:text-danger-600 dark:disabled:border-danger-400/20 dark:disabled:bg-danger-500/15 dark:disabled:text-danger-300"
                    >
                        {isProcessing ? (
                            <>
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Deleting...
                            </>
                        ) : (
                            <>🗑️ Delete Permanently</>
                        )}
                    </button>
                </div>

                {/* Audit Notice */}
                <p className="mt-4 text-xs text-slate-500 text-center dark:text-slate-400">
                    🔒 This action will be logged for audit purposes
                </p>
            </div>
        </div>
    );
}

export default DeleteConfirmModal;
