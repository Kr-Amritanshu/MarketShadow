import { createContext, useContext, useState, ReactNode } from "react";

interface RefreshContextType {
  isAutoRefresh: boolean;
  toggleAutoRefresh: () => void;
  refreshInterval: number | false;
}

const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

export function RefreshProvider({ children }: { children: ReactNode }) {
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);

  const toggleAutoRefresh = () => setIsAutoRefresh(!isAutoRefresh);
  const refreshInterval = isAutoRefresh ? 300000 : false; // 5 minutes

  return (
    <RefreshContext.Provider value={{ isAutoRefresh, toggleAutoRefresh, refreshInterval }}>
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh() {
  const context = useContext(RefreshContext);
  if (context === undefined) {
    throw new Error("useRefresh must be used within a RefreshProvider");
  }
  return context;
}
