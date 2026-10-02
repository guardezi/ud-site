/**
 * Categorias de piloto do campeonato, na ordem e com a arte do site legado
 * (page-categorias.php do tema WordPress).
 *
 * Os nomes batem com `categoria_piloto.descricao` do ud-sistema (Pro, Master,
 * Rookie; "Pro / Master" e "Pro / Rookie" agrupam em Master/Rookie — ver
 * DriverCategoryEnum.fromDescriptionGrouped no ud-app). Os textos descritivos
 * não existem em nenhuma fonte de dados (nem no ud-sistema, nem no Firestore):
 * eram fixos no template do WordPress, por isso vivem no i18n
 * (`categorias.items.<slug>`).
 *
 * `classificationFilter` é o filtro da classificação: Pro = geral (sem
 * filtro), igual ao chip "Pro" do ChampionshipDetailsPage no app e ao link
 * sem `?categoria=` do site legado.
 */
export const CATEGORIES = [
  { slug: "rookie", label: "ROOKIE", image: "/theme/img/rookie.jpg", classificationFilter: "rookie" },
  { slug: "master", label: "MASTER", image: "/theme/img/master.jpg", classificationFilter: "master" },
  { slug: "pro", label: "PRO", image: "/theme/img/pro.jpg", classificationFilter: null },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];
