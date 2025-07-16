import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

import { ScrollArea } from '@/components/ui/scroll-area';

import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Package, 
  Plus,
  Edit,
  Trash2,
  Eye,
  Send,
  Clock
} from 'lucide-react';

import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { 
  subscribeToProductsBySupplier,
  createProduct,
  updateProduct,
  deleteProduct,
  CreateProduct,
  UpdateProduct
} from '@/services/productService';
import { createDisplayRequest, getDisplayRequestsBySupplier, getQuantityRequestsBySupplier, respondToQuantityRequest } from '@/services/displayRequestService';
import type { Product } from '@/services/productService';
import { DisplayRequest, QuantityRequest, QuantityResponse, CreateDisplayRequest } from '@/types/displayRequest';



export default function SupplierDashboard() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);

  const [displayRequests, setDisplayRequests] = useState<DisplayRequest[]>([]);
  const [quantityRequests, setQuantityRequests] = useState<QuantityRequest[]>([]);
  const [loading, setLoading] = useState(true);

  
  // Product CRUD states
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showEditProduct, setShowEditProduct] = useState(false);
  const [showViewProduct, setShowViewProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    category: '',
    price: '',
    description: '',
    sku: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showDisplayRequestDialog, setShowDisplayRequestDialog] = useState(false);
  const [showQuantityResponseDialog, setShowQuantityResponseDialog] = useState(false);
  const [selectedQuantityRequest, setSelectedQuantityRequest] = useState<QuantityRequest | null>(null);
  const [quantityResponse, setQuantityResponse] = useState({ quantity: 0, notes: '' });

  useEffect(() => {
    if (!user?.id || typeof user.id !== 'string') {
      console.warn('Invalid user ID in SupplierDashboard:', user?.id);
      setLoading(false);
      return;
    }

    let unsubscribeProducts: (() => void) | null = null;

    const loadAdditionalData = async () => {
      try {
        const [displayRequestsData, quantityRequestsData] = await Promise.all([
          getDisplayRequestsBySupplier(user.id),
          getQuantityRequestsBySupplier(user.id)
        ]);
        setDisplayRequests(displayRequestsData);
        setQuantityRequests(quantityRequestsData);
      } catch (error) {
        console.error('Error loading additional data:', error);
      }
    };

    try {
      unsubscribeProducts = subscribeToProductsBySupplier(user.id, (productsData) => {
        setProducts(productsData);
        setLoading(false);
      });

      loadAdditionalData();
    } catch (error) {
      console.error('Error setting up subscriptions in SupplierDashboard:', error);
      setLoading(false);
    }

    return () => {
      try {
        if (unsubscribeProducts) unsubscribeProducts();
      } catch (error) {
        console.error('Error cleaning up subscriptions:', error);
      }
    };
  }, [user?.id]);



  // Product CRUD functions
  const resetProductForm = () => {
    setProductForm({
      name: '',
      category: '',
      price: '',
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
      price: product.price.toString(),
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
    if (!user?.id || !productForm.name || !productForm.category || parseFloat(productForm.price) <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const productData: CreateProduct = {
        name: productForm.name,
        category: productForm.category,
        price: parseFloat(productForm.price),
        description: productForm.description,
        sku: productForm.sku,
        supplierId: user.id,
        supplierName: user.displayName || user.email || 'Unknown Supplier',
        createdBy: user.id
      };

      await createProduct(productData);
      toast.success('Product added to your catalog');
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
    if (!selectedProduct || !productForm.name || !productForm.category || parseFloat(productForm.price) <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const updates: UpdateProduct = {
        name: productForm.name,
        category: productForm.category,
        price: parseFloat(productForm.price),
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

  // Display Request Functions
  const handleSubmitDisplayRequest = async () => {
    if (!user?.id || selectedProducts.length === 0) {
      toast.error('Please select at least one product');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Create display requests for each selected product
      for (const productId of selectedProducts) {
        const product = products.find(p => p.id === productId);
        if (product) {
          const requestData: CreateDisplayRequest = {
            productId: product.id,
            productName: product.name,
            productDescription: product.description || '',
            productSku: product.sku || `SKU-${product.id.slice(-8)}`,
            productPrice: product.price,
            productImageUrl: product.imageUrl || '',
            supplierId: user.id,
            supplierName: user.displayName || user.email || 'Unknown Supplier',
            supplierEmail: user.email || ''
          };
          await createDisplayRequest(requestData);
        }
      }
      
      toast.success('Display requests submitted successfully');
      setSelectedProducts([]);
      setShowDisplayRequestDialog(false);
      
      // Reload data
      const [displayRequestsData, quantityRequestsData] = await Promise.all([
        getDisplayRequestsBySupplier(user.id),
        getQuantityRequestsBySupplier(user.id)
      ]);
      setDisplayRequests(displayRequestsData);
      setQuantityRequests(quantityRequestsData);
    } catch (error) {
      console.error('Error submitting display request:', error);
      toast.error('Failed to submit display request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuantityResponse = async () => {
    if (!selectedQuantityRequest || quantityResponse.quantity <= 0 || !user?.id) {
      toast.error('Please enter a valid quantity');
      return;
    }

    try {
      setIsSubmitting(true);
      const response: QuantityResponse = {
        quantityRequestId: selectedQuantityRequest.id,
        status: 'approved_full',
        approvedQuantity: quantityResponse.quantity,
        notes: quantityResponse.notes
      };
      
      await respondToQuantityRequest(selectedQuantityRequest.id, response, user.id);
      toast.success('Quantity response submitted successfully');
      
      setShowQuantityResponseDialog(false);
      setSelectedQuantityRequest(null);
      setQuantityResponse({ quantity: 0, notes: '' });
      
      // Reload quantity requests
      const quantityRequestsData = await getQuantityRequestsBySupplier(user.id);
      setQuantityRequests(quantityRequestsData);
    } catch (error) {
      console.error('Error submitting quantity response:', error);
      toast.error('Failed to submit quantity response');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectQuantityRequest = async () => {
    if (!selectedQuantityRequest || !quantityResponse.notes.trim() || !user?.id) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setIsSubmitting(true);
      const response: QuantityResponse = {
        quantityRequestId: selectedQuantityRequest.id,
        status: 'rejected',
        rejectionReason: quantityResponse.notes
      };
      
      await respondToQuantityRequest(selectedQuantityRequest.id, response, user.id);
      toast.success('Quantity request rejected');
      
      setShowQuantityResponseDialog(false);
      setSelectedQuantityRequest(null);
      setQuantityResponse({ quantity: 0, notes: '' });
      
      // Reload quantity requests
      const quantityRequestsData = await getQuantityRequestsBySupplier(user.id);
      setQuantityRequests(quantityRequestsData);
    } catch (error) {
      console.error('Error rejecting quantity request:', error);
      toast.error('Failed to reject quantity request');
    } finally {
      setIsSubmitting(false);
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
    proposedProducts: products.filter(p => p.status === 'proposed').length,
    displayRequests: displayRequests.length,
    pendingQuantityRequests: quantityRequests.filter(qr => qr.status === 'pending').length
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
          <Button 
            variant="outline" 
            onClick={() => setShowDisplayRequestDialog(true)}
            disabled={products.filter(p => p.status === 'proposed').length === 0}
          >
            <Send className="mr-2 h-4 w-4" />
            Request Display
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
                <CardTitle className="text-sm font-medium">Proposed Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{supplierStats.proposedProducts}</div>
                <p className="text-xs text-muted-foreground">Ready for display request</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Display Requests</CardTitle>
                <Send className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{supplierStats.displayRequests}</div>
                <p className="text-xs text-muted-foreground">Submitted</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Quantity Requests</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{supplierStats.pendingQuantityRequests}</div>
                <p className="text-xs text-muted-foreground">Need response</p>
              </CardContent>
            </Card>

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

            {/* Quantity Requests */}
            <Card>
              <CardHeader>
                <CardTitle>Quantity Requests</CardTitle>
                <CardDescription>
                  Respond to quantity requests from warehouse staff
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {loading ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Loading quantity requests...
                      </div>
                    ) : quantityRequests.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No quantity requests found
                      </div>
                    ) : (
                      quantityRequests.map((request) => (
                        <div key={request.id} className="p-3 border rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <p className="font-medium text-sm">{request.productName}</p>
                              <Badge variant={getStatusBadgeVariant(request.status)}>
                                {request.status}
                              </Badge>
                            </div>
                            <p className="text-sm font-medium">Qty: {request.requestedQuantity}</p>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <p>Requested: {formatDate(request.createdAt)}</p>
                            <p>From: {request.requesterName}</p>
                          </div>
                          {request.notes && (
                            <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                              {request.notes}
                            </p>
                          )}
                          {request.status === 'pending' && (
                            <Button 
                              size="sm" 
                              className="w-full"
                              onClick={() => {
                                setSelectedQuantityRequest(request);
                                setQuantityResponse({ quantity: request.requestedQuantity, notes: '' });
                                setShowQuantityResponseDialog(true);
                              }}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Respond
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Display Request Dialog */}
      <Dialog open={showDisplayRequestDialog} onOpenChange={setShowDisplayRequestDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Display Request</DialogTitle>
            <DialogDescription>
              Select products to request for display
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Products</Label>
              <ScrollArea className="h-[200px] border rounded p-2">
                <div className="space-y-2">
                  {products.filter(p => p.status === 'proposed').map((product) => (
                    <div key={product.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={product.id}
                        checked={selectedProducts.includes(product.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProducts(prev => [...prev, product.id]);
                          } else {
                            setSelectedProducts(prev => prev.filter(id => id !== product.id));
                          }
                        }}
                        className="rounded"
                      />
                      <label htmlFor={product.id} className="text-sm cursor-pointer flex-1">
                        {product.name} - ${product.price}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setShowDisplayRequestDialog(false);
                  setSelectedProducts([]);
                }}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1"
                onClick={handleSubmitDisplayRequest}
                disabled={isSubmitting || selectedProducts.length === 0}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quantity Response Dialog */}
      <Dialog open={showQuantityResponseDialog} onOpenChange={setShowQuantityResponseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Respond to Quantity Request</DialogTitle>
            <DialogDescription>
              {selectedQuantityRequest?.productName} - Requested: {selectedQuantityRequest?.requestedQuantity}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Available Quantity</Label>
              <Input
                type="number"
                min="0"
                value={quantityResponse.quantity}
                onChange={(e) => setQuantityResponse(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                placeholder="Enter available quantity"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={quantityResponse.notes}
                onChange={(e) => setQuantityResponse(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes or reason for rejection..."
              />
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setShowQuantityResponseDialog(false);
                  setSelectedQuantityRequest(null);
                  setQuantityResponse({ quantity: 0, notes: '' });
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                className="flex-1"
                onClick={handleRejectQuantityRequest}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Rejecting...' : 'Reject'}
              </Button>
              <Button 
                className="flex-1"
                onClick={handleQuantityResponse}
                disabled={isSubmitting || quantityResponse.quantity <= 0}
              >
                {isSubmitting ? 'Approving...' : 'Approve'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
            <div className="space-y-2">
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={productForm.price}
                onChange={(e) => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                placeholder="0.00"
              />
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
            <div className="space-y-2">
              <Label htmlFor="edit-price">Price *</Label>
              <Input
                id="edit-price"
                type="number"
                step="0.01"
                min="0"
                value={productForm.price}
                onChange={(e) => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                placeholder="0.00"
              />
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
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Price</Label>
                <p className="text-sm font-medium">${selectedProduct.price}</p>
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