export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'warehouse_staff' | 'supplier' | 'internal_user';
  status?: 'pending' | 'approved' | 'rejected';
  department?: string;
  profilePicture?: string;
  avatar?: string;
  displayName?: string;
  isEmailVerified?: boolean;
  phone?: string;
  address?: string;
  companyName?: string;
  contactPerson?: string;
  businessType?: string;
  website?: string;
  taxId?: string;
  createdAt?: any;
  updatedAt?: any;
  lastLoginAt?: any;
}

export interface AccessRequest {
  id: string;
  name: string;
  email: string;
  requestedRole: 'admin' | 'warehouse_staff' | 'supplier' | 'internal_user';
  department?: string;
  reason?: string;
  company?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  businessType?: string;
  website?: string;
  taxId?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: any;
  reviewedAt?: any;
  reviewedBy?: string;
  rejectionReason?: string;
  signupToken?: string;
  tokenExpiry?: any;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, userData: Partial<User>) => Promise<void>;
}