import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import Apply from "./pages/Apply";
import Candidates from "./pages/Candidates";
import Config from "./pages/Config";
import FormBuilder from "./pages/FormBuilder";
import Home from "./pages/Home";
import Jobs from "./pages/Jobs";
import Reports from "./pages/Reports";

function AdminShell({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/apply/:token" component={Apply} />
      <Route path="/admin">
        <AdminShell><Home /></AdminShell>
      </Route>
      <Route path="/admin/jobs">
        <AdminShell><Jobs /></AdminShell>
      </Route>
      <Route path="/admin/candidates">
        <AdminShell><Candidates /></AdminShell>
      </Route>
      <Route path="/admin/reports">
        <AdminShell><Reports /></AdminShell>
      </Route>
      <Route path="/admin/config">
        <AdminShell><Config /></AdminShell>
      </Route>
      <Route path="/admin/forms/:positionId">
        <AdminShell><FormBuilder /></AdminShell>
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
