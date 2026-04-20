import { Link } from "wouter";
import { StockSignal } from "@workspace/api-client-react/src/generated/api.schemas";
import { formatCurrency, formatPercentage, cn } from "@/lib/utils";
import { ShieldCheck, ArrowUpRight, ArrowDownRight, Activity, Zap, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";

export function SignalCard({ signal, index = 0 }: { signal: StockSignal, index?: number }) {
  const isPositive = signal.price_change_pct >= 0;
  
  const getVerdictIcon = (verdict: string) => {
    if (verdict.includes("BULLISH")) return <TrendingUp className="w-4 h-4 text-success" />;
    if (verdict.includes("BEARISH")) return <TrendingDown className="w-4 h-4 text-destructive" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getVerdictColor = (verdict: string) => {
    if (verdict === "STRONGLY BULLISH") return "text-success bg-success/10 border-success/20";
    if (verdict === "CAUTIOUSLY BULLISH") return "text-success/80 bg-success/5 border-success/10";
    if (verdict === "STRONGLY BEARISH") return "text-destructive bg-destructive/10 border-destructive/20";
    if (verdict === "CAUTIOUSLY BEARISH") return "text-destructive/80 bg-destructive/5 border-destructive/10";
    return "text-muted-foreground bg-white/5 border-white/10";
  };

  const getScoreColorHex = (color: string) => {
    switch (color) {
      case 'red': return '#ef4444';
      case 'orange': return '#f59e0b';
      case 'yellow': return '#eab308';
      case 'green': return '#10b981';
      default: return '#64748b';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link href={`/signal/${signal.ticker}`}>
        <div className="group h-full flex flex-col glass-panel rounded-2xl p-5 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 cursor-pointer overflow-hidden relative">
          
          {/* Subtle background glow based on smart money score */}
          <div 
            className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity"
            style={{ backgroundColor: getScoreColorHex(signal.score_color) }}
          />

          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold font-mono tracking-tight text-white">{signal.ticker.replace('.NS', '')}</h3>
                {signal.is_high_conviction && (
                  <div className="bg-yellow-500/20 text-yellow-500 p-1 rounded border border-yellow-500/30" title="High Conviction Setup">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                )}
                {signal.is_anomaly && (
                  <div className="bg-accent/20 text-accent p-1 rounded border border-accent/30" title="Volume/Price Anomaly Detected">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1 font-mono">
                {formatCurrency(signal.current_price)}
              </p>
            </div>
            <div className={cn(
              "flex items-center gap-1 font-mono font-medium px-2.5 py-1 rounded-lg border",
              isPositive ? "text-success bg-success/10 border-success/20" : "text-destructive bg-destructive/10 border-destructive/20"
            )}>
              {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {Math.abs(signal.price_change_pct).toFixed(2)}%
            </div>
          </div>

          {/* Smart Money Score Bar */}
          <div className="mb-5">
            <div className="flex justify-between items-end mb-1.5">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Smart Money</span>
              <span className="text-sm font-bold font-mono" style={{ color: getScoreColorHex(signal.score_color) }}>
                {signal.smart_money_score}/100
              </span>
            </div>
            <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${signal.smart_money_score}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ backgroundColor: getScoreColorHex(signal.score_color) }}
              />
            </div>
            <p className="text-xs mt-1.5 opacity-80" style={{ color: getScoreColorHex(signal.score_color) }}>
              {signal.score_label}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-black/20 rounded-xl p-3 border border-white/5">
              <div className="text-xs text-muted-foreground mb-1">Pattern</div>
              <div className="text-sm font-medium leading-tight">{signal.pattern_type}</div>
            </div>
            <div className="bg-black/20 rounded-xl p-3 border border-white/5">
              <div className="text-xs text-muted-foreground mb-1">Vol Ratio</div>
              <div className="text-sm font-medium font-mono">{signal.volume_ratio.toFixed(2)}x</div>
            </div>
          </div>

          {/* Footer / Consensus */}
          <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
            <div className={cn("px-2.5 py-1.5 rounded-lg border text-xs font-bold tracking-wide flex items-center gap-1.5", getVerdictColor(signal.consensus.verdict))}>
              {getVerdictIcon(signal.consensus.verdict)}
              {signal.consensus.verdict}
            </div>
            <div className="flex gap-1">
              <div className="w-6 h-6 rounded bg-success/10 text-success border border-success/20 flex items-center justify-center text-xs font-mono font-bold">
                {signal.consensus.bullish_count}
              </div>
              <div className="w-6 h-6 rounded bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center text-xs font-mono font-bold">
                {signal.consensus.bearish_count}
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
