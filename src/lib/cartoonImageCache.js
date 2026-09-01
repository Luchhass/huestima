"use client";

const imageCache = new Map();
const resolvedImageCache = new Map();
const MAX_CACHED_IMAGES = 80;

function touchCacheEntry(cache, key, value) {
  cache.delete(key);
  cache.set(key, value);
}

function trimImageCaches() {
  while (resolvedImageCache.size > MAX_CACHED_IMAGES) {
    const oldestKey = resolvedImageCache.keys().next().value;
    resolvedImageCache.delete(oldestKey);
    imageCache.delete(oldestKey);
  }
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function getVisualAssetPaths(cartoon, mode = "full") {
  const isFullPreload = mode === "full";

  return unique([
    cartoon?.scenePath,
    cartoon?.baseScenePath,
    ...(isFullPreload
      ? [
          cartoon?.originalScenePath,
          cartoon?.imagePath,
          cartoon?.maskPath,
          cartoon?.assetPath,
          ...(cartoon?.layers || []).flatMap((layer) => [
            layer?.sourcePath,
            layer?.maskPath,
          ]),
        ]
      : []),
  ]);
}

export function loadVisualImage(src) {
  if (!src) return Promise.resolve(null);
  if (imageCache.has(src)) {
    const cachedPromise = imageCache.get(src);
    touchCacheEntry(imageCache, src, cachedPromise);
    if (resolvedImageCache.has(src)) {
      touchCacheEntry(resolvedImageCache, src, resolvedImageCache.get(src));
    }
    return cachedPromise;
  }

  const promise = new Promise((resolve, reject) => {
    const image = new Image();

    image.decoding = "async";
    image.loading = "eager";
    image.onload = async () => {
      try {
        await image.decode?.();
      } catch {
        // Some browsers reject decode for already decoded/cached images.
      }

      resolvedImageCache.set(src, image);
      trimImageCaches();
      resolve(image);
    };
    image.onerror = () => reject(new Error(`Could not load cartoon image: ${src}`));
    image.src = src;
  }).catch((error) => {
    imageCache.delete(src);
    resolvedImageCache.delete(src);
    throw error;
  });

  imageCache.set(src, promise);
  return promise;
}

export function getCachedVisualImage(src) {
  return resolvedImageCache.get(src) || null;
}

export async function preloadVisualAssets(cartoons, options = {}) {
  const { concurrency = 6, mode = "full", signal } = options;
  const paths = unique(
    (cartoons || []).flatMap((cartoon) => getVisualAssetPaths(cartoon, mode)),
  );
  let cursor = 0;
  const failedPaths = [];

  async function worker() {
    while (!signal?.aborted && cursor < paths.length) {
      const path = paths[cursor];
      cursor += 1;

      try {
        await loadVisualImage(path);
      } catch {
        // A bad asset should not block the rest of the pack from warming up.
        failedPaths.push(path);
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(Math.max(1, concurrency), Math.max(1, paths.length)) },
      worker,
    ),
  );

  return { failedPaths };
}

// Compatibility exports for scene-building utilities that still use the old names.
export const getCartoonAssetPaths = getVisualAssetPaths;
export const loadCartoonImage = loadVisualImage;
export const getCachedCartoonImage = getCachedVisualImage;
export const preloadCartoonAssets = preloadVisualAssets;
