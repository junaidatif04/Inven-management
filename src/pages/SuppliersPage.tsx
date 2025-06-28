import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Plus, 
  Eye, 
  Edit, 
  Star,
  Phone,
  Mail,
  MapPin,
  Package,
  TrendingUp
} from 'lucide-react';

// Mock supplier data
const suppliers = [
  {
    id: 'SUP-001',
    name: 'TechCorp Industries',
    contact: 'John Smith',
    email: 'john@techcorp.com',
    phone: '+1 (555) 123-4567',
    address: '123 Tech Street, Silicon Valley, CA 94000',
    status: 'Active',
    rating: 4.8,
    productsCount: 45,
    totalOrders: 156,
    categories: ['Electronics', 'Accessories'],
    lastOrder: '2024-01-15'
  },
  {
    id: 'SUP-002',
    name: 'Office Supplies Co',
    contact: 'Sarah Johnson',
    email: 'sarah@officesupplies.com',
    phone: '+1 (555) 234-5678',
    address: '456 Office Ave, Business District, NY 10001',
    status: 'Active',
    rating: 4.5,
    productsCount: 78,
    totalOrders: 203,
    categories: ['Office Supplies', 'Accessories'],
    lastOrder: '2024-01-14'
  },
  {
    id: 'SUP-003',
    name: 'Furniture Plus',
    contact: 'Mike Davis',
    email: 'mike@furnitureplus.com',
    phone: '+1 (555) 345-6789',
    address: '789 Furniture Blvd, Design City, TX 75001',
    status: 'Pending',
    rating: 4.2,
    productsCount: 23,
    totalOrders: 67,
    categories: ['Furniture'],
    lastOrder: '2024-01-10'
  },
  {
    id: 'SUP-004',
    name: 'Cable Co',
    contact: 'Lisa Wilson',
    email: 'lisa@cableco.com',
    phone: '+1 (555) 456-7890',
    address: '321 Cable Lane, Wire Town, FL 33101',
    status: 'Inactive',
    rating: 3.9,
    productsCount: 12,
    totalOrders: 34,
    categories: ['Accessories'],
    lastOrder: '2024-01-05'
  }
];

// Mock product catalog for suppliers
const supplierProducts = [
  { id: 'PROD-001', name: 'Laptop Dell XPS 13', category: 'Electronics', price: 1299, stock: 25, supplierId: 'SUP-001' },
  { id: 'PROD-002', name: 'Wireless Mouse', category: 'Accessories', price: 49, stock: 150, supplierId: 'SUP-001' },
  { id: 'PROD-003', name: 'Office Chair Ergonomic', category: 'Furniture', price: 299, stock: 8, supplierId: 'SUP-003' },
  { id: 'PROD-004', name: 'Monitor 27" 4K', category: 'Electronics', price: 399, stock: 12, supplierId: 'SUP-001' },
];

export default function SuppliersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [newSupplierForm, setNewSupplierForm] = useState({
    name: '',
    contact: '',
    email: '',
    phone: '',
    address: '',
    categories: []
  });

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contact.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Active':
        return 'default';
      case 'Pending':
        return 'secondary';
      case 'Inactive':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  const getSupplierProducts = (supplierId: string) => {
    return supplierProducts.filter(product => product.supplierId === supplierId);
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supplier Management</h1>
          <p className="text-muted-foreground">
            Manage your supplier relationships and product catalogs
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <TrendingUp className="mr-2 h-4 w-4" />
            Analytics
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Supplier
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Supplier</DialogTitle>
                <DialogDescription>
                  Register a new supplier in the system
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input
                      placeholder="Enter company name"
                      value={newSupplierForm.name}
                      onChange={(e) => setNewSupplierForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Person</Label>
                    <Input
                      placeholder="Enter contact name"
                      value={newSupplierForm.contact}
                      onChange={(e) => setNewSupplierForm(prev => ({ ...prev, contact: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="Enter email address"
                      value={newSupplierForm.email}
                      onChange={(e) => setNewSupplierForm(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      placeholder="Enter phone number"
                      value={newSupplierForm.phone}
                      onChange={(e) => setNewSupplierForm(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Address</Label>
                  <Textarea
                    placeholder="Enter full address"
                    value={newSupplierForm.address}
                    onChange={(e) => setNewSupplierForm(prev => ({ ...prev, address: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Product Categories</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="electronics">Electronics</SelectItem>
                      <SelectItem value="furniture">Furniture</SelectItem>
                      <SelectItem value="office-supplies">Office Supplies</SelectItem>
                      <SelectItem value="accessories">Accessories</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full">
                  Add Supplier
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="space-y-6 pb-6">
          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search suppliers by name or contact..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </CardContent>
          </Card>

          {/* Suppliers Table */}
          <Card>
            <CardHeader>
              <CardTitle>Suppliers</CardTitle>
              <CardDescription>
                {filteredSuppliers.length} suppliers found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Categories</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{supplier.name}</p>
                          <p className="text-sm text-muted-foreground">{supplier.id}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{supplier.email}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{supplier.phone}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {supplier.categories.map((category, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {category}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <p className="font-bold">{supplier.productsCount}</p>
                          <p className="text-xs text-muted-foreground">products</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          {getRatingStars(supplier.rating)}
                          <span className="text-sm font-medium ml-1">{supplier.rating}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(supplier.status)}>
                          {supplier.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setSelectedSupplier(supplier)}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </DialogTrigger>
                            {selectedSupplier && (
                              <DialogContent className="max-w-4xl">
                                <DialogHeader>
                                  <DialogTitle>{selectedSupplier.name}</DialogTitle>
                                  <DialogDescription>
                                    Supplier details and product catalog
                                  </DialogDescription>
                                </DialogHeader>
                                
                                <Tabs defaultValue="details" className="w-full">
                                  <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="details">Details</TabsTrigger>
                                    <TabsTrigger value="products">Products</TabsTrigger>
                                    <TabsTrigger value="orders">Order History</TabsTrigger>
                                  </TabsList>
                                  
                                  <TabsContent value="details" className="space-y-4">
                                    <div className="grid grid-cols-2 gap-6">
                                      <Card>
                                        <CardHeader>
                                          <CardTitle className="text-lg">Contact Information</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                          <div className="flex items-center space-x-2">
                                            <Mail className="h-4 w-4 text-muted-foreground" />
                                            <span>{selectedSupplier.email}</span>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <Phone className="h-4 w-4 text-muted-foreground" />
                                            <span>{selectedSupplier.phone}</span>
                                          </div>
                                          <div className="flex items-start space-x-2">
                                            <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                                            <span className="text-sm">{selectedSupplier.address}</span>
                                          </div>
                                        </CardContent>
                                      </Card>
                                      
                                      <Card>
                                        <CardHeader>
                                          <CardTitle className="text-lg">Performance</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Rating:</span>
                                            <div className="flex items-center space-x-1">
                                              {getRatingStars(selectedSupplier.rating)}
                                              <span className="font-medium">{selectedSupplier.rating}</span>
                                            </div>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Total Orders:</span>
                                            <span className="font-medium">{selectedSupplier.totalOrders}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Products:</span>
                                            <span className="font-medium">{selectedSupplier.productsCount}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Last Order:</span>
                                            <span className="font-medium">{selectedSupplier.lastOrder}</span>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    </div>
                                  </TabsContent>
                                  
                                  <TabsContent value="products" className="space-y-4">
                                    <div className="space-y-4">
                                      {getSupplierProducts(selectedSupplier.id).map((product) => (
                                        <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                                          <div className="space-y-1">
                                            <p className="font-medium">{product.name}</p>
                                            <p className="text-sm text-muted-foreground">{product.category} • {product.id}</p>
                                            <p className="text-sm">Stock: {product.stock} units</p>
                                          </div>
                                          <div className="text-right">
                                            <p className="font-bold">${product.price}</p>
                                            <Button size="sm" variant="outline">
                                              <Edit className="h-3 w-3 mr-1" />
                                              Edit
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </TabsContent>
                                  
                                  <TabsContent value="orders" className="space-y-4">
                                    <div className="text-center py-8">
                                      <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                      <p className="text-muted-foreground">Order history will be displayed here</p>
                                    </div>
                                  </TabsContent>
                                </Tabs>
                              </DialogContent>
                            )}
                          </Dialog>
                          <Button size="sm" variant="outline">
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}