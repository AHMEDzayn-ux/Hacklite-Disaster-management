import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Eager load only critical pages
import RoleSelection from './pages/RoleSelection';
import EmergencyContacts from './pages/EmergencyContacts';

// Lazy load all other pages for code splitting
const ReportDashboard = lazy(() => import('./pages/ReportDashboard'));
const RespondDashboard = lazy(() => import('./pages/RespondDashboard'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MissingPersons = lazy(() => import('./pages/MissingPersons'));
const MissingPersonDetail = lazy(() => import('./pages/MissingPersonDetail'));
const DisasterReports = lazy(() => import('./pages/DisasterReports'));
const DisasterReportDetail = lazy(() => import('./pages/DisasterReportDetail'));
const AnimalRescue = lazy(() => import('./pages/AnimalRescue'));
const AnimalRescueDetail = lazy(() => import('./pages/AnimalRescueDetail'));
const CampDetail = lazy(() => import('./pages/CampDetail'));
const CampManagement = lazy(() => import('./pages/CampManagement'));
const Volunteers = lazy(() => import('./pages/Volunteers'));
const Donations = lazy(() => import('./pages/Donations'));
const BulkTestData = lazy(() => import('./pages/BulkTestData'));
const Camps = lazy(() => import('./pages/Camps'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Admin pages (lazy loaded)
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminReviewRequests = lazy(() => import('./pages/AdminReviewRequests'));
const AdminRegisterCamp = lazy(() => import('./pages/AdminRegisterCamp'));
const AdminManageCamps = lazy(() => import('./pages/AdminManageCamps'));
const AdminEditCamp = lazy(() => import('./pages/AdminEditCamp'));
const AdminRecords = lazy(() => import('./pages/AdminRecords'));
const CampRequestForm = lazy(() => import('./components/CampRequestForm'));
const AdminCommandDashboard = lazy(() => import('./pages/AdminCommandDashboard'));
const AdminInventoryOverview = lazy(() => import('./pages/AdminInventoryOverview'));
const CampInventory = lazy(() => import('./pages/CampInventory'));
const CampAdminLogin = lazy(() => import('./pages/CampAdminLogin'));
const CampAdminInventory = lazy(() => import('./pages/CampAdminInventory'));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
        <p className="mt-4 text-slate-400">Loading...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Landing - Role Selection (No Navbar) - Eager loaded */}
            <Route path="/" element={<RoleSelection />} />

            {/* Report Interface (for victims/reporters) - Lazy loaded */}
            <Route path="/report" element={<Layout userType="reporter"><ReportDashboard /></Layout>} />
            <Route path="/missing-persons" element={<Layout userType="reporter"><MissingPersons /></Layout>} />
            <Route path="/missing-persons/:id" element={<Layout userType="reporter"><MissingPersonDetail role="reporter" /></Layout>} />
            <Route path="/disasters" element={<Layout userType="reporter"><DisasterReports /></Layout>} />
            <Route path="/disasters/:id" element={<Layout userType="reporter"><DisasterReportDetail role="reporter" /></Layout>} />
            <Route path="/animal-rescue" element={<Layout userType="reporter"><AnimalRescue /></Layout>} />
            <Route path="/animal-rescue/:id" element={<Layout userType="reporter"><AnimalRescueDetail role="reporter" /></Layout>} />
            <Route path="/emergency" element={<Layout userType="reporter"><EmergencyContacts /></Layout>} />

            {/* Respond Interface (for helpers/responders) - Lazy loaded */}
            <Route path="/respond" element={<Layout userType="responder"><RespondDashboard /></Layout>} />
            <Route path="/missing-persons-list" element={<Layout userType="responder"><Dashboard role="responder" /></Layout>} />
            <Route path="/missing-persons-list/:id" element={<Layout userType="responder"><MissingPersonDetail role="responder" /></Layout>} />
            <Route path="/disasters-list" element={<Layout userType="responder"><Dashboard role="responder" /></Layout>} />
            <Route path="/disasters-list/:id" element={<Layout userType="responder"><DisasterReportDetail role="responder" /></Layout>} />
            <Route path="/animal-rescue-list" element={<Layout userType="responder"><Dashboard role="responder" /></Layout>} />
            <Route path="/animal-rescue-list/:id" element={<Layout userType="responder"><AnimalRescueDetail role="responder" /></Layout>} />
            <Route path="/camps" element={<Layout userType="responder"><Camps /></Layout>} />
            <Route path="/camps/:id" element={<Layout userType="responder"><CampDetail /></Layout>} />
            <Route path="/volunteers" element={<Layout userType="responder"><Volunteers /></Layout>} />
            <Route path="/donations" element={<Layout userType="responder"><Donations /></Layout>} />

            {/* Public Camp Request Form (NO AUTH REQUIRED) */}
            <Route path="/request-camp" element={<Layout userType="responder"><CampRequestForm /></Layout>} />

            {/* Camp Inventory - public, code-gated (no login, no Navbar - mobile field tool) */}
            <Route path="/camp-inventory" element={<CampInventory />} />

            {/* Camp Admin - logged-in user scoped to one camp (add/distribute stock).
                The login is public; the inventory page requires auth and self-guards
                to camp_admin, and the edge function enforces the camp scope. */}
            <Route path="/camp-admin/login" element={<CampAdminLogin />} />
            <Route path="/camp-admin/inventory" element={<ProtectedRoute><CampAdminInventory /></ProtectedRoute>} />

            {/* Admin Routes - Authentication required ONLY for these */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/review-requests" element={<ProtectedRoute><AdminReviewRequests /></ProtectedRoute>} />
            <Route path="/admin/register-camp" element={<ProtectedRoute><AdminRegisterCamp /></ProtectedRoute>} />
            <Route path="/admin/manage-camps" element={<ProtectedRoute><AdminManageCamps /></ProtectedRoute>} />
            <Route path="/admin/edit-camp/:id" element={<ProtectedRoute><AdminEditCamp /></ProtectedRoute>} />
            <Route path="/admin/records" element={<ProtectedRoute><AdminRecords /></ProtectedRoute>} />
            <Route path="/admin/command" element={<ProtectedRoute><AdminCommandDashboard /></ProtectedRoute>} />
            <Route path="/admin/inventory" element={<ProtectedRoute><AdminInventoryOverview /></ProtectedRoute>} />

            {/* Bulk Test Data Generator */}
            <Route path="/bulk-test-data" element={<BulkTestData />} />

            {/* 404 - Catch all unmatched routes */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
    </AuthProvider>
  );
}

export default App;
