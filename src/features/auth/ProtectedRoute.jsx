import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';

/**
 * ProtectedRoute - Wraps admin routes that require authentication
 * 
 * IMPORTANT: This is ONLY used for admin routes:
 * - /admin/dashboard
 * - /admin/review-requests
 * - /admin/register-camp
 * 
 * All other routes remain PUBLIC - no authentication required.
 */
function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();

    // Show loading state while checking auth
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent mb-4"></div>
                    <p className="text-gray-600">Verifying access...</p>
                </div>
            </div>
        );
    }

    // Redirect to admin login if not authenticated
    if (!user) {
        return <Navigate to="/admin/login" replace />;
    }

    // User is authenticated - render the protected content
    return children;
}

export default ProtectedRoute;
