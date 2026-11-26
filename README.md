# Rumm

![Rumm home page](public/screenshot.png)

A full-stack furniture store built with Next.js 15 (App Router), React 19 and TypeScript, with MongoDB through Mongoose.

## Run it

You need a MongoDB database. A free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster works well.

```bash
npm install
cp .env.example .env.local    # paste your Atlas connection string and your admin email
npm run db:seed               # adds the starter products and stock, builds the indexes
npm run dev                   # http://localhost:3000
```

`npm run db:seed` never overwrites products or stock that already exist, so it's safe to run again.

## What's in it

**Storefront**
- **Home:** an interactive living room. On load, the furniture drops into place and then the lamp switches on. Every piece has a hotspot showing its price with an *Add to bag* button. The room has three colour schemes, and *Add the whole room* adds all eight pieces in the chosen colours.
- **Shop** (`/shop`): filter by room, price and search, with sorting. Swatches on each card recolour its illustration, and the + button adds the item to the bag.
- **Product** (`/product/[slug]`): colour picker (the backdrop tints to match), quantity, live stock, delivery date, parts count, assembly time, and related products.
- **Bag drawer:** quantity steppers, a progress bar toward free delivery, and a fly-to-bag animation whenever you add something.
- **Checkout:** Indian address validation (10-digit mobile, 6-digit PIN), an optional paid assembly service, and cash or UPI on delivery.
- **Accounts:** register, sign in and sign out, with order history and an order confirmation page that shows a tracker.

**Backend (`app/api/*`)**

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/products` | GET | Catalogue with filters (`room`, `max`, `sort`, `q`) and live stock |
| `/api/cart` | GET / POST / PATCH | Read the bag, add items (single or `items[]`), set a quantity (0 removes) |
| `/api/auth/register` | POST | Create an account and start a session |
| `/api/auth/login` | POST | Sign in |
| `/api/auth/logout` | POST | Sign out |
| `/api/auth/me` | GET | Current user |
| `/api/orders` | GET / POST | Your orders / place an order from the bag (checks and decrements stock) |

- Passwords are hashed with scrypt and compared in constant time. Sessions use random 256-bit tokens in httpOnly cookies.
- Guests can check out. An order page is visible only to the account that placed it, or to the browser that placed it.
- Data lives in MongoDB, products included. Mongoose models are in `models/`; routes import from `lib/store.ts`, which re-exports the users, cart and orders modules.
- Placing an order runs in a MongoDB transaction. Stock is taken with a conditional update, so two customers can never both buy the last one.
- Bag updates check the document version, so two quick taps on "Add" both count.
- Sessions and abandoned bags expire on their own through TTL indexes.

## Admin panel

Put your email in `ADMIN_EMAILS` in `.env.local` (comma-separate several), create an account on the site with that email, and an **Admin** link appears in the header.

- **Overview** (`/admin`): orders and sales for the last 7 days, orders waiting to ship, products running low.
- **Products** (`/admin/products`): add and edit products with a live preview. Pick an illustration, set colours, price, was-price, badge, stock, size and description. Hiding a product removes it from the shop and from bags; past orders keep their copy.
- **Orders** (`/admin/orders`): filter by status and move orders along (placed → packed → on the way → delivered). Customers see the change on their order tracker.

Customers who open `/admin` get a 404, and the admin API answers 403.

## Online payments (Razorpay)

Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to `.env.local` (test keys from Razorpay's Test Mode) and checkout offers **Pay online now** alongside cash and UPI on delivery. Without the keys, online payment simply isn't shown.

How an online order flows:

1. Placing the order takes the stock and saves the order as *waiting for payment*. The bag is kept.
2. The server creates a Razorpay order for the exact total, and the browser opens Razorpay Checkout (UPI, cards, netbanking, wallets).
3. On success, `POST /api/payments/verify` checks Razorpay's signature (HMAC of `order_id|payment_id` with the key secret) before marking the order paid. Only then is the bag emptied.
4. If the customer closes Checkout, `POST /api/payments/cancel` asks Razorpay whether anything was paid; if not, the order is cancelled and the stock goes back on sale.
5. Orders left unpaid for 30 minutes are checked with Razorpay and released the same way.
6. `POST /api/payments/webhook` (events `payment.captured`, `order.paid`) catches payments where the customer closed the tab. It verifies `X-Razorpay-Signature` over the raw body, checks the amount, and is safe to receive more than once. A payment that lands after its order was released puts the order back and takes the stock again.

In Test Mode, pay with UPI ID `success@razorpay` or Razorpay's test cards. Unpaid online orders can't be moved to *packed* in the admin panel.

## Design notes

- **Type:** Familjen Grotesk, loaded with `next/font`.
- **Palette:** cool frost background, spruce text, pine for actions, lingonberry red for sale prices, and a sun-yellow accent.
- **Illustrations:** every product is drawn in SVG (`components/ProductArt.tsx`) so colourways really recolour it. To use photos, add an `image` field to the products and render it in place of `ProductArt`.
- **Motion:** one orchestrated moment on load (the room assembling). Everything else responds to the user: hotspots, the fly-to-bag arc, the drawer, swatches, accordions and toasts. It all switches off under `prefers-reduced-motion`.

## Deploying to Vercel

1. In Atlas, open **Network Access** and allow `0.0.0.0/0` (Vercel's servers don't have fixed addresses).
2. Import the GitHub repo in Vercel and add `MONGODB_URI`, `ADMIN_EMAILS` and the three `RAZORPAY_*` values under **Settings → Environment Variables**.
3. In Razorpay → Settings → Webhooks, add `https://<your-site>/api/payments/webhook` with the events `payment.captured` and `order.paid`, and the same secret as `RAZORPAY_WEBHOOK_SECRET`.
4. Deploy, then run `npm run db:seed` once from your machine if the database is new.

Transactions need a replica set. Atlas clusters (including the free one) are replica sets; a plain local `mongod` is not.

## Next steps

- Send confirmation emails from `POST /api/orders`.
