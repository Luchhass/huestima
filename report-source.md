# Huestima SEO research record

Date: 2026-09-07

Scope: improve crawlable landing pages, title and snippet relevance, multilingual discovery, structured data, sitemap quality, and organic-search measurement for the five Huestima game families.

Research findings applied:

- Google recommends unique, descriptive titles and snippets and may use visible headings and page text when generating title links.
- Google recommends separate URLs for different language versions, with reciprocal `hreflang` annotations and language-specific visible content.
- Sitemaps should contain absolute canonical URLs that are intended for search results; `priority` and `changefreq` are ignored, while accurate `lastmod` is useful.
- Structured data must describe visible, people-first page content and must not be used to manufacture unsupported search features.
- For a single-page app with manual pageview control, automatic pageviews should be disabled and one explicit pageview should be sent per navigation. Enhanced Measurement history-based pageviews should be reviewed in the GA4 property to avoid duplicates.
- Google’s guidance does not guarantee a first position. Spam and scaled-content policies make useful, original, user-facing content more durable than keyword stuffing or doorway pages.

Primary sources:

- Google Search Central, SEO Starter Guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Google Search Central, Influencing Title Links: https://developers.google.com/search/docs/appearance/title-link
- Google Search Central, Managing multilingual sites: https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites
- Google Search Central, Build and submit a sitemap: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Google Search Central, Structured data policies: https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- Google Search Central, Spam policies: https://developers.google.com/search/docs/essentials/spam-policies
- Google Analytics, single-page applications: https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications
- web.dev, Web Vitals: https://web.dev/articles/vitals
