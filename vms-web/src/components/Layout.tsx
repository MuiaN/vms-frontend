import { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuthStore } from '../store/auth';
import { LayoutDashboard, Car, Map, FileText, Receipt, Tags, ShoppingCart, LogOut, Hexagon, Building2, Users, Newspaper } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Layout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, clearAuth } = useAuthStore();

  const isManufacturer = user?.role === 'manufacturer';

  const manufacturerLinks = [
    { href: '/manufacturer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/manufacturer/vehicles', label: 'Vehicles', icon: Car },
    { href: '/manufacturer/tracking', label: 'Tracking', icon: Map },
    { href: '/manufacturer/news', label: 'News', icon: Newspaper },
    { href: '/manufacturer/distributors', label: 'Distributors', icon: Building2 },
    { href: '/manufacturer/users', label: 'Users', icon: Users },
    { href: '/manufacturer/documents', label: 'Documents', icon: FileText },
    { href: '/manufacturer/billing', label: 'Billing', icon: Receipt },
  ];

  const distributorLinks = [
    { href: '/distributor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/distributor/vehicles', label: 'Inventory', icon: Car },
    { href: '/distributor/pricing', label: 'Pricing', icon: Tags },
    { href: '/distributor/orders', label: 'Orders', icon: ShoppingCart },
    { href: '/distributor/tracking', label: 'Tracking', icon: Map },
    { href: '/distributor/news', label: 'News', icon: Newspaper },
    { href: '/distributor/documents', label: 'Documents', icon: FileText },
    { href: '/distributor/billing', label: 'Billing', icon: Receipt },
  ];

  const links = isManufacturer ? manufacturerLinks : distributorLinks;

  const handleLogout = () => {
    clearAuth();
    setLocation('/login');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Hexagon className="w-6 h-6 text-primary mr-3" />
          <span className="font-bold text-lg tracking-wider">VMS<span className="text-muted-foreground">_CORE</span></span>
        </div>
        <nav className="flex-1 py-6 px-3 space-y-1">
          {links.map((link) => {
            const isActive = location.startsWith(link.href);
            return (
              <Link key={link.href} href={link.href} className={`flex items-center px-3 py-2.5 rounded-md transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>
                <link.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground font-mono mb-3 px-2 truncate" title={user?.email}>{user?.email}</div>
          <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            End Session
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 border-b border-border flex items-center px-8 md:hidden">
          <Hexagon className="w-6 h-6 text-primary mr-3" />
          <span className="font-bold text-lg tracking-wider">VMS<span className="text-muted-foreground">_CORE</span></span>
        </header>
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
