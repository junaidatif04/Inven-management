import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NavigationHeader } from '@/components/NavigationHeader';
import { 
  Search, 
  Plus, 
  Eye, 
  Edit, 
  Trash2,
  UserPlus,
  Activity,
  Shield,
  Clock,
  X
} from 'lucide-react';
import { toast } from 'sonner';

// Mock user data
const users = [
  {
    id: 'USR-001',
    name: 'John Admin',
    email: 'admin@company.com',
    role: 'admin',
    status: 'Active',
    lastLogin: '2024-01-15 14:30',
    createdAt: '2023-06-15',
    department: 'IT'
  },
  {
    id: 'USR-002',
    name: 'Jane Warehouse',
    email: 'warehouse@company.com',
    role: 'warehouse_staff',
    status: 'Active',
    lastLogin: '2024-01-15 13:45',
    createdAt: '2023-08-20',
    department: 'Operations'
  },
  {
    id: 'USR-003',
    name: 'Bob Supplier',
    email: 'supplier@company.com',
    role: 'supplier',
    status: 'Active',
    lastLogin: '2024-01-14 16:20',
    createdAt: '2023-09-10',
    department: 'External'
  },
  {
    id: 'USR-004',
    name: 'Alice User',
    email: 'user@company.com',
    role: 'internal_user',
    status: 'Active',
    lastLogin: '2024-01-15 09:15',
    createdAt: '2023-10-05',
    department: 'Marketing'
  },
  {
    id: 'USR-005',
    name: 'Mike Johnson',
    email: 'mike@company.com',
    role: 'internal_user',
    status: 'Inactive',
    lastLogin: '2024-01-10 11:30',
    createdAt: '2023-11-12',
    department: 'Finance'
  }
];

// Mock system logs
const systemLogs = [
  { id: 1, timestamp: '2024-01-15 14:30', action: 'User login', user: 'john.admin@company.com', status: 'Success', ip: '192.168.1.100' },
  { id: 2, timestamp: '2024-01-15 14:25', action: 'Inventory update', user: 'jane.warehouse@company.com', status: 'Success', ip: '192.168.1.101' },
  { id: 3, timestamp: '2024-01-15 14:20', action: 'Order approval', user: 'john.admin@company.com', status: 'Success', ip: '192.168.1.100' },
  { id: 4, timestamp: '2024-01-15 14:15', action: 'Failed login attempt', user: 'unknown@company.com', status: 'Failed', ip: '192.168.1.200' },
  { id: 5, timestamp: '2024-01-15 14:10', action: 'User created', user: 'john.admin@company.com', status: 'Success', ip: '192.168.1.100' },
  { id: 6, timestamp: '2024-01-15 14:05', action: 'Password reset', user: 'alice.user@company.com', status: 'Success', ip: '192.168.1.102' },
  { id: 7, timestamp: '2024-01-15 14:00', action: 'Product added', user: 'bob.supplier@company.com', status: 'Success', ip: '192.168.1.103' },
  { id: 8, timestamp: '2024-01-15 13:55', action: 'Order rejected', user: 'john.admin@company.com', status: 'Success', ip: '192.168.1.100' },
];

const sections = [
  { id: 'users', name: 'Users' },
  { id: 'logs', name: 'System Logs' }
];

export default function UserManagementPage() {
  const [activeSection, setActiveSection] = useState('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    role: 'internal_user',
    department: ''
  });
  const [logFilter, setLogFilter] = useState('all');

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLogs = systemLogs.filter(log => {
    if (logFilter === 'all') return true;
    if (logFilter === 'success') return log.status === 'Success';
    if (logFilter === 'failed') return log.status === 'Failed';
    return true;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Active':
        return 'default';
      case 'Inactive':
        return 'secondary';
      case 'Suspended':
        return 'destructive';
      default:
        return 'outline';
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

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'warehouse_staff':
        return 'Warehouse Staff';
      case 'supplier':
        return 'Supplier';
      case 'internal_user':
        return 'Internal User';
      default:
        return role;
    }
  };

  const handleCreateUser = () => {
    if (!newUserForm.name || !newUserForm.email || !newUserForm.department) {
      toast.error('Please fill in all required fields');
      return;
    }
    toast.success('User created successfully');
    setNewUserForm({
      name: '',
      email: '',
      role: 'internal_user',
      department: ''
    });
  };

  const handleDeleteUser = (userId: string) => {
    toast.success(`User ${userId} deleted successfully`);
  };

  const handleToggleUserStatus = (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    toast.success(`User ${userId} status changed to ${newStatus}`);
  };

  const getCurrentSectionName = () => {
    return sections.find(s => s.id === activeSection)?.name || '';
  };

  const renderUsers = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">System Users</h2>
          <p className="text-sm text-muted-foreground">
            Manage user accounts and permissions
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>
                    Create a new user account in the system
                  </DialogDescription>
                </div>
                <button 
                  onClick={() => {}}
                  className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  placeholder="Enter full name"
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={newUserForm.role} onValueChange={(value) => setNewUserForm(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="warehouse_staff">Warehouse Staff</SelectItem>
                    <SelectItem value="supplier">Supplier</SelectItem>
                    <SelectItem value="internal_user">Internal User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Input
                  placeholder="Enter department"
                  value={newUserForm.department}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, department: e.target.value }))}
                />
              </div>
              <Button onClick={handleCreateUser} className="w-full">
                Create User
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name, email, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
          <CardDescription>
            Manage system users and their access levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {getRoleDisplayName(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.department}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(user.status)}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{user.lastLogin}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setSelectedUser(user)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </DialogTrigger>
                        {selectedUser && (
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <div className="flex items-center justify-between">
                                <div>
                                  <DialogTitle>User Details</DialogTitle>
                                  <DialogDescription>
                                    {selectedUser.name} - {selectedUser.email}
                                  </DialogDescription>
                                </div>
                                <button 
                                  onClick={() => setSelectedUser(null)}
                                  className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                  aria-label="Close"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium">User ID</Label>
                                  <p className="text-sm">{selectedUser.id}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium">Status</Label>
                                  <Badge variant={getStatusBadgeVariant(selectedUser.status)} className="mt-1">
                                    {selectedUser.status}
                                  </Badge>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium">Role</Label>
                                  <Badge variant={getRoleBadgeVariant(selectedUser.role)} className="mt-1">
                                    {getRoleDisplayName(selectedUser.role)}
                                  </Badge>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium">Department</Label>
                                  <p className="text-sm">{selectedUser.department}</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium">Created</Label>
                                  <p className="text-sm">{selectedUser.createdAt}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium">Last Login</Label>
                                  <p className="text-sm">{selectedUser.lastLogin}</p>
                                </div>
                              </div>
                              <div className="flex space-x-2 pt-4">
                                <Button 
                                  variant="outline" 
                                  className="flex-1"
                                  onClick={() => handleToggleUserStatus(selectedUser.id, selectedUser.status)}
                                >
                                  <Shield className="mr-2 h-4 w-4" />
                                  {selectedUser.status === 'Active' ? 'Deactivate' : 'Activate'}
                                </Button>
                                <Button variant="outline" className="flex-1">
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        )}
                      </Dialog>
                      <Button size="sm" variant="outline">
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderLogs = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">System Activity Logs</h2>
        <p className="text-sm text-muted-foreground">
          Monitor system activities and user actions
        </p>
      </div>

      {/* Log Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <Label>Filter by status:</Label>
            <Select value={logFilter} onValueChange={setLogFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                <SelectItem value="success">Successful</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* System Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Activity Log ({filteredLogs.length})</span>
          </CardTitle>
          <CardDescription>
            Recent system activities and user actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-2">
              {filteredLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-mono">{log.timestamp}</span>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{log.action}</p>
                      <p className="text-xs text-muted-foreground">
                        User: {log.user} • IP: {log.ip}
                      </p>
                    </div>
                  </div>
                  <Badge variant={log.status === 'Success' ? 'default' : 'destructive'}>
                    {log.status}
                  </Badge>
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
        title="User Management"
        description="Manage system users, roles, and monitor system activity"
        currentSection={getCurrentSectionName()}
        sections={sections}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="pb-6">
          {activeSection === 'users' && renderUsers()}
          {activeSection === 'logs' && renderLogs()}
        </div>
      </div>
    </div>
  );
}