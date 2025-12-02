import { json, error } from "@sveltejs/kit";
import { validateCSRF } from "$lib/utils/csrf.js";
import { getProducts, createProduct, createVariant } from "$lib/payments/shop.js";

/**
 * GET /api/shop/products - List products
 *
 * Query params:
 * - status: 'draft' | 'active' | 'archived'
 * - type: 'physical' | 'digital' | 'subscription' | 'service'
 * - category: string
 * - limit: number
 * - offset: number
 */
export async function GET({ url, platform, locals }) {
  if (!platform?.env?.POSTS_DB) {
    throw error(500, "Database not configured");
  }

  // Get tenant ID - in multi-tenant setup, this would come from subdomain
  // For now, we'll use a query param or default
  const tenantId = url.searchParams.get("tenant_id") || locals.tenant?.id;

  if (!tenantId) {
    throw error(400, "Tenant ID required");
  }

  try {
    const products = await getProducts(platform.env.POSTS_DB, tenantId, {
      status: url.searchParams.get("status") || undefined,
      type: url.searchParams.get("type") || undefined,
      category: url.searchParams.get("category") || undefined,
      limit: url.searchParams.get("limit")
        ? parseInt(url.searchParams.get("limit"))
        : 50,
      offset: url.searchParams.get("offset")
        ? parseInt(url.searchParams.get("offset"))
        : 0,
    });

    return json({ products });
  } catch (err) {
    console.error("Error fetching products:", err);
    throw error(500, "Failed to fetch products");
  }
}

/**
 * POST /api/shop/products - Create a new product
 *
 * Body:
 * {
 *   name: string (required)
 *   slug: string (required)
 *   description?: string
 *   shortDescription?: string
 *   type?: 'physical' | 'digital' | 'subscription' | 'service'
 *   status?: 'draft' | 'active' | 'archived'
 *   images?: string[]
 *   featuredImage?: string
 *   category?: string
 *   tags?: string[]
 *   variants?: Array<{
 *     name: string
 *     priceAmount: number (in cents)
 *     sku?: string
 *     pricingType?: 'one_time' | 'recurring'
 *     billingInterval?: 'day' | 'week' | 'month' | 'year'
 *     inventoryQuantity?: number
 *     isDefault?: boolean
 *   }>
 * }
 */
export async function POST({ request, platform, locals }) {
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

  const tenantId = locals.tenant?.id;
  if (!tenantId) {
    throw error(400, "Tenant ID required");
  }

  try {
    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.slug) {
      throw error(400, "Missing required fields: name, slug");
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(data.slug)) {
      throw error(400, "Slug must contain only lowercase letters, numbers, and hyphens");
    }

    // Create the product
    const { id: productId } = await createProduct(platform.env.POSTS_DB, tenantId, {
      name: data.name,
      slug: data.slug,
      description: data.description,
      shortDescription: data.shortDescription,
      type: data.type || "physical",
      status: data.status || "draft",
      images: data.images || [],
      featuredImage: data.featuredImage,
      category: data.category,
      tags: data.tags || [],
      metadata: data.metadata || {},
    });

    // Create variants if provided
    const variants = data.variants || [];
    const createdVariants = [];

    // If no variants provided, create a default one
    if (variants.length === 0 && data.price !== undefined) {
      const { id: variantId } = await createVariant(
        platform.env.POSTS_DB,
        productId,
        tenantId,
        {
          name: "Default",
          priceAmount: data.price,
          priceCurrency: "usd",
          isDefault: true,
        }
      );
      createdVariants.push({ id: variantId, name: "Default" });
    } else {
      for (let i = 0; i < variants.length; i++) {
        const variant = variants[i];
        const { id: variantId } = await createVariant(
          platform.env.POSTS_DB,
          productId,
          tenantId,
          {
            name: variant.name || `Variant ${i + 1}`,
            sku: variant.sku,
            priceAmount: variant.priceAmount,
            priceCurrency: variant.priceCurrency || "usd",
            compareAtPrice: variant.compareAtPrice,
            pricingType: variant.pricingType || "one_time",
            billingInterval: variant.billingInterval,
            billingIntervalCount: variant.billingIntervalCount,
            inventoryQuantity: variant.inventoryQuantity,
            inventoryPolicy: variant.inventoryPolicy,
            trackInventory: variant.trackInventory,
            downloadUrl: variant.downloadUrl,
            downloadLimit: variant.downloadLimit,
            requiresShipping: variant.requiresShipping,
            isDefault: variant.isDefault || i === 0,
            position: i,
            metadata: variant.metadata,
          }
        );
        createdVariants.push({ id: variantId, name: variant.name });
      }
    }

    return json({
      success: true,
      product: {
        id: productId,
        slug: data.slug,
        variants: createdVariants,
      },
    });
  } catch (err) {
    if (err.status) throw err;
    console.error("Error creating product:", err);
    throw error(500, "Failed to create product");
  }
}
