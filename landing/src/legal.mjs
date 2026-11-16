// Terms of service and privacy policy, in English and Swedish.
// These are a careful starting point, not legal advice: have them checked before launch.
// `c` is the company (see company.mjs) with any empty field shown as a [placeholder].

const UPDATED = '2026-11-12';

const who = {
  en: (c) => `${c.name}, organisation number ${c.orgNo}, ${c.address}. E-mail: <a href="mailto:${c.email}">${c.email}</a>.`,
  sv: (c) => `${c.name}, organisationsnummer ${c.orgNo}, ${c.address}. E-post: <a href="mailto:${c.email}">${c.email}</a>.`,
};

export function terms(lang, c) {
  if (lang === 'sv') {
    return {
      title: 'Användarvillkor',
      updated: UPDATED,
      sections: [
        ['Vilka vi är', `Yiga Oluganda tillhandahålls av ${who.sv(c)}`],
        ['Tjänsten', 'Yiga Oluganda är en kurs i luganda som du använder i en webbapp. Innehållet byggs ut över tid, till exempel med nya delar och inspelningar med modersmålstalare. För att använda tjänsten behöver du ett konto och ett aktivt abonnemang.'],
        ['Ditt konto', 'Uppge en riktig e-postadress och håll ditt lösenord hemligt. Kontot är personligt. För att teckna abonnemang måste du vara minst 18 år eller ha en vårdnadshavares tillåtelse.'],
        ['Pris och betalning', 'Abonnemanget kostar det månadspris som visas innan du betalar, i din lokala valuta och inklusive moms där det gäller. Du betalar i förskott med kort via vår betalningsleverantör Stripe. Abonnemanget förnyas automatiskt varje månad tills du avslutar det. Om priset ändras meddelar vi dig via e-post minst 30 dagar innan, och du kan avsluta innan det nya priset gäller.'],
        ['Avsluta abonnemanget', 'Du kan avsluta när du vill i appen under Jag → Inställningar → Abonnemang. Du har kvar tillgången till slutet av den period du har betalat för. Utöver ångerrätten nedan betalar vi inte tillbaka för påbörjade månader.'],
        ['Ångerrätt', 'Du har rätt att frånträda avtalet inom 14 dagar från den dag du tecknade abonnemanget. Använd knappen ”Frånträd avtalet” i appen under Jag → Inställningar → Abonnemang, eller mejla oss. Vi betalar då tillbaka hela beloppet senast 14 dagar efter att vi har fått ditt besked, till samma betalsätt som du använde. Tillgången till kursen upphör när du frånträder avtalet.'],
        ['Innehållet', 'Kursen, texterna, bilderna och ljudet tillhör oss eller våra licensgivare. Du får använda dem för ditt eget lärande, men inte kopiera, sälja eller sprida dem vidare.'],
        ['Tillgänglighet och ändringar', 'Vi gör vårt bästa för att tjänsten ska fungera hela tiden, men kan inte lova att den aldrig har avbrott. Vi kan ändra och förbättra innehållet. Om vi gör större ändringar som påverkar dig berättar vi det i förväg.'],
        ['Ansvar', 'Vi ansvarar för tjänsten enligt tvingande konsumentlagstiftning. I övrigt ansvarar vi inte för indirekta skador.'],
        ['Avsluta kontot', 'Du kan radera ditt konto när du vill i appen. Då avslutas också abonnemanget. Vi kan stänga konton som bryter mot de här villkoren.'],
        ['Klagomål och tvister', 'Kontakta oss först, så försöker vi lösa det. Svensk lag gäller. Som konsument kan du också vända dig till Allmänna reklamationsnämnden (ARN), arn.se.'],
        ['Ändringar av villkoren', 'Om vi ändrar villkoren meddelar vi dig via e-post minst 30 dagar innan ändringarna börjar gälla.'],
      ],
    };
  }
  return {
    title: 'Terms of service',
    updated: UPDATED,
    sections: [
      ['Who we are', `Yiga Oluganda is provided by ${who.en(c)}`],
      ['The service', 'Yiga Oluganda is a Luganda course that you use in a web app. We add to it over time, for example with new parts and native-speaker recordings. To use it you need an account and an active subscription.'],
      ['Your account', 'Give a real e-mail address and keep your password secret. Your account is personal. To subscribe you must be at least 18, or have a parent’s or guardian’s permission.'],
      ['Price and payment', 'The subscription costs the monthly price shown before you pay, in your local currency and including VAT where it applies. You pay in advance by card through our payment provider, Stripe. The subscription renews automatically every month until you cancel. If the price changes, we e-mail you at least 30 days before, and you can cancel before the new price applies.'],
      ['Cancelling', 'You can cancel whenever you like in the app under Me → Settings → Subscription. You keep access until the end of the period you have paid for. Apart from the right of withdrawal below, we do not refund months that have started.'],
      ['Right of withdrawal', 'You may withdraw from the contract within 14 days of the day you subscribed. Use the “Withdraw from contract” button in the app under Me → Settings → Subscription, or e-mail us. We then refund the full amount within 14 days of receiving your notice, to the payment method you used. Your access to the course ends when you withdraw.'],
      ['The content', 'The course, texts, pictures and audio belong to us or our licensors. You may use them for your own learning, but not copy, sell or share them.'],
      ['Availability and changes', 'We do our best to keep the service running, but cannot promise it will never be interrupted. We may change and improve the content. If we make bigger changes that affect you, we tell you in advance.'],
      ['Liability', 'We are responsible for the service as required by mandatory consumer law. Beyond that we are not liable for indirect loss.'],
      ['Closing your account', 'You can delete your account at any time in the app. This also ends your subscription. We may close accounts that break these terms.'],
      ['Complaints and disputes', 'Please contact us first and we will try to sort it out. Swedish law applies. As a consumer you can also turn to the Swedish National Board for Consumer Disputes (ARN), arn.se.'],
      ['Changes to these terms', 'If we change these terms, we e-mail you at least 30 days before the changes take effect.'],
    ],
  };
}

export function privacy(lang, c) {
  if (lang === 'sv') {
    return {
      title: 'Integritetspolicy',
      updated: UPDATED,
      sections: [
        ['Personuppgiftsansvarig', `${who.sv(c)}`],
        ['Vilka uppgifter vi sparar', '<ul><li><strong>Konto:</strong> ditt namn, din e-postadress och ditt lösenord (som sparas krypterat, så vi kan inte se det). Loggar du in med Google får vi i stället ditt namn och din e-postadress från Google, och du har inget lösenord hos oss.</li><li><strong>Lärande:</strong> dina framsteg, inställningar och vilket språk du använder appen på.</li><li><strong>Barnprofiler:</strong> om du lägger till ett barn sparas bara förnamnet du anger och barnets framsteg. Du hanterar dem och kan ta bort dem när du vill, och de raderas med ditt konto. Ingenting laddas upp från en barnprofil.</li><li><strong>Abonnemang:</strong> om ditt abonnemang är aktivt, när det förnyas och dina kvitton. Kortuppgifterna hanteras av Stripe, vi ser dem aldrig.</li><li><strong>Kontakt:</strong> det du skriver till oss när du mejlar.</li></ul>Inspelningar av din röst stannar i din enhet och laddas inte upp.'],
        ['Varför och med vilket stöd', '<ul><li>För att ge dig tjänsten och hantera ditt abonnemang (avtal).</li><li>För bokföring av betalningar (rättslig förpliktelse).</li><li>För att hålla tjänsten säker och svara när du kontaktar oss (berättigat intresse).</li></ul>'],
        ['Vilka som hjälper oss', 'Vi använder <strong>Supabase</strong> för konton och databas (servrar inom EU), <strong>Stripe</strong> för betalningar, <strong>Netlify</strong> för att visa webbplatsen och appen, <strong>Resend</strong> för att skicka mejl (konto-, lösenords- och påminnelsemejl), <strong>ImprovMX</strong> för att vidarebefordra mejl till vår adress och <strong>Google</strong> om du väljer att logga in med Google. Stripe, Netlify, Resend, ImprovMX och Google är amerikanska företag. När uppgifter förs över utanför EU sker det med EU:s standardavtalsklausuler eller EU–US Data Privacy Framework.'],
        ['Ingen reklam och ingen spårning', 'Vi visar ingen reklam, använder inga spårningsverktyg och säljer aldrig dina uppgifter. Appen sparar bara det som behövs för att du ska vara inloggad och för dina framsteg, så vi behöver ingen cookie-banner.'],
        ['Hur länge vi sparar uppgifterna', 'Kontouppgifter och framsteg sparas tills du raderar ditt konto. Betalningsunderlag sparas i sju år, som bokföringslagen kräver.'],
        ['Dina rättigheter', 'Du har rätt att få veta vilka uppgifter vi har om dig, att rätta dem, att få dem raderade, att få ut dem och att invända mot behandlingen. Du kan radera ditt konto direkt i appen. Hör av dig till oss om något annat. Du kan också klaga hos Integritetsskyddsmyndigheten (IMY), imy.se.'],
      ],
    };
  }
  return {
    title: 'Privacy policy',
    updated: UPDATED,
    sections: [
      ['Who is responsible', `${who.en(c)}`],
      ['What we keep', '<ul><li><strong>Account:</strong> your name, your e-mail address and your password (stored encrypted, so we cannot see it). If you sign in with Google, Google gives us your name and e-mail address instead, and you have no password with us.</li><li><strong>Learning:</strong> your progress, settings and the language you use the app in.</li><li><strong>Children’s profiles:</strong> if you add a child, only the first name you give and the child’s progress. You manage them and can remove them at any time; they are deleted with your account. Nothing is uploaded from a child’s profile.</li><li><strong>Subscription:</strong> whether your subscription is active, when it renews, and your receipts. Card details are handled by Stripe; we never see them.</li><li><strong>Contact:</strong> what you write when you e-mail us.</li></ul>Recordings of your voice stay on your device and are not uploaded.'],
      ['Why, and on what basis', '<ul><li>To give you the service and manage your subscription (contract).</li><li>To keep accounting records of payments (legal obligation).</li><li>To keep the service secure and to answer you when you contact us (legitimate interest).</li></ul>'],
      ['Who helps us', 'We use <strong>Supabase</strong> for accounts and the database (servers in the EU), <strong>Stripe</strong> for payments, <strong>Netlify</strong> to serve the website and the app, <strong>Resend</strong> to send e-mails (account, password and reminder e-mails), <strong>ImprovMX</strong> to forward e-mail sent to our address, and <strong>Google</strong> if you choose to sign in with Google. Stripe, Netlify, Resend, ImprovMX and Google are US companies. When data is transferred outside the EU, this is covered by the EU’s Standard Contractual Clauses or the EU–US Data Privacy Framework.'],
      ['No ads, no tracking', 'We show no ads, use no tracking tools and never sell your data. The app only stores what is needed to keep you logged in and to save your progress, so there is no cookie banner.'],
      ['How long we keep it', 'Account data and progress are kept until you delete your account. Payment records are kept for seven years, as Swedish bookkeeping law requires.'],
      ['Your rights', 'You have the right to know what data we hold about you, to correct it, to have it deleted, to get a copy of it and to object to how we use it. You can delete your account directly in the app; contact us for anything else. You can also complain to the Swedish Authority for Privacy Protection (IMY), imy.se.'],
    ],
  };
}
