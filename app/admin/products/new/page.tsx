import type { Metadata } from "next";
import Link from "next/link";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata: Metadata = { title: "Add product" };

export default function NewProduct() {
  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/admin/products">Products</Link>
      </nav>
      <h1 className="page-title">Add product</h1>
      <ProductForm />
    </>
  );
}
