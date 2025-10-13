import React from 'react';
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { useConfirmationDialog } from "@/contexts/ConfirmationContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { NavigationItem, User } from "@/types";
import { FolderOpen, CloudUpload, AudioWaveform, LogOut, Menu, X, Users } from "lucide-react";

const getNavigation = (t: (key: string) => string): NavigationItem[] => [
  {
    name: t("projects"), 
    href: "/projects",
    icon: FolderOpen,
    roles: ["admin", "manager", "editor"]
  },
  {
    name: t("users"),
    href: "/users",
    icon: Users,
    roles: ["admin"]
  }
];

const getUserInitials = (user: User | null): string => {
  if (!user) return "U";
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }
  if (user.firstName) {
    return user.firstName.substring(0, 2).toUpperCase();
  }
  if (user.email) {
    return user.email.substring(0, 2).toUpperCase();
  }
  return "U";
};

const getUserDisplayName = (user: User | null): string => {
  if (!user) return "Usuário";
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  if (user.firstName) {
    return user.firstName;
  }
  return user.email || "Usuário";
};

const getRoleDisplayName = (role: string | undefined, t: (key: string) => string): string => {
  switch (role) {
    case 'admin': return t('admin') || 'Admin';
    case 'manager': return t('manager') || 'Manager';
    case 'editor': return t('editor') || 'Editor';
    default: return t('user') || 'User';
  }
};

const canAccessRoute = (user: User | null, requiredRoles: string[]): boolean => {
  return Boolean(user?.role && requiredRoles.includes(user.role));
};

const isActive = (href: string, location: string): boolean => {
  if (href === "/projects" && (location === "/" || location === "/projects")) {
    return true;
  }
  return location === href;
};

export function Sidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { t } = useLanguage();
  const { confirm } = useConfirmationDialog();
  const { isOpen, toggleSidebar, closeSidebar } = useSidebar();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={closeSidebar}
        />
      )}
      
      {/* Sidebar */}
      <div className={`${isOpen ? 'w-72' : 'w-16'} bg-gray-800 shadow-xl flex flex-col border-r border-gray-700 h-screen relative z-40 transition-all duration-300 ease-in-out`}>
      {/* Hamburger Menu at Top */}
      <div className="p-4 border-b border-gray-700">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="w-full justify-center text-white hover:bg-gray-700 p-2 h-10"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Logo Section */}
      <div className={cn("pb-4", isOpen ? "p-6" : "p-2")}>
        <div className={cn("flex items-center group", isOpen ? "space-x-3" : "justify-center")}>
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
            <img 
              src="/assets/logo-icon.png" 
              alt="Shemasts Logo" 
              className="w-6 h-6 object-contain"
            />
          </div>
          {isOpen && (
            <div className="flex-1">
              <h1 className="font-bold text-xl text-white tracking-tight">Shemasts</h1>
              <p className="text-xs text-gray-300 font-medium">Audio Segmentation</p>
            </div>
          )}
        </div>
      </div>
      
      {isOpen && (
        <div className="mx-4 mb-4 p-4 bg-gray-700/50 rounded-xl border border-gray-600/50 hover:bg-gray-700 transition-colors duration-200">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-11 h-11 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center shadow-md">
                <span className="text-white text-sm font-bold">
                  {getUserInitials(user)}
                </span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-gray-800"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white truncate text-sm">
                {getUserDisplayName(user)}
              </p>
              <p className="text-xs text-gray-300 font-medium capitalize">
                {getRoleDisplayName(user?.role, t)}
              </p>
            </div>
          </div>
        </div>
      )}
      
      <nav className={cn("flex-1 py-4", isOpen ? "px-4" : "px-2")}>
        <div className="space-y-3">
          {isOpen && (
            <div className="px-3 py-2">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                {t('navigation') || 'Navigation'}
              </h3>
            </div>
          )}
          <div className={cn("space-y-2", !isOpen && "space-y-3")}>
            {getNavigation(t).map((item) => {
              if (!canAccessRoute(user, item.roles)) return null;
              
              return (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={() => {
                    // Close sidebar on mobile after navigation
                    if (window.innerWidth < 768) {
                      closeSidebar();
                    }
                  }}
                  className={cn(
                    "flex items-center rounded-xl transition-all duration-300 group relative",
                    isActive(item.href, location) 
                      ? "bg-orange-500 text-white shadow-lg shadow-orange-500/25" 
                      : "text-gray-300 hover:bg-gray-700/50 hover:text-white",
                    isOpen ? "space-x-3 px-4 py-3" : "justify-center px-1 py-3"
                  )}
                  title={!isOpen ? item.name : undefined}
                >
                  {/* Active indicator bar - only show when open */}
                  {isActive(item.href, location) && isOpen && (
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"></div>
                  )}
                  
                  <div className={cn(
                    "rounded-lg flex items-center justify-center transition-all duration-300",
                    isActive(item.href, location) 
                      ? "bg-white/20 text-white" 
                      : "text-gray-300 group-hover:text-white",
                    isOpen ? "w-10 h-10" : "w-10 h-10"
                  )}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  {isOpen && (
                    <span className={cn(
                      "font-semibold transition-colors duration-300",
                      isActive(item.href, location) 
                        ? "text-white" 
                        : "text-gray-300 group-hover:text-white"
                    )}>{item.name}</span>
                  )}
                </a>
              );
            })}
          </div>
        </div>
      </nav>
      
      <div className={cn("border-t border-gray-700/50", isOpen ? "p-4" : "p-2")}>
        <Button 
          variant="ghost" 
          className={cn(
            "w-full text-gray-300 hover:bg-red-600/10 hover:text-red-400 transition-all duration-300 group rounded-xl",
            isOpen ? "justify-start py-3" : "justify-center px-1 py-3"
          )}
          onClick={async () => {
            const confirmed = await confirm(t('confirmLogout') || 'Are you sure you want to logout?', {
              title: t('logout'),
              variant: 'default'
            });
            
            if (confirmed) {
              await logout();
            }
          }}
          title={!isOpen ? t('logout') : undefined}
        >
          <div className={cn(
            "rounded-lg bg-gray-600/50 text-gray-300 group-hover:bg-red-500 group-hover:text-white flex items-center justify-center transition-all duration-300",
            isOpen ? "w-10 h-10 mr-3" : "w-10 h-10"
          )}>
            <LogOut className="w-5 h-5" />
          </div>
          {isOpen && (
            <span className="font-semibold transition-colors duration-300 group-hover:text-red-400">
              {t('logout') || 'Logout'}
            </span>
          )}
        </Button>
      </div>
    </div>
    </>
  );
}
