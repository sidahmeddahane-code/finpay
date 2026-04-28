import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const SubmitInvoice = lazy(() => import('./pages/SubmitInvoice'));
const MyInvoices = lazy(() => import('./pages/MyInvoices'));
const Kyc = lazy(() => import('./pages/Kyc'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminKyc = lazy(() => import('./pages/AdminKyc'));
const AboutUs = lazy(() => import('./pages/AboutUs'));
const AdminInvoices = lazy(() => import('./pages/AdminInvoices'));
const AdminPayments = lazy(() => import('./pages/AdminPayments'));
const AdminSettings = lazy(() => import('./pages/AdminSettings'));
const AdminPartners = lazy(() => import('./pages/AdminPartners'));
const AdminExpenses = lazy(() => import('./pages/AdminExpenses'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminLogs = lazy(() => import('./pages/AdminLogs'));
const Profile = lazy(() => import('./pages/Profile'));

const LoadingFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-main)' }}>
    <div className="loader" style={{ width: '40px', height: '40px', border: '4px solid var(--border-color)', borderTop: '4px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Routes publiques */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Routes privées avec Layout commun */}
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/submit-invoice" element={<SubmitInvoice />} />
              <Route path="/my-invoices" element={<MyInvoices />} />
              <Route path="/kyc" element={<Kyc />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/about" element={<AboutUs />} />

              {/* Routes Admin */}
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/kyc" element={<AdminKyc />} />
              <Route path="/admin/invoices" element={<AdminInvoices />} />
              <Route path="/admin/payments" element={<AdminPayments />} />
              <Route path="/admin/expenses" element={<AdminExpenses />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/partners" element={<AdminPartners />} />
              <Route path="/admin/logs" element={<AdminLogs />} />
            </Route>

            {/* Redirection par défaut */}
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
