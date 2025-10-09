import React from 'react';
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { useConfirmationDialog } from "@/contexts/ConfirmationContext";
import { NavigationItem, User } from "@/types";
import { FolderOpen, CloudUpload, AudioWaveform, LogOut } from "lucide-react";

const getNavigation = (t: (key: string) => string): NavigationItem[] => [
  {
    name: t("projects"), 
    href: "/projects",
    icon: FolderOpen,
    roles: ["admin", "manager", "editor"]
  },
  {
    name: t("upload"),
    href: "/upload", 
    icon: CloudUpload,
    roles: ["admin", "manager", "editor"]
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
  const { user } = useAuth();
  const [location] = useLocation();
  const { t } = useLanguage();
  const { confirm } = useConfirmationDialog();

  return (
    <div className="w-72 bg-gradient-to-b from-white to-gray-50 shadow-xl flex flex-col border-r border-gray-100 h-screen relative z-40">
      <div className="p-6 pb-5">
        <div className="flex items-center space-x-3 group">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
            <AudioWaveform className="text-white w-6 h-6" />
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-xl text-gray-900 tracking-tight">Shemasts</h1>
            <p className="text-xs text-gray-500 font-medium">Audio Segmentation</p>
          </div>
        </div>
      </div>
      
      <div className="mx-4 mb-6 p-4 bg-gradient-to-br from-primary-50 to-white rounded-xl border border-primary-100 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-11 h-11 bg-gradient-to-br from-primary to-primary-600 rounded-full flex items-center justify-center shadow-md ring-2 ring-white">
              <span className="text-white text-sm font-semibold">
                {getUserInitials(user)}
              </span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate text-sm">
              {getUserDisplayName(user)}
            </p>
            <p className="text-xs text-primary-600 font-medium capitalize">
              {getRoleDisplayName(user?.role, t)}
            </p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 px-4 py-2">
        <div className="space-y-2">
          <div className="px-3 py-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {t('navigation') || 'Navigation'}
            </h3>
          </div>
          <div className="space-y-1">
            {getNavigation(t).map((item) => {
              if (!canAccessRoute(user, item.roles)) return null;
              
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-300 group",
                    isActive(item.href, location) 
                      ? "bg-primary text-white shadow-lg" 
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300",
                    isActive(item.href, location) 
                      ? "bg-white/20 text-white" 
                      : "bg-gray-100 text-gray-600 group-hover:bg-primary-50 group-hover:text-primary-600"
                  )}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className={cn(
                    "font-medium transition-colors duration-300",
                    isActive(item.href, location) 
                      ? "text-white" 
                      : "text-gray-700 group-hover:text-gray-900"
                  )}>{item.name}</span>
                </a>
              );
            })}
          </div>
        </div>
      </nav>
      
      <div className="p-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all duration-300 group py-4 rounded-xl"
          onClick={async () => {
            const confirmed = await confirm(t('confirmLogout') || 'Are you sure you want to logout?', {
              title: t('logout'),
              variant: 'default'
            });
            
            if (confirmed) {
              window.location.href = '/api/logout';
            }
          }}
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 group-hover:bg-red-100 transition-colors duration-300 mr-3">
            <LogOut className="w-5 h-5" />
          </div>
          <span className="font-medium">{t('logout') || 'Logout'}</span>
        </Button>
      </div>
    </div>
  );
}
