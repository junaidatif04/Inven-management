import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Package, 
  Plus, 
  Minus, 
  Eye,
  PackageX,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Hourglass
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getAllInventoryItems, adjustStock, getLowStockItems, getStockMovements } from '@/services/inventoryService';
import { createQuantityRequest, getQuantityRequestsByRequester } from '@/services/displayRequestService';
import { CreateQuantityRequest, QuantityRequest } from '@/types/displayRequest';
import { subscribeToProposedProducts } from '@/services/productService';
import { InventoryItem, StockMovement } from '@/types/inventory';


export default function WarehouseDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stockForm, setStockForm] = useState({
    productId: '',
    quantity: '',
    action: 'in',
    notes: ''
  });
  
  // Real-time data states
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [proposedProducts, setProposedProducts] = useState<any[]>([]);
  const [recentStockMovements, setRecentStockMovements] = useState<StockMovement[]>([]);
  const [myQuantityRequests, setMyQuantityRequests] = useState<QuantityRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantityRequestForm, setQuantityRequestForm] = useState({ quantity: 1, notes: '' });
  const [showQuantityDialog, setShowQuantityDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Computed stats from real data
  const quickStats = {
    totalItems: inventoryItems.reduce((sum, item) => sum + item.quantity, 0),
    lowStock: lowStockItems.length,
    proposedProducts: proposedProducts.length
  };
  
  useEffect(() => {
    loadInitialData();
    
    // Set up real-time subscriptions
    const unsubscribeProposedProducts = subscribeToProposedProducts((updatedProposedProducts) => {
      setProposedProducts(updatedProposedProducts);
    });
    
    return () => {
      unsubscribeProposedProducts();
    };
  }, []);
  
  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const [inventoryData, lowStockData, stockMovements, quantityRequests] = await Promise.all([
        getAllInventoryItems(),
        getLowStockItems(),
        getStockMovements(),
        user?.id ? getQuantityRequestsByRequester(user.id) : Promise.resolve([])
      ]);
      
      setInventoryItems(inventoryData);
      setLowStockItems(lowStockData);
      setRecentStockMovements(stockMovements.slice(0, 10)); // Show only recent 10 movements
      setMyQuantityRequests(quantityRequests.slice(0, 5)); // Show only recent 5 requests
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStockUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockForm.productId || !stockForm.quantity || !user || !user.id) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await adjustStock(
        stockForm.productId,
        parseInt(stockForm.quantity),
        stockForm.action as 'in' | 'out',
        stockForm.notes || 'Quick stock update from dashboard',
        user.id,
        stockForm.notes
      );
      
      const action = stockForm.action === 'in' ? 'added to' : 'removed from';
      toast.success(`${stockForm.quantity} units ${action} inventory`);
      
      // Reset form and reload data
      setStockForm({
        productId: '',
        quantity: '',
        action: 'in',
        notes: ''
      });
      
      // Refresh inventory and stock movements data
      const [inventoryData, lowStockData, stockMovements] = await Promise.all([
        getAllInventoryItems(),
        getLowStockItems(),
        getStockMovements()
      ]);
      setInventoryItems(inventoryData);
      setLowStockItems(lowStockData);
      setRecentStockMovements(stockMovements.slice(0, 10));
    } catch (error: any) {
      toast.error(error.message || 'Failed to update stock');
    }
  };

  const handleNewShipment = () => {
    navigate('/dashboard/warehouse-management');
  };



  const handleRequestQuantity = async () => {
    if (!selectedProduct || !user?.id || quantityRequestForm.quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    try {
      setSubmitting(true);
      
      const requestData: CreateQuantityRequest = {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        supplierId: selectedProduct.supplierId,
        supplierName: selectedProduct.supplierName,
        supplierEmail: selectedProduct.supplierEmail,
        requestedBy: user.id,
        requesterName: user.displayName || user.email || 'Warehouse Staff',
        requestedQuantity: quantityRequestForm.quantity
      };

      await createQuantityRequest(requestData, user.id, user.displayName || user.email || 'Warehouse Staff');
      
      // Reset form
      setQuantityRequestForm({ quantity: 1, notes: '' });
      setShowQuantityDialog(false);
      setSelectedProduct(null);
      
      // Refresh quantity requests data
      if (user?.id) {
        const updatedRequests = await getQuantityRequestsByRequester(user.id);
        setMyQuantityRequests(updatedRequests.slice(0, 5));
      }
      
      toast.success('Quantity request sent to supplier');
      
    } catch (error) {
      console.error('Error creating quantity request:', error);
      toast.error('Failed to create quantity request');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString();
  };

  const formatDateTime = (date: any) => {
    if (!date) return 'N/A';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved_full': return 'bg-green-100 text-green-800';
      case 'approved_partial': return 'bg-blue-100 text-blue-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Hourglass className="h-3 w-3" />;
      case 'approved_full': return <CheckCircle className="h-3 w-3" />;
      case 'approved_partial': return <CheckCircle className="h-3 w-3" />;
      case 'rejected': return <XCircle className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'in': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'out': return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'adjustment': return <Package className="h-4 w-4 text-blue-500" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Warehouse Dashboard</h1>
          <p className="text-muted-foreground">
            Manage inventory and track shipments
          </p>
        </div>
        {user?.role !== 'warehouse_staff' && (
          <div className="flex space-x-2">
            <Button onClick={handleNewShipment}>
              <Plus className="mr-2 h-4 w-4" />
              New Shipment
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="space-y-6 pb-6">
          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(quickStats.totalItems || 0).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">In inventory</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                <PackageX className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{quickStats.lowStock}</div>
                <p className="text-xs text-muted-foreground">Need attention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Proposed Products</CardTitle>
                <Package className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{quickStats.proposedProducts}</div>
                <p className="text-xs text-muted-foreground">Available to order</p>
              </CardContent>
            </Card>
          </div>



          <div className="grid gap-6 lg:grid-cols-2">
            {/* Stock Update Panel - Hidden for warehouse staff */}
            {user?.role !== 'warehouse_staff' && (
              <Card>
                <CardHeader>
                  <CardTitle>Quick Stock Update</CardTitle>
                  <CardDescription>
                    Add or remove items from inventory
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleStockUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="productId">Product</Label>
                    <Select value={stockForm.productId} onValueChange={(value) => setStockForm(prev => ({ ...prev, productId: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {inventoryItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} - {item.sku}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        type="number"
                        placeholder="Enter quantity"
                        value={stockForm.quantity}
                        onChange={(e) => setStockForm(prev => ({ ...prev, quantity: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="action">Action</Label>
                      <Select value={stockForm.action} onValueChange={(value) => setStockForm(prev => ({ ...prev, action: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in">
                            <div className="flex items-center">
                              <Plus className="mr-2 h-4 w-4 text-green-500" />
                              Stock In
                            </div>
                          </SelectItem>
                          <SelectItem value="out">
                            <div className="flex items-center">
                              <Minus className="mr-2 h-4 w-4 text-red-500" />
                              Stock Out
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Input
                      id="notes"
                      placeholder="Add notes about this update"
                      value={stockForm.notes}
                      onChange={(e) => setStockForm(prev => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    Update Stock
                  </Button>
                </form>
              </CardContent>
            </Card>
            )}

            {/* Proposed Products */}
            <Card>
              <CardHeader>
                <CardTitle>Proposed Products</CardTitle>
                <CardDescription>
                  Request quantities from suppliers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {isLoading ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Loading proposed products...
                      </div>
                    ) : proposedProducts.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No proposed products found
                      </div>
                    ) : (
                      proposedProducts.map((product) => (
                        <div key={product.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <h4 className="font-medium">{product.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                Supplier: {product.supplierName || 'Unknown Supplier'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Price: ${product.price?.toFixed(2) || 'N/A'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Proposed: {formatDate(product.createdAt)}
                              </p>
                            </div>
                            <Badge variant="secondary">
                              Proposed
                            </Badge>
                          </div>
                          
                          {product.description && (
                            <p className="text-sm text-muted-foreground">
                              {product.description}
                            </p>
                          )}
                          
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => {
                                setSelectedProduct(product);
                                setShowQuantityDialog(true);
                              }}
                              className="flex-1"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Request Quantity
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate('/dashboard/product-management')}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Review
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

          {/* Additional Dashboard Sections */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Recent Stock Movements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Stock Movements
                </CardTitle>
                <CardDescription>
                  Latest inventory changes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {isLoading ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Loading movements...
                      </div>
                    ) : recentStockMovements.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No recent movements
                      </div>
                    ) : (
                      recentStockMovements.map((movement) => (
                        <div key={movement.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getMovementIcon(movement.type)}
                              <span className="font-medium text-sm">{movement.itemName}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {movement.type === 'in' ? '+' : movement.type === 'out' ? '-' : '±'}{movement.quantity}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{movement.reason}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(movement.timestamp)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* My Quantity Requests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  My Quantity Requests
                </CardTitle>
                <CardDescription>
                  Track your recent requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {isLoading ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Loading requests...
                      </div>
                    ) : myQuantityRequests.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No requests found
                      </div>
                    ) : (
                      myQuantityRequests.map((request) => (
                        <div key={request.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{request.productName}</span>
                            <Badge className={`text-xs flex items-center gap-1 ${getStatusColor(request.status)}`}>
                              {getStatusIcon(request.status)}
                              {request.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Qty: {request.requestedQuantity}</span>
                            <span>{request.supplierName}</span>
                          </div>
                          {request.approvedQuantity && (
                            <p className="text-xs text-green-600">
                              Approved: {request.approvedQuantity} units
                            </p>
                          )}
                          {request.rejectionReason && (
                            <p className="text-xs text-red-600">
                              Reason: {request.rejectionReason}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(request.requestedAt)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Low Stock Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Low Stock Alerts
                </CardTitle>
                <CardDescription>
                  Items requiring attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {isLoading ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Loading alerts...
                      </div>
                    ) : lowStockItems.length === 0 ? (
                      <div className="text-center py-8 text-green-600">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                        All items well stocked!
                      </div>
                    ) : (
                      lowStockItems.map((item) => (
                        <div key={item.id} className="border rounded-lg p-3 space-y-2 border-yellow-200 bg-yellow-50">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{item.name}</span>
                            <Badge variant="destructive" className="text-xs">
                              {item.quantity} left
                            </Badge>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Min: {item.minStockLevel}</span>
                            <span>SKU: {item.sku}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Supplier: {item.supplierName || 'N/A'}</span>
                            <span className="text-yellow-700 font-medium">
                              Need: {Math.max(0, item.minStockLevel - item.quantity)} units
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Quantity Request Dialog */}
      <Dialog open={showQuantityDialog} onOpenChange={setShowQuantityDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Quantity</DialogTitle>
            <DialogDescription>
              Request a specific quantity of {selectedProduct?.name} from {selectedProduct?.supplierName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantityRequestForm.quantity}
                onChange={(e) => setQuantityRequestForm(prev => ({
                  ...prev,
                  quantity: parseInt(e.target.value) || 1
                }))}
                placeholder="Enter quantity"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={quantityRequestForm.notes}
                onChange={(e) => setQuantityRequestForm(prev => ({
                  ...prev,
                  notes: e.target.value
                }))}
                placeholder="Add any additional notes..."
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowQuantityDialog(false);
                  setSelectedProduct(null);
                  setQuantityRequestForm({ quantity: 1, notes: '' });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRequestQuantity}
                disabled={submitting || quantityRequestForm.quantity <= 0}
              >
                {submitting ? 'Sending...' : 'Send Request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}