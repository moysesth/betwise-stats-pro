/// <reference types="vite/client" />

// Allow any JSX element to resolve TypeScript errors
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

// Fix for Supabase Edge Functions in TypeScript
declare namespace Deno {
  export const env: {
    get(key: string): string | undefined;
  };
}

// Extend React to ensure all HTML elements are properly typed
import React from 'react';
declare global {
  namespace React {
    interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
      // Allow any attribute name
      [key: string]: any;
    }
  }
}
