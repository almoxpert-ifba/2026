import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './components/ui/Toast';
import { AppLayout } from './components/layout/AppLayout';
import { useAuthStore } from './store/authStore';

import { LoginPage }               from './pages/auth/LoginPage';
import { ForgotPasswordPage }       from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage }        from './pages/auth/ResetPasswordPage';
import { ForceChangePasswordPage }  from './pages/auth/ForceChangePasswordPage';
import { DashboardPage }            from './pages/dashboard/DashboardPage';
import { ItemsPage }                from './pages/items/ItemsPage';
import { StockPage }                from './pages/stock/StockPage';
import { ShipmentsPage }            from './pages/shipments/ShipmentsPage';
import { OrdersPage }               from './pages/orders/OrdersPage';
import { MovementsPage }            from './pages/movements/MovementsPage';
import { UsersPage }                from './pages/users/UsersPage';
import { ProfilePage }              from './pages/ProfilePage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

const PrivateRoute: React.FC<{ element: React.ReactNode; adminOnly?: boolean }> = ({ element, adminOnly }) => {
  const { isAuthenticated, user, mustChangePassword } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (mustChangePassword) return <Navigate to="/force-change-password" replace />;
  if (adminOnly && user?.userType !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{element}</>;
};

export const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"               element={<LoginPage />} />
          <Route path="/forgot-password"     element={<ForgotPasswordPage />} />
          <Route path="/reset-password"      element={<ResetPasswordPage />} />
          <Route path="/force-change-password" element={<ForceChangePasswordPage />} />
          <Route element={<PrivateRoute element={<AppLayout />} />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<PrivateRoute element={<DashboardPage />} />} />
            <Route path="/items"     element={<PrivateRoute element={<ItemsPage />} />} />
            <Route path="/stock"     element={<PrivateRoute element={<StockPage />} />} />
            <Route path="/orders"    element={<PrivateRoute element={<OrdersPage />} />} />
            <Route path="/shipments" element={<PrivateRoute element={<ShipmentsPage />} adminOnly />} />
            <Route path="/movements" element={<PrivateRoute element={<MovementsPage />} adminOnly />} />
            <Route path="/users"     element={<PrivateRoute element={<UsersPage />} adminOnly />} />
            <Route path="/profile"   element={<PrivateRoute element={<ProfilePage />} />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  </QueryClientProvider>
);
