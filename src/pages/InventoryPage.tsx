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
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Package, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Upload,
  X,
  Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { InventoryItem, CreateInventoryItem } from '@/types/inventory';
import {
  getAllInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  adjustStock
} from '@/services/inventoryService';
import { uploadImage, deleteImage } from '@/services/imageUploadService';

export default function InventoryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
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
  
  // Image upload states
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  
  const [stockAdjustment, setStockAdjustment] = useState({
    type: 'in' as 'in' | 'out' | 'adjustment',
    quantity: 0,
    reason: '',
    notes: ''
  });

  useEffect(() => {
    loadInventoryItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [items, searchTerm, filterStatus]);

  const loadInventoryItems = async () => {
    try {
      setLoading(true);
      const data = await getAllInventoryItems();
      setItems(data);
    } catch (error) {
      toast.error('Failed to load inventory items');
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = items;
    
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

  const handleCreateItem = async () => {
    try {
      if (!user) return;
      
      let finalFormData = { ...formData };
      
      // Upload image if selected
      if (selectedImage) {
        const uploadResult = await uploadImage(selectedImage, 'inventory');
        finalFormData.imageUrl = uploadResult.url;
        finalFormData.imagePath = uploadResult.path;
      }
      
      await createInventoryItem(finalFormData, user.id);
      toast.success('Item created successfully');
      setIsCreateDialogOpen(false);
      resetForm();
      loadInventoryItems();
    } catch (error) {
      toast.error('Failed to create item');
    }
  };

  const handleEditItem = async () => {
    try {
      if (!user || !selectedItem) return;
      
      let finalFormData = { ...formData };
      
      // Upload new image if selected
      if (selectedImage) {
        // Delete old image if exists
        if (formData.imagePath) {
          try {
            await deleteImage(formData.imagePath);
          } catch (error) {
            console.error('Failed to delete old image:', error);
          }
        }
        
        const uploadResult = await uploadImage(selectedImage, 'inventory');
        finalFormData.imageUrl = uploadResult.url;
        finalFormData.imagePath = uploadResult.path;
      }
      
      await updateInventoryItem({ id: selectedItem.id, ...finalFormData }, user.id);
      toast.success('Item updated successfully');
      setIsEditDialogOpen(false);
      resetForm();
      loadInventoryItems();
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
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  const handleStockAdjustment = async () => {
    try {
      if (!user || !selectedItem) return;
      
      await adjustStock(
        selectedItem.id,
        stockAdjustment.quantity,
        stockAdjustment.type,
        stockAdjustment.reason,
        user.id,
        stockAdjustment.notes
      );
      
      toast.success('Stock adjusted successfully');
      setIsStockDialogOpen(false);
      setStockAdjustment({ type: 'in', quantity: 0, reason: '', notes: '' });
      loadInventoryItems();
    } catch (error: any) {
      toast.error(error.message || 'Failed to adjust stock');
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
    setSelectedImage(null);
    setImagePreview('');
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
    setImagePreview(item.imageUrl || '');
    setSelectedImage(null);
    setIsEditDialogOpen(true);
  };

  const openStockDialog = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsStockDialogOpen(true);
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

  const handleRemoveImage = async () => {
    if (formData.imagePath) {
      try {
        await deleteImage(formData.imagePath);
        setFormData(prev => ({ ...prev, imageUrl: '', imagePath: '' }));
      } catch (error) {
        console.error('Failed to delete image:', error);
      }
    }
    setSelectedImage(null);
    setImagePreview('');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent">Inventory Management</h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Manage your inventory items and stock levels</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-elegant">
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
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
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">{items.length}</div>
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
              {items.filter(item => item.status === 'in_stock').length}
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
              {items.filter(item => item.status === 'low_stock').length}
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
              {items.filter(item => item.status === 'out_of_stock').length}
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

      {/* Inventory Table */}
      <Card className="glass-card shadow-elegant border-0">
        <CardHeader>
          <CardTitle className="text-slate-800 dark:text-slate-200">Inventory Items</CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-400">
            Manage your inventory items, stock levels, and pricing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-slate-800 dark:text-slate-200">No items found</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                {items.length === 0
                  ? "Get started by adding your first inventory item."
                  : "Try adjusting your search or filter criteria."
                }
              </p>
              {items.length === 0 && (
                <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-elegant">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Item
                </Button>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-700/50">
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <TableCell>
                      <div>
                        <div className="font-medium text-slate-800 dark:text-slate-200">{item.name}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">{item.description}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-slate-700 dark:text-slate-300">{item.sku}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>
                      <div className="text-center">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{item.quantity}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Min: {item.minStockLevel}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="font-medium">${item.unitPrice.toFixed(2)}</TableCell>
                    <TableCell>{item.supplier}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600"
                          onClick={() => openStockDialog(item)}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
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

      {/* Create Item Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Inventory Item</DialogTitle>
            <DialogDescription>
              Create a new inventory item with all necessary details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Item Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter item name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="Enter SKU"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter item description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Enter category"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="Enter supplier name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Initial Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitPrice">Unit Price ($)</Label>
              <Input
                id="unitPrice"
                type="number"
                step="0.01"
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minStockLevel">Min Stock Level</Label>
              <Input
                id="minStockLevel"
                type="number"
                value={formData.minStockLevel}
                onChange={(e) => setFormData({ ...formData, minStockLevel: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxStockLevel">Max Stock Level</Label>
              <Input
                id="maxStockLevel"
                type="number"
                value={formData.maxStockLevel}
                onChange={(e) => setFormData({ ...formData, maxStockLevel: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Enter storage location"
              />
            </div>
            
            {/* Image Upload Section */}
            <div className="space-y-2 col-span-2">
              <Label>Item Image (Optional)</Label>
              <div className="space-y-4">
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={handleRemoveImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center">
                    <ImageIcon className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Upload an image for this item</p>
                    <Upload className="h-4 w-4 inline mr-1" />
                    <label htmlFor="image-upload" className="text-blue-600 hover:text-blue-700 cursor-pointer text-sm font-medium">
                      Choose file
                    </label>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateItem}>
              Create Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <Input
                id="edit-supplier"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="Enter supplier name"
              />
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
              <div className="space-y-4">
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={handleRemoveImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center">
                    <ImageIcon className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Upload an image for this item</p>
                    <Upload className="h-4 w-4 inline mr-1" />
                    <label htmlFor="edit-image-upload" className="text-blue-600 hover:text-blue-700 cursor-pointer text-sm font-medium">
                      Choose file
                    </label>
                    <input
                      id="edit-image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </div>
                )}
              </div>
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

      {/* Stock Adjustment Dialog */}
      <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock - {selectedItem?.name}</DialogTitle>
            <DialogDescription>
              Current stock: {selectedItem?.quantity} units
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stock-type">Adjustment Type</Label>
              <Select
                value={stockAdjustment.type}
                onValueChange={(value: 'in' | 'out' | 'adjustment') =>
                  setStockAdjustment({ ...stockAdjustment, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Stock In (+)</SelectItem>
                  <SelectItem value="out">Stock Out (-)</SelectItem>
                  <SelectItem value="adjustment">Direct Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock-quantity">
                {stockAdjustment.type === 'adjustment' ? 'New Quantity' : 'Quantity'}
              </Label>
              <Input
                id="stock-quantity"
                type="number"
                value={stockAdjustment.quantity}
                onChange={(e) => setStockAdjustment({
                  ...stockAdjustment,
                  quantity: parseInt(e.target.value) || 0
                })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock-reason">Reason</Label>
              <Input
                id="stock-reason"
                value={stockAdjustment.reason}
                onChange={(e) => setStockAdjustment({
                  ...stockAdjustment,
                  reason: e.target.value
                })}
                placeholder="Enter reason for adjustment"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock-notes">Notes (Optional)</Label>
              <Textarea
                id="stock-notes"
                value={stockAdjustment.notes}
                onChange={(e) => setStockAdjustment({
                  ...stockAdjustment,
                  notes: e.target.value
                })}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStockDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStockAdjustment}>
              Adjust Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
