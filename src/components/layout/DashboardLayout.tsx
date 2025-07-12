import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { NotificationPanel } from '@/components/NotificationPanel';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import {
  Package,
  LayoutDashboard,
  Package2,
  ShoppingCart,
  Users,
  BarChart3,
  Menu,
  Bell,
  LogOut,
  Warehouse,
  UserCog,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserCircle
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'warehouse_staff', 'supplier', 'internal_user'] },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Package2, roles: ['admin', 'warehouse_staff'] },
  { name: 'Order Management', href: '/dashboard/orders', icon: ShoppingCart, roles: ['admin', 'warehouse_staff'] },
  { name: 'My Orders', href: '/dashboard/my-orders', icon: ShoppingCart, roles: ['internal_user'] },
  { name: 'Product Catalog', href: '/dashboard/product-catalog', icon: Package, roles: ['internal_user'] },
  { name: 'Suppliers', href: '/dashboard/suppliers', icon: Users, roles: ['admin', 'supplier'] },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3, roles: ['admin'] },
  { name: 'User Management', href: '/dashboard/user-management', icon: UserCog, roles: ['admin'] },
  { name: 'Access Requests', href: '/dashboard/access-requests', icon: UserCheck, roles: ['admin'] },
  { name: 'Warehouse Management', href: '/dashboard/warehouse-management', icon: Warehouse, roles: ['warehouse_staff'] },
  { name: 'Product Management', href: '/dashboard/product-management', icon: Package, roles: ['supplier'] },
  { name: 'My Profile', href: '/dashboard/profile', icon: UserCircle, roles: ['admin', 'warehouse_staff', 'supplier', 'internal_user'] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { unreadCount, pendingAccessRequests } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };



  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'warehouse_staff':
        return 'Warehouse Staff';
      case 'supplier':
        return 'Supplier';
      case 'internal_user':
        return 'Internal User';
      default:
        return role;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'warehouse_staff':
        return 'default';
      case 'supplier':
        return 'secondary';
      case 'internal_user':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const filteredNavigation = navigation.filter(item => 
    user?.role && item.roles.includes(user.role)
  );

  const SidebarContent = ({ isCollapsed = false }: { isCollapsed?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo Header */}
      <div className={`flex items-center p-6 border-b border-slate-200/60 dark:border-slate-700/60 ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
        <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-elegant">
          <Package className="h-6 w-6 text-white flex-shrink-0" />
        </div>
        {!isCollapsed && (
          <div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">InventoryPro</span>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Management System</p>
          </div>
        )}
      </div>
      
      <nav className="flex-1 space-y-1 p-4">
        <TooltipProvider>
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            const navItem = (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-elegant'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && (
                  <div className="flex items-center justify-between flex-1">
                    <span>{item.name}</span>
                    {item.name === 'Access Requests' && pendingAccessRequests > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center shadow-sm">
                        {pendingAccessRequests}
                      </span>
                    )}
                  </div>
                )}
                {isCollapsed && item.name === 'Access Requests' && pendingAccessRequests > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center shadow-sm border border-white dark:border-slate-900">
                    {pendingAccessRequests > 9 ? '9+' : pendingAccessRequests}
                  </span>
                )}
              </Link>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={item.name}>
                  <TooltipTrigger asChild>
                    {navItem}
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{item.name}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return navItem;
          })}
        </TooltipProvider>
      </nav>

      <div className="p-4 border-t border-slate-200/60 dark:border-slate-700/60">
        {!isCollapsed ? (
          <>
            <div className="flex items-center space-x-3 mb-4">
              <Avatar className="ring-2 ring-slate-200 dark:ring-slate-700">
                <AvatarImage 
                  src={user?.profilePicture || user?.avatar} 
                  alt={user?.name}
                />
                <AvatarFallback>
                  {user?.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-slate-800 dark:text-slate-200">{user?.name}</p>
                <Badge variant={getRoleBadgeVariant(user?.role || '')} className="text-xs">
                  {getRoleDisplayName(user?.role || '')}
                </Badge>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </>
        ) : (
          <TooltipProvider>
            <div className="space-y-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex justify-center">
                    <Avatar className="h-8 w-8 ring-2 ring-slate-200 dark:ring-slate-700">
                      <AvatarImage 
                        src={user?.profilePicture || user?.avatar} 
                        alt={user?.name}
                      />
                      <AvatarFallback className="text-xs">
                        {user?.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <div className="text-center">
                    <p className="font-medium">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{getRoleDisplayName(user?.role || '')}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="w-full justify-center text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Logout</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900/50 overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-blue-400/5 to-purple-600/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-br from-cyan-400/5 to-blue-600/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-gradient-to-br from-purple-400/3 to-pink-600/3 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>
      {/* Desktop Sidebar */}
      <div className={`hidden md:flex md:flex-col transition-all duration-300 relative ${isSidebarCollapsed ? 'md:w-16' : 'md:w-64'}`}>
        <div className="flex flex-col h-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200/60 dark:border-slate-700/60 shadow-elegant">
          <SidebarContent isCollapsed={isSidebarCollapsed} />
        </div>
        
        {/* Simple Sidebar Toggle Arrow */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-8 group z-20 p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full shadow-elegant border border-slate-200 dark:border-slate-700 transition-all duration-200 hover:shadow-elegant-lg"
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-200 transition-colors duration-200" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-200 transition-colors duration-200" />
          )}
        </button>
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-700/60 px-6 py-4 flex items-center justify-between flex-shrink-0 shadow-sm">
          <div className="flex items-center space-x-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden hover:bg-slate-100 dark:hover:bg-slate-800">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
            </Sheet>
            
            <div className="hidden md:block">
              <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
                {navigation.find(item => item.href === location.pathname)?.name || 'Dashboard'}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Clean Notification Bell Button */}
            <button
              onClick={() => setIsNotificationPanelOpen(true)}
              className="relative p-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label="Open notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center bg-red-500 text-white border-2 border-white dark:border-slate-900"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </button>

            <div className="flex items-center space-x-2">
              <Avatar className="h-9 w-9 ring-2 ring-slate-200 dark:ring-slate-700">
                <AvatarImage 
                  src={user?.profilePicture || user?.avatar} 
                  alt={user?.name}
                />
                <AvatarFallback className="text-xs">
                  {user?.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{user?.name}</p>
                <Badge variant={getRoleBadgeVariant(user?.role || '')} className="text-xs">
                  {getRoleDisplayName(user?.role || '')}
                </Badge>
                <Link to="/dashboard/profile" className="text-xs text-blue-500 hover:text-blue-700 block mt-1">View Profile</Link>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area - Full Height with Consistent Padding */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full overflow-auto">
            <div className="h-full p-6 animate-fade-in">
              <div className="h-full w-full max-w-none">
                {children}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Notification Panel */}
      <NotificationPanel 
        open={isNotificationPanelOpen} 
        onOpenChange={setIsNotificationPanelOpen} 
      />
    </div>
  );
}