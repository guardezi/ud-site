/**
 * Slugify pt-BR safe — remove acentos, normaliza espaços e caracteres especiais.
 * Usado pra derivar URLs de drivers, stages e categorias quando o doc não tem
 * slug explícito.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function driverSlug(driver: { apelido?: string | null; nome?: string | null; numero?: number | null }): string {
  const base = driver.apelido?.trim() || driver.nome?.trim() || "piloto";
  const slug = slugify(base);
  return driver.numero ? `${slug}-${driver.numero}` : slug;
}
