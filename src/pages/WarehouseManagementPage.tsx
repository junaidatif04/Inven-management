import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Package, 
  Truck, 
  CalendarIcon,
  Edit,
  Eye,
  CheckCircle,
  Trash2,
  Save
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { adjustStock, getStockMovements, getAllInventoryItems } from '@/services/inventoryService';
import { StockMovement } from '@/types/inventory';
import { Shipment, CreateShipment, UpdateShipment, getAllShipments, createShipment, updateShipment, updateShipmentStatus, deleteShipment, subscribeToShipments } from '@/services/shipmentService';




const sections = [
  { id: 'stock-entries', name: 'Stock Entries' },
  { id: 'shipments', name: 'Shipments' }
];

export default function WarehouseManagementPage() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('stock-entries');

  const [stockEntries, setStockEntries] = useState<StockMovement[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);

  
  const [stockForm, setStockForm] = useState({
    productId: '',
    type: 'in' as 'in' | 'out' | 'adjustment',
    quantity: '',
    reason: '',
    notes: ''
  });
  const [shipmentForm, setShipmentForm] = useState({
    type: 'incoming' as 'incoming' | 'outgoing',
    supplier: '',
    destination: '',
    items: '',
    eta: undefined as Date | undefined,
    trackingNumber: '',
    value: '',
    notes: ''
  });
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [showCreateShipment, setShowCreateShipment] = useState(false);
  const [showStockEntry, setShowStockEntry] = useState(false);
  const [showEditShipment, setShowEditShipment] = useState(false);
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [editShipmentForm, setEditShipmentForm] = useState({
    type: 'incoming' as 'incoming' | 'outgoing',
    supplier: '',
    destination: '',
    items: '',
    eta: undefined as Date | undefined,
    trackingNumber: '',
    value: '',
    notes: ''
  });
  const [newStatus, setNewStatus] = useState<Shipment['status']>('pending');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
    
    // Set up real-time subscriptions
    const unsubscribeShipments = subscribeToShipments((updatedShipments) => {
      setShipments(updatedShipments);
    });
    
    return () => {
      unsubscribeShipments();
    };
  }, []);

  const loadData = async () => {
    try {
      const [stockMovements, shipmentsData, inventory] = await Promise.all([
        getStockMovements(),
        getAllShipments(),
        getAllInventoryItems()
      ]);
      setStockEntries(stockMovements);
      setShipments(shipmentsData);
      setInventoryItems(inventory);
    } catch (error) {
      toast.error('Failed to load warehouse data');
    }
  };

  const handleStockEntry = async () => {
    if (!stockForm.productId || !stockForm.quantity || !stockForm.reason || !user) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      await adjustStock(
        stockForm.productId,
        parseInt(stockForm.quantity),
        stockForm.type,
        stockForm.reason,
        user.id,
        stockForm.notes
      );
      
      toast.success('Stock entry recorded successfully');
      setStockForm({
        productId: '',
        type: 'in',
        quantity: '',
        reason: '',
        notes: ''
      });
      
      setShowStockEntry(false);
      
      // Reload stock movements
      const updatedMovements = await getStockMovements();
      setStockEntries(updatedMovements);
    } catch (error: any) {
      toast.error(error.message || 'Failed to record stock entry');
    }
  };

  const handleCreateShipment = async () => {
    if (!shipmentForm.trackingNumber || !shipmentForm.items || !shipmentForm.value) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      const shipmentData: CreateShipment = {
        type: shipmentForm.type,
        trackingNumber: shipmentForm.trackingNumber,
        items: parseInt(shipmentForm.items),
        value: parseFloat(shipmentForm.value),
        eta: shipmentForm.eta,
        notes: shipmentForm.notes,
        requestedBy: user?.displayName || user?.email || 'Unknown'
      };
      
      if (shipmentForm.type === 'incoming') {
        shipmentData.supplier = shipmentForm.supplier;
      } else {
        shipmentData.destination = shipmentForm.destination;
      }
      
      await createShipment(shipmentData);
      toast.success('Shipment created successfully');
      
      setShipmentForm({
        type: 'incoming',
        supplier: '',
        destination: '',
        items: '',
        eta: undefined,
        trackingNumber: '',
        value: '',
        notes: ''
      });
      
      setShowCreateShipment(false);
    } catch (error) {
      toast.error('Failed to create shipment');
    }
  };

  const handleEditShipment = (shipment: Shipment) => {
    setEditingShipment(shipment);
    setEditShipmentForm({
      type: shipment.type,
      supplier: shipment.supplier || '',
      destination: shipment.destination || '',
      items: shipment.items.toString(),
      eta: shipment.eta?.toDate ? shipment.eta.toDate() : shipment.eta ? new Date(shipment.eta) : undefined,
      trackingNumber: shipment.trackingNumber,
      value: shipment.value.toString(),
      notes: shipment.notes || ''
    });
    setShowEditShipment(true);
  };

  const handleUpdateShipment = async () => {
    if (!editingShipment || !editShipmentForm.trackingNumber || !editShipmentForm.items || !editShipmentForm.value) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      const updateData: UpdateShipment = {
        id: editingShipment.id,
        type: editShipmentForm.type,
        trackingNumber: editShipmentForm.trackingNumber,
        items: parseInt(editShipmentForm.items),
        value: parseFloat(editShipmentForm.value),
        eta: editShipmentForm.eta,
        notes: editShipmentForm.notes
      };

      if (editShipmentForm.type === 'incoming') {
        updateData.supplier = editShipmentForm.supplier;
      } else {
        updateData.destination = editShipmentForm.destination;
      }

      await updateShipment(updateData);
      toast.success('Shipment updated successfully');
      setShowEditShipment(false);
      setEditingShipment(null);
    } catch (error) {
      toast.error('Failed to update shipment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = (shipment: Shipment) => {
    setEditingShipment(shipment);
    setNewStatus(shipment.status);
    setShowStatusUpdate(true);
  };

  const handleUpdateStatus = async () => {
    if (!editingShipment) return;

    try {
      setIsSubmitting(true);
      await updateShipmentStatus(editingShipment.id, newStatus);
      toast.success('Shipment status updated successfully');
      setShowStatusUpdate(false);
      setEditingShipment(null);
    } catch (error) {
      toast.error('Failed to update shipment status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteShipment = async (shipment: Shipment) => {
    if (!confirm('Are you sure you want to delete this shipment? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteShipment(shipment.id);
      toast.success('Shipment deleted successfully');
    } catch (error) {
      toast.error('Failed to delete shipment');
    }
  };



  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'arriving_today':
      case 'ready_to_ship':
      case 'delivered':
        return 'default';
      case 'in_transit':
      case 'processing':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      case 'pending':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString();
  };

  const formatDateTime = (date: any) => {
    if (!date) return 'N/A';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'in':
        return <ArrowUp className="h-4 w-4 text-green-600" />;
      case 'out':
        return <ArrowDown className="h-4 w-4 text-red-600" />;
      case 'adjustment':
        return <RotateCcw className="h-4 w-4 text-blue-600" />;
      default:
        return <Package className="h-4 w-4" />;
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
        <Button onClick={() => setShowStockEntry(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Stock Entry
        </Button>
        
        <Dialog open={showStockEntry} onOpenChange={setShowStockEntry}>
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
                    {inventoryItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} - {item.sku}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={stockForm.type} onValueChange={(value) => setStockForm(prev => ({ ...prev, type: value as 'in' | 'out' | 'adjustment' }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in">Stock In</SelectItem>
                      <SelectItem value="out">Stock Out</SelectItem>
                      <SelectItem value="adjustment">Adjustment</SelectItem>
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
                <Label>Reason *</Label>
                <Input
                  placeholder="Enter reason for stock movement"
                  value={stockForm.reason}
                  onChange={(e) => setStockForm(prev => ({ ...prev, reason: e.target.value }))}
                />
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
                        <p className="font-medium">{entry.itemName}</p>
                        <Badge variant={entry.type === 'in' ? 'default' : entry.type === 'out' ? 'secondary' : 'outline'}>
                          {entry.type === 'in' ? 'Stock In' : entry.type === 'out' ? 'Stock Out' : 'Adjustment'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{entry.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(entry.timestamp)} • {entry.performedBy}
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-bold text-lg">
                      {entry.type === 'out' ? '-' : entry.type === 'adjustment' && entry.quantity < 0 ? '' : '+'}
                      {Math.abs(entry.quantity)}
                    </p>
                    <p className="text-xs text-muted-foreground">{entry.notes || 'No notes'}</p>
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
        <Button onClick={() => setShowCreateShipment(true)}>
          <Truck className="mr-2 h-4 w-4" />
          New Shipment
        </Button>
        
        <Dialog open={showCreateShipment} onOpenChange={setShowCreateShipment}>
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
                <Select value={shipmentForm.type} onValueChange={(value) => setShipmentForm(prev => ({ ...prev, type: value as 'incoming' | 'outgoing' }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="incoming">Incoming</SelectItem>
                    <SelectItem value="outgoing">Outgoing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {shipmentForm.type === 'incoming' ? (
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
                <Label>Total Value ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Enter total value"
                  value={shipmentForm.value}
                  onChange={(e) => setShipmentForm(prev => ({ ...prev, value: e.target.value }))}
                />
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
                    <Badge variant={shipment.type === 'incoming' ? 'default' : 'secondary'}>
                      {shipment.type === 'incoming' ? 'Incoming' : 'Outgoing'}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>
                      {shipment.type === 'incoming' ? `From: ${shipment.supplier || 'N/A'}` : `To: ${shipment.destination || 'N/A'}`}
                    </p>
                    <p>Items: {shipment.items || 0} • Value: ${(shipment.value || 0).toLocaleString()}</p>
                    <p>Tracking: {shipment.trackingNumber}</p>
                    {shipment.eta && <p>ETA: {formatDate(shipment.eta)}</p>}
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
                              <Badge variant={selectedShipment.type === 'incoming' ? 'default' : 'secondary'} className="mt-1">
                                {selectedShipment.type === 'incoming' ? 'Incoming' : 'Outgoing'}
                              </Badge>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">
                              {selectedShipment.type === 'incoming' ? 'Supplier' : 'Destination'}
                            </Label>
                            <p className="text-sm">
                              {selectedShipment.type === 'incoming' ? selectedShipment.supplier || 'N/A' : selectedShipment.destination || 'N/A'}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium">Items</Label>
                              <p className="text-sm">{selectedShipment.items}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Value</Label>
                              <p className="text-sm">${(selectedShipment.value || 0).toLocaleString()}</p>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Tracking Number</Label>
                            <p className="text-sm font-mono">{selectedShipment.trackingNumber}</p>
                          </div>
                          {selectedShipment.eta && (
                            <div>
                              <Label className="text-sm font-medium">ETA</Label>
                              <p className="text-sm">{formatDate(selectedShipment.eta)}</p>
                            </div>
                          )}
                          <div className="flex space-x-2 pt-4">
                            <Button 
                              variant="outline" 
                              className="flex-1"
                              onClick={() => {
                                handleEditShipment(selectedShipment);
                                setSelectedShipment(null);
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                            <Button 
                              className="flex-1"
                              onClick={() => {
                                handleStatusUpdate(selectedShipment);
                                setSelectedShipment(null);
                              }}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Update Status
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    )}
                  </Dialog>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleEditShipment(shipment)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => handleDeleteShipment(shipment)}
                  >
                    <Trash2 className="h-3 w-3" />
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

      {/* Edit Shipment Dialog */}
      <Dialog open={showEditShipment} onOpenChange={setShowEditShipment}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Shipment</DialogTitle>
            <DialogDescription>
              Update shipment details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Shipment Type</Label>
              <Select value={editShipmentForm.type} onValueChange={(value) => setEditShipmentForm(prev => ({ ...prev, type: value as 'incoming' | 'outgoing' }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="incoming">Incoming</SelectItem>
                  <SelectItem value="outgoing">Outgoing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editShipmentForm.type === 'incoming' ? (
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Input
                  placeholder="Enter supplier name"
                  value={editShipmentForm.supplier}
                  onChange={(e) => setEditShipmentForm(prev => ({ ...prev, supplier: e.target.value }))}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Destination</Label>
                <Input
                  placeholder="Enter destination"
                  value={editShipmentForm.destination}
                  onChange={(e) => setEditShipmentForm(prev => ({ ...prev, destination: e.target.value }))}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Number of Items</Label>
                <Input
                  type="number"
                  placeholder="Item count"
                  value={editShipmentForm.items}
                  onChange={(e) => setEditShipmentForm(prev => ({ ...prev, items: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Tracking Number</Label>
                <Input
                  placeholder="Tracking #"
                  value={editShipmentForm.trackingNumber}
                  onChange={(e) => setEditShipmentForm(prev => ({ ...prev, trackingNumber: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Total Value ($)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Enter total value"
                value={editShipmentForm.value}
                onChange={(e) => setEditShipmentForm(prev => ({ ...prev, value: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>ETA / Ship Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editShipmentForm.eta ? format(editShipmentForm.eta, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={editShipmentForm.eta}
                    onSelect={(date) => setEditShipmentForm(prev => ({ ...prev, eta: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Add notes about this shipment"
                value={editShipmentForm.notes}
                onChange={(e) => setEditShipmentForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            <Button onClick={handleUpdateShipment} className="w-full" disabled={isSubmitting}>
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Updating...' : 'Update Shipment'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={showStatusUpdate} onOpenChange={setShowStatusUpdate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Shipment Status</DialogTitle>
            <DialogDescription>
              Change the status of this shipment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Status</Label>
              <Select value={newStatus} onValueChange={(value) => setNewStatus(value as Shipment['status'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="arriving_today">Arriving Today</SelectItem>
                  <SelectItem value="ready_to_ship">Ready to Ship</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleUpdateStatus} className="w-full" disabled={isSubmitting}>
              <CheckCircle className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Updating...' : 'Update Status'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}