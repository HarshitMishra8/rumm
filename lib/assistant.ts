/**
 * Rumm's shopping assistant. Gemini decides what to say; every fact about
 * products, stock, bags and orders comes from the tools below, which read the
 * same data as the rest of the store.
 */
import { ROOMS } from "@/data/products";
import { filterProducts } from "@/lib/catalog";
import { addToCart, getCart } from "@/lib/cart";
import { StoreError } from "@/lib/errors";
import { generate, GeminiError, type FunctionDeclaration, type GeminiContent, type GeminiPart } from "@/lib/gemini";
import { getOrder, ordersForUser } from "@/lib/orders";
import { FREE_DELIVERY_FROM, assemblyFee, deliveryDate, formatDay, formatINR } from "@/lib/pricing";
import { listProducts } from "@/lib/products";
import type { PublicUser } from "@/lib/users";
import type { Order, Product } from "@/lib/types";

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

/** A product the chat window can show as a small card. */
export interface ChatProduct {
  id: string;
  slug: string;
  name: string;
  type: string;
  price: number;
  art: Product["art"];
  wood: string;
  hex: string;
  colorwayId: string;
  inStock: boolean;
}

export interface AssistantReply {
  reply: string;
  products: ChatProduct[];
  cartChanged: boolean;
}

export interface AssistantContext {
  user: PublicUser | null;
  /** existing bag id, if any */
  cartId: string | undefined;
  /** returns the bag id, creating the bag cookie when needed */
  ensureCartId: () => Promise<string>;
  recentOrderIds: string[];
}

const MAX_TOOL_ROUNDS = 5;

/* ------------------------------------------------------------- prompt */

function systemPrompt(user: PublicUser | null): string {
  return `You are the shopping assistant for Rumm, an Indian online store for flat-pack furniture and home things.
Today is ${formatDay(new Date())}. ${user ? `The customer is signed in as ${user.name.split(" ")[0]}.` : "The customer is not signed in."}

How to behave:
- Reply in the customer's language and style (English, Hindi or Hinglish). Keep replies short: usually under 120 words.
- Use the tools for every product, price, stock, bag or order fact. Never invent products, prices, colours, sizes or order details.
- When you recommend products, name each one with its price and link it like [Fold three-seat sofa](/product/fold-three-seat-sofa). Recommend at most 4.
- Respect budgets: suggest combinations whose total fits, and say the total.
- Only add something to the bag when the customer clearly asks. Confirm what you added, the colour and the new bag total.
- You can't place orders, take payments, change orders or give refunds. For checkout, point to [checkout](/checkout). For order help you can't give, suggest replying to the order email.
- If asked about something unrelated to shopping at Rumm, say briefly that you can only help with Rumm, then offer something useful.

Store facts:
- Rooms: ${ROOMS.map((r) => `${r.name} (${r.id})`).join(", ")}.
- Delivery: flat-packed in 3 working days (Sundays excluded), free over ${formatINR(FREE_DELIVERY_FROM)}, otherwise ₹499. An order placed today arrives by ${formatDay(deliveryDate())}.
- Assembly service: 6% of the order, minimum ${formatINR(assemblyFee(1))}; a fitter comes one day after delivery.
- Payment: online (UPI, cards, netbanking through Razorpay), cash on delivery, or UPI on delivery.
- Returns: within 365 days, unopened or assembled.
- Prices include GST.`;
}

/* -------------------------------------------------------------- tools */

const FUNCTIONS: FunctionDeclaration[] = [
  {
    name: "search_products",
    description:
      "Search the Rumm catalogue. Use for any request about what Rumm sells, prices, budgets or recommendations. Returns at most 6 products.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Words describing the item, e.g. 'sofa', 'lamp', 'storage'. Leave empty to browse." },
        room: { type: "string", enum: ROOMS.map((r) => r.id), description: "Limit to one room." },
        max_price: { type: "integer", description: "Highest price in rupees for a single item." },
        sort: { type: "string", enum: ["featured", "price-asc", "price-desc"] },
      },
    },
  },
  {
    name: "get_product_details",
    description: "Full details of one product: description, colours, size, materials, assembly time, stock and reviews.",
    parameters: {
      type: "object",
      properties: { product_id: { type: "string", description: "The product id (e.g. 'p-fold') from search results." } },
      required: ["product_id"],
    },
  },
  {
    name: "add_to_bag",
    description: "Add a product to the customer's bag. Only call when the customer asks to add or buy something.",
    parameters: {
      type: "object",
      properties: {
        product_id: { type: "string" },
        colour: { type: "string", description: "Colour name or id. Defaults to the first colour." },
        quantity: { type: "integer", description: "How many, 1 to 20. Defaults to 1." },
      },
      required: ["product_id"],
    },
  },
  {
    name: "view_bag",
    description: "What is in the customer's bag right now, with the subtotal.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "get_my_orders",
    description: "The customer's recent orders with status, payment state and delivery date.",
    parameters: { type: "object", properties: {} },
  },
];

const words = (s: string) =>
  s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3);

/** Loose search: a product matches if any query word appears in its name, type, room or description. */
function search(products: Product[], args: Record<string, unknown>): Product[] {
  const base = filterProducts(products, {
    room: typeof args.room === "string" ? args.room : undefined,
    max: args.max_price ? String(args.max_price) : undefined,
    sort: typeof args.sort === "string" ? args.sort : undefined,
  });
  const q = words(String(args.query ?? "")).map((w) => w.replace(/(es|s)$/, ""));
  if (q.length === 0) return base;
  const scored = base
    .map((p) => {
      const hay = `${p.name} ${p.type} ${p.room} ${p.blurb} ${p.material}`.toLowerCase();
      return { p, score: q.filter((w) => hay.includes(w)).length };
    })
    .filter((x) => x.score > 0);
  if (!args.sort || args.sort === "featured") scored.sort((a, b) => b.score - a.score);
  return scored.map((x) => x.p);
}

const brief = (p: Product) => ({
  id: p.id,
  name: `${p.name} ${p.type.toLowerCase()}`,
  room: p.room,
  price: formatINR(p.price),
  was_price: p.wasPrice ? formatINR(p.wasPrice) : undefined,
  colours: p.colorways.map((c) => c.name),
  in_stock: p.stock > 0,
  rating: p.rating ? `${p.rating.avg} from ${p.rating.count} reviews` : undefined,
  link: `/product/${p.slug}`,
});

const card = (p: Product, colorwayId?: string): ChatProduct => {
  const cw = p.colorways.find((c) => c.id === colorwayId) ?? p.colorways[0];
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    type: p.type,
    price: p.price,
    art: p.art,
    wood: p.wood,
    hex: cw.hex,
    colorwayId: cw.id,
    inStock: p.stock > 0,
  };
};

const orderBrief = (o: Order) => ({
  id: o.id,
  placed: formatDay(o.createdAt),
  status: o.status === "shipped" ? "on the way" : o.status,
  payment: o.payment === "online" ? `online, ${o.paymentStatus}` : o.payment === "cod" ? "cash on delivery" : "UPI on delivery",
  total: formatINR(o.total),
  arrives_by: o.status === "cancelled" ? undefined : formatDay(o.deliverBy),
  items: o.lines.map((l) => `${l.qty} × ${l.name} (${l.colorway})`),
  link: `/orders/${o.id}`,
});

interface ToolState {
  products: ChatProduct[];
  cartChanged: boolean;
  /** the catalogue, loaded once per message */
  catalogue?: Product[];
}

async function runTool(name: string, args: Record<string, unknown>, ctx: AssistantContext, state: ToolState) {
  const products = (state.catalogue ??= await listProducts());
  const find = (id: unknown) => products.find((p) => p.id === id || p.slug === id);

  switch (name) {
    case "search_products": {
      const found = search(products, args);
      state.products = found.slice(0, 4).map((p) => card(p));
      return { count: found.length, products: found.slice(0, 6).map(brief) };
    }
    case "get_product_details": {
      const p = find(args.product_id);
      if (!p) return { error: "No product with that id. Search first." };
      state.products = [card(p)];
      return {
        ...brief(p),
        description: p.description,
        details: p.details,
        colours: p.colorways.map((c) => ({ id: c.id, name: c.name })),
        size_cm: `${p.dimensions.w} wide × ${p.dimensions.d} deep × ${p.dimensions.h} high`,
        materials: p.material,
        parts_in_box: p.pieces,
        assembly_minutes: p.assemblyMinutes,
        stock: p.stock,
      };
    }
    case "add_to_bag": {
      const p = find(args.product_id);
      if (!p) return { error: "No product with that id. Search first." };
      const wanted = String(args.colour ?? "").trim().toLowerCase();
      const cw = wanted ? p.colorways.find((c) => c.id === wanted || c.name.toLowerCase() === wanted) : p.colorways[0];
      if (!cw) return { error: `That colour isn't available. Colours: ${p.colorways.map((c) => c.name).join(", ")}.` };
      const qty = Math.max(1, Math.min(20, Math.floor(Number(args.quantity) || 1)));
      try {
        ctx.cartId = await ctx.ensureCartId(); // a first-time visitor gets a bag here
        const bag = await addToCart(ctx.cartId, [{ productId: p.id, colorwayId: cw.id, qty }]);
        state.cartChanged = true;
        state.products = [card(p, cw.id)];
        return { added: `${qty} × ${p.name} ${p.type.toLowerCase()} in ${cw.name}`, bag_items: bag.count, bag_subtotal: formatINR(bag.subtotal) };
      } catch (err) {
        if (err instanceof StoreError) return { error: err.message };
        throw err;
      }
    }
    case "view_bag": {
      const bag = await getCart(ctx.cartId);
      return {
        items: bag.lines.map((l) => `${l.qty} × ${l.product.name} ${l.product.type.toLowerCase()} (${l.colorway.name}), ${formatINR(l.lineTotal)}`),
        subtotal: formatINR(bag.subtotal),
        free_delivery: bag.subtotal >= FREE_DELIVERY_FROM,
      };
    }
    case "get_my_orders": {
      let orders: Order[] = [];
      if (ctx.user) orders = await ordersForUser(ctx.user.id);
      else orders = (await Promise.all(ctx.recentOrderIds.map((id) => getOrder(id)))).filter((o): o is Order => !!o);
      if (orders.length === 0) {
        return { orders: [], note: ctx.user ? "No orders yet." : "Not signed in and no orders from this browser. Suggest signing in." };
      }
      return { orders: orders.slice(0, 5).map(orderBrief) };
    }
    default:
      return { error: `Unknown tool ${name}` };
  }
}

/* --------------------------------------------------------------- loop */

export async function runAssistant(messages: ChatMessage[], ctx: AssistantContext): Promise<AssistantReply> {
  const contents: GeminiContent[] = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.text }],
  }));
  const state: ToolState = { products: [], cartChanged: false };
  const system = systemPrompt(ctx.user);

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    let content: GeminiContent | null;
    const started = Date.now();
    try {
      content = await generate({ system, contents, functions: round < MAX_TOOL_ROUNDS ? FUNCTIONS : [] });
    } catch (err) {
      console.error(`[chat] round ${round + 1} failed after ${((Date.now() - started) / 1000).toFixed(1)}s:`, (err as Error).message);
      const slow = err instanceof GeminiError && /didn't answer/.test(err.message);
      throw new StoreError(
        slow
          ? "The assistant is taking too long right now. Try again in a moment."
          : err instanceof GeminiError
            ? "The assistant isn't available right now. Try again in a minute."
            : "Something went wrong.",
        slow ? 504 : 502,
      );
    }
    if (!content || !content.parts?.length) {
      return { reply: "I can't help with that one. Ask me about furniture, your bag or your orders.", products: [], cartChanged: state.cartChanged };
    }

    const called = (content?.parts ?? []).filter((p) => p.functionCall).map((p) => p.functionCall!.name);
    console.info(
      `[chat] round ${round + 1}: Gemini took ${((Date.now() - started) / 1000).toFixed(1)}s${called.length ? `, asked for ${called.join(", ")}` : ", replied"}`,
    );
    const calls = content.parts.filter((p): p is GeminiPart & { functionCall: NonNullable<GeminiPart["functionCall"]> } => !!p.functionCall);
    if (calls.length === 0) {
      const reply = content.parts
        .filter((p) => typeof p.text === "string" && !p.thought)
        .map((p) => p.text)
        .join("")
        .trim();
      return {
        reply: reply || "Sorry, I lost my train of thought. Could you ask that again?",
        products: state.products,
        cartChanged: state.cartChanged,
      };
    }

    // send the model's turn back exactly as it came (it may carry thought signatures)
    contents.push({ role: "model", parts: content.parts });
    const responses: GeminiPart[] = [];
    for (const c of calls) {
      const result = await runTool(c.functionCall.name, c.functionCall.args ?? {}, ctx, state);
      responses.push({ functionResponse: { name: c.functionCall.name, response: result } });
    }
    contents.push({ role: "user", parts: responses });
  }
  return { reply: "That took me too many steps. Could you ask in a simpler way?", products: state.products, cartChanged: state.cartChanged };
}
