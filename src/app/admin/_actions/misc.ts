"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { adminDb, errorMessage } from "@/server/admin";

export async function updateRequestStatus(formData: FormData) {
  let target = "/admin/requests?saved=1";
  try {
    const input = z.object({ id: z.string().uuid(), status: z.enum(["new", "in_review", "quoted", "closed"]) })
      .parse({ id: formData.get("id"), status: formData.get("status") });
    const db = await adminDb();
    const { error } = await db.from("custom_requests").update({ status: input.status }).eq("id", input.id);
    if (error) throw error;
  } catch (e) { target = `/admin/requests?error=${encodeURIComponent(errorMessage(e))}`; }
  redirect(target);
}

const supplierSchema = z.object({
  name: z.string().trim().min(1, "Indique o nome do fornecedor").max(120),
  website: z.string().trim().url("URL inválido").max(300).optional().or(z.literal("").transform(() => undefined)),
  country: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export async function createSupplier(formData: FormData) {
  let target = "/admin/suppliers?saved=1";
  try {
    const input = supplierSchema.parse({ name: formData.get("name"), website: formData.get("website") ?? "", country: formData.get("country") ?? undefined, notes: formData.get("notes") ?? undefined });
    const db = await adminDb();
    const { error } = await db.from("suppliers").insert({ name: input.name, website: input.website ?? null, country: input.country || null, notes: input.notes || null });
    if (error) throw error;
  } catch (e) { target = `/admin/suppliers?error=${encodeURIComponent(errorMessage(e))}`; }
  redirect(target);
}

export async function toggleSupplier(formData: FormData) {
  let target = "/admin/suppliers?saved=1";
  try {
    const id = z.string().uuid().parse(formData.get("id"));
    const status = formData.get("status") === "active" ? "inactive" : "active";
    const db = await adminDb();
    const { error } = await db.from("suppliers").update({ status }).eq("id", id);
    if (error) throw error;
  } catch (e) { target = `/admin/suppliers?error=${encodeURIComponent(errorMessage(e))}`; }
  redirect(target);
}
