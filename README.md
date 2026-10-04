# Yiga Oluganda 🪶

**[Svenska](#svenska) · [English](#english)**

A free, playful web app that teaches basic **Luganda** to children (about 6–12) growing up in the diaspora, with **Ngaali**, an original crested-crane mascot.
The content comes from the book **"Luganda för beginners" by Cyprine Kamoga**.

---

## Svenska

### Vad är det här?
Yiga Oluganda ("Lär dig luganda") är en webbapp för barn som vill lära sig grundläggande luganda.
- Gränssnittet finns på **svenska** och **engelska**. Man väljer språk när man startar och kan byta i Inställningar.
- Två spår: **Svenska → Luganda** och **Engelska → Luganda**.
- Korta lektioner på en slingrande stig, XP, dagar i rad, hjärtan, märken, en övningsdel som tar tillbaka svåra ord (spaced repetition) och **berättelseläge** där man följer Alex resa till Buganda i bokens 10 kapitel.
- **Inga konton och ingen datainsamling.** Framstegen sparas bara på enheten (localStorage).
- Fungerar **offline** som PWA och kan installeras på mobil, surfplatta och dator.

### Starta appen
Du behöver [Node.js](https://nodejs.org) 20 eller senare.
```bash
npm install
npm run dev        # öppna adressen som visas, t.ex. http://localhost:5173
```
Övriga kommandon:
```bash
npm test           # enhetstester (Vitest)
npm run test:e2e   # end-to-end-tester i webbläsare (Playwright), mobil + dator
npm run build      # bygger en färdig version i mappen dist/
npm run preview    # visar den byggda versionen
npm run content    # kontrollerar innehållsfilerna och skapar AUDIO_TODO.md
```

### Lägga till ord, lektioner och ljud (utan att programmera)
Allt innehåll ligger i mappen **`content/`** som vanliga JSON-filer. Öppna dem i en textredigerare, till exempel VS Code eller direkt på GitHub.

**1. Nytt ord eller uttryck** i `content/vocabulary.json`:
```json
{ "id": "embwa", "lg": "embwa", "en": "dog", "sv": "hund", "category": "animals", "page": 12, "difficulty": 1, "image": "🐕" }
```
- `id`: unikt namn med små bokstäver, siffror och bindestreck. Det används också som namn på ljudfilen.
- `lg` är luganda, `en` engelska och `sv` svenska.
- `category`: greetings, phrases, family, people, numbers, food, body, animals, home, school, verbs, travel, transport, nature, market, culture, time, months eller weather.
- `page`: sidan i boken. `difficulty`: 1 (lätt), 2 eller 3 (svårt).
- `image` (valfritt): en emoji, `count:3` (tre saker att räkna) eller `clock:8` (en klocka som visar 8).
- `variants` (valfritt): andra stavningar som godkänns när barnet skriver.
- `check` (valfritt): en anteckning om vad en modersmålstalare bör kontrollera.

**2. Ny lektion** i `content/units.json`: lägg till ett objekt i en dels `lessons`:
```json
{ "id": "u08-l3", "title": { "en": "Pets", "sv": "Husdjur" }, "words": ["embwa", "ente"] }
```
Appen skapar övningarna själv (bilder, flerval, para ihop, bygga meningar, fylla i, skriva). Du kan också lägga till bokens egna övningar:
- `"fillIns"`: meningar med `___` där ordet saknas, `answer` (ett ord-id) och `options` (ord-id).
- `"questions"`: flervalsfrågor. **Det första alternativet är det rätta.** Appen blandar dem.

**3. Berättelser** finns i `content/story.json`. I texten blir `{ordets-id}` ett lugandaord som barnet kan trycka på.

**4. Ljud:** spela in ordet (mp3, en till två sekunder, en modersmålstalare) och spara det som
`public/audio/<id>.mp3`, till exempel `public/audio/embwa.mp3`. Högtalarknappen och lyssningsövningarna dyker upp automatiskt.
Listan över ord som saknar ljud finns i **`AUDIO_TODO.md`** och uppdateras av `npm run content`.
Appen använder **aldrig** datorröst (text-till-tal) för luganda, eftersom den uttalar fel.

Kör `npm run content` efter ändringar. Kommandot säger exakt vad som är fel om något id saknas eller ett fält är tomt.

**Nytt gränssnittsspråk:** kopiera `src/i18n/en.json` till till exempel `fr.json`, översätt texterna och lägg till språket i `src/i18n/index.ts`.

### Publicera gratis
Appen är helt statisk (ingen server), så den kan ligga på vilken gratis webbhotell som helst.

**Netlify**
1. Lägg koden på GitHub.
2. På [netlify.com](https://netlify.com): *Add new site → Import an existing project* och välj repot.
3. Build command: `npm run build`. Publish directory: `dist`. Klicka på *Deploy*.

**Vercel**
1. På [vercel.com](https://vercel.com): *Add New → Project* och välj repot.
2. Framework: *Vite* (väljs automatiskt). Build: `npm run build`. Output: `dist`. Klicka på *Deploy*.

**GitHub Pages**: kör `npm run build` och publicera mappen `dist/`. Appen använder relativa sökvägar och hash-adresser (`#/`), så den fungerar även i en undermapp.

### Integritet
Inga konton, ingen reklam, inga cookies för spårning och ingen analys. Typsnitten ligger i appen, så inga anrop görs till Google. Allt sparas i webbläsaren på enheten och kan raderas på föräldrasidan (Inställningar → För föräldrar).

### Dokument i projektet
- `RESEARCH.md`: forskningen bakom appen (luganda, inlärning, barn-UX, GDPR).
- `PLAN.md`: planen och designbesluten.
- `content/CONTENT_REPORT.md`: vad som kommer från boken, vad som lagts till och **vad som behöver kontrolleras av en modersmålstalare**.
- `AUDIO_TODO.md`: ord som behöver ljudinspelning.

---

## English

### What is this?
Yiga Oluganda ("Learn Luganda") is a web app for children learning basic Luganda.
- The interface is in **Swedish** and **English**, chosen at the start and changeable in Settings.
- Two tracks: **Swedish → Luganda** and **English → Luganda**.
- It has short lessons on a winding path, XP, a daily streak, hearts, badges, a Practice mode that brings back weak words (spaced repetition), and **Story mode**, which follows Alex's trip to Buganda across the book's 10 chapters.
- **No accounts and no data collection.** Progress stays on the device (localStorage).
- It works **offline** as an installable PWA on phones, tablets and desktop.

### Run the app
You need [Node.js](https://nodejs.org) 20 or newer.
```bash
npm install
npm run dev        # open the printed address, e.g. http://localhost:5173
```
Other commands:
```bash
npm test           # unit tests (Vitest)
npm run test:e2e   # browser end-to-end tests (Playwright), mobile + desktop
npm run build      # production build into dist/
npm run preview    # serve the production build
npm run content    # check the content files and regenerate AUDIO_TODO.md
```

### Adding words, lessons and audio (no programming needed)
All content lives in **`content/`** as plain JSON files that you can edit in any text editor, or directly on GitHub.

**1. A new word or phrase** goes in `content/vocabulary.json`:
```json
{ "id": "embwa", "lg": "embwa", "en": "dog", "sv": "hund", "category": "animals", "page": 12, "difficulty": 1, "image": "🐕" }
```
- `id`: a unique name made of lower-case letters, digits and dashes. It is also the audio file name.
- `category`: greetings, phrases, family, people, numbers, food, body, animals, home, school, verbs, travel, transport, nature, market, culture, time, months or weather.
- `page`: the book page. `difficulty`: 1 (easy), 2 or 3 (hard).
- `image` (optional): an emoji, `count:3` (three things to count) or `clock:8` (a clock showing 8).
- `variants` (optional): other spellings accepted when typing.
- `check` (optional): a note on what a native speaker should verify.

**2. A new lesson** goes in `content/units.json`. Add an object to a unit's `lessons`:
```json
{ "id": "u08-l3", "title": { "en": "Pets", "sv": "Husdjur" }, "words": ["embwa", "ente"] }
```
The app builds the exercises automatically: pictures, multiple choice, match pairs, sentence tiles, fill-in and typing. You can also add the book's own exercises:
- `"fillIns"`: sentences with `___`, an `answer` (word id) and `options` (word ids).
- `"questions"`: multiple-choice questions. **Put the correct option first.** The app shuffles them.

**3. Stories** live in `content/story.json`. In the narration, `{word-id}` becomes a tappable Luganda word.

**4. Audio:** record the word (mp3, 1–2 seconds, by a native speaker) and save it as `public/audio/<id>.mp3`, e.g. `public/audio/embwa.mp3`. The speaker button and listening exercises appear automatically.
**`AUDIO_TODO.md`** lists every word still missing a recording. `npm run content` regenerates it.
The app **never** uses text-to-speech for Luganda, because it mispronounces the language.

Run `npm run content` after editing. If something is wrong (a missing id, an empty field), it tells you exactly what.

**New interface language:** copy `src/i18n/en.json` to e.g. `fr.json`, translate the values and register it in `src/i18n/index.ts`.

### Deploy for free
The app is fully static (no server), so any free static host works.

**Netlify**
1. Push the code to GitHub.
2. On [netlify.com](https://netlify.com), choose *Add new site → Import an existing project* and pick the repo.
3. Build command: `npm run build`. Publish directory: `dist`. Click *Deploy*.

**Vercel**
1. On [vercel.com](https://vercel.com), choose *Add New → Project* and pick the repo.
2. Framework: *Vite* (auto-detected). Build: `npm run build`. Output: `dist`. Click *Deploy*.

**GitHub Pages**: run `npm run build` and publish `dist/`. The app uses relative paths and hash URLs (`#/`), so it also works from a sub-folder.

### Privacy
There are no accounts, no ads, no tracking cookies and no analytics. Fonts are bundled, so no requests go to Google. Everything is stored in the browser on the device and can be erased from the parent page (Settings → For parents).

### Project documents
- `RESEARCH.md`: research behind the app (Luganda, learning design, child UX, GDPR).
- `PLAN.md`: the plan and design decisions.
- `content/CONTENT_REPORT.md`: what comes from the book, what was added, and **what needs a native-speaker check**.
- `AUDIO_TODO.md`: words that still need a recording.

### Credits
Content: *Luganda för beginners* © 2026 Cyprine Kamoga (text and idea: Cyprine Kamoga and Veronica Birungi; language and culture advice: Prof. David Lewis Kapeere). App design, mascot and code are original to this project.
