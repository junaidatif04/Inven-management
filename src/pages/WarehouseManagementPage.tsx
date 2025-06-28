import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { NavigationHeader } from '@/components/NavigationHeader';
import { 
  Plus, 
  Search, 
  Package, 
  Truck, 
  CalendarIcon,
  Edit,
  Eye,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Mock data
const stockEntries = [
  { id: 'SE-001', productId: 'PROD-001', productName: 'Laptop Dell XPS 13', type: 'Stock In', quantity: 50, date: '2024-01-15', user: 'Jane Warehouse', notes: 'New shipment from supplier' },
  { id: 'SE-002', productId: 'PROD-002', productName: 'Wireless Mouse', type: 'Stock Out', quantity: 25, date: '2024-01-15', user: 'Jane Warehouse', notes: 'Fulfilled order REQ-001' },
  { id: 'SE-003', productId: 'PROD-003', productName: 'Office Chair', type: 'Stock In', quantity: 15, date: '2024-01-14', user: 'Mike Staff', notes: 'Restocking low inventory' },
  { id: 'SE-004', productId: 'PROD-004', productName: 'Monitor 27" 4K', type: 'Adjustment', quantity: -2, date: '2024-01-14', user: 'Jane Warehouse', notes: 'Damaged items removed' },
];

const shipments = [
  { 
    id: 'SH-001', 
    type: 'Incoming', 
    supplier: 'TechCorp Industries', 
    items: 15, 
    status: 'In Transit', 
    eta: '2024-01-16',
    trackingNumber: 'TC123456789',
    value: 25000
  },
  { 
    id: 'SH-002', 
    type: 'Incoming', 
    supplier: 'Office Supplies Co', 
    items: 8, 
    status: 'Arriving Today', 
    eta: '2024-01-15',
    trackingNumber: 'OS987654321',
    value: 1200
  },
  { 
    id: 'SH-003', 
    type: 'Outgoing', 
    destination: 'IT Department', 
    items: 5, 
    status: 'Ready to Ship', 
    requestedBy: 'Alice Johnson',
    trackingNumber: 'OUT123456',
    value: 6500
  },
  { 
    id: 'SH-004', 
    type: 'Outgoing', 
    destination: 'Marketing', 
    items: 2, 
    status: 'Processing', 
    requestedBy: 'Bob Smith',
    trackingNumber: 'OUT789012',
    value: 800
  },
];

const sections = [
  { id: 'stock-entries', name: 'Stock Entries' },
  { id: 'shipments', name: 'Shipments' }
];

export default function WarehouseManagementPage() {
  const [activeSection, setActiveSection] = useState('stock-entries');
  const [stockForm, setStockForm] = useState({
    productId: '',
    type: 'Stock In',
    quantity: '',
    notes: ''
  });
  const [shipmentForm, setShipmentForm] = useState({
    type: 'Incoming',
    supplier: '',
    destination: '',
    items: '',
    eta: undefined as Date | undefined,
    trackingNumber: '',
    notes: ''
  });
  const [selectedShipment, setSelectedShipment] = useState<any>(null);

  const handleStockEntry = () => {
    if (!stockForm.productId || !stockForm.quantity) {
      toast.error('Please fill in all required fields');
      return;
    }
    toast.success('Stock entry recorded successfully');
    setStockForm({
      productId: '',
      type: 'Stock In',
      quantity: '',
      notes: ''
    });
  };

  const handleCreateShipment = () => {
    if (!shipmentForm.trackingNumber || !shipmentForm.items) {
      toast.error('Please fill in all required fields');
      return;
    }
    toast.success('Shipment created successfully');
    setShipmentForm({
      type: 'Incoming',
      supplier: '',
      destination: '',
      items: '',
      eta: undefined,
      trackingNumber: '',
      notes: ''
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Arriving Today':
      case 'Ready to Ship':
      case 'Completed':
        return 'default';
      case 'In Transit':
      case 'Processing':
      case 'In Progress':
        return 'secondary';
      case 'Delayed':
        return 'destructive';
      case 'Pending':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Stock In':
        return <Package className="h-4 w-4 text-green-500" />;
      case 'Stock Out':
        return <Package className="h-4 w-4 text-red-500" />;
      case 'Adjustment':
        return <Edit className="h-4 w-4 text-yellow-500" />;
      default:
        return <Package className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getCurrentSectionName = () => {
    return sections.find(s => s.id === activeSection)?.name || '';
  };

  const renderStockEntries = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Stock Entries</h2>
          <p className="text-sm text-muted-foreground">
            Track all stock movements and adjustments
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Stock Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>New Stock Entry</DialogTitle>
              <DialogDescription>
                Record stock movement in the warehouse
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Product</Label>
                <Select value={stockForm.productId} onValueChange={(value) => setStockForm(prev => ({ ...prev, productId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PROD-001">Laptop Dell XPS 13</SelectItem>
                    <SelectItem value="PROD-002">Wireless Mouse</SelectItem>
                    <SelectItem value="PROD-003">Office Chair</SelectItem>
                    <SelectItem value="PROD-004">Monitor 27" 4K</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={stockForm.type} onValueChange={(value) => setStockForm(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Stock In">Stock In</SelectItem>
                      <SelectItem value="Stock Out">Stock Out</SelectItem>
                      <SelectItem value="Adjustment">Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    placeholder="Enter quantity"
                    value={stockForm.quantity}
                    onChange={(e) => setStockForm(prev => ({ ...prev, quantity: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Add notes about this entry"
                  value={stockForm.notes}
                  onChange={(e) => setStockForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
              <Button onClick={handleStockEntry} className="w-full">
                Record Entry
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <div className="space-y-4 p-6">
              {stockEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    {getTypeIcon(entry.type)}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium">{entry.id}</p>
                        <Badge variant={entry.type === 'Stock In' ? 'default' : entry.type === 'Stock Out' ? 'secondary' : 'outline'}>
                          {entry.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{entry.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.date} • {entry.user}
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-bold text-lg">
                      {entry.type === 'Stock Out' ? '-' : entry.type === 'Adjustment' && entry.quantity < 0 ? '' : '+'}
                      {Math.abs(entry.quantity)}
                    </p>
                    <p className="text-xs text-muted-foreground">{entry.notes}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );

  const renderShipments = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Shipment Management</h2>
          <p className="text-sm text-muted-foreground">
            Track incoming and outgoing shipments
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Truck className="mr-2 h-4 w-4" />
              New Shipment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Shipment</DialogTitle>
              <DialogDescription>
                Create a new incoming or outgoing shipment
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Shipment Type</Label>
                <Select value={shipmentForm.type} onValueChange={(value) => setShipmentForm(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Incoming">Incoming</SelectItem>
                    <SelectItem value="Outgoing">Outgoing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {shipmentForm.type === 'Incoming' ? (
                <div className="space-y-2">
                  <Label>Supplier</Label>
                  <Input
                    placeholder="Enter supplier name"
                    value={shipmentForm.supplier}
                    onChange={(e) => setShipmentForm(prev => ({ ...prev, supplier: e.target.value }))}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Destination</Label>
                  <Input
                    placeholder="Enter destination"
                    value={shipmentForm.destination}
                    onChange={(e) => setShipmentForm(prev => ({ ...prev, destination: e.target.value }))}
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Number of Items</Label>
                  <Input
                    type="number"
                    placeholder="Item count"
                    value={shipmentForm.items}
                    onChange={(e) => setShipmentForm(prev => ({ ...prev, items: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tracking Number</Label>
                  <Input
                    placeholder="Tracking #"
                    value={shipmentForm.trackingNumber}
                    onChange={(e) => setShipmentForm(prev => ({ ...prev, trackingNumber: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>ETA / Ship Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {shipmentForm.eta ? format(shipmentForm.eta, 'PPP') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={shipmentForm.eta}
                      onSelect={(date) => setShipmentForm(prev => ({ ...prev, eta: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Button onClick={handleCreateShipment} className="w-full">
                Create Shipment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {shipments.map((shipment) => (
              <div key={shipment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="space-y-2">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{shipment.id}</p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(shipment.status)}>
                      {shipment.status}
                    </Badge>
                    <Badge variant={shipment.type === 'Incoming' ? 'default' : 'secondary'}>
                      {shipment.type}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>
                      {shipment.type === 'Incoming' ? `From: ${shipment.supplier}` : `To: ${shipment.destination}`}
                    </p>
                    <p>Items: {shipment.items} • Value: ${shipment.value.toLocaleString()}</p>
                    <p>Tracking: {shipment.trackingNumber}</p>
                    {shipment.eta && <p>ETA: {shipment.eta}</p>}
                    {shipment.requestedBy && <p>Requested by: {shipment.requestedBy}</p>}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedShipment(shipment)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </DialogTrigger>
                    {selectedShipment && (
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Shipment Details</DialogTitle>
                          <DialogDescription>
                            {selectedShipment.id} - {selectedShipment.type}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium">Status</Label>
                              <Badge variant={getStatusBadgeVariant(selectedShipment.status)} className="mt-1">
                                {selectedShipment.status}
                              </Badge>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Type</Label>
                              <Badge variant={selectedShipment.type === 'Incoming' ? 'default' : 'secondary'} className="mt-1">
                                {selectedShipment.type}
                              </Badge>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">
                              {selectedShipment.type === 'Incoming' ? 'Supplier' : 'Destination'}
                            </Label>
                            <p className="text-sm">
                              {selectedShipment.type === 'Incoming' ? selectedShipment.supplier : selectedShipment.destination}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium">Items</Label>
                              <p className="text-sm">{selectedShipment.items}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Value</Label>
                              <p className="text-sm">${selectedShipment.value.toLocaleString()}</p>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Tracking Number</Label>
                            <p className="text-sm font-mono">{selectedShipment.trackingNumber}</p>
                          </div>
                          {selectedShipment.eta && (
                            <div>
                              <Label className="text-sm font-medium">ETA</Label>
                              <p className="text-sm">{selectedShipment.eta}</p>
                            </div>
                          )}
                          <div className="flex space-x-2 pt-4">
                            <Button variant="outline" className="flex-1">
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                            <Button className="flex-1">
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Update Status
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    )}
                  </Dialog>
                  <Button size="sm" variant="outline">
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="h-full flex flex-col space-y-6">
      <NavigationHeader
        title="Warehouse Management"
        description="Manage stock entries and shipments"
        currentSection={getCurrentSectionName()}
        sections={sections}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="pb-6">
          {activeSection === 'stock-entries' && renderStockEntries()}
          {activeSection === 'shipments' && renderShipments()}
        </div>
      </div>
    </div>
  );
}