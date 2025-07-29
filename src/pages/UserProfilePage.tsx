import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/services/authService';
import { UserAddress } from '@/types/auth';
import { submitAccessRequest } from '@/services/accessRequestService';
import { sendRequestConfirmationEmail } from '@/services/emailService';
import { updateUser, addUserAddress, deleteUserAddress, getUserAddresses, setDefaultAddress } from '@/services/userService';
import { deleteMyAccount } from '@/services/completeUserDeletionService';

import { getOrdersByUser } from '@/services/orderService';
import { getProposedProductsBySupplier } from '@/services/productService';
import { getQuantityRequestsBySupplier, getQuantityRequestsByRequester } from '@/services/displayRequestService';

import { Shield, User, Warehouse, ShoppingBag, ArrowRight, Trash2, Edit, Plus, MapPin, Star } from 'lucide-react';
import ProfilePictureUpload from '@/components/ProfilePictureUpload';

export default function UserProfilePage() {
  const { user, logout } = useAuth();
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestedRole, setRequestedRole] = useState<UserRole | ''>('');
  const [company, setCompany] = useState('');
  const [department, setDepartment] = useState('');
  const [reason, setReason] = useState('');
  // Supplier-specific fields for role request
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [website, setWebsite] = useState('');
  const [taxId, setTaxId] = useState('');


  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ 
    name: '', 
    phone: '', 
    address: '' 
  });
  const [hasActiveOrders, setHasActiveOrders] = useState(false);
  const [checkingOrders, setCheckingOrders] = useState(false);
  const [hasActiveProposedProducts, setHasActiveProposedProducts] = useState(false);
  const [hasActiveQuantityRequests, setHasActiveQuantityRequests] = useState(false);
  const [checkingSupplierActivities, setCheckingSupplierActivities] = useState(false);
  const [hasActiveWarehouseRequests, setHasActiveWarehouseRequests] = useState(false);
  const [checkingWarehouseActivities, setCheckingWarehouseActivities] = useState(false);

  // Address management state
  const [userAddresses, setUserAddresses] = useState<UserAddress[]>([]);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newAddressForm, setNewAddressForm] = useState({ label: '', place: '', area: '', zipCode: '' });
  const [loadingAddresses, setLoadingAddresses] = useState(false);


  useEffect(() => {
    if (user) {
      // Check supplier activities if user is a supplier
      if (user.role === 'supplier') {
        checkSupplierActivities();
      }
      // Check for active orders if user is an internal user
      if (user.role === 'internal_user') {
        checkActiveOrders();
        loadUserAddresses();
      }
      // Check for active quantity requests if user is warehouse staff
      if (user.role === 'warehouse_staff') {
        checkWarehouseActivities();
      }
      // Update profile form with latest user data (real-time updates)
      setProfileForm({ 
        name: user.name || '', 
        phone: user.phone || '', 
        address: user.address || '' 
      });
    }
  }, [user]);

  // Sync profile form when entering edit mode to ensure latest data
  useEffect(() => {
    if (isEditingProfile && user) {
      setProfileForm({ 
        name: user.name || '', 
        phone: user.phone || '', 
        address: user.address || '' 
      });
    }
  }, [isEditingProfile, user]);

  const loadUserAddresses = async () => {
    if (!user?.id || user.role !== 'internal_user') return;
    
    setLoadingAddresses(true);
    try {
      const addresses = await getUserAddresses(user.id);
      setUserAddresses(addresses);
    } catch (error) {
      console.error('Error loading user addresses:', error);
      toast.error('Failed to load addresses');
    } finally {
      setLoadingAddresses(false);
    }
  };

  const checkActiveOrders = async () => {
    if (!user?.id || user.role !== 'internal_user') return;
    
    console.log('Checking active orders for user:', user.id, 'role:', user.role);
    setCheckingOrders(true);
    try {
      const orders = await getOrdersByUser(user.id);
      console.log('All orders:', orders);
      // Check for orders that are not delivered, cancelled, or rejected
      const activeOrders = orders.filter(order => 
        !['delivered', 'cancelled', 'rejected'].includes(order.status)
      );
      console.log('Active orders:', activeOrders);
      setHasActiveOrders(activeOrders.length > 0);
      console.log('Final state - hasActiveOrders:', activeOrders.length > 0);
    } catch (error) {
      console.error('Error checking active orders:', error);
      // On error, assume no active orders to not block the user unnecessarily
      setHasActiveOrders(false);
    } finally {
      setCheckingOrders(false);
    }
  };

  const checkSupplierActivities = async () => {
    if (!user?.id) return;
    
    console.log('Checking supplier activities for user:', user.id, 'role:', user.role);
    setCheckingSupplierActivities(true);
    try {
      // Check for active proposed products
      const proposedProducts = await getProposedProductsBySupplier(user.id);
      console.log('Proposed products:', proposedProducts);
      const activeProposedProducts = proposedProducts.filter(product => 
        product.status === 'proposed'
      );
      console.log('Active proposed products:', activeProposedProducts);
      setHasActiveProposedProducts(activeProposedProducts.length > 0);

      // Check for active quantity requests
      const quantityRequests = await getQuantityRequestsBySupplier(user.id);
      console.log('Quantity requests:', quantityRequests);
      const activeQuantityRequests = quantityRequests.filter(request => 
        request.status === 'pending'
      );
      console.log('Active quantity requests:', activeQuantityRequests);
      setHasActiveQuantityRequests(activeQuantityRequests.length > 0);
      
      console.log('Final state - hasActiveProposedProducts:', activeProposedProducts.length > 0, 'hasActiveQuantityRequests:', activeQuantityRequests.length > 0);
    } catch (error) {
      console.error('Error checking supplier activities:', error);
      // On error, assume no active activities to not block the user unnecessarily
      setHasActiveProposedProducts(false);
      setHasActiveQuantityRequests(false);
    } finally {
      setCheckingSupplierActivities(false);
    }
  };

  const checkWarehouseActivities = async () => {
    if (!user?.id || user.role !== 'warehouse_staff') return;
    
    setCheckingWarehouseActivities(true);
    try {
      // Check for active quantity requests made by warehouse staff
      const quantityRequests = await getQuantityRequestsByRequester(user.id);
      const activeRequests = quantityRequests.filter(request => 
        request.status === 'pending'
      );
      setHasActiveWarehouseRequests(activeRequests.length > 0);
    } catch (error) {
      console.error('Error checking warehouse activities:', error);
      // On error, assume no active activities to not block the user unnecessarily
      setHasActiveWarehouseRequests(false);
    } finally {
      setCheckingWarehouseActivities(false);
    }
  };



  const handleUpdateProfile = async () => {
    if (!user) return;
    
    setIsSubmitting(true);
    
    try {
      await updateUser({
        id: user.id,
        name: profileForm.name,
        phone: profileForm.phone,
        address: profileForm.address
      });
      
      // Real-time listener will automatically update user data
      toast.success('Profile updated successfully');
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAddress = async () => {
    if (!user?.id || !newAddressForm.label.trim() || !newAddressForm.place.trim() || !newAddressForm.area.trim() || !newAddressForm.zipCode.trim()) {
      toast.error('Please fill in all address fields');
      return;
    }

    if (userAddresses.length >= 5) {
      toast.error('Maximum of 5 addresses allowed');
      return;
    }

    try {
      const newAddress: UserAddress = {
        id: Date.now().toString(),
        label: newAddressForm.label.trim(),
        place: newAddressForm.place.trim(),
        area: newAddressForm.area.trim(),
        zipCode: newAddressForm.zipCode.trim(),
        isDefault: userAddresses.length === 0
      };

      await addUserAddress(user.id, newAddress);
      await loadUserAddresses();
      setNewAddressForm({ label: '', place: '', area: '', zipCode: '' });
      setIsAddingAddress(false);
      toast.success('Address added successfully');
    } catch (error) {
      console.error('Error adding address:', error);
      toast.error('Failed to add address');
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!user?.id) return;

    try {
      await deleteUserAddress(user.id, addressId);
      await loadUserAddresses();
      toast.success('Address deleted successfully');
    } catch (error) {
      console.error('Error deleting address:', error);
      toast.error('Failed to delete address');
    }
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    if (!user?.id) return;

    try {
      await setDefaultAddress(user.id, addressId);
      await loadUserAddresses();
      toast.success('Default address updated');
    } catch (error) {
      console.error('Error setting default address:', error);
      toast.error('Failed to update default address');
    }
  };

  if (!user) {
    return null;
  }

  const getRoleDisplayName = (role: string): string => {
    switch (role) {
      case 'warehouse_staff': return 'Warehouse Staff';
      case 'supplier': return 'Supplier';
      case 'internal_user': return 'Internal User';
      case 'admin': return 'Administrator';
      default: return role;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'warehouse_staff':
        return 'default';
      case 'supplier':
        return 'secondary';
      case 'internal_user':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-5 w-5 text-red-500" />;
      case 'warehouse_staff':
        return <Warehouse className="h-5 w-5 text-blue-500" />;
      case 'supplier':
        return <ShoppingBag className="h-5 w-5 text-purple-500" />;
      case 'internal_user':
        return <User className="h-5 w-5 text-green-500" />;
      default:
        return <User className="h-5 w-5 text-gray-500" />;
    }
  };

  const handleRequestSubmit = async () => {
    if (!requestedRole) {
      toast.error('Please select a role');
      return;
    }

    // Check for restrictions based on current user role
    if (user.role === 'internal_user' && hasActiveOrders) {
      toast.error('Cannot request role access while you have active orders. Please wait for all orders to be completed, cancelled, or rejected.');
      return;
    }
    
    if (user.role === 'supplier' && (hasActiveProposedProducts || hasActiveQuantityRequests)) {
      const restrictions = [];
      if (hasActiveProposedProducts) restrictions.push('proposed products');
      if (hasActiveQuantityRequests) restrictions.push('pending quantity requests');
      toast.error(`Cannot request role access while you have active ${restrictions.join(' and ')}. Please resolve these first.`);
      return;
    }
    
    if (user.role === 'warehouse_staff' && hasActiveWarehouseRequests) {
      toast.error('Cannot request role access while you have active quantity requests. Please wait for all requests to be resolved.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the request object
      const request: any = {
        name: user.name,
        email: user.email,
        requestedRole,
      };

      // Add role-specific fields
      if (requestedRole === 'supplier') {
        if (company && company.trim()) request.company = company.trim();
        if (phone && phone.trim()) request.phone = phone.trim();
        if (address && address.trim()) request.address = address.trim();
        if (contactPerson && contactPerson.trim()) request.contactPerson = contactPerson.trim();
        if (businessType && businessType.trim()) request.businessType = businessType.trim();
        if (website && website.trim()) request.website = website.trim();
        if (taxId && taxId.trim()) request.taxId = taxId.trim();
      }
      
      if (requestedRole === 'warehouse_staff' && department && department.trim()) {
        request.department = department.trim();
      }
      
      if (reason && reason.trim()) {
        request.reason = reason.trim();
      }

      // Submit the request
      const requestId = await submitAccessRequest(request);

      // Send confirmation email
      await sendRequestConfirmationEmail({
        ...request,
        id: requestId,
        status: 'pending',
        createdAt: new Date()
      });

      // Close dialog and show success message
      setIsRequestDialogOpen(false);
      toast.success('Access request submitted successfully');

      // Reset form
      setRequestedRole('');
      setCompany('');
      setDepartment('');
      setReason('');
      setPhone('');
      setAddress('');
      setContactPerson('');
      setBusinessType('');
      setWebsite('');
      setTaxId('');
    } catch (error) {
      console.error('Error submitting access request:', error);
      toast.error('Failed to submit access request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    console.log('Delete account attempt - User role:', user.role);
    console.log('State values - hasActiveOrders:', hasActiveOrders, 'hasActiveProposedProducts:', hasActiveProposedProducts, 'hasActiveQuantityRequests:', hasActiveQuantityRequests, 'hasActiveWarehouseRequests:', hasActiveWarehouseRequests);
    
    // Check for restrictions based on user role
    if (user.role === 'internal_user' && hasActiveOrders) {
      toast.error('Cannot delete account while you have active orders. Please wait for all orders to be completed, cancelled, or rejected.');
      return;
    }
    
    if (user.role === 'supplier' && (hasActiveProposedProducts || hasActiveQuantityRequests)) {
      const restrictions = [];
      if (hasActiveProposedProducts) restrictions.push('proposed products');
      if (hasActiveQuantityRequests) restrictions.push('pending quantity requests');
      console.log('Supplier deletion blocked due to:', restrictions);
      toast.error(`Cannot delete account while you have active ${restrictions.join(' and ')}. Please resolve these first.`);
      return;
    }
    
    if (user.role === 'warehouse_staff' && hasActiveWarehouseRequests) {
      toast.error('Cannot delete account while you have active quantity requests. Please wait for all requests to be resolved.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Delete the user and all related data using comprehensive deletion
      const result = await deleteMyAccount(user.id);
      
      // Sign out the user
      await logout();
      
      // Close dialog and show success message with details
      setIsDeleteAccountDialogOpen(false);
      toast.success(`Account deleted successfully. Removed: ${result.deletedItems.join(', ')}`);
      
      // Redirect to home or login page will happen automatically due to AuthContext
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete your account. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground">
            View and manage your account information
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="space-y-6 pb-6">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Your personal information and current role
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <ProfilePictureUpload 
                    currentImageUrl={user.profilePicture || user.avatar}
                    userName={user.name}
                    size="lg"
                    showUploadButton={true}
                  />
                  
                  <div className="space-y-1">
                  <h3 className="text-xl font-semibold">{user.name}</h3>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    {getRoleIcon(user.role)}
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {getRoleDisplayName(user.role)}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Account Details</h4>
                  {!isEditingProfile && (
                    <Button variant="outline" size="sm" onClick={() => setIsEditingProfile(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
                
                {isEditingProfile ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="profileName">Name</Label>
                      <Input
                        id="profileName"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter your name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profilePhone">Phone Number</Label>
                      <Input
                        id="profilePhone"
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Enter your phone number"
                      />
                    </div>
                    {user.role !== 'internal_user' && (
                      <div className="space-y-2">
                        <Label htmlFor="profileAddress">Address</Label>
                        <Textarea
                          id="profileAddress"
                          value={profileForm.address}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, address: e.target.value }))}
                          placeholder="Enter your address"
                          rows={3}
                        />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button onClick={handleUpdateProfile} disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditingProfile(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Name</p>
                      <p className="text-sm">{user.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <p className="text-sm">{user.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Phone Number</p>
                      <p className="text-sm">{user.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Role</p>
                      <p className="text-sm">{getRoleDisplayName(user.role)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Member Since</p>
                      <p className="text-sm">{user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    {user.role !== 'internal_user' && (
                      <div className="md:col-span-2">
                        <p className="text-sm font-medium text-muted-foreground">Address</p>
                        <p className="text-sm">{user.address || 'Not provided'}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Address Management Section - Only for Internal Users */}
              {user.role === 'internal_user' && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Saved Addresses</h4>
                        <p className="text-xs text-muted-foreground">Manage your delivery addresses (max 5)</p>
                      </div>
                      {userAddresses.length < 5 && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setIsAddingAddress(true)}
                          disabled={loadingAddresses}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Address
                        </Button>
                      )}
                    </div>

                    {loadingAddresses ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground">Loading addresses...</p>
                      </div>
                    ) : userAddresses.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                        <MapPin className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground mb-2">No saved addresses</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setIsAddingAddress(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Your First Address
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {userAddresses.map((address) => (
                          <div 
                            key={address.id} 
                            className="flex items-start justify-between p-3 border rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-sm">{address.label}</p>
                                {address.isDefault && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Star className="h-3 w-3 mr-1" />
                                    Default
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {address.place}, {address.area}, {address.zipCode}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {!address.isDefault && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSetDefaultAddress(address.id)}
                                  className="text-xs"
                                >
                                  Set Default
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteAddress(address.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Address Dialog */}
                    <Dialog open={isAddingAddress} onOpenChange={setIsAddingAddress}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Address</DialogTitle>
                          <DialogDescription>
                            Add a new delivery address to your saved addresses.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="addressLabel">Address Label</Label>
                            <Input
                              id="addressLabel"
                              value={newAddressForm.label}
                              onChange={(e) => setNewAddressForm(prev => ({ ...prev, label: e.target.value }))}
                              placeholder="e.g., Home, Office, Warehouse"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="place">Place/Building</Label>
                            <Input
                              id="place"
                              value={newAddressForm.place}
                              onChange={(e) => setNewAddressForm(prev => ({ ...prev, place: e.target.value }))}
                              placeholder="e.g., Building A, Floor 3, Room 301"
                              maxLength={50}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="area">Area/District</Label>
                            <Input
                              id="area"
                              value={newAddressForm.area}
                              onChange={(e) => setNewAddressForm(prev => ({ ...prev, area: e.target.value }))}
                              placeholder="e.g., Downtown, Business District"
                              maxLength={30}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="zipCode">ZIP Code</Label>
                            <Input
                              id="zipCode"
                              value={newAddressForm.zipCode}
                              onChange={(e) => setNewAddressForm(prev => ({ ...prev, zipCode: e.target.value }))}
                              placeholder="e.g., 12345"
                              maxLength={10}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => {
                            setIsAddingAddress(false);
                            setNewAddressForm({ label: '', place: '', area: '', zipCode: '' });
                          }}>
                            Cancel
                          </Button>
                          <Button onClick={handleAddAddress}>
                            Add Address
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </>
              )}

              {/* Activity Restrictions Warning */}
              {((user.role === 'internal_user' && hasActiveOrders) || 
                (user.role === 'supplier' && (hasActiveProposedProducts || hasActiveQuantityRequests)) ||
                (user.role === 'warehouse_staff' && hasActiveWarehouseRequests)) && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <strong>Important:</strong> You have active {user.role === 'internal_user' ? 'orders' : user.role === 'supplier' ? 'proposed products or quantity requests' : 'warehouse requests'}. 
                    Role access requests and account deletion are temporarily disabled. 
                    {user.role === 'internal_user' && 'Please wait until all your orders are completed, cancelled, or rejected.'}
                    {user.role === 'supplier' && 'Please remove or delete all your active proposed products and clear out any active quantity requests.'}
                    {user.role === 'warehouse_staff' && 'Please complete or resolve all pending requests.'}
                  </p>
                </div>
              )}

              {/* Request Access Section */}
              {user.role !== 'admin' && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Role Access</h4>
                  <p className="text-sm text-muted-foreground">
                    Need access to additional features? Request a role change below.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          disabled={
                            (user.role === 'internal_user' && (hasActiveOrders || checkingOrders)) ||
                            (user.role === 'supplier' && (hasActiveProposedProducts || hasActiveQuantityRequests || checkingSupplierActivities)) ||
                            (user.role === 'warehouse_staff' && (hasActiveWarehouseRequests || checkingWarehouseActivities))
                          }
                        >
                          {checkingOrders ? 'Checking Orders...' :
                           checkingSupplierActivities ? 'Checking Activities...' :
                           checkingWarehouseActivities ? 'Checking Requests...' :
                           'Request Role Access'}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Request Role Access</DialogTitle>
                        <DialogDescription>
                          Submit a request for additional access privileges. An administrator will review your request.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="role">Requested Role</Label>
                          <Select 
                            value={requestedRole} 
                            onValueChange={(value) => setRequestedRole(value as UserRole)}
                          >
                            <SelectTrigger id="role">
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="warehouse_staff">Warehouse Staff</SelectItem>
                              <SelectItem value="supplier">Supplier</SelectItem>
                              <SelectItem value="internal_user">Internal User</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                      {requestedRole === 'supplier' && (
                        <div className="space-y-4">
                          <h4 className="text-sm font-medium">Supplier Information</h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="contactPerson">Contact Person</Label>
                              <Input 
                                id="contactPerson" 
                                value={contactPerson} 
                                onChange={(e) => setContactPerson(e.target.value)} 
                                placeholder="Primary contact person"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="phone">Phone Number</Label>
                              <Input 
                                id="phone" 
                                type="tel"
                                value={phone} 
                                onChange={(e) => setPhone(e.target.value)} 
                                placeholder="Enter phone number"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {requestedRole === 'warehouse_staff' && (
                        <div className="space-y-2">
                          <Label htmlFor="department">Department</Label>
                          <Input 
                            id="department" 
                            value={department} 
                            onChange={(e) => setDepartment(e.target.value)} 
                            placeholder="Enter your department"
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="reason">Reason for Request (Optional)</Label>
                        <Textarea 
                          id="reason" 
                          value={reason} 
                          onChange={(e) => setReason(e.target.value)} 
                          placeholder="Explain why you need this access"
                          rows={4}
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsRequestDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleRequestSubmit} disabled={isSubmitting || !requestedRole}>
                        {isSubmitting ? 'Submitting...' : 'Submit Request'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                  </div>
                </div>
              )}
                
              {/* Delete Account Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-destructive">Delete Account</h4>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
              
                <Dialog open={isDeleteAccountDialogOpen} onOpenChange={setIsDeleteAccountDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="destructive"
                      disabled={
                        (user.role === 'internal_user' && (hasActiveOrders || checkingOrders)) ||
                        (user.role === 'supplier' && (hasActiveProposedProducts || hasActiveQuantityRequests || checkingSupplierActivities)) ||
                        (user.role === 'warehouse_staff' && (hasActiveWarehouseRequests || checkingWarehouseActivities))
                      }
                    >
                      {checkingOrders ? 'Checking Orders...' :
                       checkingSupplierActivities ? 'Checking Activities...' :
                       checkingWarehouseActivities ? 'Checking Requests...' :
                       'Delete Account'}
                      <Trash2 className="ml-2 h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete Account</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <DialogFooter className="mt-6">
                      <Button variant="outline" onClick={() => setIsDeleteAccountDialogOpen(false)}>Cancel</Button>
                      <Button variant="destructive" onClick={handleDeleteAccount} disabled={isSubmitting}>
                        {isSubmitting ? 'Deleting...' : 'Delete Account'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}