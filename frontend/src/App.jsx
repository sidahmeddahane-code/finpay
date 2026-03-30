import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';

import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import SubmitInvoice from './pages/SubmitInvoice';
import MyInvoices from './pages/MyInvoices';
import Kyc from './pages/Kyc';
import AdminDashboard from './pages/AdminDashboard';
import AdminKyc from './pages/AdminKyc';
import AboutUs from './pages/AboutUs';
import AdminInvoices from './pages/AdminInvoices';
import AdminPayments from './pages/AdminPayments';
import AdminSettings from './pages/AdminSettings';
import AdminExpenses from './pages/AdminExpenses';
import AdminUsers from './pages/AdminUsers';
import AdminLogs from './pages/AdminLogs';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Routes publiques */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Routes privées avec Layout commun */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/submit-invoice" element={<SubmitInvoice />} />
            <Route path="/my-invoices" element={<MyInvoices />} />
            <Route path="/kyc" element={<Kyc />} />
            <Route path="/about" element={<AboutUs />} />

            {/* Routes Admin */}
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/kyc" element={<AdminKyc />} />
            <Route path="/admin/invoices" element={<AdminInvoices />} />
            <Route path="/admin/payments" element={<AdminPayments />} />
            <Route path="/admin/expenses" element={<AdminExpenses />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/logs" element={<AdminLogs />} />
          </Route>

          {/* Redirection par défaut */}
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
