import { Outlet } from 'react-router-dom';
import AdminNavbar from '@/components/layout/AdminNavbar';
import ProtectedRoute from '@/features/auth/ProtectedRoute';

/**
 * Layout route for the admin portal: one persistent nav bar across every admin
 * screen, so switching tabs never routes back through the dashboard. The auth
 * gate lives here too — every route nested under it is admin-only.
 *
 * The bar is 3rem tall (h-12); full-height admin pages size themselves with
 * `h-[calc(100dvh-3rem)]` so they scroll inside the shell rather than under it.
 */
export default function AdminLayout() {
    return (
        <ProtectedRoute>
            <AdminNavbar />
            <div className="admin-shell">
                <Outlet />
            </div>
        </ProtectedRoute>
    );
}
