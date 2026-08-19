import Script from "next/script";

/**
 * Analytics de terceiros — Google Analytics 4 + Microsoft Clarity.
 *
 * Ambos são carregados apenas quando o respectivo ID está presente no ambiente
 * (variáveis NEXT_PUBLIC_*, inlined no bundle em build-time). Hoje os IDs só são
 * setados no apphosting.production.yaml, então HML/preview não disparam analytics
 * — evita poluir as métricas com tráfego de staging.
 *
 * `strategy="afterInteractive"` carrega depois da hidratação, sem bloquear o TTFB.
 */
export function Analytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID;

  return (
    <>
      {gaId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}');`}
          </Script>
        </>
      ) : null}

      {clarityId ? (
        <Script id="ms-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){
c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window,document,"clarity","script","${clarityId}");`}
        </Script>
      ) : null}
    </>
  );
}
