import { useState } from 'react';
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
  Search,
  PackageCheck,
  PackageX,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';

// Mock data
const shipments = {
  incoming: [
    { id: 'SH-001', supplier: 'TechCorp Industries', items: 15, status: 'In Transit', eta: '2024-01-16' },
    { id: 'SH-002', supplier: 'Office Supplies Co', items: 8, status: 'Arriving Today', eta: '2024-01-15' },
    { id: 'SH-003', supplier: 'Furniture Plus', items: 3, status: 'Delayed', eta: '2024-01-17' },
  ],
  outgoing: [
    { id: 'OUT-001', destination: 'IT Department', items: 5, status: 'Ready to Ship', requestedBy: 'Alice Johnson' },
    { id: 'OUT-002', destination: 'Marketing', items: 2, status: 'Processing', requestedBy: 'Bob Smith' },
    { id: 'OUT-003', destination: 'HR', items: 8, status: 'Shipped', requestedBy: 'Carol Davis' },
  ]
};

const quickStats = {
  totalItems: 1247,
  lowStock: 12,
  recentUpdates: 23,
  pendingShipments: 6
};

export default function WarehouseDashboard() {
  const [stockForm, setStockForm] = useState({
    productId: '',
    quantity: '',
    action: 'in',
    notes: ''
  });

  const handleStockUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockForm.productId || !stockForm.quantity) {
      toast.error('Please fill in all required fields');
      return;
    }

    const action = stockForm.action === 'in' ? 'added to' : 'removed from';
    toast.success(`${stockForm.quantity} units ${action} inventory for ${stockForm.productId}`);
    
    // Reset form
    setStockForm({
      productId: '',
      quantity: '',
      action: 'in',
      notes: ''
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Arriving Today':
      case 'Ready to Ship':
        return 'default';
      case 'In Transit':
      case 'Processing':
        return 'secondary';
      case 'Delayed':
        return 'destructive';
      case 'Shipped':
        return 'outline';
      default:
        return 'outline';
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
        <div className="flex space-x-2">
          <Button variant="outline">
            <BarChart3 className="mr-2 h-4 w-4" />
            View Reports
          </Button>
          <Button>
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
                <div className="text-2xl font-bold">{quickStats.totalItems.toLocaleString()}</div>
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
                    <Label htmlFor="productId">Product ID / SKU</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="productId"
                        placeholder="Search by ID or SKU"
                        value={stockForm.productId}
                        onChange={(e) => setStockForm(prev => ({ ...prev, productId: e.target.value }))}
                        className="pl-8"
                      />
                    </div>
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
                        {shipments.incoming.map((shipment) => (
                          <div key={shipment.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <p className="font-medium text-sm">{shipment.id}</p>
                                <Badge variant={getStatusBadgeVariant(shipment.status)}>
                                  {shipment.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">{shipment.supplier}</p>
                              <p className="text-xs text-muted-foreground">
                                {shipment.items} items • ETA: {shipment.eta}
                              </p>
                            </div>
                            <Button size="sm" variant="outline">
                              Track
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="outgoing" className="space-y-4">
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-3">
                        {shipments.outgoing.map((shipment) => (
                          <div key={shipment.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <p className="font-medium text-sm">{shipment.id}</p>
                                <Badge variant={getStatusBadgeVariant(shipment.status)}>
                                  {shipment.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">{shipment.destination}</p>
                              <p className="text-xs text-muted-foreground">
                                {shipment.items} items • {shipment.requestedBy}
                              </p>
                            </div>
                            <Button size="sm" variant="outline">
                              Process
                            </Button>
                          </div>
                        ))}
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