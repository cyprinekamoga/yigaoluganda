// Landing page text in English and Swedish. `{price}` becomes the visitor's local monthly price
// (filled in by the edge function); `{chapters}` and the other counts come from the course.

export const CONTENT = {
  en: {
    lang: 'en',
    locale: 'en_GB',
    path: '/',
    other: { label: 'Svenska', path: '/sv/', lang: 'sv' },
    meta: {
      title: 'Yiga Oluganda – Learn Luganda online',
      description:
        'Learn Luganda with short daily lessons: greetings, respect for elders, everyday conversations and the culture behind them. In English or Swedish.',
    },
    skip: 'Skip to content',
    nav: { how: 'How it works', course: 'Course', price: 'Price', faq: 'FAQ', login: 'Log in' },
    hero: {
      eyebrow: 'Luganda for beginners',
      title: 'Learn Luganda the way it’s spoken at home',
      lead: 'Short daily lessons with Ngaali the crested crane. Greet your elders properly, hold everyday conversations and understand the culture behind the words. In English or Swedish.',
      cta: 'Get started',
      login: 'I already have an account',
      price: '{price} · cancel anytime',
      shot: 'A lesson in Yiga Oluganda: a new phrase, “weebale”, meaning thank you',
    },
    audience: {
      title: 'Made for',
      items: [
        ['Family and roots', 'Talk with jjajja, follow the conversation at family gatherings and pass the language on to your children.'],
        ['Partners and in-laws', 'Greet your partner’s family with respect, and surprise them in Luganda.'],
        ['Travellers and volunteers', 'Get around Kampala, order food and make friends on your trip.'],
      ],
    },
    how: {
      title: 'How a lesson works',
      lead: 'About ten short steps, a few minutes a day. Anything you get wrong comes back at the end, so you learn it properly.',
      steps: [
        ['intro', 'Meet a new phrase', 'See what it means, word for word, with a note on when to use it and a fun fact about Uganda.'],
        ['choice', 'Hear the difference', 'Pick the right spelling. In Luganda a long or short sound changes the meaning, and the result shows you why.'],
        ['match', 'Join each word to its meaning', 'Joined pairs are threaded onto a list, like beads on a string.'],
        ['build', 'Build it in Luganda', 'Write whole sentences on a line, word by word.'],
        ['dialogue', 'Have a conversation', 'Roleplay real situations, from visiting jjajja to sitting down to eat. Ngaali explains why a reply doesn’t fit.'],
        ['complete', 'See what you can say', 'Every lesson ends with the phrases you just learned, not a score.'],
      ],
    },
    different: {
      title: 'What makes Yiga Oluganda different',
      items: [
        ['c04', 'Culture in every lesson', 'Why you kneel to greet an elder, when to say ssebo and nnyabo, and what to say at the table.'],
        ['c01', 'Long and short sounds', 'Exercises train your ear for weebale and webale, so people understand you.'],
        ['c03', 'Never a robot voice', 'Computer voices get Luganda wrong, so we don’t use them. Native-speaker recordings are being added chapter by chapter.'],
        ['c07', 'English or Swedish', 'The whole app works in English or Swedish. Switch whenever you like.'],
        ['c08', 'A phrasebook that works offline', 'Search every phrase, even without a connection. Type ng for ŋ.'],
        ['game', 'Our own game, from Buganda', 'Water pots instead of hearts, cowries instead of gems, a drumbeat for the days you practise and beads for your progress.'],
      ],
    },
    course: {
      title: 'Part 1: Absolute Foundations',
      lead: '{chapters} chapters, {lessons} lessons, {phrases} phrases and {conversations} conversations. Start where you like: the first three chapters are open, and each chapter you finish opens another.',
      chapter: 'Chapter {n}',
      next: 'Part 2 is on the way: family, food, numbers and getting around.',
    },
    facts: { title: 'Did you know?', ids: ['crane-flag', 'cowries', 'mujaguzo'] },
    price: {
      title: 'One plan. Everything included.',
      per: '{price}',
      items: [
        'Every chapter, and new parts as they come',
        'Practice Lab, conversations and the phrasebook',
        'On your phone, tablet and computer',
        'Your progress saved to your account',
        'Cancel anytime',
      ],
      cta: 'Get started',
      web: 'Why pay on the website? It’s cheaper than paying through an app store, and it keeps Yiga Oluganda affordable.',
      small: 'Prices are in your local currency and include VAT where it applies. Your subscription renews every month until you cancel.',
    },
    story: {
      title: 'Why Yiga Oluganda?',
      body: [
        '<em>Yiga Oluganda</em> means “learn Luganda”. Many people with roots in Buganda grow up hearing the language at home without learning to speak it, and there are few good ways to learn it from English or Swedish.',
        'Yiga Oluganda grew out of a Luganda course book for Swedish speakers. It is for everyone who wants to greet their family, understand them and be understood.',
      ],
    },
    faq: {
      title: 'Questions and answers',
      items: [
        ['Do I need to know any Luganda?', 'No. Part 1 starts from the very beginning: sounds, greetings and polite words.'],
        ['How much does it cost?', 'One plan: {price}, billed every month in your local currency. VAT is included where it applies.'],
        ['How do I cancel?', 'Whenever you like, in the app under Me → Settings → Subscription. You keep access until the end of the month you have paid for.'],
        ['Can I change my mind after paying?', 'Yes. Within 14 days of subscribing you can withdraw from the contract in the app under Me → Settings → Subscription, and we refund your payment in full.'],
        ['Which devices can I use?', 'Any up-to-date web browser on a phone, tablet or computer. Log in with the same account everywhere and your progress follows you. Apps for iPhone and Android are on the way.'],
        ['Why pay on the website and not in an app store?', 'App stores take a large share of every payment. Paying on the website is cheaper and keeps Yiga Oluganda affordable for everyone.'],
        ['Is there audio?', 'Native-speaker recordings are being added chapter by chapter, and they appear in your lessons automatically. We never use a computer voice for Luganda, because it gets the sounds wrong.'],
        ['Can I use it in Swedish?', 'Yes. Everything is in English or Swedish, and you can switch at any time.'],
        ['What happens to my data?', 'Your account and progress are stored in the EU. There are no ads and no tracking, and you can delete your account at any time.'],
      ],
    },
    final: { title: 'Gyebale ko! Ready to start?', cta: 'Get started' },
    footer: { tagline: 'Learn Luganda with Ngaali the crested crane.', terms: 'Terms', privacy: 'Privacy', contact: 'Contact', orgNo: 'Org. no.' },
    legal: { terms: '/terms/', privacy: '/privacy/', back: '← Back to Yiga Oluganda', updated: 'Last updated' },
  },

  sv: {
    lang: 'sv',
    locale: 'sv_SE',
    path: '/sv/',
    other: { label: 'English', path: '/', lang: 'en' },
    meta: {
      title: 'Yiga Oluganda – Lär dig luganda online',
      description:
        'Lär dig luganda med korta lektioner varje dag: hälsningar, respekt för äldre, vardagssamtal och kulturen bakom orden. På svenska eller engelska.',
    },
    skip: 'Hoppa till innehållet',
    nav: { how: 'Så funkar det', course: 'Kursen', price: 'Pris', faq: 'Frågor', login: 'Logga in' },
    hero: {
      eyebrow: 'Luganda för nybörjare',
      title: 'Lär dig luganda som det talas hemma',
      lead: 'Korta lektioner varje dag med kronstranen Ngaali. Hälsa på äldre på rätt sätt, klara vardagssamtal och förstå kulturen bakom orden. På svenska eller engelska.',
      cta: 'Kom igång',
      login: 'Jag har redan ett konto',
      price: '{price} · avsluta när du vill',
      shot: 'En lektion i Yiga Oluganda: en ny fras, ”weebale”, som betyder tack',
    },
    audience: {
      title: 'För dig som',
      items: [
        ['Har rötter i Uganda', 'Prata med jjajja, häng med i samtalen när familjen träffas och för språket vidare till dina barn.'],
        ['Har en partner från Uganda', 'Hälsa på din partners familj med respekt, och överraska dem på luganda.'],
        ['Ska resa eller volontärarbeta', 'Ta dig runt i Kampala, beställ mat och få vänner på resan.'],
      ],
    },
    how: {
      title: 'Så går en lektion till',
      lead: 'Ungefär tio korta steg, några minuter om dagen. Det du svarar fel på kommer tillbaka i slutet, så att du lär dig det ordentligt.',
      steps: [
        ['intro', 'Möt en ny fras', 'Se vad den betyder, ord för ord, med en kommentar om när den används och en rolig fakta om Uganda.'],
        ['choice', 'Hör skillnaden', 'Välj rätt stavning. På luganda ändrar ett långt eller kort ljud betydelsen, och svaret visar varför.'],
        ['match', 'Para ihop ord och betydelse', 'Ihopparade ord träs upp på en lista, som pärlor på ett band.'],
        ['build', 'Bygg på luganda', 'Skriv hela meningar på en rad, ord för ord.'],
        ['dialogue', 'Föra ett samtal', 'Rollspela verkliga situationer, från besöket hos jjajja till middagsbordet. Ngaali förklarar varför ett svar inte passar.'],
        ['complete', 'Se vad du kan säga', 'Varje lektion slutar med fraserna du just har lärt dig, inte med poäng.'],
      ],
    },
    different: {
      title: 'Det som gör Yiga Oluganda annorlunda',
      items: [
        ['c04', 'Kultur i varje lektion', 'Varför man knäböjer när man hälsar på en äldre, när man säger ssebo och nnyabo, och vad man säger vid bordet.'],
        ['c01', 'Långa och korta ljud', 'Övningar tränar örat på skillnaden mellan weebale och webale, så att folk förstår dig.'],
        ['c03', 'Aldrig en datorröst', 'Datorröster uttalar luganda fel, så vi använder dem inte. Inspelningar med modersmålstalare läggs till kapitel för kapitel.'],
        ['c07', 'Svenska eller engelska', 'Hela appen finns på svenska och engelska. Byt när du vill.'],
        ['c08', 'En parlör som fungerar offline', 'Sök bland alla fraser, även utan uppkoppling. Skriv ng för ŋ.'],
        ['game', 'Ett eget spel, från Buganda', 'Vattenkrukor i stället för hjärtan, kaurisnäckor i stället för ädelstenar, trumslag för dagarna du övar och pärlor som visar hur långt du har kommit.'],
      ],
    },
    course: {
      title: 'Del 1: Grunderna',
      lead: '{chapters} kapitel, {lessons} lektioner, {phrases} fraser och {conversations} samtal. Börja där du vill: de tre första kapitlen är öppna, och varje kapitel du klarar öppnar ett nytt.',
      chapter: 'Kapitel {n}',
      next: 'Del 2 är på väg: familj, mat, siffror och att ta sig runt.',
    },
    facts: { title: 'Visste du?', ids: ['crane-flag', 'cowries', 'mujaguzo'] },
    price: {
      title: 'Ett abonnemang. Allt ingår.',
      per: '{price}',
      items: [
        'Alla kapitel, och nya delar när de kommer',
        'Övningslabbet, samtalen och parlören',
        'I mobilen, på surfplattan och på datorn',
        'Dina framsteg sparas på ditt konto',
        'Avsluta när du vill',
      ],
      cta: 'Kom igång',
      web: 'Varför betala på webben? Det är billigare än att betala via en appbutik, och det håller Yiga Oluganda prisvärt.',
      small: 'Priserna visas i din lokala valuta och inkluderar moms där det gäller. Abonnemanget förnyas varje månad tills du avslutar det.',
    },
    story: {
      title: 'Varför Yiga Oluganda?',
      body: [
        '<em>Yiga Oluganda</em> betyder ”lär dig luganda”. Många med rötter i Buganda växer upp med språket omkring sig hemma utan att lära sig tala det, och det finns få bra sätt att lära sig det från svenska eller engelska.',
        'Yiga Oluganda växte fram ur en kursbok i luganda för svensktalande. Den är för alla som vill hälsa på sin familj, förstå dem och bli förstådda.',
      ],
    },
    faq: {
      title: 'Frågor och svar',
      items: [
        ['Måste jag kunna någon luganda?', 'Nej. Del 1 börjar från början: ljud, hälsningar och artighetsord.'],
        ['Vad kostar det?', 'Ett abonnemang: {price}, som dras varje månad i din lokala valuta. Moms ingår där det gäller.'],
        ['Hur avslutar jag?', 'När du vill, i appen under Jag → Inställningar → Abonnemang. Du har kvar tillgången till slutet av månaden du har betalat för.'],
        ['Kan jag ångra mig efter att ha betalat?', 'Ja. Inom 14 dagar efter att du har tecknat abonnemanget kan du frånträda avtalet i appen under Jag → Inställningar → Abonnemang, och då får du hela beloppet tillbaka.'],
        ['Vilka enheter kan jag använda?', 'Alla uppdaterade webbläsare i mobil, surfplatta eller dator. Logga in med samma konto överallt så följer dina framsteg med. Appar för iPhone och Android är på väg.'],
        ['Varför betala på webben och inte i en appbutik?', 'Appbutikerna tar en stor del av varje betalning. Att betala på webben är billigare och håller Yiga Oluganda prisvärt för alla.'],
        ['Finns det ljud?', 'Inspelningar med modersmålstalare läggs till kapitel för kapitel och dyker upp i lektionerna automatiskt. Vi använder aldrig datorröst för luganda, eftersom den uttalar ljuden fel.'],
        ['Kan jag använda appen på svenska?', 'Ja. Allt finns på svenska och engelska, och du kan byta när du vill.'],
        ['Vad händer med mina uppgifter?', 'Ditt konto och dina framsteg sparas inom EU. Ingen reklam och ingen spårning, och du kan radera ditt konto när du vill.'],
      ],
    },
    final: { title: 'Gyebale ko! Redo att börja?', cta: 'Kom igång' },
    footer: { tagline: 'Lär dig luganda med kronstranen Ngaali.', terms: 'Villkor', privacy: 'Integritet', contact: 'Kontakt', orgNo: 'Org.nr' },
    legal: { terms: '/sv/villkor/', privacy: '/sv/integritet/', back: '← Tillbaka till Yiga Oluganda', updated: 'Senast uppdaterad' },
  },
};
