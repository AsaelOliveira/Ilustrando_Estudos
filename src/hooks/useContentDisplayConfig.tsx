import { useEffect, useState } from "react";
import {
  DEFAULT_CONTENT_DISPLAY,
  loadContentDisplayConfig,
  type ContentDisplayConfig,
} from "@/lib/content-display";

export function useContentDisplayConfig() {
  const [config, setConfig] = useState<ContentDisplayConfig>(DEFAULT_CONTENT_DISPLAY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    loadContentDisplayConfig().then((nextConfig) => {
      if (!active) return;
      setConfig(nextConfig);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  return {
    config,
    loading,
    setConfig,
  };
}
