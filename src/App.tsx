import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { Toaster } from '@/components/ui/sonner';
import { migrateUserRoles } from '@/services/userService';
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import SignUpPage from '@/pages/SignUpPage';
import RequestAccessPage from '@/pages/RequestAccessPage';
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
import SuppliersPage from '@/pages/SuppliersPage';
import ReportsPage from '@/pages/ReportsPage';
import UserManagementPage from '@/pages/UserManagementPage';
import UserProfilePage from '@/pages/UserProfilePage';
import WarehouseManagementPage from '@/pages/WarehouseManagementPage';
import ProductManagementPage from '@/pages/ProductManagementPage';
import ProductCatalogPage from '@/pages/ProductCatalogPage';
import MyOrdersPage from '@/pages/MyOrdersPage';
import { useAuth } from '@/contexts/AuthContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" />;
}

function DashboardRouter() {
  const { user } = useAuth();
  
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
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/user-management" element={<UserManagementPage />} />
        <Route path="/profile" element={<UserProfilePage />} />
        <Route path="/warehouse-management" element={<WarehouseManagementPage />} />
        <Route path="/product-management" element={<ProductManagementPage />} />
        <Route path="/product-catalog" element={<ProductCatalogPage />} />
        <Route path="/my-orders" element={<MyOrdersPage />} />
        <Route path="/access-requests" element={<AccessRequestsPage />} />
      </Routes>
    </DashboardLayout>
  );
}

function App() {
  useEffect(() => {
    // Migrate any users with 'user' role to 'internal_user' when the app starts
    migrateUserRoles()
      .then(count => {
        if (count > 0) {
          console.log(`Successfully migrated ${count} users from 'user' role to 'internal_user'`);
        }
      })
      .catch(error => {
        console.error('Error during user role migration:', error);
      });
  }, []);

  return (
    <ThemeProvider defaultTheme="light" storageKey="inventory-ui-theme">
      <AuthProvider>
        <NotificationProvider>
          <Router>
            <div className="min-h-screen bg-background">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignUpPage />} />
                <Route path="/request-access" element={<RequestAccessPage />} />
                <Route path="/request-submitted" element={<RequestSubmittedPage />} />
                <Route path="/complete-signup" element={<CompleteSignupPage />} />
                <Route path="/verify-email" element={<EmailVerificationPage />} />
                <Route
                  path="/dashboard/*"
                  element={
                    <ProtectedRoute>
                      <DashboardRouter />
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