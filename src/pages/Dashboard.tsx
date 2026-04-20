import { useGetAllSignals, useGetSectorData, useGetLeaderboard } from "@workspace/api-client-react";
import { useRefresh } from "@/context/RefreshContext";
import { SignalCard } from "@/components/SignalCard";
import { SectorHeatmap } from "@/components/SectorHeatmap";
import { SmartMoneyLeaderboard } from "@/components/SmartMoneyLeaderboard";
import { Activity, ShieldCheck, Target, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Dashboard() {
  const { refreshInterval } = useRefresh();
  
  const { data: signals, isLoading: loadingSignals } = useGetAllSignals({
    query: { refetchInterval: refreshInterval }
  });
  
  const { data: sectors } = useGetSectorData({
    query: { refetchInterval: refreshInterval }
  });
  
  const { data: leaderboard } = useGetLeaderboard({
    query: { refetchInterval: refreshInterval }
  });

  if (loadingSignals) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground animate-pulse font-mono text-sm">Processing Neural Signals...</p>
      </div>
    );
  }

  const highConvictionCount = signals?.filter(s => s.is_high_conviction).length || 0;
  const avgSms = signals?.length ? Math.round(signals.reduce((acc, s) => acc + s.smart_money_score, 0) / signals.length) : 0;
  const bullishCount = signals?.filter(s => s.consensus.verdict.includes("BULLISH")).length || 0;
  const bearishCount = signals?.filter(s => s.consensus.verdict.includes("BEARISH")).length || 0;
  const marketSentiment = bullishCount > bearishCount ? "BULLISH" : bearishCount > bullishCount ? "BEARISH" : "NEUTRAL";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Top Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          icon={Activity} 
          label="Total Scanned" 
          value={signals?.length.toString() || "0"} 
          subtext="NSE Universe"
        />
        <StatCard 
          icon={ShieldCheck} 
          label="High Conviction" 
          value={highConvictionCount.toString()} 
          subtext="Confirmed Setups"
          valueColor="text-yellow-500"
        />
        <StatCard 
          icon={Target} 
          label="Avg Smart Money" 
          value={`${avgSms}/100`} 
          subtext="Institutional Flow"
          valueColor="text-accent"
        />
        <StatCard 
          icon={TrendingUp} 
          label="Market Breadth" 
          value={marketSentiment} 
          subtext={`${bullishCount} Bullish / ${bearishCount} Bearish`}
          valueColor={marketSentiment === "BULLISH" ? "text-success" : marketSentiment === "BEARISH" ? "text-destructive" : "text-muted-foreground"}
        />
      </div>

      {sectors && <SectorHeatmap sectors={sectors} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold font-sans flex items-center gap-3">
              <div className="w-3 h-3 bg-primary rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
              Live Market Signals
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {signals?.map((signal, idx) => (
              <SignalCard key={signal.ticker} signal={signal} index={idx} />
            ))}
          </div>
        </div>

        <div className="lg:col-span-1">
          {leaderboard && <SmartMoneyLeaderboard entries={leaderboard} />}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subtext, valueColor = "text-white" }: any) {
  return (
    <div className="glass-panel p-5 rounded-2xl flex items-center gap-4">
      <div className="p-3 rounded-xl bg-white/5 border border-white/10">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className={cn("text-2xl font-bold font-mono tracking-tight", valueColor)}>{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{subtext}</p>
      </div>
    </div>
  );
}
