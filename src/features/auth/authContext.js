import { createContext } from 'react';

/**
 * Auth context object. Kept in its own module (no component exports) so both
 * the provider and the `useAuth` hook can import it without breaking React
 * Fast Refresh, which requires component files to export only components.
 */
export const AuthContext = createContext(null);
