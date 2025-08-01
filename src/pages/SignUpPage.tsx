import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Mail, Loader2, ArrowLeft, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { sendVerificationEmail, verifyCode } from '@/services/emailVerificationService';

export default function SignUpPage() {
  const navigate = useNavigate();
  const { user, loginWithGoogle, signUpWithEmail } = useAuth();
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleGoogleSignUp = async () => {
    // Check if user is already logged in
    if (user) {
      toast.error('You are already logged in. Please sign out first if you want to create a new account.');
      return;
    }
    
    setIsSigningUp(true);
    try {
      const success = await loginWithGoogle();
      if (success) {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Google sign-up error:', error);
    } finally {
      setIsSigningUp(false);
    }
  };

  // Redirect already logged-in users
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if user is already logged in
    if (user) {
      toast.error('You are already logged in. Please sign out first if you want to create a new account.');
      return;
    }
    
    // Validate form
    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setIsSigningUp(true);
    
    try {
      // Double-check if user is still logged in before sending email
      if (user) {
        toast.error('You are already logged in. Please sign out first if you want to create a new account.');
        setIsSigningUp(false);
        return;
      }
      
      // Send verification email
      await sendVerificationEmail(formData.email, formData.name);
      
      // Show verification code input
      setIsVerifying(true);
      toast.success('Verification code sent to your email');
    } catch (error: any) {
      console.error('Email sign-up error:', error);
      toast.error(error.message || 'Failed to sign up with email');
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleVerifyAndSignUp = async () => {
    if (!verificationCode) {
      toast.error('Please enter the verification code');
      return;
    }

    setIsSigningUp(true);
    
    try {
      // First verify the code
      // verifyCode is now imported statically at the top
      const isCodeValid = await verifyCode(formData.email, verificationCode);
      
      if (!isCodeValid) {
        toast.error('Invalid or expired verification code');
        return;
      }
      
      // If code is valid, create account and automatically sign in using AuthContext
      const success = await signUpWithEmail(
        formData.email,
        formData.password,
        formData.name,
        'internal_user'
      );
      
      if (success) {
        // User is now automatically logged in via AuthContext
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      toast.error(error.message || 'Failed to verify email');
    } finally {
      setIsSigningUp(false);
    }
  };

  // Show message for already logged-in users
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900 p-4">
        <div className="w-full max-w-md">
          {/* Back Button */}
          <div className="flex justify-start mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 p-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>
          
          <Card className="border-slate-200 dark:border-slate-700 shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center mb-4">
                <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-md">
                  <UserCheck className="h-8 w-8 text-white" />
                </div>
              </div>
              <CardTitle className="text-xl">Already Signed In</CardTitle>
              <CardDescription>
                You are already logged in as {user.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                  <strong>User exists, please sign in instead.</strong>
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-300">
                  If you want to create a new account, please sign out first.
                </p>
              </div>
              
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => navigate('/dashboard')}
                  className="w-full"
                >
                  Go to Dashboard
                </Button>
                
                <Button
                  onClick={() => navigate('/login')}
                  variant="outline"
                  className="w-full"
                >
                  Sign In as Different User
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900 p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <div className="flex justify-start mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 p-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-md">
              <Package className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Create an Account
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Sign up to access the Inventory Management System
          </p>
        </div>

        <Card className="border-slate-200 dark:border-slate-700 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Sign Up</CardTitle>
            <CardDescription>
              Create a new account to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isVerifying ? (
              <Tabs defaultValue="email" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="email">Email</TabsTrigger>
                  <TabsTrigger value="google">Google</TabsTrigger>
                </TabsList>

                <TabsContent value="email">
                  <form onSubmit={handleEmailSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Create a password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11"
                      disabled={isSigningUp}
                    >
                      {isSigningUp ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          Sign Up with Email
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="google">
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-2">
                      Sign up quickly using your Google account
                    </p>

                    <Button
                      onClick={handleGoogleSignUp}
                      variant="outline"
                      className="w-full h-11 border-2 border-slate-200 dark:border-slate-700"
                      disabled={isSigningUp}
                    >
                      {isSigningUp ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                            <path
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              fill="#4285F4"
                            />
                            <path
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              fill="#34A853"
                            />
                            <path
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                              fill="#FBBC05"
                            />
                            <path
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                              fill="#EA4335"
                            />
                          </svg>
                          Sign Up with Google
                        </>
                      )}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="space-y-4">
                <div className="text-center mb-2">
                  <h3 className="text-lg font-medium">Verify Your Email</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    We've sent a verification code to {formData.email}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="verificationCode">Verification Code</Label>
                  <Input
                    id="verificationCode"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    required
                  />
                </div>

                <Button
                  onClick={handleVerifyAndSignUp}
                  className="w-full h-11"
                  disabled={isSigningUp}
                >
                  {isSigningUp ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify and Create Account'
                  )}
                </Button>
              </div>
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                  Sign In
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}