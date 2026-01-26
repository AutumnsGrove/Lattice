import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  samplePathPoint,
  samplePathPoints,
  svgToPercent,
  createPathElement,
  removePathElement,
  samplePathString,
  type PathPoint,
} from "./pathUtils";

describe("pathUtils.ts", () => {
  describe("svgToPercent", () => {
    it("should convert SVG coordinates to percentages", () => {
      const result = svgToPercent(
        { x: 50, y: 25 },
        { width: 100, height: 100 },
      );
      expect(result.x).toBe(50);
      expect(result.y).toBe(25);
    });

    it("should handle non-100 viewBox dimensions", () => {
      const result = svgToPercent(
        { x: 200, y: 100 },
        { width: 400, height: 200 },
      );
      expect(result.x).toBe(50);
      expect(result.y).toBe(50);
    });

    it("should handle origin point", () => {
      const result = svgToPercent({ x: 0, y: 0 }, { width: 100, height: 100 });
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it("should handle max point", () => {
      const result = svgToPercent(
        { x: 100, y: 100 },
        { width: 100, height: 100 },
      );
      expect(result.x).toBe(100);
      expect(result.y).toBe(100);
    });

    it("should handle fractional results", () => {
      const result = svgToPercent(
        { x: 33, y: 66 },
        { width: 100, height: 100 },
      );
      expect(result.x).toBe(33);
      expect(result.y).toBe(66);
    });
  });

  describe("samplePathPoint", () => {
    let mockPathElement: SVGPathElement;

    beforeEach(() => {
      // Create mock SVGPathElement with necessary methods
      mockPathElement = {
        getTotalLength: vi.fn().mockReturnValue(100),
        getPointAtLength: vi.fn((length: number) => ({
          x: length,
          y: length * 0.5,
        })),
      } as unknown as SVGPathElement;
    });

    it("should sample point at t=0", () => {
      const result = samplePathPoint(mockPathElement, 0);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it("should sample point at t=0.5", () => {
      const result = samplePathPoint(mockPathElement, 0.5);
      expect(result.x).toBe(50);
      expect(result.y).toBe(25);
    });

    it("should sample point at t=1", () => {
      const result = samplePathPoint(mockPathElement, 1);
      expect(result.x).toBe(100);
      expect(result.y).toBe(50);
    });

    it("should calculate angle from tangent", () => {
      const result = samplePathPoint(mockPathElement, 0.5);
      // With our mock, dx=0.1 (approximately), dy=0.05
      // The angle should be calculated from these deltas
      expect(typeof result.angle).toBe("number");
      expect(Number.isFinite(result.angle)).toBe(true);
    });

    it("should call getTotalLength once", () => {
      samplePathPoint(mockPathElement, 0.5);
      expect(mockPathElement.getTotalLength).toHaveBeenCalledTimes(1);
    });

    it("should call getPointAtLength multiple times for tangent calculation", () => {
      samplePathPoint(mockPathElement, 0.5);
      // Called 3 times: once for the point, twice for tangent (before/after)
      expect(mockPathElement.getPointAtLength).toHaveBeenCalledTimes(3);
    });
  });

  describe("samplePathPoints", () => {
    let mockPathElement: SVGPathElement;

    beforeEach(() => {
      mockPathElement = {
        getTotalLength: vi.fn().mockReturnValue(100),
        getPointAtLength: vi.fn((length: number) => ({
          x: length,
          y: length * 0.5,
        })),
      } as unknown as SVGPathElement;
    });

    it("should return requested number of points", () => {
      const points = samplePathPoints(mockPathElement, 5, 0);
      expect(points).toHaveLength(5);
    });

    it("should return points within startT and endT range", () => {
      const points = samplePathPoints(mockPathElement, 3, 0, 0.2, 0.8);
      // With no jitter, points should be evenly distributed
      points.forEach((point) => {
        expect(point.x).toBeGreaterThanOrEqual(20); // 0.2 * 100
        expect(point.x).toBeLessThanOrEqual(80); // 0.8 * 100
      });
    });

    it("should apply jitter when specified", () => {
      // With jitter, positions should vary from evenly spaced
      const mathRandomSpy = vi.spyOn(Math, "random");
      mathRandomSpy.mockReturnValue(0.5);

      const points = samplePathPoints(mockPathElement, 3, 0.5);
      expect(points).toHaveLength(3);

      mathRandomSpy.mockRestore();
    });

    it("should return empty array for count of 0", () => {
      const points = samplePathPoints(mockPathElement, 0);
      expect(points).toHaveLength(0);
    });

    it("should distribute points evenly with no jitter", () => {
      const points = samplePathPoints(mockPathElement, 4, 0, 0, 1);
      // Points should be at 0.2, 0.4, 0.6, 0.8 (roughly)
      expect(points[0].x).toBeCloseTo(20, 0);
      expect(points[1].x).toBeCloseTo(40, 0);
      expect(points[2].x).toBeCloseTo(60, 0);
      expect(points[3].x).toBeCloseTo(80, 0);
    });
  });

  describe("createPathElement", () => {
    let originalDocument: typeof document;

    beforeEach(() => {
      originalDocument = global.document;
    });

    afterEach(() => {
      global.document = originalDocument;
    });

    it("should create SVG path element with correct d attribute", () => {
      // Skip if document not available (SSR environment)
      if (typeof document === "undefined") {
        return;
      }

      const pathD = "M0 0 L100 100";
      const pathElement = createPathElement(pathD);

      expect(pathElement.getAttribute("d")).toBe(pathD);

      // Clean up
      removePathElement(pathElement);
    });
  });

  describe("removePathElement", () => {
    it("should remove path element from DOM", () => {
      // Skip if document not available
      if (typeof document === "undefined") {
        return;
      }

      const pathD = "M0 0 L100 100";
      const pathElement = createPathElement(pathD);
      const parentSvg = pathElement.parentElement;

      expect(parentSvg).toBeTruthy();
      expect(parentSvg?.parentElement).toBe(document.body);

      removePathElement(pathElement);

      expect(parentSvg?.parentElement).toBeNull();
    });

    it("should handle already-removed elements gracefully", () => {
      if (typeof document === "undefined") {
        return;
      }

      const pathD = "M0 0 L100 100";
      const pathElement = createPathElement(pathD);

      // Remove twice - should not throw
      removePathElement(pathElement);
      expect(() => removePathElement(pathElement)).not.toThrow();
    });
  });

  describe("samplePathString", () => {
    describe("SSR safety", () => {
      let originalDocument: typeof document | undefined;

      beforeEach(() => {
        originalDocument = global.document;
      });

      afterEach(() => {
        if (originalDocument !== undefined) {
          global.document = originalDocument;
        }
      });

      it("should return empty array when document is undefined", () => {
        // Temporarily remove document
        // @ts-expect-error - intentionally removing document for SSR test
        delete global.document;

        const result = samplePathString("M0 0 L100 100", 5, {
          width: 100,
          height: 100,
        });

        expect(result).toEqual([]);
      });
    });

    // Note: Tests that require real SVG path methods (getTotalLength, getPointAtLength)
    // are skipped because jsdom doesn't implement these SVG-specific APIs.
    // These methods work correctly in actual browsers.
    // The core logic is tested above with mocked SVGPathElement.
    describe("with DOM available (requires browser SVG APIs)", () => {
      it.skip("should return points with percentage coordinates - requires browser SVG APIs", () => {
        const result = samplePathString("M0 0 L100 100", 3, {
          width: 100,
          height: 100,
        });

        expect(result).toHaveLength(3);
        result.forEach((point) => {
          expect(point).toHaveProperty("x");
          expect(point).toHaveProperty("y");
          expect(point).toHaveProperty("angle");
          expect(point).toHaveProperty("xPercent");
          expect(point).toHaveProperty("yPercent");
        });
      });

      it.skip("should respect options parameter - requires browser SVG APIs", () => {
        const result = samplePathString(
          "M0 0 L100 100",
          3,
          { width: 100, height: 100 },
          { jitter: 0, startT: 0.2, endT: 0.8 },
        );

        expect(result).toHaveLength(3);
        result.forEach((point) => {
          // Points should be within 20-80% range
          expect(point.xPercent).toBeGreaterThanOrEqual(15); // Allow some tolerance
          expect(point.xPercent).toBeLessThanOrEqual(85);
        });
      });

      it.skip("should clean up temporary elements after sampling - requires browser SVG APIs", () => {
        const initialSvgCount = document.querySelectorAll("svg").length;

        samplePathString("M0 0 L100 100", 3, { width: 100, height: 100 });

        const finalSvgCount = document.querySelectorAll("svg").length;
        expect(finalSvgCount).toBe(initialSvgCount);
      });
    });
  });

  describe("PathPoint interface", () => {
    it("should have correct shape", () => {
      const mockPathElement = {
        getTotalLength: vi.fn().mockReturnValue(100),
        getPointAtLength: vi.fn(() => ({ x: 50, y: 25 })),
      } as unknown as SVGPathElement;

      const point: PathPoint = samplePathPoint(mockPathElement, 0.5);

      expect(point).toHaveProperty("x");
      expect(point).toHaveProperty("y");
      expect(point).toHaveProperty("angle");
      expect(typeof point.x).toBe("number");
      expect(typeof point.y).toBe("number");
      expect(typeof point.angle).toBe("number");
    });
  });
});
