import React from 'react';

/**
 * Shown on citizen report forms when a slow connection (2G/save-data) is
 * detected. Explains why the photo field is hidden - a multi-MB base64
 * image embedded in the submission is the single biggest bandwidth cost in
 * these forms, and would very plausibly cause a submission to fail/time out
 * on a real 2G connection, defeating the point of "works when the network is
 * bad." Text still goes through normally, and the offline queue (see
 * syncHandler.startAutoSync) covers a connection that drops entirely.
 */
function LiteModeBanner({ photoHidden = true }) {
    return (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <span className="text-lg">📶</span>
            <div className="text-sm text-amber-800">
                <strong>Lite Mode:</strong> Slow connection detected.{' '}
                {photoHidden
                    ? 'Photo attachment is hidden to keep your report small enough to send. Text and location will still be submitted normally.'
                    : 'The photo below is required and may take longer to upload - if it fails, your report is still saved offline and will retry automatically.'}
            </div>
        </div>
    );
}

export default LiteModeBanner;
