import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, CheckCircle, Clock, Package, Truck, X } from 'lucide-react';
import { Order } from '@/services/orderService';

interface OrderStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onStatusUpdate: (orderId: string, newStatus: Order['status'], cancellationReason?: string) => Promise<void>;
}

const statusOptions = [
  { value: 'pending', label: 'Pending', icon: Clock, color: 'text-yellow-600', level: 1 },
  { value: 'approved', label: 'Approved', icon: CheckCircle, color: 'text-green-600', level: 2 },
  { value: 'cancelled', label: 'Cancelled', icon: X, color: 'text-red-600', level: 2 },
  { value: 'shipped', label: 'Shipped', icon: Truck, color: 'text-blue-600', level: 3 },
  { value: 'delivered', label: 'Delivered', icon: Package, color: 'text-purple-600', level: 4 },
] as const;



// Get current status level
const getStatusLevel = (status: Order['status']) => {
  return statusOptions.find(option => option.value === status)?.level || 0;
};

// Get allowed next statuses based on current status (can jump to any higher level)
const getAllowedNextStatuses = (currentStatus: Order['status']) => {
  const currentLevel = getStatusLevel(currentStatus);
  
  // Terminal states cannot be changed
  if (currentStatus === 'cancelled' || currentStatus === 'delivered') {
    return [];
  }
  
  // Return all statuses with higher levels
  return statusOptions
    .filter(option => option.level > currentLevel)
    .map(option => option.value);
};

export default function OrderStatusDialog({
  open,
  onOpenChange,
  order,
  onStatusUpdate,
}: OrderStatusDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<Order['status'] | ''>('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setSelectedStatus('');
    setCancellationReason('');
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!order || !selectedStatus) return;

    // Validate cancellation reason if status is cancelled
    if (selectedStatus === 'cancelled' && !cancellationReason.trim()) {
      return; // Form validation will show error
    }

    setLoading(true);
    try {
      await onStatusUpdate(
        order.id,
        selectedStatus,
        selectedStatus === 'cancelled' ? cancellationReason : undefined
      );
      handleClose();
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStatusInfo = () => {
    if (!order) return null;
    return statusOptions.find(option => option.value === order.status);
  };

  const getSelectedStatusInfo = () => {
    if (!selectedStatus) return null;
    return statusOptions.find(option => option.value === selectedStatus);
  };

  const currentStatusInfo = getCurrentStatusInfo();
  const selectedStatusInfo = getSelectedStatusInfo();
  const showCancellationReason = selectedStatus === 'cancelled';
  const isFormValid = selectedStatus && (!showCancellationReason || cancellationReason.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Order Status</DialogTitle>
          <DialogDescription>
            Change the status of order #{order?.orderNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Status */}
          {currentStatusInfo && (
            <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <currentStatusInfo.icon className={`h-4 w-4 ${currentStatusInfo.color}`} />
              <span className="text-sm font-medium">Current Status:</span>
              <span className={`text-sm font-semibold ${currentStatusInfo.color}`}>
                {currentStatusInfo.label}
              </span>
            </div>
          )}

          {/* New Status Selection */}
          <div className="space-y-2">
            <Label htmlFor="status">New Status</Label>
            <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as Order['status'])}>
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions
                  .filter((option) => {
                    if (!order) return false;
                    const allowedStatuses = getAllowedNextStatuses(order.status);
                    return allowedStatuses.includes(option.value as any);
                  })
                  .map((option) => {
                    const Icon = option.icon;
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center space-x-2">
                          <Icon className={`h-4 w-4 ${option.color}`} />
                          <span>{option.label}</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            Level {option.level}
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>
            {order && getAllowedNextStatuses(order.status).length === 0 && (
              <p className="text-sm text-muted-foreground">
                This order status cannot be changed further.
              </p>
            )}
          </div>

          {/* Cancellation Reason */}
          {showCancellationReason && (
            <div className="space-y-2">
              <Label htmlFor="cancellation-reason" className="flex items-center space-x-1">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span>Cancellation Reason *</span>
              </Label>
              <Textarea
                id="cancellation-reason"
                placeholder="Please provide a reason for cancelling this order..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="min-h-[80px]"
                required
              />
              {!cancellationReason.trim() && (
                <p className="text-sm text-red-600">
                  Cancellation reason is required when cancelling an order.
                </p>
              )}
            </div>
          )}

          {/* Status Progression Info */}
          {order && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Status Progression:</span>
                  <span className="text-xs text-muted-foreground">
                    Level {getStatusLevel(order.status)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {statusOptions.map((status) => {
                    const isCurrentLevel = status.level === getStatusLevel(order.status);
                    const isPastLevel = status.level < getStatusLevel(order.status);
                    const isAvailable = getAllowedNextStatuses(order.status).includes(status.value as any);
                    
                    return (
                      <div key={status.value} className={`px-2 py-1 rounded text-xs font-medium text-center ${
                         isCurrentLevel ? 'bg-blue-100 text-blue-800' :
                         isPastLevel ? 'bg-gray-200 text-gray-600' :
                         isAvailable ? 'bg-green-100 text-green-800' :
                         'bg-gray-100 text-gray-400'
                       }`}>
                         L{status.level}: {status.label}
                       </div>
                     );
                   })}
                </div>
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Note:</span> You can jump to any higher level. 
                  {order.status === 'cancelled' || order.status === 'delivered' ? 
                    'This is a terminal status.' : 
                    `Available: ${getAllowedNextStatuses(order.status).join(', ') || 'None'}`
                  }
                </div>
              </div>
            </div>
          )}

          {/* Status Change Preview */}
          {selectedStatusInfo && selectedStatus !== order?.status && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 text-sm">
                <span className="font-medium">Status will change to:</span>
                <selectedStatusInfo.icon className={`h-4 w-4 ${selectedStatusInfo.color}`} />
                <span className={`font-semibold ${selectedStatusInfo.color}`}>
                  {selectedStatusInfo.label} (Level {selectedStatusInfo.level})
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isFormValid || loading || selectedStatus === order?.status}
            className="min-w-[100px]"
          >
            {loading ? 'Updating...' : 'Update Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}