/** Which email goes out when. Every function here is safe to call and never throws. */
import { sendEmail } from "@/lib/email";
import { orderDeliveredEmail, orderPlacedEmail, orderShippedEmail } from "@/lib/emailTemplates";
import type { Order } from "@/lib/types";

/** Pay-on-delivery orders: when placed. Online orders: once the payment lands. */
export async function notifyOrderPlaced(order: Order): Promise<void> {
  await sendEmail(orderPlacedEmail(order)).catch(() => undefined);
}

/** Admin moved the order along. Only "on the way" and "delivered" are worth an email. */
export async function notifyStatusChange(order: Order): Promise<void> {
  if (order.status === "shipped") await sendEmail(orderShippedEmail(order)).catch(() => undefined);
  if (order.status === "delivered") await sendEmail(orderDeliveredEmail(order)).catch(() => undefined);
}
