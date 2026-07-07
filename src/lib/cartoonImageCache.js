"use client";

const imageCache = new Map();

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function getCartoonAssetPaths(cartoon, mode = "full") {
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

export function loadCartoonImage(src) {
  if (!src) return Promise.resolve(null);
  if (imageCache.has(src)) return imageCache.get(src);

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

      resolve(image);
    };
    image.onerror = () => reject(new Error(`Could not load cartoon image: ${src}`));
    image.src = src;
  }).catch((error) => {
    imageCache.delete(src);
    throw error;
  });

  imageCache.set(src, promise);
  return promise;
}

export async function preloadCartoonAssets(cartoons, options = {}) {
  const { concurrency = 6, mode = "full", signal } = options;
  const paths = unique(
    (cartoons || []).flatMap((cartoon) => getCartoonAssetPaths(cartoon, mode)),
  );
  let cursor = 0;

  async function worker() {
    while (!signal?.aborted && cursor < paths.length) {
      const path = paths[cursor];
      cursor += 1;

      try {
        await loadCartoonImage(path);
      } catch {
        // A bad asset should not block the rest of the pack from warming up.
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(Math.max(1, concurrency), Math.max(1, paths.length)) },
      worker,
    ),
  );
}
