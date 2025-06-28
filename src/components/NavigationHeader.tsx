import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Home } from 'lucide-react';

interface NavigationHeaderProps {
  title: string;
  description?: string;
  currentSection?: string;
  sections?: Array<{
    id: string;
    name: string;
    href?: string;
  }>;
  activeSection?: string;
  onSectionChange?: (sectionId: string) => void;
}

export function NavigationHeader({ 
  title, 
  description, 
  currentSection,
  sections = [],
  activeSection,
  onSectionChange 
}: NavigationHeaderProps) {
  const location = useLocation();
  const { user } = useAuth();

  const getBreadcrumbItems = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const items = [
      { name: 'Dashboard', href: '/dashboard' }
    ];

    // Add current page
    if (pathSegments.length > 1) {
      const currentPath = pathSegments[pathSegments.length - 1];
      const pageName = currentPath
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      items.push({ name: pageName, href: location.pathname });
    }

    // Add current section if provided
    if (currentSection) {
      items.push({ name: currentSection, href: '#' });
    }

    return items;
  };

  const breadcrumbItems = getBreadcrumbItems();

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'warehouse_staff':
        return 'default';
      case 'supplier':
        return 'secondary';
      case 'internal_user':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'warehouse_staff':
        return 'Warehouse Staff';
      case 'supplier':
        return 'Supplier';
      case 'internal_user':
        return 'Internal User';
      default:
        return role;
    }
  };

  return (
    <div className="space-y-4 pb-4 border-b">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/dashboard" className="flex items-center space-x-1">
                <Home className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          
          {breadcrumbItems.slice(1).map((item, index) => (
            <React.Fragment key={index}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {item.href && index < breadcrumbItems.length - 2 ? (
                  <BreadcrumbLink asChild>
                    <Link to={item.href}>{item.name}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{item.name}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            {user && (
              <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                {getRoleDisplayName(user.role)}
              </Badge>
            )}
          </div>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
      </div>

      {/* Section Navigation */}
      {sections.length > 0 && (
        <div className="flex space-x-1 bg-muted/30 p-1 rounded-lg">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => onSectionChange?.(section.id)}
              className={`
                px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
                ${activeSection === section.id
                  ? 'bg-background text-foreground shadow-sm border-l-2 border-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                }
              `}
            >
              {section.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}