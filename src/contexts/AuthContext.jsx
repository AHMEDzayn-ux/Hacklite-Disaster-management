import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    // The admin_users role for the signed-in user: 'admin' | 'super_admin' |
    // 'camp_admin' | null (logged in but not an admin). campId is set only for
    // camp_admin - the one camp they may manage.
    const [role, setRole] = useState(null);
    const [campId, setCampId] = useState(null);

    // Resolve the admin_users row for a user. Kept separate so both the initial
    // session check and later auth changes share one code path.
    const loadRole = async (sessionUser) => {
        if (!sessionUser) {
            setRole(null);
            setCampId(null);
            return;
        }
        const { data } = await supabase
            .from('admin_users')
            .select('role, camp_id')
            .eq('user_id', sessionUser.id)
            .eq('is_active', true)
            .maybeSingle();
        setRole(data?.role ?? null);
        setCampId(data?.camp_id ?? null);
    };

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            setUser(session?.user ?? null);
            await loadRole(session?.user ?? null);
            setLoading(false);
        }).catch((error) => {
            console.error('Session check error:', error);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setUser(session?.user ?? null);
            await loadRole(session?.user ?? null);
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
