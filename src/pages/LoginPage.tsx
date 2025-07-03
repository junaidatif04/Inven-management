import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { Package, Loader2, UserPlus, Mail } from 'lucide-react';

export default function LoginPage() {
  const { user, loginWithGoogle, loginWithEmail, isLoading } = useAuth();
  const { addNotification } = useNotifications();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [emailCredentials, setEmailCredentials] = useState({
    email: '',
    password: ''
  });

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      const success = await loginWithGoogle();
      if (success) {
        addNotification({
          title: 'Welcome!',
          message: 'Successfully signed in',
          type: 'success',
        });
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailCredentials.email || !emailCredentials.password) {
      addNotification({
        title: 'Missing Information',
        message: 'Please enter both email and password',
        type: 'error',
      });
      return;
    }

    try {
      setIsSigningIn(true);
      const success = await loginWithEmail(emailCredentials.email, emailCredentials.password);
      if (success) {
        addNotification({
          title: 'Welcome!',
          message: 'Successfully signed in',
          type: 'success',
        });
      }
    } catch (error) {
      console.error('Email sign-in error:', error);
      addNotification({
        title: 'Sign-in Failed',
        message: 'Invalid email or password. Please try again.',
        type: 'error',
      });
    } finally {
      setIsSigningIn(false);
    }
  };



  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <Package className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">InventoryPro</h1>
          </div>
          <p className="text-muted-foreground">
            Inventory & Supply Chain Management System
          </p>
        </div>

        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Sign in to access the inventory management system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs defaultValue="google" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="google">Google Sign-In</TabsTrigger>
                <TabsTrigger value="email">Email & Password</TabsTrigger>
              </TabsList>

              <TabsContent value="google" className="space-y-4">

                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Sign in with your Google account for quick access
                  </p>

                  <Button
                    onClick={handleGoogleSignIn}
                    className="w-full h-12 text-base"
                    disabled={isLoading || isSigningIn}
                    variant="outline"
                  >
                    {isSigningIn ? (
                      <>
                        <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground">
                    New users will be automatically registered with "Internal User" role
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="email" className="space-y-4">
                <form onSubmit={handleEmailSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={emailCredentials.email}
                      onChange={(e) => setEmailCredentials({ ...emailCredentials, email: e.target.value })}
                      placeholder="Enter your email address"
                      required
                      disabled={isLoading || isSigningIn}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={emailCredentials.password}
                      onChange={(e) => setEmailCredentials({ ...emailCredentials, password: e.target.value })}
                      placeholder="Enter your password"
                      required
                      disabled={isLoading || isSigningIn}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12"
                    disabled={isLoading || isSigningIn}
                  >
                    {isSigningIn ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Sign In
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Use the email and password from your approved account setup
                  </p>
                </form>
              </TabsContent>
            </Tabs>

            {/* Request Access Section */}
            <div className="border-t pt-6">
              <div className="text-center space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-foreground">
                    Don't have access yet?
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Request access for Warehouse Staff, Supplier, or Internal User roles
                  </p>
                </div>

                <Button asChild variant="outline" className="w-full">
                  <Link to="/request-access">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Request Access
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}