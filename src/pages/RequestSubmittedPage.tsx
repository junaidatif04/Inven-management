import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, CheckCircle, Mail, Clock } from 'lucide-react';

export default function RequestSubmittedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Package className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Request Submitted Successfully!
          </h1>
        </div>

        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Thank You!</CardTitle>
            <CardDescription className="text-lg">
              Your access request has been submitted and is now under review.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* What happens next */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                What happens next?
              </h3>
              
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-semibold mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Review Process</p>
                    <p>An administrator will review your request within 1-2 business days.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-semibold mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Email Notification</p>
                    <p>You'll receive an email with either approval instructions or next steps.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-semibold mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Account Setup</p>
                    <p>If approved, you'll get a secure link to complete your account setup.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Email reminder */}
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    Check Your Email
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    We've sent a confirmation email to your provided address. 
                    Please check your spam folder if you don't see it in your inbox.
                  </p>
                </div>
              </div>
            </div>

            {/* Contact information */}
            <div className="border-t pt-6">
              <h4 className="font-medium mb-2">Need Help?</h4>
              <p className="text-sm text-muted-foreground mb-4">
                If you have questions about your request or need immediate assistance, 
                please contact our support team.
              </p>
              <div className="text-sm">
                <p><strong>Email:</strong> support@company.com</p>
                <p><strong>Phone:</strong> (555) 123-4567</p>
                <p><strong>Hours:</strong> Monday - Friday, 9:00 AM - 5:00 PM</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-4 pt-4">
              <Button asChild variant="outline" className="flex-1">
                <Link to="/login">
                  Back to Login
                </Link>
              </Button>
              
              <Button asChild className="flex-1">
                <Link to="/request-access">
                  Submit Another Request
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
