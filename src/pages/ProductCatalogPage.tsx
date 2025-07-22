import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getInStockPublishedItemsWithAvailability } from '@/services/inventoryService';
import { InventoryItem } from '@/types/inventory';
import { createOrder, OrderItem } from '@/services/orderService';
import {
  ShoppingCart,
  Plus,
  Minus,
  Search,
  Package,
  DollarSign,
  Trash2,
  ShoppingBag
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  supplier: string;
}

export default function ProductCatalogPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [stockErrors, setStockErrors] = useState<Record<string, string>>({});
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  
  // Checkout form data
  const [checkoutData, setCheckoutData] = useState({
    deliveryLocation: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    notes: ''
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      // Only load published items that are in stock
      const data = await getInStockPublishedItemsWithAvailability();
      setProducts(data);
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };



  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && product.quantity > 0;
  });

  const addToCart = (product: InventoryItem) => {
    const selectedQuantity = selectedQuantities[product.id!] || 1;
    const availableStock = (product.quantity || 0) - (product.reservedQuantity || 0);
    const currentCartQuantity = cart.find(item => item.productId === product.id)?.quantity || 0;
    const totalQuantity = currentCartQuantity + selectedQuantity;

    if (totalQuantity > availableStock) {
      setStockErrors(prev => ({
        ...prev,
        [product.id!]: `Only ${availableStock} items available in stock`
      }));
      toast.error(`Only ${availableStock} items available in stock`);
      return;
    }

    // Clear any existing error for this item
    setStockErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[product.id!];
      return newErrors;
    });

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.productId === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + selectedQuantity }
            : item
        );
      } else {
        return [...prevCart, {
          productId: product.id!,
          name: product.name,
          price: product.salePrice || product.unitPrice,
          quantity: selectedQuantity,
          category: product.category,
          supplier: product.supplier
        }];
      }
    });
    
    // Reset the selected quantity for this product
    setSelectedQuantities(prev => ({
      ...prev,
      [product.id!]: 1
    }));
    
    toast.success(`${selectedQuantity} ${product.name}${selectedQuantity > 1 ? 's' : ''} added to cart`);
  };

  const updateCartQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find(product => product.id === productId);
    const availableStock = (product?.quantity || 0) - (product?.reservedQuantity || 0);

    if (newQuantity > availableStock) {
      setStockErrors(prev => ({
        ...prev,
        [productId]: `Only ${availableStock} items available in stock`
      }));
      toast.error(`Only ${availableStock} items available in stock`);
      return;
    }

    // Clear any existing error for this item
    setStockErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[productId];
      return newErrors;
    });
    
    setCart(prevCart =>
      prevCart.map(item =>
        item.productId === productId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const updateSelectedQuantity = (productId: string, quantity: number) => {
    const product = products.find(p => p.id === productId);
    const availableStock = (product?.quantity || 0) - (product?.reservedQuantity || 0);
    const currentCartQuantity = cart.find(item => item.productId === productId)?.quantity || 0;
    const maxAllowed = availableStock - currentCartQuantity;
    
    const validQuantity = Math.max(1, Math.min(quantity, maxAllowed));
    setSelectedQuantities(prev => ({
      ...prev,
      [productId]: validQuantity
    }));
  };

  const getSelectedQuantity = (productId: string) => {
    return selectedQuantities[productId] || 1;
  };

  const getMaxSelectableQuantity = (product: InventoryItem) => {
    const availableStock = (product.quantity || 0) - (product.reservedQuantity || 0);
    const currentCartQuantity = cart.find(item => item.productId === product.id)?.quantity || 0;
    return Math.max(0, availableStock - currentCartQuantity);
  };

  const handleCheckout = async () => {
    if (!user || cart.length === 0 || isPlacingOrder) return;

    if (!checkoutData.deliveryLocation.trim()) {
      toast.error('Please provide a delivery location');
      return;
    }

    // Final stock validation before order creation
    for (const item of cart) {
      const product = products.find(p => p.id === item.productId);
      const availableStock = (product?.quantity || 0) - (product?.reservedQuantity || 0);
      if (item.quantity > availableStock) {
        toast.error(`${item.name}: Only ${availableStock} items available`);
        return;
      }
    }

    setIsPlacingOrder(true);
    try {
      const orderItems: OrderItem[] = cart.map(item => ({
        productId: item.productId,
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        totalPrice: item.price * item.quantity,
        supplier: item.supplier
      }));

      const orderData = {
        orderNumber: `ORD-${Date.now()}`,
        supplierName: 'Multiple Suppliers', // Since we can have items from different suppliers
        items: orderItems,
        totalAmount: getTotalAmount(),
        status: 'pending' as const,
        priority: checkoutData.priority,
        requestedBy: user.name,
        userId: user.id,
        deliveryLocation: checkoutData.deliveryLocation,
        notes: checkoutData.notes,
        orderDate: new Date(),
        expectedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      };

      await createOrder(orderData);
      
      // Reset form and cart
      clearCart();
      setCheckoutData({
        deliveryLocation: '',
        priority: 'medium',
        notes: ''
      });
      setStockErrors({});
      setIsCheckoutOpen(false);
      setIsCartOpen(false);
      
      toast.success('Order placed successfully! Stock has been reserved.');
      // Reload products to reflect updated available stock
      loadProducts();
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Catalog</h1>
          <p className="text-gray-600">Browse and order products directly</p>
        </div>
        
        {/* Cart Button */}
        <Button
          onClick={() => setIsCartOpen(true)}
          className="relative"
          variant={cart.length > 0 ? "default" : "outline"}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Cart ({getTotalItems()})
          {cart.length > 0 && (
            <Badge className="ml-2 bg-red-500 text-white">
              ${getTotalAmount().toFixed(2)}
            </Badge>
          )}
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="hover:shadow-lg transition-shadow">
            {/* Product Image */}
            <div className="aspect-square w-full overflow-hidden rounded-t-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center relative">
              {(product.images && product.images.length > 0 ? product.images[0] : product.imageUrl) ? (
                <img
                  src={product.images && product.images.length > 0 ? product.images[0] : product.imageUrl}
                  alt={product.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    // Show placeholder when image fails to load
                    const placeholder = target.parentElement?.querySelector('.image-placeholder');
                    if (placeholder) {
                      (placeholder as HTMLElement).style.display = 'flex';
                    }
                  }}
                />
              ) : null}
              {/* Placeholder for missing images */}
              <div 
                className={`image-placeholder absolute inset-0 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 ${
                  (product.images && product.images.length > 0 ? product.images[0] : product.imageUrl) ? 'hidden' : 'flex'
                }`}
              >
                <Package className="h-12 w-12 mb-2" />
                <span className="text-sm font-medium">No Image</span>
              </div>
            </div>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg font-semibold line-clamp-2">
                    {product.name}
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600 mt-1">
                    {product.supplier}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="ml-2">
                  {product.category}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {(product.customerFacingDescription || product.description) && (
                <p className="text-sm text-gray-600 line-clamp-3">
                  {product.customerFacingDescription || product.description}
                </p>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-lg font-bold text-green-600">
                    ${(product.salePrice || product.unitPrice).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center space-x-1 text-sm text-gray-500">
                  <Package className="h-4 w-4" />
                  <span>Available: {(product.quantity || 0) - (product.reservedQuantity || 0)}</span>
                </div>
              </div>
              
              {/* Quantity Selector */}
              <div className="flex items-center justify-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateSelectedQuantity(product.id!, getSelectedQuantity(product.id!) - 1)}
                  disabled={getSelectedQuantity(product.id!) <= 1}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Input
                  type="number"
                  min="1"
                  max={getMaxSelectableQuantity(product)}
                  value={getSelectedQuantity(product.id!)}
                  onChange={(e) => updateSelectedQuantity(product.id!, parseInt(e.target.value) || 1)}
                  className="w-16 text-center"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateSelectedQuantity(product.id!, getSelectedQuantity(product.id!) + 1)}
                  disabled={getSelectedQuantity(product.id!) >= getMaxSelectableQuantity(product)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              
              <Button
                onClick={() => addToCart(product)}
                className="w-full"
                disabled={getMaxSelectableQuantity(product) === 0}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add {getSelectedQuantity(product.id!)} to Cart
              </Button>
              {stockErrors[product.id!] && (
                <p className="text-sm text-red-600 mt-1">{stockErrors[product.id!]}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
        </div>
      )}

      {/* Cart Dialog */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Shopping Cart ({getTotalItems()} items)
            </DialogTitle>
            <DialogDescription>
              Review your items before placing the order
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Your cart is empty</p>
              </div>
            ) : (
              <>
                {cart.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-gray-600">{item.supplier}</p>
                      <p className="text-sm font-medium text-green-600">${item.price.toFixed(2)} each</p>
                      {stockErrors[item.productId] && (
                        <p className="text-sm text-red-600">{stockErrors[item.productId]}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        min="1"
                        max={(() => {
                          const product = products.find(p => p.id === item.productId);
                          return (product?.quantity || 0) - (product?.reservedQuantity || 0);
                        })()}
                        value={item.quantity}
                        onChange={(e) => updateCartQuantity(item.productId, parseInt(e.target.value) || 1)}
                        className="w-20 text-center"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeFromCart(item.productId)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                <Separator />
                
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-green-600">${getTotalAmount().toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={clearCart} disabled={cart.length === 0}>
              Clear Cart
            </Button>
            <Button 
              onClick={() => {
                setIsCartOpen(false);
                setIsCheckoutOpen(true);
              }}
              disabled={cart.length === 0}
            >
              <ShoppingBag className="h-4 w-4 mr-2" />
              Proceed to Checkout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Your Order</DialogTitle>
            <DialogDescription>
              Provide delivery details to complete your order
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="deliveryLocation">Delivery Location *</Label>
              <Input
                id="deliveryLocation"
                placeholder="e.g., Building A, Floor 3, Room 301"
                value={checkoutData.deliveryLocation}
                onChange={(e) => setCheckoutData(prev => ({ ...prev, deliveryLocation: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={checkoutData.priority} 
                onValueChange={(value: 'low' | 'medium' | 'high') => 
                  setCheckoutData(prev => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any special instructions or requirements..."
                value={checkoutData.notes}
                onChange={(e) => setCheckoutData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center text-sm">
                <span>Items ({getTotalItems()}):</span>
                <span>${getTotalAmount().toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center font-bold text-lg mt-2">
                <span>Total:</span>
                <span className="text-green-600">${getTotalAmount().toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCheckoutOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCheckout}
              disabled={isPlacingOrder || cart.length === 0 || !checkoutData.deliveryLocation.trim()}
            >
              {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}