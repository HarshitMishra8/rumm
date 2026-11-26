import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import { getAdminProduct } from "@/lib/adminData";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const product = await getAdminProduct((await params).id);
  if (!product) notFound();
  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/admin/products">Products</Link>
      </nav>
      <h1 className="page-title">
        {product.name} <span className="title-sub">{product.type.toLowerCase()}</span>
      </h1>
      <ProductForm product={product} />
    </>
  );
}
