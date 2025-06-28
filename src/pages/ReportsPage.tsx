import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { 
  CalendarIcon, 
  Download, 
  FileText, 
  TrendingUp, 
  Package,
  DollarSign,
  ShoppingCart,
  Users
} from 'lucide-react';
import { format, subDays, subMonths } from 'date-fns';

// Mock data for charts
const inventoryValueData = [
  { month: 'Jan', value: 2200000 },
  { month: 'Feb', value: 2350000 },
  { month: 'Mar', value: 2180000 },
  { month: 'Apr', value: 2420000 },
  { month: 'May', value: 2485000 },
];

const stockMovementData = [
  { date: '2024-01-01', stockIn: 150, stockOut: 120 },
  { date: '2024-01-02', stockIn: 200, stockOut: 180 },
  { date: '2024-01-03', stockIn: 180, stockOut: 160 },
  { date: '2024-01-04', stockIn: 220, stockOut: 200 },
  { date: '2024-01-05', stockIn: 190, stockOut: 170 },
];

const categoryDistribution = [
  { name: 'Electronics', value: 45, color: '#3b82f6' },
  { name: 'Furniture', value: 25, color: '#10b981' },
  { name: 'Office Supplies', value: 20, color: '#f59e0b' },
  { name: 'Accessories', value: 10, color: '#ef4444' },
];

const orderSummaryData = [
  { month: 'Jan', orders: 45, fulfilled: 42, pending: 3 },
  { month: 'Feb', orders: 52, fulfilled: 48, pending: 4 },
  { month: 'Mar', orders: 38, fulfilled: 35, pending: 3 },
  { month: 'Apr', orders: 61, fulfilled: 58, pending: 3 },
  { month: 'May', orders: 48, fulfilled: 45, pending: 3 },
];

const topProducts = [
  { name: 'Laptop Dell XPS 13', orders: 25, revenue: 32475 },
  { name: 'Wireless Mouse', orders: 48, revenue: 2352 },
  { name: 'Monitor 27" 4K', orders: 18, revenue: 7182 },
  { name: 'Office Chair Ergonomic', orders: 12, revenue: 3588 },
  { name: 'USB-C Cable 2m', orders: 35, revenue: 665 },
];

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState('inventory-valuation');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subMonths(new Date(), 3),
    to: new Date()
  });
  const [datePreset, setDatePreset] = useState('last-3-months');

  const handleDatePreset = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    switch (preset) {
      case 'last-7-days':
        setDateRange({ from: subDays(now, 7), to: now });
        break;
      case 'last-30-days':
        setDateRange({ from: subDays(now, 30), to: now });
        break;
      case 'last-3-months':
        setDateRange({ from: subMonths(now, 3), to: now });
        break;
      case 'last-6-months':
        setDateRange({ from: subMonths(now, 6), to: now });
        break;
      case 'last-year':
        setDateRange({ from: subMonths(now, 12), to: now });
        break;
    }
  };

  const exportReport = (format: 'csv' | 'pdf') => {
    // Mock export functionality
    const fileName = `${selectedReport}-${format.toUpperCase()}-${format(new Date(), 'yyyy-MM-dd')}`;
    console.log(`Exporting ${fileName}`);
    // In a real app, this would trigger the actual export
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Generate insights from your inventory and order data
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => exportReport('csv')}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => exportReport('pdf')}>
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="space-y-6 pb-6">
          {/* Report Controls */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Report Type</label>
                  <Select value={selectedReport} onValueChange={setSelectedReport}>
                    <SelectTrigger className="w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inventory-valuation">Inventory Valuation</SelectItem>
                      <SelectItem value="stock-movement">Stock Movement</SelectItem>
                      <SelectItem value="order-summary">Order Summary</SelectItem>
                      <SelectItem value="supplier-performance">Supplier Performance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Range</label>
                  <Select value={datePreset} onValueChange={handleDatePreset}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="last-7-days">Last 7 days</SelectItem>
                      <SelectItem value="last-30-days">Last 30 days</SelectItem>
                      <SelectItem value="last-3-months">Last 3 months</SelectItem>
                      <SelectItem value="last-6-months">Last 6 months</SelectItem>
                      <SelectItem value="last-year">Last year</SelectItem>
                      <SelectItem value="custom">Custom range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {datePreset === 'custom' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Custom Range</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-64 justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange.from && dateRange.to
                            ? `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd, yyyy')}`
                            : 'Select date range'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="range"
                          selected={{ from: dateRange.from, to: dateRange.to }}
                          onSelect={(range) => {
                            if (range?.from && range?.to) {
                              setDateRange({ from: range.from, to: range.to });
                            }
                          }}
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Report Content */}
          <Tabs value={selectedReport} onValueChange={setSelectedReport}>
            <TabsContent value="inventory-valuation" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">$2,485,000</div>
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      <span className="text-green-500">+12.5%</span>
                      <span>from last month</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">1,247</div>
                    <p className="text-xs text-muted-foreground">Across all categories</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Categories</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">4</div>
                    <p className="text-xs text-muted-foreground">Product categories</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg. Value</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">$1,992</div>
                    <p className="text-xs text-muted-foreground">Per item</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Inventory Value Trend</CardTitle>
                    <CardDescription>Monthly inventory valuation over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={inventoryValueData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} />
                        <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Value']} />
                        <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Category Distribution</CardTitle>
                    <CardDescription>Inventory value by category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={categoryDistribution}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}%`}
                        >
                          {categoryDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="stock-movement" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Stock Movement Analysis</CardTitle>
                  <CardDescription>Daily stock in vs stock out movements</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={stockMovementData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="stockIn" fill="#10b981" name="Stock In" />
                      <Bar dataKey="stockOut" fill="#ef4444" name="Stock Out" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Moving Products</CardTitle>
                  <CardDescription>Products with highest stock movement</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topProducts.map((product, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="space-y-1">
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">{product.orders} orders</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">${product.revenue.toLocaleString()}</p>
                          <Badge variant="outline">{index + 1}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="order-summary" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">244</div>
                    <p className="text-xs text-muted-foreground">Last 5 months</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Fulfilled</CardTitle>
                    <Package className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">228</div>
                    <p className="text-xs text-muted-foreground">93.4% fulfillment rate</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending</CardTitle>
                    <Package className="h-4 w-4 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">16</div>
                    <p className="text-xs text-muted-foreground">6.6% pending</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg. Processing</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">2.3</div>
                    <p className="text-xs text-muted-foreground">Days to fulfill</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Order Trends</CardTitle>
                  <CardDescription>Monthly order volume and fulfillment</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={orderSummaryData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="orders" stroke="#3b82f6" name="Total Orders" />
                      <Line type="monotone" dataKey="fulfilled" stroke="#10b981" name="Fulfilled" />
                      <Line type="monotone" dataKey="pending" stroke="#f59e0b" name="Pending" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="supplier-performance" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Suppliers</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">23</div>
                    <p className="text-xs text-muted-foreground">Registered suppliers</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg. Rating</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">4.3</div>
                    <p className="text-xs text-muted-foreground">Out of 5.0</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">On-Time Delivery</CardTitle>
                    <Package className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">87%</div>
                    <p className="text-xs text-muted-foreground">Average across all suppliers</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">$1.2M</div>
                    <p className="text-xs text-muted-foreground">This year</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Supplier Performance</CardTitle>
                  <CardDescription>Top performing suppliers by rating and delivery</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { name: 'TechCorp Industries', rating: 4.8, onTime: 95, orders: 156 },
                      { name: 'Office Supplies Co', rating: 4.5, onTime: 89, orders: 203 },
                      { name: 'Furniture Plus', rating: 4.2, onTime: 82, orders: 67 },
                      { name: 'Cable Co', rating: 3.9, onTime: 78, orders: 34 },
                    ].map((supplier, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <p className="font-medium">{supplier.name}</p>
                          <p className="text-sm text-muted-foreground">{supplier.orders} orders</p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-center">
                            <p className="font-bold">{supplier.rating}</p>
                            <p className="text-xs text-muted-foreground">Rating</p>
                          </div>
                          <div className="text-center">
                            <p className="font-bold">{supplier.onTime}%</p>
                            <p className="text-xs text-muted-foreground">On-time</p>
                          </div>
                          <Badge variant={supplier.rating >= 4.5 ? 'default' : supplier.rating >= 4.0 ? 'secondary' : 'destructive'}>
                            {supplier.rating >= 4.5 ? 'Excellent' : supplier.rating >= 4.0 ? 'Good' : 'Needs Improvement'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}