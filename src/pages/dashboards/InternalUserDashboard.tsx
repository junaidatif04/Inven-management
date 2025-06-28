import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  ShoppingCart, 
  Package, 
  Clock,
  CheckCircle,
  Search,
  Plus,
  Eye,
  Filter
} from 'lucide-react';

// Mock data
const userStats = {
  activeRequests: 5,
  pendingApproval: 2,
  completedOrders: 23,
  totalSpent: 8750
};

const productCatalog = [
  { id: 'PROD-001', name: 'Laptop Dell XPS 13', category: 'Electronics', price: 1299, image: 'https://images.pexels.com/photos/205421/pexels-photo-205421.jpeg?auto=compress&cs=tinysrgb&w=200', inStock: true },
  { id: 'PROD-002', name: 'Wireless Mouse', category: 'Accessories', price: 49, image: 'https://images.pexels.com/photos/2115257/pexels-photo-2115257.jpeg?auto=compress&cs=tinysrgb&w=200', inStock: true },
  { id: 'PROD-003', name: 'Office Chair Ergonomic', category: 'Furniture', price: 299, image: 'https://images.pexels.com/photos/586996/pexels-photo-586996.jpeg?auto=compress&cs=tinysrgb&w=200', inStock: false },
  { id: 'PROD-004', name: 'Monitor 27" 4K', category: 'Electronics', price: 399, image: 'https://images.pexels.com/photos/777001/pexels-photo-777001.jpeg?auto=compress&cs=tinysrgb&w=200', inStock: true },
  { id: 'PROD-005', name: 'Desk Lamp LED', category: 'Office', price: 79, image: 'https://images.pexels.com/photos/1036936/pexels-photo-1036936.jpeg?auto=compress&cs=tinysrgb&w=200', inStock: true },
  { id: 'PROD-006', name: 'Keyboard Mechanical', category: 'Accessories', price: 129, image: 'https://images.pexels.com/photos/1772123/pexels-photo-1772123.jpeg?auto=compress&cs=tinysrgb&w=200', inStock: true },
];

const myRequests = [
  { id: 'REQ-001', items: [{ name: 'Laptop Dell XPS 13', quantity: 1 }], status: 'Approved', total: 1299, requestDate: '2024-01-10', progress: 75 },
  { id: 'REQ-002', items: [{ name: 'Wireless Mouse', quantity: 2 }], status: 'Pending', total: 98, requestDate: '2024-01-12', progress: 25 },
  { id: 'REQ-003', items: [{ name: 'Monitor 27" 4K', quantity: 1 }], status: 'Fulfilled', total: 399, requestDate: '2024-01-08', progress: 100 },
  { id: 'REQ-004', items: [{ name: 'Desk Lamp LED', quantity: 1 }], status: 'Rejected', total: 79, requestDate: '2024-01-05', progress: 0 },
];

export default function InternalUserDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', ...Array.from(new Set(productCatalog.map(p => p.category)))];
  
  const filteredProducts = productCatalog.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'default';
      case 'Fulfilled':
        return 'default';
      case 'Pending':
        return 'secondary';
      case 'Rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Fulfilled':
        return <Package className="h-4 w-4 text-blue-500" />;
      case 'Pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Dashboard</h1>
          <p className="text-muted-foreground">
            Browse products and track your requests
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Create New Request</DialogTitle>
              <DialogDescription>
                Select items from the catalog to create a new request
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                </Button>
              </div>
              <ScrollArea className="h-[400px]">
                <div className="grid grid-cols-2 gap-4">
                  {filteredProducts.map((product) => (
                    <div key={product.id} className="border rounded-lg p-4 space-y-3">
                      <img 
                        src={product.image} 
                        alt={product.name} 
                        className="w-full h-32 object-cover rounded"
                      />
                      <div>
                        <h3 className="font-medium text-sm">{product.name}</h3>
                        <p className="text-xs text-muted-foreground">{product.category}</p>
                        <p className="text-sm font-bold">${product.price}</p>
                      </div>
                      <Button size="sm" className="w-full" disabled={!product.inStock}>
                        {product.inStock ? 'Add to Request' : 'Out of Stock'}
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="space-y-6 pb-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Requests</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.activeRequests}</div>
                <p className="text-xs text-muted-foreground">In progress</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{userStats.pendingApproval}</div>
                <p className="text-xs text-muted-foreground">Awaiting review</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.completedOrders}</div>
                <p className="text-xs text-muted-foreground">This year</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${userStats.totalSpent.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">This year</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Product Catalog Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Product Catalog</CardTitle>
                <CardDescription>
                  Browse available products
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  
                  <ScrollArea className="h-[350px]">
                    <div className="grid grid-cols-1 gap-3">
                      {filteredProducts.slice(0, 6).map((product) => (
                        <div key={product.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                          <img 
                            src={product.image} 
                            alt={product.name} 
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm truncate">{product.name}</h3>
                            <p className="text-xs text-muted-foreground">{product.category}</p>
                            <p className="text-sm font-bold">${product.price}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={product.inStock ? 'default' : 'secondary'}>
                              {product.inStock ? 'In Stock' : 'Out of Stock'}
                            </Badge>
                            <Button size="sm" variant="outline">
                              <Eye className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  
                  <Button variant="outline" className="w-full">
                    View Full Catalog
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Request Status Tracker */}
            <Card>
              <CardHeader>
                <CardTitle>My Requests</CardTitle>
                <CardDescription>
                  Track the status of your requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {myRequests.map((request) => (
                      <div key={request.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-sm">{request.id}</p>
                            <Badge variant={getStatusBadgeVariant(request.status)}>
                              {request.status}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium">${request.total}</p>
                        </div>
                        
                        <div className="space-y-1">
                          {request.items.map((item, index) => (
                            <p key={index} className="text-xs text-muted-foreground">
                              {item.name} × {item.quantity}
                            </p>
                          ))}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{request.progress}%</span>
                          </div>
                          <Progress value={request.progress} className="h-2" />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            Requested: {request.requestDate}
                          </span>
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3 mr-1" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}