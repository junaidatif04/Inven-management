import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Edit, 
  AlertTriangle,
  Package,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

// Mock inventory data
const inventoryData = [
  { 
    id: 'PROD-001', 
    name: 'Laptop Dell XPS 13', 
    sku: 'DELL-XPS13-001', 
    category: 'Electronics', 
    currentStock: 25, 
    threshold: 10, 
    price: 1299, 
    supplier: 'TechCorp Industries',
    image: 'https://images.pexels.com/photos/205421/pexels-photo-205421.jpeg?auto=compress&cs=tinysrgb&w=100',
    lastUpdated: '2024-01-15'
  },
  { 
    id: 'PROD-002', 
    name: 'Wireless Mouse', 
    sku: 'MOUSE-WRL-002', 
    category: 'Accessories', 
    currentStock: 150, 
    threshold: 25, 
    price: 49, 
    supplier: 'Office Supplies Co',
    image: 'https://images.pexels.com/photos/2115257/pexels-photo-2115257.jpeg?auto=compress&cs=tinysrgb&w=100',
    lastUpdated: '2024-01-14'
  },
  { 
    id: 'PROD-003', 
    name: 'Office Chair Ergonomic', 
    sku: 'CHAIR-ERG-003', 
    category: 'Furniture', 
    currentStock: 8, 
    threshold: 15, 
    price: 299, 
    supplier: 'Furniture Plus',
    image: 'https://images.pexels.com/photos/586996/pexels-photo-586996.jpeg?auto=compress&cs=tinysrgb&w=100',
    lastUpdated: '2024-01-13'
  },
  { 
    id: 'PROD-004', 
    name: 'Monitor 27" 4K', 
    sku: 'MON-4K27-004', 
    category: 'Electronics', 
    currentStock: 12, 
    threshold: 8, 
    price: 399, 
    supplier: 'TechCorp Industries',
    image: 'https://images.pexels.com/photos/777001/pexels-photo-777001.jpeg?auto=compress&cs=tinysrgb&w=100',
    lastUpdated: '2024-01-12'
  },
  { 
    id: 'PROD-005', 
    name: 'USB-C Cable 2m', 
    sku: 'CABLE-USBC-005', 
    category: 'Accessories', 
    currentStock: 5, 
    threshold: 25, 
    price: 19, 
    supplier: 'Cable Co',
    image: 'https://images.pexels.com/photos/1779487/pexels-photo-1779487.jpeg?auto=compress&cs=tinysrgb&w=100',
    lastUpdated: '2024-01-11'
  },
];

// Mock stock history data for charts
const stockHistoryData = [
  { date: '2024-01-01', stock: 30 },
  { date: '2024-01-05', stock: 28 },
  { date: '2024-01-10', stock: 25 },
  { date: '2024-01-15', stock: 25 },
];

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const categories = ['All', ...Array.from(new Set(inventoryData.map(item => item.category)))];
  
  const filteredInventory = inventoryData.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStockStatus = (currentStock: number, threshold: number) => {
    if (currentStock === 0) return { status: 'Out of Stock', variant: 'destructive' as const, icon: AlertTriangle };
    if (currentStock <= threshold) return { status: 'Low Stock', variant: 'secondary' as const, icon: AlertTriangle };
    return { status: 'In Stock', variant: 'default' as const, icon: Package };
  };

  const ProductDetailModal = ({ product }: { product: any }) => (
    <DialogContent className="max-w-4xl">
      <DialogHeader>
        <DialogTitle className="flex items-center space-x-2">
          <img src={product.image} alt={product.name} className="w-8 h-8 rounded" />
          <span>{product.name}</span>
        </DialogTitle>
        <DialogDescription>{product.sku}</DialogDescription>
      </DialogHeader>
      
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="stock-history">Stock History</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="supplier">Supplier</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Product ID:</span>
                  <span className="font-medium">{product.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SKU:</span>
                  <span className="font-medium">{product.sku}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category:</span>
                  <Badge>{product.category}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Updated:</span>
                  <span className="font-medium">{product.lastUpdated}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Stock Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Stock:</span>
                  <span className="font-bold text-lg">{product.currentStock}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Threshold:</span>
                  <span className="font-medium">{product.threshold}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={getStockStatus(product.currentStock, product.threshold).variant}>
                    {getStockStatus(product.currentStock, product.threshold).status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unit Price:</span>
                  <span className="font-bold">${product.price}</span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="flex space-x-2 pt-4">
            <Button onClick={() => setIsEditMode(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Product
            </Button>
            <Button variant="outline">
              <Package className="mr-2 h-4 w-4" />
              Reorder
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="stock-history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Level History</CardTitle>
              <CardDescription>Track stock changes over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stockHistoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="stock" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="pricing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pricing Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Unit Price</Label>
                  <Input value={`$${product.price}`} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Total Value</Label>
                  <Input value={`$${(product.price * product.currentStock).toLocaleString()}`} readOnly />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="supplier" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Supplier Name</Label>
                <Input value={product.supplier} readOnly />
              </div>
              <div className="space-y-2">
                <Label>Lead Time</Label>
                <Input value="5-7 business days" readOnly />
              </div>
              <div className="space-y-2">
                <Label>Minimum Order Quantity</Label>
                <Input value="10 units" readOnly />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DialogContent>
  );

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
          <p className="text-muted-foreground">
            Manage your product inventory and stock levels
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <TrendingUp className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="space-y-6 pb-6">
          {/* Search and Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  More Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Table */}
          <Card>
            <CardHeader>
              <CardTitle>Product Inventory</CardTitle>
              <CardDescription>
                {filteredInventory.length} products found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.map((item) => {
                    const stockStatus = getStockStatus(item.currentStock, item.threshold);
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <img 
                              src={item.image} 
                              alt={item.name} 
                              className="w-10 h-10 rounded object-cover"
                            />
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-sm text-muted-foreground">{item.supplier}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold">{item.currentStock}</span>
                            {item.currentStock <= item.threshold && (
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={stockStatus.variant}>
                            {stockStatus.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">${item.price}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => setSelectedProduct(item)}
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </DialogTrigger>
                              {selectedProduct && <ProductDetailModal product={selectedProduct} />}
                            </Dialog>
                            <Button size="sm" variant="outline">
                              <Edit className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}