import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Context
import { RefreshProvider } from "@/context/RefreshContext";

// Components
import { Layout } from "@/components/Layout";

// Pages
import { Dashboard } from "@/pages/Dashboard";
import { SignalDetail } from "@/pages/SignalDetail";
import { Watchlist } from "@/pages/Watchlist";
import { Backtest } from "@/pages/Backtest";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/signal/:ticker" component={SignalDetail} />
        <Route path="/watchlist" component={Watchlist} />
        <Route path="/backtest/:ticker" component={Backtest} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RefreshProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </RefreshProvider>
    </QueryClientProvider>
  );
}

export default App;
