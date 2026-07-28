import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables!');
    console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✓ Present' : '✗ Missing');
    console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓ Present' : '✗ Missing');
    console.error('Make sure your .env file exists and contains:');
    console.error('VITE_SUPABASE_URL=your_supabase_url');
    console.error('VITE_SUPABASE_ANON_KEY=your_supabase_key');
    throw new Error('Supabase configuration is missing. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
