import { useRoute, Link } from "wouter";
import { useRunBacktest } from "@workspace/api-client-react";
import { ArrowLeft, Target, TrendingUp, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { format } from "date-fns";

export function Backtest() {
  const [, params] = useRoute("/backtest/:ticker");
  const ticker = params?.ticker || "";

  const { data: result, isLoading, isError } = useRunBacktest(ticker, {
    query: { enabled: !!ticker, retry: false }
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      <Link href={`/signal/${ticker}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white mb-2 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Signal
      </Link>
      
      <div className="mb-8">
        <h1 className="text-4xl font-bold font-mono tracking-tight">{ticker.replace('.NS', '')}</h1>
        <p className="text-muted-foreground text-lg mt-1">Historical Signal Performance (Walk-Forward Validation)</p>
      </div>

      {isLoading ? (
        <div className="glass-panel rounded-2xl p-12 flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-6" />
          <h3 className="text-xl font-bold mb-2">Running Walk-Forward Backtest</h3>
          <p className="text-muted-foreground max-w-md text-center">
            Simulating historical trades based on anomaly detection and Smart Money signals over the past year...
          </p>
        </div>
      ) : isError || !result ? (
        <div className="glass-panel rounded-2xl p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Backtest Failed</h2>
          <p className="text-muted-foreground mt-2">Not enough historical data or model convergence failed.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Target className="w-24 h-24 text-primary" />
              </div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Signal Precision</h3>
              <div className="flex items-baseline gap-2">
                <span className={cn(
                  "text-5xl font-bold font-mono tracking-tighter",
                  result.precision > 60 ? "text-success" : result.precision > 40 ? "text-warning" : "text-destructive"
                )}>
                  {result.precision}%
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {result.correct_signals} correct out of {result.total_signals} trades
              </p>
            </div>

            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Avg Forward Return</h3>
              <div className="flex items-baseline gap-2">
                <span className={cn(
                  "text-5xl font-bold font-mono tracking-tighter",
                  (result.avg_return_pct ?? 0) >= 0 ? "text-success" : "text-destructive"
                )}>
                  {(result.avg_return_pct ?? 0) > 0 ? "+" : ""}{result.avg_return_pct}%
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Maximum excursion within 5 days</p>
            </div>

            <div className="glass-panel p-6 rounded-2xl flex flex-col justify-center">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Verdict</h3>
              {result.precision >= 65 ? (
                <div className="flex items-center gap-3 text-success">
                  <CheckCircle2 className="w-8 h-8" />
                  <span className="text-xl font-bold">Highly Predictable</span>
                </div>
              ) : result.precision >= 50 ? (
                <div className="flex items-center gap-3 text-warning">
                  <AlertTriangle className="w-8 h-8" />
                  <span className="text-xl font-bold">Tradable with caution</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-destructive">
                  <XCircle className="w-8 h-8" />
                  <span className="text-xl font-bold">Unreliable Patterns</span>
                </div>
              )}
            </div>
          </div>

          {/* Trade Log */}
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 bg-black/20">
              <h3 className="font-bold">Recent Backtest Trades</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-black/40">
                  <tr>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Setup Pattern</th>
                    <th className="px-6 py-4 font-medium">Entry Price</th>
                    <th className="px-6 py-4 font-medium">Max Return (5D)</th>
                    <th className="px-6 py-4 font-medium text-center">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {!result.signals?.length ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No historical signals found</td>
                    </tr>
                  ) : (
                    result.signals.map((sig, i) => (
                      <motion.tr 
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-6 py-4 font-mono">{format(new Date(sig.date), "MMM dd, yyyy")}</td>
                        <td className="px-6 py-4 font-medium">{sig.pattern}</td>
                        <td className="px-6 py-4 font-mono">{formatCurrency(sig.entry_price)}</td>
                        <td className={cn(
                          "px-6 py-4 font-mono font-bold",
                          sig.max_return_pct >= 0 ? "text-success" : "text-destructive"
                        )}>
                          {sig.max_return_pct > 0 ? "+" : ""}{sig.max_return_pct}%
                        </td>
                        <td className="px-6 py-4 text-center">
                          {sig.correct ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-success/20 text-success border border-success/30">
                              WIN
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-destructive/20 text-destructive border border-destructive/30">
                              LOSS
                            </span>
                          )}
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
