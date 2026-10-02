import type { ReactNode } from "react";

/**
 * Peças visuais da tab Patrocinadores, copiadas do tema WordPress legado
 * (ultimatedrift.com.br/patrocinadores): seta verde do título e o "check" dos
 * itens de lista. Usam as classes do tema (`ui__icon`, `sponsors__item*`).
 */

export const BACK_ARROW_PATH =
  "M13.5208 26.7703C13.8818 27.1025 14.4396 27.0692 14.7678 26.7039C15.096 26.3386 15.0632 25.774 14.7022 25.4419L2.00202 13.8182C1.67385 13.5193 1.67385 13.0875 2.00202 12.7886L14.7022 1.5634C15.0632 1.23129 15.096 0.666705 14.8006 0.301387C14.4725 -0.0639308 13.9146 -0.0971413 13.5536 0.201755L0.853422 11.4602C-0.262355 12.4565 -0.295172 14.1171 0.820606 15.1466L13.5208 26.7703Z";

export function BackArrow() {
  return (
    <svg className="ui__icon" width="15" height="27" viewBox="0 0 15 27" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d={BACK_ARROW_PATH} fill="#54F251" />
    </svg>
  );
}

const GREEN = "#54F251";
const YELLOW = "#DFF251";

/** Item com "check" (verde = patrocínio anual/alcance, amarelo = por etapa). */
export function CheckItem({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "yellow" }) {
  return (
    <div className="sponsors__item">
      <svg className="sponsors__item-icon" width="27" height="19" viewBox="0 0 27 19" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path
          d="M24.7536 0C17.618 3.23503 10.3947 12.4375 10.3947 12.4375L3.87645 6.39863L0 9.41797L9.42532 18.9792L12.861 18.8714C17.266 8.08724 27 0.862724 27 0.862724L24.7536 0Z"
          fill={tone === "yellow" ? YELLOW : GREEN}
        />
      </svg>
      <span className="sponsors__item-text">{children}</span>
    </div>
  );
}
