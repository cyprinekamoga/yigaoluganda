// Terms of service and privacy policy, in English and Swedish.
// These are a careful starting point, not legal advice: have them checked before launch.
// `c` is the company (see company.mjs) with any empty field shown as a [placeholder].

const UPDATED = '2026-11-16';

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
        ['Bjud in en vän', 'Har du ett aktivt abonnemang kan du dela din personliga inbjudningskod. Den som inte har betalat för Yiga Oluganda tidigare får sin första månad gratis med koden. När din vän har betalat för en månad efter den gratis månaden blir din nästa månad gratis, en månad per vän, och de dras en i taget. Gratismånader kan inte bytas mot pengar. Vi kan avsluta eller ändra erbjudandet framåt i tiden, och vi kan ta bort en kod som missbrukas.'],
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
      ['Inviting a friend', 'With an active subscription you can share your personal invite code. Someone who has not paid for Yiga Oluganda before gets their first month free with it. When your friend has paid for a month after the free one, your next month is free: one month per friend, used one at a time. Free months cannot be exchanged for money. We may end or change the offer for the future, and we may remove a code that is misused.'],
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
        ['Vilka uppgifter vi sparar', '<ul><li><strong>Konto:</strong> ditt namn, din e-postadress och ditt lösenord (som sparas krypterat, så vi kan inte se det). Loggar du in med Google får vi i stället ditt namn och din e-postadress från Google, och du har inget lösenord hos oss.</li><li><strong>Lärande:</strong> dina framsteg, inställningar och vilket språk du använder appen på. Vi använder dem för att skicka några tips via mejl din första vecka, och ett om ditt abonnemang tar slut; du kan stänga av dem i inställningarna eller med länken i varje mejl.</li><li><strong>Barnprofiler:</strong> om du lägger till ett barn sparas bara förnamnet du anger och barnets framsteg. Du hanterar dem och kan ta bort dem när du vill, och de raderas med ditt konto. Från en barnprofil går det inte att skicka inspelningar eller rapporter.</li><li><strong>Diplom:</strong> när du hämtar ett diplom sparas namnet du skriver på det, vilken del av kursen, antalet fraser och datumet. Den som har diplomets kod kan se just detta på yigaoluganda.com, inget annat om dig. Diplomen raderas med ditt konto.</li><li><strong>Abonnemang:</strong> om ditt abonnemang är aktivt, när det förnyas och dina kvitton. Kortuppgifterna hanteras av Stripe, vi ser dem aldrig.</li><li><strong>Kontakt:</strong> det du skriver till oss när du mejlar.</li><li><strong>Inspelningar du skickar för feedback:</strong> inspelningar av din röst stannar i din enhet, om du inte väljer ”Fråga en modersmålstalare”. Då sparas just den inspelningen privat; bara de som granskar (vi och de modersmålstalare vi väljer) kan lyssna på den, och den raderas efter 30 dagar. Deras omdöme och tips sparas med ditt konto.</li><li><strong>Fel du rapporterar:</strong> vad du säger är fel, var, och din kommentar, med ditt konto.</li></ul>'],
        ['Varför och med vilket stöd', '<ul><li>För att ge dig tjänsten och hantera ditt abonnemang (avtal).</li><li>För bokföring av betalningar (rättslig förpliktelse).</li><li>För att hålla tjänsten säker och svara när du kontaktar oss (berättigat intresse).</li></ul>'],
        ['Vilka som hjälper oss', 'Vi använder <strong>Supabase</strong> för konton och databas (servrar inom EU), <strong>Stripe</strong> för betalningar, <strong>Netlify</strong> för att visa webbplatsen och appen, <strong>Resend</strong> för att skicka mejl (konto-, lösenords- och påminnelsemejl samt tips), <strong>ImprovMX</strong> för att vidarebefordra mejl till vår adress och <strong>Google</strong> om du väljer att logga in med Google. Stripe, Netlify, Resend, ImprovMX och Google är amerikanska företag. När uppgifter förs över utanför EU sker det med EU:s standardavtalsklausuler eller EU–US Data Privacy Framework.'],
        ['Ingen reklam och ingen spårning', 'Vi visar ingen reklam, använder inga spårningsverktyg och säljer aldrig dina uppgifter. Appen sparar bara det som behövs för att du ska vara inloggad och för dina framsteg, så vi behöver ingen cookie-banner.'],
        ['Hur länge vi sparar uppgifterna', 'Kontouppgifter och framsteg sparas tills du raderar ditt konto. Betalningsunderlag sparas i sju år, som bokföringslagen kräver.'],
        ['Dina rättigheter', 'Du har rätt att få veta vilka uppgifter vi har om dig, att rätta dem, att få dem raderade, att få ut dem och att invända mot behandlingen. I appens inställningar kan du ladda ner dina uppgifter, byta e-postadress och radera ditt konto. Hör av dig till oss om något annat. Du kan också klaga hos Integritetsskyddsmyndigheten (IMY), imy.se.'],
      ],
    };
  }
  return {
    title: 'Privacy policy',
    updated: UPDATED,
    sections: [
      ['Who is responsible', `${who.en(c)}`],
      ['What we keep', '<ul><li><strong>Account:</strong> your name, your e-mail address and your password (stored encrypted, so we cannot see it). If you sign in with Google, Google gives us your name and e-mail address instead, and you have no password with us.</li><li><strong>Learning:</strong> your progress, settings and the language you use the app in. We use them to send you a few tips by e-mail in your first week, and one if your subscription ends; you can turn these off in Settings or with the link in each e-mail.</li><li><strong>Children’s profiles:</strong> if you add a child, only the first name you give and the child’s progress. You manage them and can remove them at any time; they are deleted with your account. A child’s profile cannot send recordings or reports.</li><li><strong>Certificates:</strong> when you get a certificate, the name you put on it, the part of the course, the number of phrases and the date. Anyone who has the certificate’s code can see exactly this on yigaoluganda.com, and nothing else about you. Certificates are deleted with your account.</li><li><strong>Subscription:</strong> whether your subscription is active, when it renews, and your receipts. Card details are handled by Stripe; we never see them.</li><li><strong>Contact:</strong> what you write when you e-mail us.</li><li><strong>Recordings you send for feedback:</strong> recordings of your voice stay on your device, unless you choose “Ask a native speaker”. Then that one recording is stored privately; only the people who review (us and the native speakers we choose) can listen to it, and it is deleted after 30 days. Their rating and tip are kept with your account.</li><li><strong>Mistakes you report:</strong> what you say is wrong, where, and your note, with your account.</li></ul>'],
      ['Why, and on what basis', '<ul><li>To give you the service and manage your subscription (contract).</li><li>To keep accounting records of payments (legal obligation).</li><li>To keep the service secure and to answer you when you contact us (legitimate interest).</li></ul>'],
      ['Who helps us', 'We use <strong>Supabase</strong> for accounts and the database (servers in the EU), <strong>Stripe</strong> for payments, <strong>Netlify</strong> to serve the website and the app, <strong>Resend</strong> to send e-mails (account, password and reminder e-mails, and tips), <strong>ImprovMX</strong> to forward e-mail sent to our address, and <strong>Google</strong> if you choose to sign in with Google. Stripe, Netlify, Resend, ImprovMX and Google are US companies. When data is transferred outside the EU, this is covered by the EU’s Standard Contractual Clauses or the EU–US Data Privacy Framework.'],
      ['No ads, no tracking', 'We show no ads, use no tracking tools and never sell your data. The app only stores what is needed to keep you logged in and to save your progress, so there is no cookie banner.'],
      ['How long we keep it', 'Account data and progress are kept until you delete your account. Payment records are kept for seven years, as Swedish bookkeeping law requires.'],
      ['Your rights', 'You have the right to know what data we hold about you, to correct it, to have it deleted, to get a copy of it and to object to how we use it. In the app’s Settings you can download your data, change your e-mail address and delete your account; contact us for anything else. You can also complain to the Swedish Authority for Privacy Protection (IMY), imy.se.'],
    ],
  };
}
