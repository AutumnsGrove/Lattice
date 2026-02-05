import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_EXTENSIONS,
  FILE_SIGNATURES,
  WEBP_MARKER,
  MIME_TO_EXTENSIONS,
  ALLOWED_TYPES_DISPLAY,
  UPLOAD_ACCEPT_ATTR,
  isAllowedImageType,
  isAllowedExtension,
  extensionMatchesMimeType,
  validateFileSignature,
  getFileExtension,
  validateImageFile,
  validateImageFileDeep,
  getActionableUploadError,
} from "./upload-validation";

// ============================================================================
// Test Data: Magic Bytes
// ============================================================================

const JPEG_BYTES_JFIF = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00,
]);
const JPEG_BYTES_EXIF = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x10]);
const JPEG_BYTES_SPIFF = new Uint8Array([0xff, 0xd8, 0xff, 0xe8, 0x00, 0x10]);
const JPEG_BYTES_RAW = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x10]);
const JPEG_BYTES_ADOBE = new Uint8Array([0xff, 0xd8, 0xff, 0xee, 0x00, 0x10]);

const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);

const GIF87A_BYTES = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]);
const GIF89A_BYTES = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);

const WEBP_BYTES = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);

// JXL codestream needs at least 8 bytes for buffer.length check (matches container signature length)
const JXL_CODESTREAM_BYTES = new Uint8Array([
  0xff, 0x0a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

const JXL_CONTAINER_BYTES = new Uint8Array([
  0x00, 0x00, 0x00, 0x0c, 0x4a, 0x58, 0x4c, 0x20, 0x00, 0x00, 0x00, 0x00,
]);

// ============================================================================
// Constants Tests
// ============================================================================

describe("upload-validation constants", () => {
  describe("ALLOWED_IMAGE_TYPES", () => {
    it("includes jpeg", () => {
      expect(ALLOWED_IMAGE_TYPES).toContain("image/jpeg");
    });

    it("includes png", () => {
      expect(ALLOWED_IMAGE_TYPES).toContain("image/png");
    });

    it("includes gif", () => {
      expect(ALLOWED_IMAGE_TYPES).toContain("image/gif");
    });

    it("includes webp", () => {
      expect(ALLOWED_IMAGE_TYPES).toContain("image/webp");
    });

    it("includes jxl", () => {
      expect(ALLOWED_IMAGE_TYPES).toContain("image/jxl");
    });

    it("has 5 types total", () => {
      expect(ALLOWED_IMAGE_TYPES).toHaveLength(5);
    });
  });

  describe("ALLOWED_EXTENSIONS", () => {
    it("includes jpg", () => {
      expect(ALLOWED_EXTENSIONS).toContain("jpg");
    });

    it("includes jpeg", () => {
      expect(ALLOWED_EXTENSIONS).toContain("jpeg");
    });

    it("includes png", () => {
      expect(ALLOWED_EXTENSIONS).toContain("png");
    });

    it("includes gif", () => {
      expect(ALLOWED_EXTENSIONS).toContain("gif");
    });

    it("includes webp", () => {
      expect(ALLOWED_EXTENSIONS).toContain("webp");
    });

    it("includes jxl", () => {
      expect(ALLOWED_EXTENSIONS).toContain("jxl");
    });

    it("has 6 extensions total", () => {
      expect(ALLOWED_EXTENSIONS).toHaveLength(6);
    });
  });

  describe("FILE_SIGNATURES", () => {
    it("contains signatures for image/jpeg", () => {
      expect(FILE_SIGNATURES["image/jpeg"]).toBeDefined();
      expect(FILE_SIGNATURES["image/jpeg"]).toHaveLength(5);
    });

    it("JPEG signatures include JFIF [0xFF, 0xD8, 0xFF, 0xE0]", () => {
      expect(FILE_SIGNATURES["image/jpeg"][0]).toEqual([
        0xff, 0xd8, 0xff, 0xe0,
      ]);
    });

    it("JPEG signatures include Exif [0xFF, 0xD8, 0xFF, 0xE1]", () => {
      expect(FILE_SIGNATURES["image/jpeg"][1]).toEqual([
        0xff, 0xd8, 0xff, 0xe1,
      ]);
    });

    it("JPEG signatures include SPIFF [0xFF, 0xD8, 0xFF, 0xE8]", () => {
      expect(FILE_SIGNATURES["image/jpeg"][2]).toEqual([
        0xff, 0xd8, 0xff, 0xe8,
      ]);
    });

    it("JPEG signatures include raw [0xFF, 0xD8, 0xFF, 0xDB]", () => {
      expect(FILE_SIGNATURES["image/jpeg"][3]).toEqual([
        0xff, 0xd8, 0xff, 0xdb,
      ]);
    });

    it("JPEG signatures include ADOBE [0xFF, 0xD8, 0xFF, 0xEE]", () => {
      expect(FILE_SIGNATURES["image/jpeg"][4]).toEqual([
        0xff, 0xd8, 0xff, 0xee,
      ]);
    });

    it("contains PNG signature [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]", () => {
      expect(FILE_SIGNATURES["image/png"]).toBeDefined();
      expect(FILE_SIGNATURES["image/png"][0]).toEqual([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
    });

    it("contains GIF87a signature", () => {
      const gifSignatures = FILE_SIGNATURES["image/gif"];
      expect(gifSignatures).toBeDefined();
      expect(
        gifSignatures.some((sig) => sig.join(",") === "71,73,70,56,55,97"),
      ).toBe(true);
    });

    it("contains GIF89a signature", () => {
      const gifSignatures = FILE_SIGNATURES["image/gif"];
      expect(
        gifSignatures.some((sig) => sig.join(",") === "71,73,70,56,57,97"),
      ).toBe(true);
    });

    it("contains WebP RIFF signature", () => {
      expect(FILE_SIGNATURES["image/webp"]).toBeDefined();
      expect(FILE_SIGNATURES["image/webp"][0]).toEqual([
        0x52, 0x49, 0x46, 0x46,
      ]);
    });

    it("contains JXL codestream signature [0xFF, 0x0A]", () => {
      const jxlSigs = FILE_SIGNATURES["image/jxl"];
      expect(jxlSigs).toBeDefined();
      expect(jxlSigs.some((sig) => sig.join(",") === "255,10")).toBe(true);
    });

    it("contains JXL container signature", () => {
      const jxlSigs = FILE_SIGNATURES["image/jxl"];
      expect(
        jxlSigs.some((sig) => sig.join(",") === "0,0,0,12,74,88,76,32"),
      ).toBe(true);
    });
  });

  describe("WEBP_MARKER", () => {
    it("is [0x57, 0x45, 0x42, 0x50] for 'WEBP'", () => {
      expect(WEBP_MARKER).toEqual([0x57, 0x45, 0x42, 0x50]);
    });

    it("has length 4", () => {
      expect(WEBP_MARKER).toHaveLength(4);
    });
  });

  describe("MIME_TO_EXTENSIONS", () => {
    it("maps image/jpeg to jpg and jpeg", () => {
      expect(MIME_TO_EXTENSIONS["image/jpeg"]).toEqual(["jpg", "jpeg"]);
    });

    it("maps image/png to png", () => {
      expect(MIME_TO_EXTENSIONS["image/png"]).toEqual(["png"]);
    });

    it("maps image/gif to gif", () => {
      expect(MIME_TO_EXTENSIONS["image/gif"]).toEqual(["gif"]);
    });

    it("maps image/webp to webp", () => {
      expect(MIME_TO_EXTENSIONS["image/webp"]).toEqual(["webp"]);
    });

    it("maps image/jxl to jxl", () => {
      expect(MIME_TO_EXTENSIONS["image/jxl"]).toEqual(["jxl"]);
    });

    it("has 5 mappings total", () => {
      expect(Object.keys(MIME_TO_EXTENSIONS)).toHaveLength(5);
    });
  });

  describe("ALLOWED_TYPES_DISPLAY", () => {
    it("includes human-readable type names", () => {
      expect(ALLOWED_TYPES_DISPLAY).toContain("JPG");
      expect(ALLOWED_TYPES_DISPLAY).toContain("PNG");
      expect(ALLOWED_TYPES_DISPLAY).toContain("GIF");
      expect(ALLOWED_TYPES_DISPLAY).toContain("WebP");
      expect(ALLOWED_TYPES_DISPLAY).toContain("JPEG XL");
    });
  });

  describe("UPLOAD_ACCEPT_ATTR", () => {
    it("includes file extension selectors", () => {
      expect(UPLOAD_ACCEPT_ATTR).toContain(".jpg");
      expect(UPLOAD_ACCEPT_ATTR).toContain(".jpeg");
      expect(UPLOAD_ACCEPT_ATTR).toContain(".png");
      expect(UPLOAD_ACCEPT_ATTR).toContain(".gif");
      expect(UPLOAD_ACCEPT_ATTR).toContain(".webp");
      expect(UPLOAD_ACCEPT_ATTR).toContain(".jxl");
    });

    it("includes MIME type selectors", () => {
      expect(UPLOAD_ACCEPT_ATTR).toContain("image/jpeg");
      expect(UPLOAD_ACCEPT_ATTR).toContain("image/png");
      expect(UPLOAD_ACCEPT_ATTR).toContain("image/gif");
      expect(UPLOAD_ACCEPT_ATTR).toContain("image/webp");
      expect(UPLOAD_ACCEPT_ATTR).toContain("image/jxl");
    });
  });
});

// ============================================================================
// isAllowedImageType Tests
// ============================================================================

describe("isAllowedImageType", () => {
  it("returns true for image/jpeg", () => {
    expect(isAllowedImageType("image/jpeg")).toBe(true);
  });

  it("returns true for image/png", () => {
    expect(isAllowedImageType("image/png")).toBe(true);
  });

  it("returns true for image/gif", () => {
    expect(isAllowedImageType("image/gif")).toBe(true);
  });

  it("returns true for image/webp", () => {
    expect(isAllowedImageType("image/webp")).toBe(true);
  });

  it("returns true for image/jxl", () => {
    expect(isAllowedImageType("image/jxl")).toBe(true);
  });

  it("returns false for image/svg+xml", () => {
    expect(isAllowedImageType("image/svg+xml")).toBe(false);
  });

  it("returns false for application/pdf", () => {
    expect(isAllowedImageType("application/pdf")).toBe(false);
  });

  it("returns false for text/html", () => {
    expect(isAllowedImageType("text/html")).toBe(false);
  });

  it("returns false for text/plain", () => {
    expect(isAllowedImageType("text/plain")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isAllowedImageType("")).toBe(false);
  });

  it("returns false for random string", () => {
    expect(isAllowedImageType("random/type")).toBe(false);
  });

  it("returns false for uppercase MIME type", () => {
    expect(isAllowedImageType("IMAGE/JPEG")).toBe(false);
  });

  it("returns false for null (as string)", () => {
    expect(isAllowedImageType("null")).toBe(false);
  });
});

// ============================================================================
// isAllowedExtension Tests
// ============================================================================

describe("isAllowedExtension", () => {
  it("returns true for jpg", () => {
    expect(isAllowedExtension("jpg")).toBe(true);
  });

  it("returns true for jpeg", () => {
    expect(isAllowedExtension("jpeg")).toBe(true);
  });

  it("returns true for png", () => {
    expect(isAllowedExtension("png")).toBe(true);
  });

  it("returns true for gif", () => {
    expect(isAllowedExtension("gif")).toBe(true);
  });

  it("returns true for webp", () => {
    expect(isAllowedExtension("webp")).toBe(true);
  });

  it("returns true for jxl", () => {
    expect(isAllowedExtension("jxl")).toBe(true);
  });

  it("returns true for JPG (uppercase)", () => {
    expect(isAllowedExtension("JPG")).toBe(true);
  });

  it("returns true for JPEG (uppercase)", () => {
    expect(isAllowedExtension("JPEG")).toBe(true);
  });

  it("returns true for JpEg (mixed case)", () => {
    expect(isAllowedExtension("JpEg")).toBe(true);
  });

  it("returns false for svg", () => {
    expect(isAllowedExtension("svg")).toBe(false);
  });

  it("returns false for pdf", () => {
    expect(isAllowedExtension("pdf")).toBe(false);
  });

  it("returns false for html", () => {
    expect(isAllowedExtension("html")).toBe(false);
  });

  it("returns false for exe", () => {
    expect(isAllowedExtension("exe")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isAllowedExtension("")).toBe(false);
  });

  it("returns false for random extension", () => {
    expect(isAllowedExtension("xyz")).toBe(false);
  });
});

// ============================================================================
// extensionMatchesMimeType Tests
// ============================================================================

describe("extensionMatchesMimeType", () => {
  describe("JPEG matching", () => {
    it("jpg matches image/jpeg", () => {
      expect(extensionMatchesMimeType("jpg", "image/jpeg")).toBe(true);
    });

    it("jpeg matches image/jpeg", () => {
      expect(extensionMatchesMimeType("jpeg", "image/jpeg")).toBe(true);
    });

    it("JPG matches image/jpeg (case-insensitive)", () => {
      expect(extensionMatchesMimeType("JPG", "image/jpeg")).toBe(true);
    });

    it("JPEG matches image/jpeg (case-insensitive)", () => {
      expect(extensionMatchesMimeType("JPEG", "image/jpeg")).toBe(true);
    });

    it("jpg does not match image/png", () => {
      expect(extensionMatchesMimeType("jpg", "image/png")).toBe(false);
    });
  });

  describe("PNG matching", () => {
    it("png matches image/png", () => {
      expect(extensionMatchesMimeType("png", "image/png")).toBe(true);
    });

    it("PNG matches image/png (case-insensitive)", () => {
      expect(extensionMatchesMimeType("PNG", "image/png")).toBe(true);
    });

    it("png does not match image/jpeg", () => {
      expect(extensionMatchesMimeType("png", "image/jpeg")).toBe(false);
    });
  });

  describe("GIF matching", () => {
    it("gif matches image/gif", () => {
      expect(extensionMatchesMimeType("gif", "image/gif")).toBe(true);
    });

    it("GIF matches image/gif (case-insensitive)", () => {
      expect(extensionMatchesMimeType("GIF", "image/gif")).toBe(true);
    });

    it("gif does not match image/webp", () => {
      expect(extensionMatchesMimeType("gif", "image/webp")).toBe(false);
    });
  });

  describe("WebP matching", () => {
    it("webp matches image/webp", () => {
      expect(extensionMatchesMimeType("webp", "image/webp")).toBe(true);
    });

    it("WEBP matches image/webp (case-insensitive)", () => {
      expect(extensionMatchesMimeType("WEBP", "image/webp")).toBe(true);
    });

    it("webp does not match image/jxl", () => {
      expect(extensionMatchesMimeType("webp", "image/jxl")).toBe(false);
    });
  });

  describe("JXL matching", () => {
    it("jxl matches image/jxl", () => {
      expect(extensionMatchesMimeType("jxl", "image/jxl")).toBe(true);
    });

    it("JXL matches image/jxl (case-insensitive)", () => {
      expect(extensionMatchesMimeType("JXL", "image/jxl")).toBe(true);
    });

    it("jxl does not match image/jpeg", () => {
      expect(extensionMatchesMimeType("jxl", "image/jpeg")).toBe(false);
    });
  });

  describe("Invalid combinations", () => {
    it("svg does not match image/jpeg", () => {
      expect(extensionMatchesMimeType("svg", "image/jpeg")).toBe(false);
    });

    it("pdf does not match image/png", () => {
      expect(extensionMatchesMimeType("pdf", "image/png")).toBe(false);
    });

    it("exe does not match any type", () => {
      expect(extensionMatchesMimeType("exe", "image/jpeg")).toBe(false);
      expect(extensionMatchesMimeType("exe", "image/png")).toBe(false);
    });
  });
});

// ============================================================================
// validateFileSignature Tests - SECURITY CRITICAL
// ============================================================================

describe("validateFileSignature - SECURITY CRITICAL", () => {
  describe("JPEG validation", () => {
    it("accepts JFIF JPEG signature", () => {
      expect(validateFileSignature(JPEG_BYTES_JFIF, "image/jpeg")).toBe(true);
    });

    it("accepts Exif JPEG signature", () => {
      expect(validateFileSignature(JPEG_BYTES_EXIF, "image/jpeg")).toBe(true);
    });

    it("accepts SPIFF JPEG signature", () => {
      expect(validateFileSignature(JPEG_BYTES_SPIFF, "image/jpeg")).toBe(true);
    });

    it("accepts raw JPEG signature", () => {
      expect(validateFileSignature(JPEG_BYTES_RAW, "image/jpeg")).toBe(true);
    });

    it("accepts ADOBE JPEG signature", () => {
      expect(validateFileSignature(JPEG_BYTES_ADOBE, "image/jpeg")).toBe(true);
    });

    it("rejects PNG bytes labeled as JPEG", () => {
      expect(validateFileSignature(PNG_BYTES, "image/jpeg")).toBe(false);
    });

    it("rejects GIF bytes labeled as JPEG", () => {
      expect(validateFileSignature(GIF89A_BYTES, "image/jpeg")).toBe(false);
    });

    it("rejects buffer too short", () => {
      const shortBuffer = new Uint8Array([0xff, 0xd8]);
      expect(validateFileSignature(shortBuffer, "image/jpeg")).toBe(false);
    });

    it("rejects empty buffer", () => {
      expect(validateFileSignature(new Uint8Array([]), "image/jpeg")).toBe(
        false,
      );
    });
  });

  describe("PNG validation", () => {
    it("accepts valid PNG signature", () => {
      expect(validateFileSignature(PNG_BYTES, "image/png")).toBe(true);
    });

    it("rejects JPEG bytes labeled as PNG", () => {
      expect(validateFileSignature(JPEG_BYTES_JFIF, "image/png")).toBe(false);
    });

    it("rejects GIF bytes labeled as PNG", () => {
      expect(validateFileSignature(GIF89A_BYTES, "image/png")).toBe(false);
    });

    it("rejects buffer too short", () => {
      const shortBuffer = new Uint8Array([0x89, 0x50, 0x4e]);
      expect(validateFileSignature(shortBuffer, "image/png")).toBe(false);
    });
  });

  describe("GIF validation", () => {
    it("accepts GIF87a signature", () => {
      expect(validateFileSignature(GIF87A_BYTES, "image/gif")).toBe(true);
    });

    it("accepts GIF89a signature", () => {
      expect(validateFileSignature(GIF89A_BYTES, "image/gif")).toBe(true);
    });

    it("rejects JPEG bytes labeled as GIF", () => {
      expect(validateFileSignature(JPEG_BYTES_JFIF, "image/gif")).toBe(false);
    });

    it("rejects PNG bytes labeled as GIF", () => {
      expect(validateFileSignature(PNG_BYTES, "image/gif")).toBe(false);
    });

    it("rejects buffer too short", () => {
      const shortBuffer = new Uint8Array([0x47, 0x49, 0x46]);
      expect(validateFileSignature(shortBuffer, "image/gif")).toBe(false);
    });
  });

  describe("WebP validation", () => {
    it("accepts valid WebP signature with WEBP marker at offset 8", () => {
      expect(validateFileSignature(WEBP_BYTES, "image/webp")).toBe(true);
    });

    it("rejects WebP without WEBP marker at offset 8", () => {
      const invalidWebp = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      ]);
      expect(validateFileSignature(invalidWebp, "image/webp")).toBe(false);
    });

    it("rejects WebP buffer too short (< 12 bytes)", () => {
      const shortBuffer = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00]);
      expect(validateFileSignature(shortBuffer, "image/webp")).toBe(false);
    });

    it("rejects JPEG bytes labeled as WebP", () => {
      expect(validateFileSignature(JPEG_BYTES_JFIF, "image/webp")).toBe(false);
    });

    it("rejects file with correct RIFF but wrong marker at offset 8", () => {
      const wrongMarker = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x41, 0x56, 0x49, 0x46,
      ]);
      expect(validateFileSignature(wrongMarker, "image/webp")).toBe(false);
    });
  });

  describe("JXL validation", () => {
    it("accepts JXL codestream signature", () => {
      expect(validateFileSignature(JXL_CODESTREAM_BYTES, "image/jxl")).toBe(
        true,
      );
    });

    it("accepts JXL container signature", () => {
      expect(validateFileSignature(JXL_CONTAINER_BYTES, "image/jxl")).toBe(
        true,
      );
    });

    it("rejects JPEG bytes labeled as JXL", () => {
      expect(validateFileSignature(JPEG_BYTES_JFIF, "image/jxl")).toBe(false);
    });

    it("rejects PNG bytes labeled as JXL", () => {
      expect(validateFileSignature(PNG_BYTES, "image/jxl")).toBe(false);
    });

    it("rejects buffer too short", () => {
      const shortBuffer = new Uint8Array([0xff]);
      expect(validateFileSignature(shortBuffer, "image/jxl")).toBe(false);
    });
  });

  describe("MIME spoofing detection", () => {
    it("detects PNG masquerading as JPEG", () => {
      expect(validateFileSignature(PNG_BYTES, "image/jpeg")).toBe(false);
    });

    it("detects JPEG masquerading as PNG", () => {
      expect(validateFileSignature(JPEG_BYTES_JFIF, "image/png")).toBe(false);
    });

    it("detects GIF masquerading as PNG", () => {
      expect(validateFileSignature(GIF89A_BYTES, "image/png")).toBe(false);
    });

    it("detects PDF binary as JPEG", () => {
      const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF
      expect(validateFileSignature(pdfBytes, "image/jpeg")).toBe(false);
    });

    it("detects EXE binary as PNG", () => {
      const exeBytes = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]); // MZ header
      expect(validateFileSignature(exeBytes, "image/png")).toBe(false);
    });
  });
});

// ============================================================================
// getFileExtension Tests
// ============================================================================

describe("getFileExtension", () => {
  it("extracts extension from image.png", () => {
    expect(getFileExtension("image.png")).toBe("png");
  });

  it("extracts extension from photo.jpg", () => {
    expect(getFileExtension("photo.jpg")).toBe("jpg");
  });

  it("extracts extension from picture.jpeg", () => {
    expect(getFileExtension("picture.jpeg")).toBe("jpeg");
  });

  it("extracts extension from animated.gif", () => {
    expect(getFileExtension("animated.gif")).toBe("gif");
  });

  it("extracts extension from image.webp", () => {
    expect(getFileExtension("image.webp")).toBe("webp");
  });

  it("extracts extension from image.jxl", () => {
    expect(getFileExtension("image.jxl")).toBe("jxl");
  });

  it("returns lowercase extension from IMAGE.PNG", () => {
    expect(getFileExtension("IMAGE.PNG")).toBe("png");
  });

  it("returns lowercase extension from Photo.JPEG", () => {
    expect(getFileExtension("Photo.JPEG")).toBe("jpeg");
  });

  it("handles multiple dots: file.backup.png", () => {
    expect(getFileExtension("file.backup.png")).toBe("png");
  });

  it("handles multiple dots: archive.tar.gz", () => {
    expect(getFileExtension("archive.tar.gz")).toBe("gz");
  });

  it("returns null for no extension", () => {
    expect(getFileExtension("filename")).toBeNull();
  });

  it("returns null for trailing dot: file.", () => {
    expect(getFileExtension("file.")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(getFileExtension("")).toBeNull();
  });

  it("extracts extension from hidden file: .bashrc", () => {
    // Implementation extracts after last dot, so .bashrc -> "bashrc"
    expect(getFileExtension(".bashrc")).toBe("bashrc");
  });

  it("handles dot-only filename: ...", () => {
    expect(getFileExtension("...")).toBeNull();
  });

  it("handles space in filename: photo file.png", () => {
    expect(getFileExtension("photo file.png")).toBe("png");
  });

  it("handles special chars: photo@2x.png", () => {
    expect(getFileExtension("photo@2x.png")).toBe("png");
  });

  it("handles very long filename", () => {
    const longName = "a".repeat(200) + ".png";
    expect(getFileExtension(longName)).toBe("png");
  });
});

// ============================================================================
// validateImageFile Tests
// ============================================================================

describe("validateImageFile", () => {
  let mockFile: File;

  beforeEach(() => {
    mockFile = new File([], "test.jpg", { type: "image/jpeg" });
  });

  describe("valid files", () => {
    it("returns null for valid JPEG file with jpg extension", () => {
      mockFile = new File([], "photo.jpg", { type: "image/jpeg" });
      expect(validateImageFile(mockFile)).toBeNull();
    });

    it("returns null for valid JPEG file with jpeg extension", () => {
      mockFile = new File([], "photo.jpeg", { type: "image/jpeg" });
      expect(validateImageFile(mockFile)).toBeNull();
    });

    it("returns null for valid PNG file", () => {
      mockFile = new File([], "image.png", { type: "image/png" });
      expect(validateImageFile(mockFile)).toBeNull();
    });

    it("returns null for valid GIF file", () => {
      mockFile = new File([], "animated.gif", { type: "image/gif" });
      expect(validateImageFile(mockFile)).toBeNull();
    });

    it("returns null for valid WebP file", () => {
      mockFile = new File([], "image.webp", { type: "image/webp" });
      expect(validateImageFile(mockFile)).toBeNull();
    });

    it("returns null for valid JXL file", () => {
      mockFile = new File([], "image.jxl", { type: "image/jxl" });
      expect(validateImageFile(mockFile)).toBeNull();
    });

    it("returns null for uppercase extension", () => {
      mockFile = new File([], "PHOTO.JPG", { type: "image/jpeg" });
      expect(validateImageFile(mockFile)).toBeNull();
    });

    it("returns null for mixed case extension", () => {
      mockFile = new File([], "Photo.JpEg", { type: "image/jpeg" });
      expect(validateImageFile(mockFile)).toBeNull();
    });
  });

  describe("invalid MIME types", () => {
    it("returns error for SVG file", () => {
      mockFile = new File([], "drawing.svg", { type: "image/svg+xml" });
      const result = validateImageFile(mockFile);
      expect(result).not.toBeNull();
      expect(result).toContain("Invalid file type");
      expect(result).toContain("image/svg+xml");
    });

    it("returns error for PDF file", () => {
      mockFile = new File([], "document.pdf", { type: "application/pdf" });
      const result = validateImageFile(mockFile);
      expect(result).not.toBeNull();
      expect(result).toContain("Invalid file type");
    });

    it("returns error for text file", () => {
      mockFile = new File([], "data.txt", { type: "text/plain" });
      const result = validateImageFile(mockFile);
      expect(result).not.toBeNull();
      expect(result).toContain("Invalid file type");
    });

    it("returns error for empty MIME type", () => {
      mockFile = new File([], "file", { type: "" });
      const result = validateImageFile(mockFile);
      expect(result).not.toBeNull();
      expect(result).toContain("Invalid file type");
    });
  });

  describe("missing extension", () => {
    it("returns error for file without extension", () => {
      mockFile = new File([], "photo", { type: "image/jpeg" });
      const result = validateImageFile(mockFile);
      expect(result).not.toBeNull();
      expect(result).toContain("must have an extension");
    });

    it("returns error for file with trailing dot", () => {
      mockFile = new File([], "photo.", { type: "image/jpeg" });
      const result = validateImageFile(mockFile);
      expect(result).not.toBeNull();
      expect(result).toContain("must have an extension");
    });
  });

  describe("invalid extension", () => {
    it("returns error for SVG extension with image/jpeg type", () => {
      mockFile = new File([], "image.svg", { type: "image/jpeg" });
      const result = validateImageFile(mockFile);
      expect(result).not.toBeNull();
      expect(result).toContain("Invalid extension");
    });

    it("returns error for PDF extension", () => {
      mockFile = new File([], "file.pdf", { type: "image/jpeg" });
      const result = validateImageFile(mockFile);
      expect(result).not.toBeNull();
      expect(result).toContain("Invalid extension");
    });

    it("returns error for HTML extension", () => {
      mockFile = new File([], "page.html", { type: "image/jpeg" });
      const result = validateImageFile(mockFile);
      expect(result).not.toBeNull();
      expect(result).toContain("Invalid extension");
    });

    it("returns error for EXE extension", () => {
      mockFile = new File([], "malware.exe", { type: "image/jpeg" });
      const result = validateImageFile(mockFile);
      expect(result).not.toBeNull();
      expect(result).toContain("Invalid extension");
    });
  });

  describe("extension/MIME mismatch", () => {
    it("returns error for JPG extension with PNG MIME type", () => {
      mockFile = new File([], "image.jpg", { type: "image/png" });
      const result = validateImageFile(mockFile);
      expect(result).not.toBeNull();
      expect(result).toContain("does not match file type");
    });

    it("returns error for PNG extension with JPEG MIME type", () => {
      mockFile = new File([], "image.png", { type: "image/jpeg" });
      const result = validateImageFile(mockFile);
      expect(result).not.toBeNull();
      expect(result).toContain("does not match file type");
    });

    it("returns error for GIF extension with WebP MIME type", () => {
      mockFile = new File([], "image.gif", { type: "image/webp" });
      const result = validateImageFile(mockFile);
      expect(result).not.toBeNull();
      expect(result).toContain("does not match file type");
    });

    it("returns error for JPEG extension with JXL MIME type", () => {
      mockFile = new File([], "image.jpeg", { type: "image/jxl" });
      const result = validateImageFile(mockFile);
      expect(result).not.toBeNull();
      expect(result).toContain("does not match file type");
    });

    it("allows JPG for JPEG MIME (jpg and jpeg both valid for image/jpeg)", () => {
      mockFile = new File([], "image.jpg", { type: "image/jpeg" });
      expect(validateImageFile(mockFile)).toBeNull();
    });

    it("allows JPEG for JPEG MIME (jpg and jpeg both valid for image/jpeg)", () => {
      mockFile = new File([], "image.jpeg", { type: "image/jpeg" });
      expect(validateImageFile(mockFile)).toBeNull();
    });
  });
});

// ============================================================================
// validateImageFileDeep Tests - async
// ============================================================================

describe("validateImageFileDeep - async deep validation", () => {
  it("returns null for valid PNG file with correct magic bytes", async () => {
    const fileData = new Blob([PNG_BYTES]);
    const mockFile = new File([fileData], "image.png", { type: "image/png" });

    const result = await validateImageFileDeep(mockFile);
    expect(result).toBeNull();
  });

  it("returns null for valid JPEG file with correct magic bytes", async () => {
    const fileData = new Blob([JPEG_BYTES_JFIF]);
    const mockFile = new File([fileData], "photo.jpg", { type: "image/jpeg" });

    const result = await validateImageFileDeep(mockFile);
    expect(result).toBeNull();
  });

  it("returns null for valid GIF file with correct magic bytes", async () => {
    const fileData = new Blob([GIF89A_BYTES]);
    const mockFile = new File([fileData], "animation.gif", {
      type: "image/gif",
    });

    const result = await validateImageFileDeep(mockFile);
    expect(result).toBeNull();
  });

  it("returns null for valid WebP file with correct magic bytes", async () => {
    const fileData = new Blob([WEBP_BYTES]);
    const mockFile = new File([fileData], "image.webp", { type: "image/webp" });

    const result = await validateImageFileDeep(mockFile);
    expect(result).toBeNull();
  });

  it("returns null for valid JXL codestream file", async () => {
    const fileData = new Blob([JXL_CODESTREAM_BYTES]);
    const mockFile = new File([fileData], "image.jxl", { type: "image/jxl" });

    const result = await validateImageFileDeep(mockFile);
    expect(result).toBeNull();
  });

  it("returns null for valid JXL container file", async () => {
    const fileData = new Blob([JXL_CONTAINER_BYTES]);
    const mockFile = new File([fileData], "image.jxl", { type: "image/jxl" });

    const result = await validateImageFileDeep(mockFile);
    expect(result).toBeNull();
  });

  it("detects PNG masquerading as JPEG (spoofing detection)", async () => {
    const fileData = new Blob([PNG_BYTES]);
    const mockFile = new File([fileData], "fake.jpg", { type: "image/jpeg" });

    const result = await validateImageFileDeep(mockFile);
    expect(result).not.toBeNull();
    expect(result).toContain("do not match declared type");
  });

  it("detects JPEG masquerading as PNG (spoofing detection)", async () => {
    const fileData = new Blob([JPEG_BYTES_JFIF]);
    const mockFile = new File([fileData], "fake.png", { type: "image/png" });

    const result = await validateImageFileDeep(mockFile);
    expect(result).not.toBeNull();
    expect(result).toContain("do not match declared type");
  });

  it("detects GIF masquerading as PNG (spoofing detection)", async () => {
    const fileData = new Blob([GIF89A_BYTES]);
    const mockFile = new File([fileData], "fake.png", { type: "image/png" });

    const result = await validateImageFileDeep(mockFile);
    expect(result).not.toBeNull();
    expect(result).toContain("do not match declared type");
  });

  it("detects invalid basic validation before checking bytes", async () => {
    const fileData = new Blob([JPEG_BYTES_JFIF]);
    const mockFile = new File([fileData], "invalid.svg", {
      type: "image/svg+xml",
    });

    const result = await validateImageFileDeep(mockFile);
    expect(result).not.toBeNull();
    expect(result).toContain("Invalid file type");
  });

  it("detects file corruption (incorrect magic bytes)", async () => {
    const corruptData = new Uint8Array([
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]);
    const fileData = new Blob([corruptData]);
    const mockFile = new File([fileData], "corrupted.png", {
      type: "image/png",
    });

    const result = await validateImageFileDeep(mockFile);
    expect(result).not.toBeNull();
    expect(result).toContain("do not match declared type");
  });

  it("handles JPEG with Exif signature", async () => {
    const fileData = new Blob([JPEG_BYTES_EXIF]);
    const mockFile = new File([fileData], "photo.jpeg", { type: "image/jpeg" });

    const result = await validateImageFileDeep(mockFile);
    expect(result).toBeNull();
  });

  it("handles JPEG with SPIFF signature", async () => {
    const fileData = new Blob([JPEG_BYTES_SPIFF]);
    const mockFile = new File([fileData], "photo.jpg", { type: "image/jpeg" });

    const result = await validateImageFileDeep(mockFile);
    expect(result).toBeNull();
  });

  it("handles GIF87a format", async () => {
    const fileData = new Blob([GIF87A_BYTES]);
    const mockFile = new File([fileData], "old-animation.gif", {
      type: "image/gif",
    });

    const result = await validateImageFileDeep(mockFile);
    expect(result).toBeNull();
  });

  it("returns basic validation error for missing extension", async () => {
    const fileData = new Blob([PNG_BYTES]);
    const mockFile = new File([fileData], "image", { type: "image/png" });

    const result = await validateImageFileDeep(mockFile);
    expect(result).not.toBeNull();
    expect(result).toContain("must have an extension");
  });

  it("returns basic validation error for extension/MIME mismatch", async () => {
    const fileData = new Blob([PNG_BYTES]);
    const mockFile = new File([fileData], "image.jpg", { type: "image/png" });

    const result = await validateImageFileDeep(mockFile);
    expect(result).not.toBeNull();
    expect(result).toContain("does not match file type");
  });

  it("handles empty file gracefully", async () => {
    const fileData = new Blob([]);
    const mockFile = new File([fileData], "empty.png", { type: "image/png" });

    const result = await validateImageFileDeep(mockFile);
    expect(result).not.toBeNull();
    expect(result).toContain("do not match declared type");
  });

  it("handles tiny file (less than signature size)", async () => {
    const tinyData = new Uint8Array([0x89, 0x50]); // Only 2 bytes
    const fileData = new Blob([tinyData]);
    const mockFile = new File([fileData], "tiny.png", { type: "image/png" });

    const result = await validateImageFileDeep(mockFile);
    expect(result).not.toBeNull();
    expect(result).toContain("do not match declared type");
  });
});

// ============================================================================
// getActionableUploadError Tests
// ============================================================================

describe("getActionableUploadError", () => {
  describe("feature flag disabled", () => {
    it("maps feature_disabled to rollout message", () => {
      const result = getActionableUploadError("feature_disabled");
      expect(result).toContain("aren't available yet");
    });

    it("maps 'limited beta' to rollout message", () => {
      const result = getActionableUploadError(
        "Image uploads are in limited beta",
      );
      expect(result).toContain("aren't available yet");
    });

    it("maps 'not enabled' to rollout message", () => {
      const result = getActionableUploadError(
        "Feature not enabled for this tenant",
      );
      expect(result).toContain("aren't available yet");
    });
  });

  describe("rate limiting", () => {
    it("maps rate_limited to wait message", () => {
      const result = getActionableUploadError("rate_limited");
      expect(result).toContain("too quickly");
    });

    it("maps 'rate limit' to wait message", () => {
      const result = getActionableUploadError("Rate limit exceeded");
      expect(result).toContain("too quickly");
    });

    it("maps 'too many' to wait message", () => {
      const result = getActionableUploadError("Too many requests");
      expect(result).toContain("too quickly");
    });
  });

  describe("content moderation", () => {
    it("maps content_rejected to safety message", () => {
      const result = getActionableUploadError("content_rejected");
      expect(result).toContain("content safety");
    });

    it("maps 'moderation' to safety message", () => {
      const result = getActionableUploadError("Failed moderation check");
      expect(result).toContain("content safety");
    });
  });

  describe("file size errors", () => {
    it("maps 'too large' to size limit message", () => {
      const result = getActionableUploadError("File too large");
      expect(result).toContain("under 10 MB");
    });

    it("maps 'payload too large' to size limit message", () => {
      const result = getActionableUploadError("413 Payload Too Large");
      expect(result).toContain("under 10 MB");
    });
  });

  describe("file type errors", () => {
    it("maps 'file type' to allowed types message", () => {
      const result = getActionableUploadError("Invalid file type");
      expect(result).toContain("Unsupported file type");
      expect(result).toContain(ALLOWED_TYPES_DISPLAY);
    });

    it("maps 'unsupported' to allowed types message", () => {
      const result = getActionableUploadError("Unsupported format");
      expect(result).toContain("Unsupported file type");
    });
  });

  describe("auth errors", () => {
    it("maps 'unauthorized' to sign-in message", () => {
      const result = getActionableUploadError("Unauthorized");
      expect(result).toContain("sign in");
    });

    it("maps '401' to sign-in message", () => {
      const result = getActionableUploadError("401 Unauthorized");
      expect(result).toContain("sign in");
    });
  });

  describe("forbidden / CSRF errors", () => {
    it("maps 'forbidden' to session expired message", () => {
      const result = getActionableUploadError("403 Forbidden");
      expect(result).toContain("session may have expired");
    });

    it("maps 'csrf' to session expired message", () => {
      const result = getActionableUploadError("CSRF token validation failed");
      expect(result).toContain("session may have expired");
    });
  });

  describe("service unavailable", () => {
    it("maps '503' to temporarily unavailable message", () => {
      const result = getActionableUploadError("503 Service Unavailable");
      expect(result).toContain("temporarily unavailable");
    });

    it("maps 'temporarily' to unavailable message", () => {
      const result = getActionableUploadError("Service temporarily down");
      expect(result).toContain("temporarily unavailable");
    });
  });

  describe("network errors", () => {
    it("maps 'Failed to fetch' to network message", () => {
      const result = getActionableUploadError("Failed to fetch");
      expect(result).toContain("Network error");
    });

    it("maps 'network' to network message", () => {
      const result = getActionableUploadError("Network request failed");
      expect(result).toContain("Network error");
    });
  });

  describe("fallback behavior", () => {
    it("returns original message for unknown errors", () => {
      const original = "Something completely unexpected happened";
      const result = getActionableUploadError(original);
      expect(result).toBe(original);
    });

    it("returns original message for empty string", () => {
      const result = getActionableUploadError("");
      expect(result).toBe("");
    });

    it("is case-insensitive for matching", () => {
      const result = getActionableUploadError("RATE_LIMITED");
      expect(result).toContain("too quickly");
    });
  });
});
