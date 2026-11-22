/** Data access for the whole app. Routes import from here. */
export { StoreError, getStockMap } from "@/lib/db";
export { newCartId, getCart, addToCart, setLineQty } from "@/lib/cart";
export {
  registerUser,
  verifyUser,
  createSession,
  userForSession,
  deleteSession,
  SESSION_MAX_AGE,
  type PublicUser,
} from "@/lib/users";
export { placeOrder, getOrder, ordersForUser } from "@/lib/orders";
