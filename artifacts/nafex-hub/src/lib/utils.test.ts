import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('Utility Functions', () => {
  describe('cn() (Tailwind class merger)', () => {
    it('should merge basic tailwind classes', () => {
      expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white');
    });

    it('should resolve conflicts properly using tailwind-merge', () => {
      // tailwind-merge should resolve conflicting padding classes
      expect(cn('p-4', 'p-8')).toBe('p-8');
    });

    it('should handle conditional classes using clsx', () => {
      const isTrue = true;
      const isFalse = false;
      expect(cn('base', isTrue && 'truthy', isFalse && 'falsy')).toBe('base truthy');
    });

    it('should handle arrays and objects', () => {
      expect(cn(['class1', 'class2'], { class3: true, class4: false })).toBe('class1 class2 class3');
    });
  });
});
