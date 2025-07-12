import { useState } from 'react';
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
import { Shield, User, Warehouse, ShoppingBag, ArrowRight, Trash2 } from 'lucide-react';

export default function UserProfilePage() {
  const { user, logout } = useAuth();
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestedRole, setRequestedRole] = useState<UserRole | ''>('');
  const [company, setCompany] = useState('');
  const [department, setDepartment] = useState('');
  const [reason, setReason] = useState('');

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
      const request = {
        name: user.name,
        email: user.email,
        requestedRole,
        ...(requestedRole === 'supplier' && { company }),
        ...(requestedRole === 'warehouse_staff' && { department }),
        ...(reason && { reason })
      };

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
                <div className="flex-shrink-0 h-24 w-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl font-bold text-slate-500">
                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
                
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
                        <div className="space-y-2">
                          <Label htmlFor="company">Company Name</Label>
                          <Input 
                            id="company" 
                            value={company} 
                            onChange={(e) => setCompany(e.target.value)} 
                            placeholder="Enter your company name"
                          />
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