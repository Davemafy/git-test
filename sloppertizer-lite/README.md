# Sloppertizer Lite — disposable public test branch

This is an independent, intentionally dumb composition prototype with fictional ORIGIN content. It is NOT the private Sloppertizer redesign engine.

It checks preservation of observed text/link IDs, whole-section proof placement, nested headings, safe escaping and 390/768/1440 browser screenshots. Tests run on the standard public GitHub Actions runner. Screenshots are public and kept only one day.

It does not fetch or test the private Sloppertizer repository, PR #45, private design extracts, production URLs, customer captures, or any secrets. Results cannot certify private production behavior. Do not merge this lab into the private product.

Run:
npm install
npm test
npx playwright install chromium
npm run visual
