import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link } from 'react-router-dom';
import { 
  Package, 
  User,
  Search,
  Eye,
  ArrowRight
} from 'lucide-react';

// Mock data
const productCatalog = [
  { id: 'PROD-001', name: 'Laptop Dell XPS 13', category: 'Electronics', price: 1299, image: 'https://images.pexels.com/photos/205421/pexels-photo-205421.jpeg?auto=compress&cs=tinysrgb&w=200', inStock: true },
  { id: 'PROD-002', name: 'Wireless Mouse', category: 'Accessories', price: 49, image: 'https://images.pexels.com/photos/2115257/pexels-photo-2115257.jpeg?auto=compress&cs=tinysrgb&w=200', inStock: true },
  { id: 'PROD-003', name: 'Office Chair Ergonomic', category: 'Furniture', price: 299, image: 'https://images.pexels.com/photos/586996/pexels-photo-586996.jpeg?auto=compress&cs=tinysrgb&w=200', inStock: false },
  { id: 'PROD-004', name: 'Monitor 27" 4K', category: 'Electronics', price: 399, image: 'https://images.pexels.com/photos/777001/pexels-photo-777001.jpeg?auto=compress&cs=tinysrgb&w=200', inStock: true },
  { id: 'PROD-005', name: 'Desk Lamp LED', category: 'Office', price: 79, image: 'https://images.pexels.com/photos/1036936/pexels-photo-1036936.jpeg?auto=compress&cs=tinysrgb&w=200', inStock: true },
  { id: 'PROD-006', name: 'Keyboard Mechanical', category: 'Accessories', price: 129, image: 'https://images.pexels.com/photos/1772123/pexels-photo-1772123.jpeg?auto=compress&cs=tinysrgb&w=200', inStock: true },
];

export default function UserDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory] = useState('All');
  
  const filteredProducts = productCatalog.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome to IMPP</h1>
          <p className="text-muted-foreground">
            Browse products and request access to additional features
          </p>
        </div>
        <Link to="/dashboard/profile">
          <Button>
            <User className="mr-2 h-4 w-4" />
            My Profile
          </Button>
        </Link>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="space-y-6 pb-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Account Status</CardTitle>
                <User className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Basic User</div>
                <p className="text-xs text-muted-foreground">Limited access</p>
                <Link to="/dashboard/profile" className="text-blue-500 text-sm flex items-center mt-2">
                  Request additional access
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Access</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Limited</div>
                <p className="text-xs text-muted-foreground">Browse-only mode</p>
                <Link to="/dashboard/profile" className="text-blue-500 text-sm flex items-center mt-2">
                  View your profile
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Product Catalog Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Product Catalog</CardTitle>
              <CardDescription>
                Browse available products (view-only mode)
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
                
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-medium mb-2">Need to place orders?</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Request access to additional features to place orders and track your requests.
                  </p>
                  <Link to="/dashboard/profile">
                    <Button size="sm">
                      Request Access
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}