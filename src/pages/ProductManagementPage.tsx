import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';




import { Textarea } from '@/components/ui/textarea';
import { NavigationHeader } from '@/components/NavigationHeader';
import ProductImageUpload from '@/components/ProductImageUpload';
import { 
  Plus, 
  Search, 
  Package, 
  Edit, 
  Eye,

  Send,

  Clock,
  CheckCircle,
  XCircle,
  Inbox,
  Trash2,
  ArrowDown
} from 'lucide-react';

import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Product, 
  PurchaseOrder, 
  CreateProduct, 


  getProposedProducts,
  getProductsBySupplier,
  createProduct,
  updateProduct,
  getAllPurchaseOrders,
  getPurchaseOrdersBySupplier,
  convertToDraft,
  getDraftProductsBySupplier,
  proposeProduct,


  subscribeToProposedProducts,
  subscribeToProductsBySupplier,
  subscribeToPurchaseOrders,
  subscribeToPurchaseOrdersBySupplier,
  subscribeToDraftProductsBySupplier
} from '@/services/productService';
import {
  DisplayRequest,
  QuantityRequest,

  QuantityResponse,

  getDisplayRequestsBySupplier,
  getQuantityRequestsBySupplier,
  respondToQuantityRequest,
  deleteDisplayRequest
} from '@/services/displayRequestService';



const sections = [
  { id: 'products', name: 'Product Catalog', icon: Package },
  { id: 'received-requests', name: 'Received Requests', icon: Inbox }
];

export default function ProductManagementPage() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('products');
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [products, setProducts] = useState<Product[]>([]);
  const [draftProducts, setDraftProducts] = useState<Product[]>([]);
  const [, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [displayRequests, setDisplayRequests] = useState<DisplayRequest[]>([]);
  const [quantityRequests, setQuantityRequests] = useState<QuantityRequest[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'proposed'>('all');


  const [selectedQuantityRequest, setSelectedQuantityRequest] = useState<QuantityRequest | null>(null);



  const [newProductForm, setNewProductForm] = useState({
    name: '',
    category: '',
    price: '',
    description: '',
    imageUrl: ''
  });
  const [isUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [quantityResponseForm, setQuantityResponseForm] = useState({
    status: '' as 'approved_full' | 'approved_partial' | 'rejected' | '',
    approvedQuantity: '',
    rejectionReason: '',
    notes: ''
  });
  const [showQuantityResponseDialog, setShowQuantityResponseDialog] = useState(false);


  useEffect(() => {
    loadData();
    
    // Set up real-time subscriptions based on user role
    let unsubscribeProducts: (() => void) | undefined;
    let unsubscribeDraftProducts: (() => void) | undefined;
    let unsubscribePOs: (() => void) | undefined;
    
    if (user?.role === 'supplier') {
      unsubscribeProducts = subscribeToProductsBySupplier(user.id, (updatedProducts) => {
        setProducts(updatedProducts);
      });
      unsubscribeDraftProducts = subscribeToDraftProductsBySupplier(user.id, (updatedDraftProducts) => {
        setDraftProducts(updatedDraftProducts);
      });
      unsubscribePOs = subscribeToPurchaseOrdersBySupplier(user.id, (updatedOrders) => {
        setPurchaseOrders(updatedOrders);
      });
    } else {
      unsubscribeProducts = subscribeToProposedProducts((updatedProducts) => {
        setProducts(updatedProducts);
      });
      unsubscribePOs = subscribeToPurchaseOrders((updatedOrders) => {
        setPurchaseOrders(updatedOrders);
      });
    }
    
    return () => {
      unsubscribeProducts?.();
      unsubscribeDraftProducts?.();
      unsubscribePOs?.();
    };
  }, [user]);

  const loadData = async () => {
    if (!user || !user.id) return;
    

    try {
      let productsData: Product[];
      let ordersData: PurchaseOrder[];
      let displayRequestsData: DisplayRequest[] = [];
      let quantityRequestsData: QuantityRequest[] = [];
      let draftProductsData: Product[] = [];
      
      if (user.role === 'supplier') {
        [productsData, ordersData, displayRequestsData, quantityRequestsData, draftProductsData] = await Promise.all([
          getProductsBySupplier(user.id),
          getPurchaseOrdersBySupplier(user.id),
          getDisplayRequestsBySupplier(user.id),
          getQuantityRequestsBySupplier(user.id),
          getDraftProductsBySupplier(user.id)
        ]);
      } else {
        [productsData, ordersData] = await Promise.all([
          getProposedProducts(),
          getAllPurchaseOrders()
        ]);
      }
      
      setProducts(productsData);
      setDraftProducts(draftProductsData);
      setPurchaseOrders(ordersData);
      setDisplayRequests(displayRequestsData);
      setQuantityRequests(quantityRequestsData);
    } catch (error) {
      toast.error('Failed to load data');
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'low_stock':
        return 'secondary';
      case 'out_of_stock':
      case 'discontinued':
        return 'destructive';
      case 'pending':
        return 'secondary';
      case 'confirmed':
        return 'default';
      case 'completed':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };







  const handleQuantityResponse = async () => {
    if (!selectedQuantityRequest || !user) return;
    
    if (!quantityResponseForm.status) {
      toast.error('Please select a response type');
      return;
    }
    
    if (quantityResponseForm.status === 'rejected' && !quantityResponseForm.rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
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
    
    try {
      const response: QuantityResponse = {
        quantityRequestId: selectedQuantityRequest.id,
        status: quantityResponseForm.status,
        approvedQuantity: quantityResponseForm.status === 'rejected' ? undefined : 
          quantityResponseForm.status === 'approved_full' ? undefined : parseInt(quantityResponseForm.approvedQuantity),
        rejectionReason: quantityResponseForm.status === 'rejected' ? quantityResponseForm.rejectionReason : undefined,
        notes: quantityResponseForm.notes || undefined
      };
      
      await respondToQuantityRequest(selectedQuantityRequest.id, response, user.id!);
      toast.success('Response submitted successfully');
      
      // Reset form and close dialog
      setQuantityResponseForm({
        status: '',
        approvedQuantity: '',
        rejectionReason: '',
        notes: ''
      });
      setShowQuantityResponseDialog(false);
      setSelectedQuantityRequest(null);
      
      // Reload quantity requests
      const updatedQuantityRequests = await getQuantityRequestsBySupplier(user.id!);
      setQuantityRequests(updatedQuantityRequests);
    } catch (error) {
      toast.error('Failed to submit response');
    }
  };



  const handleDeleteDisplayRequest = async (requestId: string) => {
    if (!user || !user.id) return;
    
    try {
      await deleteDisplayRequest(requestId, user.id);
      toast.success('Product proposal deleted successfully');

    // Reload product proposals
      const updatedDisplayRequests = await getDisplayRequestsBySupplier(user.id);
      setDisplayRequests(updatedDisplayRequests);
    } catch (error: any) {
      console.error('Error deleting product proposal:', error);
    toast.error(error.message || 'Failed to delete product proposal');
    }
  };

  const handleCreateProduct = async () => {
    if (!newProductForm.name || !newProductForm.category || !newProductForm.price || !user || !user.id) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const productData: CreateProduct = {
        name: newProductForm.name,
        category: newProductForm.category,
        price: parseFloat(newProductForm.price),
        description: newProductForm.description,
        imageUrl: newProductForm.imageUrl,
        supplierId: user.id,
        supplierName: user.displayName || user.email || 'Unknown',
        createdBy: user.id
      };

      await createProduct(productData);
      toast.success('Product created successfully');
      setNewProductForm({
        name: '',
        category: '',
        price: '',
        description: '',
        imageUrl: ''
      });
    } catch (error) {
      toast.error('Failed to create product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProduct = async (productId: string, updates: any) => {
    try {
      await updateProduct(productId, updates);
      toast.success('Product updated successfully');
      setIsEditDialogOpen(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
    }
  };

  const handleConvertToDraft = async (productId: string) => {
    if (!user || !user.id) return;
    
    try {
      await convertToDraft(productId);
      toast.success('Product has been converted to draft status');
      
      // Reload data to reflect the change
      await loadData();
    } catch (error: any) {
      console.error('Error converting product to draft:', error);
      toast.error(error.message || 'Failed to convert product to draft');
    }
  };

  const handleProposeProduct = async (productId: string) => {
    if (!user || !user.id) return;
    
    try {
      await proposeProduct(productId);
      toast.success('Product has been proposed for approval');
      
      // Reload data to reflect the change
      await loadData();
    } catch (error: any) {
      console.error('Error proposing product:', error);
      toast.error(error.message || 'Failed to propose product');
    }
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct({
      ...product,
      imageUrl: product.imageUrl || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleEditFormChange = (field: string, value: any) => {
    setEditingProduct((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };



  const handleSaveEdit = () => {
    if (editingProduct) {
      handleUpdateProduct(editingProduct.id, {
        name: editingProduct.name,
        category: editingProduct.category,
        price: editingProduct.price,
        description: editingProduct.description,
        imageUrl: editingProduct.imageUrl
      });
    }
  };



  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  const getCurrentSectionName = () => {
    return sections.find(s => s.id === activeSection)?.name || '';
  };

  const renderProducts = () => {
    // Filter products based on status filter
    const getFilteredProducts = () => {
      if (user?.role === 'supplier') {
        switch (statusFilter) {
          case 'draft':
            return draftProducts.filter(product =>
              product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              product.category.toLowerCase().includes(searchTerm.toLowerCase())
            );
          case 'proposed':
            return products.filter(p => p.status === 'proposed').filter(product =>
              product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              product.category.toLowerCase().includes(searchTerm.toLowerCase())
            );
          case 'all':
          default:
            // Combine draft and proposed products, ensuring no duplicates by using a Map
            const productMap = new Map();
            
            // Add draft products first
            draftProducts.forEach(product => {
              if (product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  product.category.toLowerCase().includes(searchTerm.toLowerCase())) {
                productMap.set(product.id, product);
              }
            });
            
            // Add proposed products, but only if not already in map
            products.filter(p => p.status === 'proposed').forEach(product => {
              if ((product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   product.category.toLowerCase().includes(searchTerm.toLowerCase())) &&
                  !productMap.has(product.id)) {
                productMap.set(product.id, product);
              }
            });
            
            return Array.from(productMap.values());
        }
      }
      return filteredProducts;
    };

    const displayProducts = getFilteredProducts();

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              {user?.role === 'supplier' ? 'Your Product Catalog' : 'Product Catalog'}
            </h2>
            <p className="text-sm text-muted-foreground">
              Manage your products and inventory
            </p>
          </div>
          {user?.role === 'supplier' && (
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
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Product description..."
                      value={newProductForm.description}
                      onChange={(e) => setNewProductForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  
                  <ProductImageUpload
                    mode="add"
                    currentImageUrl={newProductForm.imageUrl}
                    productName={newProductForm.name}
                    onImageUpdate={(imageUrl) => setNewProductForm(prev => ({ ...prev, imageUrl }))}
                  />
                  
                  <Button 
                    onClick={handleCreateProduct} 
                    className="w-full"
                    disabled={isSubmitting || isUploadingImage}
                  >
                    {isUploadingImage ? 'Uploading Image...' : isSubmitting ? 'Creating...' : 'Add Product'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Search and Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products by name or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              {user?.role === 'supplier' && (
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | 'draft' | 'proposed')}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    <SelectItem value="draft">Draft Products</SelectItem>
                    <SelectItem value="proposed">Proposed Products</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayProducts.map((product) => (
            <Card key={product.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Product Image */}
                  <div className="w-full h-32 bg-muted rounded-md overflow-hidden">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <Package className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-xs">No image</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
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
                      <span className="text-sm text-muted-foreground">Updated:</span>
                      <span className="text-sm">{formatDate(product.updatedAt)}</span>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setSelectedProduct(product)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    
                    {user?.role === 'supplier' ? (
                      <>
                        {product.status === 'draft' ? (
                          <Button 
                            size="sm" 
                            variant="default" 
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                            onClick={() => handleProposeProduct(product.id)}
                          >
                            <Send className="h-3 w-3 mr-1" />
                            Propose
                          </Button>
                        ) : product.status === 'proposed' ? (
                          <Button 
                            size="sm" 
                            variant="default" 
                            className="flex-1 bg-orange-600 hover:bg-orange-700"
                            onClick={() => handleConvertToDraft(product.id)}
                          >
                            <ArrowDown className="h-3 w-3 mr-1" />
                            To Draft
                          </Button>
                        ) : null}
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => handleEditProduct(product)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </>
                    ) : (
                      <>
                        {product.status === 'proposed' && (
                          <Button 
                            size="sm" 
                            variant="default" 
                            className="flex-1 bg-orange-600 hover:bg-orange-700"
                            onClick={() => handleConvertToDraft(product.id)}
                          >
                            <ArrowDown className="h-3 w-3 mr-1" />
                            To Draft
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => handleEditProduct(product)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };



  // Product Details Dialog
  const renderProductDetailsDialog = () => (
    selectedProduct && (
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription>
              {selectedProduct.name} - {selectedProduct.id}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Product Image */}
            <div className="w-full h-48 bg-muted rounded-md overflow-hidden">
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
                    <p className="text-sm">No image available</p>
                  </div>
                </div>
              )}
            </div>
            
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
            </div>
            <div>
              <Label className="text-sm font-medium">Last Updated</Label>
              <p className="text-sm">{formatDate(selectedProduct.updatedAt)}</p>
            </div>
            <div className="flex space-x-2 pt-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => handleEditProduct(selectedProduct)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  );

  const renderProposedProducts = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Proposed Products</h2>
        <p className="text-sm text-muted-foreground">
          Track your product proposals to Admin/Warehouse
        </p>
      </div>

      {displayRequests.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8 text-muted-foreground">
              <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No product proposals found</p>
              <p className="text-sm">Products you propose will appear here</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {displayRequests.map((request) => (
            <Card key={request.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold">{request.productName}</h3>
                      <Badge variant={getStatusBadgeVariant(request.status)}>
                        {request.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      SKU: {request.productSku || 'N/A'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Price: ${request.productPrice}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Proposed: {formatDate(request.requestedAt)}
                    </p>
                    {request.reviewedAt && (
                      <p className="text-sm text-muted-foreground">
                        Reviewed: {formatDate(request.reviewedAt)} by {request.reviewerName}
                      </p>
                    )}
                    {request.rejectionReason && (
                      <p className="text-sm text-red-600">
                        Reason: {request.rejectionReason}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {request.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteDisplayRequest(request.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                        <Clock className="h-4 w-4 text-yellow-500" />
                      </>
                    )}
                    {request.status === 'accepted' && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {request.status === 'rejected' && (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderReceivedRequests = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Received Requests</h2>
        <p className="text-sm text-muted-foreground">
          Respond to quantity requests from Admin/Warehouse
        </p>
      </div>

      {quantityRequests.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8 text-muted-foreground">
              <Inbox className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No quantity requests found</p>
              <p className="text-sm">Incoming requests will appear here</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {quantityRequests.map((request) => (
            <Card key={request.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold">{request.productName}</h3>
                      <Badge variant={getStatusBadgeVariant(request.status)}>
                        {request.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Requested Quantity: {request.requestedQuantity}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Requested by: {request.requesterName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Requested: {formatDate(request.requestedAt)}
                    </p>
                    {request.respondedAt && (
                      <p className="text-sm text-muted-foreground">
                        Responded: {formatDate(request.respondedAt)}
                      </p>
                    )}
                    {request.approvedQuantity && (
                      <p className="text-sm text-green-600">
                        Approved Quantity: {request.approvedQuantity}
                      </p>
                    )}
                    {request.rejectionReason && (
                      <p className="text-sm text-red-600">
                        Rejection Reason: {request.rejectionReason}
                      </p>
                    )}
                    {request.notes && (
                      <p className="text-sm text-muted-foreground">
                        Notes: {request.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {request.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedQuantityRequest(request);
                          setShowQuantityResponseDialog(true);
                        }}
                      >
                        Respond
                      </Button>
                    )}
                    {request.status === 'approved_full' && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {request.status === 'approved_partial' && (
                      <CheckCircle className="h-4 w-4 text-yellow-500" />
                    )}
                    {request.status === 'rejected' && (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
          {activeSection === 'requested-products' && renderProposedProducts()}
          {activeSection === 'received-requests' && renderReceivedRequests()}
        </div>
      </div>

      {/* Product Details Dialog */}
      {renderProductDetailsDialog()}

      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update product information
            </DialogDescription>
          </DialogHeader>
          {editingProduct && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Product Name</Label>
                <Input
                  value={editingProduct.name || ''}
                  onChange={(e) => handleEditFormChange('name', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select 
                    value={editingProduct.category || ''} 
                    onValueChange={(value) => handleEditFormChange('category', value)}
                  >
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
                    value={editingProduct.price || ''}
                    onChange={(e) => handleEditFormChange('price', parseFloat(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingProduct.description || ''}
                  onChange={(e) => handleEditFormChange('description', e.target.value)}
                />
              </div>
              
              <ProductImageUpload
                mode="update"
                currentImageUrl={editingProduct.imageUrl || ''}
                productName={editingProduct.name || ''}
                productId={editingProduct.id}
                onImageUpdate={(imageUrl) => handleEditFormChange('imageUrl', imageUrl)}
              />
              
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleSaveEdit}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}