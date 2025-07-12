import { createProduct, CreateProduct } from '../services/productService';
import { createSupplier, CreateSupplier } from '../services/supplierService';

// Sample products to populate the database
const sampleProducts: Omit<CreateProduct, 'supplierId' | 'supplierName' | 'createdBy'>[] = [
  {
    name: 'Wireless Mouse',
    category: 'Electronics',
    price: 29.99,
    stock: 50,
    description: 'Ergonomic wireless mouse with long battery life',
    sku: 'WM001'
  },
  {
    name: 'Office Chair',
    category: 'Furniture',
    price: 199.99,
    stock: 25,
    description: 'Comfortable ergonomic office chair with lumbar support',
    sku: 'OC001'
  },
  {
    name: 'Notebook Set',
    category: 'Office Supplies',
    price: 12.99,
    stock: 100,
    description: 'Set of 3 lined notebooks for office use',
    sku: 'NB001'
  },
  {
    name: 'USB-C Hub',
    category: 'Electronics',
    price: 49.99,
    stock: 30,
    description: 'Multi-port USB-C hub with HDMI and USB 3.0 ports',
    sku: 'UH001'
  },
  {
    name: 'Desk Lamp',
    category: 'Accessories',
    price: 39.99,
    stock: 40,
    description: 'LED desk lamp with adjustable brightness',
    sku: 'DL001'
  },
  {
    name: 'Whiteboard Markers',
    category: 'Office Supplies',
    price: 8.99,
    stock: 75,
    description: 'Pack of 4 dry erase markers in assorted colors',
    sku: 'WM002'
  },
  {
    name: 'Monitor Stand',
    category: 'Accessories',
    price: 34.99,
    stock: 20,
    description: 'Adjustable monitor stand with storage compartment',
    sku: 'MS001'
  },
  {
    name: 'Wireless Keyboard',
    category: 'Electronics',
    price: 79.99,
    stock: 35,
    description: 'Compact wireless keyboard with backlight',
    sku: 'WK001'
  }
];

export const createSampleProducts = async (userId: string, userName: string) => {
  try {
    console.log('Creating sample products...');
    
    for (const product of sampleProducts) {
      const productData: CreateProduct = {
        ...product,
        supplierId: userId,
        supplierName: userName,
        createdBy: userId
      };
      
      await createProduct(productData);
      console.log(`Created product: ${product.name}`);
    }
    
    console.log('Sample products created successfully!');
    return true;
  } catch (error) {
    console.error('Error creating sample products:', error);
    throw error;
  }
};

// Sample suppliers to populate the database
const sampleSuppliers: CreateSupplier[] = [
  {
    name: 'TechCorp Solutions',
    email: 'contact@techcorp.com',
    phone: '+1-555-0123',
    address: '123 Technology Drive, Silicon Valley, CA 94025',
    contactPerson: 'John Smith'
  },
  {
    name: 'Office Furniture Plus',
    email: 'sales@officefurnitureplus.com',
    phone: '+1-555-0456',
    address: '456 Business Blvd, Chicago, IL 60601',
    contactPerson: 'Sarah Johnson'
  },
  {
    name: 'Global Supplies Inc',
    email: 'orders@globalsupplies.com',
    phone: '+1-555-0789',
    address: '789 Commerce Street, New York, NY 10001',
    contactPerson: 'Michael Brown'
  },
  {
    name: 'Electronics Warehouse',
    email: 'info@electronicswarehouse.com',
    phone: '+1-555-0321',
    address: '321 Electronics Ave, Austin, TX 73301',
    contactPerson: 'Emily Davis'
  },
  {
    name: 'Premium Office Solutions',
    email: 'support@premiumoffice.com',
    phone: '+1-555-0654',
    address: '654 Corporate Plaza, Seattle, WA 98101',
    contactPerson: 'David Wilson'
  }
];

export const createSampleSuppliers = async () => {
  try {
    console.log('Creating sample suppliers...');
    
    for (const supplier of sampleSuppliers) {
      await createSupplier(supplier);
      console.log(`Created supplier: ${supplier.name}`);
    }
    
    console.log('Sample suppliers created successfully!');
    return true;
  } catch (error) {
    console.error('Error creating sample suppliers:', error);
    throw error;
  }
};

export { sampleProducts, sampleSuppliers };