import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { Package, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { user, loginWithGoogle, isLoading } = useAuth();
  const { addNotification } = useNotifications();
  const [isSigningIn, setIsSigningIn] = useState(false);

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
          message: 'Successfully signed in with Google',
          type: 'success',
        });
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
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
              Sign in with your Google account to access the inventory management system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Google Sign-In Button */}
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

            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Sign in with your Google account to access the inventory management system
              </p>
              <p className="text-xs text-muted-foreground">
                New users will be automatically registered with "Internal User" role
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}