import { saveProduct } from "../_actions/products";
import { Field, inputClass } from "@/components/forms/Field";
import { t } from "@/lib/i18n/pt-PT";
import { btnPrimary } from "./ui";
import { VariantFields } from "./VariantFields";

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Criar (inclui a 1.ª variante) ou editar (só dados do produto; as variantes têm formulários próprios). */
export function ProductForm({ product, suppliers, draftDescription }: { product?: any; suppliers: any[]; draftDescription?: string }) {
  return (
    <form action={saveProduct} className="grid max-w-3xl gap-4 sm:grid-cols-2">
      {product && <input type="hidden" name="id" value={product.id} />}
      <Field id="name" label="Nome"><input id="name" name="name" required defaultValue={product?.name} className={inputClass} /></Field>
      <Field id="slug" label="Slug (URL)" hint="Vazio = gerado a partir do nome."><input id="slug" name="slug" defaultValue={product?.slug} className={inputClass} /></Field>
      <Field id="brand" label="Marca"><input id="brand" name="brand" required defaultValue={product?.brand} className={inputClass} /></Field>
      <Field id="model" label="Modelo"><input id="model" name="model" required defaultValue={product?.model} className={inputClass} /></Field>
      <Field id="category" label="Categoria">
        <select id="category" name="category" defaultValue={product?.category ?? "laptops"} className={inputClass}>
          {(Object.keys(t.categories) as (keyof typeof t.categories)[]).map((c) => <option key={c} value={c}>{t.categories[c]}</option>)}
        </select>
      </Field>
      <Field id="condition" label="Condição">
        <select id="condition" name="condition" defaultValue={product?.condition ?? "good"} className={inputClass}>
          {(Object.keys(t.conditions) as (keyof typeof t.conditions)[]).map((c) => <option key={c} value={c}>{t.conditions[c]}</option>)}
        </select>
      </Field>
      <Field id="status" label="Estado">
        <select id="status" name="status" defaultValue={product?.status ?? "draft"} className={inputClass}>
          <option value="draft">Rascunho</option><option value="active">Ativo (visível na loja)</option><option value="inactive">Inativo</option>
        </select>
      </Field>
      <div className="sm:col-span-2"><Field id="description" label="Descrição"><textarea id="description" name="description" rows={4} defaultValue={draftDescription ?? product?.description} className={inputClass} /></Field></div>
      <div className="sm:col-span-2"><Field id="images" label="Imagens (um URL https por linha)"><textarea id="images" name="images" rows={3} defaultValue={(product?.images ?? []).join("\n")} className={inputClass} /></Field></div>
      {!product && <VariantFields p="new" suppliers={suppliers} />}
      <div className="sm:col-span-2"><button className={btnPrimary}>{product ? "Guardar produto" : "Criar produto"}</button></div>
    </form>
  );
}
