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
  Clock,
  ArrowDown
} from 'lucide-react';

import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  subscribeToProductsBySupplier,
  createProduct,
  updateProduct,
  deleteProduct,
  proposeProduct,
  convertToDraft,
  getDraftProductsBySupplier,
  CreateProduct
} from '@/services/productService';
import ProductImageUpload from '@/components/ProductImageUpload';
import { subscribeToQuantityRequestsBySupplier, respondToQuantityRequest } from '@/services/displayRequestService';
import type { Product } from '@/services/productService';
import { QuantityRequest, QuantityResponse } from '@/types/displayRequest';



export default function SupplierDashboard() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [draftProducts, setDraftProducts] = useState<Product[]>([]);


  const [quantityRequests, setQuantityRequests] = useState<QuantityRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'drafts' | 'proposed'>('drafts');

  
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
    imageUrl: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showQuantityResponseDialog, setShowQuantityResponseDialog] = useState(false);
  const [selectedQuantityRequest, setSelectedQuantityRequest] = useState<QuantityRequest | null>(null);
  const [quantityResponseForm, setQuantityResponseForm] = useState({
    status: '',
    approvedQuantity: '',
    rejectionReason: '',
    notes: ''
  });

  useEffect(() => {
    if (!user?.id || typeof user.id !== 'string') {
      console.warn('Invalid user ID in SupplierDashboard:', user?.id);
      setLoading(false);
      return;
    }

    let unsubscribeProducts: (() => void) | null = null;
    let unsubscribeQuantityRequests: (() => void) | null = null;



    const loadDraftProducts = async () => {
      try {
        if (user?.id) {
          const draftProductsData = await getDraftProductsBySupplier(user.id);
          setDraftProducts(draftProductsData);
        }
      } catch (error) {
        console.error('Error loading draft products:', error);
      }
    };

    try {
      unsubscribeProducts = subscribeToProductsBySupplier(user.id, (productsData) => {
        setProducts(productsData);
        setLoading(false);
      });

      // Real-time subscription for quantity requests
      unsubscribeQuantityRequests = subscribeToQuantityRequestsBySupplier(user.id, (quantityRequestsData) => {
        setQuantityRequests(quantityRequestsData);
      });

      loadDraftProducts();
    } catch (error) {
      console.error('Error setting up subscriptions in SupplierDashboard:', error);
      setLoading(false);
    }

    return () => {
      try {
        if (unsubscribeProducts) unsubscribeProducts();
        if (unsubscribeQuantityRequests) unsubscribeQuantityRequests();
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
      imageUrl: ''
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
      imageUrl: product.imageUrl || ''
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
        imageUrl: productForm.imageUrl,
        supplierId: user.id,
        supplierName: user.displayName || user.email || 'Unknown Supplier',
        createdBy: user.id
      };

      await createProduct(productData);
      toast.success('Product created as draft. You can propose it when ready.');
      setShowAddProduct(false);
      resetProductForm();
      // Reload draft products
      const draftProductsData = await getDraftProductsBySupplier(user.id);
      setDraftProducts(draftProductsData);
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
      const updateData = {
        name: productForm.name,
        category: productForm.category,
        price: parseFloat(productForm.price),
        description: productForm.description,
        imageUrl: productForm.imageUrl
      };

      await updateProduct(selectedProduct.id, updateData);
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

    if (!user?.id) return;

    try {
      await deleteProduct(productId);
      toast.success('Product deleted successfully');
      // Reload draft products if it was a draft
      const draftProductsData = await getDraftProductsBySupplier(user.id);
      setDraftProducts(draftProductsData);
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const handleProposeProduct = async (productId: string) => {
    try {
      await proposeProduct(productId);
      toast.success('Product proposed successfully! It will now appear in the admin/warehouse staff product catalog.');
      // Reload both draft and proposed products
      if (user?.id) {
        const draftProductsData = await getDraftProductsBySupplier(user.id);
        setDraftProducts(draftProductsData);
      }
    } catch (error) {
      console.error('Error proposing product:', error);
      toast.error('Failed to propose product');
    }
  };

  const handleConvertToDraft = async (productId: string) => {
    try {
      await convertToDraft(productId);
      toast.success('Product converted to draft successfully! It is no longer visible to admin/warehouse staff.');
      // Reload both draft and proposed products
      if (user?.id) {
        const draftProductsData = await getDraftProductsBySupplier(user.id);
        setDraftProducts(draftProductsData);
      }
    } catch (error) {
      console.error('Error converting product to draft:', error);
      toast.error('Failed to convert product to draft');
    }
  };

  // Display Request Functions


  const handleQuantityResponse = async () => {
    if (!selectedQuantityRequest) return;

    // Validation
    if (!quantityResponseForm.status) {
      toast.error('Please select a response type');
      return;
    }

    if (quantityResponseForm.status === 'approved_partial') {
      const approvedQty = parseInt(quantityResponseForm.approvedQuantity);
      if (!quantityResponseForm.approvedQuantity || approvedQty <= 0) {
        toast.error('Please enter a valid approved quantity');
        return;
      }
      if (approvedQty > selectedQuantityRequest.requestedQuantity) {
        toast.error('Approved quantity cannot exceed requested quantity');
        return;
      }
    }

    if (quantityResponseForm.status === 'rejected' && !quantityResponseForm.rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setIsSubmitting(true);
    try {
      const response: QuantityResponse = {
        quantityRequestId: selectedQuantityRequest.id,
        status: quantityResponseForm.status as 'approved_full' | 'approved_partial' | 'rejected',
        approvedQuantity: quantityResponseForm.status === 'approved_full' 
          ? selectedQuantityRequest.requestedQuantity 
          : quantityResponseForm.status === 'approved_partial' 
            ? parseInt(quantityResponseForm.approvedQuantity) 
            : undefined,
        rejectionReason: quantityResponseForm.status === 'rejected' ? quantityResponseForm.rejectionReason : undefined,
        notes: quantityResponseForm.notes || undefined
      };

      await respondToQuantityRequest(selectedQuantityRequest.id, response, user?.id || '');
      
      const statusText = quantityResponseForm.status === 'approved_full' ? 'approved' : 
                        quantityResponseForm.status === 'approved_partial' ? 'partially approved' : 'rejected';
      toast.success(`Quantity request ${statusText} successfully`);
      
      setShowQuantityResponseDialog(false);
      setSelectedQuantityRequest(null);
      setQuantityResponseForm({
        status: '',
        approvedQuantity: '',
        rejectionReason: '',
        notes: ''
      });
      
      // Quantity requests will be updated automatically via real-time subscription
    } catch (error) {
      console.error('Error responding to quantity request:', error);
      toast.error('Failed to respond to quantity request');
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
    totalProducts: products.length + draftProducts.length,
    draftProducts: draftProducts.length,
    proposedProducts: products.filter(p => p.status === 'proposed').length,
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
                <CardTitle className="text-sm font-medium">Draft Products</CardTitle>
                <Package className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{supplierStats.draftProducts}</div>
                <p className="text-xs text-muted-foreground">Ready to propose</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Product Proposals</CardTitle>
                <Send className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{supplierStats.proposedProducts}</div>
                <p className="text-xs text-muted-foreground">Proposed</p>
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
                {/* Tab Navigation */}
                <div className="flex space-x-1 mb-4 p-1 bg-muted rounded-lg">
                  <button
                    onClick={() => setActiveTab('drafts')}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === 'drafts'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Drafts ({draftProducts.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('proposed')}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === 'proposed'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Proposed ({products.filter(p => p.status === 'proposed').length})
                  </button>
                </div>

                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {loading ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Loading products...
                      </div>
                    ) : activeTab === 'drafts' ? (
                      draftProducts.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No draft products found
                        </div>
                      ) : (
                        draftProducts.map((product) => (
                          <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <p className="font-bold text-sm">{product.name}</p>
                                <Badge variant="outline">
                                  {product.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">{product.category} • {product.id}</p>
                              <div className="flex items-center space-x-4 text-xs">
                                <span className="font-medium">${product.price}</span>
                              </div>
                            </div>
                            <div className="flex space-x-1">
                              <Button 
                                size="sm" 
                                variant="default" 
                                onClick={() => handleProposeProduct(product.id)}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <Send className="h-3 w-3 mr-1" />
                                Propose
                              </Button>
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
                      )
                    ) : (
                      products.filter(p => p.status === 'proposed').length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No proposed products found
                        </div>
                      ) : (
                        products.filter(p => p.status === 'proposed').map((product) => (
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
                              <Button 
                                size="sm" 
                                variant="default" 
                                onClick={() => handleConvertToDraft(product.id)}
                                className="bg-orange-600 hover:bg-orange-700"
                              >
                                <ArrowDown className="h-3 w-3 mr-1" />
                                To Draft
                              </Button>
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
                      )
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
                              <p className="font-bold text-sm">{request.productName}</p>
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
                                setQuantityResponseForm({
                                  status: '',
                                  approvedQuantity: '',
                                  rejectionReason: '',
                                  notes: ''
                                });
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
              <Label>Response Type</Label>
              <Select 
                value={quantityResponseForm.status} 
                onValueChange={(value: 'approved_full' | 'approved_partial' | 'rejected') => 
                  setQuantityResponseForm(prev => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select response type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved_full">Approve Full</SelectItem>
                  <SelectItem value="approved_partial">Approve Partial</SelectItem>
                  <SelectItem value="rejected">Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {quantityResponseForm.status === 'approved_partial' && (
              <div className="space-y-2">
                <Label>Approved Quantity</Label>
                <Input
                  type="number"
                  placeholder="Enter quantity you can supply"
                  value={quantityResponseForm.approvedQuantity}
                  onChange={(e) => setQuantityResponseForm(prev => ({ ...prev, approvedQuantity: e.target.value }))}
                />
              </div>
            )}
            
            {quantityResponseForm.status === 'rejected' && (
              <div className="space-y-2">
                <Label>Rejection Reason *</Label>
                <Textarea
                  placeholder="Please provide a reason for rejection..."
                  value={quantityResponseForm.rejectionReason}
                  onChange={(e) => setQuantityResponseForm(prev => ({ ...prev, rejectionReason: e.target.value }))}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Additional Notes (Optional)</Label>
              <Textarea
                placeholder="Any additional notes..."
                value={quantityResponseForm.notes}
                onChange={(e) => setQuantityResponseForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setShowQuantityResponseDialog(false);
                  setQuantityResponseForm({
                    status: '',
                    approvedQuantity: '',
                    rejectionReason: '',
                    notes: ''
                  });
                }}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1"
                onClick={handleQuantityResponse}
                disabled={!quantityResponseForm.status}
              >
                Submit Response
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
              <Label>Product Name</Label>
              <Input
                placeholder="Enter product name"
                value={productForm.name}
                onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={productForm.category} onValueChange={(value) => setProductForm(prev => ({ ...prev, category: value }))}>
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
                  value={productForm.price}
                  onChange={(e) => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Product description..."
                value={productForm.description}
                onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            
            <ProductImageUpload
              mode="add"
              currentImageUrl={productForm.imageUrl}
              productName={productForm.name}
              onImageUpdate={(imageUrl) => setProductForm(prev => ({ ...prev, imageUrl }))}
            />
            
            <Button 
              onClick={handleCreateProduct} 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Add Product'}
            </Button>
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
              <Label>Product Name</Label>
              <Input
                value={productForm.name}
                onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={productForm.category} onValueChange={(value) => setProductForm(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue />
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
                  value={productForm.price}
                  onChange={(e) => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={productForm.description}
                onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            
            <ProductImageUpload
              mode="update"
              currentImageUrl={productForm.imageUrl}
              productName={productForm.name}
              productId={selectedProduct?.id}
              onImageUpdate={(imageUrl) => setProductForm(prev => ({ ...prev, imageUrl }))}
            />
            
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowEditProduct(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1"
                onClick={handleUpdateProduct}
              >
                Save Changes
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