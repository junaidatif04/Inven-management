import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Progress } from '@/components/ui/progress';
import { NavigationHeader } from '@/components/NavigationHeader';
import {
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Truck,
  User,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

// Mock order data
const orders = [
  {
    id: 'REQ-001',
    user: 'Alice Johnson',
    department: 'IT',
    status: 'Pending Approval',
    priority: 'High',
    items: [
      { name: 'Laptop Dell XPS 13', quantity: 2, price: 1299 },
      { name: 'Wireless Mouse', quantity: 2, price: 49 }
    ],
    total: 2696,
    requestDate: '2024-01-15',
    justification: 'New team members need laptops for development work',
    location: 'Building A, Floor 3',
    progress: 25
  },
  {
    id: 'REQ-002',
    user: 'Bob Smith',
    department: 'Marketing',
    status: 'Approved',
    priority: 'Medium',
    items: [
      { name: 'Monitor 27" 4K', quantity: 1, price: 399 }
    ],
    total: 399,
    requestDate: '2024-01-14',
    justification: 'Need additional monitor for design work',
    location: 'Building B, Floor 2',
    progress: 50
  },
  {
    id: 'REQ-003',
    user: 'Carol Davis',
    department: 'HR',
    status: 'Fulfilled',
    priority: 'Low',
    items: [
      { name: 'Office Chair Ergonomic', quantity: 3, price: 299 }
    ],
    total: 897,
    requestDate: '2024-01-12',
    justification: 'Replacement chairs for conference room',
    location: 'Building A, Floor 1',
    progress: 100
  },
  {
    id: 'REQ-004',
    user: 'David Wilson',
    department: 'Finance',
    status: 'In Fulfillment',
    priority: 'Medium',
    items: [
      { name: 'Desk Lamp LED', quantity: 5, price: 79 }
    ],
    total: 395,
    requestDate: '2024-01-10',
    justification: 'Better lighting for accounting team',
    location: 'Building C, Floor 1',
    progress: 75
  }
];

const sections = [
  { id: 'all', name: 'All Orders' },
  { id: 'pending', name: 'Pending Approval' },
  { id: 'approved', name: 'Approved' },
  { id: 'fulfilled', name: 'Fulfilled' }
];

export default function OrdersPage() {
  const [activeSection, setActiveSection] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [newRequestForm, setNewRequestForm] = useState({
    items: [{ productId: '', quantity: 1 }],
    location: '',
    justification: '',
    priority: 'Medium'
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Approved':
      case 'Fulfilled':
        return 'default';
      case 'Pending Approval':
        return 'secondary';
      case 'In Fulfillment':
        return 'default';
      case 'Rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Fulfilled':
        return <Package className="h-4 w-4 text-blue-500" />;
      case 'Pending Approval':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'In Fulfillment':
        return <Truck className="h-4 w-4 text-purple-500" />;
      case 'Rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleApproveOrder = (orderId: string) => {
    toast.success(`Order ${orderId} approved`);
  };

  const handleRejectOrder = (orderId: string) => {
    toast.error(`Order ${orderId} rejected`);
  };

  const handleCreateRequest = () => {
    if (!newRequestForm.location || !newRequestForm.justification) {
      toast.error('Please fill in all required fields');
      return;
    }
    toast.success('Request created successfully');
    setNewRequestForm({
      items: [{ productId: '', quantity: 1 }],
      location: '',
      justification: '',
      priority: 'Medium'
    });
  };

  const addRequestItem = () => {
    setNewRequestForm(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', quantity: 1 }]
    }));
  };

  const filteredOrders = activeSection === 'all' 
    ? orders 
    : orders.filter(order => {
        switch (activeSection) {
          case 'pending':
            return order.status === 'Pending Approval';
          case 'approved':
            return order.status === 'Approved';
          case 'fulfilled':
            return order.status === 'Fulfilled';
          default:
            return true;
        }
      });

  const getCurrentSectionName = () => {
    return sections.find(s => s.id === activeSection)?.name || '';
  };

  const renderOrders = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Order Management</h2>
          <p className="text-sm text-muted-foreground">
            {filteredOrders.length} orders in {getCurrentSectionName()}
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Request</DialogTitle>
              <DialogDescription>
                Submit a new purchase request for approval
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-4">
                <Label>Items</Label>
                {newRequestForm.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="laptop">Laptop Dell XPS 13</SelectItem>
                          <SelectItem value="mouse">Wireless Mouse</SelectItem>
                          <SelectItem value="monitor">Monitor 27" 4K</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      type="number"
                      placeholder="Qty"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...newRequestForm.items];
                        newItems[index].quantity = parseInt(e.target.value) || 1;
                        setNewRequestForm(prev => ({ ...prev, items: newItems }));
                      }}
                    />
                  </div>
                ))}
                <Button variant="outline" onClick={addRequestItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    placeholder="Building, Floor, Room"
                    value={newRequestForm.location}
                    onChange={(e) => setNewRequestForm(prev => ({ ...prev, location: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={newRequestForm.priority} onValueChange={(value) => setNewRequestForm(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Justification</Label>
                <Textarea
                  placeholder="Explain why these items are needed..."
                  value={newRequestForm.justification}
                  onChange={(e) => setNewRequestForm(prev => ({ ...prev, justification: e.target.value }))}
                />
              </div>

              <Button onClick={handleCreateRequest} className="w-full">
                Submit Request
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Orders List */}
      <div className="grid gap-4">
        {filteredOrders.map((order) => (
          <Card key={order.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(order.status)}
                      <h3 className="font-semibold">{order.id}</h3>
                    </div>
                    <Badge variant={getStatusBadgeVariant(order.status)}>
                      {order.status}
                    </Badge>
                    <Badge variant={getPriorityBadgeVariant(order.priority)}>
                      {order.priority}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{order.user}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>{order.department}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{order.requestDate}</span>
                    </div>
                    <div className="font-semibold">
                      ${order.total.toLocaleString()}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{order.progress}%</span>
                    </div>
                    <Progress value={order.progress} className="h-2" />
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <p><strong>Items:</strong> {order.items.map(item => `${item.name} (${item.quantity})`).join(', ')}</p>
                    <p><strong>Location:</strong> {order.location}</p>
                  </div>
                </div>

                <div className="flex flex-col space-y-2 ml-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </DialogTrigger>
                    {selectedOrder && (
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Order Details - {selectedOrder.id}</DialogTitle>
                          <DialogDescription>
                            Complete order information and timeline
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-medium mb-2">Request Information</h4>
                              <div className="space-y-2 text-sm">
                                <p><strong>Requester:</strong> {selectedOrder.user}</p>
                                <p><strong>Department:</strong> {selectedOrder.department}</p>
                                <p><strong>Date:</strong> {selectedOrder.requestDate}</p>
                                <p><strong>Location:</strong> {selectedOrder.location}</p>
                                <p><strong>Priority:</strong> 
                                  <Badge variant={getPriorityBadgeVariant(selectedOrder.priority)} className="ml-2">
                                    {selectedOrder.priority}
                                  </Badge>
                                </p>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-medium mb-2">Order Status</h4>
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  {getStatusIcon(selectedOrder.status)}
                                  <Badge variant={getStatusBadgeVariant(selectedOrder.status)}>
                                    {selectedOrder.status}
                                  </Badge>
                                </div>
                                <div className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span>Progress</span>
                                    <span>{selectedOrder.progress}%</span>
                                  </div>
                                  <Progress value={selectedOrder.progress} className="h-2" />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">Items Requested</h4>
                            <div className="border rounded-lg">
                              {selectedOrder.items.map((item: any, index: number) => (
                                <div key={index} className="flex justify-between items-center p-3 border-b last:border-b-0">
                                  <div>
                                    <p className="font-medium">{item.name}</p>
                                    <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-medium">${(item.price * item.quantity).toLocaleString()}</p>
                                    <p className="text-sm text-muted-foreground">${item.price} each</p>
                                  </div>
                                </div>
                              ))}
                              <div className="p-3 bg-muted/50">
                                <div className="flex justify-between font-semibold">
                                  <span>Total</span>
                                  <span>${selectedOrder.total.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">Justification</h4>
                            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                              {selectedOrder.justification}
                            </p>
                          </div>

                          {selectedOrder.status === 'Pending Approval' && (
                            <div className="flex space-x-2">
                              <Button 
                                onClick={() => handleApproveOrder(selectedOrder.id)}
                                className="flex-1"
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Approve
                              </Button>
                              <Button 
                                variant="destructive"
                                onClick={() => handleRejectOrder(selectedOrder.id)}
                                className="flex-1"
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    )}
                  </Dialog>

                  {order.status === 'Pending Approval' && (
                    <div className="flex space-x-1">
                      <Button 
                        size="sm" 
                        onClick={() => handleApproveOrder(order.id)}
                      >
                        <CheckCircle className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleRejectOrder(order.id)}
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col space-y-6">
      <NavigationHeader
        title="Order Management"
        description="Manage purchase requests and track order fulfillment"
        currentSection={getCurrentSectionName()}
        sections={sections}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="pb-6">
          {renderOrders()}
        </div>
      </div>
    </div>
  );
}