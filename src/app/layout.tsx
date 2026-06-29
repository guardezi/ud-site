/**
 * Root layout — quase trivial. O HTML/body real fica em `[locale]/layout.tsx`
 * pra que o `<html lang>` e provider next-intl sejam aplicados corretamente
 * em todas as rotas localizadas.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
