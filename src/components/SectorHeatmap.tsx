import { SectorData } from "@workspace/api-client-react/src/generated/api.schemas";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function SectorHeatmap({ sectors }: { sectors: SectorData[] }) {
  // Sort sectors by avg_change_pct descending
  const sorted = [...sectors].sort((a, b) => b.avg_change_pct - a.avg_change_pct);

  const getHeatColor = (pct: number) => {
    if (pct > 2) return "bg-success/40 border-success/50 text-success-foreground";
    if (pct > 0.5) return "bg-success/20 border-success/30 text-success";
    if (pct > 0) return "bg-success/10 border-success/20 text-success/80";
    if (pct < -2) return "bg-destructive/40 border-destructive/50 text-destructive-foreground";
    if (pct < -0.5) return "bg-destructive/20 border-destructive/30 text-destructive";
    if (pct < 0) return "bg-destructive/10 border-destructive/20 text-destructive/80";
    return "bg-white/5 border-white/10 text-muted-foreground";
  };

  return (
    <div className="glass-panel p-6 rounded-2xl mb-8">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <div className="w-2 h-6 bg-primary rounded-full" />
        Sector Heatmap
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {sorted.map((sector, i) => (
          <motion.div
            key={sector.sector}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              "flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all hover:brightness-125",
              getHeatColor(sector.avg_change_pct)
            )}
          >
            <span className="text-xs font-semibold uppercase tracking-wider mb-1 truncate w-full">{sector.sector}</span>
            <span className="text-lg font-mono font-bold">
              {sector.avg_change_pct > 0 ? "+" : ""}{sector.avg_change_pct.toFixed(2)}%
            </span>
            <span className="text-[10px] opacity-70 mt-1">SMS: {sector.avg_sms}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
