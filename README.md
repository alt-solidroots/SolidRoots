# Solid Roots

Solid Roots is a premium real estate marketplace designed to connect discerning buyers with extraordinary properties. Our platform offers a seamless, fee-free experience for buying and selling luxury homes, modern apartments, and prime land.

## Features

- **Zero Brokerage Fees**: We eliminate the middleman, allowing buyers and sellers to connect directly.
- **Verified Listings**: Every property on our platform is thoroughly vetted for authenticity and quality.
- **Premium Design**: Our website offers a visually stunning, user-friendly interface that matches the luxury of the properties we feature.
- **Responsive Layout**: Designed to look and function perfectly across all devices.

## Pages

- `index.html`: The home page featuring our portfolio, marketplace edge, and testimonials.
- `about.html`: Learn more about our journey, vision, and why you should choose Solid Roots.
- `select-your-path.html`: A split-screen portal for users to choose whether they want to buy or sell.

## Tech Stack

- HTML5
- Tailwind CSS
- Google Fonts (Manrope and Work Sans)
- Google Material Symbols

## Setup

1. Clone this repository.
2. Open `index.html` in your web browser. No build steps required.

## Security & Testing

- Injection safety: All DB interactions use parameterized queries. User input is validated and sanitized before storage (`functions/utils/validate.js`).
- Admin access: `/api/admin` (read + delete) is gated by a server-side `ADMIN_SECRET`; there is no client-trusted check.
- Rate limiting: Admin and Submit routes are rate limited — KV-based when `RATE_LIMIT_KV` is bound, with an in-memory per-instance fallback for development.
- Allow-lists for sensitive routes: configure `ALLOWED_ADMIN_IPS` / `ALLOWED_SUBMIT_IPS` (comma-separated). When set, only listed IPs may reach those routes; when unset, access is open (convenient for dev — set them in production).
- Audit log: sensitive actions (admin access, deletes, submissions) are recorded in the `audits` table; monitor with `npm run monitor`.
- Tests: `npm test` runs the submit-contract and admin field-extractor checks.

## Deployment

To get this website live quickly and for free, you can use **GitHub Pages**:
1. Go to your repository settings on GitHub.
2. Navigate to the "Pages" section.
3. Under "Source", select the `main` branch.
4. Click "Save". Your site will be published at `https://<your-username>.github.io/SolidRoots`.
