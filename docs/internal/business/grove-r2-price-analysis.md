# *Cloudflare R2 Cost Analysis & Infrastructure Planning*

Grove.place

*December 2024*

## Executive Summary

This analysis examines the infrastructure costs for Grove.place, a multi-user blogging platform using Cloudflare R2 for storage. The key finding:

**R2 costs will remain under 0.5% of revenue at any scale, from 100 users to 1 million.**

This is possible because of three factors: aggressive CDN caching (95%+ hit rates), small file sizes (compressed WebP images ~12KB), and R2's zero egress fees.

## R2 Pricing Breakdown

Cloudflare R2 charges for three things:

| **Cost Type**        | **Price**            | **Free Tier**   |
|----------------------|----------------------|-----------------|
| Storage              | \$0.015 / GB-month   | 10 GB free      |
| Writes (Class A)     | \$4.50 / million ops | 1 million free  |
| Reads (Class B)      | \$0.36 / million ops | 10 million free |
| **Bandwidth/Egress** | **FREE**             | **Always free** |

*The free bandwidth is the killer feature for image hosting.*

## Why Caching Changes Everything

Without caching, every image view hits R2 (a read operation). With thousands of users viewing millions of images, this adds up fast.

With Cloudflare CDN caching enabled:

- First request for an image → CDN fetches from R2 (1 read operation)

- Next 1,000+ requests → CDN serves directly, R2 never touched

- Expected cache hit rate: 95%+ for static blog images

This means only ~5% of image requests actually hit R2. The rest are served free from Cloudflare's global edge network.

## Cost Projections at Scale

Assumptions: 85% Basic (\$12), 10% Pro (\$25), 5% Premium (\$50). Users average 35% of allocated storage. 95% cache hit rate.

| **Users**     | **Storage** | **R2 Cost**      | **Revenue**    |
|---------------|-------------|------------------|----------------|
| 1,000         | ~4 TB       | ~\$59/mo         | \$15,200/mo    |
| 10,000        | ~39 TB      | ~\$590/mo        | \$152,000/mo   |
| 100,000       | ~394 TB     | ~\$5,950/mo      | \$1.52M/mo     |
| **1,000,000** | **~3.9 PB** | **~\$59,550/mo** | **\$15.2M/mo** |

**R2 costs remain at ~0.39% of revenue regardless of scale.**

## Key Takeaways

1.  **Storage dominates costs (99%+)**: Operations are nearly free with caching

2.  **Bandwidth is free**: This is the R2 killer feature for image hosting

3.  **Caching is essential**: Use custom domains (cdn.grove.place) not r2.dev URLs

4.  **Your margins are excellent**: Charging \$2.40/GB for storage that costs \$0.015/GB

5.  **R2 is not your scaling bottleneck**: Payment processing (Stripe ~3%) will cost more

## What Will Actually Cost Money

At scale, your actual cost centers will be:

- **Payment processing:** ~3% of revenue (Stripe)

- **Domain costs:** ~\$20/year per premium user domain

- **Workers/compute:** Minimal, but scales with API requests

- **Support & operations:** The human cost once you grow

*— End of Analysis —*