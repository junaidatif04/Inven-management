import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  ShoppingCart,
  Package,
  CheckCircle,
  Clock,
  RefreshCw,
  Eye,
  Plus,
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { getAllOrders, updateOrderStatus, deleteOrder, Order, subscribeToOrders, bulkUpdateOrderStatus } from '@/services/orderService';
import { getAllSuppliers } from '@/services/supplierService';
import OrderDialog from '@/components/OrderDialog';
import OrderStatusDialog from '@/components/OrderStatusDialog';

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    total: number;
    pending: number;
    approved: number;
    totalValue: number;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Bulk selection state
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  
  // Dialog states
  const [orderDialog, setOrderDialog] = useState({
    open: false,
    mode: 'create' as 'create' | 'edit' | 'view',
    order: null as Order | null
  });
  
  // Delete confirmation
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    orderId: '',
    orderNumber: ''
  });
  
  // Status update dialog
  const [statusDialog, setStatusDialog] = useState({
    open: false,
    order: null as Order | null
  });

  const loadRealData = async () => {
    try {
      setLoading(true);

      // Set a timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        console.warn('Orders loading timeout - falling back to direct fetch');
        fallbackToDirectFetch();
      }, 10000); // 10 second timeout

      // Load suppliers for mapping
      const suppliersData = await getAllSuppliers();

      // Subscribe to real-time orders
      const unsubscribe = subscribeToOrders((ordersData) => {
        clearTimeout(timeoutId);
        
        // Map supplier names to orders
        const ordersWithSupplierNames = ordersData.map(order => ({
          ...order,
          supplierName: suppliersData.find(s => s.id === order.supplierId)?.name || 'Unknown Supplier'
        }));

        setOrders(ordersWithSupplierNames);
        
        // Calculate and set stats
        const calculatedStats = {
          total: ordersWithSupplierNames.length,
          pending: ordersWithSupplierNames.filter(o => o.status === 'pending').length,
          approved: ordersWithSupplierNames.filter(o => o.status === 'approved').length,
          totalValue: ordersWithSupplierNames.reduce((sum, order) => sum + order.totalAmount, 0),
        };
        setStats(calculatedStats);
        
        setLastUpdated(new Date());
        setLoading(false);
      });

      // Return cleanup function
      return () => {
        clearTimeout(timeoutId);
        unsubscribe();
      };

    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders data');
      fallbackToDirectFetch();
    }
  };

  const fallbackToDirectFetch = async () => {
    try {
      console.log('Using fallback direct fetch for orders');
      const [ordersData, suppliersData] = await Promise.all([
        getAllOrders(),
        getAllSuppliers()
      ]);
      
      const ordersWithSupplierNames = ordersData.map(order => ({
        ...order,
        supplierName: suppliersData.find(s => s.id === order.supplierId)?.name || 'Unknown Supplier'
      }));
      
      setOrders(ordersWithSupplierNames);
      
      // Calculate and set stats
      const calculatedStats = {
        total: ordersWithSupplierNames.length,
        pending: ordersWithSupplierNames.filter(o => o.status === 'pending').length,
        approved: ordersWithSupplierNames.filter(o => o.status === 'approved').length,
        totalValue: ordersWithSupplierNames.reduce((sum, order) => sum + order.totalAmount, 0),
      };
      setStats(calculatedStats);
      
      setLastUpdated(new Date());
      setLoading(false);
      toast.success('Orders loaded successfully');
    } catch (error) {
      console.error('Error in fallback fetch:', error);
      toast.error('Failed to load orders');
      setLoading(false);
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    const setupSubscription = async () => {
      unsubscribe = await loadRealData();
    };
    
    setupSubscription();
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, filterStatus]);

  const filterOrders = () => {
    let filtered = orders;
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.requestedBy.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(order => order.status === filterStatus);
    }
    
    setFilteredOrders(filtered);
  };

  // Clear selected orders when filters change
  useEffect(() => {
    setSelectedOrders(prev => prev.filter(id => filteredOrders.some(order => order.id === id)));
  }, [filteredOrders]);

  const handleStatusUpdate = async (orderId: string, newStatus: Order['status'], cancellationReason?: string) => {
    if (!user || !user.id) {
      toast.error('User not authenticated');
      return;
    }
    
    try {
      // Update in database
      await updateOrderStatus(orderId, newStatus, user.id, cancellationReason);

      // Update local state
      setOrders(prev => prev.map(order =>
        order.id === orderId ? { ...order, status: newStatus, cancellationReason } : order
      ));

      toast.success('Order status updated successfully');
      setLastUpdated(new Date());
      setStatusDialog({ open: false, order: null });
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };
  
  const openStatusDialog = (order: Order) => {
    setStatusDialog({ open: true, order });
  };
  
  const closeStatusDialog = () => {
    setStatusDialog({ open: false, order: null });
  };

  const refreshData = async () => {
    try {
      setLoading(true);
      setStats(null); // Reset stats to show loading state
      
      const suppliersData = await getAllSuppliers();
      const ordersData = await getAllOrders();
      
      const ordersWithSupplierNames = ordersData.map(order => ({
        ...order,
        supplierName: suppliersData.find(s => s.id === order.supplierId)?.name || 'Unknown Supplier'
      }));
      
      setOrders(ordersWithSupplierNames);
      
      // Calculate and set stats
      const calculatedStats = {
        total: ordersWithSupplierNames.length,
        pending: ordersWithSupplierNames.filter(o => o.status === 'pending').length,
        approved: ordersWithSupplierNames.filter(o => o.status === 'approved').length,
        totalValue: ordersWithSupplierNames.reduce((sum, order) => sum + order.totalAmount, 0),
      };
      setStats(calculatedStats);
      
      setLastUpdated(new Date());
      toast.success('Orders data refreshed');
    } catch (error) {
      console.error('Error refreshing orders:', error);
      toast.error('Failed to refresh orders');
    } finally {
      setLoading(false);
    }
  };
  
  // Bulk selection functions
  const handleSelectOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders(prev => [...prev, orderId]);
    } else {
      setSelectedOrders(prev => prev.filter(id => id !== orderId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(filteredOrders.map(order => order.id));
    } else {
      setSelectedOrders([]);
    }
  };

  // Status hierarchy validation
  const getValidNextStatuses = (currentStatus: Order['status']): Order['status'][] => {
    switch (currentStatus) {
      case 'pending':
        return ['approved', 'cancelled'];
      case 'approved':
        return ['shipped']; // Cannot cancel once approved
      case 'shipped':
        return ['delivered']; // Cannot cancel once shipped
      case 'delivered':
        return []; // Cannot change from delivered
      case 'cancelled':
        return []; // Cannot change from cancelled
      default:
        return [];
    }
  };

  const canBulkUpdateToStatus = (targetStatus: Order['status']): boolean => {
    if (selectedOrders.length === 0) return false;
    
    const selectedOrdersData = filteredOrders.filter(order => selectedOrders.includes(order.id));
    
    return selectedOrdersData.every(order => {
      const validStatuses = getValidNextStatuses(order.status);
      return validStatuses.includes(targetStatus);
    });
  };

  const getInvalidOrdersForStatus = (targetStatus: Order['status']): Order[] => {
    const selectedOrdersData = filteredOrders.filter(order => selectedOrders.includes(order.id));
    
    return selectedOrdersData.filter(order => {
      const validStatuses = getValidNextStatuses(order.status);
      return !validStatuses.includes(targetStatus);
    });
  };

  const handleBulkStatusUpdate = async (status: Order['status']) => {
    if (selectedOrders.length === 0) {
      toast.error('Please select orders to update');
      return;
    }

    // Check if all selected orders can be updated to the target status
    if (!canBulkUpdateToStatus(status)) {
      const invalidOrders = getInvalidOrdersForStatus(status);
      const invalidOrderNumbers = invalidOrders.map(order => order.orderNumber).join(', ');
      toast.error(`Cannot update orders ${invalidOrderNumbers} to ${status}. Invalid status transition.`);
      return;
    }

    setBulkActionLoading(true);
    try {
      // For cancellation, use system-generated reason like single order cancellation
      const cancellationReason = status === 'cancelled' ? 'Bulk cancellation by admin' : undefined;
      
      await bulkUpdateOrderStatus(selectedOrders, status, user?.id || '', cancellationReason);
      toast.success(`Successfully updated ${selectedOrders.length} order(s) to ${status}`);
      setSelectedOrders([]);
      await refreshData();
    } catch (error) {
      console.error('Error in bulk update:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update orders');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const isAllSelected = filteredOrders.length > 0 && selectedOrders.length === filteredOrders.length;
  
  // Dialog handlers
  const openCreateDialog = () => {
    setOrderDialog({ open: true, mode: 'create', order: null });
  };
  

  
  const openViewDialog = (order: Order) => {
    setOrderDialog({ open: true, mode: 'view', order });
  };
  
  const closeOrderDialog = () => {
    setOrderDialog({ open: false, mode: 'create', order: null });
  };
  
  // Delete handlers
  const openDeleteDialog = (orderId: string, orderNumber: string) => {
    setDeleteDialog({ open: true, orderId, orderNumber });
  };
  
  const closeDeleteDialog = () => {
    setDeleteDialog({ open: false, orderId: '', orderNumber: '' });
  };
  
  const handleDeleteOrder = async () => {
    if (!user || !user.id) {
      toast.error('User not authenticated');
      return;
    }
    
    try {
      await deleteOrder(deleteDialog.orderId, user.id);
      toast.success('Order deleted successfully');
      closeDeleteDialog();
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error('Failed to delete order');
    }
  };
  
  const handleDialogSuccess = () => {
    // Real-time subscription will automatically update the orders
    setLastUpdated(new Date());
  };



  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: any) => {
    const dateObj = date?.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString();
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Order Management</h1>
          <p className="text-muted-foreground">Real-time order tracking and management</p>
          <p className="text-xs text-muted-foreground mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={refreshData} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {/* Hide Place New Order button for admin and warehouse staff */}
          {user?.role !== 'admin' && user?.role !== 'warehouse_staff' && (
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Place New Order
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats === null ? (
          // Loading skeleton for stats cards
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approved Orders</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                <Package className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalValue)}</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Actions ({selectedOrders.length} selected)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => handleBulkStatusUpdate('approved')}
                disabled={bulkActionLoading || !canBulkUpdateToStatus('approved')}
                variant="outline"
                size="sm"
                title={!canBulkUpdateToStatus('approved') ? 'Some selected orders cannot be approved' : ''}
              >
                {bulkActionLoading ? 'Updating...' : 'Approve Selected'}
              </Button>
              <Button
                onClick={() => handleBulkStatusUpdate('shipped')}
                disabled={bulkActionLoading || !canBulkUpdateToStatus('shipped')}
                variant="outline"
                size="sm"
                title={!canBulkUpdateToStatus('shipped') ? 'Some selected orders cannot be marked as shipped' : ''}
              >
                {bulkActionLoading ? 'Updating...' : 'Mark as Shipped'}
              </Button>
              <Button
                onClick={() => handleBulkStatusUpdate('delivered')}
                disabled={bulkActionLoading || !canBulkUpdateToStatus('delivered')}
                variant="outline"
                size="sm"
                title={!canBulkUpdateToStatus('delivered') ? 'Some selected orders cannot be marked as delivered' : ''}
              >
                {bulkActionLoading ? 'Updating...' : 'Mark as Delivered'}
              </Button>
              <Button
                onClick={() => handleBulkStatusUpdate('cancelled')}
                disabled={bulkActionLoading || !canBulkUpdateToStatus('cancelled')}
                variant="destructive"
                size="sm"
                title={!canBulkUpdateToStatus('cancelled') ? 'Some selected orders cannot be cancelled' : ''}
              >
                {bulkActionLoading ? 'Updating...' : 'Cancel Selected'}
              </Button>
              <Button
                onClick={() => setSelectedOrders([])}
                variant="ghost"
                size="sm"
              >
                Clear Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>
            Manage and track all orders in real-time
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            // Loading skeleton for table
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Order #</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No orders found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all orders"
                    />
                  </TableHead>
                  <TableHead>Order #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedOrders.includes(order.id)}
                        onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
                        aria-label={`Select order ${order.orderNumber}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{order.orderNumber}</TableCell>
                    <TableCell>{order.supplierName}</TableCell>
                    <TableCell>{order.requestedBy}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                          order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                          order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openStatusDialog(order)}
                          className="h-6 px-2 text-xs"
                        >
                          Update
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                    <TableCell>{formatDate(order.orderDate || order.createdAt)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openViewDialog(order)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => openDeleteDialog(order.id, order.orderNumber)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Order
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Order Dialog */}
      <OrderDialog
        open={orderDialog.open}
        onOpenChange={closeOrderDialog}
        order={orderDialog.order}
        mode={orderDialog.mode}
        onSuccess={handleDialogSuccess}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={closeDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete order {deleteDialog.orderNumber}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOrder} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Order Status Dialog */}
      <OrderStatusDialog
        open={statusDialog.open}
        onOpenChange={closeStatusDialog}
        order={statusDialog.order}
        onStatusUpdate={handleStatusUpdate}
      />
    </div>
  );
}
