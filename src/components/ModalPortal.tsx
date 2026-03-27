import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  children: React.ReactNode;
  zIndex?: number;
}

export const ModalPortal: React.FC<ModalPortalProps> = ({ children, zIndex = 1000 }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Prevent scrolling on body when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div 
      className="fixed inset-0 pointer-events-none" 
      style={{ zIndex }}
    >
      <div className="pointer-events-auto h-full w-full">
        {children}
      </div>
    </div>,
    document.body
  );
};
