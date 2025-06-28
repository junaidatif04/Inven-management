import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { NavigationHeader } from '@/components/NavigationHeader';
import { 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  ShoppingCart,
  Package,
  Clock,
  CheckCircle,
  Star
} from 'lucide-react';
import { toast } from 'sonner';

// Mock product catalog
const productCatalog = [
  { 
    id: 'PROD-001', 
    name: 'Laptop Dell XPS 13', 
    category: 'Electronics', 
    price: 1299, 
    image: 'https://images.pexels.com/photos/205421/pexels-photo-205421.jpeg?auto=compress&cs=tinysrgb&w=200', 
    inStock: true,
    rating: 4.8,
    description: 'High-performance laptop for professional use',
    supplier: 'TechCorp Industries'
  },
  { 
    id: 'PROD-002', 
    name: 'Wireless Mouse', 
    category: 'Accessories', 
    price: 49, 
    image: 'https://images.pexels.com/photos/2115257/pexels-photo-2115257.jpeg?auto=compress&cs=tinysrgb&w=200', 
    inStock: true,
    rating: 4.5,
    description: 'Ergonomic wireless mouse with precision tracking',
    supplier: 'Office Supplies Co'
  },
  { 
    id: 'PROD-003', 
    name: 'Office Chair Ergonomic', 
    category: 'Furniture', 
    price: 299, 
    image: 'https://images.pexels.com/photos/586996/pexels-photo-586996.jpeg?auto=compress&cs=tinysrgb&w=200', 
    inStock: false,
    rating: 4.3,
    description: 'Comfortable ergonomic office chair with lumbar support',
    supplier: 'Furniture Plus'
  },
  { 
    id: 'PROD-004', 
    name: 'Monitor 27" 4K', 
    category: 'Electronics', 
    price: 399, 
    image: 'https://images.pexels.com/photos/777001/pexels-photo-777001.jpeg?auto=compress&cs=tinysrgb&w=200', 
    inStock: true,
    rating: 4.7,
    description: 'Ultra HD 4K monitor for enhanced productivity',
    supplier: 'TechCorp Industries'
  },
  { 
    id: 'PROD-005', 
    name: 'Desk Lamp LED', 
    category: 'Office', 
    price: 79, 
    image: 'https://images.pexels.com/photos/1036936/pexels-photo-1036936.jpeg?auto=compress&cs=tinysrgb&w=200', 
    inStock: true,
    rating: 4.2,
    description: 'Adjustable LED desk lamp with multiple brightness levels',
    supplier: 'Office Supplies Co'
  },
  { 
    id: 'PROD-006', 
    name: 'Keyboard Mechanical', 
    category: 'Accessories', 
    price: 129, 
    image: 'https://images.pexels.com/photos/1772123/pexels-photo-1772123.jpeg?auto=compress&cs=tinysrgb&w=200', 
    inStock: true,
    rating: 4.6,
    description: 'Mechanical keyboard with tactile switches',
    supplier: 'TechCorp Industries'
  },
];

// Mock user requests
const myRequests = [
  { 
    id: 'REQ-001', 
    items: [{ name: 'Laptop Dell XPS 13', quantity: 1, price: 1299 }], 
    status: 'Approved', 
    total: 1299, 
    requestDate: '2024-01-10', 
    progress: 75,
    location: 'Building A, Floor 3',
    justification: 'Need new laptop for development work'
  },
  { 
    id: 'REQ-002', 
    items: [{ name: 'Wireless Mouse', quantity: 2, price: 49 }], 
    status: 'Pending', 
    total: 98, 
    requestDate: '2024-01-12', 
    progress: 25,
    location: 'Building A, Floor 3',
    justification: 'Replace broken mice'
  },
  { 
    id: 'REQ-003', 
    items: [{ name: 'Monitor 27" 4K', quantity: 1, price: 399 }], 
    status: 'Fulfilled', 
    total: 399, 
    requestDate: '2024-01-08', 
    progress: 100,
    location: 'Building A, Floor 3',
    justification: 'Additional monitor for productivity'
  },
  { 
    id: 'REQ-004', 
    items: [{ name: 'Desk Lamp LED', quantity: 1, price: 79 }], 
    status: 'Rejected', 
    total: 79, 
    requestDate: '2024-01-05', 
    progress: 0,
    location: 'Building A, Floor 3',
    justification: 'Better lighting for workspace'
  },
];

const sections = [
  { id: 'catalog', name: 'Product Catalog' },
  { id: 'requests', name: 'My Requests' }
];

export default function CatalogRequestsPage() {
  const [activeSection, setActiveSection] = useState('catalog');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [requestForm, setRequestForm] = useState({
    location: '',
    justification: '',
    priority: 'Medium'
  });

  const categories = ['All', ...Array.from(new Set(productCatalog.map(p => p.category)))];
  
  const filteredProducts = productCatalog.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Approved':
      case 'Fulfilled':
        return 'default';
      case 'Pending':
        return 'secondary';
      case 'Rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const addToCart = (product: any) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    toast.success(`${product.name} added to cart`);
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.id !== productId));
    toast.success('Item removed from cart');
  };

  const submitRequest = () => {
    if (cart.length === 0) {
      toast.error('Please add items to cart first');
      return;
    }
    if (!requestForm.location || !requestForm.justification) {
      toast.error('Please fill in all required fields');
      return;
    }
    toast.success('Request submitted successfully');
    setCart([]);
    setRequestForm({
      location: '',
      justification: '',
      priority: 'Medium'
    });
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${i < Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  const getCurrentSectionName = () => {
    return sections.find(s => s.id === activeSection)?.name || '';
  };

  const renderCatalog = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Product Catalog</h2>
          <p className="text-sm text-muted-foreground">
            Browse and select products for your requests
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="px-3 py-1">
            Cart: {cart.length} items
          </Badge>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <ShoppingCart className="mr-2 h-4 w-4" />
                View Cart ({cart.length})
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Shopping Cart</DialogTitle>
                <DialogDescription>
                  Review your items and submit a request
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Your cart is empty</p>
                  </div>
                ) : (
                  <>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-3">
                        {cart.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <img 
                                src={item.image} 
                                alt={item.name} 
                                className="w-12 h-12 object-cover rounded"
                              />
                              <div>
                                <p className="font-medium">{item.name}</p>
                                <p className="text-sm text-muted-foreground">${item.price} each</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">Qty: {item.quantity}</span>
                              <span className="font-bold">${(item.price * item.quantity).toLocaleString()}</span>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => removeFromCart(item.id)}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    
                    <div className="border-t pt-4">
                      <div className="flex justify-between text-lg font-bold mb-4">
                        <span>Total:</span>
                        <span>${cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()}</span>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Location</Label>
                            <Input
                              placeholder="Building, Floor, Room"
                              value={requestForm.location}
                              onChange={(e) => setRequestForm(prev => ({ ...prev, location: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Priority</Label>
                            <Select value={requestForm.priority} onValueChange={(value) => setRequestForm(prev => ({ ...prev, priority: value }))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Low">Low</SelectItem>
                                <SelectItem value="Medium">Medium</SelectItem>
                                <SelectItem value="High">High</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Justification</Label>
                          <Textarea
                            placeholder="Explain why these items are needed..."
                            value={requestForm.justification}
                            onChange={(e) => setRequestForm(prev => ({ ...prev, justification: e.target.value }))}
                          />
                        </div>
                        
                        <Button onClick={submitRequest} className="w-full">
                          Submit Request
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Product Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative">
              <img 
                src={product.image} 
                alt={product.name} 
                className="w-full h-48 object-cover"
              />
            </div>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold truncate">{product.name}</h3>
                  <p className="text-sm text-muted-foreground">{product.category}</p>
                  <div className="flex items-center space-x-1 mt-1">
                    {getRatingStars(product.rating)}
                    <span className="text-sm text-muted-foreground ml-1">({product.rating})</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold">${product.price}</p>
                  <Badge variant={product.inStock ? 'default' : 'secondary'}>
                    {product.inStock ? 'In Stock' : 'Out of Stock'}
                  </Badge>
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
                          <DialogTitle>{selectedProduct.name}</DialogTitle>
                          <DialogDescription>
                            Product details and specifications
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <img 
                            src={selectedProduct.image} 
                            alt={selectedProduct.name} 
                            className="w-full h-48 object-cover rounded"
                          />
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Category:</span>
                              <span className="text-sm">{selectedProduct.category}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Price:</span>
                              <span className="text-sm font-bold">${selectedProduct.price}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Supplier:</span>
                              <span className="text-sm">{selectedProduct.supplier}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Rating:</span>
                              <div className="flex items-center space-x-1">
                                {getRatingStars(selectedProduct.rating)}
                                <span className="text-sm">({selectedProduct.rating})</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Description</Label>
                            <p className="text-sm text-muted-foreground mt-1">{selectedProduct.description}</p>
                          </div>
                          <Button 
                            onClick={() => addToCart(selectedProduct)} 
                            className="w-full"
                            disabled={!selectedProduct.inStock}
                          >
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            {selectedProduct.inStock ? 'Add to Cart' : 'Out of Stock'}
                          </Button>
                        </div>
                      </DialogContent>
                    )}
                  </Dialog>
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => addToCart(product)}
                    disabled={!product.inStock}
                  >
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderRequests = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">My Requests</h2>
        <p className="text-sm text-muted-foreground">
          Track the status of your purchase requests
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {myRequests.map((request) => (
              <div key={request.id} className="p-4 border rounded-lg space-y-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <p className="font-medium">{request.id}</p>
                    <Badge variant={getStatusBadgeVariant(request.status)}>
                      {request.status}
                    </Badge>
                  </div>
                  <p className="font-bold">${request.total}</p>
                </div>
                
                <div className="space-y-1">
                  {request.items.map((item, index) => (
                    <p key={index} className="text-sm text-muted-foreground">
                      {item.name} × {item.quantity}
                    </p>
                  ))}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{request.progress}%</span>
                  </div>
                  <Progress value={request.progress} className="h-2" />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Requested: {request.requestDate}
                  </span>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedRequest(request)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Details
                      </Button>
                    </DialogTrigger>
                    {selectedRequest && (
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Request Details</DialogTitle>
                          <DialogDescription>
                            {selectedRequest.id} - {selectedRequest.status}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium">Status</Label>
                              <Badge variant={getStatusBadgeVariant(selectedRequest.status)} className="mt-1">
                                {selectedRequest.status}
                              </Badge>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Total</Label>
                              <p className="text-sm font-bold">${selectedRequest.total}</p>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Items</Label>
                            <div className="mt-1 space-y-1">
                              {selectedRequest.items.map((item: any, index: number) => (
                                <p key={index} className="text-sm">
                                  {item.name} × {item.quantity} = ${(item.price * item.quantity).toLocaleString()}
                                </p>
                              ))}
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Location</Label>
                            <p className="text-sm">{selectedRequest.location}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Justification</Label>
                            <p className="text-sm text-muted-foreground">{selectedRequest.justification}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Progress</Label>
                            <div className="mt-1">
                              <Progress value={selectedRequest.progress} className="h-2" />
                              <p className="text-sm text-muted-foreground mt-1">{selectedRequest.progress}% complete</p>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    )}
                  </Dialog>
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
        title="Product Catalog & Requests"
        description="Browse products and manage your requests"
        currentSection={getCurrentSectionName()}
        sections={sections}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="pb-6">
          {activeSection === 'catalog' && renderCatalog()}
          {activeSection === 'requests' && renderRequests()}
        </div>
      </div>
    </div>
  );
}