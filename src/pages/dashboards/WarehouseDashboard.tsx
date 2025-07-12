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
import { 
  Package, 
  TruckIcon as Truck, 
  Plus, 
  Minus, 

  PackageCheck,
  PackageX
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getAllInventoryItems, adjustStock, getLowStockItems } from '@/services/inventoryService';
import { getAllShipments, subscribeToShipments, Shipment } from '@/services/shipmentService';
import { InventoryItem } from '@/types/inventory';

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
  const [isLoading, setIsLoading] = useState(true);
  
  // Computed stats from real data
  const quickStats = {
    totalItems: inventoryItems.reduce((sum, item) => sum + item.quantity, 0),
    lowStock: lowStockItems.length,
    recentUpdates: inventoryItems.filter(item => {
      const updatedAt = item.lastUpdated?.toDate ? item.lastUpdated.toDate() : new Date(item.lastUpdated || 0);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return updatedAt > yesterday;
    }).length,
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
      const [inventoryData, lowStockData, shipmentsData] = await Promise.all([
        getAllInventoryItems(),
        getLowStockItems(),
        getAllShipments()
      ]);
      
      setInventoryItems(inventoryData);
      setLowStockItems(lowStockData);
      setShipments(shipmentsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStockUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockForm.productId || !stockForm.quantity || !user) {
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
    navigate('/warehouse-management');
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
                <div className="text-2xl font-bold text-yellow-600">{quickStats.lowStock}</div>
                <p className="text-xs text-muted-foreground">Need restocking</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Updates</CardTitle>
                <PackageCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{quickStats.recentUpdates}</div>
                <p className="text-xs text-muted-foreground">Last 24 hours</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Shipments</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{quickStats.pendingShipments}</div>
                <p className="text-xs text-muted-foreground">Awaiting processing</p>
              </CardContent>
            </Card>
          </div>

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
    </div>
  );
}