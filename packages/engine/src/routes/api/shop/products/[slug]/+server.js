import { json, error } from "@sveltejs/kit";
import { validateCSRF } from "$lib/utils/csrf.js";
import {
  getProductBySlug,
  updateProduct,
  deleteProduct,
  createVariant,
  updateVariant,
  deleteVariant,
} from "$lib/payments/shop.js";

/**
 * GET /api/shop/products/[slug] - Get a single product
 */
export async function GET({ params, url, platform, locals }) {
  if (!platform?.env?.POSTS_DB) {
    throw error(500, "Database not configured");
  }

  const tenantId = url.searchParams.get("tenant_id") || locals.tenant?.id;
  if (!tenantId) {
    throw error(400, "Tenant ID required");
  }

  try {
    const product = await getProductBySlug(
      platform.env.POSTS_DB,
      tenantId,
      params.slug
    );

    if (!product) {
      throw error(404, "Product not found");
    }

    return json({ product });
  } catch (err) {
    if (err.status) throw err;
    console.error("Error fetching product:", err);
    throw error(500, "Failed to fetch product");
  }
}

/**
 * PATCH /api/shop/products/[slug] - Update a product
 *
 * Body: Same as POST, all fields optional
 */
export async function PATCH({ params, request, url, platform, locals }) {
  // Auth check
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  // CSRF check
  if (!validateCSRF(request)) {
    throw error(403, "Invalid origin");
  }

  if (!platform?.env?.POSTS_DB) {
    throw error(500, "Database not configured");
  }

  const tenantId = url.searchParams.get("tenant_id") || locals.tenant?.id;
  if (!tenantId) {
    throw error(400, "Tenant ID required");
  }

  try {
    // Get existing product
    const product = await getProductBySlug(
      platform.env.POSTS_DB,
      tenantId,
      params.slug
    );

    if (!product) {
      throw error(404, "Product not found");
    }

    const data = await request.json();

    // Validate slug if changing
    if (data.slug && data.slug !== params.slug) {
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(data.slug)) {
        throw error(400, "Slug must contain only lowercase letters, numbers, and hyphens");
      }
    }

    // Update product
    await updateProduct(platform.env.POSTS_DB, product.id, {
      name: data.name,
      slug: data.slug,
      description: data.description,
      shortDescription: data.shortDescription,
      type: data.type,
      status: data.status,
      images: data.images,
      featuredImage: data.featuredImage,
      category: data.category,
      tags: data.tags,
      metadata: data.metadata,
    });

    // Handle variant updates if provided
    if (data.variants) {
      for (const variantData of data.variants) {
        if (variantData.id) {
          // Update existing variant
          await updateVariant(platform.env.POSTS_DB, variantData.id, {
            name: variantData.name,
            sku: variantData.sku,
            priceAmount: variantData.priceAmount,
            compareAtPrice: variantData.compareAtPrice,
            pricingType: variantData.pricingType,
            billingInterval: variantData.billingInterval,
            billingIntervalCount: variantData.billingIntervalCount,
            inventoryQuantity: variantData.inventoryQuantity,
            inventoryPolicy: variantData.inventoryPolicy,
            trackInventory: variantData.trackInventory,
            downloadUrl: variantData.downloadUrl,
            downloadLimit: variantData.downloadLimit,
            requiresShipping: variantData.requiresShipping,
            isDefault: variantData.isDefault,
            position: variantData.position,
            metadata: variantData.metadata,
          });
        } else if (variantData._action === "create") {
          // Create new variant
          await createVariant(platform.env.POSTS_DB, product.id, tenantId, {
            name: variantData.name,
            sku: variantData.sku,
            priceAmount: variantData.priceAmount,
            priceCurrency: variantData.priceCurrency || "usd",
            compareAtPrice: variantData.compareAtPrice,
            pricingType: variantData.pricingType || "one_time",
            billingInterval: variantData.billingInterval,
            billingIntervalCount: variantData.billingIntervalCount,
            inventoryQuantity: variantData.inventoryQuantity,
            inventoryPolicy: variantData.inventoryPolicy,
            trackInventory: variantData.trackInventory,
            downloadUrl: variantData.downloadUrl,
            downloadLimit: variantData.downloadLimit,
            requiresShipping: variantData.requiresShipping,
            isDefault: variantData.isDefault,
            position: variantData.position,
            metadata: variantData.metadata,
          });
        }
      }
    }

    // Handle variant deletions
    if (data.deleteVariants) {
      for (const variantId of data.deleteVariants) {
        await deleteVariant(platform.env.POSTS_DB, variantId);
      }
    }

    // Fetch updated product
    const updatedProduct = await getProductBySlug(
      platform.env.POSTS_DB,
      tenantId,
      data.slug || params.slug
    );

    return json({
      success: true,
      product: updatedProduct,
    });
  } catch (err) {
    if (err.status) throw err;
    console.error("Error updating product:", err);
    throw error(500, "Failed to update product");
  }
}

/**
 * DELETE /api/shop/products/[slug] - Delete a product
 */
export async function DELETE({ params, request, url, platform, locals }) {
  // Auth check
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  // CSRF check
  if (!validateCSRF(request)) {
    throw error(403, "Invalid origin");
  }

  if (!platform?.env?.POSTS_DB) {
    throw error(500, "Database not configured");
  }

  const tenantId = url.searchParams.get("tenant_id") || locals.tenant?.id;
  if (!tenantId) {
    throw error(400, "Tenant ID required");
  }

  try {
    const product = await getProductBySlug(
      platform.env.POSTS_DB,
      tenantId,
      params.slug
    );

    if (!product) {
      throw error(404, "Product not found");
    }

    await deleteProduct(platform.env.POSTS_DB, product.id);

    return json({
      success: true,
      message: "Product deleted",
    });
  } catch (err) {
    if (err.status) throw err;
    console.error("Error deleting product:", err);
    throw error(500, "Failed to delete product");
  }
}
