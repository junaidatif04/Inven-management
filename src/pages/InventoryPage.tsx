import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NavigationHeader } from '@/components/NavigationHeader';
import { 
  Search, 
  Edit, 
  Trash2, 
  Package, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  X,
  Image as ImageIcon,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { InventoryItem, CreateInventoryItem } from '@/types/inventory';
import {
  getAllInventoryItems,
  updateInventoryItem,
  deleteInventoryItem,
  getPublishedInventoryItems,
  unpublishInventoryItem,
  updateAllItemStatuses
} from '@/services/inventoryService';

import { getAllUsers } from '@/services/userService';
import { User } from '@/services/authService';
import InventoryImageUpload from '@/components/InventoryImageUpload';


export default function InventoryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [publishedItems, setPublishedItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeSection, setActiveSection] = useState('inventory');
  
  // Dialog states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDetailsDialogOpen, setIsEditDetailsDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  
  // Form states
  const [formData, setFormData] = useState<CreateInventoryItem>({
    name: '',
    description: '',
    sku: '',
    category: '',
    quantity: 0,
    minStockLevel: 0,
    maxStockLevel: 0,
    unitPrice: 0,
    supplier: '',
    location: '',
    imageUrl: '',
    imagePath: ''
  });
  
  // Curation form states
  const [curationData, setCurationData] = useState({
    salePrice: '',
    customerFacingDescription: '',
    visibilityTags: [] as string[]
  });
  const [newTag, setNewTag] = useState('');
  

  


  useEffect(() => {
    loadInventoryItems();
    loadPublishedItems();
    loadSuppliers();
  }, []);

  useEffect(() => {
    filterItems();
  }, [items, publishedItems, searchTerm, filterStatus, activeSection]);

  const loadInventoryItems = async () => {
    try {
      setLoading(true);
      // Update all item statuses first to ensure they're current
      await updateAllItemStatuses();
      const data = await getAllInventoryItems();
      setItems(data);
    } catch (error) {
      toast.error('Failed to load inventory items');
    } finally {
      setLoading(false);
    }
  };

  const loadPublishedItems = async () => {
    try {
      const data = await getPublishedInventoryItems();
      setPublishedItems(data);
    } catch (error) {
      toast.error('Failed to load published items');
    }
  };

  const loadSuppliers = async () => {
    try {
      console.log('Loading suppliers for inventory...');
      const users = await getAllUsers();
      console.log('All users:', users);
      console.log('Total users count:', users.length);
      
      // Log all user roles for debugging
      const roleCount = users.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('User roles breakdown:', roleCount);
      
      const supplierUsers = users.filter(user => user.role === 'supplier');
      console.log('Filtered supplier users:', supplierUsers);
      console.log('Supplier users count:', supplierUsers.length);
      
      if (supplierUsers.length === 0) {
        console.log('No supplier users found. Available users:', users.map(u => ({ name: u.name, email: u.email, role: u.role })));
      }
      
      setSuppliers(supplierUsers);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    }
  };

  const filterItems = () => {
    const sourceItems = activeSection === 'published-items' ? publishedItems : items;
    let filtered = sourceItems;
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(item => item.status === filterStatus);
    }
    
    setFilteredItems(filtered);
  };



  const handleEditItem = async () => {
    try {
      if (!user || !selectedItem) return;
      
      // Image uploads are now handled by the InventoryImageUpload component
      await updateInventoryItem({ id: selectedItem.id, ...formData }, user.id);
      toast.success('Item updated successfully');
      setIsEditDialogOpen(false);
      resetForm();
      loadInventoryItems();
      loadPublishedItems();
    } catch (error) {
      toast.error('Failed to update item');
    }
  };

  const handleDeleteItem = async () => {
    try {
      if (!selectedItem) return;
      
      await deleteInventoryItem(selectedItem.id);
      toast.success('Item deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedItem(null);
      loadInventoryItems();
      loadPublishedItems();
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };



  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      sku: '',
      category: '',
      quantity: 0,
      minStockLevel: 0,
      maxStockLevel: 0,
      unitPrice: 0,
      supplier: '',
      location: '',
      imageUrl: '',
      imagePath: ''
    });
  };

  const resetCurationForm = () => {
    setCurationData({
      salePrice: '',
      customerFacingDescription: '',
      visibilityTags: []
    });
    setNewTag('');
  };

  const openEditDetailsDialog = (item: InventoryItem) => {
    setSelectedItem(item);
    setCurationData({
      salePrice: item.salePrice?.toString() || item.unitPrice.toString(),
      customerFacingDescription: item.customerFacingDescription || '',
      visibilityTags: item.visibilityTags || []
    });
    setIsEditDetailsDialogOpen(true);
  };

  const canPublishItem = (item: InventoryItem) => {
    return item.detailsSaved && ((item.salePrice && item.salePrice > 0) || item.unitPrice > 0);
  };

  const handlePublishItem = async (item: InventoryItem) => {
    try {
      if (!user) return;
      await updateInventoryItem({ id: item.id, isPublished: true }, user.id);
      toast.success('Item published successfully');
      loadInventoryItems();
      loadPublishedItems();
    } catch (error) {
      toast.error('Failed to publish item');
    }
  };

  const handleUnpublishItem = async (item: InventoryItem) => {
    try {
      if (!user) return;
      await unpublishInventoryItem(item.id, user.id);
      toast.success('Item unpublished successfully');
      loadInventoryItems();
      loadPublishedItems();
    } catch (error) {
      toast.error('Failed to unpublish item');
    }
  };

  const handleSaveCurationDetails = async () => {
    try {
      if (!user || !selectedItem) return;

      let updateData: any = {
        id: selectedItem.id,
        salePrice: parseFloat(curationData.salePrice) || 0,
        customerFacingDescription: curationData.customerFacingDescription,
        visibilityTags: curationData.visibilityTags,
        detailsSaved: true
      };
      
      // Image updates are now handled by the InventoryImageUpload component

      await updateInventoryItem(updateData, user.id);
      
      // Refresh data lists
      await loadInventoryItems();
      await loadPublishedItems();
      
      // Update selectedItem with fresh data to reflect image changes in the dialog
      const updatedItems = activeSection === 'published-items' ? 
        await getPublishedInventoryItems() : 
        await getAllInventoryItems();
      const updatedItem = updatedItems.find(item => item.id === selectedItem.id);
      if (updatedItem) {
        setSelectedItem(updatedItem);
      }
      
      toast.success('Details saved successfully');
      resetCurationForm();
    } catch (error) {
      toast.error('Failed to save details');
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !curationData.visibilityTags.includes(newTag.trim())) {
      setCurationData(prev => ({
        ...prev,
        visibilityTags: [...prev.visibilityTags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setCurationData(prev => ({
      ...prev,
      visibilityTags: prev.visibilityTags.filter(tag => tag !== tagToRemove)
    }));
  };





  const openEditDialog = (item: InventoryItem) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      sku: item.sku,
      category: item.category,
      quantity: item.quantity,
      minStockLevel: item.minStockLevel,
      maxStockLevel: item.maxStockLevel,
      unitPrice: item.unitPrice,
      supplier: item.supplier,
      location: item.location,
      imageUrl: item.imageUrl || '',
      imagePath: item.imagePath || ''
    });
    setIsEditDialogOpen(true);
  };



  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_stock':
        return <Badge variant="default" className="bg-green-500">In Stock</Badge>;
      case 'low_stock':
        return <Badge variant="destructive">Low Stock</Badge>;
      case 'out_of_stock':
        return <Badge variant="secondary">Out of Stock</Badge>;
      case 'discontinued':
        return <Badge variant="outline">Discontinued</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Package className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading inventory...</p>
        </div>
      </div>
    );
  }

  const sections = [
     {
       id: 'inventory',
       name: 'Inventory Items',
       description: 'Manage unpublished inventory items'
     },
     {
       id: 'published-items',
       name: 'Published Items',
       description: 'View and manage published items'
     }
   ];

  const renderInventoryContent = () => {
    const currentItems = activeSection === 'published-items' ? publishedItems : items;
    const sectionTitle = activeSection === 'published-items' ? 'Published Items' : 'Inventory Items';
    const sectionDescription = activeSection === 'published-items' 
      ? 'View and manage your published inventory items'
      : 'Manage your inventory items and stock levels';

    return (
      <div className="space-y-6">

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{sectionTitle}</h2>
            <p className="text-slate-600 dark:text-slate-400 font-medium">{sectionDescription}</p>
          </div>
          {activeSection === 'inventory' && (
            <div className="text-right">
              <p className="text-sm text-slate-500 dark:text-slate-400">Items are automatically added when suppliers approve requests</p>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glass-card shadow-elegant hover:shadow-elegant-lg transition-all duration-200 border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">Total Items</CardTitle>
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <Package className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">{currentItems.length}</div>
            </CardContent>
          </Card>
          
          <Card className="glass-card shadow-elegant hover:shadow-elegant-lg transition-all duration-200 border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">In Stock</CardTitle>
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-500">
                {currentItems.filter(item => item.status === 'in_stock').length}
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card shadow-elegant hover:shadow-elegant-lg transition-all duration-200 border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">Low Stock</CardTitle>
              <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-500">
                {currentItems.filter(item => item.status === 'low_stock').length}
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card shadow-elegant hover:shadow-elegant-lg transition-all duration-200 border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">Out of Stock</CardTitle>
              <div className="p-2 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg">
                <TrendingDown className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 dark:text-red-500">
                {currentItems.filter(item => item.status === 'out_of_stock').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="glass-card shadow-elegant border-0">
          <CardHeader>
            <CardTitle className="text-slate-800 dark:text-slate-200">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                </div>
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48 h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="in_stock">In Stock</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  <SelectItem value="discontinued">Discontinued</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Content */}
        {activeSection === 'published-items' ? (
          /* Published Items - Card View */
          <div className="space-y-6">
            <Card className="glass-card shadow-elegant border-0">
              <CardHeader>
                <CardTitle className="text-slate-800 dark:text-slate-200">{sectionTitle}</CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  {sectionDescription}
                </CardDescription>
              </CardHeader>
            </Card>
            
            {filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-slate-800 dark:text-slate-200">No published items found</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  {currentItems.length === 0
                    ? "No published items yet."
                    : "Try adjusting your search or filter criteria."
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredItems.map((item) => (
                  <Card key={item.id} className="glass-card shadow-elegant hover:shadow-elegant-lg transition-all duration-200 border-0">
                    {/* Product Image */}
                    {(item.images && item.images.length > 0 ? item.images[0] : item.imageUrl) && (
                      <div className="aspect-square w-full overflow-hidden rounded-t-lg">
                        <img
                          src={item.images && item.images.length > 0 ? item.images[0] : item.imageUrl}
                          alt={item.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold line-clamp-2 text-slate-800 dark:text-slate-200">
                            {item.name}
                          </CardTitle>
                          <CardDescription className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            {item.supplier || item.supplierName || 'N/A'}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="ml-2 text-slate-700 dark:text-slate-300">
                          {item.category}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {(item.customerFacingDescription || item.description) && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">
                          {item.customerFacingDescription || item.description}
                        </p>
                      )}
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg font-bold text-green-600 dark:text-green-500">
                              ${(item.salePrice || item.unitPrice).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1 text-sm text-slate-500 dark:text-slate-400">
                            <Package className="h-4 w-4" />
                            <span>Stock: {item.quantity}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-400">SKU: {item.sku}</span>
                          {getStatusBadge(item.status)}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600"
                          onClick={() => openEditDetailsDialog(item)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-200 dark:hover:border-orange-800 hover:text-orange-600 dark:hover:text-orange-400"
                          onClick={() => handleUnpublishItem(item)}
                        >
                          Unpublish
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Inventory Items - Table View */
          <Card className="glass-card shadow-elegant border-0">
            <CardHeader>
              <CardTitle className="text-slate-800 dark:text-slate-200">{sectionTitle}</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                {sectionDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredItems.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-slate-800 dark:text-slate-200">No items found</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                    {currentItems.length === 0
                      ? "Get started by adding your first inventory item."
                      : "Try adjusting your search or filter criteria."
                    }
                  </p>
                  {currentItems.length === 0 && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                      Items will appear here when suppliers approve quantity requests
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-700/50">
                      <TableHead>Product Name</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Stock Qty</TableHead>
                      <TableHead>Published?</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <TableCell>
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-200">{item.name}</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">{item.description}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-slate-700 dark:text-slate-300">{item.sku}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.supplier || item.supplierName || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="text-center">
                            <div className="font-medium text-slate-800 dark:text-slate-200">{item.quantity}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              Min: {item.minStockLevel}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.isPublished ? "default" : "secondary"} className={item.isPublished ? "bg-green-500" : "bg-gray-500"}>
                            {item.isPublished ? "Yes" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell className="font-medium">${(item.salePrice || item.unitPrice).toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {!item.isPublished ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600"
                                  onClick={() => openEditDetailsDialog(item)}
                                >
                                  Edit Details
                                </Button>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700"
                                  disabled={!canPublishItem(item)}
                                  onClick={() => handlePublishItem(item)}
                                >
                                  Publish
                                </Button>
                              </>
                            ) : (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                Published
                              </Badge>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600"
                              onClick={() => openEditDialog(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800 hover:text-red-600 dark:hover:text-red-400"
                              onClick={() => {
                                setSelectedItem(item);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <NavigationHeader
        title="Inventory Management"
        description="Manage your inventory items and stock levels"
        sections={sections}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
      
      {renderInventoryContent()}



      {/* Edit Item Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Inventory Item</DialogTitle>
            <DialogDescription>
              Update the details of this inventory item.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Item Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter item name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-sku">SKU</Label>
              <Input
                id="edit-sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="Enter SKU"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter item description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Input
                id="edit-category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Enter category"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-supplier">Supplier</Label>
              <Select
                value={formData.supplier}
                onValueChange={(value) => setFormData({ ...formData, supplier: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={suppliers.length === 0 ? "No suppliers available" : "Select a supplier"} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.length === 0 ? (
                    <SelectItem value="no-suppliers" disabled>
                      No suppliers available
                    </SelectItem>
                  ) : (
                    suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.name}>
                        {supplier.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-unitPrice">Unit Price ($)</Label>
              <Input
                id="edit-unitPrice"
                type="number"
                step="0.01"
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-minStockLevel">Min Stock Level</Label>
              <Input
                id="edit-minStockLevel"
                type="number"
                value={formData.minStockLevel}
                onChange={(e) => setFormData({ ...formData, minStockLevel: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-maxStockLevel">Max Stock Level</Label>
              <Input
                id="edit-maxStockLevel"
                type="number"
                value={formData.maxStockLevel}
                onChange={(e) => setFormData({ ...formData, maxStockLevel: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="edit-location">Location</Label>
              <Input
                id="edit-location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Enter storage location"
              />
            </div>
            
            {/* Image Upload Section */}
            <div className="space-y-2 col-span-2">
              <Label>Item Image (Optional)</Label>
              <InventoryImageUpload
                currentImageUrl={formData.imageUrl}
                itemName={formData.name}
                itemId={selectedItem?.id}
                size="md"
                showUploadButton={true}
                onImageUpdate={(newImageUrl) => {
                  setFormData(prev => ({ ...prev, imageUrl: newImageUrl }));
                }}
                mode="update"
                useResumableUpload={true}
                userId={user?.id || ''}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditItem}>
              Update Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Item Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Inventory Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedItem?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteItem}>
              Delete Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Details Dialog */}
      <Dialog open={isEditDetailsDialogOpen} onOpenChange={setIsEditDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product Details</DialogTitle>
            <DialogDescription>
              Set customer-facing details for "{selectedItem?.name}" before publishing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Sale Price */}
            <div className="space-y-2">
              <Label htmlFor="sale-price" className="text-sm font-medium">
                Sale Price * <span className="text-red-500">(Required for publishing)</span>
              </Label>
              <Input
                id="sale-price"
                type="number"
                step="0.01"
                value={curationData.salePrice}
                onChange={(e) => setCurationData(prev => ({ ...prev, salePrice: e.target.value }))}
                placeholder="0.00"
                className="w-full"
              />
            </div>

            {/* Customer-Facing Description */}
            <div className="space-y-2">
              <Label htmlFor="customer-description" className="text-sm font-medium">
                Customer-Facing Description (Optional)
              </Label>
              <Textarea
                id="customer-description"
                value={curationData.customerFacingDescription}
                onChange={(e) => setCurationData(prev => ({ ...prev, customerFacingDescription: e.target.value }))}
                placeholder="Enter a customer-friendly description (leave empty to use default description)"
                rows={3}
                className="w-full"
              />
            </div>

            {/* Product Image */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Product Image (Optional)</Label>
              <div className="space-y-4">
                {/* Current Product Image */}
                {selectedItem?.imageUrl ? (
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Current Product Image</Label>
                    <div className="relative inline-block">
                      <img
                        src={selectedItem.imageUrl}
                        alt="Current product image"
                        className="w-32 h-32 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500">No current image</Label>
                    <div className="w-32 h-32 bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-slate-400" />
                    </div>
                  </div>
                )}
                
                {/* Update Image Section */}
                <div className="border-t pt-4">
                  <Label className="text-sm font-medium mb-2 block">Update Product Image</Label>
                  <p className="text-xs text-slate-500 mb-3">This will update the image for both inventory and published views</p>
                  <InventoryImageUpload
                    currentImageUrl={selectedItem?.imageUrl}
                    itemName={selectedItem?.name || ''}
                    itemId={selectedItem?.id}
                    size="lg"
                    showUploadButton={true}
                    onImageUpdate={(newImageUrl) => {
                      // Update the selected item's image URL for immediate UI feedback
                      if (selectedItem) {
                        setSelectedItem(prev => prev ? { ...prev, imageUrl: newImageUrl } : null);
                      }
                    }}
                    mode="update"
                    useResumableUpload={true}
                    userId={user?.id || ''}
                  />
                </div>
              </div>
            </div>

            {/* Visibility Tags */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Visibility Tags (Optional)</Label>
              <div className="space-y-3">
                {/* Existing Tags */}
                {curationData.visibilityTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {curationData.visibilityTags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-transparent"
                          onClick={() => handleRemoveTag(tag)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
                
                {/* Add New Tag */}
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Enter tag (e.g., Featured, On Sale, New)"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    className="flex-1"
                  />
                  <Button type="button" onClick={handleAddTag} variant="outline">
                    Add Tag
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsEditDetailsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCurationDetails}>
              Save Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
