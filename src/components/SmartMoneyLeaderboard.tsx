import { LeaderboardEntry } from "@workspace/api-client-react/src/generated/api.schemas";
import { Link } from "wouter";
import { Trophy, ArrowUpRight, ArrowDownRight, ShieldCheck } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

export function SmartMoneyLeaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  if (!entries || entries.length === 0) return null;

  return (
    <div className="glass-panel p-6 rounded-2xl flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 rounded-lg bg-accent/20 text-accent">
          <Trophy className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Smart Money Accumulation</h3>
          <p className="text-xs text-muted-foreground">Top tickers by institutional interest</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 flex-1">
        {entries.slice(0, 5).map((entry, idx) => (
          <Link key={entry.ticker} href={`/signal/${entry.ticker}`}>
            <div className="group flex items-center p-3 rounded-xl bg-black/20 border border-white/5 hover:bg-white/5 hover:border-accent/30 transition-all cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-mono text-sm font-bold text-muted-foreground mr-4">
                #{idx + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold font-mono">{entry.ticker.replace('.NS', '')}</span>
                  {entry.is_high_conviction && <ShieldCheck className="w-3.5 h-3.5 text-yellow-500" />}
                </div>
                <div className="text-xs text-muted-foreground truncate">{entry.pattern_type}</div>
              </div>
              
              <div className="flex flex-col items-end mr-4">
                <span className="font-mono text-sm font-medium">{formatCurrency(entry.current_price)}</span>
                <span className={cn(
                  "text-xs font-mono flex items-center",
                  entry.price_change_pct >= 0 ? "text-success" : "text-destructive"
                )}>
                  {entry.price_change_pct >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(entry.price_change_pct).toFixed(2)}%
                </span>
              </div>

              <div className="w-12 h-12 relative flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-white/10"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    style={{ stroke: entry.smart_money_score >= 75 ? '#ef4444' : entry.smart_money_score >= 50 ? '#f59e0b' : '#10b981' }}
                    strokeDasharray={`${entry.smart_money_score}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute font-mono text-[10px] font-bold text-white">
                  {entry.smart_money_score}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
