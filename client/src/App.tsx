import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MobileNavigation } from "@/components/MobileNavigation";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Upload from "@/pages/upload";
import Validation from "@/pages/validation";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import Users from "@/pages/users";
import Languages from "@/pages/languages";
import { Suspense } from "react";


function LoadingSpinner() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}

function GlobalHeader() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-3 py-2 md:px-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-2">
          <h1 className="text-base md:text-lg font-semibold text-gray-900">AudioSeg</h1>
        </div>
        <LanguageSwitcher />
      </div>
    </header>
  );
}

function Router() {
  const { isAuthenticated, isLoading, isDevelopmentMode } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen">
      <GlobalHeader />
      <div className={isAuthenticated ? "pt-14 md:pt-16 pb-16 md:pb-0" : ""}>
        <Suspense fallback={<LoadingSpinner />}>
          <Switch>
            {!isAuthenticated ? (
              <Route path="/" component={Landing} />
            ) : (
              <>
                <Route path="/" component={Dashboard} />
                <Route path="/dashboard" component={Dashboard} />
                <Route path="/upload" component={Upload} />
                <Route path="/validation" component={Validation} />
                <Route path="/validation/:id" component={Validation} />
                <Route path="/projects" component={Projects} />
                <Route path="/project/:id" component={ProjectDetail} />
                <Route path="/users" component={Users} />
                <Route path="/languages" component={Languages} />
              </>
            )}
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </div>
      {isAuthenticated && <MobileNavigation />}
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </LanguageProvider>
  );
}

export default App;
