import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { Toaster } from '@/components/ui/sonner';
import ErrorBoundary from '@/components/ErrorBoundary';
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import SignUpPage from '@/pages/SignUpPage';

import RequestSubmittedPage from '@/pages/RequestSubmittedPage';
import CompleteSignupPage from '@/pages/CompleteSignupPage';
import EmailVerificationPage from '@/pages/EmailVerificationPage';
import AccessRequestsPage from '@/pages/AccessRequestsPage';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AdminDashboard from '@/pages/dashboards/AdminDashboard';
import WarehouseDashboard from '@/pages/dashboards/WarehouseDashboard';
import SupplierDashboard from '@/pages/dashboards/SupplierDashboard';
import InternalUserDashboard from '@/pages/dashboards/InternalUserDashboard';
import InventoryPage from '@/pages/InventoryPage';

import OrdersPage from '@/pages/OrdersPage';
import UserManagementPage from '@/pages/UserManagementPage';
import UserProfilePage from '@/pages/UserProfilePage';
import WarehouseManagementPage from '@/pages/WarehouseManagementPage';
import ProductManagementPage from '@/pages/ProductManagementPage';
import ProductCatalogPage from '@/pages/ProductCatalogPage';
import MyOrdersPage from '@/pages/MyOrdersPage';
import CatalogRequestsPage from '@/pages/CatalogRequestsPage';
import AdminCatalogRequestsPage from '@/pages/AdminCatalogRequestsPage';

import { useAuth } from '@/contexts/AuthContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return user ? <>{children}</> : <Navigate to="/login" />;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return !user ? <>{children}</> : <Navigate to="/dashboard" />;
}

function DashboardRouter() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) return <Navigate to="/login" />;
  
  const getDashboardComponent = () => {
    switch (user.role) {
      case 'admin':
        return <AdminDashboard />;
      case 'warehouse_staff':
        return <WarehouseDashboard />;
      case 'supplier':
        return <SupplierDashboard />;
      case 'internal_user':
        return <InternalUserDashboard />;
      default:
        return <Navigate to="/login" />;
    }
  };

  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={getDashboardComponent()} />
        <Route path="/inventory" element={<InventoryPage />} />

        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/user-management" element={<UserManagementPage />} />
        <Route path="/profile" element={<UserProfilePage />} />
        <Route path="/warehouse-management" element={<WarehouseManagementPage />} />
        <Route path="/product-management" element={<ProductManagementPage />} />
        <Route path="/product-catalog" element={<ProductCatalogPage />} />
        <Route path="/my-orders" element={<MyOrdersPage />} />
        <Route path="/access-requests" element={<AccessRequestsPage />} />
        <Route path="/catalog-requests" element={<CatalogRequestsPage />} />
        <Route path="/admin-catalog-requests" element={<AdminCatalogRequestsPage />} />

      </Routes>
    </DashboardLayout>
  );
}

function App() {
  // Note: User role migration is now handled in AuthContext after authentication
  // This prevents permission errors when no user is authenticated

  return (
    <ThemeProvider defaultTheme="light" storageKey="inventory-ui-theme">
      <AuthProvider>
        <NotificationProvider>
          <Router basename={import.meta.env.PROD && import.meta.env.VITE_GITHUB_PAGES === 'true' ? '/Inven-management' : undefined}>
            <div className="min-h-screen bg-background">
              <Routes>
                <Route path="/" element={<PublicOnlyRoute><LandingPage /></PublicOnlyRoute>} />
                <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
                <Route path="/signup" element={<PublicOnlyRoute><SignUpPage /></PublicOnlyRoute>} />
                <Route path="/request-access" element={<Navigate to="/login" replace />} />
                <Route path="/request-submitted" element={<RequestSubmittedPage />} />
                <Route path="/complete-signup" element={<CompleteSignupPage />} />
                <Route path="/verify-email" element={<PublicOnlyRoute><EmailVerificationPage /></PublicOnlyRoute>} />
                <Route
                  path="/dashboard/*"
                  element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <DashboardRouter />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
              </Routes>
              <Toaster />
            </div>
          </Router>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;