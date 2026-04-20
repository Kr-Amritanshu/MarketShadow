import { useRoute, Link } from "wouter";
import { useGetSignalByTicker } from "@workspace/api-client-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { formatCurrency, formatPercentage, cn } from "@/lib/utils";
import { ArrowLeft, Play, AlertTriangle, ShieldCheck, Zap, TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";

export function SignalDetail() {
  const [, params] = useRoute("/signal/:ticker");
  const ticker = params?.ticker || "";
  
  const { data: signal, isLoading } = useGetSignalByTicker(ticker, {
    query: { enabled: !!ticker }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!signal) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold">Signal Not Found</h2>
        <p className="text-muted-foreground mt-2">Could not load analysis for {ticker}</p>
        <Link href="/" className="mt-6 inline-flex text-primary hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  const isPositive = signal.price_change_pct >= 0;
  
  // Format price history for chart
  const chartData = signal.price_history?.map(p => ({
    date: p.date ? new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '',
    price: p.close || 0
  })) || [];

  // Consensus chart data
  const consensusData = [
    { name: 'Bullish', count: signal.consensus.bullish_count, color: 'hsl(var(--success))' },
    { name: 'Neutral', count: signal.consensus.neutral_count, color: 'hsl(var(--muted-foreground))' },
    { name: 'Bearish', count: signal.consensus.bearish_count, color: 'hsl(var(--destructive))' }
  ];

  return (
    <div className="animate-in fade-in duration-500 space-y-6 pb-20">
      
      {/* Back nav & Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold font-mono tracking-tight">{signal.ticker.replace('.NS', '')}</h1>
            {signal.is_high_conviction && (
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 rounded-full text-xs font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> High Conviction
              </span>
            )}
            {signal.is_anomaly && (
              <span className="px-3 py-1 bg-accent/20 text-accent border border-accent/30 rounded-full text-xs font-bold flex items-center gap-1.5">
                <Zap className="w-4 h-4" /> Volume Anomaly
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-2xl font-mono">{formatCurrency(signal.current_price)}</span>
            <span className={cn(
              "text-lg font-mono font-medium flex items-center",
              isPositive ? "text-success" : "text-destructive"
            )}>
              {isPositive ? <TrendingUp className="w-5 h-5 mr-1" /> : <TrendingDown className="w-5 h-5 mr-1" />}
              {Math.abs(signal.price_change_pct).toFixed(2)}%
            </span>
          </div>
        </div>

        <Link href={`/backtest/${signal.ticker}`}>
          <button className="px-6 py-3 rounded-xl bg-white text-black font-bold hover:bg-gray-200 transition-colors shadow-lg shadow-white/10 flex items-center gap-2">
            <Play className="w-4 h-4" /> Run Backtest
          </button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart & Smart Money */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-2xl h-[400px] flex flex-col">
            <h3 className="text-lg font-bold mb-6">Price Action (30D)</h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} domain={['auto', 'auto']} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff', fontFamily: 'JetBrains Mono' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke={isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))"} 
                    strokeWidth={3} 
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-6 rounded-2xl">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Smart Money Score</h3>
              <div className="flex items-end gap-3 mb-2">
                <span className="text-5xl font-bold font-mono tracking-tighter" style={{ color: `var(--${signal.score_color}-500, #fff)` }}>
                  {signal.smart_money_score}
                </span>
                <span className="text-muted-foreground mb-1">/ 100</span>
              </div>
              <p className="text-sm font-medium mb-6" style={{ color: `var(--${signal.score_color}-500, #ccc)` }}>
                {signal.score_label}
              </p>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Volume Ratio</span>
                    <span className="font-mono">{signal.volume_ratio.toFixed(2)}x</span>
                  </div>
                  <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-primary h-full rounded-full" style={{ width: `${Math.min(signal.volume_ratio / 5 * 100, 100)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Block Orders</span>
                    <span className="font-mono">{signal.block_orders} detected</span>
                  </div>
                  <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-accent h-full rounded-full" style={{ width: `${Math.min(signal.block_orders / 10 * 100, 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">AI Consensus</h3>
              <div className="flex items-center justify-between mb-6">
                <span className={cn(
                  "px-3 py-1.5 rounded-lg border text-sm font-bold tracking-wide",
                  signal.consensus.verdict.includes("BULLISH") ? "bg-success/10 text-success border-success/20" : 
                  signal.consensus.verdict.includes("BEARISH") ? "bg-destructive/10 text-destructive border-destructive/20" : 
                  "bg-white/5 text-muted-foreground border-white/10"
                )}>
                  {signal.consensus.verdict}
                </span>
                <span className="text-2xl font-mono font-bold">{signal.consensus.score}%</span>
              </div>
              
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={consensusData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={12} stroke="#888" width={60} />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}/>
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                      {consensusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Indicators Panel */}
        <div className="lg:col-span-1">
          <div className="glass-panel p-6 rounded-2xl h-full">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" /> Technical Indicators
            </h3>
            
            <div className="space-y-4">
              {signal.indicators && Object.entries(signal.indicators).map(([key, ind]) => (
                <div key={key} className="p-3 bg-black/20 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-sm">{key}</span>
                    <span className={cn(
                      "text-xs font-bold px-2 py-0.5 rounded-md uppercase",
                      ind.signal === 'bullish' ? "bg-success/10 text-success" :
                      ind.signal === 'bearish' ? "bg-destructive/10 text-destructive" :
                      "bg-white/5 text-muted-foreground"
                    )}>
                      {ind.verdict}
                    </span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-xs text-muted-foreground line-clamp-1 pr-4">{ind.label}</span>
                    <span className="font-mono text-sm font-medium">{ind.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
