// Flat config (ESLint 9 / Next 16). O `next lint` foi removido no Next 16;
// o eslint-config-next passou a exportar flat config nativo, então importamos
// direto o preset `core-web-vitals` (que já inclui o config TypeScript e os
// ignores de .next/out/build). Antes isto usava FlatCompat.extends, que quebra
// com o eslint-config-next 16 (erro de estrutura circular no validador legado).
import next from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...next,
  // Artefatos de build/deploy do Firebase — nunca lintar.
  { ignores: [".firebase/**"] },
  // Regras novas do react-hooks (chegaram com o eslint-config-next 16) que o
  // código pré-existente ainda não segue. Rebaixadas pra warning pra não
  // travar o CI. TODO: promover pra error e corrigir incrementalmente.
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
];

export default eslintConfig;
