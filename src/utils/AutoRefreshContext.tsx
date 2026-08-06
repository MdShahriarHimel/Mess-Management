import React, { createContext, useContext, useState, useEffect, useRef } from "react";

export type RefreshModule = "dashboard" | "analytics" | "revenue" | "statistics" | "auditLog" | "notification" | "futureModules";

interface AutoRefreshContextType {
  refreshSettings: Record<RefreshModule, string>;
  refreshTriggers: Record<RefreshModule, number>;
  refreshModule: (module: RefreshModule) => void;
  refreshAllModules: () => void;
  isModuleDisabled: (module: RefreshModule) => boolean;
}

const AutoRefreshContext = createContext<AutoRefreshContextType | undefined>(undefined);

export function useAutoRefresh() {
  const context = useContext(AutoRefreshContext);
  if (!context) {
    throw new Error("useAutoRefresh must be used within an AutoRefreshProvider");
  }
  return context;
}

export const AutoRefreshProvider: React.FC<{ children: React.ReactNode; erpBrandingState: any }> = ({ children, erpBrandingState }) => {
  const [refreshTriggers, setRefreshTriggers] = useState<Record<RefreshModule, number>>({
    dashboard: 0,
    analytics: 0,
    revenue: 0,
    statistics: 0,
    auditLog: 0,
    notification: 0,
    futureModules: 0
  });

  const refreshSettings = erpBrandingState?.refreshSettings || {
    dashboard: "manual",
    analytics: "manual",
    revenue: "manual",
    statistics: "manual",
    auditLog: "manual",
    notification: "manual",
    futureModules: "manual"
  };

  const secondsSinceLastRefresh = useRef<Record<RefreshModule, number>>({
    dashboard: 0,
    analytics: 0,
    revenue: 0,
    statistics: 0,
    auditLog: 0,
    notification: 0,
    futureModules: 0
  });

  // Manual Trigger helper
  const refreshModule = (module: RefreshModule) => {
    setRefreshTriggers((prev) => ({
      ...prev,
      [module]: (prev[module] || 0) + 1
    }));
    secondsSinceLastRefresh.current[module] = 0;
  };

  const refreshAllModules = () => {
    setRefreshTriggers((prev) => {
      const next = { ...prev };
      (Object.keys(next) as RefreshModule[]).forEach((mod) => {
        next[mod] = (prev[mod] || 0) + 1;
        secondsSinceLastRefresh.current[mod] = 0;
      });
      return next;
    });
  };

  const isModuleDisabled = (module: RefreshModule) => {
    return refreshSettings[module] === "disabled";
  };

  const getIntervalSeconds = (val: string): number => {
    if (val === "30s") return 30;
    if (val === "1m") return 60;
    if (val === "2m") return 120;
    if (val === "5m") return 300;
    if (val === "10m") return 600;
    if (val === "15m") return 900;
    if (val === "30m") return 1800;
    if (val === "1h") return 3600;
    return 0; // manual or disabled
  };

  useEffect(() => {
    // Start central tick loop
    const tickInterval = setInterval(() => {
      let changed = false;
      const updates: Partial<Record<RefreshModule, number>> = {};

      (Object.keys(refreshSettings) as RefreshModule[]).forEach((module) => {
        const intervalStr = refreshSettings[module];
        if (intervalStr === "disabled" || intervalStr === "manual") {
          return;
        }

        const limit = getIntervalSeconds(intervalStr);
        if (limit > 0) {
          secondsSinceLastRefresh.current[module] += 1;
          if (secondsSinceLastRefresh.current[module] >= limit) {
            updates[module] = refreshTriggers[module] + 1;
            secondsSinceLastRefresh.current[module] = 0;
            changed = true;
          }
        }
      });

      if (changed) {
        setRefreshTriggers((prev) => {
          const next = { ...prev };
          Object.keys(updates).forEach((k) => {
            const mod = k as RefreshModule;
            next[mod] = prev[mod] + 1;
          });
          return next;
        });
      }
    }, 1000); // 1-second tick is extremely accurate and low-overhead if we only do primitive increments

    return () => clearInterval(tickInterval);
  }, [refreshSettings, refreshTriggers]);

  return (
    <AutoRefreshContext.Provider value={{ refreshSettings, refreshTriggers, refreshModule, refreshAllModules, isModuleDisabled }}>
      {children}
    </AutoRefreshContext.Provider>
  );
};
