import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
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

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950">
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
      <div className="min-h-screen bg-slate-950">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Landing - Role Selection (No Navbar) - Eager loaded */}
            <Route path="/" element={<RoleSelection />} />

            {/* Report Interface (for victims/reporters) - Lazy loaded */}
            <Route path="/report" element={<><Navbar userType="reporter" /><ReportDashboard /></>} />
            <Route path="/missing-persons" element={<><Navbar userType="reporter" /><MissingPersons /></>} />
            <Route path="/missing-persons/:id" element={<><Navbar userType="reporter" /><MissingPersonDetail role="reporter" /></>} />
            <Route path="/disasters" element={<><Navbar userType="reporter" /><DisasterReports /></>} />
            <Route path="/disasters/:id" element={<><Navbar userType="reporter" /><DisasterReportDetail role="reporter" /></>} />
            <Route path="/animal-rescue" element={<><Navbar userType="reporter" /><AnimalRescue /></>} />
            <Route path="/animal-rescue/:id" element={<><Navbar userType="reporter" /><AnimalRescueDetail role="reporter" /></>} />
            <Route path="/emergency" element={<><Navbar userType="reporter" /><EmergencyContacts /></>} />

            {/* Respond Interface (for helpers/responders) - Lazy loaded */}
            <Route path="/respond" element={<><Navbar userType="responder" /><RespondDashboard /></>} />
            <Route path="/missing-persons-list" element={<><Navbar userType="responder" /><Dashboard role="responder" /></>} />
            <Route path="/missing-persons-list/:id" element={<><Navbar userType="responder" /><MissingPersonDetail role="responder" /></>} />
            <Route path="/disasters-list" element={<><Navbar userType="responder" /><Dashboard role="responder" /></>} />
            <Route path="/disasters-list/:id" element={<><Navbar userType="responder" /><DisasterReportDetail role="responder" /></>} />
            <Route path="/animal-rescue-list" element={<><Navbar userType="responder" /><Dashboard role="responder" /></>} />
            <Route path="/animal-rescue-list/:id" element={<><Navbar userType="responder" /><AnimalRescueDetail role="responder" /></>} />
            <Route path="/camps" element={<><Navbar userType="responder" /><Camps /></>} />
            <Route path="/camps/:id" element={<><Navbar userType="responder" /><CampDetail /></>} />
            <Route path="/volunteers" element={<><Navbar userType="responder" /><Volunteers /></>} />
            <Route path="/donations" element={<><Navbar userType="responder" /><Donations /></>} />

            {/* Public Camp Request Form (NO AUTH REQUIRED) */}
            <Route path="/request-camp" element={<><Navbar userType="responder" /><CampRequestForm /></>} />

            {/* Camp Inventory - public, code-gated (no login, no Navbar - mobile field tool) */}
            <Route path="/camp-inventory" element={<CampInventory />} />

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
