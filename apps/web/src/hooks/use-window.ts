import { useEffect, useState } from "react";

export function useWindow() {
  const [windowObj, setWindowObj] = useState<Window | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWindowObj(window);
    }
  }, []);

  return windowObj;
}
