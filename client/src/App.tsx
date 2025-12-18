import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import TokenSale from "./pages/TokenSale";
import Referral from "./pages/Referral";
import { useEffect } from "react";

/**
 * Service page:
 * /r/:address
 * Saves referrer and redirects to /referral
 */
function ReferralRedirect({ params }: { params: { address: string } }) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const referrer = params.address?.toLowerCase();

    if (referrer && referrer.startsWith("0x") && referrer.length >= 42) {
      localStorage.setItem("expoin-referrer", referrer);
    }

    setLocation("/referral");
  }, [params.address, setLocation]);

  return null;
}

function Router() {
  return (
    <Switch>
      {/* Token sale */}
      <Route path="/" component={TokenSale} />
      <Route path="/token-sale" component={TokenSale} />

      {/* Referral */}
      <Route path="/referral" component={Referral} />
      <Route path="/referral/admin" component={Referral} />

      {/* Short referral link */}
      <Route path="/r/:address">
        {(params) => <ReferralRedirect params={params} />}
      </Route>

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
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

export default App;
