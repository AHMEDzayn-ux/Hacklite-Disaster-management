import { useContext } from 'react';
import { AuthContext } from '@/features/auth/authContext';

/**
 * Access the current auth session.
 * Returns { user, loading, role, campId, isCampAdmin, signIn, signOut }.
 * Must be called inside <AuthProvider>.
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
