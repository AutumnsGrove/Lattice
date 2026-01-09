import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { validateCSRF } from "$lib/utils/csrf.js";
import {
  getProductBySlug,
  updateProduct,
  deleteProduct,
  createVariant,
  updateVariant,
  deleteVariant,
} from "$lib/payments/shop";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import type {
  ProductStatus,
  ProductType,
  PricingType,
  BillingInterval,
} from "$lib/payments/types";

// Shop feature is temporarily disabled - deferred to Phase 5 (Grove Social and beyond)
const SHOP_DISABLED = true;
const SHOP_DISABLED_MESSAGE =
  "Shop feature is temporarily disabled. It will be available in a future release.";

/**
 * GET /api/shop/products/[slug] - Get a single product
 */
export const GET: RequestHandler = async ({
  params,
  url,
  platform,
  locals,
}) => {
  if (SHOP_DISABLED) {
    throw error(503, SHOP_DISABLED_MESSAGE);
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not configured");
  }

  const tenantId = url.searchParams.get("tenant_id") || locals.tenantId;
  if (!tenantId) {
    throw error(400, "Tenant ID required");
  }

  try {
    const product = await getProductBySlug(
      platform.env.DB,
      tenantId,
      params.slug,
    );

    if (!product) {
      throw error(404, "Product not found");
    }

    return json({ product });
  } catch (err) {
    if (err && typeof err === "object" && "status" in err) throw err;
    console.error("Error fetching product:", err);
    throw error(500, "Failed to fetch product");
  }
};

/**
 * PATCH /api/shop/products/[slug] - Update a product
 *
 * Body: Same as POST, all fields optional
 */
export const PATCH: RequestHandler = async ({
  params,
  request,
  url,
  platform,
  locals,
}) => {
  if (SHOP_DISABLED) {
    throw error(503, SHOP_DISABLED_MESSAGE);
  }

  // Auth check
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  // CSRF check
  if (!validateCSRF(request)) {
    throw error(403, "Invalid origin");
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not configured");
  }

  const tenantId = url.searchParams.get("tenant_id") || locals.tenantId;
  if (!tenantId) {
    throw error(400, "Tenant ID required");
  }

  try {
    // Get existing product
    const product = await getProductBySlug(
      platform.env.DB,
      tenantId,
      params.slug,
    );

    if (!product) {
      throw error(404, "Product not found");
    }

    const data = (await request.json()) as Record<string, unknown>;

    // Validate slug if changing
    const newSlug = data.slug as string | undefined;
    if (newSlug && newSlug !== params.slug) {
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(newSlug)) {
        throw error(
          400,
          "Slug must contain only lowercase letters, numbers, and hyphens",
        );
      }
    }

    // Update product
    await updateProduct(platform.env.DB, product.id, {
      name: data.name as string | undefined,
      slug: newSlug,
      description: data.description as string | undefined,
      shortDescription: data.shortDescription as string | undefined,
      type: data.type as string | undefined as ProductType | undefined,
      status: data.status as string | undefined as ProductStatus | undefined,
      images: data.images as string[] | undefined,
      featuredImage: data.featuredImage as string | undefined,
      category: data.category as string | undefined,
      tags: data.tags as string[] | undefined,
      metadata: data.metadata as Record<string, string> | undefined,
    });

    // Handle variant updates if provided
    if (data.variants) {
      const variantsList = data.variants as Array<Record<string, unknown>>;
      for (const variantData of variantsList) {
        if (variantData.id) {
          // Update existing variant
          await updateVariant(platform.env.DB, variantData.id as string, {
            name: variantData.name as string | undefined,
            sku: variantData.sku as string | undefined,
            priceAmount: (variantData.priceAmount as number | undefined) ?? 0,
            compareAtPrice: variantData.compareAtPrice as number | undefined,
            pricingType: variantData.pricingType as string | undefined as
              | PricingType
              | undefined,
            billingInterval: variantData.billingInterval as
              | string
              | undefined as BillingInterval | undefined,
            billingIntervalCount: variantData.billingIntervalCount as
              | number
              | undefined,
            inventoryQuantity: variantData.inventoryQuantity as
              | number
              | undefined,
            inventoryPolicy: variantData.inventoryPolicy as
              | string
              | undefined as "deny" | "continue" | undefined,
            trackInventory: variantData.trackInventory as boolean | undefined,
            downloadUrl: variantData.downloadUrl as string | undefined,
            downloadLimit: variantData.downloadLimit as number | undefined,
            requiresShipping: variantData.requiresShipping as
              | boolean
              | undefined,
            isDefault: variantData.isDefault as boolean | undefined,
            position: variantData.position as number | undefined,
            metadata: variantData.metadata as
              | Record<string, string>
              | undefined,
          });
        } else if (variantData._action === "create") {
          // Create new variant
          await createVariant(platform.env.DB, product.id, tenantId, {
            name: (variantData.name as string) || "New Variant",
            sku: variantData.sku as string | undefined,
            priceAmount: (variantData.priceAmount as number | undefined) ?? 0,
            priceCurrency: (variantData.priceCurrency as string) || "usd",
            compareAtPrice: variantData.compareAtPrice as number | undefined,
            pricingType: ((variantData.pricingType as string) ||
              "one_time") as PricingType,
            billingInterval: variantData.billingInterval as
              | string
              | undefined as BillingInterval | undefined,
            billingIntervalCount: variantData.billingIntervalCount as
              | number
              | undefined,
            inventoryQuantity: variantData.inventoryQuantity as
              | number
              | undefined,
            inventoryPolicy: variantData.inventoryPolicy as
              | string
              | undefined as "deny" | "continue" | undefined,
            trackInventory: variantData.trackInventory as boolean | undefined,
            downloadUrl: variantData.downloadUrl as string | undefined,
            downloadLimit: variantData.downloadLimit as number | undefined,
            requiresShipping: variantData.requiresShipping as
              | boolean
              | undefined,
            isDefault: variantData.isDefault as boolean | undefined,
            position: variantData.position as number | undefined,
            metadata: variantData.metadata as
              | Record<string, string>
              | undefined,
          });
        }
      }
    }

    // Handle variant deletions
    if (data.deleteVariants) {
      const deleteList = data.deleteVariants as string[];
      for (const variantId of deleteList) {
        await deleteVariant(platform.env.DB, variantId);
      }
    }

    // Fetch updated product
    const updatedProduct = await getProductBySlug(
      platform.env.DB,
      tenantId,
      newSlug || params.slug,
    );

    return json({
      success: true,
      product: updatedProduct,
    });
  } catch (err) {
    if (err && typeof err === "object" && "status" in err) throw err;
    console.error("Error updating product:", err);
    throw error(500, "Failed to update product");
  }
};

/**
 * DELETE /api/shop/products/[slug] - Delete a product
 */
export const DELETE: RequestHandler = async ({
  params,
  request,
  url,
  platform,
  locals,
}) => {
  if (SHOP_DISABLED) {
    throw error(503, SHOP_DISABLED_MESSAGE);
  }

  // Auth check
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  // CSRF check
  if (!validateCSRF(request)) {
    throw error(403, "Invalid origin");
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not configured");
  }

  const tenantId = url.searchParams.get("tenant_id") || locals.tenantId;
  if (!tenantId) {
    throw error(400, "Tenant ID required");
  }

  try {
    const product = await getProductBySlug(
      platform.env.DB,
      tenantId,
      params.slug,
    );

    if (!product) {
      throw error(404, "Product not found");
    }

    await deleteProduct(platform.env.DB, product.id);

    return json({
      success: true,
      message: "Product deleted",
    });
  } catch (err) {
    if (err && typeof err === "object" && "status" in err) throw err;
    console.error("Error deleting product:", err);
    throw error(500, "Failed to delete product");
  }
};
