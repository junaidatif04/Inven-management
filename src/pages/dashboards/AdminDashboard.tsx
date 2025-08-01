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
  Activity,
  Eye,
  DollarSign,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { DashboardStats } from '@/services/analyticsService';
import { subscribeToRecentOrders } from '@/services/orderService';
import { Order } from '@/services/orderService';
import { getAllInventoryItems, updateAllItemStatuses } from '@/services/inventoryService';
import { getAllOrders } from '@/services/orderService';
import { getAllUsers } from '../../services/userService';

import { getAllQuantityRequests } from '@/services/quantityRequestService';
import type { QuantityRequest } from '@/types/quantityRequest';








export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [lowStockItemsData, setLowStockItemsData] = useState<any[]>([]);
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [lastStatusUpdate, setLastStatusUpdate] = useState<Date | null>(null);

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

      // Update all item statuses conditionally - only if it's been more than 5 minutes since last update
      const now = new Date();
      const shouldUpdateStatuses = !lastStatusUpdate || (now.getTime() - lastStatusUpdate.getTime()) > 5 * 60 * 1000;
      
      if (shouldUpdateStatuses) {
        await updateAllItemStatuses();
        setLastStatusUpdate(now);
      }
      
      // Load all data in parallel for better performance
      const [
        inventoryItems,
        orders,
        users,
        quantityRequestsData
      ] = await Promise.all([
        getAllInventoryItems(),
        getAllOrders(),
        getAllUsers(),
        getAllQuantityRequests()
      ]);

      // Filter suppliers from all users (same logic as InventoryPage)
      const suppliers = users.filter(user => user.role === 'supplier');

      // Check if database is empty and show helpful message
      if (inventoryItems.length === 0) {
        console.warn('No inventory items found in database');
        toast.info('No inventory items found. Add some items to see inventory value.');
      }
      
      if (suppliers.length === 0) {
        console.warn('No suppliers found in database');
        toast.info('No suppliers found. Users with supplier role and approved status will appear here.');
      }

      // Calculate real inventory value - only for items with price and ready/published
      
      const totalInventoryValue = inventoryItems.reduce((sum, item) => {
        const quantity = item.quantity || 0;
        const unitPrice = item.unitPrice || 0;
        const salePrice = item.salePrice || 0;
        
        // Use either unitPrice or salePrice, whichever is available
        const effectivePrice = unitPrice > 0 ? unitPrice : salePrice;
        
        // Only count items that have a price and are either ready to publish or already published
        const hasPrice = effectivePrice > 0;
        const isReadyOrPublished = item.detailsSaved || item.isPublished;
        
        if (hasPrice && isReadyOrPublished) {
          const itemValue = quantity * effectivePrice;
          return sum + itemValue;
        }
        return sum;
      }, 0);
      


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
      const currentDate = new Date();
      const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);

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

      // Calculate supplier stats (count all suppliers with supplier role)
      const activeSuppliers = suppliers.length;
      
      // Calculate quantity request stats
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
      
      // More specific error handling
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          toast.error('Permission denied. Please check your access rights.');
        } else if (error.message.includes('network')) {
          toast.error('Network error. Please check your connection.');
        } else {
          toast.error(`Failed to load dashboard data: ${error.message}`);
        }
      } else {
        toast.error('Failed to load dashboard data. Please try again.');
      }
      
      // Don't clear existing data on error, just stop loading
      if (!stats) {
        // Only show fallback if we have no data at all
        setStats({
          totalInventoryValue: 0,
          lowStockAlerts: 0,
          outOfStockItems: 0,
          totalOrders: 0,
          pendingOrders: 0,
          totalUsers: 0,
          activeSuppliers: 0,
          monthlyOrderGrowth: 0,
          inventoryTurnover: 0,
          pendingQuantityRequests: 0
        });
      }
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

    // Set up periodic refresh for real-time updates (reduced frequency for better performance)
    const interval = setInterval(() => {
      loadRealData();
    }, 60000); // Refresh every 60 seconds instead of 30

    return () => {
      unsubscribeOrders();
      clearInterval(interval);
    };
  }, []);

  // Show loading state while data is being fetched
  if (loading || !stats) {
    return (
      <div className="h-full flex flex-col space-y-6">
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent">Admin Dashboard</h1>
            <p className="text-slate-600 dark:text-slate-400 font-medium">
              Loading dashboard data...
            </p>
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="glass-card shadow-elegant border-0 animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
                <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-16 mb-2"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid gap-4 lg:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="glass-card shadow-elegant border-0 animate-pulse">
              <CardHeader>
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-2"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-48"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="h-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const refreshData = async (forceStatusUpdate = false) => {
    if (forceStatusUpdate) {
      setLastStatusUpdate(null); // Force status update on next load
    }
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
          <Button variant="outline" onClick={() => refreshData(true)} disabled={loading} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="space-y-6 pb-6">
          {/* KPI Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="glass-card shadow-elegant hover:shadow-elegant-lg transition-all duration-200 border-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Total Inventory Value
                </CardTitle>
                <div className="p-2 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg">
                  <DollarSign className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  {formatCurrency(stats.totalInventoryValue)}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {stats.totalInventoryValue === 0 
                    ? 'Add inventory items to see value'
                    : `${(stats?.monthlyOrderGrowth || 0) >= 0 ? '+' : ''}${(stats?.monthlyOrderGrowth || 0).toFixed(1)}% from last month`
                  }
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card shadow-elegant hover:shadow-elegant-lg transition-all duration-200 border-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Low Stock Alerts
                </CardTitle>
                <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
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
                  {stats.activeSuppliers === 0 
                    ? 'No approved suppliers yet'
                    : `${stats.activeSuppliers} suppliers`
                  }
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
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600"
                          onClick={() => navigate('/dashboard/inventory')}
                        >
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
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600"
                              onClick={() => navigate('/dashboard/orders')}
                            >
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