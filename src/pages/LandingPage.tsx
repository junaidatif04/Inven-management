import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  BarChart3,
  Users,
  ShoppingCart,
  Star,
  CheckCircle,
  ArrowRight,
  Shield,
  Zap,
  Mail,
  Phone,
  MapPin,
  Menu,
  X
} from 'lucide-react';

export default function LandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const features = [
    {
      icon: Package,
      title: "Smart Inventory Management",
      description: "Real-time tracking, automated reordering, and intelligent stock optimization to prevent stockouts and reduce waste."
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Comprehensive reporting and analytics to make data-driven decisions and optimize your supply chain performance."
    },
    {
      icon: Users,
      title: "Multi-Role Access",
      description: "Role-based permissions for admins, warehouse staff, suppliers, and internal users with secure access controls."
    },
    {
      icon: ShoppingCart,
      title: "Order Management",
      description: "Streamlined order processing, tracking, and fulfillment with automated workflows and notifications."
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-level security with Firebase authentication, encrypted data, and comprehensive audit trails."
    },
    {
      icon: Zap,
      title: "Real-time Updates",
      description: "Instant notifications and live data synchronization across all devices and team members."
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Operations Manager",
      company: "TechCorp Industries",
      content: "InventoryPro transformed our supply chain operations. We reduced stockouts by 85% and improved efficiency by 40% in just 3 months.",
      rating: 5,
      avatar: "SJ"
    },
    {
      name: "Michael Chen",
      role: "Warehouse Director",
      company: "Global Logistics Ltd",
      content: "The real-time tracking and analytics have been game-changers. Our team can now make informed decisions instantly.",
      rating: 5,
      avatar: "MC"
    },
    {
      name: "Emily Rodriguez",
      role: "Supply Chain Lead",
      company: "Manufacturing Plus",
      content: "Outstanding platform! The multi-role access and automated workflows have streamlined our entire operation.",
      rating: 5,
      avatar: "ER"
    }
  ];

  const stats = [
    { number: "500+", label: "Companies Trust Us" },
    { number: "99.9%", label: "Uptime Guarantee" },
    { number: "2M+", label: "Items Tracked Daily" },
    { number: "24/7", label: "Expert Support" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  InventoryPro
                </span>
                <p className="text-xs text-slate-500 font-medium">Management System</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-slate-600 hover:text-slate-800 font-medium transition-colors">
                Features
              </a>
              <a href="#testimonials" className="text-slate-600 hover:text-slate-800 font-medium transition-colors">
                Reviews
              </a>
              <a href="#contact" className="text-slate-600 hover:text-slate-800 font-medium transition-colors">
                Contact
              </a>
              <Link to="/login">
                <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg">
                  Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-slate-200">
              <div className="flex flex-col space-y-4">
                <a href="#features" className="text-slate-600 hover:text-slate-800 font-medium">
                  Features
                </a>
                <a href="#testimonials" className="text-slate-600 hover:text-slate-800 font-medium">
                  Reviews
                </a>
                <a href="#contact" className="text-slate-600 hover:text-slate-800 font-medium">
                  Contact
                </a>
                <Link to="/login" className="w-full">
                  <Button className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white">
                    Sign In
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-purple-600/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-br from-cyan-400/10 to-blue-600/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center">
            <Badge className="mb-6 bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200">
              <Zap className="w-3 h-3 mr-1" />
              Next-Generation Inventory Management
            </Badge>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-slate-900 mb-6 leading-tight">
              Transform Your
              <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Supply Chain
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Streamline operations, reduce costs, and boost efficiency with our intelligent inventory management platform trusted by 500+ companies worldwide.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link to="/request-access">
                <Button size="lg" className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-xl px-8 py-4 text-lg">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50 px-8 py-4 text-lg">
                  Sign In
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
                    {stat.number}
                  </div>
                  <div className="text-slate-600 font-medium">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-32 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-indigo-200">
              <Shield className="w-3 h-3 mr-1" />
              Enterprise Features
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">
              Everything You Need to
              <span className="block bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Scale Your Business
              </span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Powerful features designed to streamline your inventory management and supply chain operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-slate-200/60 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl font-semibold text-slate-900">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-slate-600 leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 lg:py-32 bg-gradient-to-br from-slate-50 to-blue-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-green-100 text-green-700 hover:bg-green-200 border-green-200">
              <Star className="w-3 h-3 mr-1" />
              Customer Success
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">
              Trusted by Industry
              <span className="block bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                Leaders Worldwide
              </span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              See how companies like yours are transforming their operations with InventoryPro.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-white/80 backdrop-blur-sm border-slate-200/60 hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">{testimonial.name}</h4>
                      <p className="text-sm text-slate-600">{testimonial.role}</p>
                      <p className="text-sm text-slate-500">{testimonial.company}</p>
                    </div>
                  </div>
                  <div className="flex space-x-1 mt-2">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-700 leading-relaxed italic">
                    "{testimonial.content}"
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32 bg-gradient-to-r from-blue-600 to-indigo-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full bg-white/5 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:60px_60px]"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Your
            <span className="block">Supply Chain?</span>
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Join thousands of companies already using InventoryPro to streamline their operations and boost efficiency.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/request-access">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 shadow-xl px-8 py-4 text-lg font-semibold">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 px-8 py-4 text-lg">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div>
                  <span className="text-xl font-bold">InventoryPro</span>
                  <p className="text-sm text-slate-400">Management System</p>
                </div>
              </div>
              <p className="text-slate-300 mb-6 max-w-md">
                The leading inventory management platform trusted by companies worldwide to optimize their supply chain operations and drive growth.
              </p>
              <div className="flex space-x-4">
                <div className="flex items-center space-x-2 text-slate-300">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span className="text-sm">SOC 2 Compliant</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-300">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span className="text-sm">99.9% Uptime</span>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-slate-300">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">support@inventrypro.com</span>
                </div>
                <div className="flex items-center space-x-3 text-slate-300">
                  <Phone className="h-4 w-4" />
                  <span className="text-sm">+1 (555) 123-4567</span>
                </div>
                <div className="flex items-center space-x-3 text-slate-300">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">San Francisco, CA</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <div className="space-y-2">
                <Link to="/request-access" className="block text-slate-300 hover:text-white transition-colors text-sm">
                  Get Started
                </Link>
                <Link to="/login" className="block text-slate-300 hover:text-white transition-colors text-sm">
                  Sign In
                </Link>
                <a href="#features" className="block text-slate-300 hover:text-white transition-colors text-sm">
                  Features
                </a>
                <a href="#testimonials" className="block text-slate-300 hover:text-white transition-colors text-sm">
                  Reviews
                </a>
              </div>
            </div>
          </div>

          <Separator className="my-8 bg-slate-700" />

          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-slate-400 text-sm">
              © 2024 InventoryPro. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm">
                Privacy Policy
              </a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm">
                Terms of Service
              </a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm">
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
