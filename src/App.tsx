import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { Toaster } from '@/components/ui/sonner';
import LoginPage from '@/pages/LoginPage';
import RequestAccessPage from '@/pages/RequestAccessPage';
import RequestSubmittedPage from '@/pages/RequestSubmittedPage';
import CompleteSignupPage from '@/pages/CompleteSignupPage';
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
import WarehouseManagementPage from '@/pages/WarehouseManagementPage';
import ProductManagementPage from '@/pages/ProductManagementPage';
import CatalogRequestsPage from '@/pages/CatalogRequestsPage';
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
        <Route path="/warehouse-management" element={<WarehouseManagementPage />} />
        <Route path="/product-management" element={<ProductManagementPage />} />
        <Route path="/catalog-requests" element={<CatalogRequestsPage />} />
        <Route path="/access-requests" element={<AccessRequestsPage />} />
      </Routes>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="inventory-ui-theme">
      <AuthProvider>
        <NotificationProvider>
          <Router>
            <div className="min-h-screen bg-background">
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/request-access" element={<RequestAccessPage />} />
                <Route path="/request-submitted" element={<RequestSubmittedPage />} />
                <Route path="/complete-signup" element={<CompleteSignupPage />} />
                <Route
                  path="/dashboard/*"
                  element={
                    <ProtectedRoute>
                      <DashboardRouter />
                    </ProtectedRoute>
                  }
                />
                <Route path="/" element={<Navigate to="/dashboard" />} />
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