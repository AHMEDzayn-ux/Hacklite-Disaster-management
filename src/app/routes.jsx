import { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import RoleLayout from '@/components/layout/RoleLayout';
import AdminLayout from '@/components/layout/AdminLayout';
import ProtectedRoute from '@/features/auth/ProtectedRoute';

// Eager load only critical pages
import RoleSelection from '@/pages/RoleSelection';
import EmergencyContacts from '@/pages/EmergencyContacts';

// Lazy load all other pages for code splitting
const ReportDashboard = lazy(() => import('@/pages/ReportDashboard'));
const RespondDashboard = lazy(() => import('@/pages/RespondDashboard'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const NotFound = lazy(() => import('@/pages/NotFound'));

const MissingPersons = lazy(() => import('@/features/missing-persons/pages/MissingPersons'));
const MissingPersonDetail = lazy(() => import('@/features/missing-persons/pages/MissingPersonDetail'));

const DisasterReports = lazy(() => import('@/features/disasters/pages/DisasterReports'));
const DisasterReportDetail = lazy(() => import('@/features/disasters/pages/DisasterReportDetail'));

const AnimalRescue = lazy(() => import('@/features/animal-rescue/pages/AnimalRescue'));
const AnimalRescueDetail = lazy(() => import('@/features/animal-rescue/pages/AnimalRescueDetail'));

const Camps = lazy(() => import('@/features/camps/pages/Camps'));
const CampDetail = lazy(() => import('@/features/camps/pages/CampDetail'));
const CampRequestForm = lazy(() => import('@/features/camps/components/CampRequestForm'));

const Volunteers = lazy(() => import('@/features/volunteers/pages/Volunteers'));
const Donations = lazy(() => import('@/features/donations/pages/Donations'));

// Inventory (camp-scoped field tools + admin rollup)
const CampInventory = lazy(() => import('@/features/inventory/pages/CampInventory'));
const CampAdminInventory = lazy(() => import('@/features/inventory/pages/CampAdminInventory'));
const AdminInventoryOverview = lazy(() => import('@/features/inventory/pages/AdminInventoryOverview'));
const AdminCampInventory = lazy(() => import('@/features/inventory/pages/AdminCampInventory'));

// Admin pages (lazy loaded)
const AdminLogin = lazy(() => import('@/features/admin/pages/AdminLogin'));
const AdminDashboard = lazy(() => import('@/features/admin/pages/AdminDashboard'));
const AdminRecords = lazy(() => import('@/features/admin/pages/AdminRecords'));
const AdminCommandDashboard = lazy(() => import('@/features/admin/pages/AdminCommandDashboard'));
const BulkTestData = lazy(() => import('@/features/admin/pages/BulkTestData'));

const AdminCampsLayout = lazy(() => import('@/features/camps/pages/AdminCampsLayout'));
const AdminReviewRequests = lazy(() => import('@/features/camps/pages/AdminReviewRequests'));
const AdminRegisterCamp = lazy(() => import('@/features/camps/pages/AdminRegisterCamp'));
const AdminManageCamps = lazy(() => import('@/features/camps/pages/AdminManageCamps'));
const AdminEditCamp = lazy(() => import('@/features/camps/pages/AdminEditCamp'));

export default function AppRoutes() {
  return (
    <Routes>
      {/* Landing - Role Selection (No Navbar) - Eager loaded */}
      <Route path="/" element={<RoleSelection />} />

      {/* Report Interface (for victims/reporters) - Lazy loaded */}
      <Route element={<RoleLayout userType="reporter" />}>
        <Route path="/report" element={<ReportDashboard />} />
        <Route path="/missing-persons" element={<MissingPersons />} />
        <Route path="/missing-persons/:id" element={<MissingPersonDetail role="reporter" />} />
        <Route path="/disasters" element={<DisasterReports />} />
        <Route path="/disasters/:id" element={<DisasterReportDetail role="reporter" />} />
        <Route path="/animal-rescue" element={<AnimalRescue />} />
        <Route path="/animal-rescue/:id" element={<AnimalRescueDetail role="reporter" />} />
        <Route path="/emergency" element={<EmergencyContacts />} />
      </Route>

      {/* Respond Interface (for helpers/responders) - Lazy loaded */}
      <Route element={<RoleLayout userType="responder" />}>
        <Route path="/respond" element={<RespondDashboard />} />
        <Route path="/missing-persons-list" element={<Dashboard role="responder" />} />
        <Route path="/missing-persons-list/:id" element={<MissingPersonDetail role="responder" />} />
        <Route path="/disasters-list" element={<Dashboard role="responder" />} />
        <Route path="/disasters-list/:id" element={<DisasterReportDetail role="responder" />} />
        <Route path="/animal-rescue-list" element={<Dashboard role="responder" />} />
        <Route path="/animal-rescue-list/:id" element={<AnimalRescueDetail role="responder" />} />
        <Route path="/camps" element={<Camps />} />
        <Route path="/camps/:id" element={<CampDetail />} />
        <Route path="/volunteers" element={<Volunteers />} />
        <Route path="/donations" element={<Donations />} />

        {/* Public Camp Request Form (NO AUTH REQUIRED) */}
        <Route path="/request-camp" element={<CampRequestForm />} />
      </Route>

      {/* Camp Inventory - public, code-gated (no login, no Navbar - mobile field tool) */}
      <Route path="/camp-inventory" element={<CampInventory />} />

      {/* Camp Admin - logged-in user scoped to one camp (add/distribute stock).
          There is a single sign-in at /admin/login that routes by account role;
          the inventory page requires auth and self-guards to camp_admin, and the
          edge function enforces the camp scope. */}
      <Route path="/camp-admin/login" element={<Navigate to="/admin/login" replace />} />
      <Route path="/camp-admin/inventory" element={<ProtectedRoute><CampAdminInventory /></ProtectedRoute>} />

      {/* Admin Routes - Authentication required ONLY for these.
          AdminLayout supplies the shared admin nav bar and the auth gate, so
          every screen below is reachable from every other one. */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route element={<AdminLayout />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        {/* The camp lifecycle - review a public request, register the camp,
            maintain it - is one section with its own tabs, so these three sit
            together instead of as separate top-level nav entries. */}
        <Route element={<AdminCampsLayout />}>
          <Route path="/admin/manage-camps" element={<AdminManageCamps />} />
          <Route path="/admin/review-requests" element={<AdminReviewRequests />} />
          <Route path="/admin/register-camp" element={<AdminRegisterCamp />} />
          <Route path="/admin/edit-camp/:id" element={<AdminEditCamp />} />
        </Route>
        <Route path="/admin/records" element={<AdminRecords />} />
        <Route path="/admin/command" element={<AdminCommandDashboard />} />
        <Route path="/admin/inventory" element={<AdminInventoryOverview />} />
        {/* Drill-down into one camp's sheet, read-only - stock entry and requests
            stay with that camp's own admin. */}
        <Route path="/admin/inventory/:campId" element={<AdminCampInventory />} />
      </Route>

      {/* Bulk Test Data Generator */}
      <Route path="/bulk-test-data" element={<BulkTestData />} />

      {/* 404 - Catch all unmatched routes */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
