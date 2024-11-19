// src/lib/utils.ts
export function cn(...classes: string[]): string {
    return classes.filter(Boolean).join(' ');
  }

  