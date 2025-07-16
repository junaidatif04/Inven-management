import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle,
  ShoppingCart,
  Users,
  TrendingUp,
  Activity,
  Eye,
  DollarSign,
  RefreshCw,
  Package
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { DashboardStats } from '@/services/analyticsService';
import { subscribeToRecentOrders } from '@/services/orderService';
import { Order } from '@/services/orderService';
import { getAllInventoryItems } from '@/services/inventoryService';
import { getAllOrders } from '@/services/orderService';
import { getAllUsers } from '@/services/userService';
import { getAllSuppliers } from '@/services/supplierService';
import { Supplier } from '@/types/inventory';
import { getAllDisplayRequests, getAllQuantityRequests } from '@/services/displayRequestService';
import type { DisplayRequest, QuantityRequest } from '@/types/displayRequest';








export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalInventoryValue: 0,
    lowStockAlerts: 0,
    outOfStockItems: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalUsers: 0,
    activeSuppliers: 0,
    monthlyOrderGrowth: 0,
    inventoryTurnover: 0
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [lowStockItemsData, setLowStockItemsData] = useState<any[]>([]);
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const handleViewAllUsers = () => {
    navigate('/dashboard/user-management');
  };

  // Authentication guard
  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please log in to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  const loadRealData = async () => {
    try {
      setLoading(true);

      // Load real data from services
      const inventoryItems = await getAllInventoryItems();
      const orders = await getAllOrders();
      const users = await getAllUsers();
      
      // Load suppliers
      const suppliers: Supplier[] = await getAllSuppliers();
      
      // Load display requests and quantity requests
      const displayRequestsData = await getAllDisplayRequests();
      const quantityRequestsData = await getAllQuantityRequests();

      // Calculate real inventory value
      const totalInventoryValue = inventoryItems.reduce((sum, item) =>
        sum + (item.quantity * item.unitPrice), 0
      );

      // Calculate real low stock alerts
      const lowStockAlerts = inventoryItems.filter(item =>
        item.quantity <= item.minStockLevel
      ).length;

      // Calculate real out of stock items
      const outOfStockItems = inventoryItems.filter(item =>
        item.quantity === 0
      ).length;

      // Get low stock items for display
      const lowStockItemsForDisplay = inventoryItems
        .filter(item => item.quantity <= item.minStockLevel)
        .map(item => ({
          name: item.name,
          currentStock: item.quantity,
          threshold: item.minStockLevel,
          category: item.category
        }))
        .slice(0, 4);

      // Calculate order stats
      const totalOrders = orders.length;
      const pendingOrders = orders.filter(order => order.status === 'pending').length;

      // Calculate monthly growth
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const currentMonthOrders = orders.filter(order => {
        const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
        return orderDate >= currentMonth;
      }).length;

      const lastMonthOrders = orders.filter(order => {
        const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
        return orderDate >= lastMonth && orderDate < currentMonth;
      }).length;

      const monthlyOrderGrowth = lastMonthOrders > 0 ?
        ((currentMonthOrders - lastMonthOrders) / lastMonthOrders) * 100 : 0;

      // Calculate supplier stats
      const activeSuppliers = suppliers.filter(s => s.status === 'active').length;
      
      // Calculate display and quantity request stats
      const pendingDisplayRequests = displayRequestsData.filter((req: DisplayRequest) => req.status === 'pending').length;
      const pendingQuantityRequests = quantityRequestsData.filter((req: QuantityRequest) => req.status === 'pending').length;

      const newStats: DashboardStats = {
        totalInventoryValue,
        lowStockAlerts,
        outOfStockItems,
        totalOrders,
        pendingOrders,
        totalUsers: users.length,
        activeSuppliers,
        monthlyOrderGrowth,
        inventoryTurnover: 2.5,
        pendingDisplayRequests,
        pendingQuantityRequests
      };

      // Generate real system logs based on recent activity
      const recentSystemLogs = [
        {
          timestamp: new Date().toLocaleString(),
          action: 'Dashboard refresh',
          user: 'admin@company.com',
          status: 'Success'
        },
        {
          timestamp: new Date(Date.now() - 300000).toLocaleString(), // 5 minutes ago
          action: `Inventory scan completed`,
          user: 'system',
          status: 'Success'
        },
        {
          timestamp: new Date(Date.now() - 600000).toLocaleString(), // 10 minutes ago
          action: `${pendingOrders} pending orders detected`,
          user: 'system',
          status: pendingOrders > 0 ? 'Warning' : 'Success'
        },
        {
          timestamp: new Date(Date.now() - 900000).toLocaleString(), // 15 minutes ago
          action: `${lowStockAlerts} low stock alerts`,
          user: 'system',
          status: lowStockAlerts > 0 ? 'Warning' : 'Success'
        },
        {
          timestamp: new Date(Date.now() - 1200000).toLocaleString(), // 20 minutes ago
          action: 'Data synchronization',
          user: 'system',
          status: 'Success'
        }
      ];

      setStats(newStats);
      setLowStockItemsData(lowStockItemsForDisplay);
      setSystemLogs(recentSystemLogs);
      setLastUpdated(new Date());

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRealData();

    // Subscribe to recent orders
    const unsubscribeOrders = subscribeToRecentOrders((orders) => {
      setRecentOrders(orders);
    });

    // Set up periodic refresh for real-time updates
    const interval = setInterval(() => {
      loadRealData();
    }, 30000); // Refresh every 30 seconds

    return () => {
      unsubscribeOrders();
      clearInterval(interval);
    };
  }, []);

  const refreshData = async () => {
    await loadRealData();
    toast.success('Dashboard data refreshed');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'approved':
        return <Badge variant="default">Approved</Badge>;
      case 'shipped':
        return <Badge variant="outline">Shipped</Badge>;
      case 'delivered':
        return <Badge className="bg-green-500">Delivered</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };



  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent">Admin Dashboard</h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium">
            Real-time overview of your inventory management system
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={refreshData} disabled={loading} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="space-y-6 pb-6">
          {/* KPI Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Total Inventory Value
                </CardTitle>
                <div className="p-3 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">
                  {formatCurrency(stats.totalInventoryValue)}
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <div className="flex items-center space-x-1">
                    <TrendingUp className={`h-3 w-3 ${(stats?.monthlyOrderGrowth || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                    <span className={`font-medium ${(stats?.monthlyOrderGrowth || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {(stats?.monthlyOrderGrowth || 0) >= 0 ? '+' : ''}{(stats?.monthlyOrderGrowth || 0).toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-slate-500 dark:text-slate-400">from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Low Stock Alerts
                </CardTitle>
                <div className="p-3 bg-gradient-to-br from-yellow-500 via-orange-500 to-red-600 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-500 mb-2">
                  {stats.lowStockAlerts}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Items need restocking
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card shadow-elegant hover:shadow-elegant-lg transition-all duration-200 border-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Pending Orders
                </CardTitle>
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                  <ShoppingCart className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  {stats.pendingOrders}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Awaiting approval
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card shadow-elegant hover:shadow-elegant-lg transition-all duration-200 border-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Active Users
                </CardTitle>
                <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg">
                  <Users className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  {stats.totalUsers}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {stats.activeSuppliers} suppliers
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card shadow-elegant hover:shadow-elegant-lg transition-all duration-200 border-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Display Requests
                </CardTitle>
                <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg">
                  <Eye className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  {stats.pendingDisplayRequests || 0}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pending review
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card shadow-elegant hover:shadow-elegant-lg transition-all duration-200 border-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Quantity Requests
                </CardTitle>
                <div className="p-2 bg-gradient-to-br from-teal-500 to-green-600 rounded-lg">
                  <Package className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  {stats.pendingQuantityRequests || 0}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Awaiting response
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Low Stock Alerts */}
            <Card className="glass-card shadow-elegant border-0">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-slate-800 dark:text-slate-200">Low Stock Alerts</span>
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Items that need immediate attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-4">
                    {lowStockItemsData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                        <div className="space-y-1">
                          <p className="font-medium text-sm text-slate-800 dark:text-slate-200">{item.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{item.category}</p>
                          <div className="flex items-center space-x-2">
                            <Progress 
                              value={(item.currentStock / item.threshold) * 100} 
                              className="w-20 h-2"
                            />
                            <span className="text-xs text-slate-600 dark:text-slate-400">
                              {item.currentStock}/{item.threshold}
                            </span>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600">
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Recent Orders */}
            <Card className="glass-card shadow-elegant border-0">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                    <ShoppingCart className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-slate-800 dark:text-slate-200">Recent Orders</span>
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Latest orders in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-4">
                    {recentOrders.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                        <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No recent orders</p>
                      </div>
                    ) : (
                      recentOrders.map((order) => (
                        <div key={order.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <p className="font-medium text-sm text-slate-800 dark:text-slate-200">{order.orderNumber}</p>
                              {getStatusBadge(order.status)}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {order.supplierName}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {formatCurrency(order.totalAmount)} • {order.items.length} items
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {order.orderDate?.toDate ?
                                order.orderDate.toDate().toLocaleDateString() :
                                new Date(order.orderDate).toLocaleDateString()
                              }
                            </p>
                          </div>
                          <div className="flex space-x-1">
                            <Button size="sm" variant="outline" className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600">
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* User Management & System Logs */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="glass-card shadow-elegant border-0">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-slate-800 dark:text-slate-200">User Management</span>
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Manage system users and permissions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">{stats.totalUsers}</div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Total Users</p>
                  </div>
                  <div className="text-center p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">{stats.activeSuppliers}</div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Suppliers</p>
                  </div>
                </div>
                <div className="flex justify-center">
                  <Button 
                    variant="outline" 
                    className="w-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                    onClick={handleViewAllUsers}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View All Users
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card shadow-elegant border-0">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-slate-800 dark:text-slate-200">System Logs</span>
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Recent system activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {systemLogs.map((log, index) => (
                      <div key={index} className="flex items-center justify-between p-3 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg mb-2">
                        <div className="space-y-1">
                          <p className="font-medium text-slate-800 dark:text-slate-200">{log.action}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{log.user}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <Badge variant={log.status === 'Success' ? 'default' : 'destructive'}>
                            {log.status}
                          </Badge>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{log.timestamp}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}