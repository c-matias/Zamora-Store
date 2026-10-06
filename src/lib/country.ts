import "server-only";
import { cookies } from "next/headers";
import { COUNTRY_COOKIE } from "@/lib/config";
import type { Country } from "@/types/domain";

export async function getCountry(): Promise<Country> {
  const v = (await cookies()).get(COUNTRY_COOKIE)?.value;
  return v === "AO" ? "AO" : "PT";
}
