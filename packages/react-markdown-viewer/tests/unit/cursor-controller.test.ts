/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCursorController } from '../../src/lib/cursor-controller';

// Mock DOM elements
const createMockContainer = () => {
  const styles = new Map<string, string>();
  const cursor = {
    isConnected: true,
    classList: {
      _classes: new Set<string>(),
      add(className: string) { this._classes.add(className); },
      remove(className: string) { this._classes.delete(className); },
      contains(className: string) { return this._classes.has(className); }
    }
  };
  
  return {
    cursor,
    container: {
      style: {
        setProperty(name: string, value: string) { styles.set(name, value); },
        removeProperty(name: string) { styles.delete(name); },
        getPropertyValue(name: string) { return styles.get(name) ?? ''; }
      },
      querySelector(selector: string) {
        if (selector === '[data-cursor]') return cursor;
        return null;
      }
    } as unknown as HTMLElement,
    styles
  };
};

describe('cursor-controller', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createCursorController', () => {
    it('should create a controller with default options', () => {
      const controller = createCursorController();
      expect(controller).toBeDefined();
      expect(typeof controller.update).toBe('function');
      expect(typeof controller.setBlinking).toBe('function');
      expect(typeof controller.reset).toBe('function');
      expect(typeof controller.destroy).toBe('function');
    });

    it('should accept custom options', () => {
      const controller = createCursorController({
        blinkEnabled: false,
        blinkSpeed: 0.5,
        blinkDelay: 2.0
      });
      expect(controller).toBeDefined();
    });
  });

  describe('update', () => {
    it('should add cursor-active class on update', () => {
      const { container, cursor } = createMockContainer();
      const controller = createCursorController();
      
      controller.update(container);
      
      expect(cursor.classList.contains('cursor-active')).toBe(true);
    });

    it('should set CSS variables on first update', () => {
      const { container, styles } = createMockContainer();
      const controller = createCursorController();
      
      controller.update(container);
      
      expect(styles.has('--cursor-blink-name')).toBe(true);
      expect(styles.has('--cursor-blink-duration')).toBe(true);
      expect(styles.has('--cursor-blink-delay')).toBe(true);
    });

    it('should remove cursor-active class after idle timeout', () => {
      const { container, cursor } = createMockContainer();
      const controller = createCursorController();
      
      controller.update(container);
      expect(cursor.classList.contains('cursor-active')).toBe(true);
      
      // Fast forward past idle timeout (500ms)
      vi.advanceTimersByTime(500);
      
      expect(cursor.classList.contains('cursor-active')).toBe(false);
    });

    it('should reset idle timer on each update', () => {
      const { container, cursor } = createMockContainer();
      const controller = createCursorController();
      
      controller.update(container);
      vi.advanceTimersByTime(400); // Not yet at timeout
      
      controller.update(container); // Reset timer
      vi.advanceTimersByTime(400); // Still not at timeout from reset
      
      expect(cursor.classList.contains('cursor-active')).toBe(true);
      
      vi.advanceTimersByTime(100); // Now past timeout
      expect(cursor.classList.contains('cursor-active')).toBe(false);
    });

    it('should toggle blink animation name to restart animation', () => {
      const { container, styles } = createMockContainer();
      const controller = createCursorController();
      
      controller.update(container);
      const firstValue = styles.get('--cursor-blink-name');
      
      controller.update(container);
      const secondValue = styles.get('--cursor-blink-name');
      
      expect(firstValue).not.toBe(secondValue);
    });

    it('should handle missing cursor element gracefully', () => {
      const container = {
        style: {
          setProperty: vi.fn(),
          removeProperty: vi.fn()
        },
        querySelector: () => null
      } as unknown as HTMLElement;
      
      const controller = createCursorController();
      
      // Should not throw
      expect(() => controller.update(container)).not.toThrow();
    });
  });

  describe('setBlinking', () => {
    it('should remove cursor-active class when blinking is true', () => {
      const { container, cursor } = createMockContainer();
      const controller = createCursorController();
      
      cursor.classList.add('cursor-active');
      controller.setBlinking(container, true);
      
      expect(cursor.classList.contains('cursor-active')).toBe(false);
    });

    it('should add cursor-active class when blinking is false', () => {
      const { container, cursor } = createMockContainer();
      const controller = createCursorController();
      
      controller.setBlinking(container, false);
      
      expect(cursor.classList.contains('cursor-active')).toBe(true);
    });

    it('should set blink delay to 0 when blinking immediately', () => {
      const { container, styles } = createMockContainer();
      const controller = createCursorController();
      
      controller.setBlinking(container, true);
      
      expect(styles.get('--cursor-blink-delay')).toBe('0s');
    });

    it('should restore configured blink delay when not blinking', () => {
      const { container, styles } = createMockContainer();
      const controller = createCursorController({ blinkDelay: 2.0 });
      
      controller.setBlinking(container, false);
      
      expect(styles.get('--cursor-blink-delay')).toBe('2.00s');
    });
  });

  describe('reset', () => {
    it('should remove cursor-active class', () => {
      const { container, cursor } = createMockContainer();
      const controller = createCursorController();
      
      controller.update(container);
      expect(cursor.classList.contains('cursor-active')).toBe(true);
      
      controller.reset();
      
      expect(cursor.classList.contains('cursor-active')).toBe(false);
    });

    it('should clear pending timers', () => {
      const { container, cursor } = createMockContainer();
      const controller = createCursorController();
      
      controller.update(container);
      controller.reset();
      
      // Advancing time should not affect anything after reset
      vi.advanceTimersByTime(1000);
      
      // cursor-active was removed by reset, not by timer
      expect(cursor.classList.contains('cursor-active')).toBe(false);
    });
  });

  describe('destroy', () => {
    it('should remove CSS variables from container', () => {
      const { container, styles } = createMockContainer();
      const controller = createCursorController();
      
      controller.update(container);
      expect(styles.size).toBeGreaterThan(0);
      
      controller.destroy();
      
      expect(styles.has('--cursor-blink-name')).toBe(false);
      expect(styles.has('--cursor-blink-duration')).toBe(false);
      expect(styles.has('--cursor-blink-delay')).toBe(false);
    });

    it('should handle destroy when never initialized', () => {
      const controller = createCursorController();
      
      // Should not throw
      expect(() => controller.destroy()).not.toThrow();
    });
  });

  describe('blink configuration', () => {
    it('should set blink duration to 0s when disabled', () => {
      const { container, styles } = createMockContainer();
      const controller = createCursorController({ blinkEnabled: false });
      
      controller.update(container);
      
      expect(styles.get('--cursor-blink-duration')).toBe('0s');
    });

    it('should use custom blink speed', () => {
      const { container, styles } = createMockContainer();
      const controller = createCursorController({ blinkSpeed: 0.5 });
      
      controller.update(container);
      
      expect(styles.get('--cursor-blink-duration')).toBe('0.50s');
    });

    it('should use custom blink delay', () => {
      const { container, styles } = createMockContainer();
      const controller = createCursorController({ blinkDelay: 1.5 });
      
      controller.update(container);
      
      expect(styles.get('--cursor-blink-delay')).toBe('1.50s');
    });
  });

  describe('disconnected cursor handling', () => {
    it('should not remove cursor-active if cursor is disconnected', () => {
      const { container, cursor } = createMockContainer();
      cursor.isConnected = false;
      
      const controller = createCursorController();
      controller.update(container);
      
      vi.advanceTimersByTime(500);
      
      // cursor-active should still be there because cursor was disconnected
      expect(cursor.classList.contains('cursor-active')).toBe(true);
    });
  });
});
