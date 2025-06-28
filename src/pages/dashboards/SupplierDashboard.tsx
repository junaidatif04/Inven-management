import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  Clock,
  Plus,
  Edit,
  CalendarIcon,
  Send
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Mock data
const supplierStats = {
  totalProducts: 45,
  activeOrders: 12,
  monthlyRevenue: 125000,
  pendingPOs: 8
};

const supplierProducts = [
  { id: 'SP-001', name: 'Laptop Dell XPS 13', category: 'Electronics', price: 1299, stock: 25, status: 'Active' },
  { id: 'SP-002', name: 'Wireless Mouse', category: 'Accessories', price: 49, stock: 150, status: 'Active' },
  { id: 'SP-003', name: 'USB-C Hub', category: 'Accessories', price: 79, stock: 0, status: 'Out of Stock' },
  { id: 'SP-004', name: 'Monitor 27" 4K', category: 'Electronics', price: 399, stock: 12, status: 'Low Stock' },
];

const purchaseOrders = [
  { id: 'PO-001', items: [{ name: 'Laptop Dell XPS 13', quantity: 10 }], total: 12990, requestedDate: '2024-01-15', deadline: '2024-01-25', status: 'Pending' },
  { id: 'PO-002', items: [{ name: 'Wireless Mouse', quantity: 50 }], total: 2450, requestedDate: '2024-01-14', deadline: '2024-01-20', status: 'Confirmed' },
  { id: 'PO-003', items: [{ name: 'USB-C Hub', quantity: 25 }], total: 1975, requestedDate: '2024-01-13', deadline: '2024-01-22', status: 'Pending' },
];

export default function SupplierDashboard() {
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [deliveryDate, setDeliveryDate] = useState<Date>();
  const [response, setResponse] = useState('');
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});

  const handlePOResponse = (poId: string) => {
    if (!deliveryDate) {
      toast.error('Please select a delivery date');
      return;
    }

    toast.success(`Response submitted for ${poId}`);
    setSelectedPO(null);
    setDeliveryDate(undefined);
    setResponse('');
    setQuantities({});
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Active':
        return 'default';
      case 'Low Stock':
        return 'secondary';
      case 'Out of Stock':
        return 'destructive';
      case 'Pending':
        return 'secondary';
      case 'Confirmed':
        return 'default';
      default:
        return 'outline';
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supplier Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your product catalog and purchase orders
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <TrendingUp className="mr-2 h-4 w-4" />
            Analytics
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="space-y-6 pb-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{supplierStats.totalProducts}</div>
                <p className="text-xs text-muted-foreground">In catalog</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{supplierStats.activeOrders}</div>
                <p className="text-xs text-muted-foreground">In progress</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${supplierStats.monthlyRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending POs</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{supplierStats.pendingPOs}</div>
                <p className="text-xs text-muted-foreground">Need response</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Product Catalog */}
            <Card>
              <CardHeader>
                <CardTitle>Your Product Catalog</CardTitle>
                <CardDescription>
                  Manage your products and inventory
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {supplierProducts.map((product) => (
                      <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-sm">{product.name}</p>
                            <Badge variant={getStatusBadgeVariant(product.status)}>
                              {product.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{product.category} • {product.id}</p>
                          <div className="flex items-center space-x-4 text-xs">
                            <span className="font-medium">${product.price}</span>
                            <span className="text-muted-foreground">Stock: {product.stock}</span>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Purchase Orders */}
            <Card>
              <CardHeader>
                <CardTitle>Purchase Orders</CardTitle>
                <CardDescription>
                  Respond to incoming purchase orders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="pending" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="pending">Pending Response</TabsTrigger>
                    <TabsTrigger value="all">All Orders</TabsTrigger>
                  </TabsList>

                  <TabsContent value="pending" className="space-y-4">
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-3">
                        {purchaseOrders.filter(po => po.status === 'Pending').map((po) => (
                          <div key={po.id} className="p-3 border rounded-lg space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <p className="font-medium text-sm">{po.id}</p>
                                <Badge variant={getStatusBadgeVariant(po.status)}>
                                  {po.status}
                                </Badge>
                              </div>
                              <p className="text-sm font-medium">${po.total.toLocaleString()}</p>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              <p>Requested: {po.requestedDate}</p>
                              <p>Deadline: {po.deadline}</p>
                            </div>
                            <div className="space-y-1">
                              {po.items.map((item, index) => (
                                <p key={index} className="text-xs">
                                  {item.name} × {item.quantity}
                                </p>
                              ))}
                            </div>
                            <Button 
                              size="sm" 
                              className="w-full"
                              onClick={() => setSelectedPO(po)}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Respond
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="all" className="space-y-4">
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-3">
                        {purchaseOrders.map((po) => (
                          <div key={po.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <p className="font-medium text-sm">{po.id}</p>
                                <Badge variant={getStatusBadgeVariant(po.status)}>
                                  {po.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {po.items.length} items • ${po.total.toLocaleString()}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Due: {po.deadline}
                              </p>
                            </div>
                            <Button size="sm" variant="outline">
                              View
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

      {/* PO Response Modal */}
      {selectedPO && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Respond to {selectedPO.id}</CardTitle>
              <CardDescription>
                Confirm quantities and delivery date
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Items</Label>
                {selectedPO.items.map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">{item.name}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-muted-foreground">Requested: {item.quantity}</span>
                      <Input
                        type="number"
                        placeholder={item.quantity.toString()}
                        className="w-20 h-8"
                        value={quantities[item.name] || item.quantity}
                        onChange={(e) => setQuantities(prev => ({
                          ...prev,
                          [item.name]: parseInt(e.target.value) || 0
                        }))}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Delivery Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {deliveryDate ? format(deliveryDate, 'PPP') : 'Select delivery date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={deliveryDate}
                      onSelect={setDeliveryDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Additional Notes</Label>
                <Textarea
                  placeholder="Any additional information..."
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                />
              </div>

              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setSelectedPO(null)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1"
                  onClick={() => handlePOResponse(selectedPO.id)}
                >
                  Submit Response
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}