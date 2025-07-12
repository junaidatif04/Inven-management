import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp,
  where,
  onSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Shipment {
  id: string;
  type: 'incoming' | 'outgoing';
  trackingNumber: string;
  supplier?: string;
  destination?: string;
  items: number;
  status: 'pending' | 'in_transit' | 'arriving_today' | 'ready_to_ship' | 'processing' | 'delivered' | 'cancelled';
  eta?: any;
  actualDelivery?: any;
  requestedBy?: string;
  value: number;
  notes?: string;
  createdAt: any;
  updatedAt: any;
}

export interface CreateShipment {
  type: 'incoming' | 'outgoing';
  trackingNumber: string;
  supplier?: string;
  destination?: string;
  items: number;
  eta?: Date;
  requestedBy?: string;
  value: number;
  notes?: string;
}

export interface UpdateShipment extends Partial<CreateShipment> {
  id: string;
  status?: Shipment['status'];
  actualDelivery?: Date;
}

// Shipment CRUD Operations
export const getAllShipments = async (): Promise<Shipment[]> => {
  try {
    const q = query(collection(db, 'shipments'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Shipment[];
  } catch (error) {
    console.error('Error fetching shipments:', error);
    throw error;
  }
};

export const getShipment = async (id: string): Promise<Shipment | null> => {
  try {
    const docRef = doc(db, 'shipments', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Shipment;
    }
    return null;
  } catch (error) {
    console.error('Error fetching shipment:', error);
    throw error;
  }
};

export const createShipment = async (shipment: CreateShipment): Promise<string> => {
  try {
    const status = shipment.type === 'incoming' ? 'pending' : 'processing';
    
    const docRef = await addDoc(collection(db, 'shipments'), {
      ...shipment,
      status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating shipment:', error);
    throw error;
  }
};

export const updateShipment = async (shipment: UpdateShipment): Promise<void> => {
  try {
    const { id, ...updateData } = shipment;
    
    await updateDoc(doc(db, 'shipments', id), {
      ...updateData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating shipment:', error);
    throw error;
  }
};

export const updateShipmentStatus = async (id: string, status: Shipment['status']): Promise<void> => {
  try {
    await updateDoc(doc(db, 'shipments', id), {
      status,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating shipment status:', error);
    throw error;
  }
};

export const deleteShipment = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'shipments', id));
  } catch (error) {
    console.error('Error deleting shipment:', error);
    throw error;
  }
};

// Real-time subscriptions
export const subscribeToShipments = (callback: (shipments: Shipment[]) => void) => {
  const q = query(collection(db, 'shipments'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (querySnapshot) => {
    const shipments = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Shipment[];
    callback(shipments);
  });
};

export const subscribeToShipmentsByType = (type: Shipment['type'], callback: (shipments: Shipment[]) => void) => {
  const q = query(
    collection(db, 'shipments'), 
    where('type', '==', type),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (querySnapshot) => {
    const shipments = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Shipment[];
    callback(shipments);
  });
};

// Analytics
export const getShipmentStats = async () => {
  try {
    const shipments = await getAllShipments();
    
    const stats = {
      total: shipments.length,
      incoming: shipments.filter(s => s.type === 'incoming').length,
      outgoing: shipments.filter(s => s.type === 'outgoing').length,
      pending: shipments.filter(s => s.status === 'pending').length,
      inTransit: shipments.filter(s => s.status === 'in_transit').length,
      totalValue: shipments.reduce((sum, shipment) => sum + shipment.value, 0)
    };
    
    return stats;
  } catch (error) {
    console.error('Error calculating shipment stats:', error);
    throw error;
  }
};