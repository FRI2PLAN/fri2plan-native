import React, { createContext, useContext, useState } from 'react';

interface PagerContextType {
  swipeEnabled: boolean;
  setSwipeEnabled: (enabled: boolean) => void;
}

const PagerContext = createContext<PagerContextType>({
  swipeEnabled: true,
  setSwipeEnabled: () => {},
});

export function PagerProvider({ children }: { children: React.ReactNode }) {
  const [swipeEnabled, setSwipeEnabled] = useState(true);
  return (
    <PagerContext.Provider value={{ swipeEnabled, setSwipeEnabled }}>
      {children}
    </PagerContext.Provider>
  );
}

export function usePager() {
  return useContext(PagerContext);
}
