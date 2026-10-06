"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { readCart, writeCart } from "@/server/cart";
import { listProducts } from "@/server/products";
import { addLine, CartError, removeLine, setQty } from "@/services/cart";

const id = z.string().regex(/^[\w-]{1,80}$/);
const qty = z.coerce.number().int().min(0).max(100);
const fail = (msg: string): never => redirect(`/cart?error=${encodeURIComponent(msg)}`);

export async function addToCart(formData: FormData) {
  const parsed = z.object({ variantId: id, quantity: qty.default(1) }).safeParse({ variantId: formData.get("variantId"), quantity: formData.get("quantity") ?? 1 });
  if (!parsed.success) return fail("Pedido inválido.");
  const { variantId, quantity } = parsed.data;
  const product = (await listProducts()).find((p) => p.variants.some((v) => v.id === variantId));
  const variant = product?.variants.find((v) => v.id === variantId);
  if (!product || !variant) return fail("Este equipamento já não está disponível.");
  if (variant.sellingPricePT === null && variant.sellingPriceAO === null) return fail("Este equipamento é sob consulta: peça uma cotação.");
  try { await writeCart(addLine(await readCart(), variantId, Math.max(1, quantity))); }
  catch (e) { if (e instanceof CartError) return fail(e.message); throw e; }
  redirect("/cart");
}

export async function updateCartLine(formData: FormData) {
  const parsed = z.object({ variantId: id, quantity: qty }).safeParse({ variantId: formData.get("variantId"), quantity: formData.get("quantity") });
  if (!parsed.success) return fail("Quantidade inválida.");
  await writeCart(setQty(await readCart(), parsed.data.variantId, parsed.data.quantity));
  redirect("/cart");
}

export async function removeCartLine(formData: FormData) {
  const parsed = id.safeParse(formData.get("variantId"));
  if (!parsed.success) return fail("Pedido inválido.");
  await writeCart(removeLine(await readCart(), parsed.data));
  redirect("/cart");
}

export async function clearCart() {
  await writeCart([]);
  redirect("/cart");
}
