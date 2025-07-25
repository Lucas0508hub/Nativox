import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useLanguage } from "@/lib/i18n";
import { 
  BarChart3, 
  FolderOpen, 
  CloudUpload, 
  CheckCircle, 
  Users, 
  Languages as LanguagesIcon
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
    icon: LanguagesIcon,
    roles: ["manager"]
  },
];

export function MobileNavigation() {
  const { user } = useAuth();
  const [location] = useLocation();
  const { t } = useLanguage();

  const canAccessRoute = (requiredRoles: string[]) => {
    return user?.role && requiredRoles.includes(user.role);
  };

  const isActive = (href: string) => {
    if (href === "/dashboard" && (location === "/" || location === "/dashboard")) {
      return true;
    }
    return location === href;
  };

  const mainNavigation = getNavigation(t).filter(item => canAccessRoute(item.roles));
  const adminNavigation = getAdminNavigation(t).filter(item => canAccessRoute(item.roles));

  return (
    <div className="md:hidden">
      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="flex items-center justify-around">
          {mainNavigation.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <a
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center py-2 px-3 min-w-0 flex-1 ${
                  active
                    ? "text-primary-500 bg-primary-50"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "text-primary-500" : "text-gray-600"}`} />
                <span className="text-xs mt-1 truncate">{item.name}</span>
              </a>
            );
          })}
        </div>
      </div>
      
      {/* Mobile Bottom Spacing */}
      <div className="h-16"></div>
    </div>
  );
}