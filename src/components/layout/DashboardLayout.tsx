import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  ClipboardList,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'warehouse_staff', 'supplier', 'internal_user'] },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Package2, roles: ['admin', 'warehouse_staff'] },
  { name: 'Orders', href: '/dashboard/orders', icon: ShoppingCart, roles: ['admin', 'warehouse_staff', 'internal_user'] },
  { name: 'Suppliers', href: '/dashboard/suppliers', icon: Users, roles: ['admin', 'supplier'] },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3, roles: ['admin'] },
  { name: 'User Management', href: '/dashboard/user-management', icon: UserCog, roles: ['admin'] },
  { name: 'Warehouse Management', href: '/dashboard/warehouse-management', icon: Warehouse, roles: ['warehouse_staff'] },
  { name: 'Product Management', href: '/dashboard/product-management', icon: Package, roles: ['supplier'] },
  { name: 'Catalog & Requests', href: '/dashboard/catalog-requests', icon: ClipboardList, roles: ['internal_user'] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
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
      <div className={`flex items-center p-6 border-b ${isCollapsed ? 'justify-center' : 'space-x-2'}`}>
        <Package className="h-8 w-8 text-primary flex-shrink-0" />
        {!isCollapsed && <span className="text-xl font-bold">InventoryPro</span>}
      </div>
      
      <nav className="flex-1 space-y-1 p-4">
        <TooltipProvider>
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            const navItem = (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span>{item.name}</span>}
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

      <div className="p-4 border-t">
        {!isCollapsed ? (
          <>
            <div className="flex items-center space-x-3 mb-4">
              <Avatar>
                <AvatarFallback>
                  {user?.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <Badge variant={getRoleBadgeVariant(user?.role || '')} className="text-xs">
                  {getRoleDisplayName(user?.role || '')}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start text-white hover:text-white hover:bg-muted/80 transition-colors"
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
                    <Avatar className="h-8 w-8">
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
                    className="w-full justify-center text-white hover:text-white hover:bg-muted/80 transition-colors"
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
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <div className={`hidden md:flex md:flex-col transition-all duration-300 relative ${isSidebarCollapsed ? 'md:w-16' : 'md:w-64'}`}>
        <div className="flex flex-col h-full border-r bg-muted/10">
          <SidebarContent isCollapsed={isSidebarCollapsed} />
        </div>
        
        {/* Simple Sidebar Toggle Arrow */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-8 group z-20 p-1 hover:bg-muted/50 rounded transition-colors duration-200"
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors duration-200" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors duration-200" />
          )}
        </button>
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-background border-b px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
            </Sheet>
            
            <div className="hidden md:block">
              <h1 className="text-xl font-semibold">
                {navigation.find(item => item.href === location.pathname)?.name || 'Dashboard'}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Clean Notification Bell Button */}
            <button
              onClick={() => setIsNotificationPanelOpen(true)}
              className="relative p-2 text-white hover:text-white hover:bg-muted/50 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label="Open notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </button>

            <div className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {user?.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="text-sm font-medium">{user?.name}</p>
                <Badge variant={getRoleBadgeVariant(user?.role || '')} className="text-xs">
                  {getRoleDisplayName(user?.role || '')}
                </Badge>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area - Full Height with Consistent Padding */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full overflow-auto">
            <div className="h-full p-6">
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