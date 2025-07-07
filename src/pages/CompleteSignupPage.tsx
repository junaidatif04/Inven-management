import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Package, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getAccessRequestByToken } from '@/services/accessRequestService';
import { sendWelcomeEmail } from '@/services/emailService';
import { getUserApprovedData } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';
import { AccessRequest } from '@/services/accessRequestService';
import { auth, db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

export default function CompleteSignupPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithGoogle, signUpWithEmail } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<AccessRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [signupMethod, setSignupMethod] = useState<'google' | 'email' | null>(null);
  const [emailPassword, setEmailPassword] = useState({
    password: '',
    confirmPassword: ''
  });

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing signup token');
      setLoading(false);
      return;
    }

    loadRequestData();
  }, [token]);

  const loadRequestData = async () => {
    try {
      console.log('Loading request data for token:', token);
      const requestData = await getAccessRequestByToken(token!);
      console.log('Request data received:', requestData);

      if (!requestData) {
        console.log('No request data found for token');
        setError('Invalid, expired, or already used signup token');
      } else {
        console.log('Setting request data:', requestData);
        setRequest(requestData);
      }
    } catch (error) {
      console.error('Error loading request data:', error);
      setError('Failed to load signup information. Please check the console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    if (!request) return;

    setIsSigningUp(true);
    try {
      // Sign in with Google and validate email
      const success = await loginWithGoogle();
      if (success) {
        // Get the current user to check email
        const currentUser = auth.currentUser;
        if (!currentUser) {
          toast.error('Authentication failed');
          return;
        }

        // Validate that Google email matches approved request email
        if (currentUser.email !== request.email) {
          toast.error(`Email mismatch! Please sign in with ${request.email} or contact support.`);
          await auth.signOut(); // Sign out the wrong user
          return;
        }

        // Double-check the user has the correct role and name from the approval system
        const approvalResult = await getUserApprovedData(currentUser.email!);
        if (approvalResult.isApproved) {
          // Update the role and name if they don't match the request
          try {
            await updateDoc(doc(db, 'users', currentUser.uid), {
              role: request.requestedRole,
              name: request.name, // Use the name from the access request
              updatedAt: serverTimestamp()
            });
          } catch (updateError) {
            console.error('Failed to update user data:', updateError);
            toast.error('Failed to assign role and name. Please contact support.');
            return;
          }
        }

        // Send welcome email
        try {
          await sendWelcomeEmail({
            name: request.name,
            email: request.email,
            role: request.requestedRole
          });
        } catch (emailError) {
          console.error('Welcome email failed:', emailError);
        }

        toast.success('Account created successfully! Welcome email sent.');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Google signup error:', error);
      toast.error('Failed to create account with Google');
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleEmailSignup = async () => {
    if (!request) return;
    
    if (emailPassword.password !== emailPassword.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (emailPassword.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsSigningUp(true);
    try {
      // Create account with email/password and assign approved role
      const success = await signUpWithEmail(
        request.email,
        emailPassword.password,
        request.name,
        request.requestedRole
      );

      if (success) {
        // Send welcome email
        try {
          await sendWelcomeEmail({
            name: request.name,
            email: request.email,
            role: request.requestedRole
          });
        } catch (emailError) {
          console.error('Welcome email failed:', emailError);
        }

        toast.success('Account created successfully! Welcome email sent.');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Email signup error:', error);
      toast.error('Failed to create account');
    } finally {
      setIsSigningUp(false);
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'warehouse_staff': return 'Warehouse Staff';
      case 'supplier': return 'Supplier';
      case 'internal_user': return 'Internal User';
      case 'admin': return 'Administrator';
      default: return role;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'warehouse_staff': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'supplier': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'internal_user': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading signup information...</p>
          {token && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Processing token: {token.substring(0, 10)}...
            </p>
          )}
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle>Invalid Signup Link</CardTitle>
            <CardDescription>
              {error || 'This signup link is invalid or has expired.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href="/request-access">Request New Access</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Package className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Complete Your Account Setup
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Your access request has been approved! Choose how you'd like to sign in.
          </p>
        </div>

        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Access Approved
            </CardTitle>
            <CardDescription>
              Complete your account setup to access the inventory management system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Approved Request Info */}
            <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                Request Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-700 dark:text-green-300">Name:</span>
                  <span className="font-medium text-green-900 dark:text-green-100">{request.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700 dark:text-green-300">Email:</span>
                  <span className="font-medium text-green-900 dark:text-green-100">{request.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-green-700 dark:text-green-300">Role:</span>
                  <Badge className={getRoleBadgeColor(request.requestedRole)}>
                    {getRoleDisplayName(request.requestedRole)}
                  </Badge>
                </div>
              </div>
            </div>

            {!signupMethod ? (
              /* Choose Signup Method */
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center">
                  Choose Your Sign-In Method
                </h3>
                
                <div className="grid gap-4">
                  <Button
                    onClick={() => setSignupMethod('google')}
                    className="w-full h-12 text-left justify-start"
                    variant="outline"
                  >
                    <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                    <span className="ml-auto text-xs text-muted-foreground">Recommended</span>
                  </Button>
                  
                  <Button
                    onClick={() => setSignupMethod('email')}
                    className="w-full h-12"
                    variant="outline"
                  >
                    Create Password
                  </Button>
                </div>
              </div>
            ) : signupMethod === 'google' ? (
              /* Google Signup */
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Sign in with Google</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    You'll be signed in with your Google account and assigned the {getRoleDisplayName(request.requestedRole)} role.
                  </p>
                </div>
                
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setSignupMethod(null)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleGoogleSignup}
                    disabled={isSigningUp}
                    className="flex-1"
                  >
                    {isSigningUp ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing In...
                      </>
                    ) : (
                      'Continue with Google'
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              /* Email/Password Signup */
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Create Your Password</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create a secure password for your {getRoleDisplayName(request.requestedRole)} account.
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={emailPassword.password}
                      onChange={(e) => setEmailPassword({ ...emailPassword, password: e.target.value })}
                      placeholder="Enter your password"
                      disabled={isSigningUp}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={emailPassword.confirmPassword}
                      onChange={(e) => setEmailPassword({ ...emailPassword, confirmPassword: e.target.value })}
                      placeholder="Confirm your password"
                      disabled={isSigningUp}
                    />
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setSignupMethod(null)}
                    className="flex-1"
                    disabled={isSigningUp}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleEmailSignup}
                    disabled={isSigningUp}
                    className="flex-1"
                  >
                    {isSigningUp ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
