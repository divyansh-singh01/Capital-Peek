Brela display font (headings only)
==================================
Download Brela from https://cargocollective.com/makarskaestudio/Brela-Free-Download
(check the licence covers commercial web use), then place the files here as:

  public/fonts/Brela-Regular.woff2   <- preferred (convert .otf/.ttf to woff2)
  public/fonts/Brela-Regular.otf     <- fallback format

No code changes needed: src/styles.css already declares @font-face "Brela" and
--font-display. Until the files exist, headings render in Instrument Serif.

Optional once the woff2 exists, add to the <head> in src/routes/__root.tsx:
  <link rel="preload" href="/fonts/Brela-Regular.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />

Brela ships as a single weight, so never add font-bold/semibold to display text.
Use the type-* utilities from styles.css instead.
