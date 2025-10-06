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
    <div className="w-64 bg-gradient-to-b from-white to-gray-50 shadow-xl flex flex-col border-r border-gray-100">
      {/* Logo Section - Enhanced */}
      <div className="p-6 pb-5">
        <div className="flex items-center space-x-3 group">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
            <AudioWaveform className="text-white w-6 h-6" />
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-xl text-gray-900 tracking-tight">AudioSeg</h1>
            <p className="text-xs text-gray-500 font-medium">Audio Segmentation</p>
          </div>
        </div>
      </div>
      
      {/* User Info Card - Enhanced */}
      <div className="mx-4 mb-6 p-4 bg-gradient-to-br from-primary-50 to-white rounded-xl border border-primary-100 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-11 h-11 bg-gradient-to-br from-primary to-primary-600 rounded-full flex items-center justify-center shadow-md ring-2 ring-white">
              <span className="text-white text-sm font-semibold">
                {getUserInitials()}
              </span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate text-sm">
              {getUserDisplayName()}
            </p>
            <p className="text-xs text-primary-600 font-medium capitalize">
              {getRoleDisplayName(user?.role)}
            </p>
          </div>
        </div>
      </div>
      
      {/* Navigation - Enhanced */}
      <nav className="flex-1 px-3">
        <div className="space-y-1">
          {getNavigation(t).map((item) => {
            if (!canAccessRoute(item.roles)) return null;
            
            return (
              <a
                key={item.name}
                href={item.href}
                className={cn(
                  "sidebar-link group",
                  isActive(item.href) && "active"
                )}
              >
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300",
                  isActive(item.href) 
                    ? "bg-primary text-white shadow-md" 
                    : "bg-gray-100 text-gray-600 group-hover:bg-primary-50 group-hover:text-primary-600"
                )}>
                  <item.icon className="w-5 h-5" />
                </div>
                <span className={cn(
                  "font-medium transition-colors duration-300",
                  isActive(item.href) 
                    ? "text-primary-700" 
                    : "text-gray-700 group-hover:text-primary-600"
                )}>{item.name}</span>
              </a>
            );
          })}
        </div>
        
        {/* Admin Navigation - Enhanced */}
        {user?.role === 'manager' && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="px-3 mb-3 flex items-center space-x-2">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                {t('settings')}
              </p>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
            </div>
            <div className="space-y-1">
              {getAdminNavigation(t).map((item) => {
                if (!canAccessRoute(item.roles)) return null;
                
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "sidebar-link group",
                      isActive(item.href) && "active"
                    )}
                  >
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300",
                      isActive(item.href) 
                        ? "bg-primary text-white shadow-md" 
                        : "bg-gray-100 text-gray-600 group-hover:bg-primary-50 group-hover:text-primary-600"
                    )}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className={cn(
                      "font-medium transition-colors duration-300",
                      isActive(item.href) 
                        ? "text-primary-700" 
                        : "text-gray-700 group-hover:text-primary-600"
                    )}>{item.name}</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </nav>
      
      {/* Logout - Enhanced */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all duration-300 group py-5 rounded-lg"
          onClick={() => window.location.href = '/api/logout'}
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gray-100 group-hover:bg-red-100 transition-colors duration-300 mr-3">
            <LogOut className="w-5 h-5" />
          </div>
          <span className="font-medium">{t('logout')}</span>
        </Button>
      </div>
    </div>
  );
}
