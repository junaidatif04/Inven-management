import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { NavigationHeader } from '@/components/NavigationHeader';
import { 
  Plus, 
  Search, 
  Package, 
  Edit, 
  Eye,
  CalendarIcon,
  Send,

  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Mock data
const supplierProducts = [
  { id: 'SP-001', name: 'Laptop Dell XPS 13', category: 'Electronics', price: 1299, stock: 25, status: 'Active', lastUpdated: '2024-01-15' },
  { id: 'SP-002', name: 'Wireless Mouse', category: 'Accessories', price: 49, stock: 150, status: 'Active', lastUpdated: '2024-01-14' },
  { id: 'SP-003', name: 'USB-C Hub', category: 'Accessories', price: 79, stock: 0, status: 'Out of Stock', lastUpdated: '2024-01-13' },
  { id: 'SP-004', name: 'Monitor 27" 4K', category: 'Electronics', price: 399, stock: 12, status: 'Low Stock', lastUpdated: '2024-01-12' },
  { id: 'SP-005', name: 'Keyboard Mechanical', category: 'Accessories', price: 129, stock: 45, status: 'Active', lastUpdated: '2024-01-11' },
];

const purchaseOrders = [
  {
    id: 'PO-001',
    items: [{ name: 'Laptop Dell XPS 13', quantity: 10, price: 1299 }],
    total: 12990,
    requestedDate: '2024-01-15',
    deadline: '2024-01-25',
    status: 'Pending',
    customer: 'TechCorp Industries',
    notes: 'Urgent order for new project'
  },
  {
    id: 'PO-002',
    items: [{ name: 'Wireless Mouse', quantity: 50, price: 49 }],
    total: 2450,
    requestedDate: '2024-01-14',
    deadline: '2024-01-20',
    status: 'Confirmed',
    customer: 'Office Solutions Ltd',
    notes: 'Regular monthly order'
  },
  {
    id: 'PO-003',
    items: [{ name: 'USB-C Hub', quantity: 25, price: 79 }],
    total: 1975,
    requestedDate: '2024-01-13',
    deadline: '2024-01-22',
    status: 'Pending',
    customer: 'StartupXYZ',
    notes: 'New customer order'
  },
];

const sections = [
  { id: 'products', name: 'Product Catalog' },
  { id: 'purchase-orders', name: 'Purchase Orders' }
];

export default function ProductManagementPage() {
  const [activeSection, setActiveSection] = useState('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [deliveryDate, setDeliveryDate] = useState<Date>();
  const [response, setResponse] = useState('');
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    category: '',
    price: '',
    stock: '',
    description: ''
  });

  const filteredProducts = supplierProducts.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      case 'Completed':
        return 'outline';
      default:
        return 'outline';
    }
  };

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

  const handleCreateProduct = () => {
    if (!newProductForm.name || !newProductForm.category || !newProductForm.price) {
      toast.error('Please fill in all required fields');
      return;
    }
    toast.success('Product created successfully');
    setNewProductForm({
      name: '',
      category: '',
      price: '',
      stock: '',
      description: ''
    });
  };

  const handleUpdateProduct = (productId: string) => {
    toast.success(`Product ${productId} updated successfully`);
  };

  const getCurrentSectionName = () => {
    return sections.find(s => s.id === activeSection)?.name || '';
  };

  const renderProducts = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Product Catalog</h2>
          <p className="text-sm text-muted-foreground">
            Manage your products and inventory
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>
                Add a new product to your catalog
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Product Name</Label>
                <Input
                  placeholder="Enter product name"
                  value={newProductForm.name}
                  onChange={(e) => setNewProductForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={newProductForm.category} onValueChange={(value) => setNewProductForm(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Electronics">Electronics</SelectItem>
                      <SelectItem value="Accessories">Accessories</SelectItem>
                      <SelectItem value="Furniture">Furniture</SelectItem>
                      <SelectItem value="Office Supplies">Office Supplies</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Price ($)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={newProductForm.price}
                    onChange={(e) => setNewProductForm(prev => ({ ...prev, price: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Initial Stock</Label>
                <Input
                  type="number"
                  placeholder="Enter stock quantity"
                  value={newProductForm.stock}
                  onChange={(e) => setNewProductForm(prev => ({ ...prev, stock: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Product description..."
                  value={newProductForm.description}
                  onChange={(e) => setNewProductForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <Button onClick={handleCreateProduct} className="w-full">
                Add Product
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products by name or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">{product.category}</p>
                    <p className="text-sm text-muted-foreground">ID: {product.id}</p>
                  </div>
                  <Badge variant={getStatusBadgeVariant(product.status)}>
                    {product.status}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Price:</span>
                    <span className="font-bold">${product.price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Stock:</span>
                    <span className="font-medium">{product.stock} units</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Updated:</span>
                    <span className="text-sm">{product.lastUpdated}</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => setSelectedProduct(product)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </DialogTrigger>
                    {selectedProduct && (
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Product Details</DialogTitle>
                          <DialogDescription>
                            {selectedProduct.name} - {selectedProduct.id}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium">Category</Label>
                              <p className="text-sm">{selectedProduct.category}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Status</Label>
                              <Badge variant={getStatusBadgeVariant(selectedProduct.status)} className="mt-1">
                                {selectedProduct.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium">Price</Label>
                              <p className="text-sm font-bold">${selectedProduct.price}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Stock</Label>
                              <p className="text-sm">{selectedProduct.stock} units</p>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Last Updated</Label>
                            <p className="text-sm">{selectedProduct.lastUpdated}</p>
                          </div>
                          <div className="flex space-x-2 pt-4">
                            <Button 
                              variant="outline" 
                              className="flex-1"
                              onClick={() => handleUpdateProduct(selectedProduct.id)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                            <Button className="flex-1">
                              <Package className="mr-2 h-4 w-4" />
                              Update Stock
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    )}
                  </Dialog>
                  <Button size="sm" variant="outline" className="flex-1">
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderPurchaseOrders = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Purchase Orders</h2>
        <p className="text-sm text-muted-foreground">
          Manage incoming purchase orders and respond to requests
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {purchaseOrders.map((po) => (
              <div key={po.id} className="p-4 border rounded-lg space-y-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{po.id}</p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(po.status)}>
                      {po.status}
                    </Badge>
                  </div>
                  <p className="text-lg font-bold">${po.total.toLocaleString()}</p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">Customer</Label>
                    <p className="font-medium">{po.customer}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Requested</Label>
                    <p>{po.requestedDate}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Deadline</Label>
                    <p>{po.deadline}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Items</Label>
                    <p>{po.items.length} product(s)</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Items:</Label>
                  {po.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                      <span className="text-sm">{item.name}</span>
                      <span className="text-sm font-medium">
                        {item.quantity} × ${item.price} = ${(item.quantity * item.price).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                {po.notes && (
                  <div>
                    <Label className="text-sm font-medium">Notes:</Label>
                    <p className="text-sm text-muted-foreground">{po.notes}</p>
                  </div>
                )}

                <div className="flex space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedPO(po)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Details
                      </Button>
                    </DialogTrigger>
                    {selectedPO && (
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Purchase Order Response</DialogTitle>
                          <DialogDescription>
                            Respond to {selectedPO.id} from {selectedPO.customer}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
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
                            <Label>Response Notes</Label>
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
                              <Send className="mr-2 h-4 w-4" />
                              Submit Response
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    )}
                  </Dialog>
                  
                  {po.status === 'Pending' && (
                    <Button 
                      size="sm"
                      onClick={() => setSelectedPO(po)}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Respond
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="h-full flex flex-col space-y-6">
      <NavigationHeader
        title="Product Management"
        description="Manage your product catalog and handle purchase orders"
        currentSection={getCurrentSectionName()}
        sections={sections}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="pb-6">
          {activeSection === 'products' && renderProducts()}
          {activeSection === 'purchase-orders' && renderPurchaseOrders()}
        </div>
      </div>
    </div>
  );
}