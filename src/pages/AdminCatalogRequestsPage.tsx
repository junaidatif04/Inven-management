import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { NavigationHeader } from '@/components/NavigationHeader';
import { useAuth } from '@/contexts/AuthContext';
import {
  Search,
  ShoppingCart,
  Package,
  User as UserIcon,
  X,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';import {
  getProposedProducts,
  Product
} from '../services/productService';import { getAllUsers } from '@/services/userService';
import { User } from '@/services/authService';
import { getAllAccessRequests, AccessRequest } from '@/services/accessRequestService';
import {
  createQuantityRequest,
  subscribeToQuantityRequestsByRequester,
  cancelQuantityRequest,
  deleteQuantityRequest,
  CreateQuantityRequest
} from '@/services/displayRequestService';

interface AdminQuantityRequest {
  id: string;
  productId: string;
  productName: string;
  supplierName: string;
  requestType: 'Quantity';
  status: 'New' | 'Awaiting Response' | 'Partially Supplied' | 'Rejected' | 'Fulfilled' | 'Cancelled';
  requestedQuantity: number;
  approvedQuantity?: number;
  requestedAt: any;
  supplierEmail: string;
  supplierId: string;
}

interface SupplierWithDetails extends User {
  accessRequest?: AccessRequest;
  companyName?: string;
}

const sections = [
  { id: 'catalog', name: 'Product Catalog' },
  { id: 'requests', name: 'My Requests' },
  { id: 'suppliers', name: 'Browse by Supplier' }
];

export default function AdminCatalogRequestsPage() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('catalog');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [selectedSupplierForBrowse, setSelectedSupplierForBrowse] = useState<SupplierWithDetails | null>(null);
  
  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierWithDetails[]>([]);
  const [myRequests, setMyRequests] = useState<AdminQuantityRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [quantityRequestForm, setQuantityRequestForm] = useState({
    quantity: 1,
    notes: ''
  });
  const [showQuantityDialog, setShowQuantityDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Authentication guard
  if (!user || (user.role !== 'admin' && user.role !== 'warehouse_staff')) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load products, users, and access requests
        const [productsData, users, accessRequests] = await Promise.all([
          getProposedProducts(),
          getAllUsers(),
          getAllAccessRequests()
        ]);
        
        setProducts(productsData);
        
        // Filter users to only include suppliers and merge with access request data
        const supplierUsers = users.filter(user => user.role === 'supplier');
        const suppliersWithDetails: SupplierWithDetails[] = supplierUsers.map(user => {
          const accessRequest = accessRequests.find(req => 
            req.email === user.email && req.requestedRole === 'supplier'
          );
          return {
            ...user,
            accessRequest
          };
        });
        
        setSuppliers(suppliersWithDetails);
        
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Real-time subscription for admin's quantity requests
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeToQuantityRequestsByRequester(user.id, (requestsData) => {
      const formattedRequests: AdminQuantityRequest[] = requestsData.map(req => ({
        id: req.id,
        productId: req.productId,
        productName: req.productName,
        supplierName: req.supplierName,
        requestType: 'Quantity' as const,
        status: mapQuantityRequestStatus(req.status),
        requestedQuantity: req.requestedQuantity,
        approvedQuantity: req.approvedQuantity,
        requestedAt: req.requestedAt,
        supplierEmail: req.supplierEmail,
        supplierId: req.supplierId
      }));
      setMyRequests(formattedRequests);
    });

    return () => {
      try {
        unsubscribe();
      } catch (error) {
        console.error('Error cleaning up quantity requests subscription:', error);
      }
    };
  }, [user?.id]);

  const mapQuantityRequestStatus = (status: string): 'New' | 'Awaiting Response' | 'Partially Supplied' | 'Rejected' | 'Fulfilled' | 'Cancelled' => {
    switch (status) {
      case 'pending': return 'Awaiting Response';
      case 'approved_full': return 'Fulfilled';
      case 'approved_partial': return 'Partially Supplied';
      case 'rejected': return 'Rejected';
      case 'cancelled': return 'Cancelled';
      default: return 'New';
    }
  };



  // Get unique supplier names for filter
  const supplierNames = ['All', ...Array.from(new Set(products.map(p => p.supplierName))).sort()];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSupplier = selectedSupplier === 'All' || product.supplierName === selectedSupplier;
    return matchesSearch && matchesSupplier;
  });

  const handleRequestQuantity = async () => {
    if (!selectedProduct || !user?.id || quantityRequestForm.quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    try {
      setSubmitting(true);
      
      // Find supplier email from suppliers array
      const supplier = suppliers.find(s => s.id === selectedProduct.supplierId);
      
      const requestData: CreateQuantityRequest = {
        // displayRequestId omitted for direct quantity requests
        productId: selectedProduct.id!,
        productName: selectedProduct.name,
        supplierId: selectedProduct.supplierId!,
        supplierName: selectedProduct.supplierName,
        supplierEmail: supplier?.email || '',
        requestedBy: user.id,
        requesterName: user.displayName || user.email || 'Admin',
        requestedQuantity: quantityRequestForm.quantity
      };

      await createQuantityRequest(requestData, user.id, user.displayName || user.email || 'Admin');
      
      // Requests will be updated automatically via real-time subscription
      
      // Reset form
      setQuantityRequestForm({ quantity: 1, notes: '' });
      setShowQuantityDialog(false);
      setSelectedProduct(null);
      
      toast.success('Quantity request sent to supplier');
      
    } catch (error) {
      console.error('Error creating quantity request:', error);
      toast.error('Failed to create quantity request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await cancelQuantityRequest(requestId);
      
      // Requests will be updated automatically via real-time subscription
      
      toast.success('Request cancelled');
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast.error('Failed to cancel request');
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!user?.id) return;
    
    try {
      await deleteQuantityRequest(requestId, user.id);
      
      // Requests will be updated automatically via real-time subscription
      
      toast.success('Request deleted');
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error('Failed to delete request');
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Fulfilled': return 'default';
      case 'Awaiting Response': case 'New': return 'secondary';
      case 'Partially Supplied': return 'outline';
      case 'Rejected': return 'destructive';
      case 'Cancelled': return 'secondary';
      default: return 'outline';
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
            View every product proposed by all suppliers in a unified list
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by product name, SKU, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by supplier" />
              </SelectTrigger>
              <SelectContent>
                {supplierNames.map((supplier) => (
                  <SelectItem key={supplier} value={supplier}>
                    {supplier}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Product Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg line-clamp-2">{product.name}</CardTitle>
                  <CardDescription className="text-sm font-medium text-primary">
                    {product.supplierName}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="ml-2">{product.category}</Badge>
              </div>
            </CardHeader>
            <div className="px-6 pb-4">
              {product.imageUrl ? (
                <>
                  <img 
                    src={product.imageUrl} 
                    alt={product.name}
                    className="w-full h-48 object-cover rounded-lg"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      const placeholder = target.nextElementSibling as HTMLElement;
                      if (placeholder) placeholder.style.display = 'flex';
                    }}
                  />
                  <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center text-muted-foreground hidden">
                    <div className="text-center">
                      <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No Image Available</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No Image Available</p>
                  </div>
                </div>
              )}
            </div>
            <CardContent className="space-y-4">
              {product.description && (
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {product.description}
                </p>
              )}
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Price:</span>
                  <span className="text-lg font-bold text-primary">${product.price.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">SKU:</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {product.sku || `SKU-${product.id?.slice(-8)}`}
                  </code>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Date Proposed:</span>
                  <span className="text-xs text-muted-foreground">
                    {product.createdAt?.toDate ? 
                      product.createdAt.toDate().toLocaleDateString() : 
                      new Date().toLocaleDateString()
                    }
                  </span>
                </div>
              </div>
              
              <Button
                className="w-full"
                onClick={() => {
                  setSelectedProduct(product);
                  setShowQuantityDialog(true);
                }}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Request Quantity
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {filteredProducts.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground">No products match your current search criteria</p>
          </CardContent>
        </Card>
      )}


    </div>
  );

  const renderRequests = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">My Requests</h2>
        <p className="text-sm text-muted-foreground">
          View every display and quantity request you have sent, across all suppliers
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="p-4 font-medium">Supplier Name</th>
                  <th className="p-4 font-medium">Product Name</th>
                  <th className="p-4 font-medium">Request Type</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Quantity</th>
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {myRequests.map((request) => (
                  <tr key={request.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">
                      <div className="font-medium">{request.supplierName}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{request.productName}</div>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline">{request.requestType}</Badge>
                    </td>
                    <td className="p-4">
                      <Badge variant={getStatusBadgeVariant(request.status)}>
                        {request.status}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        Requested: {request.requestedQuantity}
                        {request.approvedQuantity && (
                          <div className="text-muted-foreground">
                            Approved: {request.approvedQuantity}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-muted-foreground">
                        {request.requestedAt?.toDate ? 
                          request.requestedAt.toDate().toLocaleDateString() : 
                          'N/A'
                        }
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex space-x-2">
                        {(request.status === 'New' || request.status === 'Awaiting Response') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancelRequest(request.id)}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteRequest(request.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {myRequests.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No requests found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [supplierProductSearchTerm, setSupplierProductSearchTerm] = useState('');

  const filteredSuppliers = suppliers.filter(supplier => {
    const name = supplier.displayName || supplier.name || '';
    const email = supplier.email || '';
    const searchLower = supplierSearchTerm.toLowerCase();
    return name.toLowerCase().includes(searchLower) || email.toLowerCase().includes(searchLower);
  });

  const getFilteredSupplierProducts = () => {
    if (!selectedSupplierForBrowse) return [];
    
    return products
      .filter(p => {
        // Try multiple matching strategies
        const matchesSupplier = p.supplierName === selectedSupplierForBrowse.name ||
                               p.supplierName === selectedSupplierForBrowse.displayName ||
                               p.supplierId === selectedSupplierForBrowse.id ||
                               (selectedSupplierForBrowse.email && p.supplierName.toLowerCase().includes(selectedSupplierForBrowse.email.split('@')[0].toLowerCase()));
        
        const matchesSearch = supplierProductSearchTerm === '' ||
                             p.name.toLowerCase().includes(supplierProductSearchTerm.toLowerCase()) ||
                             (p.description && p.description.toLowerCase().includes(supplierProductSearchTerm.toLowerCase())) ||
                             p.category.toLowerCase().includes(supplierProductSearchTerm.toLowerCase());
        
        return matchesSupplier && matchesSearch;
      });
  };

  const renderSuppliers = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Browse by Supplier</h2>
        <p className="text-sm text-muted-foreground">
          Select a supplier to view their profile and proposed products
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Suppliers List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Approved Suppliers</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Supplier Search */}
            <div className="relative mb-4">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search suppliers..."
                value={supplierSearchTerm}
                onChange={(e) => setSupplierSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <ScrollArea className="h-[350px]">
              <div className="space-y-2">
                {filteredSuppliers.length > 0 ? (
                  filteredSuppliers.map((supplier) => (
                    <Button
                      key={supplier.id}
                      variant={selectedSupplierForBrowse?.id === supplier.id ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => setSelectedSupplierForBrowse(supplier)}
                    >
                      <UserIcon className="h-4 w-4 mr-2" />
                      {supplier.name}
                    </Button>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No suppliers found</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Supplier Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedSupplierForBrowse ? selectedSupplierForBrowse.name : 'Select a Supplier'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedSupplierForBrowse ? (
              <div className="space-y-6">
                {/* Supplier Profile */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Supplier Profile</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Contact Email</Label>
                      <p className="text-sm">{selectedSupplierForBrowse.email}</p>
                    </div>
                    {selectedSupplierForBrowse.phone && (
                      <div>
                        <Label className="text-sm font-medium">Phone</Label>
                        <p className="text-sm">{selectedSupplierForBrowse.phone}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Proposed Products */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Proposed Products</h3>
                    <div className="relative w-64">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search products..."
                        value={supplierProductSearchTerm}
                        onChange={(e) => setSupplierProductSearchTerm(e.target.value)}
                        className="pl-8 h-9"
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {getFilteredSupplierProducts()
                      .map((product) => (
                        <Card key={product.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                  <div className="font-medium">{product.name}</div>
                                </div>
                                <div className="space-y-1 text-sm text-muted-foreground">
                                  <div>Category: {product.category}</div>
                                  <div className="font-semibold text-foreground">${product.price.toFixed(2)}</div>
                                  {product.description && (
                                    <div className="text-xs line-clamp-2">{product.description}</div>
                                  )}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setShowQuantityDialog(true);
                                }}
                                className="ml-2"
                              >
                                <ShoppingCart className="h-3 w-3 mr-1" />
                                Request
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    }
                  </div>
                  {getFilteredSupplierProducts().length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">
                        {supplierProductSearchTerm ? 'No products match your search' : 'No products proposed by this supplier yet'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Requests to this Supplier */}
                <div className="space-y-4">
                  <h3 className="font-semibold">My Requests to this Supplier</h3>
                  <div className="space-y-2">
                    {myRequests
                      .filter(r => {
                        // Try multiple matching strategies
                        return r.supplierName === selectedSupplierForBrowse.name ||
                               r.supplierName === selectedSupplierForBrowse.displayName ||
                               r.supplierId === selectedSupplierForBrowse.id ||
                               (selectedSupplierForBrowse.email && r.supplierName.toLowerCase().includes(selectedSupplierForBrowse.email.split('@')[0].toLowerCase()));
                      })
                      .map((request) => (
                        <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">{request.productName}</div>
                            <div className="text-sm text-muted-foreground">
                              Quantity: {request.requestedQuantity} • 
                              {request.requestedAt?.toDate ? 
                                request.requestedAt.toDate().toLocaleDateString() : 
                                'N/A'
                              }
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={getStatusBadgeVariant(request.status)}>
                              {request.status}
                            </Badge>
                            <div className="flex gap-1">
                              {(request.status === 'New' || request.status === 'Awaiting Response') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCancelRequest(request.id)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteRequest(request.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    }
                    {myRequests.filter(r => {
                      // Try multiple matching strategies
                      return r.supplierName === selectedSupplierForBrowse.name ||
                             r.supplierName === selectedSupplierForBrowse.displayName ||
                             r.supplierId === selectedSupplierForBrowse.id ||
                             (selectedSupplierForBrowse.email && r.supplierName.toLowerCase().includes(selectedSupplierForBrowse.email.split('@')[0].toLowerCase()));
                    }).length === 0 && (
                      <div className="text-center py-4 text-muted-foreground">
                        <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No requests to this supplier yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <UserIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a supplier to view their details and products</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading catalog requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      <NavigationHeader
        title="Product Management"
        description="Manage product catalog and supplier requests"
        currentSection={getCurrentSectionName()}
        sections={sections}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="pb-6">
          {activeSection === 'catalog' && renderCatalog()}
          {activeSection === 'requests' && renderRequests()}
          {activeSection === 'suppliers' && renderSuppliers()}
        </div>
      </div>

      {/* Quantity Request Dialog */}
      <Dialog open={showQuantityDialog} onOpenChange={setShowQuantityDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Quantity</DialogTitle>
            <DialogDescription>
              Request a specific quantity of {selectedProduct?.name} from {selectedProduct?.supplierName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantityRequestForm.quantity}
                onChange={(e) => setQuantityRequestForm(prev => ({
                  ...prev,
                  quantity: parseInt(e.target.value) || 1
                }))}
                placeholder="Enter quantity"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={quantityRequestForm.notes}
                onChange={(e) => setQuantityRequestForm(prev => ({
                  ...prev,
                  notes: e.target.value
                }))}
                placeholder="Add any additional notes..."
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowQuantityDialog(false);
                  setSelectedProduct(null);
                  setQuantityRequestForm({ quantity: 1, notes: '' });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRequestQuantity}
                disabled={submitting || quantityRequestForm.quantity <= 0}
              >
                {submitting ? 'Sending...' : 'Send Request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}