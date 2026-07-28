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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-white/10 rounded-lg p-6 max-w-md w-full shadow-2xl">
                {/* Warning Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-danger-500/15 rounded-full flex items-center justify-center">
                        <span className="text-2xl">⚠️</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Confirm Deletion</h3>
                        <p className="text-sm text-slate-300">This action cannot be undone</p>
                    </div>
                </div>

                {/* Item Info */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
                    <p className="text-sm text-slate-300 mb-1">You are about to delete:</p>
                    <p className="font-semibold text-white">{itemName}</p>
                    <p className="text-xs text-slate-400 mt-1">Type: {itemType}</p>
                </div>

                {/* Custom Warning */}
                {warningMessage && (
                    <div className="bg-amber-500/10 border border-amber-400/20 rounded-lg p-3 mb-4">
                        <p className="text-sm text-amber-200">{warningMessage}</p>
                    </div>
                )}

                {/* Reason Input */}
                {requireReason && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Reason for deletion <span className="text-danger-400">*</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Enter reason for deletion (required for audit log)"
                            className="w-full px-3 py-2 bg-white/5 border border-white/20 text-white placeholder:text-slate-500 rounded-lg focus:ring-2 focus:ring-danger-500 focus:border-danger-500 h-20 resize-none"
                            disabled={isProcessing}
                        />
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={handleClose}
                        disabled={isProcessing}
                        className="px-4 py-2 border border-white/20 bg-white/5 text-white hover:bg-white/10 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!canConfirm || isProcessing}
                        className="px-4 py-2 bg-danger-600 hover:bg-danger-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                <p className="mt-4 text-xs text-slate-500 text-center">
                    🔒 This action will be logged for audit purposes
                </p>
            </div>
        </div>
    );
}

export default DeleteConfirmModal;
