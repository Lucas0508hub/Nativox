import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/lib/i18n";
import { useConfirmationDialog } from "@/contexts/ConfirmationContext";
import { AudioWaveform, LogOut, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function GlobalHeader() {
  const { user, logout } = useAuth();
  const [logoutLoading, setLogoutLoading] = useState(false);
  const { t } = useLanguage();
  const { confirm } = useConfirmationDialog();

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    const confirmed = await confirm(t('confirmLogout'), {
      title: t('logout'),
      variant: 'default'
    });
    
    if (confirmed) {
      setLogoutLoading(true);
      await logout();
      setLogoutLoading(false);
    }
  };

  return (
    <header className="fixed top-0 left-0 md:left-72 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200/50 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 md:px-6">
        {/* Logo Section */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-sm">
              <img 
                src="/assets/logo-icon.png" 
                alt="Shemasts Logo" 
                className="w-5 h-5 object-contain"
              />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Shemasts</h1>
              <p className="text-xs text-gray-500 leading-tight hidden sm:block">Audio Segmentation</p>
            </div>
          </div>
        </div>

        {/* User Section */}
        <div className="flex items-center space-x-3">
          {/* Language Switcher */}
          <LanguageSwitcher />
          
          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-50"
              >
                <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                  {user.firstName && user.lastName ? (
                    <span className="text-white text-xs font-semibold">
                      {`${user.firstName[0]}${user.lastName[0]}`.toUpperCase()}
                    </span>
                  ) : user.firstName ? (
                    <span className="text-white text-xs font-semibold">
                      {user.firstName.substring(0, 2).toUpperCase()}
                    </span>
                  ) : (
                    <User className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className="flex flex-col items-start hidden sm:flex">
                  <span className="text-sm font-medium text-gray-900 leading-tight">
                    {user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}` 
                      : user.firstName || user.username}
                  </span>
                  <span className="text-xs text-gray-500 leading-tight capitalize">
                    {user.role || 'user'}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-gray-900">
                  {user.firstName && user.lastName 
                    ? `${user.firstName} ${user.lastName}` 
                    : user.firstName || user.username}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {user.role || 'user'}
                </p>
                {user.email && (
                  <p className="text-xs text-gray-400 mt-1">
                    {user.email}
                  </p>
                )}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                disabled={logoutLoading}
                className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
              >
                {logoutLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('loading')}
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4 mr-2" />
                    {t('logout')}
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
