import { useState, useEffect } from 'react';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  Clock,
  Plus,
  Edit,
  CalendarIcon,
  Send,
  Trash2,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { 
 
 
  updatePurchaseOrder,
  subscribeToProductsBySupplier,
  subscribeToPurchaseOrdersBySupplier,
  createProduct,
  updateProduct,
  deleteProduct
} from '@/services/productService';
import type { Product, PurchaseOrder, CreateProduct, UpdateProduct } from '@/services/productService';



export default function SupplierDashboard() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [deliveryDate, setDeliveryDate] = useState<Date>();
  const [response, setResponse] = useState('');
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  
  // Product CRUD states
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showEditProduct, setShowEditProduct] = useState(false);
  const [showViewProduct, setShowViewProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    category: '',
    price: 0,
    stock: 0,
    description: '',
    sku: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const unsubscribeProducts = subscribeToProductsBySupplier(user.id, (productsData) => {
      setProducts(productsData);
      setLoading(false);
    });

    const unsubscribePOs = subscribeToPurchaseOrdersBySupplier(user.id, (posData) => {
      setPurchaseOrders(posData);
    });

    return () => {
      unsubscribeProducts();
      unsubscribePOs();
    };
  }, [user?.id]);

  const handlePOResponse = async (poId: string) => {
    if (!deliveryDate) {
      toast.error('Please select a delivery date');
      return;
    }

    try {
      const updatedItems = selectedPO?.items.map(item => ({
        ...item,
        confirmedQuantity: quantities[item.productId] || item.quantity
      })) || [];

      await updatePurchaseOrder(poId, {
        status: 'confirmed',

        deliveryDate: deliveryDate,
        items: updatedItems,
        response: response
      });

      toast.success(`Response submitted for ${poId}`);
      setSelectedPO(null);
      setDeliveryDate(undefined);
      setResponse('');
      setQuantities({});
    } catch (error) {
      console.error('Error updating purchase order:', error);
      toast.error('Failed to submit response');
    }
  };

  // Product CRUD functions
  const resetProductForm = () => {
    setProductForm({
      name: '',
      category: '',
      price: 0,
      stock: 0,
      description: '',
      sku: ''
    });
  };

  const handleAddProduct = () => {
    resetProductForm();
    setShowAddProduct(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setProductForm({
      name: product.name,
      category: product.category,
      price: product.price,
      stock: product.stock,
      description: product.description || '',
      sku: product.sku || ''
    });
    setShowEditProduct(true);
  };

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowViewProduct(true);
  };

  const handleCreateProduct = async () => {
    if (!user?.id || !productForm.name || !productForm.category || productForm.price <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const productData: CreateProduct = {
        ...productForm,
        supplierId: user.id,
        supplierName: user.displayName || user.email || 'Unknown Supplier',
        createdBy: user.id
      };

      await createProduct(productData);
      toast.success('Product created successfully');
      setShowAddProduct(false);
      resetProductForm();
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error('Failed to create product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProduct = async () => {
    if (!selectedProduct || !productForm.name || !productForm.category || productForm.price <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const updates: UpdateProduct = {
        name: productForm.name,
        category: productForm.category,
        price: productForm.price,
        stock: productForm.stock,
        description: productForm.description,
        sku: productForm.sku
      };

      await updateProduct(selectedProduct.id, updates);
      toast.success('Product updated successfully');
      setShowEditProduct(false);
      setSelectedProduct(null);
      resetProductForm();
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteProduct(productId);
      toast.success('Product deleted successfully');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'confirmed':
      case 'completed':
        return 'default';
      case 'pending':
      case 'low stock':
        return 'secondary';
      case 'inactive':
      case 'out of stock':
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  const supplierStats = {
    totalProducts: products.length,
    activeOrders: purchaseOrders.filter(po => po.status === 'confirmed').length,
    monthlyRevenue: purchaseOrders
      .filter(po => po.status === 'completed' && po.createdAt)
      .reduce((sum, po) => sum + po.total, 0),
    pendingPOs: purchaseOrders.filter(po => po.status === 'pending').length
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
          <Button onClick={handleAddProduct}>
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
                    {loading ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Loading products...
                      </div>
                    ) : products.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No products found
                      </div>
                    ) : (
                      products.map((product) => (
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
                          <div className="flex space-x-1">
                            <Button size="sm" variant="outline" onClick={() => handleViewProduct(product)}>
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleEditProduct(product)}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleDeleteProduct(product.id, product.name)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
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
                        {purchaseOrders.filter(po => po.status === 'pending').map((po) => (
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
                              <p>Requested: {formatDate(po.createdAt)}</p>
                              <p>Deadline: {formatDate(po.requestedDate)}</p>
                            </div>
                            <div className="space-y-1">
                              {po.items.map((item, index) => (
                                <p key={index} className="text-xs">
                                  {item.productName} × {item.quantity}
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
                                Due: {formatDate(po.requestedDate)}
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
                {selectedPO.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">{item.productName}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-muted-foreground">Requested: {item.quantity}</span>
                      <Input
                        type="number"
                        placeholder={item.quantity.toString()}
                        className="w-20 h-8"
                        value={quantities[item.productId] || item.quantity}
                        onChange={(e) => setQuantities(prev => ({
                          ...prev,
                          [item.productId]: parseInt(e.target.value) || 0
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

      {/* Add Product Dialog */}
      <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Add a new product to your catalog
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={productForm.name}
                onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter product name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={productForm.category} onValueChange={(value) => setProductForm(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Electronics">Electronics</SelectItem>
                  <SelectItem value="Clothing">Clothing</SelectItem>
                  <SelectItem value="Food & Beverage">Food & Beverage</SelectItem>
                  <SelectItem value="Home & Garden">Home & Garden</SelectItem>
                  <SelectItem value="Sports & Outdoors">Sports & Outdoors</SelectItem>
                  <SelectItem value="Books">Books</SelectItem>
                  <SelectItem value="Automotive">Automotive</SelectItem>
                  <SelectItem value="Health & Beauty">Health & Beauty</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={productForm.price}
                  onChange={(e) => setProductForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Initial Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={productForm.stock}
                  onChange={(e) => setProductForm(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={productForm.sku}
                onChange={(e) => setProductForm(prev => ({ ...prev, sku: e.target.value }))}
                placeholder="Product SKU (optional)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={productForm.description}
                onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Product description (optional)"
                rows={3}
              />
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddProduct(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleCreateProduct} disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Product'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={showEditProduct} onOpenChange={setShowEditProduct}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update product information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Product Name *</Label>
              <Input
                id="edit-name"
                value={productForm.name}
                onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter product name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category *</Label>
              <Select value={productForm.category} onValueChange={(value) => setProductForm(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Electronics">Electronics</SelectItem>
                  <SelectItem value="Clothing">Clothing</SelectItem>
                  <SelectItem value="Food & Beverage">Food & Beverage</SelectItem>
                  <SelectItem value="Home & Garden">Home & Garden</SelectItem>
                  <SelectItem value="Sports & Outdoors">Sports & Outdoors</SelectItem>
                  <SelectItem value="Books">Books</SelectItem>
                  <SelectItem value="Automotive">Automotive</SelectItem>
                  <SelectItem value="Health & Beauty">Health & Beauty</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-price">Price *</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={productForm.price}
                  onChange={(e) => setProductForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-stock">Stock</Label>
                <Input
                  id="edit-stock"
                  type="number"
                  min="0"
                  value={productForm.stock}
                  onChange={(e) => setProductForm(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-sku">SKU</Label>
              <Input
                id="edit-sku"
                value={productForm.sku}
                onChange={(e) => setProductForm(prev => ({ ...prev, sku: e.target.value }))}
                placeholder="Product SKU (optional)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={productForm.description}
                onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Product description (optional)"
                rows={3}
              />
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowEditProduct(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleUpdateProduct} disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update Product'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Product Dialog */}
      <Dialog open={showViewProduct} onOpenChange={setShowViewProduct}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription>
              View product information
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                  <p className="text-sm">{selectedProduct.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Category</Label>
                  <p className="text-sm">{selectedProduct.category}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Price</Label>
                  <p className="text-sm font-medium">${selectedProduct.price}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Stock</Label>
                  <p className="text-sm">{selectedProduct.stock}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <Badge variant={getStatusBadgeVariant(selectedProduct.status)}>
                    {selectedProduct.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">SKU</Label>
                  <p className="text-sm">{selectedProduct.sku || 'N/A'}</p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                <p className="text-sm">{selectedProduct.description || 'No description available'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                  <p className="text-sm">{formatDate(selectedProduct.createdAt)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                  <p className="text-sm">{formatDate(selectedProduct.updatedAt)}</p>
                </div>
              </div>
              <Button className="w-full" onClick={() => setShowViewProduct(false)}>
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}