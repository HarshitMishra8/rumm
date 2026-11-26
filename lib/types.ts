export type Room = "living" | "bedroom" | "dining" | "workspace" | "small-things";

export type ArtKind =
  | "sofa"
  | "armchair"
  | "coffeetable"
  | "floorlamp"
  | "bookcase"
  | "rug"
  | "bed"
  | "nightstand"
  | "dresser"
  | "diningtable"
  | "chair"
  | "pendant"
  | "desk"
  | "plant"
  | "cushion"
  | "mugs"
  | "basket";

export interface Colorway {
  id: string;
  name: string;
  /** main upholstery / painted colour */
  hex: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  type: string; // "Three-seat sofa"
  room: Room;
  art: ArtKind;
  price: number; // INR, whole rupees
  wasPrice?: number;
  badge?: "New" | "Lower price" | "Last few";
  blurb: string;
  description: string;
  details: string[];
  dimensions: { w: number; d: number; h: number }; // cm
  material: string;
  wood: string; // hex for timber parts in the illustration
  colorways: Colorway[];
  pieces: number; // parts in the flat pack
  assemblyMinutes: number;
  stock: number;
}

export interface CartLine {
  productId: string;
  colorwayId: string;
  qty: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string; // scrypt: salt:hash
  createdAt: string;
}

export interface Session {
  token: string;
  userId: string;
  expiresAt: string;
}

export interface OrderLine {
  productId: string;
  name: string;
  colorway: string;
  unitPrice: number;
  qty: number;
}

export interface Address {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  pin: string;
}

export type DeliveryOption = "standard" | "assembly";
export type PaymentOption = "cod" | "upi-on-delivery" | "online";
export type PaymentStatus = "not_required" | "pending" | "paid" | "failed";

export interface Order {
  id: string;
  userId: string | null;
  email: string;
  lines: OrderLine[];
  subtotal: number;
  delivery: number;
  assembly: number;
  total: number;
  address: Address;
  deliveryOption: DeliveryOption;
  payment: PaymentOption;
  /** only online orders move through pending → paid (or failed) */
  paymentStatus: PaymentStatus;
  status: "placed" | "packed" | "shipped" | "delivered" | "cancelled";
  createdAt: string;
  deliverBy: string;
}

export interface CartView {
  lines: Array<CartLine & { product: Product; colorway: Colorway; lineTotal: number }>;
  count: number;
  subtotal: number;
}
