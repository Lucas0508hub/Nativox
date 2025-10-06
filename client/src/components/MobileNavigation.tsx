import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useLanguage } from "@/lib/i18n";
import { motion } from "framer-motion";
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
      <div className="fixed bottom-0 left-0 right-0 bg-white z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] bg-gradient-to-t from-gray-50/30 to-white">
        <div className="flex items-center justify-around relative">
          {mainNavigation.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <motion.a
                key={item.name}
                href={item.href}
                className="flex flex-col items-center justify-center py-3 px-3 min-w-0 flex-1 relative group"
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.15, type: "spring", stiffness: 400 }}
              >
                {/* Top indicator line for active state */}
                <motion.div
                  className="absolute top-0 left-1/2 h-0.5 bg-gradient-to-r from-primary-400 to-primary-600 rounded-full"
                  initial={false}
                  animate={{
                    width: active ? "60%" : "0%",
                    x: "-50%",
                    opacity: active ? 1 : 0
                  }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                />
                
                {/* Icon with background circle */}
                <motion.div
                  className={`relative flex items-center justify-center rounded-full transition-all duration-300 ${
                    active
                      ? "bg-primary-100"
                      : "bg-transparent group-hover:bg-gray-100"
                  }`}
                  style={{ 
                    width: "44px", 
                    height: "44px" 
                  }}
                >
                  <motion.div
                    animate={{
                      scale: active ? 1.1 : 1,
                      rotate: active ? [0, -5, 5, 0] : 0
                    }}
                    transition={{ 
                      scale: { duration: 0.3 },
                      rotate: { duration: 0.5, delay: 0.1 }
                    }}
                  >
                    <Icon 
                      className={`w-6 h-6 transition-colors duration-300 ${
                        active ? "text-primary-600" : "text-gray-500 group-hover:text-gray-700"
                      }`} 
                    />
                  </motion.div>
                  
                  {/* Ripple effect on tap */}
                  <motion.div
                    className="absolute inset-0 rounded-full bg-primary-400"
                    initial={{ scale: 0, opacity: 0.5 }}
                    whileTap={{ scale: 2, opacity: 0 }}
                    transition={{ duration: 0.4 }}
                  />
                </motion.div>
                
                {/* Label with smooth color transition */}
                <motion.span 
                  className={`text-xs mt-1 truncate transition-all duration-300 ${
                    active ? "text-primary-600 font-semibold" : "text-gray-600 font-medium group-hover:text-gray-900"
                  }`}
                  animate={{
                    scale: active ? 1.05 : 1
                  }}
                  transition={{ duration: 0.3 }}
                >
                  {item.name}
                </motion.span>
              </motion.a>
            );
          })}
        </div>
      </div>
      
      {/* Mobile Bottom Spacing */}
      <div className="h-20"></div>
    </div>
  );
}