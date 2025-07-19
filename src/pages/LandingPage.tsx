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
      name: "Alex Thompson",
      role: "Inventory Manager",
      company: "Local Manufacturing Co.",
      content: "This system has helped us better organize our inventory tracking and streamline our warehouse operations.",
      rating: 5,
      avatar: "AT"
    },
    {
      name: "Jordan Smith",
      role: "Operations Lead",
      company: "Regional Supply Chain",
      content: "The real-time updates and role-based access have improved our team coordination significantly.",
      rating: 5,
      avatar: "JS"
    },
    {
      name: "Taylor Davis",
      role: "Warehouse Supervisor",
      company: "Distribution Center",
      content: "User-friendly interface with powerful features for managing our daily inventory operations.",
      rating: 5,
      avatar: "TD"
    }
  ];

  const stats = [
    { number: "Secure", label: "Firebase Backend" },
    { number: "Real-time", label: "Data Sync" },
    { number: "Multi-role", label: "Access Control" },
    { number: "Modern", label: "Web Interface" }
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
          <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-br from-cyan-400/20 to-blue-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-indigo-400/10 to-purple-600/10 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-40">
          <div className="text-center">
            <Badge className="mb-8 bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200 px-4 py-2 text-sm font-medium">
              <Zap className="w-4 h-4 mr-2" />
              Modern Inventory Management Solution
            </Badge>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-slate-900 mb-8 leading-tight tracking-tight">
              Streamline Your
              <span className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Inventory Operations
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-600 mb-12 max-w-4xl mx-auto leading-relaxed font-light">
              A comprehensive inventory management system designed to help businesses track, manage, and optimize their inventory operations with modern web technology and real-time collaboration.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
              <Link to="/login">
                <Button size="lg" className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-2xl px-10 py-5 text-lg font-semibold rounded-xl transition-all duration-300 hover:scale-105">
                  Get Started
                  <ArrowRight className="ml-3 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="border-2 border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 px-10 py-5 text-lg font-semibold rounded-xl transition-all duration-300">
                  Sign In
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center p-6 rounded-2xl bg-white/60 backdrop-blur-sm border border-slate-200/50 hover:bg-white/80 transition-all duration-300 hover:scale-105">
                  <div className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
                    {stat.number}
                  </div>
                  <div className="text-slate-600 font-medium text-sm">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 lg:py-40 bg-white/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <Badge className="mb-6 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-indigo-200 px-4 py-2 text-sm font-medium">
              <Shield className="w-4 h-4 mr-2" />
              Powerful Features
            </Badge>
            <h2 className="text-4xl md:text-6xl font-bold text-slate-900 mb-8 tracking-tight">
              Everything You Need to
              <span className="block bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Manage Inventory
              </span>
            </h2>
            <p className="text-xl text-slate-600 max-w-4xl mx-auto font-light leading-relaxed">
              Comprehensive features designed to streamline your inventory management and enhance operational efficiency.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {features.map((feature, index) => (
              <Card key={index} className="group hover:shadow-2xl transition-all duration-500 border-slate-200/60 bg-white/90 backdrop-blur-sm hover:bg-white hover:scale-105 rounded-2xl">
                <CardHeader className="pb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <feature.icon className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-xl font-bold text-slate-900 mb-3">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-slate-600 leading-relaxed text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 lg:py-40 bg-gradient-to-br from-slate-50 to-blue-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <Badge className="mb-6 bg-green-100 text-green-700 hover:bg-green-200 border-green-200 px-4 py-2 text-sm font-medium">
              <Star className="w-4 h-4 mr-2" />
              Customer Success
            </Badge>
            <h2 className="text-4xl md:text-6xl font-bold text-slate-900 mb-8 tracking-tight">
              Trusted by Industry
              <span className="block bg-gradient-to-r from-green-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Leaders Worldwide
              </span>
            </h2>
            <p className="text-xl text-slate-600 max-w-4xl mx-auto font-light leading-relaxed">
              Hear from teams who have improved their inventory management workflows with our comprehensive platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-white/90 backdrop-blur-sm border-slate-200/60 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 rounded-2xl">
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-lg">{testimonial.name}</h4>
                      <p className="text-sm text-slate-600 font-medium">{testimonial.role}</p>
                      <p className="text-sm text-slate-500">{testimonial.company}</p>
                    </div>
                  </div>
                  <div className="flex space-x-1 mt-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-700 leading-relaxed italic text-base font-medium">
                    "{testimonial.content}"
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 lg:py-40 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="w-full h-full bg-white/5 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[length:60px_60px]"></div>
        </div>
        <div className="absolute top-20 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-8 tracking-tight">
            Ready to Transform Your
            <span className="block text-blue-200">Inventory Operations?</span>
          </h2>
          <p className="text-xl text-blue-100 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
            Join growing businesses already using our platform to streamline their inventory management and boost operational efficiency.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link to="/login">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 shadow-2xl px-10 py-5 text-lg font-bold rounded-xl transition-all duration-300 hover:scale-105">
                Get Started
                <ArrowRight className="ml-3 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/20 hover:border-blue-200 px-10 py-5 text-lg font-bold rounded-xl transition-all duration-300">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-slate-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {/* Company Info */}
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-3 mb-8">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <Package className="h-8 w-8 text-white" />
                </div>
                <div>
                  <span className="text-2xl font-bold">InventoryPro</span>
                  <p className="text-sm text-slate-400 font-medium">Management System</p>
                </div>
              </div>
              <p className="text-slate-300 mb-8 max-w-md text-lg leading-relaxed">
                A modern inventory management system built with cutting-edge technology to help businesses efficiently track and manage their inventory with real-time insights.
              </p>
              <div className="flex space-x-6">
                <div className="flex items-center space-x-2 text-slate-300">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-sm font-medium">SOC 2 Compliant</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-300">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-sm font-medium">99.9% Uptime</span>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-slate-300">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">Contact via system</span>
                </div>
                <div className="flex items-center space-x-3 text-slate-300">
                  <Shield className="h-4 w-4" />
                  <span className="text-sm">Secure platform</span>
                </div>
                <div className="flex items-center space-x-3 text-slate-300">
                  <Zap className="h-4 w-4" />
                  <span className="text-sm">Real-time updates</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <div className="space-y-2">
                <Link to="/login" className="block text-slate-300 hover:text-white transition-colors text-sm">
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
