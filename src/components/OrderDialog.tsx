import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { createOrder, updateOrder, Order, CreateOrder, UpdateOrder, OrderItem } from '@/services/orderService';
import { getAllSuppliers } from '@/services/supplierService';
import { Supplier } from '@/types/inventory';
import { getAllInventoryItems } from '@/services/inventoryService';
import { InventoryItem } from '@/types/inventory';
import { useAuth } from '@/contexts/AuthContext';

interface OrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: Order | null;
  mode: 'create' | 'edit' | 'view';
  onSuccess: () => void;
}

export default function OrderDialog({ open, onOpenChange, order, mode, onSuccess }: OrderDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  
  const [formData, setFormData] = useState({
    supplierId: '',
    supplierName: '',
    expectedDelivery: '',
    notes: '',
    requestedBy: user?.email || '',
  });
  
  const [orderItems, setOrderItems] = useState<Omit<OrderItem, 'id'>[]>([]);
  const [newItem, setNewItem] = useState({
    name: '',
    quantity: 1,
    unitPrice: 0,
  });

  useEffect(() => {
    if (open) {
      loadData();
      if (order && (mode === 'edit' || mode === 'view')) {
        setFormData({
          supplierId: order.supplierId,
          supplierName: order.supplierName,
          expectedDelivery: order.expectedDelivery ? new Date(order.expectedDelivery.toDate()).toISOString().split('T')[0] : '',
          notes: order.notes || '',
          requestedBy: order.requestedBy,
        });
        setOrderItems(order.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        })));
      } else {
        resetForm();
      }
    }
  }, [open, order, mode]);

  const loadData = async () => {
    try {
      const [suppliersData, inventoryData] = await Promise.all([
        getAllSuppliers(),
        getAllInventoryItems()
      ]);
      setSuppliers(suppliersData);
      setInventoryItems(inventoryData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load suppliers and inventory');
    }
  };

  const resetForm = () => {
    setFormData({
      supplierId: '',
      supplierName: '',
      expectedDelivery: '',
      notes: '',
      requestedBy: user?.email || '',
    });
    setOrderItems([]);
    setNewItem({ name: '', quantity: 1, unitPrice: 0 });
  };

  const handleSupplierChange = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    setFormData(prev => ({
      ...prev,
      supplierId,
      supplierName: supplier?.name || ''
    }));
  };

  const addItem = () => {
    if (!newItem.name || newItem.quantity <= 0 || newItem.unitPrice <= 0) {
      toast.error('Please fill all item fields with valid values');
      return;
    }

    const totalPrice = newItem.quantity * newItem.unitPrice;
    setOrderItems(prev => [...prev, { ...newItem, totalPrice }]);
    setNewItem({ name: '', quantity: 1, unitPrice: 0 });
  };

  const removeItem = (index: number) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) return;
    setOrderItems(prev => prev.map((item, i) => 
      i === index ? { ...item, quantity, totalPrice: quantity * item.unitPrice } : item
    ));
  };

  const updateItemPrice = (index: number, unitPrice: number) => {
    if (unitPrice < 0) return;
    setOrderItems(prev => prev.map((item, i) => 
      i === index ? { ...item, unitPrice, totalPrice: item.quantity * unitPrice } : item
    ));
  };

  const handleSubmit = async () => {
    if (!formData.supplierId || orderItems.length === 0) {
      toast.error('Please select a supplier and add at least one item');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'create') {
        const orderData: CreateOrder = {
          supplierId: formData.supplierId,
          supplierName: formData.supplierName,
          items: orderItems,
          expectedDelivery: formData.expectedDelivery ? new Date(formData.expectedDelivery) : undefined,
          notes: formData.notes,
          requestedBy: formData.requestedBy,
        };
        await createOrder(orderData);
        toast.success('Order created successfully');
      } else if (mode === 'edit' && order) {
        const updateData: UpdateOrder = {
          id: order.id,
          supplierId: formData.supplierId,
          supplierName: formData.supplierName,
          items: orderItems,
          expectedDelivery: formData.expectedDelivery ? new Date(formData.expectedDelivery) : undefined,
          notes: formData.notes,
        };
        await updateOrder(updateData);
        toast.success('Order updated successfully');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving order:', error);
      toast.error('Failed to save order');
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' && 'Create New Order'}
            {mode === 'edit' && 'Edit Order'}
            {mode === 'view' && 'Order Details'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' && 'Create a new purchase order for inventory items.'}
            {mode === 'edit' && 'Update the order details and items.'}
            {mode === 'view' && 'View order information and items.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier *</Label>
                  <Select
                    value={formData.supplierId}
                    onValueChange={handleSupplierChange}
                    disabled={mode === 'view'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="expectedDelivery">Expected Delivery</Label>
                  <Input
                    id="expectedDelivery"
                    type="date"
                    value={formData.expectedDelivery}
                    onChange={(e) => setFormData(prev => ({ ...prev, expectedDelivery: e.target.value }))}
                    disabled={mode === 'view'}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes or requirements..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  disabled={mode === 'view'}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add New Item */}
              {mode !== 'view' && (
                <div className="grid grid-cols-5 gap-2 p-4 border rounded-lg bg-muted/50">
                  <div>
                    <Label className="text-xs">Item Name</Label>
                    <Select
                      value={newItem.name}
                      onValueChange={(value) => setNewItem(prev => ({ ...prev, name: value }))}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {inventoryItems.map((item) => (
                          <SelectItem key={item.id} value={item.name}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Unit Price</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newItem.unitPrice}
                      onChange={(e) => setNewItem(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Total</Label>
                    <div className="h-8 px-3 py-1 text-sm border rounded-md bg-background">
                      {formatCurrency(newItem.quantity * newItem.unitPrice)}
                    </div>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={addItem} size="sm" className="h-8">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Items Table */}
              {orderItems.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total Price</TableHead>
                      {mode !== 'view' && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          {mode === 'view' ? (
                            item.quantity
                          ) : (
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                              className="w-20"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {mode === 'view' ? (
                            formatCurrency(item.unitPrice)
                          ) : (
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => updateItemPrice(index, parseFloat(e.target.value) || 0)}
                              className="w-24"
                            />
                          )}
                        </TableCell>
                        <TableCell>{formatCurrency(item.totalPrice)}</TableCell>
                        {mode !== 'view' && (
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeItem(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No items added yet
                </div>
              )}

              {/* Total */}
              {orderItems.length > 0 && (
                <div className="flex justify-end pt-4 border-t">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {mode === 'view' ? 'Close' : 'Cancel'}
          </Button>
          {mode !== 'view' && (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Saving...' : mode === 'create' ? 'Create Order' : 'Update Order'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}