import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
// Removed unused Select imports
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Search, 
  Users, 
  Phone,
  Mail,
  MapPin,
  Building,
  Eye,
  Globe,
  FileText
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/services/authService';
import { getAllUsers } from '@/services/userService';
import { getAllAccessRequests, AccessRequest } from '@/services/accessRequestService';
import { toast } from 'sonner';
// Removed unused Supplier import

interface SupplierWithDetails extends User {
  accessRequest?: AccessRequest;
  companyName?: string;
}

export default function SuppliersPage() {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<SupplierWithDetails[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<SupplierWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierWithDetails | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  const handleViewDetails = (supplier: SupplierWithDetails) => {
    setSelectedSupplier(supplier);
    setIsDetailsDialogOpen(true);
  };

  // Check if user is admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-muted-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Only administrators can access the Suppliers page.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    filterSuppliers();
  }, [suppliers, searchTerm]);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      console.log('Starting to load suppliers...');
      
      // Load users and access requests in parallel
      const [users, accessRequests] = await Promise.all([
        getAllUsers(),
        getAllAccessRequests()
      ]);
      
      console.log('All users from database:', users);
      console.log('Total users count:', users.length);
      
      if (users.length === 0) {
        console.log('No users found in database');
        setSuppliers([]);
        return;
      }
      
      // Log all user roles
      const roleCount = users.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('User roles distribution:', roleCount);
      
      const supplierUsers = users.filter(user => user.role === 'supplier');
      console.log('Filtered supplier users:', supplierUsers);
      console.log('Supplier users count:', supplierUsers.length);
      
      // Merge supplier users with their access request data
      const suppliersWithDetails: SupplierWithDetails[] = supplierUsers.map(user => {
        const accessRequest = accessRequests.find(req => 
          req.email === user.email && req.requestedRole === 'supplier'
        );
        return {
          ...user,
          accessRequest
        };
      });
      
      setSuppliers(suppliersWithDetails);
    } catch (error) {
      console.error('Error loading suppliers:', error);
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const filterSuppliers = () => {
    let filtered = suppliers;
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(supplier =>
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (supplier.companyName && supplier.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (supplier.accessRequest?.company && supplier.accessRequest.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (supplier.accessRequest?.contactPerson && supplier.accessRequest.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (supplier.accessRequest?.businessType && supplier.accessRequest.businessType.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    setFilteredSuppliers(filtered);
  };







  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Users className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading suppliers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Supplier Management</h1>
          <p className="text-muted-foreground">View approved suppliers with system access</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliers.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Suppliers</CardTitle>
            <Building className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {suppliers.length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Company Info</CardTitle>
            <Building className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {suppliers.filter(supplier => 
                supplier.companyName || supplier.accessRequest?.company
              ).length}
            </div>
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
                  placeholder="Search suppliers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>


          </div>
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Suppliers</CardTitle>
          <CardDescription>
            Manage your supplier database and contact information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSuppliers.length === 0 ? (
            <div className="text-center py-8">
              <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No suppliers found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Users with supplier role will appear here.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Business Type</TableHead>
                  <TableHead>Member Since</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                        {supplier.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {supplier.companyName || supplier.accessRequest?.company || 'Not specified'}
                        </div>
                        {supplier.accessRequest?.website && (
                          <div className="text-sm text-muted-foreground">
                            <a href={supplier.accessRequest.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                              {supplier.accessRequest.website}
                            </a>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {supplier.accessRequest?.contactPerson || 'Not specified'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                        {supplier.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                        {supplier.phone || supplier.accessRequest?.phone || 'Not specified'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {supplier.accessRequest?.businessType ? (
                        <Badge variant="outline" className="capitalize">
                          {supplier.accessRequest.businessType.replace('_', ' ')}
                        </Badge>
                      ) : (
                        'Not specified'
                      )}
                    </TableCell>
                    <TableCell>{supplier.createdAt ? new Date(supplier.createdAt).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleViewDetails(supplier)}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
           )}
        </CardContent>
      </Card>

      {/* Supplier Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Supplier Details</DialogTitle>
            <DialogDescription>
              Detailed information about {selectedSupplier?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedSupplier && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2 flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Basic Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Name:</strong> {selectedSupplier.name}</div>
                    <div><strong>Email:</strong> {selectedSupplier.email}</div>
                    <div><strong>Phone:</strong> {selectedSupplier.phone || selectedSupplier.accessRequest?.phone || 'Not specified'}</div>
                    <div><strong>Member Since:</strong> {selectedSupplier.createdAt ? new Date(selectedSupplier.createdAt).toLocaleDateString() : 'N/A'}</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2 flex items-center">
                    <Building className="h-4 w-4 mr-2" />
                    Company Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Company:</strong> {selectedSupplier.companyName || selectedSupplier.accessRequest?.company || 'Not specified'}</div>
                     <div><strong>Contact Person:</strong> {selectedSupplier.accessRequest?.contactPerson || 'Not specified'}</div>
                     <div><strong>Business Type:</strong> {selectedSupplier.accessRequest?.businessType ? selectedSupplier.accessRequest.businessType.replace('_', ' ') : 'Not specified'}</div>
                     {selectedSupplier.accessRequest?.taxId && (
                       <div><strong>Tax ID:</strong> {selectedSupplier.accessRequest.taxId}</div>
                     )}
                    {selectedSupplier.accessRequest?.website && (
                      <div className="flex items-center">
                        <Globe className="h-4 w-4 mr-2" />
                        <a href={selectedSupplier.accessRequest.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {selectedSupplier.accessRequest.website}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Address Information */}
               {selectedSupplier.accessRequest?.address && (
                 <div>
                   <h4 className="font-semibold mb-2 flex items-center">
                     <MapPin className="h-4 w-4 mr-2" />
                     Business Address
                   </h4>
                   <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                     {selectedSupplier.accessRequest.address}
                   </p>
                 </div>
               )}
               
               {/* Additional Details */}
               {selectedSupplier.accessRequest?.reason && (
                 <div>
                   <h4 className="font-semibold mb-2 flex items-center">
                     <FileText className="h-4 w-4 mr-2" />
                     Request Reason
                   </h4>
                   <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                     {selectedSupplier.accessRequest.reason}
                   </p>
                 </div>
               )}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
