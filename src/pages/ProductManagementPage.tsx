import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
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
  X,
  Send,
  Save,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  Inbox,
  Trash2,
  ArrowDown,
  AlertTriangle
} from 'lucide-react';

import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { 
  Product, 
  PurchaseOrder, 
  CreateProduct, 


  getProposedProducts,
  getProductsBySupplier,
  createProduct,
  updateProduct,
  deleteProduct,
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
  deleteDisplayRequest,
  hasActiveQuantityRequests
} from '@/services/displayRequestService';



// This will be defined inside the component to access pendingQuantityRequests

export default function ProductManagementPage() {
  const { user } = useAuth();
  const { pendingQuantityRequests } = useNotifications();
  const [activeSection, setActiveSection] = useState('products');
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [draftProducts, setDraftProducts] = useState<Product[]>([]);
  const [, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [displayRequests, setDisplayRequests] = useState<DisplayRequest[]>([]);
  const [quantityRequests, setQuantityRequests] = useState<QuantityRequest[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'proposed'>('all');
  const [productsWithActiveRequests, setProductsWithActiveRequests] = useState<Set<string>>(new Set());
  
  // Delete confirmation dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);


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

  // Define sections with unread count
  const sections = [
    { id: 'products', name: 'Product Catalog', icon: Package },
    { id: 'received-requests', name: 'Received Requests', icon: Inbox, unreadCount: pendingQuantityRequests }
  ];

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

  const checkProductsWithActiveRequests = async (allProducts: Product[]) => {
    if (user?.role !== 'supplier' || !user?.id) return;
    
    try {
      const activeRequestsSet = new Set<string>();
      
      // Check each product for active quantity requests
      await Promise.all(
        allProducts.map(async (product) => {
          const hasActive = await hasActiveQuantityRequests(product.id, user.id);
          if (hasActive) {
            activeRequestsSet.add(product.id);
          }
        })
      );
      
      setProductsWithActiveRequests(activeRequestsSet);
    } catch (error) {
      console.error('Error checking products with active requests:', error);
    }
  };

  const loadData = async () => {
    if (!user || !user.id) return;
    
    setIsLoadingRequests(true);
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
        
        // Check for active requests for all products (draft + proposed)
        const allProducts = [...draftProductsData, ...productsData];
        await checkProductsWithActiveRequests(allProducts);
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
    } finally {
      setIsLoadingRequests(false);
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

  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDeleteProduct = async () => {
    if (!user || !user.id || !productToDelete) return;
    
    try {
      // Check if product has active quantity requests
      const hasActiveRequests = await hasActiveQuantityRequests(productToDelete.id, user.id);
      if (hasActiveRequests) {
        toast.error('Cannot delete product with active quantity requests. Please resolve all pending requests first.');
        setIsDeleteDialogOpen(false);
        setProductToDelete(null);
        return;
      }
      
      // If product is in proposed status, convert to draft first
      if (productToDelete.status === 'proposed') {
        await convertToDraft(productToDelete.id);
        toast.success('Product converted to draft');
      }
      
      // Delete the product (this will also delete associated images)
      await deleteProduct(productToDelete.id);
      toast.success('Product deleted successfully');
      
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
      
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error(error.message || 'Failed to delete product');
    }
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
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {user?.role === 'supplier' ? 'Your Product Catalog' : 'Product Catalog'}
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-400 mt-1">
              Manage your products and inventory
            </p>
          </div>
          {user?.role === 'supplier' && (
            <Dialog>
              <DialogTrigger asChild>
                <Button className="btn-premium">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md card-premium">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">Add New Product</DialogTitle>
                  <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
                    Add a new product to your catalog
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-medium">Product Name</Label>
                    <Input
                      placeholder="Enter product name"
                      value={newProductForm.name}
                      onChange={(e) => setNewProductForm(prev => ({ ...prev, name: e.target.value }))}
                      className="h-10"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-medium">Category</Label>
                      <Select value={newProductForm.category} onValueChange={(value) => setNewProductForm(prev => ({ ...prev, category: value }))}>
                        <SelectTrigger className="h-10">
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
                      <Label className="font-medium">Price ($)</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={newProductForm.price}
                        onChange={(e) => setNewProductForm(prev => ({ ...prev, price: e.target.value }))}
                        className="h-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-medium">Description</Label>
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
                    className="w-full btn-premium"
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
        <Card className="card-enhanced">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 mb-4">
              <Search className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              <h3 className="font-medium text-slate-900 dark:text-slate-100">Search & Filter</h3>
            </div>
            <div className="flex space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products by name or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
              {user?.role === 'supplier' && (
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | 'draft' | 'proposed')}>
                  <SelectTrigger className="w-[180px] h-10">
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {displayProducts.map((product) => (
            <Card key={product.id} className="card-enhanced hover-lift group overflow-hidden">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Product Image */}
                  <div className="w-full h-40 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden relative">
                    {product.imageUrl ? (
                      <>
                        <img 
                          src={product.imageUrl} 
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <Package className="h-10 w-10 mx-auto mb-2 text-blue-500" />
                          <p className="text-sm font-medium">No image</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">{product.name}</h3>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                          {product.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono bg-gray-100 px-2 py-1 rounded">ID: {product.id}</p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(product.status)} className="ml-2">
                      {product.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">Price:</span>
                      <span className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                        ${product.price}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">Updated:</span>
                      <span className="text-sm bg-gray-100 px-2 py-1 rounded">{formatDate(product.updatedAt)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button 
                      size="sm" 
                      className="btn-outline flex-1 min-w-[80px]"
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
                            className="flex-1 min-w-[90px] btn-premium"
                            onClick={() => handleProposeProduct(product.id)}
                          >
                            <Send className="h-3 w-3 mr-1" />
                            Propose
                          </Button>
                        ) : product.status === 'proposed' ? (
                          <Button 
                            size="sm" 
                            className="flex-1 min-w-[90px] bg-amber-600 hover:bg-amber-700 text-white"
                            onClick={() => handleConvertToDraft(product.id)}
                          >
                            <ArrowDown className="h-3 w-3 mr-1" />
                            To Draft
                          </Button>
                        ) : null}
                        <Button 
                          size="sm" 
                          className="btn-outline flex-1 min-w-[70px]"
                          onClick={() => handleEditProduct(product)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          className="flex-1 min-w-[80px]"
                          disabled={productsWithActiveRequests.has(product.id)}
                          onClick={() => handleDeleteProduct(product)}
                          title={productsWithActiveRequests.has(product.id) ? 'Cannot delete product with active quantity requests' : 'Delete product'}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </>
                    ) : (
                      <>
                        {product.status === 'proposed' && (
                          <Button 
                            size="sm" 
                            className="flex-1 min-w-[90px] bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white shadow-lg hover:shadow-xl transition-all"
                            onClick={() => handleConvertToDraft(product.id)}
                          >
                            <ArrowDown className="h-3 w-3 mr-1" />
                            To Draft
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          className="btn-glass hover-glow flex-1 min-w-[70px]"
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
        <DialogContent className="max-w-md card-enhanced">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">Product Details</DialogTitle>
            <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
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
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">${selectedProduct.price}</p>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Last Updated</Label>
              <p className="text-sm">{formatDate(selectedProduct.updatedAt)}</p>
            </div>
            <div className="flex space-x-2 pt-4">
              <Button 
                variant="outline" 
                className="flex-1 h-9"
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
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Proposed Products
        </h2>
        <p className="text-base text-slate-600 dark:text-slate-400 mt-1">
          Track your product proposals to Admin/Warehouse
        </p>
      </div>

      {displayRequests.length === 0 ? (
        <Card className="card-enhanced">
          <CardContent className="p-8">
            <div className="text-center py-12 text-muted-foreground">
              <div className="w-20 h-20 mx-auto mb-6 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                <Send className="h-10 w-10 text-slate-600 dark:text-slate-400" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-slate-900 dark:text-slate-100">No product proposals found</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Products you propose will appear here</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {displayRequests.map((request) => (
            <Card key={request.id} className="card-enhanced hover-lift">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{request.productName}</h3>
                      <Badge variant={getStatusBadgeVariant(request.status)} className="px-3 py-1">
                        {request.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">SKU:</span>
                        <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded mt-1">
                          {request.productSku || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Price:</span>
                        <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-1">
                          ${request.productPrice}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm">
                        <span className="font-medium">Proposed:</span> {formatDate(request.requestedAt)}
                      </p>
                      {request.reviewedAt && (
                        <p className="text-sm">
                          <span className="font-medium">Reviewed:</span> {formatDate(request.reviewedAt)} by {request.reviewerName}
                        </p>
                      )}
                      {request.rejectionReason && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <p className="text-sm text-red-800">
                            <span className="font-medium">Reason:</span> {request.rejectionReason}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 ml-4">
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
                        <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                          <Clock className="h-5 w-5 text-yellow-600" />
                        </div>
                      </>
                    )}
                    {request.status === 'accepted' && (
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                    )}
                    {request.status === 'rejected' && (
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <XCircle className="h-5 w-5 text-red-600" />
                      </div>
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
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Received Requests
        </h2>
        <p className="text-base text-slate-600 dark:text-slate-400 mt-1">
          Respond to quantity requests from Admin/Warehouse
        </p>
      </div>

      {isLoadingRequests ? (
        <Card className="card-enhanced">
          <CardContent className="p-8">
            <div className="text-center py-12 text-muted-foreground">
              <div className="w-16 h-16 mx-auto mb-6">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-slate-600"></div>
              </div>
              <h3 className="text-lg font-medium mb-2">Loading requests...</h3>
              <p className="text-sm">Please wait while we fetch your data</p>
            </div>
          </CardContent>
        </Card>
      ) : quantityRequests.length === 0 ? (
        <Card className="card-enhanced">
          <CardContent className="p-8">
            <div className="text-center py-12 text-muted-foreground">
              <div className="w-16 h-16 mx-auto mb-6 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                <Inbox className="h-8 w-8 text-slate-600 dark:text-slate-400" />
              </div>
              <h3 className="text-lg font-medium mb-2">No quantity requests found</h3>
              <p className="text-sm">Incoming requests will appear here</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {quantityRequests.map((request) => (
            <Card key={request.id} className="card-enhanced hover-lift">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-xl font-bold">{request.productName}</h3>
                      <Badge variant={getStatusBadgeVariant(request.status)} className="px-3 py-1">
                        {request.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Requested Quantity:</span>
                        <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-1">
                          {request.requestedQuantity}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Requested by:</span>
                        <p className="font-semibold mt-1">
                          {request.requesterName}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm">
                        <span className="font-medium">Requested:</span> {formatDate(request.requestedAt)}
                      </p>
                      {request.respondedAt && (
                        <p className="text-sm">
                          <span className="font-medium">Responded:</span> {formatDate(request.respondedAt)}
                        </p>
                      )}
                      {request.approvedQuantity && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-sm text-green-800">
                            <span className="font-medium">Approved Quantity:</span> {request.approvedQuantity}
                          </p>
                        </div>
                       )}
                       {request.rejectionReason && (
                         <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                           <p className="text-sm text-red-800">
                             <span className="font-medium">Rejection Reason:</span> {request.rejectionReason}
                           </p>
                         </div>
                       )}
                       {request.notes && (
                         <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                           <p className="text-sm text-blue-800">
                             <span className="font-medium">Notes:</span> {request.notes}
                           </p>
                         </div>
                       )}
                     </div>
                   </div>
                   <div className="flex items-center space-x-3 ml-4">
                     {request.status === 'pending' && (
                       <Button
                           size="sm"
                           className="btn-premium"
                           onClick={() => {
                             setSelectedQuantityRequest(request);
                             setShowQuantityResponseDialog(true);
                           }}
                         >
                           <MessageSquare className="h-3 w-3 mr-1" />
                           Respond
                         </Button>
                     )}
                     {request.status === 'approved_full' && (
                       <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                         <CheckCircle className="h-5 w-5 text-green-600" />
                       </div>
                     )}
                     {request.status === 'approved_partial' && (
                       <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                         <CheckCircle className="h-5 w-5 text-yellow-600" />
                       </div>
                     )}
                     {request.status === 'rejected' && (
                       <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                         <XCircle className="h-5 w-5 text-red-600" />
                       </div>
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
        <DialogContent className="max-w-lg card-enhanced">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Respond to Quantity Request
            </DialogTitle>
            <DialogDescription className="text-base text-slate-600 dark:text-slate-400">
              <span className="font-medium text-slate-900 dark:text-slate-100">{selectedQuantityRequest?.productName}</span> - Requested: <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedQuantityRequest?.requestedQuantity}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Response Type</Label>
              <Select 
                value={quantityResponseForm.status} 
                onValueChange={(value: 'approved_full' | 'approved_partial' | 'rejected') => 
                  setQuantityResponseForm(prev => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select response type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved_full">✅ Approve Full Quantity</SelectItem>
                  <SelectItem value="approved_partial">⚠️ Approve Partial Quantity</SelectItem>
                  <SelectItem value="rejected">❌ Reject Request</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {quantityResponseForm.status === 'approved_partial' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Approved Quantity</Label>
                <Input
                  type="number"
                  placeholder="Enter quantity you can supply"
                  value={quantityResponseForm.approvedQuantity}
                  onChange={(e) => setQuantityResponseForm(prev => ({ ...prev, approvedQuantity: e.target.value }))}
                  className="h-10"
                />
              </div>
            )}
            
            {quantityResponseForm.status === 'rejected' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Rejection Reason *</Label>
                <Textarea
                  placeholder="Please provide a reason for rejection..."
                  value={quantityResponseForm.rejectionReason}
                  onChange={(e) => setQuantityResponseForm(prev => ({ ...prev, rejectionReason: e.target.value }))}
                  className="min-h-[100px]"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Additional Notes (Optional)</Label>
              <Textarea
                placeholder="Any additional notes..."
                value={quantityResponseForm.notes}
                onChange={(e) => setQuantityResponseForm(prev => ({ ...prev, notes: e.target.value }))}
                className="min-h-[80px]"
              />
            </div>
            
            <div className="flex space-x-3 pt-4">
              <Button 
                variant="outline" 
                className="flex-1 h-10"
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
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                className="flex-1 h-10 btn-premium"
                onClick={handleQuantityResponse}
                disabled={!quantityResponseForm.status}
              >
                <Send className="h-4 w-4 mr-2" />
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
        <DialogContent className="max-w-2xl card-enhanced">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Edit Product
            </DialogTitle>
            <DialogDescription className="text-base text-slate-600 dark:text-slate-400">
              Update product information and details
            </DialogDescription>
          </DialogHeader>
          {editingProduct && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Product Name</Label>
                <Input
                  value={editingProduct.name || ''}
                  onChange={(e) => handleEditFormChange('name', e.target.value)}
                  className="h-10"
                  placeholder="Enter product name"
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Category</Label>
                  <Select 
                    value={editingProduct.category || ''} 
                    onValueChange={(value) => handleEditFormChange('category', value)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Electronics">📱 Electronics</SelectItem>
                      <SelectItem value="Accessories">🎧 Accessories</SelectItem>
                      <SelectItem value="Furniture">🪑 Furniture</SelectItem>
                      <SelectItem value="Office Supplies">📎 Office Supplies</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Price ($)</Label>
                  <Input
                    type="number"
                    value={editingProduct.price || ''}
                    onChange={(e) => handleEditFormChange('price', parseFloat(e.target.value))}
                    className="h-10"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Description</Label>
                <Textarea
                  value={editingProduct.description || ''}
                  onChange={(e) => handleEditFormChange('description', e.target.value)}
                  className="min-h-[120px]"
                  placeholder="Enter product description"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Product Image</Label>
                <ProductImageUpload
                  mode="update"
                  currentImageUrl={editingProduct.imageUrl || ''}
                  productName={editingProduct.name || ''}
                  productId={editingProduct.id}
                  onImageUpdate={(imageUrl) => handleEditFormChange('imageUrl', imageUrl)}
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1 h-10"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button 
                  className="flex-1 h-10 btn-premium"
                  onClick={handleSaveEdit}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Product Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{productToDelete?.name}"? This action will permanently remove the product and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 my-2 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800">Warning</h4>
                <p className="text-sm text-red-700 mt-1">
                  This will permanently delete the product from your catalog. If the product has active quantity requests, deletion will be prevented.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setProductToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteProduct}
            >
              Delete Product Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}