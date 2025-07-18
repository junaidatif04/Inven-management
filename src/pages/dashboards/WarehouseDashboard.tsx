import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Package, 
  TruckIcon as Truck, 
  Plus, 
  Minus, 
  Eye,

  PackageX,

} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getAllInventoryItems, adjustStock, getLowStockItems } from '@/services/inventoryService';
import { getAllShipments, subscribeToShipments, Shipment } from '@/services/shipmentService';
import { getAllDisplayRequests, createQuantityRequest } from '@/services/displayRequestService';
import { InventoryItem } from '@/types/inventory';
import { DisplayRequest } from '@/types/displayRequest';

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
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [displayRequests, setDisplayRequests] = useState<DisplayRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showQuantityRequestDialog, setShowQuantityRequestDialog] = useState(false);
  const [selectedDisplayRequest, setSelectedDisplayRequest] = useState<DisplayRequest | null>(null);
  const [quantityRequestForm, setQuantityRequestForm] = useState({ quantity: 0, requestedQuantity: 0, notes: '', urgency: 'medium' });
  
  // Computed stats from real data
  const quickStats = {
    totalItems: inventoryItems.reduce((sum, item) => sum + item.quantity, 0),
    lowStock: lowStockItems.length,
    pendingDisplayRequests: displayRequests.filter(dr => dr.status === 'pending').length,
    pendingShipments: shipments.filter(s => s.status === 'pending' || s.status === 'processing').length
  };
  
  const incomingShipments = shipments.filter(s => s.type === 'incoming');
  const outgoingShipments = shipments.filter(s => s.type === 'outgoing');
  
  useEffect(() => {
    loadInitialData();
    
    // Set up real-time subscription for shipments
    const unsubscribe = subscribeToShipments((updatedShipments) => {
      setShipments(updatedShipments);
    });
    
    return () => unsubscribe();
  }, []);
  
  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const [inventoryData, lowStockData, shipmentsData, displayRequestsData] = await Promise.all([
        getAllInventoryItems(),
        getLowStockItems(),
        getAllShipments(),
        getAllDisplayRequests()
      ]);
      
      setInventoryItems(inventoryData);
      setLowStockItems(lowStockData);
      setShipments(shipmentsData);
      setDisplayRequests(displayRequestsData);
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
      
      // Refresh inventory data
      const [inventoryData, lowStockData] = await Promise.all([
        getAllInventoryItems(),
        getLowStockItems()
      ]);
      setInventoryItems(inventoryData);
      setLowStockItems(lowStockData);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update stock');
    }
  };

  const handleNewShipment = () => {
    navigate('/dashboard/warehouse-management');
  };



  const handleCreateQuantityRequest = async () => {
    if (!selectedDisplayRequest || !user?.id || quantityRequestForm.quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    try {
      await createQuantityRequest({
        displayRequestId: selectedDisplayRequest.id,
        productId: selectedDisplayRequest.productId,
        productName: selectedDisplayRequest.productName,
        supplierId: selectedDisplayRequest.supplierId,
        supplierName: selectedDisplayRequest.supplierName,
        supplierEmail: selectedDisplayRequest.supplierEmail,
        requestedBy: user.id,
        requesterName: user.displayName || user.email || 'Warehouse Staff',
        requestedQuantity: quantityRequestForm.requestedQuantity
      }, user.id, user.displayName || user.email || 'Warehouse Staff');
      
      toast.success('Quantity request sent to supplier');
      setShowQuantityRequestDialog(false);
      setSelectedDisplayRequest(null);
      setQuantityRequestForm({ quantity: 0, requestedQuantity: 0, notes: '', urgency: 'medium' });
    } catch (error) {
      console.error('Error creating quantity request:', error);
      toast.error('Failed to create quantity request');
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'arriving_today':
      case 'ready_to_ship':
      case 'delivered':
        return 'default';
      case 'in_transit':
      case 'processing':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      case 'pending':
        return 'outline';
      default:
        return 'outline';
    }
  };
  
  const formatStatusText = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };
  
  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString();
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
        <div className="flex space-x-2">
          <Button onClick={handleNewShipment}>
            <Plus className="mr-2 h-4 w-4" />
            New Shipment
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="space-y-6 pb-6">
          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                <CardTitle className="text-sm font-medium">Display Requests</CardTitle>
                <Eye className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{quickStats.pendingDisplayRequests}</div>
                <p className="text-xs text-muted-foreground">Pending review</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Shipments</CardTitle>
                <Truck className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{quickStats.pendingShipments}</div>
                <p className="text-xs text-muted-foreground">Awaiting processing</p>
              </CardContent>
            </Card>
          </div>

          {/* Display Requests Management */}
          <Card>
            <CardHeader>
              <CardTitle>Display Requests</CardTitle>
              <CardDescription>
                Review and manage display requests from suppliers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading display requests...
                    </div>
                  ) : displayRequests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No display requests found
                    </div>
                  ) : (
                    displayRequests.map((request) => (
                      <div key={request.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <h4 className="font-medium">{request.productName}</h4>
                            <p className="text-sm text-muted-foreground">
                              Supplier: {request.supplierName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Requested: {formatDate(request.createdAt)}
                            </p>
                          </div>
                          <Badge variant={request.status === 'pending' ? 'secondary' : request.status === 'accepted' ? 'default' : 'destructive'}>
                            {request.status}
                          </Badge>
                        </div>
                        

                        
                        {request.status === 'pending' && (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setSelectedDisplayRequest(request);
                                setShowQuantityRequestDialog(true);
                              }}
                              className="flex-1"
                            >
                              <Package className="mr-2 h-4 w-4" />
                              Request Quantity
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Stock Update Panel */}
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

            {/* Shipments */}
            <Card>
              <CardHeader>
                <CardTitle>Shipments</CardTitle>
                <CardDescription>
                  Track incoming and outgoing shipments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="incoming" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="incoming">Incoming</TabsTrigger>
                    <TabsTrigger value="outgoing">Outgoing</TabsTrigger>
                  </TabsList>

                  <TabsContent value="incoming" className="space-y-4">
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-3">
                        {isLoading ? (
                          <div className="text-center py-8 text-muted-foreground">
                            Loading shipments...
                          </div>
                        ) : incomingShipments.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            No incoming shipments
                          </div>
                        ) : (
                          incomingShipments.map((shipment) => (
                            <div key={shipment.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <p className="font-medium text-sm">{shipment.trackingNumber}</p>
                                  <Badge variant={getStatusBadgeVariant(shipment.status)}>
                                    {formatStatusText(shipment.status)}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">{shipment.supplier || 'Unknown Supplier'}</p>
                                <p className="text-xs text-muted-foreground">
                                  {shipment.items} items • ETA: {formatDate(shipment.eta)}
                                </p>
                              </div>
                              <Button size="sm" variant="outline">
                                Track
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="outgoing" className="space-y-4">
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-3">
                        {isLoading ? (
                          <div className="text-center py-8 text-muted-foreground">
                            Loading shipments...
                          </div>
                        ) : outgoingShipments.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            No outgoing shipments
                          </div>
                        ) : (
                          outgoingShipments.map((shipment) => (
                            <div key={shipment.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <p className="font-medium text-sm">{shipment.trackingNumber}</p>
                                  <Badge variant={getStatusBadgeVariant(shipment.status)}>
                                    {formatStatusText(shipment.status)}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">{shipment.destination || 'Unknown Destination'}</p>
                                <p className="text-xs text-muted-foreground">
                                  {shipment.items} items • {shipment.requestedBy || 'Unknown'}
                                </p>
                              </div>
                              <Button size="sm" variant="outline">
                                Process
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Quantity Request Dialog */}
      <Dialog open={showQuantityRequestDialog} onOpenChange={setShowQuantityRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Quantity Request</DialogTitle>
            <DialogDescription>
              Request specific quantities for {selectedDisplayRequest?.productName}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateQuantityRequest} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="requestedQuantity">Requested Quantity</Label>
              <Input
                id="requestedQuantity"
                type="number"
                placeholder="Enter quantity needed"
                value={quantityRequestForm.requestedQuantity}
                onChange={(e) => setQuantityRequestForm(prev => ({ ...prev, requestedQuantity: parseInt(e.target.value) || 0 }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="urgency">Urgency Level</Label>
              <Select value={quantityRequestForm.urgency} onValueChange={(value) => setQuantityRequestForm(prev => ({ ...prev, urgency: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select urgency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                placeholder="Additional notes or requirements"
                value={quantityRequestForm.notes}
                onChange={(e) => setQuantityRequestForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowQuantityRequestDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Create Request
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}