import { Navigate, Route, Routes } from 'react-router-dom';

import PublicLayout from '../components/layout/PublicLayout';
import AuthLayout from '../components/layout/AuthLayout';
import Layout from '../components/layout/Layout';

import Home from '../pages/public/Home';
import Faqs from '../pages/public/Faqs';
import Help from '../pages/public/Help';
import Contact from '../pages/public/Contact';

import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import CheckEmail from '../pages/auth/CheckEmail';
import VerifyEmail from '../pages/auth/VerifyEmail';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';

import Dashboard from '../pages/app/Dashboard';
import Plans from '../pages/app/Plans';
import Routers from '../pages/app/Routers';
import RouterDetail from '../pages/app/RouterDetail';
import Customers from '../pages/app/Customers';
import CustomerDetail from '../pages/app/CustomerDetail';
import Vouchers from '../pages/app/Vouchers';
import Transactions from '../pages/app/Transactions';
import TransactionDetail from '../pages/app/TransactionDetail';
import Reports from '../pages/app/Reports';
import Notifications from '../pages/app/Notifications';
import Settings from '../pages/app/Settings';
import MpesaSettings from '../pages/app/MpesaSettings';
import Profile from '../pages/app/Profile';
import Billing from '../pages/app/Billing';
import Invoices from '../pages/app/Invoices';
import InvoiceDetail from '../pages/app/InvoiceDetail';
import BillingTransactions from '../pages/app/BillingTransactions';
import NotFound from '../pages/app/NotFound';

import ProtectedRoute from './ProtectedRoute';

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/faqs" element={<Faqs />} />
        <Route path="/help" element={<Help />} />
        <Route path="/contact" element={<Contact />} />
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/check-email" element={<CheckEmail />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/routers" element={<Routers />} />
          <Route path="/routers/:id" element={<RouterDetail />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/vouchers" element={<Vouchers />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/transactions/:id" element={<TransactionDetail />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings/mpesa" element={<MpesaSettings />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/billing/invoices" element={<Invoices />} />
          <Route path="/billing/invoices/:id" element={<InvoiceDetail />} />
          <Route path="/billing/transactions" element={<BillingTransactions />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>

      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}