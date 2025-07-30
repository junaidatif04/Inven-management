// Dashboard Stats Interface
export interface DashboardStats {
  totalInventoryValue: number;
  lowStockAlerts: number;
  outOfStockItems: number;
  totalOrders: number;
  pendingOrders: number;
  totalUsers: number;
  activeSuppliers: number;
  monthlyOrderGrowth: number;
  inventoryTurnover: number;
  pendingQuantityRequests?: number;
}

// Analytics Interfaces
export interface InventoryAnalytics {
  totalValue: number;
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  topCategories: { name: string; value: number; count: number }[];
  stockLevels: { inStock: number; lowStock: number; outOfStock: number };
  monthlyMovement: { month: string; inbound: number; outbound: number }[];
}

export interface OrderAnalytics {
  totalOrders: number;
  totalValue: number;
  averageOrderValue: number;
  ordersByStatus: { status: string; count: number; value: number }[];
  monthlyTrends: { month: string; orders: number; value: number }[];
  topSuppliers: { name: string; orders: number; value: number }[];
}

export interface SupplierAnalytics {
  totalSuppliers: number;
  activeSuppliers: number;
  topPerformers: { name: string; orders: number; value: number; rating: number }[];
  deliveryPerformance: { supplier: string; onTimeRate: number; avgDeliveryTime: number }[];
}

// Mock data for development
const mockInventoryData = [
  { id: '1', name: 'Laptop', quantity: 50, unitPrice: 1000, minStockLevel: 10, category: 'Electronics' },
  { id: '2', name: 'Mouse', quantity: 5, unitPrice: 25, minStockLevel: 20, category: 'Electronics' },
  { id: '3', name: 'Keyboard', quantity: 0, unitPrice: 75, minStockLevel: 15, category: 'Electronics' },
  { id: '4', name: 'Office Chair', quantity: 25, unitPrice: 200, minStockLevel: 5, category: 'Furniture' },
];

const mockOrderData = [
  { id: '1', status: 'pending', totalAmount: 1500, orderDate: new Date(), supplierId: 'sup1' },
  { id: '2', status: 'approved', totalAmount: 2000, orderDate: new Date(Date.now() - 86400000), supplierId: 'sup2' },
  { id: '3', status: 'pending', totalAmount: 750, orderDate: new Date(), supplierId: 'sup1' },
  { id: '4', status: 'delivered', totalAmount: 3200, orderDate: new Date(Date.now() - 172800000), supplierId: 'sup3' },
];

const mockSupplierData = [
  { id: 'sup1', name: 'Tech Supplies Co.', status: 'active' },
  { id: 'sup2', name: 'Office Depot', status: 'active' },
  { id: 'sup3', name: 'Hardware Plus', status: 'active' },
  { id: 'sup4', name: 'Furniture World', status: 'inactive' },
];

const mockUserData = [
  { id: '1', name: 'John Admin', role: 'admin' },
  { id: '2', name: 'Jane Manager', role: 'manager' },
  { id: '3', name: 'Bob User', role: 'internal_user' },
  { id: '4', name: 'Alice Staff', role: 'staff' },
];

// Real-time Dashboard Stats
export const subscribeToDashboardStats = (callback: (stats: DashboardStats) => void) => {
  // Use mock data for now
  let inventoryData: any[] = mockInventoryData;
  let orderData: any[] = mockOrderData;
  let supplierData: any[] = mockSupplierData;
  let userData: any[] = mockUserData;

  const updateStats = () => {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Calculate inventory stats
    const totalInventoryValue = inventoryData.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const lowStockAlerts = inventoryData.filter(item => item.quantity <= item.minStockLevel).length;
    const outOfStockItems = inventoryData.filter(item => item.quantity === 0).length;

    // Calculate order stats
    const totalOrders = orderData.length;
    const pendingOrders = orderData.filter(order => order.status === 'pending').length;

    const currentMonthOrders = orderData.filter(order => {
      const orderDate = order.orderDate instanceof Date ? order.orderDate : new Date(order.orderDate);
      return orderDate >= currentMonth;
    }).length;

    const lastMonthOrders = orderData.filter(order => {
      const orderDate = order.orderDate instanceof Date ? order.orderDate : new Date(order.orderDate);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return orderDate >= lastMonth && orderDate < thisMonth;
    }).length;

    const monthlyOrderGrowth = lastMonthOrders > 0 ?
      ((currentMonthOrders - lastMonthOrders) / lastMonthOrders) * 100 : 0;

    // Calculate other stats
    const totalUsers = userData.length;
    const activeSuppliers = supplierData.filter(s => s.status === 'active').length;
    const inventoryTurnover = 2.5;

    const stats: DashboardStats = {
      totalInventoryValue,
      lowStockAlerts,
      outOfStockItems,
      totalOrders,
      pendingOrders,
      totalUsers,
      activeSuppliers,
      monthlyOrderGrowth,
      inventoryTurnover
    };

    callback(stats);
  };

  // Initial call with mock data
  updateStats();

  // Simulate periodic updates
  const interval = setInterval(() => {
    if (Math.random() > 0.7) {
      inventoryData[0].quantity = Math.floor(Math.random() * 100) + 10;
      if (Math.random() > 0.8) {
        orderData.push({
          id: Date.now().toString(),
          status: Math.random() > 0.5 ? 'pending' : 'approved',
          totalAmount: Math.floor(Math.random() * 2000) + 500,
          orderDate: new Date(),
          supplierId: 'sup' + Math.floor(Math.random() * 3 + 1)
        });
      }
      updateStats();
    }
  }, 30000);

  return () => {
    clearInterval(interval);
  };
};

// Recent Orders Subscription
export const subscribeToRecentOrders = (callback: (orders: any[]) => void) => {
  const mockRecentOrders = [
    {
      id: '1',
      orderNumber: 'ORD-001',
      supplierName: 'Tech Supplies Co.',
      status: 'pending',
      totalAmount: 1250.00,
      orderDate: new Date(),
      requestedBy: 'John Doe'
    },
    {
      id: '2',
      orderNumber: 'ORD-002',
      supplierName: 'Office Depot',
      status: 'approved',
      totalAmount: 850.00,
      orderDate: new Date(Date.now() - 86400000),
      requestedBy: 'Jane Smith'
    },
    {
      id: '3',
      orderNumber: 'ORD-003',
      supplierName: 'Hardware Plus',
      status: 'shipped',
      totalAmount: 2100.00,
      orderDate: new Date(Date.now() - 172800000),
      requestedBy: 'Bob Wilson'
    }
  ];

  callback(mockRecentOrders);

  const interval = setInterval(() => {
    if (Math.random() > 0.8) {
      const newOrder = {
        id: Date.now().toString(),
        orderNumber: `ORD-${String(Date.now()).slice(-3)}`,
        supplierName: ['Tech Supplies Co.', 'Office Depot', 'Hardware Plus'][Math.floor(Math.random() * 3)],
        status: ['pending', 'approved'][Math.floor(Math.random() * 2)],
        totalAmount: Math.floor(Math.random() * 2000) + 500,
        orderDate: new Date(),
        requestedBy: ['John Doe', 'Jane Smith', 'Bob Wilson'][Math.floor(Math.random() * 3)]
      };
      mockRecentOrders.unshift(newOrder);
      mockRecentOrders.splice(5);
      callback([...mockRecentOrders]);
    }
  }, 45000);

  return () => {
    clearInterval(interval);
  };
};

// Inventory Analytics
export const getInventoryAnalytics = async (): Promise<InventoryAnalytics> => {
  try {
    const items = mockInventoryData;

    const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const lowStockItems = items.filter(item => item.quantity <= item.minStockLevel).length;
    const outOfStockItems = items.filter(item => item.quantity === 0).length;

    const categoryMap = new Map();
    items.forEach(item => {
      const existing = categoryMap.get(item.category) || { value: 0, count: 0 };
      categoryMap.set(item.category, {
        value: existing.value + (item.quantity * item.unitPrice),
        count: existing.count + 1
      });
    });

    const topCategories = Array.from(categoryMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const inStock = items.filter(item => item.quantity > item.minStockLevel).length;
    const lowStock = items.filter(item => item.quantity > 0 && item.quantity <= item.minStockLevel).length;
    const outOfStock = outOfStockItems;

    const monthlyMovement = [
      { month: 'Jan', inbound: 150, outbound: 120 },
      { month: 'Feb', inbound: 180, outbound: 140 },
      { month: 'Mar', inbound: 200, outbound: 160 },
      { month: 'Apr', inbound: 170, outbound: 130 },
      { month: 'May', inbound: 220, outbound: 180 },
      { month: 'Jun', inbound: 190, outbound: 150 }
    ];

    return {
      totalValue,
      totalItems: items.length,
      lowStockItems,
      outOfStockItems,
      topCategories,
      stockLevels: { inStock, lowStock, outOfStock },
      monthlyMovement
    };
  } catch (error) {
    console.error('Error getting inventory analytics:', error);
    throw error;
  }
};

// Order Analytics
export const getOrderAnalytics = async (): Promise<OrderAnalytics> => {
  try {
    const orders = mockOrderData;
    const suppliers = mockSupplierData;

    const totalValue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const averageOrderValue = orders.length > 0 ? totalValue / orders.length : 0;

    const ordersByStatus = [
      { status: 'pending', count: orders.filter(o => o.status === 'pending').length, value: orders.filter(o => o.status === 'pending').reduce((sum, o) => sum + o.totalAmount, 0) },
      { status: 'approved', count: orders.filter(o => o.status === 'approved').length, value: orders.filter(o => o.status === 'approved').reduce((sum, o) => sum + o.totalAmount, 0) },
      { status: 'delivered', count: orders.filter(o => o.status === 'delivered').length, value: orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.totalAmount, 0) }
    ];

    const monthlyTrends = [
      { month: 'Jan', orders: 12, value: 15000 },
      { month: 'Feb', orders: 18, value: 22000 },
      { month: 'Mar', orders: 15, value: 18500 },
      { month: 'Apr', orders: 20, value: 25000 },
      { month: 'May', orders: 22, value: 28000 },
      { month: 'Jun', orders: 19, value: 24000 }
    ];

    const topSuppliers = suppliers.map(supplier => {
      const supplierOrders = orders.filter(order => order.supplierId === supplier.id);
      return {
        name: supplier.name,
        orders: supplierOrders.length,
        value: supplierOrders.reduce((sum, order) => sum + order.totalAmount, 0)
      };
    }).sort((a, b) => b.value - a.value).slice(0, 5);

    return {
      totalOrders: orders.length,
      totalValue,
      averageOrderValue,
      ordersByStatus,
      monthlyTrends,
      topSuppliers
    };
  } catch (error) {
    console.error('Error getting order analytics:', error);
    throw error;
  }
};

// Supplier Analytics
export const getSupplierAnalytics = async (): Promise<SupplierAnalytics> => {
  try {
    const suppliers = mockSupplierData;
    const orders = mockOrderData;

    const activeSuppliers = suppliers.filter(s => s.status === 'active').length;

    const supplierPerformance = suppliers.map(supplier => {
      const supplierOrders = orders.filter(order => order.supplierId === supplier.id);
      const totalValue = supplierOrders.reduce((sum, order) => sum + order.totalAmount, 0);

      const deliveredOrders = supplierOrders.filter(order => order.status === 'delivered');
      const onTimeDeliveries = deliveredOrders.filter(() => Math.random() > 0.2).length;

      const onTimeRate = deliveredOrders.length > 0 ? (onTimeDeliveries / deliveredOrders.length) * 100 : 0;

      return {
        name: supplier.name,
        orders: supplierOrders.length,
        value: totalValue,
        rating: Math.min(5, Math.max(1, onTimeRate / 20)),
        onTimeRate,
        avgDeliveryTime: Math.floor(Math.random() * 10) + 3
      };
    });

    const topPerformers = supplierPerformance
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const deliveryPerformance = supplierPerformance
      .filter(s => s.orders > 0)
      .map(s => ({
        supplier: s.name,
        onTimeRate: s.onTimeRate,
        avgDeliveryTime: s.avgDeliveryTime
      }));

    return {
      totalSuppliers: suppliers.length,
      activeSuppliers,
      topPerformers,
      deliveryPerformance
    };
  } catch (error) {
    console.error('Error getting supplier analytics:', error);
    throw error;
  }
};