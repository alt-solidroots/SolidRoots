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

- Password storage now uses strong hashing (PBKDF2 with salt) via the new password utilities. Users are stored with password_hash and password_salt in the new users table.
- Authentication now uses a JWT-based flow. You must first register a user, then login to obtain a token, and use that token for protected endpoints.
- The /api/register endpoint creates a new user with a salted hash. /api/login validates the password and issues a token.

- Injection safety: All DB interactions use parameterized queries. User input is validated and sanitized before storage.
- Access control: Per-user data is protected by a server-side JWT-based flow. Admin access remains secret-based.
- Rate limiting: Admin and Submit routes now have rate limiting; KV-based when configured, with in-memory fallback for development.
- Whitelisting for sensitive routes: To enhance security, you can configure allow-lists for admin and submit endpoints via ALLOWED_ADMIN_IPS and ALLOWED_SUBMIT_IPS environment variables. When set, only IPs in these lists can access those routes. If not set, access is allowed (useful for development); in production, configure the allow-lists.
- Per-user data isolation: A new user_id field ties inquiries to a specific user. A /api/me endpoint fetches only the authenticated user’s data.
- How to test locally:
  - Generate a JWT via the login API (POST /api/login) to obtain a token (requires JWT_SECRET).
  - Use the token to call /api/submit and /api/me (Authorization: Bearer <token>).
  - Check that data is only returned for your user_id. Try a different user’s token and verify isolation.
- How to enable production-grade rate limiting:
  - Bind a Cloudflare KV namespace to RATE_LIMIT_KV for distributed limiting. If not bound, in-memory limiter applies per process.
- Next steps (optional): add automated tests for admin, login, submit, and per-user endpoints; wire in a full OAuth/JWT workflow if desired.

## Deployment

To get this website live quickly and for free, you can use **GitHub Pages**:
1. Go to your repository settings on GitHub.
2. Navigate to the "Pages" section.
3. Under "Source", select the `main` branch.
4. Click "Save". Your site will be published at `https://<your-username>.github.io/SolidRoots`.
