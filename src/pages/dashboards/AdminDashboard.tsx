import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Package, 
  AlertTriangle, 
  ShoppingCart, 
  Users, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Eye,
  Plus
} from 'lucide-react';

// Mock data for demonstration
const kpiData = {
  totalInventoryValue: 2485000,
  lowStockAlerts: 12,
  pendingRequests: 8,
  totalUsers: 45,
  monthlyGrowth: 15.2,
  activeSuppliers: 23
};

const lowStockItems = [
  { name: 'Laptop Dell XPS 13', currentStock: 5, threshold: 10, category: 'Electronics' },
  { name: 'Office Chair Ergonomic', currentStock: 2, threshold: 15, category: 'Furniture' },
  { name: 'USB-C Cable 2m', currentStock: 8, threshold: 25, category: 'Accessories' },
  { name: 'Wireless Mouse', currentStock: 3, threshold: 20, category: 'Accessories' },
];

const pendingRequests = [
  { id: 'REQ-001', user: 'Alice Johnson', department: 'IT', items: 3, priority: 'High', createdAt: '2024-01-15' },
  { id: 'REQ-002', user: 'Bob Smith', department: 'Marketing', items: 1, priority: 'Medium', createdAt: '2024-01-15' },
  { id: 'REQ-003', user: 'Carol Davis', department: 'HR', items: 5, priority: 'Low', createdAt: '2024-01-14' },
];

const systemLogs = [
  { timestamp: '2024-01-15 14:30', action: 'User login', user: 'john.admin@company.com', status: 'Success' },
  { timestamp: '2024-01-15 14:25', action: 'Inventory update', user: 'jane.warehouse@company.com', status: 'Success' },
  { timestamp: '2024-01-15 14:20', action: 'Order approval', user: 'john.admin@company.com', status: 'Success' },
  { timestamp: '2024-01-15 14:15', action: 'Failed login attempt', user: 'unknown@company.com', status: 'Failed' },
];

export default function AdminDashboard() {
  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'destructive';
      case 'Medium':
        return 'default';
      case 'Low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your inventory management system
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Quick Actions
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="space-y-6 pb-6">
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Inventory Value
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${kpiData.totalInventoryValue.toLocaleString()}
                </div>
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-green-500">+{kpiData.monthlyGrowth}%</span>
                  <span>from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Low Stock Alerts
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {kpiData.lowStockAlerts}
                </div>
                <p className="text-xs text-muted-foreground">
                  Items need restocking
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Requests
                </CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {kpiData.pendingRequests}
                </div>
                <p className="text-xs text-muted-foreground">
                  Awaiting approval
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Users
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {kpiData.totalUsers}
                </div>
                <p className="text-xs text-muted-foreground">
                  {kpiData.activeSuppliers} suppliers
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Low Stock Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <span>Low Stock Alerts</span>
                </CardTitle>
                <CardDescription>
                  Items that need immediate attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-4">
                    {lowStockItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="space-y-1">
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.category}</p>
                          <div className="flex items-center space-x-2">
                            <Progress 
                              value={(item.currentStock / item.threshold) * 100} 
                              className="w-20 h-2"
                            />
                            <span className="text-xs">
                              {item.currentStock}/{item.threshold}
                            </span>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Pending Requests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ShoppingCart className="h-5 w-5" />
                  <span>Pending Requests</span>
                </CardTitle>
                <CardDescription>
                  Orders awaiting your approval
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-4">
                    {pendingRequests.map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-sm">{request.id}</p>
                            <Badge variant={getPriorityBadgeVariant(request.priority)}>
                              {request.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {request.user} • {request.department}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {request.items} items • {request.createdAt}
                          </p>
                        </div>
                        <div className="flex space-x-1">
                          <Button size="sm" variant="outline">
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* User Management & System Logs */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>User Management</span>
                </CardTitle>
                <CardDescription>
                  Manage system users and permissions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{kpiData.totalUsers}</div>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{kpiData.activeSuppliers}</div>
                    <p className="text-sm text-muted-foreground">Suppliers</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button className="flex-1">
                    <Plus className="mr-2 h-4 w-4" />
                    Add User
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Eye className="mr-2 h-4 w-4" />
                    View All
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>System Logs</span>
                </CardTitle>
                <CardDescription>
                  Recent system activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {systemLogs.map((log, index) => (
                      <div key={index} className="flex items-center justify-between p-2 text-sm border-b">
                        <div className="space-y-1">
                          <p className="font-medium">{log.action}</p>
                          <p className="text-xs text-muted-foreground">{log.user}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <Badge variant={log.status === 'Success' ? 'default' : 'destructive'}>
                            {log.status}
                          </Badge>
                          <p className="text-xs text-muted-foreground">{log.timestamp}</p>
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