import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';


import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  Trash2, 
  Users, 
  Shield,
  UserCog,
  Clock,
  Mail,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { User, UserRole } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import {
  getAllUsers,
  updateUserRole,
  getUserStats
} from '@/services/userService';
import { adminCompleteUserDeletion } from '@/services/completeUserDeletionService';
import { cleanupUserDataForRoleChange, checkUserDataForRoleChange } from '@/services/roleChangeCleanupService';

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const { refreshNotificationsForRoleChange } = useNotifications();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [stats, setStats] = useState({
    total: 0,
    admin: 0,
    warehouse_staff: 0,
    supplier: 0,
    internal_user: 0
  });
  
  // Dialog states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  useEffect(() => {
    loadUsers();
    loadStats();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, filterRole]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getAllUsers();
      setUsers(data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await getUserStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load user stats:', error);
    }
  };

  const filterUsers = () => {
    let filtered = users;
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply role filter
    if (filterRole !== 'all') {
      filtered = filtered.filter(user => user.role === filterRole);
    }
    
    setFilteredUsers(filtered);
  };



  const handleDeleteUser = async () => {
    try {
      if (!selectedUser) return;
      
      // Prevent deleting current user
      if (selectedUser.id === currentUser?.id) {
        toast.error('You cannot delete your own account. Please use the Delete Account option in your profile page.');
        return;
      }
      
      setIsDeletingUser(true);
      
      // Use the comprehensive admin delete function that removes all user data
      const result = await adminCompleteUserDeletion(selectedUser.id);
      
      toast.success(`User deleted successfully. Removed: ${result.deletedItems.join(', ')}`);
      
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
      loadUsers();
      loadStats();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete user';
      toast.error(errorMessage);
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Role change confirmation dialog states
  const [isRoleChangeDialogOpen, setIsRoleChangeDialogOpen] = useState(false);
  const [roleChangeData, setRoleChangeData] = useState<{
    userId: string;
    user: User;
    newRole: UserRole;
    oldRole: UserRole;
    itemsToDelete: string[];
  } | null>(null);
  const [isChangingRole, setIsChangingRole] = useState(false);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      // Prevent changing own role
      if (userId === currentUser?.id) {
        toast.error('You cannot change your own role');
        return;
      }
      
      // Find the user to get their current role
      const user = users.find(u => u.id === userId);
      if (!user) {
        toast.error('User not found');
        return;
      }
      
      const oldRole = user.role;
      
      // Check if this role change requires data cleanup
      const needsCleanup = 
        (oldRole === 'internal_user' && newRole === 'supplier') ||
        (oldRole === 'supplier' && newRole === 'internal_user');
      
      if (needsCleanup) {
        // Check what data would be affected
        const dataCheck = await checkUserDataForRoleChange(userId, oldRole, newRole);
        
        if (dataCheck.orders > 0 || dataCheck.products > 0 || dataCheck.requests > 0) {
          const itemsToDelete = [];
          if (dataCheck.orders > 0) itemsToDelete.push(`${dataCheck.orders} orders`);
          if (dataCheck.products > 0) itemsToDelete.push(`${dataCheck.products} products`);
          if (dataCheck.requests > 0) itemsToDelete.push(`${dataCheck.requests} requests`);
          
          // Show in-system dialog instead of window.confirm
          setRoleChangeData({
            userId,
            user,
            newRole,
            oldRole,
            itemsToDelete
          });
          setIsRoleChangeDialogOpen(true);
          return;
        }
      }
      
      // No cleanup needed or no data to delete, proceed directly
      await performRoleChange(userId, oldRole, newRole);
      
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    }
  };

  const performRoleChange = async (userId: string, oldRole: UserRole, newRole: UserRole) => {
    try {
      setIsChangingRole(true);
      
      // Check if this role change requires data cleanup
      const needsCleanup = 
        (oldRole === 'internal_user' && newRole === 'supplier') ||
        (oldRole === 'supplier' && newRole === 'internal_user');
      
      if (needsCleanup) {
        // Perform cleanup and role change
        const cleanupResult = await cleanupUserDataForRoleChange(userId, oldRole, newRole);
        
        if (!cleanupResult.success) {
          toast.error(cleanupResult.message);
          return;
        }
        
        // Update the role after successful cleanup
        await updateUserRole(userId, newRole);
        toast.success(cleanupResult.message);
        
        // If the role change affects the current user, refresh their notifications
        if (userId === currentUser?.id) {
          await refreshNotificationsForRoleChange();
        }
      } else {
        // No cleanup needed, just update the role
        await updateUserRole(userId, newRole);
        toast.success('User role updated successfully');
        
        // If the role change affects the current user, refresh their notifications
        if (userId === currentUser?.id) {
          await refreshNotificationsForRoleChange();
        }
      }
      
      loadUsers();
      loadStats();
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    } finally {
      setIsChangingRole(false);
    }
  };

  const handleConfirmRoleChange = async () => {
    if (!roleChangeData) return;
    
    await performRoleChange(roleChangeData.userId, roleChangeData.oldRole, roleChangeData.newRole);
    setIsRoleChangeDialogOpen(false);
    setRoleChangeData(null);
  };





  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Never';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Users className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage user accounts, roles, and permissions</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.admin}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warehouse Staff</CardTitle>
            <UserCog className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.warehouse_staff}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suppliers</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.supplier}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Internal Users</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.internal_user}</div>
          </CardContent>
        </Card>
        

      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="warehouse_staff">Warehouse Staff</SelectItem>
                <SelectItem value="supplier">Supplier</SelectItem>
                <SelectItem value="internal_user">Internal User</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>System Users</CardTitle>
          <CardDescription>
            Manage user accounts, roles, and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No users found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">{user.name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(newRole: UserRole) => handleRoleChange(user.id, newRole)}
                        disabled={user.id === currentUser?.id}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="warehouse_staff">Warehouse Staff</SelectItem>
                          <SelectItem value="supplier">Supplier</SelectItem>
                          <SelectItem value="internal_user">Internal User</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 mr-2" />
                        {formatDate(user.lastLoginAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setIsDeleteDialogOpen(true);
                          }}
                          disabled={user.id === currentUser?.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>



      {/* Role Change Confirmation Dialog */}
      <Dialog open={isRoleChangeDialogOpen} onOpenChange={setIsRoleChangeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Role Change</DialogTitle>
            <DialogDescription>
              {roleChangeData && (
                <span>
                  Changing {roleChangeData.user.name}'s role from {roleChangeData.oldRole} to {roleChangeData.newRole} will permanently delete: {roleChangeData.itemsToDelete.join(', ')}.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 my-2 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">Data Deletion Warning</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  This action will permanently delete the user's associated data and cannot be undone. The deleted data will not be recoverable.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsRoleChangeDialogOpen(false);
                setRoleChangeData(null);
              }} 
              disabled={isChangingRole}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmRoleChange} 
              disabled={isChangingRole}
            >
              {isChangingRole ? 'Changing Role...' : 'Confirm Role Change'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedUser?.name}"? This action will completely remove the user from both the system database and Firebase Authentication and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 my-2 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800">Warning</h4>
                <p className="text-sm text-red-700 mt-1">
                  This will permanently delete the user account from both the system database and Firebase Authentication. The user will no longer be able to log in.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeletingUser}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={isDeletingUser}>
              {isDeletingUser ? 'Deleting...' : 'Delete User Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
