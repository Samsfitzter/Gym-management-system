import React, { createContext, useContext, useState } from 'react';

const SidebarContext = createContext(null);

export const SidebarProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen, toggle: () => setIsOpen(!isOpen) }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

export default SidebarContext;
