---
title: Image Upload Issues
description: What to do when image uploads fail or behave unexpectedly
category: help
section: troubleshooting
lastUpdated: '2026-02-08'
slug: image-upload-failures
order: 3
keywords:
  - upload
  - image
  - photo
  - failed
  - error
  - format
  - size
  - too large
  - unsupported
  - quota
  - storage
related:
  - adding-images-and-media
  - choosing-your-plan
---

# Image Upload Issues

If an image upload isn't working, the error message usually tells you what's wrong. Here's what each situation means and how to fix it.

## Supported formats

Grove accepts these image formats:

- **JPEG** (.jpg, .jpeg) — Best for photos
- **PNG** (.png) — Good for screenshots or images with text
- **GIF** (.gif) — Animated images work
- **WebP** (.webp) — Modern format, smaller file sizes
- **AVIF** (.avif) — Next-gen format, even smaller
- **JPEG XL** (.jxl) — Newer format with excellent quality
- **HEIC/HEIF** (.heic, .heif) — Common on iPhones

If you see **"Unsupported file type"**, the file isn't one of these formats. Some things that look like images but aren't supported: SVG files, BMP files, TIFF files, and raw camera files (.CR2, .NEF, .ARW). Convert them to JPEG or PNG first—most image editors and online tools can do this.

## Size limits

**Maximum file size:** 10 MB per image.

If you see **"This image is too large"**, the file exceeds 10 MB. A few ways to reduce it:

- **On your phone:** Most photo apps have a "share as reduced size" option
- **On your computer:** Open the image in any editor, resize or export at lower quality
- **Online:** Tools like [Squoosh](https://squoosh.app) compress images without noticeable quality loss

**Maximum dimensions:** 8,192 pixels on any side, 50 megapixels total. This is well beyond what most photos need. If you're hitting this limit, you're likely uploading a panorama or very high-resolution scan—resize it down and try again.

## Storage quotas

Every plan has a storage limit for uploaded files:

| Plan | Storage |
|------|---------|
| **Seedling** | 1 GB |
| **Sapling** | 5 GB |
| **Oak** | 20 GB |
| **Evergreen** | 100 GB |

If you've hit your storage limit, you have two options:

1. **Delete images you no longer need** from your media library
2. **Upgrade your plan** for more storage

To check your current usage, look at the storage indicator in your admin panel.

## Rate limits

Grove allows **50 uploads per hour**. If you're uploading a large batch of images and hit this limit, wait a bit and continue. The limit resets after an hour.

If you see **"You're uploading too quickly"**, that's the rate limit. Take a short break and try again.

## Common error messages

Here's what the most common errors mean:

**"Unsupported file type"**
The file format isn't on the supported list above. Convert it to JPEG, PNG, or WebP and try again.

**"This image is too large"**
The file is over 10 MB. Compress or resize it.

**"You're uploading too quickly"**
You've hit the 50 uploads/hour rate limit. Wait a few minutes.

**"You need to sign in to upload images"**
Your session expired. Refresh the page, sign in again, and retry the upload.

**"Upload blocked — your session may have expired"**
Similar to above. Refresh the page. If it keeps happening, clear your cookies for `grove.place` and sign in fresh.

**"This image was flagged by our content safety system"**
Grove runs automated content moderation on uploads. If an image is incorrectly flagged, [contact us](/contact) and we'll look into it.

**"Image uploads aren't available yet"**
Image uploads are rolling out gradually. If you're seeing this, the feature hasn't reached your account yet. It will—we're expanding access steadily.

## Duplicate detection

If you upload the same image twice, Grove recognizes it and reuses the existing file instead of storing a duplicate. This saves your storage quota. You'll still get a working image URL—it just won't count against your storage twice.

## If uploads fail silently

If the upload seems to do nothing—no error, no progress, no image—try these:

1. **Check your internet connection.** Large files need a stable connection to upload completely.
2. **Try a different browser.** This can rule out extension conflicts.
3. **Disable ad blockers temporarily.** Some blockers interfere with file uploads.
4. **Try a smaller image.** If a small JPEG works but your original doesn't, the issue is likely file size or format related.

## Still stuck?

If you've checked the format, the size, and your storage quota, and uploads still aren't working:

1. Note the exact error message (or lack of one)
2. Note the file format and size of the image
3. [Contact us](/contact)

Include those details and we'll sort it out.

---

*Images should be the easy part. If they're not, we want to fix that.*
