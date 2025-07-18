import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NavigationHeader } from '@/components/NavigationHeader';
import { 
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Package
} from 'lucide-react';

import { toast } from 'sonner';

import { getStockMovements } from '@/services/inventoryService';
import { StockMovement } from '@/types/inventory';





const sections = [
  { id: 'stock-entries', name: 'Stock Entries' }
];

export default function WarehouseManagementPage() {

  const [activeSection, setActiveSection] = useState('stock-entries');

  const [stockEntries, setStockEntries] = useState<StockMovement[]>([]);




  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [stockMovements] = await Promise.all([
        getStockMovements()
      ]);
      setStockEntries(stockMovements);
      // setInventoryItems(inventory); // Removed unused variable
    } catch (error) {
      toast.error('Failed to load warehouse data');
    }
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







  return (
    <div className="h-full flex flex-col space-y-6">
      <NavigationHeader
        title="Warehouse Management"
        description="View stock entries and movements"
        currentSection={getCurrentSectionName()}
        sections={sections}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="pb-6">
          {activeSection === 'stock-entries' && renderStockEntries()}
        </div>
      </div>
    </div>
  );
}