import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { validateCSRF } from "$lib/utils/csrf.js";
import { getProducts, createProduct, createVariant } from "$lib/payments/shop";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import { API_ERRORS, logGroveError } from "$lib/errors";
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
 * GET /api/shop/products - List products
 *
 * Query params:
 * - status: 'draft' | 'active' | 'archived'
 * - type: 'physical' | 'digital' | 'subscription' | 'service'
 * - category: string
 * - limit: number
 * - offset: number
 */
export const GET: RequestHandler = async ({ url, platform, locals }) => {
  if (SHOP_DISABLED) {
    return json(
      {
        error: API_ERRORS.SERVICE_UNAVAILABLE.userMessage,
        error_code: API_ERRORS.SERVICE_UNAVAILABLE.code,
      },
      { status: 503 },
    );
  }

  if (!locals.user) {
    return json(
      {
        error: API_ERRORS.UNAUTHORIZED.userMessage,
        error_code: API_ERRORS.UNAUTHORIZED.code,
      },
      { status: 401 },
    );
  }

  if (!platform?.env?.DB) {
    return json(
      {
        error: API_ERRORS.DB_NOT_CONFIGURED.userMessage,
        error_code: API_ERRORS.DB_NOT_CONFIGURED.code,
      },
      { status: 500 },
    );
  }

  const requestedTenantId =
    url.searchParams.get("tenant_id") || locals.tenantId;

  try {
    // Verify user owns this tenant
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      requestedTenantId,
      locals.user,
    );

    const products = await getProducts(platform.env.DB, tenantId, {
      status: (url.searchParams.get("status") || undefined) as
        | ProductStatus
        | undefined,
      type: (url.searchParams.get("type") || undefined) as
        | ProductType
        | undefined,
      category: url.searchParams.get("category") || undefined,
      limit: parseInt(url.searchParams.get("limit") || "50"),
      offset: parseInt(url.searchParams.get("offset") || "0"),
    });

    return json({ products });
  } catch (err) {
    if (err && typeof err === "object" && "status" in err) throw err;
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Error fetching products",
      cause: err,
    });
    return json(
      {
        error: API_ERRORS.OPERATION_FAILED.userMessage,
        error_code: API_ERRORS.OPERATION_FAILED.code,
      },
      { status: 500 },
    );
  }
};

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
export const POST: RequestHandler = async ({ request, platform, locals }) => {
  if (SHOP_DISABLED) {
    return json(
      {
        error: API_ERRORS.SERVICE_UNAVAILABLE.userMessage,
        error_code: API_ERRORS.SERVICE_UNAVAILABLE.code,
      },
      { status: 503 },
    );
  }

  // Auth check
  if (!locals.user) {
    return json(
      {
        error: API_ERRORS.UNAUTHORIZED.userMessage,
        error_code: API_ERRORS.UNAUTHORIZED.code,
      },
      { status: 401 },
    );
  }

  // CSRF check
  if (!validateCSRF(request)) {
    return json(
      {
        error: API_ERRORS.INVALID_ORIGIN.userMessage,
        error_code: API_ERRORS.INVALID_ORIGIN.code,
      },
      { status: 403 },
    );
  }

  if (!platform?.env?.DB) {
    return json(
      {
        error: API_ERRORS.DB_NOT_CONFIGURED.userMessage,
        error_code: API_ERRORS.DB_NOT_CONFIGURED.code,
      },
      { status: 500 },
    );
  }

  try {
    const data = (await request.json()) as Record<string, unknown>;
    const requestedTenantId = (data.tenant_id as string) || locals.tenantId;

    // Verify user owns this tenant
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      requestedTenantId,
      locals.user,
    );

    // Validate required fields
    if (!data.name || !data.slug) {
      return json(
        {
          error: API_ERRORS.MISSING_REQUIRED_FIELDS.userMessage,
          error_code: API_ERRORS.MISSING_REQUIRED_FIELDS.code,
        },
        { status: 400 },
      );
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/;
    const slugStr = data.slug as string;
    if (!slugRegex.test(slugStr)) {
      return json(
        {
          error: API_ERRORS.VALIDATION_FAILED.userMessage,
          error_code: API_ERRORS.VALIDATION_FAILED.code,
        },
        { status: 400 },
      );
    }

    // Create the product
    const { id: productId } = await createProduct(platform.env.DB, tenantId, {
      name: data.name as string,
      slug: slugStr,
      description: data.description as string | undefined,
      shortDescription: data.shortDescription as string | undefined,
      type: ((data.type as string) || "physical") as ProductType,
      status: ((data.status as string) || "draft") as ProductStatus,
      images: (data.images as string[]) || [],
      featuredImage: data.featuredImage as string | undefined,
      category: data.category as string | undefined,
      tags: (data.tags as string[]) || [],
      metadata: (data.metadata as Record<string, string>) || {},
    });

    // Create variants if provided
    const variants = (data.variants as Record<string, unknown>[]) || [];
    const createdVariants: Array<{ id: string; name: unknown }> = [];

    // If no variants provided, create a default one
    if (variants.length === 0 && data.price !== undefined) {
      const { id: variantId } = await createVariant(
        platform.env.DB,
        productId,
        tenantId,
        {
          name: "Default",
          priceAmount: data.price as number,
          priceCurrency: "usd",
          isDefault: true,
        },
      );
      createdVariants.push({ id: variantId, name: "Default" });
    } else {
      for (let i = 0; i < variants.length; i++) {
        const variant = variants[i];
        const { id: variantId } = await createVariant(
          platform.env.DB,
          productId,
          tenantId,
          {
            name: (variant.name as string) || `Variant ${i + 1}`,
            sku: variant.sku as string | undefined,
            priceAmount: (variant.priceAmount as number | undefined) ?? 0,
            priceCurrency: (variant.priceCurrency as string) || "usd",
            compareAtPrice: variant.compareAtPrice as number | undefined,
            pricingType: ((variant.pricingType as string) ||
              "one_time") as PricingType,
            billingInterval: variant.billingInterval as string | undefined as
              | BillingInterval
              | undefined,
            billingIntervalCount: variant.billingIntervalCount as
              | number
              | undefined,
            inventoryQuantity: variant.inventoryQuantity as number | undefined,
            inventoryPolicy: variant.inventoryPolicy as string | undefined as
              | "deny"
              | "continue"
              | undefined,
            trackInventory: variant.trackInventory as boolean | undefined,
            downloadUrl: variant.downloadUrl as string | undefined,
            downloadLimit: variant.downloadLimit as number | undefined,
            requiresShipping: variant.requiresShipping as boolean | undefined,
            isDefault: (variant.isDefault as boolean) || i === 0,
            position: i,
            metadata: variant.metadata as Record<string, string> | undefined,
          },
        );
        createdVariants.push({ id: variantId, name: variant.name });
      }
    }

    return json({
      success: true,
      product: {
        id: productId,
        slug: slugStr,
        variants: createdVariants,
      },
    });
  } catch (err) {
    if (err && typeof err === "object" && "status" in err) throw err;
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Error creating product",
      cause: err,
    });
    return json(
      {
        error: API_ERRORS.OPERATION_FAILED.userMessage,
        error_code: API_ERRORS.OPERATION_FAILED.code,
      },
      { status: 500 },
    );
  }
};
