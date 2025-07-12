import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { submitAccessRequest } from '@/services/accessRequestService';
import { sendRequestConfirmationEmail } from '@/services/emailService';
import { UserRole } from '@/services/authService';

export default function RequestAccessPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    requestedRole: '' as UserRole | '',
    company: '',
    department: '',
    reason: '',
    experience: '',
    referral: '',
    expectedUsage: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.requestedRole) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const requestData: any = {
        name: formData.name,
        email: formData.email,
        requestedRole: formData.requestedRole as UserRole,
      };

      // Only add optional fields if they have values
      if (formData.company && formData.company.trim()) {
        requestData.company = formData.company.trim();
      }
      if (formData.department && formData.department.trim()) {
        requestData.department = formData.department.trim();
      }
      if (formData.reason && formData.reason.trim()) {
        requestData.reason = formData.reason.trim();
      }
      if (formData.experience && formData.experience.trim()) {
        requestData.experience = formData.experience.trim();
      }
      if (formData.referral && formData.referral.trim()) {
        requestData.referral = formData.referral.trim();
      }
      if (formData.expectedUsage && formData.expectedUsage.trim()) {
        requestData.expectedUsage = formData.expectedUsage.trim();
      }

      const requestId = await submitAccessRequest(requestData);

      // Send confirmation email
      try {
        await sendRequestConfirmationEmail({
          id: requestId,
          ...requestData,
          status: 'pending',
          createdAt: new Date()
        });
        toast.success('Access request submitted successfully! Check your email for confirmation.');
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        toast.success('Access request submitted successfully! (Email notification failed)');
      }

      // Show success message and redirect
      setTimeout(() => {
        navigate('/request-submitted');
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'warehouse_staff':
        return 'Manage inventory, track shipments, and handle warehouse operations';
      case 'supplier':
        return 'Manage product catalog, view orders, and update delivery status';
      case 'internal_user':
        return 'Browse catalog, submit requests, and track order status';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900 p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-indigo-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-purple-600/20 rounded-full blur-3xl"></div>
      </div>
      
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-elegant">
              <Package className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Request Access
          </h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium mt-2">
            Submit a request to access the Inventory Management System
          </p>
        </div>

        <Card className="w-full glass-card shadow-elegant-lg border-0 relative z-10">
          <CardHeader>
            <CardTitle className="text-slate-800 dark:text-slate-200">Access Request Form</CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Fill out the form below to request access. An administrator will review your request and send you setup instructions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Basic Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter your full name"
                      className="h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Enter your email address"
                      className="h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Role Request</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="role">Requested Role *</Label>
                  <Select 
                    value={formData.requestedRole} 
                    onValueChange={(value: UserRole) => setFormData({ ...formData, requestedRole: value })}
                  >
                    <SelectTrigger className="h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder="Select the role you need" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="warehouse_staff">Warehouse Staff</SelectItem>
                      <SelectItem value="supplier">Supplier</SelectItem>
                      <SelectItem value="internal_user">Internal User</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.requestedRole && (
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {getRoleDescription(formData.requestedRole)}
                    </p>
                  )}
                </div>
              </div>

              {/* Role-specific fields */}
              {formData.requestedRole === 'supplier' && (
                <div className="space-y-2">
                  <Label htmlFor="company">Company Name</Label>
                  <Input
                    id="company"
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Enter your company name"
                    className="h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                </div>
              )}

              {formData.requestedRole === 'warehouse_staff' && (
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="Enter your department"
                    className="h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                </div>
              )}

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Access (Optional)</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Briefly explain why you need access to this system"
                  className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400"
                  rows={3}
                />
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Additional Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="experience">Experience Level</Label>
                  <Select 
                    value={formData.experience} 
                    onValueChange={(value) => setFormData({ ...formData, experience: value })}
                  >
                    <SelectTrigger className="h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder="Select your experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referral">How did you hear about us?</Label>
                  <Input
                    id="referral"
                    type="text"
                    value={formData.referral}
                    onChange={(e) => setFormData({ ...formData, referral: e.target.value })}
                    placeholder="Colleague, website, social media, etc."
                    className="h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expectedUsage">Expected Usage Frequency</Label>
                  <Select 
                    value={formData.expectedUsage} 
                    onValueChange={(value) => setFormData({ ...formData, expectedUsage: value })}
                  >
                    <SelectTrigger className="h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder="Select expected usage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="occasionally">Occasionally</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/login')}
                  className="flex-1 h-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Button>
                
                <Button 
                  type="submit" 
                  className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-elegant" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
