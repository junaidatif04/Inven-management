import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { verifyCode, sendVerificationEmail } from '@/services/emailVerificationService';
import { useAuth } from '@/contexts/AuthContext';

export default function EmailVerificationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [verificationCode, setVerificationCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Get email and name from location state or use user data
  const email = location.state?.email || user?.email;
  const name = location.state?.name || user?.name;

  useEffect(() => {
    // If no email is available, redirect to login
    if (!email) {
      navigate('/login');
    }

    // Handle countdown for resend button
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [email, navigate, countdown]);

  const handleVerify = async () => {
    if (!verificationCode) {
      toast.error('Please enter the verification code');
      return;
    }

    setIsSubmitting(true);

    try {
      const isVerified = await verifyCode(email, verificationCode);

      if (isVerified) {
        toast.success('Email verified successfully!');
        // Redirect to dashboard or login page
        navigate('/dashboard');
      } else {
        toast.error('Invalid or expired verification code');
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      toast.error('Failed to verify email');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);

    try {
      await sendVerificationEmail(email, name);
      toast.success('Verification code sent! Please check your email');
      setCountdown(60); // Set 60 seconds cooldown
    } catch (error) {
      console.error('Error resending verification code:', error);
      toast.error('Failed to resend verification code');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900/50 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-elegant">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Email Verification</CardTitle>
            <CardDescription className="text-center">
              Please enter the verification code sent to your email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-center">
              <p className="text-sm text-muted-foreground">
                We've sent a verification code to:
              </p>
              <p className="font-medium">{email}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="verification-code">Verification Code</Label>
              <Input
                id="verification-code"
                placeholder="Enter 6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={6}
                className="text-center text-lg tracking-widest"
              />
            </div>

            <Button 
              className="w-full" 
              onClick={handleVerify}
              disabled={isSubmitting || !verificationCode}
            >
              {isSubmitting ? 'Verifying...' : 'Verify Email'}
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <div className="text-sm text-center text-muted-foreground">
              Didn't receive the code?
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleResendCode}
              disabled={isResending || countdown > 0}
            >
              {countdown > 0 
                ? `Resend Code (${countdown}s)` 
                : isResending 
                  ? 'Sending...' 
                  : 'Resend Code'}
            </Button>
            <Button
              variant="link"
              className="px-0"
              onClick={() => navigate('/login')}
            >
              Back to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}