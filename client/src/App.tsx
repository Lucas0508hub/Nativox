import { Suspense } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/lib/i18n";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FullPageLoadingSpinner } from "@/components/ui/loading-spinner";
import { GlobalHeader } from "@/components/GlobalHeader";
import { MobileNavigation } from "@/components/MobileNavigation";
import { Sidebar } from "@/components/ui/sidebar";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import LoginPage from "@/pages/login";
import BatchUpload from "@/pages/batch-upload";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import FolderSegments from "@/pages/folder-segments";
import TranscribeSegment from "@/pages/transcribe-segment";

function Router() {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullPageLoadingSpinner />;
  }

  return (
    <div className="min-h-screen">
      {!user ? (
        <>
          <Suspense fallback={<FullPageLoadingSpinner />}>
            <Switch>
              <Route path="/" component={Landing} />
              <Route path="/login" component={LoginPage} />
              <Route component={NotFound} />
            </Switch>
          </Suspense>
        </>
      ) : (
        <div className="flex h-screen">
          <div className="hidden md:block">
            <Sidebar />
          </div>
          <div className="flex-1 flex flex-col overflow-hidden">
            <GlobalHeader />
            <main className="flex-1 overflow-auto pt-14 md:pt-16 pb-20 md:pb-0">
              <Suspense fallback={<FullPageLoadingSpinner />}>
                <Switch>
                  <Route path="/" component={Projects} />
                  <Route path="/upload" component={BatchUpload} />
                  <Route path="/projects" component={Projects} />
                  <Route path="/project/:id" component={ProjectDetail} />
                  <Route path="/project/:projectId/folder/:folderId" component={FolderSegments} />
                  <Route path="/project/:projectId/folder/:folderId/segment/:segmentId" component={TranscribeSegment} />
                  <Route component={NotFound} />
                </Switch>
              </Suspense>
            </main>
          </div>
          <MobileNavigation />
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
