import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { 
  BarChart3, 
  FolderOpen, 
  CloudUpload, 
  CheckCircle, 
  Users, 
  Languages, 
  BarChart,
  AudioWaveform,
  LogOut
} from "lucide-react";

const getNavigation = (t: (key: string) => string) => [
  {
    name: t("dashboard"),
    href: "/dashboard",
    icon: BarChart3,
    roles: ["manager", "editor"]
  },
  {
    name: t("projects"), 
    href: "/projects",
    icon: FolderOpen,
    roles: ["manager", "editor"]
  },
  {
    name: t("upload"),
    href: "/upload", 
    icon: CloudUpload,
    roles: ["manager", "editor"]
  },
  {
    name: t("validation"),
    href: "/validation",
    icon: CheckCircle,
    roles: ["manager", "editor"]
  }
];

const getAdminNavigation = (t: (key: string) => string) => [
  {
    name: t("users"),
    href: "/users",
    icon: Users,
    roles: ["manager"]
  },
  {
    name: t("languages"),
    href: "/languages", 
    icon: Languages,
    roles: ["manager"]
  },
];

export function Sidebar() {
  const { user } = useAuth();
  const [location] = useLocation();
  const { t } = useLanguage();

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.firstName) {
      return user.firstName.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  const getUserDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.firstName) {
      return user.firstName;
    }
    return user?.email || "Usuário";
  };

  const getRoleDisplayName = (role?: string) => {
    return role === 'manager' ? t('manager') : t('editor');
  };

  const canAccessRoute = (requiredRoles: string[]) => {
    return user?.role && requiredRoles.includes(user.role);
  };

  const isActive = (href: string) => {
    if (href === "/dashboard" && (location === "/" || location === "/dashboard")) {
      return true;
    }
    return location === href;
  };

  return (
    <div className="w-64 bg-white shadow-lg flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <AudioWaveform className="text-white text-lg" />
          </div>
          <div>
            <h1 className="font-roboto font-bold text-gray-900">AudioSeg</h1>
            <p className="text-sm text-gray-500">{t('welcomeMessage').substring(0, 20)}...</p>
          </div>
        </div>
      </div>
      
      {/* User Info */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {getUserInitials()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">
              {getUserDisplayName()}
            </p>
            <p className="text-xs text-gray-500">
              {getRoleDisplayName(user?.role)}
            </p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 mt-4">
        <div className="space-y-1">
          {getNavigation(t).map((item) => {
            if (!canAccessRoute(item.roles)) return null;
            
            return (
              <a
                key={item.name}
                href={item.href}
                className={cn(
                  "sidebar-link",
                  isActive(item.href) && "active"
                )}
              >
                <item.icon className="w-5 h-5 mr-3" />
                <span className="font-medium">{item.name}</span>
              </a>
            );
          })}
        </div>
        
        {/* Admin Navigation */}
        {user?.role === 'manager' && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="px-6 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              {t('settings')}
            </p>
            <div className="space-y-1">
              {getAdminNavigation(t).map((item) => {
                if (!canAccessRoute(item.roles)) return null;
                
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "sidebar-link",
                      isActive(item.href) && "active"
                    )}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    <span className="font-medium">{item.name}</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </nav>
      
      {/* Logout */}
      <div className="p-4 border-t border-gray-200">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-gray-700 hover:bg-gray-50"
          onClick={() => window.location.href = '/api/logout'}
        >
          <LogOut className="w-5 h-5 mr-3" />
          <span className="font-medium">{t('logout')}</span>
        </Button>
      </div>
    </div>
  );
}
