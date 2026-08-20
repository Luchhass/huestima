export const BRAND_ITEMS = [
  { id: "burger-king", slug: "burgerking", label: "Burger King", paint: { h: 24, s: 86, v: 92 } },
  { id: "kfc", slug: "kfc", label: "KFC", paint: { h: 356, s: 82, v: 86 } },
  { id: "ikea", slug: "ikea", label: "IKEA", paint: { h: 218, s: 86, v: 80 } },
  { id: "mcdonalds", slug: "mcdonalds", label: "McDonald's", paint: { h: 5, s: 86, v: 90 } },
  { id: "coca-cola", slug: "cocacola", label: "Coca-Cola", paint: { h: 357, s: 88, v: 82 } },
  { id: "nike", slug: "nike", label: "Nike", paint: { h: 0, s: 0, v: 16 } },
  { id: "adidas", slug: "adidas", label: "Adidas", paint: { h: 0, s: 0, v: 12 } },
  { id: "apple", slug: "apple", label: "Apple", paint: { h: 215, s: 10, v: 42 } },
  { id: "google", slug: "google", label: "Google", paint: { h: 218, s: 78, v: 88 } },
  { id: "netflix", slug: "netflix", label: "Netflix", paint: { h: 356, s: 86, v: 76 } },
  { id: "spotify", slug: "spotify", label: "Spotify", paint: { h: 141, s: 78, v: 72 } },
  { id: "starbucks", slug: "starbucks", label: "Starbucks", paint: { h: 157, s: 70, v: 52 } },
  { id: "shell", slug: "shell", label: "Shell", paint: { h: 42, s: 90, v: 92 } },
  { id: "samsung", slug: "samsung", label: "Samsung", paint: { h: 226, s: 80, v: 67 } },
  { id: "toyota", slug: "toyota", label: "Toyota", paint: { h: 355, s: 78, v: 78 } },
  { id: "ebay", slug: "ebay", label: "eBay", paint: { h: 217, s: 80, v: 84 } },
  { id: "playstation", slug: "playstation", label: "PlayStation", paint: { h: 218, s: 80, v: 70 } },
  { id: "honda", slug: "honda", label: "Honda", paint: { h: 0, s: 0, v: 58 } },
  { id: "bmw", slug: "bmw", label: "BMW", paint: { h: 205, s: 76, v: 76 } },
  { id: "visa", slug: "visa", label: "Visa", paint: { h: 222, s: 88, v: 62 } },
];

export const DEFAULT_BRAND_ID = BRAND_ITEMS[0].id;

export function getBrandItem(brandId = DEFAULT_BRAND_ID) {
  return BRAND_ITEMS.find((brand) => brand.id === brandId) || BRAND_ITEMS[0];
}
