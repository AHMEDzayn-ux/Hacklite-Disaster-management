import { Outlet } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';

/**
 * Layout route for pages that sit behind the shared Navbar.
 * `userType` switches the Navbar's link set ("reporter" | "responder").
 * Pages that deliberately have no chrome (role selection, camp-admin field
 * tools, admin screens) are declared outside this layout in routes.jsx.
 */
export default function RoleLayout({ userType }) {
  return (
    <>
      <Navbar userType={userType} />
      <Outlet />
    </>
  );
}
