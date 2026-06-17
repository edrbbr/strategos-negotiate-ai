import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Pricing from "./pages/Pricing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CheckEmail from "./pages/CheckEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import { AppLayout } from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import CaseDetail from "./pages/CaseDetail";
import Settings from "./pages/Settings";
import Billing from "./pages/Billing";
import Admin from "./pages/Admin";
import AdminContent from "./pages/AdminContent";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminKnowledge from "./pages/AdminKnowledge";
import { AdminRoute } from "@/components/AdminRoute";
import NotFound from "./pages/NotFound";
import Unsubscribe from "./pages/Unsubscribe";
import Privacy from "./pages/Privacy";
import SelectContext from "./pages/SelectContext";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { FloatingThemeToggle } from "@/components/FloatingThemeToggle";
import { CookieConsent } from "@/components/CookieConsent";
import RetailLanding from "./pages/retail/RetailLanding";
import RetailLogin from "./pages/retail/RetailLogin";
import RetailRegister from "./pages/retail/RetailRegister";
import Moebelhandel from "./pages/retail/branchen/Moebelhandel";
import KfzWerkstatt from "./pages/retail/branchen/KfzWerkstatt";
import Elektronikhandel from "./pages/retail/branchen/Elektronikhandel";
import MagazinIndex from "./pages/magazin/MagazinIndex";
import MagazinArticle from "./pages/magazin/MagazinArticle";
import Insights from "./pages/Insights";
import { RetailLayout } from "@/components/retail/RetailLayout";
import { RetailProtectedRoute } from "@/components/retail/RetailProtectedRoute";
import RetailDashboard from "./pages/retail/app/RetailDashboard";
import RetailCases from "./pages/retail/app/RetailCases";
import RetailNewCase from "./pages/retail/app/RetailNewCase";
import RetailCaseDetail from "./pages/retail/app/RetailCaseDetail";
import RetailApprovals from "./pages/retail/app/RetailApprovals";
import RetailTeam from "./pages/retail/app/RetailTeam";
import RetailSettings from "./pages/retail/app/RetailSettings";
import RetailPolicies from "./pages/retail/app/RetailPolicies";
import RetailSupport from "./pages/retail/app/RetailSupport";
import RetailBilling from "./pages/retail/app/RetailBilling";
import AdminB2B from "./pages/admin/AdminB2B";
import AdminB2BLeads from "./pages/admin/AdminB2BLeads";
import AdminB2BAccount from "./pages/admin/AdminB2BAccount";
import AdminB2BTickets from "./pages/admin/AdminB2BTickets";
import AdminMagazin from "./pages/admin/AdminMagazin";
import { useUtmCapture, useHtmlLang } from "@/hooks/useUtmCapture";

const queryClient = new QueryClient();

/** Mount-only effects (UTM capture + <html lang>) that need to live inside the Router. */
const RootEffects = () => {
  useUtmCapture();
  useHtmlLang("de");
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <PaymentTestModeBanner />
            <RootEffects />
            <Routes>
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/preise" element={<Pricing />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/registrierung" element={<Register />} />
            <Route path="/check-email" element={<CheckEmail />} />
            <Route path="/passwort-vergessen" element={<ForgotPassword />} />
            <Route path="/passwort-neu" element={<ResetPassword />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/datenschutz" element={<Privacy />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/select-context" element={<SelectContext />} />

            {/* Retail Shield (B2B) public */}
            <Route path="/retail" element={<RetailLanding />} />
            <Route path="/retail/login" element={<RetailLogin />} />
            <Route path="/retail/register" element={<RetailRegister />} />
            <Route path="/retail/moebelhandel" element={<Moebelhandel />} />
            <Route path="/retail/kfz-werkstatt" element={<KfzWerkstatt />} />
            <Route path="/retail/elektronikhandel" element={<Elektronikhandel />} />

            {/* Magazin */}
            <Route path="/magazin" element={<MagazinIndex />} />
            <Route path="/magazin/:slug" element={<MagazinArticle />} />
            <Route path="/insights" element={<Insights />} />

            {/* Retail Shield app (protected) */}
            <Route path="/retail/app" element={<RetailProtectedRoute><RetailLayout /></RetailProtectedRoute>}>
              <Route path="dashboard" element={<RetailDashboard />} />
              <Route path="cases" element={<RetailCases />} />
              <Route path="cases/new" element={<RetailNewCase />} />
              <Route path="cases/:id" element={<RetailCaseDetail />} />
              <Route path="approvals" element={<RetailApprovals />} />
              <Route path="team" element={<RetailTeam />} />
              <Route path="settings" element={<RetailSettings />} />
              <Route path="policies" element={<RetailPolicies />} />
              <Route path="support" element={<RetailSupport />} />
              <Route path="billing" element={<RetailBilling />} />
            </Route>

            {/* Protected */}
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="case/:id" element={<CaseDetail />} />
              <Route path="case/new" element={<CaseDetail />} />
              <Route path="settings" element={<Settings />} />
              <Route path="billing" element={<Billing />} />
            </Route>

            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/content"
              element={
                <AdminRoute>
                  <AdminContent />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <AdminRoute>
                  <AdminAnalytics />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/knowledge"
              element={
                <AdminRoute>
                  <AdminKnowledge />
                </AdminRoute>
              }
            />
            <Route path="/admin/b2b" element={<AdminRoute><AdminB2B /></AdminRoute>} />
            <Route path="/admin/b2b/leads" element={<AdminRoute><AdminB2BLeads /></AdminRoute>} />
            <Route path="/admin/b2b/tickets" element={<AdminRoute><AdminB2BTickets /></AdminRoute>} />
            <Route path="/admin/b2b/:id" element={<AdminRoute><AdminB2BAccount /></AdminRoute>} />
            <Route path="/admin/magazin" element={<AdminRoute><AdminMagazin /></AdminRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
            <FloatingThemeToggle />
            <CookieConsent />
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
