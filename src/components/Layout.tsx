import { Link, useLocation } from "wouter";
import { Eye, Activity, LineChart, List, Clock, ShieldCheck, Power } from "lucide-react";
import { useRefresh } from "@/context/RefreshContext";
import { cn } from "@/lib/utils";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { isAutoRefresh, toggleAutoRefresh } = useRefresh();

  const navItems = [
    { href: "/", label: "Dashboard", icon: Activity },
    { href: "/watchlist", label: "Watchlist", icon: List },
  ];

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background Noise overlay for texture */}
      <div 
        className="fixed inset-0 z-[-1] opacity-[0.03] pointer-events-none mix-blend-overlay"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/noise.png)` }}
      />
      
      <header className="sticky top-0 z-50 glass-panel border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-white/10 group-hover:border-primary/50 transition-colors">
              <Eye className="w-5 h-5 text-primary" />
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            </div>
            <span className="font-bold text-xl tracking-tight flex items-center gap-1">
              Market<span className="text-gradient">Shadow</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    isActive 
                      ? "bg-white/10 text-white shadow-inner" 
                      : "text-muted-foreground hover:text-white hover:bg-white/5"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-black/20 px-3 py-1.5 rounded-full border border-white/5">
              <div className={cn("w-2 h-2 rounded-full", isAutoRefresh ? "bg-success animate-pulse" : "bg-muted")} />
              <span>LIVE NSE</span>
            </div>
            <button
              onClick={toggleAutoRefresh}
              className={cn(
                "p-2 rounded-lg border transition-all duration-300 flex items-center gap-2",
                isAutoRefresh 
                  ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20" 
                  : "bg-transparent border-white/10 text-muted-foreground hover:text-white hover:bg-white/5"
              )}
              title="Toggle Auto Refresh (5m)"
            >
              <Power className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
