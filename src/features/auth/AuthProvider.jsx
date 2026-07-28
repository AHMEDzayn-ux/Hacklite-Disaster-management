import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AuthContext } from '@/features/auth/authContext';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    // The role for the signed-in user: 'camp_admin' for a scoped camp admin,
    // otherwise null (regular admins/super_admins don't need a client-side role
    // - their pages are gated by login, and the edge functions enforce real
    // authority server-side against admin_users using the service role).
    //
    // Read from the session's user metadata, NOT by querying admin_users: that
    // table's RLS is super_admin-only and self-referential, so reading it from
    // the browser hangs. This is a routing hint only, never a security boundary.
    const [role, setRole] = useState(null);
    const [campId, setCampId] = useState(null);

    const applyRole = (sessionUser) => {
        const meta = sessionUser?.user_metadata ?? {};
        setRole(meta.role ?? null);
        setCampId(meta.camp_id ?? null);
    };

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            applyRole(session?.user ?? null);
            setLoading(false);
        }).catch((error) => {
            console.error('Session check error:', error);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            applyRole(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (email, password) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    };

    const signOut = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            setUser(null);
        } catch (error) {
            console.error('Sign out error:', error);
        }
    };

    const value = {
        user,
        loading,
        role,
        campId,
        isCampAdmin: role === 'camp_admin',
        signIn,
        signOut
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
