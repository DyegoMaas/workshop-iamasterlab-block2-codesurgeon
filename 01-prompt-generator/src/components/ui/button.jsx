import React from 'react';
import { clsx } from 'clsx';

export const Button = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:pointer-events-none",
        "bg-primary text-primary-foreground hover:bg-primary/90",
        "h-10 py-2 px-4",
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
    </button>
  );
}); 