/**
 * Order emails. Plain, table-based HTML with inline styles, which is what email
 * clients render reliably, plus a text version for every message.
 */
import { siteUrl, type Email } from "@/lib/email";
import { formatDay, formatINR } from "@/lib/pricing";
import type { Order } from "@/lib/types";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const INK = "#15302a";
const MUTED = "#4c605a";
const LINE = "#c4cfcb";

function paymentNote(o: Order): string {
  if (o.payment === "online") return o.paymentStatus === "paid" ? "Paid online" : "Online payment";
  return o.payment === "cod" ? "Pay in cash on delivery" : "Pay by UPI on delivery";
}

function layout(o: Order, heading: string, intro: string, button: string): string {
  const rows = o.lines
    .map(
      (l) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid ${LINE};font-size:15px;color:${INK}">
          ${l.qty} × ${esc(l.name)}<br><span style="color:${MUTED};font-size:13px">${esc(l.colorway)}</span>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid ${LINE};font-size:15px;color:${INK};text-align:right;white-space:nowrap">${formatINR(l.unitPrice * l.qty)}</td>
      </tr>`,
    )
    .join("");
  const sum = (label: string, value: string, strong = false) =>
    `<tr><td style="padding:4px 0;font-size:${strong ? 17 : 14}px;color:${strong ? INK : MUTED};${strong ? "font-weight:700;" : ""}">${label}</td>
     <td style="padding:4px 0;text-align:right;font-size:${strong ? 17 : 14}px;color:${INK};${strong ? "font-weight:700;" : ""}">${value}</td></tr>`;

  return `<!doctype html><html><body style="margin:0;background:#e8eceb;font-family:Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e8eceb;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#f6f7f4;border-radius:16px;padding:28px">
        <tr><td style="font-size:24px;font-weight:700;color:${INK};letter-spacing:-0.5px;padding-bottom:20px">rumm</td></tr>
        <tr><td style="font-size:22px;font-weight:700;color:${INK};padding-bottom:8px">${esc(heading)}</td></tr>
        <tr><td style="font-size:15px;line-height:1.5;color:${MUTED};padding-bottom:20px">${intro}</td></tr>
        <tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>
        <tr><td style="padding-top:12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${sum("Subtotal", formatINR(o.subtotal))}
          ${sum("Delivery", o.delivery === 0 ? "Free" : formatINR(o.delivery))}
          ${o.assembly ? sum("Assembly", formatINR(o.assembly)) : ""}
          ${sum(paymentNote(o), formatINR(o.total), true)}
        </table></td></tr>
        <tr><td style="padding-top:20px;font-size:14px;line-height:1.5;color:${MUTED}">
          Delivering to ${esc(o.address.fullName)}, ${esc(o.address.line1)}${o.address.line2 ? `, ${esc(o.address.line2)}` : ""}, ${esc(o.address.city)} ${esc(o.address.pin)}
        </td></tr>
        <tr><td style="padding-top:24px">
          <a href="${siteUrl()}/orders/${encodeURIComponent(o.id)}" style="display:inline-block;background:#24594b;color:#f6f7f4;text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;border-radius:999px">${esc(button)}</a>
        </td></tr>
        <tr><td style="padding-top:24px;font-size:12px;color:${MUTED}">Order ${esc(o.id)}. Reply to this email if anything looks wrong.</td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

function textVersion(o: Order, heading: string, intro: string): string {
  return [
    heading,
    "",
    intro.replace(/<[^>]+>/g, ""),
    "",
    ...o.lines.map((l) => `${l.qty} × ${l.name} (${l.colorway})  ${formatINR(l.unitPrice * l.qty)}`),
    "",
    `${paymentNote(o)}: ${formatINR(o.total)}`,
    `Delivering to ${o.address.fullName}, ${o.address.line1}, ${o.address.city} ${o.address.pin}`,
    "",
    `${siteUrl()}/orders/${o.id}`,
  ].join("\n");
}

export function orderPlacedEmail(o: Order): Email {
  const first = o.address.fullName.split(" ")[0];
  const heading = `Thank you, ${first}. Your order is placed.`;
  const intro = `It arrives by <strong>${formatDay(o.deliverBy)}</strong>. The driver will call ${esc(o.address.phone)} before they come.`;
  return {
    to: o.email,
    subject: `Order ${o.id} placed: arrives by ${formatDay(o.deliverBy)}`,
    html: layout(o, heading, intro, "View your order"),
    text: textVersion(o, heading, intro),
  };
}

export function orderShippedEmail(o: Order): Email {
  const heading = "Your order is on the way.";
  const intro = `It should reach you by <strong>${formatDay(o.deliverBy)}</strong>. The driver will call ${esc(o.address.phone)} before they come.`;
  return {
    to: o.email,
    subject: `Order ${o.id} is on the way`,
    html: layout(o, heading, intro, "Track your order"),
    text: textVersion(o, heading, intro),
  };
}

export function orderDeliveredEmail(o: Order): Email {
  const heading = "Your order has been delivered.";
  const intro = "We hope it all fits. Once you've lived with it for a few days, you can review each piece on its product page.";
  return {
    to: o.email,
    subject: `Order ${o.id} delivered`,
    html: layout(o, heading, intro, "View your order"),
    text: textVersion(o, heading, intro),
  };
}
