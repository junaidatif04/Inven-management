import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

import { Textarea } from '@/components/ui/textarea';
import { NavigationHeader } from '@/components/NavigationHeader';
import { useAuth } from '@/contexts/AuthContext';
import {
  Search,
  Filter,
  Eye,
  ShoppingCart,
  Package
} from 'lucide-react';
import { toast } from 'sonner';
import {
  CatalogRequest,
  CatalogRequestItem,
  createCatalogRequest,
  getCatalogRequestsByUser,
  subscribeToCatalogRequests
} from '@/services/catalogRequestService';
import { getAllProducts } from '@/services/productService';
import { getAllInventoryItems } from '@/services/inventoryService';

// Default product image
// Removed DEFAULT_PRODUCT_IMAGE - now showing 'No image' placeholder when no image is available

// Unified catalog item interface
interface CatalogItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  supplier: string;
  imageUrl?: string;
  type: 'product' | 'inventory';
  // Additional fields for inventory items
  quantity?: number;
  sku?: string;
  location?: string;
}

const sections = [
  { id: 'catalog', name: 'Product Catalog' },
  { id: 'requests', name: 'My Requests' }
];

export default function CatalogRequestsPage() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('catalog');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState<CatalogItem | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<CatalogRequest | null>(null);
  const [cart, setCart] = useState<CatalogRequestItem[]>([]);
  const [requestForm, setRequestForm] = useState({
    location: '',
    justification: '',
    priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Urgent'
  });
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [requests, setRequests] = useState<CatalogRequest[]>([]);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      try {

        
        // Load products and inventory items
        const [productsData, inventoryData] = await Promise.all([
          getAllProducts(),
          getAllInventoryItems()
        ]);
        
        // Convert products to catalog items
        const productCatalogItems: CatalogItem[] = productsData.map(product => ({
          id: product.id!,
          name: product.name,
          description: product.description,
          category: product.category,
          price: product.price,
          supplier: product.supplierName,
          imageUrl: product.imageUrl,
          type: 'product' as const
        }));
        
        // Convert inventory items to catalog items
        const inventoryCatalogItems: CatalogItem[] = inventoryData.map(item => ({
          id: item.id!,
          name: item.name,
          description: item.description,
          category: item.category,
          price: item.unitPrice,
          supplier: item.supplier,
          imageUrl: item.imageUrl,
          type: 'inventory' as const,
          quantity: item.quantity,
          sku: item.sku,
          location: item.location
        }));
        
        // Combine both types of items
        const allCatalogItems = [...productCatalogItems, ...inventoryCatalogItems];
        setCatalogItems(allCatalogItems);
        
        // Load user requests
        const requestsData = await getCatalogRequestsByUser(user.id);
        setRequests(requestsData);
        
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load data');
      } finally {

      }
    };

    loadData();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToCatalogRequests((updatedRequests) => {
      const userRequests = updatedRequests.filter(req => req.userId === user?.id);
      setRequests(userRequests);
    });

    return () => unsubscribe();
  }, [user]);

  const categories = ['All', ...Array.from(new Set(catalogItems.map(item => item.category)))];
  
  const filteredCatalogItems = catalogItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (catalogItem: CatalogItem) => {
    const existingItem = cart.find(item => item.productId === catalogItem.id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.productId === catalogItem.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      const newItem: CatalogRequestItem = {
        productId: catalogItem.id,
        productName: catalogItem.name,
        quantity: 1,
        price: catalogItem.price,
        category: catalogItem.category,
        supplier: catalogItem.supplier
      };
      setCart([...cart, newItem]);
    }
    toast.success(`${catalogItem.name} added to cart`);
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
    toast.success('Item removed from cart');
  };



  const getTotalAmount = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const submitRequest = async () => {
    if (!user) {
      toast.error('Please log in to submit a request');
      return;
    }

    if (cart.length === 0) {
      toast.error('Please add items to your cart before submitting');
      return;
    }

    if (!requestForm.location || !requestForm.justification) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      
      const requestData = {
        userId: user.id,
        userName: user.name || user.email,
        userEmail: user.email,
        items: cart,
        location: requestForm.location,
        justification: requestForm.justification,
        priority: requestForm.priority,
        totalAmount: getTotalAmount()
      };

      await createCatalogRequest(requestData);
      
      // Reset form and cart
      setCart([]);
      setRequestForm({
        location: '',
        justification: '',
        priority: 'Medium'
      });
      
      // Refresh requests
      const updatedRequests = await getCatalogRequestsByUser(user.id);
      setRequests(updatedRequests);
      
      toast.success('Request submitted successfully!');
      setActiveSection('requests');
      
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'High': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
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
            Browse and select products and inventory items for your requests
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
                        {cart.map((item, index) => (
                          <div key={`${item.productId}-${index}`} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-muted rounded overflow-hidden flex-shrink-0">
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                  <Package className="h-4 w-4" />
                                </div>
                              </div>
                              <div>
                                <p className="font-medium">{item.productName}</p>
                                <p className="text-sm text-muted-foreground">${item.price.toFixed(2)} each</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">Qty: {item.quantity}</span>
                              <span className="font-bold">${(item.price * item.quantity).toFixed(2)}</span>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => removeFromCart(item.productId)}
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
                        <span>${cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}</span>
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
                            <Select value={requestForm.priority} onValueChange={(value) => setRequestForm(prev => ({ ...prev, priority: value as 'Low' | 'Medium' | 'High' | 'Urgent' }))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Low">Low</SelectItem>
                                <SelectItem value="Medium">Medium</SelectItem>
                                <SelectItem value="High">High</SelectItem>
                                <SelectItem value="Urgent">Urgent</SelectItem>
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
                        
                        <Button 
                          onClick={submitRequest} 
                          className="w-full"
                          disabled={cart.length === 0 || !requestForm.location || !requestForm.justification || submitting}
                        >
                          {submitting ? 'Submitting...' : 'Submit Request'}
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
                placeholder="Search products and inventory..."
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

      {/* Catalog Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredCatalogItems.map((item) => (
          <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative w-full h-48 bg-muted overflow-hidden">
              {item.imageUrl ? (
                <img 
                  src={item.imageUrl} 
                  alt={item.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Package className="h-12 w-12 mx-auto mb-2" />
                    <p className="text-sm">No image</p>
                  </div>
                </div>
              )}
              {/* Type indicator */}
              <div className="absolute top-2 left-2">
                <Badge variant={item.type === 'inventory' ? 'default' : 'secondary'} className="text-xs">
                  {item.type === 'inventory' ? 'Inventory' : 'Product'}
                </Badge>
              </div>
            </div>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold truncate">{item.name}</h3>
                  <p className="text-sm text-muted-foreground">{item.category}</p>
                  {item.sku && (
                    <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold">${item.price.toFixed(2)}</p>
                  {item.type === 'inventory' ? (
                    <Badge variant={item.quantity && item.quantity > 0 ? 'default' : 'secondary'}>
                      {item.quantity && item.quantity > 0 ? `Stock: ${item.quantity}` : 'Out of Stock'}
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      Product
                    </Badge>
                  )}
                </div>

                <div className="flex space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => setSelectedProduct(item)}
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
                            {selectedProduct.type === 'inventory' ? 'Inventory item' : 'Product'} details and specifications
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="w-full h-48 bg-muted rounded overflow-hidden">
                            {selectedProduct.imageUrl ? (
                              <img 
                                src={selectedProduct.imageUrl} 
                                alt={selectedProduct.name} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <div className="text-center">
                                  <Package className="h-12 w-12 mx-auto mb-2" />
                                  <p className="text-sm">No image</p>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Type:</span>
                              <Badge variant={selectedProduct.type === 'inventory' ? 'default' : 'secondary'}>
                                {selectedProduct.type === 'inventory' ? 'Inventory' : 'Product'}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Category:</span>
                              <span className="text-sm">{selectedProduct.category}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Price:</span>
                              <span className="text-sm font-bold">${selectedProduct.price.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Supplier:</span>
                              <span className="text-sm">{selectedProduct.supplier}</span>
                            </div>
                            {selectedProduct.sku && (
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">SKU:</span>
                                <span className="text-sm">{selectedProduct.sku}</span>
                              </div>
                            )}
                            {selectedProduct.type === 'inventory' && selectedProduct.quantity !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Available:</span>
                                <span className="text-sm">{selectedProduct.quantity} units</span>
                              </div>
                            )}
                            {selectedProduct.location && (
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Location:</span>
                                <span className="text-sm">{selectedProduct.location}</span>
                              </div>
                            )}
                          </div>
                          {selectedProduct.description && (
                            <div>
                              <Label className="text-sm font-medium">Description</Label>
                              <p className="text-sm text-muted-foreground mt-1">{selectedProduct.description}</p>
                            </div>
                          )}
                          <Button 
                            onClick={() => addToCart(selectedProduct)} 
                            className="w-full"
                            disabled={selectedProduct.type === 'inventory' && (!selectedProduct.quantity || selectedProduct.quantity === 0)}
                          >
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            {selectedProduct.type === 'inventory' && (!selectedProduct.quantity || selectedProduct.quantity === 0) ? 'Out of Stock' : 'Add to Cart'}
                          </Button>
                        </div>
                      </DialogContent>
                    )}
                  </Dialog>
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => addToCart(item)}
                    disabled={item.type === 'inventory' && (!item.quantity || item.quantity === 0)}
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
            {requests.map((request) => (
              <div key={request.id} className="p-4 border rounded-lg space-y-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Request #{request.id}</h4>
                    <p className="text-sm text-muted-foreground">{request.createdAt ? new Date(request.createdAt.toDate()).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <Badge variant={getStatusBadgeVariant(request.status)}>
                    {request.status}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Items:</span>
                    <span>{request.items.length} items</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-semibold">${(request.totalAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                     <span className="text-muted-foreground">Priority:</span>
                     <Badge variant="outline" className={getPriorityColor(request.priority)}>
                       {request.priority}
                     </Badge>
                   </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Location:</span>
                    <span>{request.location}</span>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedRequest(request)}
                  className="w-full"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View Details
                </Button>
                
                {selectedRequest && selectedRequest.id === request.id && (
                  <Dialog open={true} onOpenChange={() => setSelectedRequest(null)}>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Request Details</DialogTitle>
                        <DialogDescription>
                          Request #{selectedRequest.id} - {selectedRequest.status}
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
                            <p className="text-sm font-bold">${(selectedRequest.totalAmount || 0).toFixed(2)}</p>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Items</Label>
                          <div className="mt-1 space-y-1">
                            {selectedRequest.items.map((item: any, index: number) => (
                              <p key={index} className="text-sm">
                                {item.productName} × {item.quantity} = ${(item.price * item.quantity).toFixed(2)}
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
                          <Label className="text-sm font-medium">Priority</Label>
                          <p className="text-sm">{selectedRequest.priority}</p>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
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