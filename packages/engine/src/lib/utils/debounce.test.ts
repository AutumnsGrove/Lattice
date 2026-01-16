/**
 * Debounce Utility Tests
 *
 * Tests for the debounce function covering:
 * - Basic debounce behavior and immediate execution
 * - Default and custom delay values
 * - Multiple rapid calls and timeout cancellation
 * - Argument handling (single, multiple, complex objects)
 * - Timing and timer reset behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { debounce } from "./debounce";

describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ==========================================================================
  // Basic Debounce Behavior
  // ==========================================================================

  describe("Basic Debounce Behavior", () => {
    it("should not call function immediately", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);
      debounced();
      expect(fn).not.toHaveBeenCalled();
    });

    it("should call function after delay", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);
      debounced();
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should use default delay of 300ms", () => {
      const fn = vi.fn();
      const debounced = debounce(fn);
      debounced();

      // Should not be called before 300ms
      vi.advanceTimersByTime(299);
      expect(fn).not.toHaveBeenCalled();

      // Should be called after 300ms
      vi.advanceTimersByTime(1);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should accept custom delay", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 50);
      debounced();
      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should accept zero delay", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 0);
      debounced();
      vi.advanceTimersByTime(0);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should handle very large delays", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 10000);
      debounced();
      vi.advanceTimersByTime(9999);
      expect(fn).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Multiple Rapid Calls
  // ==========================================================================

  describe("Multiple Rapid Calls", () => {
    it("should only call function once after multiple rapid calls", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced();
      debounced();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should cancel previous timeout on new call", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      vi.advanceTimersByTime(50);
      debounced(); // Reset timer
      vi.advanceTimersByTime(50);

      // Should not have been called yet (would be at 100ms from first call)
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should use arguments from the last call", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced("first");
      debounced("second");
      debounced("third");

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledWith("third");
    });

    it("should handle many rapid calls", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      for (let i = 0; i < 100; i++) {
        debounced(i);
      }

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith(99);
    });

    it("should reset timer correctly between call groups", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      // First group of calls
      debounced("group1");
      debounced("group1");
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith("group1");

      // Second group of calls
      debounced("group2");
      debounced("group2");
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenCalledWith("group2");
    });
  });

  // ==========================================================================
  // Argument Handling
  // ==========================================================================

  describe("Argument Handling", () => {
    it("should pass single argument correctly", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);
      debounced("hello");
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledWith("hello");
    });

    it("should pass multiple arguments correctly", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);
      debounced("first", "second", "third");
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledWith("first", "second", "third");
    });

    it("should pass numeric arguments", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);
      debounced(42, 3.14, -10);
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledWith(42, 3.14, -10);
    });

    it("should pass boolean arguments", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);
      debounced(true, false);
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledWith(true, false);
    });

    it("should pass null and undefined arguments", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);
      debounced(null, undefined);
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledWith(null, undefined);
    });

    it("should pass complex objects correctly", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);
      const obj = { id: 1, name: "test", nested: { key: "value" } };
      debounced(obj);
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledWith(obj);
    });

    it("should pass arrays as arguments", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);
      const arr = [1, 2, 3, "test", { key: "value" }];
      debounced(arr);
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledWith(arr);
    });

    it("should handle no arguments", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);
      debounced();
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledWith();
    });

    it("should pass functions as arguments", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);
      const callback = vi.fn();
      debounced(callback);
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledWith(callback);
    });

    it("should preserve argument references for objects", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);
      const obj = { id: 1 };
      debounced(obj);
      vi.advanceTimersByTime(100);

      // Verify exact same reference was passed
      const callArgs = fn.mock.calls[0];
      expect(callArgs[0]).toBe(obj);
    });
  });

  // ==========================================================================
  // Timing and Reset Behavior
  // ==========================================================================

  describe("Timing and Reset Behavior", () => {
    it("should reset timer on each call", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      vi.advanceTimersByTime(60);
      expect(fn).not.toHaveBeenCalled();

      debounced(); // Reset timer
      vi.advanceTimersByTime(60);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(40);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should eventually call function even with constant calls if calls stop", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      // Simulate continuous calls
      for (let i = 0; i < 5; i++) {
        debounced(i);
        vi.advanceTimersByTime(50);
      }

      // At this point: 50 + 50 + 50 + 50 + 50 = 250ms have passed
      // Last call was at 200ms, so timeout should be set for 300ms
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should call function with correct timing after delay", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 150);

      debounced();
      vi.advanceTimersByTime(150);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should maintain independent debounce instances", () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      const debounced1 = debounce(fn1, 100);
      const debounced2 = debounce(fn2, 100);

      debounced1();
      debounced2();

      vi.advanceTimersByTime(100);

      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).toHaveBeenCalledTimes(1);
    });

    it("should handle multiple calls with varying intervals", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced(1);
      vi.advanceTimersByTime(30);
      debounced(2);
      vi.advanceTimersByTime(30);
      debounced(3);
      vi.advanceTimersByTime(30);
      debounced(4);
      vi.advanceTimersByTime(30);
      debounced(5);

      // At this point: 30 + 30 + 30 + 30 = 120ms have passed
      // Last call was at 120ms, with debounce delay of 100ms
      // Should trigger at 220ms total
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith(5);
    });
  });

  // ==========================================================================
  // Return Type and Function Properties
  // ==========================================================================

  describe("Return Type and Function Properties", () => {
    it("should return a function", () => {
      const fn = vi.fn();
      const debounced = debounce(fn);
      expect(typeof debounced).toBe("function");
    });

    it("should be callable multiple times", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced();
      debounced();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should handle function with no return value", () => {
      const fn = vi.fn(() => undefined);
      const debounced = debounce(fn, 100);
      debounced();
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalled();
    });

    it("should handle function with return value", () => {
      const fn = vi.fn(() => "result");
      const debounced = debounce(fn, 100);
      debounced();
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Edge Cases and Error Scenarios
  // ==========================================================================

  describe("Edge Cases", () => {
    it("should handle rapid successive calls at microsecond intervals", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced(1);
      vi.advanceTimersByTime(0.001);
      debounced(2);
      vi.advanceTimersByTime(0.001);
      debounced(3);

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith(3);
    });

    it("should handle being called after a long delay", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(5000);
      debounced();
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("should not leak memory with multiple debounced calls", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      for (let i = 0; i < 1000; i++) {
        debounced(i);
        if (i % 100 === 0) {
          vi.advanceTimersByTime(100);
        }
      }

      // Should have been called multiple times as debounce window resets
      expect(fn.mock.calls.length).toBeGreaterThan(0);
    });

    it("should handle delay value of exactly 0", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 0);
      debounced("test");
      vi.advanceTimersByTime(0);
      expect(fn).toHaveBeenCalledWith("test");
    });

    it("should handle object mutation in arguments", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);
      const obj = { count: 0 };

      debounced(obj);
      obj.count = 5; // Mutate object after debounce call

      vi.advanceTimersByTime(100);

      // Should receive mutated object (same reference)
      expect(fn).toHaveBeenCalledWith({ count: 5 });
    });

    it("should handle throwing function gracefully", () => {
      const fn = vi.fn(() => {
        throw new Error("Test error");
      });
      const debounced = debounce(fn, 100);

      debounced();

      expect(() => {
        vi.advanceTimersByTime(100);
      }).toThrow("Test error");
    });
  });

  // ==========================================================================
  // Real-World Scenarios
  // ==========================================================================

  describe("Real-World Scenarios", () => {
    it("should work for input validation scenario", () => {
      const validate = vi.fn((query: string) => {
        return query.length > 2;
      });
      const debouncedValidate = debounce(validate, 300);

      // User types quickly
      debouncedValidate("a");
      debouncedValidate("ab");
      debouncedValidate("abc");

      expect(validate).not.toHaveBeenCalled();

      vi.advanceTimersByTime(300);
      expect(validate).toHaveBeenCalledTimes(1);
      expect(validate).toHaveBeenCalledWith("abc");
    });

    it("should work for search request scenario", () => {
      const search = vi.fn((term: string) => {
        return [`${term} result 1`, `${term} result 2`];
      });
      const debouncedSearch = debounce(search, 500);

      // User types fast
      debouncedSearch("r");
      debouncedSearch("re");
      debouncedSearch("rea");
      debouncedSearch("reac");
      debouncedSearch("react");

      expect(search).not.toHaveBeenCalled();

      vi.advanceTimersByTime(500);
      expect(search).toHaveBeenCalledTimes(1);
      expect(search).toHaveBeenCalledWith("react");
    });

    it("should work for resize handler scenario", () => {
      const onResize = vi.fn((width: number, height: number) => {
        // Handle resize
      });
      const debouncedResize = debounce(onResize, 200);

      // Window resizes rapidly
      for (let i = 0; i < 10; i++) {
        debouncedResize(800 + i, 600 + i);
      }

      expect(onResize).not.toHaveBeenCalled();

      vi.advanceTimersByTime(200);
      expect(onResize).toHaveBeenCalledTimes(1);
      expect(onResize).toHaveBeenCalledWith(809, 609);
    });

    it("should work for form auto-save scenario", () => {
      const save = vi.fn((data: Record<string, unknown>) => {
        // Save to server
      });
      const debouncedSave = debounce(save, 1000);

      // User types quickly in form
      debouncedSave({ title: "H" });
      debouncedSave({ title: "He" });
      debouncedSave({ title: "Hel" });
      debouncedSave({ title: "Hell" });
      debouncedSave({ title: "Hello" });

      expect(save).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000);
      expect(save).toHaveBeenCalledTimes(1);
      expect(save).toHaveBeenCalledWith({ title: "Hello" });
    });
  });
});
