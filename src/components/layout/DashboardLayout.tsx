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
  ShoppingCart,
  Menu,
  Bell,
  LogOut,
  Warehouse,
  UserCog,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserCircle,
  FileText
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'warehouse_staff', 'supplier', 'internal_user'] },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Package, roles: ['admin', 'warehouse_staff'] },
  { name: 'Order Management', href: '/dashboard/orders', icon: ShoppingCart, roles: ['admin', 'warehouse_staff'] },
  { name: 'My Orders', href: '/dashboard/my-orders', icon: ShoppingCart, roles: ['internal_user'] },
  { name: 'Product Catalog', href: '/dashboard/product-catalog', icon: Package, roles: ['internal_user'] },
  { name: 'Product Management', href: '/dashboard/admin-catalog-requests', icon: FileText, roles: ['admin', 'warehouse_staff'] },
  { name: 'User Management', href: '/dashboard/user-management', icon: UserCog, roles: ['admin'] },
  { name: 'Access Requests', href: '/dashboard/access-requests', icon: UserCheck, roles: ['admin'] },
  { name: 'Warehouse Management', href: '/dashboard/warehouse-management', icon: Warehouse, roles: ['warehouse_staff'] },
  { name: 'Product Management', href: '/dashboard/product-management', icon: Package, roles: ['supplier'] },
  { name: 'My Profile', href: '/dashboard/profile', icon: UserCircle, roles: ['admin', 'warehouse_staff', 'supplier', 'internal_user'] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { unreadCount, pendingAccessRequests, pendingOrders, pendingQuantityRequests } = useNotifications();
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
      <div className={`flex items-center p-6 border-b border-slate-200/60 dark:border-slate-700/60 ${isCollapsed ? 'justify-center' : 'space-x-4'}`}>
        <div className="relative p-3 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-2xl shadow-elegant hover:shadow-blue transition-all duration-300 hover:scale-105">
          <Package className="h-6 w-6 text-white flex-shrink-0" />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-2xl blur-sm"></div>
        </div>
        {!isCollapsed && (
          <div>
            <span className="text-xl font-bold font-display bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">InventoryPro</span>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide">Management System</p>
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
                className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 text-white shadow-elegant hover:shadow-blue transform hover:scale-[1.02]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-gradient-to-r hover:from-slate-100 hover:to-slate-50 dark:hover:from-slate-800 dark:hover:to-slate-700 hover:shadow-soft'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon className={`h-5 w-5 flex-shrink-0 transition-all duration-300 ${isActive ? 'drop-shadow-sm' : 'group-hover:scale-110'}`} />
                {!isCollapsed && (
                  <div className="flex items-center justify-between flex-1">
                    <span>{item.name}</span>
                    {item.name === 'Access Requests' && pendingAccessRequests > 0 && (
                      <span className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center shadow-red animate-pulse">
                        {pendingAccessRequests}
                      </span>
                    )}
                    {item.name === 'Order Management' && pendingOrders > 0 && (
                      <span className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center shadow-red animate-pulse">
                        {pendingOrders}
                      </span>
                    )}
                    {item.name === 'Product Management' && user?.role === 'supplier' && pendingQuantityRequests > 0 && (
                      <span className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center shadow-red animate-pulse">
                        {pendingQuantityRequests}
                      </span>
                    )}
                  </div>
                )}
                {isCollapsed && item.name === 'Access Requests' && pendingAccessRequests > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center shadow-sm border border-white dark:border-slate-900">
                    {pendingAccessRequests > 9 ? '9+' : pendingAccessRequests}
                  </span>
                )}
                {isCollapsed && item.name === 'Order Management' && pendingOrders > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center shadow-sm border border-white dark:border-slate-900">
                    {pendingOrders > 9 ? '9+' : pendingOrders}
                  </span>
                )}
                {isCollapsed && item.name === 'Product Management' && user?.role === 'supplier' && pendingQuantityRequests > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center shadow-sm border border-white dark:border-slate-900">
                    {pendingQuantityRequests > 9 ? '9+' : pendingQuantityRequests}
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
            <div className="flex items-center space-x-3 mb-4 p-3 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border border-slate-200/50 dark:border-slate-600/50">
              <Avatar className="ring-2 ring-blue-200 dark:ring-blue-700 shadow-soft hover:ring-blue-300 dark:hover:ring-blue-600 transition-all duration-300">
                <AvatarImage 
                  src={user?.profilePicture || user?.avatar} 
                  alt={user?.name}
                />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold">
                  {user?.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-slate-800 dark:text-slate-200">{user?.name}</p>
                <Badge variant={getRoleBadgeVariant(user?.role || '')} className="text-xs font-medium shadow-soft">
                  {getRoleDisplayName(user?.role || '')}
                </Badge>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300 group rounded-xl"
            >
              <LogOut className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
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
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-900 dark:via-slate-800/90 dark:to-indigo-900/30 overflow-hidden relative">
      {/* Enhanced animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-blue-400/8 to-purple-600/8 rounded-full blur-3xl animate-pulse float"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-br from-cyan-400/8 to-blue-600/8 rounded-full blur-3xl animate-pulse delay-1000 float"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-gradient-to-br from-purple-400/5 to-pink-600/5 rounded-full blur-3xl animate-pulse delay-500 float"></div>
        <div className="absolute top-10 left-1/3 w-64 h-64 bg-gradient-to-br from-emerald-400/6 to-teal-600/6 rounded-full blur-2xl animate-pulse delay-2000 float"></div>
        <div className="absolute bottom-10 right-1/3 w-80 h-80 bg-gradient-to-br from-rose-400/6 to-orange-600/6 rounded-full blur-2xl animate-pulse delay-3000 float"></div>
      </div>
      {/* Desktop Sidebar */}
      <div className={`hidden md:flex md:flex-col transition-all duration-300 relative ${isSidebarCollapsed ? 'md:w-16' : 'md:w-64'}`}>
        <div className="flex flex-col h-full bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border-r border-slate-200/80 dark:border-slate-700/80 shadow-elegant-lg">
          <SidebarContent isCollapsed={isSidebarCollapsed} />
        </div>
        
        {/* Simple Sidebar Toggle Arrow */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-8 group z-20 p-2 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 rounded-full shadow-elegant-lg border border-slate-200/80 dark:border-slate-700/80 transition-all duration-300 hover:shadow-blue hover:scale-110 backdrop-blur-xl"
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
        <SheetContent side="left" className="p-0 w-64 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border-r border-slate-200/80 dark:border-slate-700/80">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border-b border-slate-200/80 dark:border-slate-700/80 px-6 py-4 flex items-center justify-between flex-shrink-0 shadow-elegant relative overflow-hidden">
          {/* Header background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-50/20 to-transparent dark:via-blue-900/10 pointer-events-none"></div>
          <div className="flex items-center space-x-4 relative z-10">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden hover:bg-slate-100 dark:hover:bg-slate-800">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
            </Sheet>
            
            <div className="hidden md:block relative z-10">
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200 tracking-tight">
                {navigation.find(item => item.href === location.pathname)?.name || 'Dashboard'}
              </h1>
              <div className="h-0.5 w-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mt-1"></div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Enhanced Notification Bell Button */}
            <button
              onClick={() => setIsNotificationPanelOpen(true)}
              className="relative p-3 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-gradient-to-r hover:from-slate-100 hover:to-slate-50 dark:hover:from-slate-800 dark:hover:to-slate-700 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 group hover:shadow-soft"
              aria-label="Open notifications"
            >
              <Bell className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center bg-gradient-to-r from-red-500 to-red-600 text-white border-2 border-white dark:border-slate-900 shadow-red animate-pulse"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </button>

            <div className="flex items-center space-x-3 p-2 rounded-xl bg-gradient-to-r from-slate-50/50 to-slate-100/50 dark:from-slate-800/50 dark:to-slate-700/50 border border-slate-200/50 dark:border-slate-600/50 hover:shadow-soft transition-all duration-300">
              <Avatar className="h-10 w-10 ring-2 ring-blue-200 dark:ring-blue-700 shadow-soft hover:ring-blue-300 dark:hover:ring-blue-600 transition-all duration-300 hover:scale-105">
                <AvatarImage 
                  src={user?.profilePicture || user?.avatar} 
                  alt={user?.name}
                />
                <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold">
                  {user?.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{user?.name}</p>
                <Badge variant={getRoleBadgeVariant(user?.role || '')} className="text-xs font-medium shadow-soft">
                  {getRoleDisplayName(user?.role || '')}
                </Badge>
                <Link to="/dashboard/profile" className="text-xs text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 block mt-1 transition-colors duration-300 hover:underline">View Profile</Link>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area - Enhanced with better spacing and animations */}
        <main className="flex-1 overflow-hidden relative">
          <div className="h-full overflow-auto">
            <div className="h-full p-8 animate-fade-in-up">
              <div className="h-full w-full max-w-none space-y-6">
                {children}
              </div>
            </div>
          </div>
          {/* Subtle content overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-50/20 dark:to-slate-900/20 pointer-events-none"></div>
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