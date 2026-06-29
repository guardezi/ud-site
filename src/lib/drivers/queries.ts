import "server-only";
import { unstable_cache } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { imageMedium, imageHigh } from "@/lib/firebase/image-variants";
import { tsToDate, num, str, asArray, asRecord } from "@/lib/firestore-utils";
import { driverSlug } from "@/lib/utils/slug";

export type PublicDriverCar = {
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  potencia: number | null;
  motor: string | null;
  preparador: string | null;
  apelido: string | null;
  historia: string | null;
  fotoPath: string | null;
  fotoUrl: string | null;
  principal: boolean;
};

export type PublicDriverSponsor = {
  nome: string;
  segmento: string | null;
  tipo: string | null;
  site: string | null;
  fotoPath: string | null;
  fotoUrl: string | null;
};

export type PublicDriverSocial = {
  instagram: string | null;
  youtube: string | null;
  facebook: string | null;
  twitter: string | null;
  site: string | null;
};

export type PublicDriverSummary = {
  id: number;
  slug: string;
  apelido: string;
  nome: string;
  numero: number | null;
  fotoPath: string | null;
  fotoUrl: string | null;
  category: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
};

export type PublicDriverProfile = PublicDriverSummary & {
  bio: string | null;
  naturalidade: string | null;
  social: PublicDriverSocial;
  cars: PublicDriverCar[];
  sponsors: PublicDriverSponsor[];
  heroFotoUrl: string | null;
  updatedAt: Date | null;
};

function docToSummary(id: string, d: Record<string, unknown>): PublicDriverSummary {
  const cat = asRecord(d.categoriaPiloto);
  const addr = asRecord(d.endereco);
  const apelido = str(d.apelido) ?? str(d.nome) ?? "Piloto";
  const nome = str(d.nome) ?? apelido;
  const numero = num(d.numero);
  const slug = driverSlug({ apelido, nome, numero });
  const fotoPath = str(d.foto);
  return {
    id: Number(id),
    slug,
    apelido,
    nome,
    numero,
    fotoPath,
    fotoUrl: imageMedium(fotoPath),
    category: cat ? str(cat.descricao) : null,
    city: addr ? str(addr.cidade) : null,
    state: addr ? str(addr.estado) : null,
    country: addr ? str(addr.pais) : null,
  };
}

function docToProfile(id: string, d: Record<string, unknown>): PublicDriverProfile {
  const base = docToSummary(id, d);
  const social = asRecord(d.socialNetwork) ?? {};
  const cars = asArray<Record<string, unknown>>(d.carros).map((c) => {
    const fotoPath = str(c.foto);
    return {
      marca: str(c.marca),
      modelo: str(c.modelo),
      ano: num(c.ano),
      potencia: num(c.potencia),
      motor: str(c.motor),
      preparador: str(c.preparador),
      apelido: str(c.apelido),
      historia: str(c.historia),
      fotoPath,
      fotoUrl: imageMedium(fotoPath),
      principal: c.principal === true,
    } satisfies PublicDriverCar;
  });
  const sponsors = asArray<Record<string, unknown>>(d.patrocinio).map((p) => {
    const fotoPath = str(p.foto);
    return {
      nome: str(p.nome) ?? "—",
      segmento: str(p.segmento),
      tipo: str(p.tipo),
      site: str(p.site),
      fotoPath,
      fotoUrl: imageMedium(fotoPath),
    } satisfies PublicDriverSponsor;
  });
  return {
    ...base,
    bio: str(d.bio),
    naturalidade: str(d.naturalidade),
    social: {
      instagram: str(social.instagram),
      youtube: str(social.youtube),
      facebook: str(social.facebook),
      twitter: str(social.twitter),
      site: str(social.site),
    },
    cars,
    sponsors,
    heroFotoUrl: imageHigh(base.fotoPath),
    updatedAt: tsToDate(d.updatedAt),
  };
}

/** Lista todos os pilotos ativos (cap 500). Cacheado por 1h, tag `drivers`. */
export const listPublicDrivers = unstable_cache(
  async (): Promise<PublicDriverSummary[]> => {
    try {
      const snap = await adminDb
        .collection("drivers")
        .where("isActive", "==", true)
        .orderBy("apelido", "asc")
        .limit(500)
        .get();
      return snap.docs.map((d) => docToSummary(d.id, d.data() as Record<string, unknown>));
    } catch {
      return [];
    }
  },
  ["public-drivers"],
  { revalidate: 3600, tags: ["drivers"] },
);

/** Lê perfil completo. Cache por driver id; tag `driver:{id}`. */
export async function getDriverById(id: number): Promise<PublicDriverProfile | null> {
  if (!Number.isFinite(id) || id <= 0) return null;
  const fn = unstable_cache(
    async () => {
      try {
        const doc = await adminDb.collection("drivers").doc(String(id)).get();
        if (!doc.exists) return null;
        return docToProfile(doc.id, doc.data() as Record<string, unknown>);
      } catch {
        return null;
      }
    },
    [`driver-${id}`],
    { revalidate: 86400, tags: ["drivers", `driver:${id}`] },
  );
  return fn();
}

/** Lê perfil completo via slug. Resolve via listPublicDrivers (já cacheado). */
export async function getDriverBySlug(slug: string): Promise<PublicDriverProfile | null> {
  const list = await listPublicDrivers();
  const match = list.find((d) => d.slug === slug);
  return match ? getDriverById(match.id) : null;
}

export async function getDriversByIds(ids: number[]): Promise<Map<number, PublicDriverSummary>> {
  const out = new Map<number, PublicDriverSummary>();
  if (ids.length === 0) return out;
  const unique = Array.from(new Set(ids.filter((n) => Number.isFinite(n) && n > 0)));
  const docs = await Promise.all(
    unique.map((id) => adminDb.collection("drivers").doc(String(id)).get()),
  );
  for (const doc of docs) {
    if (!doc.exists) continue;
    out.set(Number(doc.id), docToSummary(doc.id, doc.data() as Record<string, unknown>));
  }
  return out;
}
