# Content report

Source: **"Luganda för beginners" by Cyprine Kamoga** (48-page PDF, first edition 2026, language and culture advice by Prof. David Lewis Kapeere).
Page numbers in `content/*.json` are **PDF page numbers** (1 = cover). The book's own printed page numbers differ (e.g. PDF page 7 is printed "9", PDF page 45 is printed "25").

The book is written mainly for **Swedish** readers: almost all translations in it are Swedish → Luganda. The farm-animal page (p24) is the only one that also gives English.

---

## 1. What was taken from the book

| PDF pages | Book section | Used in the app as |
|---|---|---|
| 5–6 | Kapitel 1 *Okwetegekera olugendo* (packing), word list | Unit 1, lessons 1–3, story chapter 1 |
| 7 | Worksheet *Presentera dig själv / Okweyanjula* (Nakato) | Unit 1, lesson 5 (erinnya, emyaka, nva, njogera, nsoma, njagala, ssaagala, gyebale ko) |
| 8 | Worksheet: match words to pictures (suitcase, passport, ticket, camera, map, towel, train) | Unit 1, lesson 4 + two "which word is right?" questions |
| 9–10 | Kapitel *Okubuuka okugenda e Uganda* (flight), word list | Unit 2, lessons 1–2, story chapter 2 |
| 11 | Dialogue *Tukusanyukidde, Alex!* + question/answer pairs | Unit 2, lessons 3–5, story chapter 2 dialogue, five "they ask / Alex answers" questions |
| 12–14 | *Oluguudo lw'e Kampala*, word list + exercises | Unit 3, story chapter 3, 3 fill-ins + 4 multiple-choice from p14 |
| 15 | Worksheet *Namba* (numbers 0–10) | Unit 4 (counting pictures, as in the book) |
| 16–18 | *Ewa Jjaja*, word list + exercises | Unit 5, story chapter 4, 5 fill-ins + 4 questions from p18 |
| 19 | Alphabet *Ennyukuta z'Oluganda* | Not an exercise (needs audio). Used in RESEARCH.md and in answer checking (ŋ / ny) |
| 20–22 | *Emmere mu Lusuku*, word list + exercises | Unit 6, story chapter 5, 5 fill-ins + 4 questions from p22 |
| 23 | *Essaawa*, the clock | Unit 7, with clock pictures drawn by the app, plus a note on Luganda time (hour 1 = 7 o'clock) |
| 24 | *Öva med en förälder*, farm animals | Unit 8 |
| 25–27 | *Olubiri lw'e Mmengo*, word list + exercises | Unit 9, story chapter 6, 5 fill-ins + 4 questions from p27 |
| 28 | *Emyezi gy'omwaka* (months) + 6 questions | Unit 10, all 6 questions |
| 29–31 | *Mu Katale k'e Nakasero*, word list + exercises | Unit 11, story chapter 7 dialogue, 5 fill-ins + 3 questions from p31 |
| 32 | *Embeera y'obudde* (weather) | Unit 12 (meanings read from the pictures) |
| 33–35 | *Okulambula mu Murchison Falls*, word list + exercises | Unit 13, story chapter 8, 5 fill-ins + 3 questions from p35 |
| 36 | *Vardagliga reaktioner* (everyday phrases) | Unit 14 |
| 37–38, 40 | *Embaga y'Obuwangwa* (Kwanjula), word list + exercises | Unit 15, story chapter 9, 5 fill-ins + 3 questions from p40 |
| 39 | *Parts of the body* | Unit 16 |
| 41–43 | *Engero z'Ekiro n'Okugenda*, word list + exercises | Unit 17, story chapter 10, 5 fill-ins + 3 questions from p43 |
| 44 | *Emmere ey'omu Buganda* (food) | Unit 18, lesson 1 |
| 45–47 | *Bugandas klaner* (clans and totems) | Unit 18, lessons 2–3 (10 of the 46 clans, chosen for pictures children recognise) |

**Totals:** 235 vocabulary items (words and phrases), 18 units, 45 lessons, 10 story chapters. 38 fill-in sentences and 41 multiple-choice questions in the lessons come straight from the book's worksheets (translated to English).

### Not used (on purpose)
- **p4 Table of contents**: it lists chapters about emotions ("What Are Emotions?", "Joy: Meaning & Signs" …) and seems to be left over from another Canva template. **The author should replace it.**
- p19 "write a word for each letter" and p15/p23/p32/p39 "draw/write" tasks need pen and paper. They were turned into tap exercises where possible.
- Distractor words that appear only as wrong options in the book (e.g. *bbaasi, entebe, kasasiro, ekkalaamu, olupapula, ekisangula, epuli, eriinvu, muccungwa, wotameroni, kaveera, essawa, ekiwojjolo, ekyennyanja, ekkatazi, engo, enbwa, omusota, ekikere, ebyai, amaziga*) were **not** added as vocabulary, because the book doesn't translate them. Some still appear as wrong options inside the book's own questions.
- The story's long Swedish narration was **shortened and paraphrased** for children aged 6–12 (it still follows the book's plot, characters and Luganda words).

---

## 2. What I added myself

1. **All English translations**, except p24 animals. The book gives Swedish only. These are my translations of the book's Swedish, not of the Luganda.
2. **English versions** of every book exercise and story scene.
3. **Short notes** on some words (e.g. *ennyonyi* is also "bird", *ekifo* also "place", *omwezi* also "month", plurals *ebimuli* and *amayinja*). Marked below.
4. **Culture notes** on units 5, 7 and 18 (kneeling/empisa, Luganda time, clans/totems), based on the book's own content.
5. **Lesson titles** in English/Swedish and the split of each chapter into lessons.
6. **Story questions marked `"added": true`** in `story.json` (chapters 1, 2 and one in chapter 3). The book has no comprehension questions for those chapters.
7. **Speaker labels** in the story: *Ssenga Namubiru* and *Kojja Musisi*, following the dialogue on p11.
8. **Emoji pictures** for each word (the `image` field), counting pictures for numbers and drawn clocks for times. No artwork was copied from the book.
9. The unit-level Luganda titles come from the book's own headings. Units 8, 14 and 16 have **no** Luganda title, because the book doesn't give one and I didn't want to invent one.

---

## 3. NEEDS NATIVE SPEAKER CHECK

Every item below is shown in the app, but should be confirmed by a fluent Luganda speaker. In `vocabulary.json` each one has a `"check"` field explaining the question. The app treats the listed variants as accepted spellings in typing exercises.

### 3a. Spelling differs inside the book (the app had to choose one)
| App uses | Book also writes | Pages |
|---|---|---|
| ssente | sente | 6, 30 vs 31, 36 |
| weebale | webale | 11 vs 29, 36, 41 |
| emmotoka | emotoka | 13, 17 vs 14, 18, 22 |
| akasozi | akasoozi | 13 vs 14 |
| ebitaala | ebitala | 13 vs 14 |
| ekkubo | ekubo | 13 vs 14 |
| ettaka | etaka | 13 vs 22 |
| endagala | endagla | 21 vs 22 |
| sseffuliya | sefuliiya | 21 vs 22 |
| omukka | omuka | 21 vs 22 |
| ebinyeebwa | ebinyebwa | 21 vs 22, 44 |
| enanansi | ennanansi | 30 vs 31 |
| goonya | gonya (dictionaries: ggoonya) | 34 vs 35 |
| emmunyeenye | emunyenye | 42 vs 43 |
| galubindi | egalubindi | 6 vs 5 |
| ensawo y'okumugongo | ensawo y'omumugongo, akasawo k'omugongo | 6, 5, 8 |
| ekimuli / ebimuli | ebimuuli | 18 vs 17 |
| evviivi | EVIVI (patched label) | 39 |

### 3b. Spelling the book uses once, but which may differ from common usage
- **jjaja**: the book always writes *Jjaja*, while dictionaries usually write *jjajja*.
- **emeeza** (table): often written *emmeeza*.
- **mweerabe** (goodbye to many): often written *mweraba*.
- **kendezaako ko**: often written *kendeezaako ko*.
- **yee, neyanziza nnyo** (p11, patched box): check the spelling.
- **ekitambala** (sash): often *ekitambaala*.

### 3c. Meaning unclear or taken from a picture
- **olukooba**: the book says "ett fäste". The app teaches "seatbelt" based on the story ("Spänn fästet").
- **olutimbe**: "screen" in the book, but it may mainly mean "curtain".
- **olujja**: "gårdsplan" (yard) on p18 but "trädgården" (garden) on p21.
- **oluggi** vs **omulyango**: both "door" (p17 vs p18). Which should beginners learn?
- **ttawulo** (towel), **eggaali y'omukka** (train), **ekisero** (basket): meanings read from pictures.
- **obudde bwa mpewo / kidede / muzira**, **enkuba eya kibuyaga**: weather meanings read from pictures (wind, clouds, snow, thunderstorm).
- **bendera** (flag): meaning inferred from the clue on p27.
- **kiwooma**: used in the book after the first bite, with no translation. The app says "It's delicious!".
- **bambi**: book says "snälla" (please). Is that how children should use it?
- **gyebale ko**: appears only as a speech bubble (p7). The app explains it as "hello / well done".
- **amazina / okuzina / kizino / omuzina** (dance): p38 and p40 disagree.
- **ensawo / essanduuko / ensawo y'engoye** (bag vs suitcase), and **waleti / ensawo y'ensente** (wallet).
- **ebitaala** = traffic lights (literally "lights").

### 3d. My own notes (please confirm)
- *ennyonyi* is also used for "bird".
- *ekifo* also means "place".
- *omwezi* also means "month" (emyezi = months).
- Plurals *ebimuli* (flowers) and *amayinja* (stones; also used in the book's p22 question).
- Luganda time: hour 1 (*ssaawa emu*) = 07:00, so add 6. This matches the book's clocks on p23.
- Clan totem names drop the initial vowel (*enjovu* → *Njovu*), as on p45–47.

### 3e. Story consistency (for the author)
- Namubiru is called **"ssenga / faster"** (father's sister) on p11 and p40, but **"moster"** (mother's sister) in the story text. Musisi is **"kojja / morbror"** (mother's brother) on p11, but **"farbror"** in the story. The app follows p11 (*ssenga*, *kojja*).
- Alex is referred to as **"hon"** (she) on p12 and p41, but wears a **kanzu** (men's tunic) on p37. The app keeps Alex gender-neutral.
- Chapter labels: p5 and p9 both say "KAPITEL 1", while exercise pages refer to "kapitel 3, 5, 7, 8, 9".

---

## 4. Typos noticed in the book (for the next edition)
- Title "BEGINEERS" (p2 and PDF metadata). The cover says "Beginners".
- p15 "Siffor" → "Siffror".
- p19 "EnYukuta" → "Ennyukuta"?
- p21 "Metallkastrill" → "Metallkastrull"; "Endagla".
- p24 "Öva med en föräldrar" → "Öva med en förälder".
- p28 "Bra Jobbat!" → "Bra jobbat!"
- p35 "Enbwa" (as an option) → "Embwa".
- p2 still has placeholders: ISBN, "[T.ex. Tryckt via Amazon KDP …]", and on p48 "Hemsida: [www.dinhemsida.se …]".
- p4 table of contents is about emotions (see above).
- Some exercise pages (p11, p14, p18, p22, p39) have grey "patch" boxes pasted over the original answers.
