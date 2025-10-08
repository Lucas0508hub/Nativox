import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function GlobalHeader() {
  const { user, logout } = useAuth();
  const [logoutLoading, setLogoutLoading] = useState(false);

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    if (confirm("Are you sure you want to logout?")) {
      setLogoutLoading(true);
      await logout();
      setLogoutLoading(false);
    }
  };

  return (
    <header className="fixed top-0 left-0 md:left-72 right-0 z-50 bg-white border-b border-gray-200 px-3 py-2 md:px-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-2">
          <h1 className="text-base md:text-lg font-semibold text-gray-900">AudioSeg</h1>
        </div>
        <div className="flex items-center space-x-2 md:space-x-4">
          <span className="hidden sm:inline text-sm text-gray-600">
            Welcome, {user.firstName || user.username}
          </span>
          <LanguageSwitcher />
          <button
            onClick={handleLogout}
            disabled={logoutLoading}
            className="text-xs md:text-sm text-red-600 hover:text-red-800 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {logoutLoading ? "Logging out..." : "Logout"}
          </button>
        </div>
      </div>
    </header>
  );
}
