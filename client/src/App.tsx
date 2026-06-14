import React from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { StoreProvider, useStore } from './context/Store';
import { LoginScreen } from './pages/Login';
import { SignupScreen } from './pages/Signup';
import { ForgotPasswordScreen } from './pages/ForgotPassword';
import { ResetPasswordScreen } from './pages/ResetPassword';
import { VerifyEmailScreen } from './pages/VerifyEmail';
import { DashboardScreen } from './pages/Dashboard';
import { ProductsScreen } from './pages/Products';
import { POSScreen } from './pages/POS';
import { CustomersScreen } from './pages/Customers';
import { TransactionsScreen } from './pages/Transactions';
import { ExpensesScreen } from './pages/Expenses';
import { TripsScreen } from './pages/Trips';
import { VendorsScreen } from './pages/Vendors';
import { PurchasesScreen } from './pages/Purchases';
import { ServicesScreen } from './pages/Services';
import { Layout } from './components/Layout';
import { NotificationProvider } from './context/NotificationContext';

import ShopSelector from './pages/ShopSelector';

const Reports = React.lazy(() => import('./pages/Reports').then(m => ({ default: m.ReportsScreen })));
const Staff = React.lazy(() => import('./pages/Staff'));
const Settings = React.lazy(() => import('./pages/Settings').then(m => ({ default: m.SettingsScreen })));

const ProtectedRoute = ({ children, requireShop = true }: { children: React.ReactNode, requireShop?: boolean }) => {
    const { user, isLoading } = useStore();
    const currentShop = localStorage.getItem('currentShop');

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/" replace />;
    }

    if (requireShop && !currentShop) {
        return <Navigate to="/select-shop" replace />;
    }

    return <>{children}</>;
};

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<LoginScreen />} />
            <Route path="/signup" element={<SignupScreen />} />
            <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
            <Route path="/reset-password" element={<ResetPasswordScreen />} />
            <Route path="/verify-email/:token" element={<VerifyEmailScreen />} />

            {/* Protected Routes */}
            <Route path="/select-shop" element={
                <ProtectedRoute requireShop={false}>
                    <ShopSelector />
                </ProtectedRoute>
            } />

            <Route element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
                <Route path="/dashboard" element={<DashboardScreen />} />
                <Route path="/products" element={<ProductsScreen />} />
                <Route path="/pos" element={<POSScreen />} />
                <Route path="/customers" element={<CustomersScreen />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/transactions" element={<TransactionsScreen />} />
                <Route path="/expenses" element={<ExpensesScreen />} />
                <Route path="/trips" element={<TripsScreen />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/vendors" element={<VendorsScreen />} />
                <Route path="/purchases" element={<PurchasesScreen />} />
                <Route path="/services" element={<ServicesScreen />} />
                <Route path="/staff" element={<Staff />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

import { Toaster } from 'react-hot-toast';

const App: React.FC = () => {
    return (
        <StoreProvider>
            <NotificationProvider>
                <Toaster position="top-right" reverseOrder={false} />
                <HashRouter>
                    <AppRoutes />
                </HashRouter>
            </NotificationProvider>
        </StoreProvider>
    );
};

export default App;