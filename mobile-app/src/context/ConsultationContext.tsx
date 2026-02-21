import React, { createContext, useContext, useState, useCallback } from 'react';

interface ConsultationState {
  isActive: boolean;
  setActive: (active: boolean) => void;
}

const ConsultationContext = createContext<ConsultationState>({
  isActive: false,
  setActive: () => {},
});

export const ConsultationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isActive, setIsActive] = useState(false);

  const setActive = useCallback((active: boolean) => {
    setIsActive(active);
  }, []);

  return (
    <ConsultationContext.Provider value={{ isActive, setActive }}>
      {children}
    </ConsultationContext.Provider>
  );
};

export const useConsultation = () => useContext(ConsultationContext);
