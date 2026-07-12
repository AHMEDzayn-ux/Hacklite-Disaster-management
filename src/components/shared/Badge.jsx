import React from 'react';

/**
 * Reusable badge component for displaying status, severity, and other categorical data
 * @param {string} type - The type of badge ('status', 'severity', 'condition', 'danger', 'custom')
 * @param {string} value - The value to display
 * @param {string} customClass - Optional custom className override
 */
function Badge({ type, value, customClass }) {
    const getBadgeClass = () => {
        if (customClass) return customClass;

        // Status badges (Active, Rescued, Resolved, Closed, etc.)
        if (type === 'status') {
            const statusClasses = {
                'Active': 'bg-danger-500/15 text-danger-300',
                'Rescued': 'bg-success-500/15 text-success-300',
                'Resolved': 'bg-success-500/15 text-success-300',
                'Closed': 'bg-white/10 text-slate-300',
            };
            return statusClasses[value] || 'bg-white/10 text-slate-300';
        }

        // Severity badges (Critical, High, Moderate, Low)
        if (type === 'severity') {
            const severityClasses = {
                'critical': 'bg-danger-600 text-white',
                'high': 'bg-amber-600 text-white',
                'moderate': 'bg-amber-400 text-white',
                'low': 'bg-success-600 text-white',
            };
            return severityClasses[value] || 'bg-white/10 text-slate-300';
        }

        // Condition badges (Critical, Injured, Healthy, Unknown)
        if (type === 'condition') {
            const conditionClasses = {
                'critical': 'bg-danger-600 text-white',
                'injured': 'bg-amber-600 text-white',
                'healthy': 'bg-success-600 text-white',
                'unknown': 'bg-gray-500 text-white',
            };
            return conditionClasses[value?.toLowerCase()] || 'bg-white/10 text-slate-300';
        }

        // Danger badge
        if (type === 'danger') {
            return 'bg-danger-600 text-white';
        }

        // Stock badges
        if (type === 'stock') {
            const stockClasses = {
                'adequate': 'bg-success-500/15 text-success-300',
                'low': 'bg-amber-500/15 text-amber-300',
                'critical': 'bg-danger-500/15 text-danger-300',
                'none': 'bg-white/10 text-slate-300'
            };
            return stockClasses[value] || 'bg-white/10 text-slate-300';
        }

        return 'bg-white/10 text-slate-300';
    };

    return (
        <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getBadgeClass()}`}>
            {value}
        </span>
    );
}

export default Badge;
