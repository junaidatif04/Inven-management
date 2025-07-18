import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { uploadImage, deleteImage, ImageUploadResult } from './imageUploadService';

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock?: number; // Legacy field - suppliers don't track stock anymore
  status: 'draft' | 'proposed' | 'display_requested' | 'approved' | 'rejected' | 'discontinued';
  description?: string;
  sku?: string;
  imageUrl?: string;
  imagePath?: string;
  supplierId: string;
  supplierName: string;
  displayRequestId?: string; // Link to display request if submitted
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

export interface CreateProduct {
  name: string;
  category: string;
  price: number;
  description?: string;
  sku?: string;
  imageUrl?: string;
  imagePath?: string;
  supplierId: string;
  supplierName: string;
  createdBy: string;
}

export interface UpdateProduct {
  name?: string;
  category?: string;
  price?: number;
  status?: 'draft' | 'proposed' | 'display_requested' | 'approved' | 'rejected' | 'discontinued';
  description?: string;
  sku?: string;
  imageUrl?: string;
  imagePath?: string;
  displayRequestId?: string;
}

export interface PurchaseOrder {
  id: string;
  items: PurchaseOrderItem[];
  total: number;
  requestedDate: Timestamp;
  deadline: Timestamp;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  customer: string;
  customerEmail?: string;
  notes?: string;
  supplierId: string;
  supplierName: string;
  response?: string;
  deliveryDate?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

export interface CreatePurchaseOrder {
  items: Omit<PurchaseOrderItem, 'total'>[];
  deadline: Date;
  customer: string;
  customerEmail?: string;
  notes?: string;
  supplierId: string;
  supplierName: string;
}

export interface UpdatePurchaseOrder {
  status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  response?: string;
  deliveryDate?: Date;
  items?: PurchaseOrderItem[];
}

const PRODUCTS_COLLECTION = 'products';
const PURCHASE_ORDERS_COLLECTION = 'purchaseOrders';

// Product functions
export const getAllProducts = async (): Promise<Product[]> => {
  try {
    const q = query(collection(db, PRODUCTS_COLLECTION), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Product[];
  } catch (error) {
    console.error('Error fetching products:', error);
    throw new Error('Failed to fetch products');
  }
};

// Get only proposed products for admin/warehouse staff
export const getProposedProducts = async (): Promise<Product[]> => {
  try {
    const q = query(
      collection(db, PRODUCTS_COLLECTION),
      where('status', '==', 'proposed'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Product[];
  } catch (error) {
    console.error('Error fetching proposed products:', error);
    throw new Error('Failed to fetch proposed products');
  }
};

export const getProductsBySupplier = async (supplierId: string): Promise<Product[]> => {
  try {
    const q = query(
      collection(db, PRODUCTS_COLLECTION),
      where('supplierId', '==', supplierId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Product[];
  } catch (error) {
    console.error('Error fetching products by supplier:', error);
    throw new Error('Failed to fetch products');
  }
};

export const getProduct = async (productId: string): Promise<Product | null> => {
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, productId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Product;
    }
    return null;
  } catch (error) {
    console.error('Error fetching product:', error);
    throw new Error('Failed to fetch product');
  }
};

export const createProduct = async (productData: CreateProduct): Promise<string> => {
  try {
    const now = Timestamp.now();
    
    const docRef = await addDoc(collection(db, PRODUCTS_COLLECTION), {
      ...productData,
      status: 'draft', // All new products start as draft
      createdAt: now,
      updatedAt: now
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating product:', error);
    throw new Error('Failed to create product');
  }
};

export const updateProduct = async (productId: string, updates: UpdateProduct): Promise<void> => {
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, productId);
    
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating product:', error);
    throw new Error('Failed to update product');
  }
};

export const deleteProduct = async (productId: string): Promise<void> => {
  try {
    // Get the product first to check if it has an image
    const product = await getProduct(productId);
    
    // Delete the image if it exists
    if (product?.imagePath) {
      try {
        await deleteImage(product.imagePath);
      } catch (imageError) {
        console.warn('Failed to delete product image:', imageError);
        // Continue with product deletion even if image deletion fails
      }
    }
    
    const docRef = doc(db, PRODUCTS_COLLECTION, productId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting product:', error);
    throw new Error('Failed to delete product');
  }
};

// Image upload function for products
export const uploadProductImage = async (file: File, productId?: string): Promise<ImageUploadResult> => {
  try {
    const folder = 'products';
    const fileName = productId ? `${productId}_${Date.now()}` : `product_${Date.now()}`;
    return await uploadImage(file, folder, fileName);
  } catch (error) {
    console.error('Error uploading product image:', error);
    throw new Error('Failed to upload product image');
  }
};

// Update product with new image (and optionally delete old image)
export const updateProductImage = async (productId: string, file: File): Promise<void> => {
  try {
    // Get current product to check for existing image
    const currentProduct = await getProduct(productId);
    
    // Upload new image
    const uploadResult = await uploadProductImage(file, productId);
    
    // Update product with new image data
    await updateProduct(productId, {
      imageUrl: uploadResult.url,
      imagePath: uploadResult.path
    });
    
    // Delete old image if it exists
    if (currentProduct?.imagePath && currentProduct.imagePath !== uploadResult.path) {
      try {
        await deleteImage(currentProduct.imagePath);
      } catch (imageError) {
        console.warn('Failed to delete old product image:', imageError);
        // Don't throw error, as the main operation succeeded
      }
    }
  } catch (error) {
    console.error('Error updating product image:', error);
    throw new Error('Failed to update product image');
  }
};

// Remove product image
export const removeProductImage = async (productId: string): Promise<void> => {
  try {
    const currentProduct = await getProduct(productId);
    
    if (currentProduct?.imagePath) {
      // Delete the image file
      await deleteImage(currentProduct.imagePath);
      
      // Update product to remove image references
      await updateProduct(productId, {
        imageUrl: undefined,
        imagePath: undefined
      });
    }
  } catch (error) {
    console.error('Error removing product image:', error);
    throw new Error('Failed to remove product image');
  }
};

export const searchProducts = async (searchTerm: string, category?: string): Promise<Product[]> => {
  try {
    let q = query(collection(db, PRODUCTS_COLLECTION));
    
    if (category) {
      q = query(q, where('category', '==', category));
    }
    
    const querySnapshot = await getDocs(q);
    const products = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Product[];
    
    // Filter by search term (client-side for now)
    return products.filter(product => 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  } catch (error) {
    console.error('Error searching products:', error);
    throw new Error('Failed to search products');
  }
};

// Purchase Order functions
export const getAllPurchaseOrders = async (): Promise<PurchaseOrder[]> => {
  try {
    const q = query(collection(db, PURCHASE_ORDERS_COLLECTION), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PurchaseOrder[];
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    throw new Error('Failed to fetch purchase orders');
  }
};

export const getPurchaseOrdersBySupplier = async (supplierId: string): Promise<PurchaseOrder[]> => {
  try {
    const q = query(
      collection(db, PURCHASE_ORDERS_COLLECTION),
      where('supplierId', '==', supplierId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PurchaseOrder[];
  } catch (error) {
    console.error('Error fetching purchase orders by supplier:', error);
    throw new Error('Failed to fetch purchase orders');
  }
};

export const getPurchaseOrder = async (orderId: string): Promise<PurchaseOrder | null> => {
  try {
    const docRef = doc(db, PURCHASE_ORDERS_COLLECTION, orderId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as PurchaseOrder;
    }
    return null;
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    throw new Error('Failed to fetch purchase order');
  }
};

export const createPurchaseOrder = async (orderData: CreatePurchaseOrder): Promise<string> => {
  try {
    const now = Timestamp.now();
    
    // Calculate totals for items
    const itemsWithTotals = orderData.items.map(item => ({
      ...item,
      total: item.quantity * item.price
    }));
    
    const total = itemsWithTotals.reduce((sum, item) => sum + item.total, 0);
    
    const docRef = await addDoc(collection(db, PURCHASE_ORDERS_COLLECTION), {
      ...orderData,
      items: itemsWithTotals,
      total,
      requestedDate: now,
      deadline: Timestamp.fromDate(orderData.deadline),
      status: 'pending',
      createdAt: now,
      updatedAt: now
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating purchase order:', error);
    throw new Error('Failed to create purchase order');
  }
};

export const updatePurchaseOrder = async (orderId: string, updates: UpdatePurchaseOrder): Promise<void> => {
  try {
    const docRef = doc(db, PURCHASE_ORDERS_COLLECTION, orderId);
    
    let finalUpdates: any = { ...updates };
    
    // Convert Date to Timestamp if deliveryDate is provided
    if (updates.deliveryDate) {
      finalUpdates.deliveryDate = Timestamp.fromDate(updates.deliveryDate);
    }
    
    // Recalculate total if items are updated
    if (updates.items) {
      finalUpdates.total = updates.items.reduce((sum, item) => sum + item.total, 0);
    }
    
    await updateDoc(docRef, {
      ...finalUpdates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating purchase order:', error);
    throw new Error('Failed to update purchase order');
  }
};

export const deletePurchaseOrder = async (orderId: string): Promise<void> => {
  try {
    const docRef = doc(db, PURCHASE_ORDERS_COLLECTION, orderId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting purchase order:', error);
    throw new Error('Failed to delete purchase order');
  }
};

// Real-time subscriptions
export const subscribeToProducts = (callback: (products: Product[]) => void): (() => void) => {
  const q = query(collection(db, PRODUCTS_COLLECTION), orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (querySnapshot) => {
    const products = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Product[];
    callback(products);
  }, (error) => {
    console.error('Error in products subscription:', error);
  });
};

// Subscribe to only proposed products for admin/warehouse staff
export const subscribeToProposedProducts = (callback: (products: Product[]) => void): (() => void) => {
  const q = query(
    collection(db, PRODUCTS_COLLECTION),
    where('status', '==', 'proposed'),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const products = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Product[];
    callback(products);
  }, (error) => {
    console.error('Error in proposed products subscription:', error);
  });
};

export const subscribeToProductsBySupplier = (supplierId: string, callback: (products: Product[]) => void): (() => void) => {
  // Return empty unsubscribe function if supplierId is invalid
  if (!supplierId || typeof supplierId !== 'string') {
    console.warn('Invalid supplierId provided to subscribeToProductsBySupplier:', supplierId);
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, PRODUCTS_COLLECTION),
    where('supplierId', '==', supplierId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const products = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Product[];
    callback(products);
  }, (error) => {
    console.error('Error in products by supplier subscription:', error);
    callback([]);
  });
};

export const subscribeToPurchaseOrders = (callback: (orders: PurchaseOrder[]) => void): (() => void) => {
  const q = query(collection(db, PURCHASE_ORDERS_COLLECTION), orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (querySnapshot) => {
    const orders = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PurchaseOrder[];
    callback(orders);
  }, (error) => {
    console.error('Error in purchase orders subscription:', error);
  });
};

export const subscribeToPurchaseOrdersBySupplier = (supplierId: string, callback: (orders: PurchaseOrder[]) => void): (() => void) => {
  // Return empty unsubscribe function if supplierId is invalid
  if (!supplierId || typeof supplierId !== 'string') {
    console.warn('Invalid supplierId provided to subscribeToPurchaseOrdersBySupplier:', supplierId);
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, PURCHASE_ORDERS_COLLECTION),
    where('supplierId', '==', supplierId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const orders = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PurchaseOrder[];
    callback(orders);
  }, (error) => {
    console.error('Error in purchase orders by supplier subscription:', error);
    callback([]);
  });
};

// New functions for supplier workflow
export const getProposedProductsBySupplier = async (supplierId: string): Promise<Product[]> => {
  try {
    const q = query(
      collection(db, PRODUCTS_COLLECTION),
      where('supplierId', '==', supplierId),
      where('status', '==', 'proposed'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Product[];
  } catch (error) {
    console.error('Error fetching proposed products:', error);
    throw new Error('Failed to fetch proposed products');
  }
};

export const submitProductForDisplay = async (productId: string, displayRequestId: string): Promise<void> => {
  try {
    await updateProduct(productId, {
      status: 'display_requested',
      displayRequestId
    });
  } catch (error) {
    console.error('Error submitting product for display:', error);
    throw new Error('Failed to submit product for display');
  }
};

export const updateProductStatus = async (productId: string, status: Product['status']): Promise<void> => {
  try {
    await updateProduct(productId, { status });
  } catch (error) {
    console.error('Error updating product status:', error);
    throw new Error('Failed to update product status');
  }
};

// Function to propose a draft product
export const proposeProduct = async (productId: string): Promise<void> => {
  try {
    await updateProduct(productId, { status: 'proposed' });
  } catch (error) {
    console.error('Error proposing product:', error);
    throw new Error('Failed to propose product');
  }
};

// Function to convert a proposed product back to draft
export const convertToDraft = async (productId: string): Promise<void> => {
  try {
    await updateProduct(productId, { status: 'draft' });
  } catch (error) {
    console.error('Error converting product to draft:', error);
    throw new Error('Failed to convert product to draft');
  }
};

// Get draft products by supplier
export const getDraftProductsBySupplier = async (supplierId: string): Promise<Product[]> => {
  try {
    const q = query(
      collection(db, PRODUCTS_COLLECTION),
      where('supplierId', '==', supplierId),
      where('status', '==', 'draft'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Product[];
  } catch (error) {
    console.error('Error fetching draft products by supplier:', error);
    throw new Error('Failed to fetch draft products');
  }
};