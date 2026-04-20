import { useState } from "react";
import { useGetWatchlist, useAddToWatchlist, useRemoveFromWatchlist, getGetWatchlistQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";
import { Search, Plus, Trash2, List, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export function Watchlist() {
  const [ticker, setTicker] = useState("");
  const [note, setNote] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: watchlist, isLoading } = useGetWatchlist();
  
  const addMutation = useAddToWatchlist({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetWatchlistQueryKey() });
        setTicker("");
        setNote("");
        toast({ title: "Added to watchlist", description: `${ticker.toUpperCase()} has been added.` });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to add ticker. Format should be TICKER.NS", variant: "destructive" });
      }
    }
  });

  const removeMutation = useRemoveFromWatchlist({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetWatchlistQueryKey() });
        toast({ title: "Removed from watchlist" });
      }
    }
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker) return;
    addMutation.mutate({ data: { ticker: ticker.toUpperCase(), user_note: note } });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary/20 text-primary rounded-xl border border-primary/30">
          <List className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Your Watchlist</h1>
          <p className="text-muted-foreground">Track custom stocks and personal notes</p>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl">
        <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder="Enter ticker (e.g. ITC.NS)"
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              required
            />
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note (optional)"
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={addMutation.isPending}
            className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {addMutation.isPending ? <div className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin" /> : <Plus className="w-5 h-5" />}
            Add Stock
          </button>
        </form>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-10 text-muted-foreground">Loading watchlist...</div>
        ) : !watchlist?.length ? (
          <div className="text-center py-20 glass-panel rounded-2xl">
            <Activity className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Your watchlist is empty</p>
          </div>
        ) : (
          watchlist.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-panel p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 group"
            >
              <div>
                <Link href={`/signal/${item.ticker}`} className="text-xl font-bold font-mono hover:text-primary transition-colors">
                  {item.ticker}
                </Link>
                <div className="text-xs text-muted-foreground mt-1">
                  Added on {format(new Date(item.added_at), "MMM d, yyyy")}
                </div>
              </div>
              
              <div className="flex-1 bg-black/20 p-3 rounded-lg border border-white/5 text-sm text-muted-foreground italic">
                {item.user_note || "No notes"}
              </div>

              <div className="flex items-center gap-3">
                <Link href={`/signal/${item.ticker}`}>
                  <button className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors border border-white/10">
                    Analyze
                  </button>
                </Link>
                <button
                  onClick={() => removeMutation.mutate({ id: item.id })}
                  disabled={removeMutation.isPending}
                  className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
