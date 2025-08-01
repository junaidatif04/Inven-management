import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';



import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  ShoppingCart, 
  Package, 
  Clock,
  CheckCircle,
  Search,
  Eye
} from 'lucide-react';
import {
  Order,
  getOrdersByUser,
  subscribeToOrdersByUser
} from '@/services/orderService';
import { Product } from '@/services/productService';
import { getInStockPublishedItemsWithAvailability } from '../../services/inventoryService';


// Default product image for products without images
// Removed DEFAULT_PRODUCT_IMAGE - now showing 'No image' placeholder when no image is available

export default function InternalUserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory] = useState('All');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    totalAmount: 0
  });
  const [loading, setLoading] = useState(true);



  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Load only published inventory items that are in stock
        try {
          const publishedInventoryData = await getInStockPublishedItemsWithAvailability();
          
          // Convert published inventory items to product format for display
          const publishedProducts: Product[] = publishedInventoryData.map(item => ({
            id: item.id!,
            name: item.name,
            category: item.category,
            price: item.salePrice || item.unitPrice, // Use salePrice for customer-facing display
            stock: item.availableStock || 0,
            status: 'approved', // All published in-stock items are considered approved
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
          

          setProducts(publishedProducts);
        } catch (productError) {
          console.error('Error loading products:', productError);
          toast.error('Failed to load products');
          setProducts([]);
        }
        
        // Load user orders
        const ordersData = await getOrdersByUser(user.id);
        setOrders(ordersData);
        
        // Calculate stats from orders
        const orderStats = {
          total: ordersData.length,
          pending: ordersData.filter(o => o.status === 'pending').length,
          approved: ordersData.filter(o => o.status === 'approved').length,
          shipped: ordersData.filter(o => o.status === 'shipped').length,
          delivered: ordersData.filter(o => o.status === 'delivered').length,
          cancelled: ordersData.filter(o => o.status === 'cancelled').length,
          totalAmount: ordersData.reduce((sum, o) => sum + o.totalAmount, 0)
        };
        setStats(orderStats);
        
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Subscribe to real-time updates for user's orders only
    const unsubscribe = subscribeToOrdersByUser(user?.id || '', (updatedOrders) => {
      setOrders(updatedOrders);
      // Recalculate stats
      const orderStats = {
        total: updatedOrders.length,
        pending: updatedOrders.filter(o => o.status === 'pending').length,
        approved: updatedOrders.filter(o => o.status === 'approved').length,
        shipped: updatedOrders.filter(o => o.status === 'shipped').length,
        delivered: updatedOrders.filter(o => o.status === 'delivered').length,
        cancelled: updatedOrders.filter(o => o.status === 'cancelled').length,
        totalAmount: updatedOrders.reduce((sum, o) => sum + o.totalAmount, 0)
      };
      setStats(orderStats);
    });

    return () => unsubscribe();
  }, [user]);
  

  
  const filteredProducts = useMemo(() => {
    const filtered = products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    return filtered;
  }, [products, searchTerm, selectedCategory]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'default';
      case 'shipped':
        return 'default';
      case 'approved':
        return 'secondary';
      case 'pending':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
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
            Browse products and track your orders
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => navigate('/dashboard/product-catalog')}>
            <Package className="mr-2 h-4 w-4" />
            Browse Catalog
          </Button>
          <Button variant="outline" onClick={() => navigate('/dashboard/my-orders')}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            My Orders
          </Button>
        </div>

      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="space-y-6 pb-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(stats.pending + stats.approved + stats.shipped) || 0}</div>
                <p className="text-xs text-muted-foreground">In progress</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approved</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.approved || 0}</div>
                <p className="text-xs text-muted-foreground">Approved orders</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Delivered Orders</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.delivered || 0}</div>
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
                          <div 
                            key={product.id} 
                            className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => navigate('/dashboard/product-catalog')}
                          >
                            <div className="w-12 h-12 bg-muted rounded overflow-hidden flex-shrink-0">
                              {product.imageUrl ? (
                                <img 
                                  src={product.imageUrl} 
                                  alt={product.name} 
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    const parent = target.parentElement;
                                    if (parent) {
                                      parent.innerHTML = `
                                        <div class="w-full h-full flex items-center justify-center text-muted-foreground">
                                          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                                          </svg>
                                        </div>
                                      `;
                                    }
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                  <Package className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-sm truncate">{product.name}</h3>
                              <p className="text-xs text-muted-foreground">{product.category}</p>
                              <p className="text-sm font-bold">${product.price}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant={(product.stock || 0) > 0 ? 'default' : 'secondary'}>
                                {(product.stock || 0) > 0 ? `Available: ${product.stock}` : 'Out of Stock'}
                              </Badge>
                              {product.stock && product.stock > 0 && product.stock <= 5 && (
                                <Badge variant="outline" className="text-orange-600">
                                  {product.stock === 1 ? 'Only 1 left' : product.stock === 2 ? 'Only 2 left' : `Only ${product.stock} left`}
                                </Badge>
                              )}
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
                  
                  <Button variant="outline" className="w-full" onClick={() => navigate('/dashboard/product-catalog')}>
                    View Full Catalog
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Order Status Tracker */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>
                  Track the status of your recent orders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {orders.slice(0, 5).map((order) => (
                      <div key={order.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-sm">{order.orderNumber}</p>
                            <Badge variant={getStatusBadgeVariant(order.status)}>
                              {order.status}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium">${order.totalAmount.toFixed(2)}</p>
                        </div>
                        
                        <div className="space-y-1">
                          {order.items.slice(0, 3).map((item, index) => (
                            <p key={index} className="text-xs text-muted-foreground">
                              {item.productName} × {item.quantity}
                            </p>
                          ))}
                          {order.items.length > 3 && (
                            <p className="text-xs text-muted-foreground">
                              +{order.items.length - 3} more items
                            </p>
                          )}
                        </div>
                        

                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            Ordered: {order.orderDate ? new Date(order.orderDate.toDate()).toLocaleDateString() : 'N/A'}
                          </span>
                          <Button size="sm" variant="outline" onClick={() => navigate('/dashboard/my-orders')}>
                            <Eye className="h-3 w-3 mr-1" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                    {orders.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-32 text-center space-y-2">
                        <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No orders yet</p>
                        <Button size="sm" onClick={() => navigate('/dashboard/product-catalog')}>
                          Start Shopping
                        </Button>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>


    </div>
  );
}