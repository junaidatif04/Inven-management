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
import { submitAccessRequest } from '@/services/accessRequestService';
import { sendRequestConfirmationEmail } from '@/services/emailService';
import { deleteUser } from '@/services/userService';
import { getSupplierByEmail, updateSupplier } from '@/services/supplierService';
import { Supplier } from '@/types/inventory';
import { Shield, User, Warehouse, ShoppingBag, ArrowRight, Trash2 } from 'lucide-react';
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
  const [supplierData, setSupplierData] = useState<Supplier | null>(null);
  const [isEditingSupplier, setIsEditingSupplier] = useState(false);
  const [supplierForm, setSupplierForm] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    if (user) {
      // Load supplier data if user is a supplier
      if (user.role === 'supplier') {
        loadSupplierData();
      }
    }
  }, [user]);

  const loadSupplierData = async () => {
    if (!user?.email) return;
    
    try {
      const supplier = await getSupplierByEmail(user.email);
      if (supplier) {
        setSupplierData(supplier);
        setSupplierForm({
          companyName: supplier.companyName || '',
          contactPerson: supplier.contactPerson || '',
          email: supplier.email || '',
          phone: supplier.phone || '',
          address: supplier.address || ''
        });
      }
    } catch (error) {
      console.error('Error loading supplier data:', error);
    }
  };

  const handleUpdateSupplierInfo = async () => {
    if (!supplierData?.id) return;
    
    setIsSubmitting(true);
    try {
      await updateSupplier({
        id: supplierData.id,
        ...supplierForm
      });
      
      setSupplierData(prev => prev ? { ...prev, ...supplierForm } : null);
      setIsEditingSupplier(false);
      toast.success('Supplier information updated successfully!');
    } catch (error) {
      console.error('Error updating supplier info:', error);
      toast.error('Failed to update supplier information. Please try again.');
    } finally {
      setIsSubmitting(false);
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
    
    setIsSubmitting(true);
    
    try {
      // Delete the user from Firestore and Firebase Authentication
      await deleteUser(user.id);
      
      // Sign out the user
      await logout();
      
      // Close dialog and show success message
      setIsDeleteAccountDialogOpen(false);
      toast.success('Your account has been deleted successfully');
      
      // Redirect to home or login page will happen automatically due to AuthContext
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete your account. Please try again later.');
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
                <h4 className="text-sm font-medium">Account Details</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Name</p>
                    <p className="text-sm">{user.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="text-sm">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Role</p>
                    <p className="text-sm">{getRoleDisplayName(user.role)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Member Since</p>
                    <p className="text-sm">{user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Supplier Information Section */}
              {user.role === 'supplier' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Supplier Information</h4>
                    {!isEditingSupplier && (
                      <Button variant="outline" size="sm" onClick={() => setIsEditingSupplier(true)}>
                        Edit
                      </Button>
                    )}
                  </div>
                  
                  {supplierData ? (
                    <div className="space-y-4">
                      {isEditingSupplier ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="companyName">Company Name</Label>
                              <Input
                                id="companyName"
                                value={supplierForm.companyName}
                                onChange={(e) => setSupplierForm(prev => ({ ...prev, companyName: e.target.value }))}
                                placeholder="Enter company name"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="contactPerson">Contact Person</Label>
                              <Input
                                id="contactPerson"
                                value={supplierForm.contactPerson}
                                onChange={(e) => setSupplierForm(prev => ({ ...prev, contactPerson: e.target.value }))}
                                placeholder="Enter contact person"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="supplierEmail">Email</Label>
                              <Input
                                id="supplierEmail"
                                value={supplierForm.email}
                                onChange={(e) => setSupplierForm(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="Enter email"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="phone">Phone</Label>
                              <Input
                                id="phone"
                                value={supplierForm.phone}
                                onChange={(e) => setSupplierForm(prev => ({ ...prev, phone: e.target.value }))}
                                placeholder="Enter phone number"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="address">Address</Label>
                            <Textarea
                              id="address"
                              value={supplierForm.address}
                              onChange={(e) => setSupplierForm(prev => ({ ...prev, address: e.target.value }))}
                              placeholder="Enter address"
                              rows={3}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleUpdateSupplierInfo} disabled={isSubmitting}>
                              {isSubmitting ? 'Saving...' : 'Save Changes'}
                            </Button>
                            <Button variant="outline" onClick={() => setIsEditingSupplier(false)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Company Name</p>
                            <p className="text-sm">{supplierData.companyName || 'Not specified'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Contact Person</p>
                            <p className="text-sm">{supplierData.contactPerson || 'Not specified'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Email</p>
                            <p className="text-sm">{supplierData.email || 'Not specified'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Phone</p>
                            <p className="text-sm">{supplierData.phone || 'Not specified'}</p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-sm font-medium text-muted-foreground">Address</p>
                            <p className="text-sm">{supplierData.address || 'Not specified'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Status</p>
                            <Badge variant={supplierData.status === 'active' ? 'default' : 'secondary'}>
                              {supplierData.status || 'Unknown'}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No supplier information found. Please contact an administrator.
                    </p>
                  )}
                </div>
              )}

              {user.role === 'supplier' && <Separator />}

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
                        <Button>
                          Request Role Access
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
                              <Label htmlFor="company">Company Name *</Label>
                              <Input 
                                id="company" 
                                value={company} 
                                onChange={(e) => setCompany(e.target.value)} 
                                placeholder="Enter your company name"
                                required
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="contactPerson">Contact Person</Label>
                              <Input 
                                id="contactPerson" 
                                value={contactPerson} 
                                onChange={(e) => setContactPerson(e.target.value)} 
                                placeholder="Primary contact person"
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            
                            <div className="space-y-2">
                              <Label htmlFor="businessType">Business Type</Label>
                              <Select value={businessType} onValueChange={setBusinessType}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select business type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="manufacturer">Manufacturer</SelectItem>
                                  <SelectItem value="distributor">Distributor</SelectItem>
                                  <SelectItem value="wholesaler">Wholesaler</SelectItem>
                                  <SelectItem value="retailer">Retailer</SelectItem>
                                  <SelectItem value="service_provider">Service Provider</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="address">Business Address</Label>
                            <Textarea 
                              id="address" 
                              value={address} 
                              onChange={(e) => setAddress(e.target.value)} 
                              placeholder="Enter your business address"
                              rows={2}
                            />
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="website">Website (Optional)</Label>
                              <Input 
                                id="website" 
                                type="url"
                                value={website} 
                                onChange={(e) => setWebsite(e.target.value)} 
                                placeholder="https://www.yourcompany.com"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="taxId">Tax ID / Registration Number</Label>
                              <Input 
                                id="taxId" 
                                value={taxId} 
                                onChange={(e) => setTaxId(e.target.value)} 
                                placeholder="Enter tax ID or registration number"
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
                
              <div className="flex flex-col sm:flex-row gap-4">
                <Dialog open={isDeleteAccountDialogOpen} onOpenChange={setIsDeleteAccountDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive">
                      Delete Account
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