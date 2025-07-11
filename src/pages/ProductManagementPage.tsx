import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { NavigationHeader } from '@/components/NavigationHeader';
import { 
  Plus, 
  Search, 
  Package, 
  Edit, 
  Eye,
  CalendarIcon,
  Send,

  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Product, 
  PurchaseOrder, 
  CreateProduct, 
  UpdateProduct,
  UpdatePurchaseOrder,
  getAllProducts,
  getProductsBySupplier,
  createProduct,
  updateProduct,
  uploadProductImage,


  getAllPurchaseOrders,
  getPurchaseOrdersBySupplier,
  updatePurchaseOrder,
  subscribeToProducts,
  subscribeToProductsBySupplier,
  subscribeToPurchaseOrders,
  subscribeToPurchaseOrdersBySupplier
} from '@/services/productService';



const sections = [
  { id: 'products', name: 'Product Catalog' },
  { id: 'purchase-orders', name: 'Purchase Orders' }
];

export default function ProductManagementPage() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('products');
  const [searchTerm, setSearchTerm] = useState('');

  const [products, setProducts] = useState<Product[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [deliveryDate, setDeliveryDate] = useState<Date>();
  const [response, setResponse] = useState('');
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    category: '',
    price: '',
    stock: '',
    description: ''
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editProductForm, setEditProductForm] = useState<UpdateProduct>({});


  useEffect(() => {
    loadData();
    
    // Set up real-time subscriptions based on user role
    let unsubscribeProducts: (() => void) | undefined;
    let unsubscribePOs: (() => void) | undefined;
    
    if (user?.role === 'supplier') {
      unsubscribeProducts = subscribeToProductsBySupplier(user.id, (updatedProducts) => {
        setProducts(updatedProducts);
      });
      unsubscribePOs = subscribeToPurchaseOrdersBySupplier(user.id, (updatedOrders) => {
        setPurchaseOrders(updatedOrders);
      });
    } else {
      unsubscribeProducts = subscribeToProducts((updatedProducts) => {
        setProducts(updatedProducts);
      });
      unsubscribePOs = subscribeToPurchaseOrders((updatedOrders) => {
        setPurchaseOrders(updatedOrders);
      });
    }
    
    return () => {
      unsubscribeProducts?.();
      unsubscribePOs?.();
    };
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    try {

      let productsData: Product[];
      let ordersData: PurchaseOrder[];
      
      if (user.role === 'supplier') {
        [productsData, ordersData] = await Promise.all([
          getProductsBySupplier(user.id),
          getPurchaseOrdersBySupplier(user.id)
        ]);
      } else {
        [productsData, ordersData] = await Promise.all([
          getAllProducts(),
          getAllPurchaseOrders()
        ]);
      }
      
      setProducts(productsData);
      setPurchaseOrders(ordersData);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {

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



  const handlePOResponse = async (poId: string) => {
    if (!deliveryDate) {
      toast.error('Please select a delivery date');
      return;
    }
    
    try {
      const updates: UpdatePurchaseOrder = {
        status: 'confirmed',
        response,
        deliveryDate
      };
      
      await updatePurchaseOrder(poId, updates);
      toast.success(`Response submitted for ${poId}`);
      setSelectedPO(null);
      setDeliveryDate(undefined);
      setResponse('');
      setQuantities({});
    } catch (error) {
      toast.error('Failed to submit response');
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleCreateProduct = async () => {
    if (!newProductForm.name || !newProductForm.category || !newProductForm.price || !user) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const productData: CreateProduct = {
        name: newProductForm.name,
        category: newProductForm.category,
        price: parseFloat(newProductForm.price),
        stock: parseInt(newProductForm.stock) || 0,
        description: newProductForm.description,
        supplierId: user.id,
        supplierName: user.displayName || user.email || 'Unknown',
        createdBy: user.id
      };

      // Upload image if selected
      if (selectedImage) {
        setIsUploadingImage(true);
        try {
          const uploadResult = await uploadProductImage(selectedImage);
          productData.imageUrl = uploadResult.url;
          productData.imagePath = uploadResult.path;
        } catch (imageError) {
          console.error('Error uploading image:', imageError);
          toast.error('Product created but image upload failed');
        } finally {
          setIsUploadingImage(false);
        }
      }
      
      await createProduct(productData);
      toast.success('Product created successfully');
      setNewProductForm({
        name: '',
        category: '',
        price: '',
        stock: '',
        description: ''
      });
      setSelectedImage(null);
      setImagePreview(null);
    } catch (error) {
      toast.error('Failed to create product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProduct = async (productId: string) => {
    try {
      await updateProduct(productId, editProductForm);
      toast.success('Product updated successfully');

      setEditProductForm({});
      setSelectedProduct(null);
    } catch (error) {
      toast.error('Failed to update product');
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

  const renderProducts = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Product Catalog</h2>
          <p className="text-sm text-muted-foreground">
            Manage your products and inventory
          </p>
        </div>
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
                <Label>Initial Stock</Label>
                <Input
                  type="number"
                  placeholder="Enter stock quantity"
                  value={newProductForm.stock}
                  onChange={(e) => setNewProductForm(prev => ({ ...prev, stock: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Product description..."
                  value={newProductForm.description}
                  onChange={(e) => setNewProductForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              
              {/* Image Upload Section */}
              <div className="space-y-2">
                <Label>Product Image (Optional)</Label>
                <div className="space-y-2">
                  {imagePreview ? (
                    <div className="relative">
                      <img 
                        src={imagePreview} 
                        alt="Product preview" 
                        className="w-full h-32 object-cover rounded-md border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={handleRemoveImage}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-md p-4 text-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                        id="product-image-upload"
                      />
                      <label 
                        htmlFor="product-image-upload" 
                        className="cursor-pointer flex flex-col items-center space-y-2"
                      >
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <Plus className="h-4 w-4" />
                        </div>
                        <span className="text-sm text-muted-foreground">Click to upload image</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
              
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
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products by name or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((product) => (
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
                    <span className="text-sm text-muted-foreground">Stock:</span>
                    <span className="font-medium">{product.stock} units</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Updated:</span>
                    <span className="text-sm">{formatDate(product.updatedAt)}</span>
                  </div>
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
                            <div>
                              <Label className="text-sm font-medium">Stock</Label>
                              <p className="text-sm">{selectedProduct.stock} units</p>
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
                              onClick={() => handleUpdateProduct(selectedProduct.id)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                            <Button className="flex-1">
                              <Package className="mr-2 h-4 w-4" />
                              Update Stock
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    )}
                  </Dialog>
                  <Button size="sm" variant="outline" className="flex-1">
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderPurchaseOrders = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Purchase Orders</h2>
        <p className="text-sm text-muted-foreground">
          Manage incoming purchase orders and respond to requests
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {purchaseOrders.map((po) => (
              <div key={po.id} className="p-4 border rounded-lg space-y-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{po.id}</p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(po.status)}>
                      {po.status}
                    </Badge>
                  </div>
                  <p className="text-lg font-bold">${(po.total || 0).toLocaleString()}</p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">Customer</Label>
                    <p className="font-medium">{po.customer}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Requested</Label>
                    <p>{formatDate(po.createdAt)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Deadline</Label>
                    <p>{formatDate(po.requestedDate)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Items</Label>
                    <p>{po.items.length} product(s)</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Items:</Label>
                  {po.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                      <span className="text-sm">{item.productName}</span>
                      <span className="text-sm font-medium">
                        {item.quantity} × ${item.price || 0} = ${((item.quantity || 0) * (item.price || 0)).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                {po.notes && (
                  <div>
                    <Label className="text-sm font-medium">Notes:</Label>
                    <p className="text-sm text-muted-foreground">{po.notes}</p>
                  </div>
                )}

                <div className="flex space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedPO(po)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Details
                      </Button>
                    </DialogTrigger>
                    {selectedPO && (
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Purchase Order Response</DialogTitle>
                          <DialogDescription>
                          Respond to {selectedPO.id} from {selectedPO.customer}
                        </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Items</Label>
                            {selectedPO.items.map((item: any, index: number) => (
                              <div key={index} className="flex items-center justify-between p-2 border rounded">
                                <span className="text-sm">{item.name}</span>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-muted-foreground">Requested: {item.quantity}</span>
                                  <Input
                                    type="number"
                                    placeholder={item.quantity.toString()}
                                    className="w-20 h-8"
                                    value={quantities[item.name] || item.quantity}
                                    onChange={(e) => setQuantities(prev => ({
                                      ...prev,
                                      [item.name]: parseInt(e.target.value) || 0
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
                            <Label>Response Notes</Label>
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
                              <Send className="mr-2 h-4 w-4" />
                              Submit Response
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    )}
                  </Dialog>
                  
                  {po.status === 'pending' && (
                    <Button 
                      size="sm"
                      onClick={() => setSelectedPO(po)}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Respond
                    </Button>
                  )}
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
          {activeSection === 'purchase-orders' && renderPurchaseOrders()}
        </div>
      </div>
    </div>
  );
}