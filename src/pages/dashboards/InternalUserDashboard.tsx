import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  ShoppingCart, 
  Package, 
  Clock,
  CheckCircle,
  Search,
  Plus,
  Eye,
  Filter
} from 'lucide-react';
import {
  CatalogRequest,
  CatalogRequestItem,
  createCatalogRequest,
  getCatalogRequestsByUser,
  getCatalogRequestStats,
  subscribeToCatalogRequests
} from '@/services/catalogRequestService';
import { getAllProducts, Product } from '@/services/productService';
import { getAllInventoryItems } from '../../services/inventoryService';


// Default product image for products without images
// Removed DEFAULT_PRODUCT_IMAGE - now showing 'No image' placeholder when no image is available

export default function InternalUserDashboard() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory] = useState('All');
  const [products, setProducts] = useState<Product[]>([]);
  const [requests, setRequests] = useState<CatalogRequest[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    fulfilled: 0,
    rejected: 0,
    totalAmount: 0,
    averageAmount: 0
  });
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CatalogRequestItem[]>([]);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({
    location: '',
    justification: '',
    priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Urgent'
  });
  const [submitting, setSubmitting] = useState(false);


  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Load products and inventory items
        try {
          const [productsData, inventoryData] = await Promise.all([
            getAllProducts(),
            getAllInventoryItems()
          ]);
          
          // Convert inventory items to product format for unified display
          const inventoryAsProducts: Product[] = inventoryData.map(item => ({
            id: item.id!,
            name: item.name,
            category: item.category,
            price: item.unitPrice,
            stock: item.quantity,
            status: item.status === 'in_stock' ? 'active' : 
                   item.status === 'low_stock' ? 'low_stock' : 
                   item.status === 'out_of_stock' ? 'out_of_stock' : 'discontinued',
            description: item.description,
            sku: item.sku,
            imageUrl: item.imageUrl,
            imagePath: item.imagePath,
            supplierId: 'inventory',
            supplierName: item.supplier,
            supplier: item.supplier,
            createdAt: item.createdAt,
            updatedAt: item.lastUpdated,
            createdBy: item.updatedBy || 'system'
          }));
          
          // Combine products and inventory items
          const allProducts = [...productsData, ...inventoryAsProducts];
          console.log('Loaded products:', productsData.length, 'inventory items:', inventoryData.length, 'total:', allProducts.length);
          setProducts(allProducts);
        } catch (productError) {
          console.error('Error loading products:', productError);
          toast.error('Failed to load products');
          setProducts([]);
        }
        
        // Load user requests
        const requestsData = await getCatalogRequestsByUser(user.id);
        setRequests(requestsData);
        
        // Load stats
        const statsData = await getCatalogRequestStats(user.id);
        setStats(statsData);
        
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Subscribe to real-time updates for user's requests only
    const unsubscribe = subscribeToCatalogRequests((updatedRequests) => {
      setRequests(updatedRequests);
    }, user?.id);

    return () => unsubscribe();
  }, [user]);
  

  
  const filteredProducts = useMemo(() => {
    const filtered = products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
    console.log('Filtered products:', filtered.length, 'Total products:', products.length);
    return filtered;
  }, [products, searchTerm, selectedCategory]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'fulfilled':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getProgressPercentage = (status: string) => {
    switch (status) {
      case 'pending':
        return 25;
      case 'approved':
        return 75;
      case 'fulfilled':
        return 100;
      case 'rejected':
        return 0;
      default:
        return 0;
    }
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.productId === product.id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.productId === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      const newItem: CatalogRequestItem = {
        productId: product.id!,
        productName: product.name,
        quantity: 1,
        price: product.price,
        category: product.category,
        supplier: product.supplierName
      };
      setCart([...cart, newItem]);
    }
    toast.success(`${product.name} added to cart`);
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
    toast.success('Item removed from cart');
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(cart.map(item => 
      item.productId === productId 
        ? { ...item, quantity }
        : item
    ));
  };

  const getTotalAmount = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };



  const submitRequest = async () => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    if (cart.length === 0) {
      toast.error('Please add items to cart first');
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
        userEmail: user.email,
        userName: user.name,
        items: cart,
        location: requestForm.location,
        justification: requestForm.justification,
        priority: requestForm.priority
      };

      await createCatalogRequest(requestData);
      
      toast.success('Request submitted successfully!');
      setCart([]);
      setRequestForm({
        location: '',
        justification: '',
        priority: 'Medium'
      });
      setIsRequestDialogOpen(false);
      
      // Refresh data
      const updatedRequests = await getCatalogRequestsByUser(user.id);
      setRequests(updatedRequests);
      const updatedStats = await getCatalogRequestStats(user.id);
      setStats(updatedStats);
      
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }



  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Dashboard</h1>
          <p className="text-muted-foreground">
            Browse products and track your requests
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Create New Request</DialogTitle>
              <DialogDescription>
                Select items from the catalog to create a new request
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
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
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                </Button>
              </div>
              <ScrollArea className="h-[400px]">
                {filteredProducts.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {filteredProducts.map((product) => (
                      <div key={product.id} className="border rounded-lg p-4 space-y-3">
                        <div className="w-full h-32 bg-muted rounded overflow-hidden">
                          {product.imageUrl ? (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <div className="text-center">
                                <Package className="h-8 w-8 mx-auto mb-1" />
                                <p className="text-xs">No image</p>
                              </div>
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-sm">{product.name}</h3>
                          <p className="text-xs text-muted-foreground">{product.category}</p>
                          <p className="text-sm font-bold">${product.price}</p>
                        </div>
                        <Button 
                           size="sm" 
                           className="w-full" 
                           disabled={product.stock === 0}
                           onClick={() => addToCart(product)}
                         >
                           {product.stock > 0 ? 'Add to Request' : 'Out of Stock'}
                         </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                    <Package className="h-16 w-16 text-muted-foreground" />
                    <div className="space-y-2">
                       <h3 className="font-medium text-xl">No Products Available</h3>
                       <p className="text-sm text-muted-foreground max-w-md">
                         {searchTerm ? 'There are no products matching your search. Try adjusting your search terms.' : 'There are no products in the inventory yet. Please contact your administrator to add products to the catalog.'}
                       </p>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="space-y-6 pb-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Requests</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(stats.pending + stats.approved) || 0}</div>
                <p className="text-xs text-muted-foreground">In progress</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.pending || 0}</div>
                <p className="text-xs text-muted-foreground">Awaiting review</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.fulfilled || 0}</div>
                <p className="text-xs text-muted-foreground">This year</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${(stats.totalAmount || 0).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">This year</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Product Catalog Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Product Catalog</CardTitle>
                <CardDescription>
                  Browse available products
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  
                  <ScrollArea className="h-[350px]">
                    {filteredProducts.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3">
                        {filteredProducts.slice(0, 6).map((product) => (
                          <div key={product.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                            <div className="w-12 h-12 bg-muted rounded overflow-hidden flex-shrink-0">
                              {product.imageUrl ? (
                                <img 
                                  src={product.imageUrl} 
                                  alt={product.name} 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                  <Package className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-sm truncate">{product.name}</h3>
                              <p className="text-xs text-muted-foreground">{product.category}</p>
                              <p className="text-sm font-bold">${product.price}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant={product.stock > 0 ? 'default' : 'secondary'}>
                                {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                              </Badge>
                              <Button size="sm" variant="outline">
                                <Eye className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                        <Package className="h-12 w-12 text-muted-foreground" />
                        <div className="space-y-2">
                           <h3 className="font-medium text-lg">No Products Available</h3>
                           <p className="text-sm text-muted-foreground max-w-sm">
                             {searchTerm ? 'There are no products matching your search. Try adjusting your search terms.' : 'There are no products in the inventory yet. Please contact your administrator to add products to the catalog.'}
                           </p>
                        </div>
                      </div>
                    )}
                  </ScrollArea>
                  
                  <Button variant="outline" className="w-full">
                    View Full Catalog
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Request Status Tracker */}
            <Card>
              <CardHeader>
                <CardTitle>My Requests</CardTitle>
                <CardDescription>
                  Track the status of your requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {requests.map((request) => (
                      <div key={request.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-sm">{request.id}</p>
                            <Badge variant={getStatusBadgeVariant(request.status)}>
                              {request.status}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium">${request.totalAmount || 0}</p>
                        </div>
                        
                        <div className="space-y-1">
                          {request.items.map((item, index) => (
                            <p key={index} className="text-xs text-muted-foreground">
                              {item.productName} × {item.quantity}
                            </p>
                          ))}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{getProgressPercentage(request.status)}%</span>
                          </div>
                          <Progress value={getProgressPercentage(request.status)} className="h-2" />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            Requested: {request.createdAt ? new Date(request.createdAt.toDate()).toLocaleDateString() : 'N/A'}
                          </span>
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3 mr-1" />
                            View Details
                          </Button>
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

      {/* Cart and Request Dialog */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50">
          <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full h-14 w-14 shadow-lg">
                <div className="flex flex-col items-center">
                  <ShoppingCart className="h-5 w-5" />
                  <span className="text-xs">{cart.length}</span>
                </div>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Request</DialogTitle>
                <DialogDescription>
                  Review your items and provide request details
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Cart Items */}
                <div>
                  <h3 className="font-medium mb-3">Items in Cart</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.productId} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-sm text-muted-foreground">{item.category}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                          >
                            +
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeFromCart(item.productId)}
                          >
                            Remove
                          </Button>
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex justify-between items-center font-bold">
                      <span>Total:</span>
                      <span>${getTotalAmount().toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Request Form */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="location">Location *</Label>
                    <Input
                      id="location"
                      placeholder="e.g., Building A, Floor 3, Room 301"
                      value={requestForm.location}
                      onChange={(e) => setRequestForm({ ...requestForm, location: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="justification">Justification *</Label>
                    <Textarea
                      id="justification"
                      placeholder="Please explain why you need these items..."
                      value={requestForm.justification}
                      onChange={(e) => setRequestForm({ ...requestForm, justification: e.target.value })}
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={requestForm.priority}
                      onValueChange={(value: 'Low' | 'Medium' | 'High' | 'Urgent') => 
                        setRequestForm({ ...requestForm, priority: value })
                      }
                    >
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

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsRequestDialogOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={submitRequest}
                    disabled={submitting || !requestForm.location || !requestForm.justification}
                  >
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}