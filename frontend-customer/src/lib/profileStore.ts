// ============================================================================
// PROFILE STORE — Zentrale Quelle der 6 Frauen
//
// Wird genutzt von: Landing-Page, /explore, /inbox, /inbox/[id]
//
// In Session 3 (Backend): Diese Datei wird ersetzt durch echte API-Calls
// (getCreators(), getCreatorByHandle()) — die Datenstruktur bleibt gleich.
// ============================================================================

export interface Frau {
  id: string;
  name: string;
  age: number;
  city: string;
  image: string;       // Hauptbild für Liste/Avatar
  images: string[];    // Alle Bilder für Profil-Detail
  online: boolean;
  mood: string;
  bio: string;
  today: string;
  likes: string[];
  looking: string[];

  // Coin-Preis pro Nachricht — Frau bestimmt selbst
  coinPrice: number;

  // Persona-spezifische Reply-Texte für Mock-Antworten
  initialMessage: string;       // Erste Nachricht beim Chat-Start
  replies: string[];            // Pool für zufällige Antworten
}

export const FRAUEN: Frau[] = [
  {
    id: 'lara',
    name: 'Lara',
    age: 24,
    city: 'Berlin',
    image: '/profiles/frau-1-lara/02.jpg',
    images: [
      '/profiles/frau-1-lara/01-haupt.jpg',
      '/profiles/frau-1-lara/02.jpg',
      '/profiles/frau-1-lara/03.jpg',
      '/profiles/frau-1-lara/04.jpg',
      '/profiles/frau-1-lara/05.jpg',
      '/profiles/frau-1-lara/06.jpg',
    ],
    online: true,
    mood: 'Diskret',
    bio: 'Bin eher zurückhaltend am Anfang. Wenn ich mich wohl fühle, taue ich auf.',
    today: 'Bin heute Abend da.',
    likes: ['Lange Nachrichten', 'Klartext', 'Späte Abende', 'Wein', 'Ehrliche Komplimente'],
    looking: ['Lockeres Dating', 'Lange Gespräche', 'Sexting', 'Flirten ohne Druck'],
    coinPrice: 7,
    initialMessage: 'Hey... du hast mir geschrieben? 🙈',
    replies: [
      'Bin noch etwas schüchtern, aber erzähl mal',
      'Was machst du heute Abend so?',
      'Hmm, das klingt interessant...',
      'Magst du es ruhig oder eher wild?',
      'Ich brauche manchmal ein bisschen Zeit zum Auftauen 😊',
      'Trinkst du auch grad was?',
      'Sag mir, was du suchst.',
    ],
  },
  {
    id: 'valentina',
    name: 'Valentina',
    age: 25,
    city: 'München',
    image: '/profiles/frau-2-valentina/01-haupt.jpg',
    images: [
      '/profiles/frau-2-valentina/01-haupt.jpg',
      '/profiles/frau-2-valentina/02.jpg',
      '/profiles/frau-2-valentina/03.jpg',
      '/profiles/frau-2-valentina/04.jpg',
    ],
    online: true,
    mood: 'Direkt',
    bio: 'Ich rede Klartext. Hab keine Lust auf Spielchen oder Standard-Sprüche. Wenn du echt bist, bin ich\'s auch.',
    today: 'Bock auf was zwischendurch.',
    likes: ['Klartext', 'Schlagfertige Männer', 'Tanzen', 'Frecher Humor', 'Spontaneität'],
    looking: ['Kennenlernen', 'Lockeres Dating', 'Offen für ONS', 'Flirten ohne Druck'],
    coinPrice: 9,
    initialMessage: 'Na, was willst du? 😏',
    replies: [
      'Klingt gut. Erzähl mehr.',
      'Hmm, interessant 🤔',
      'Bist du immer so direkt?',
      'Was suchst du eigentlich?',
      'Lass das Geschwafel, sag was du willst',
      'Bock dich mal kennenzulernen',
      'Schreibst du sowas zu jeder?',
      'Du gefällst mir bis jetzt.',
    ],
  },
  {
    id: 'mia',
    name: 'Mia',
    age: 23,
    city: 'Hamburg',
    image: '/profiles/frau-3-mia/01-haupt.jpg',
    images: [
      '/profiles/frau-3-mia/01-haupt.jpg',
      '/profiles/frau-3-mia/02.jpg',
      '/profiles/frau-3-mia/03.jpg',
    ],
    online: true,
    mood: 'Cool',
    bio: 'Schreib mich einfach an :)',
    today: 'online',
    likes: ['Musik', 'Späte Nächte', 'Klartext', 'Spontaneität'],
    looking: ['Kennenlernen', 'Sexting', 'Lange Gespräche', 'Flirten ohne Druck'],
    coinPrice: 7,
    initialMessage: 'heyy :)',
    replies: [
      'kk',
      'hmm 🤔',
      'erzähl',
      'lol',
      'haha okay',
      'machst du was heut abend?',
      'magst du musik?',
      'nice',
    ],
  },
  {
    id: 'sophia',
    name: 'Sophia',
    age: 26,
    city: 'Frankfurt',
    image: '/profiles/frau-4-sophia/01-haupt.png',
    images: [
      '/profiles/frau-4-sophia/01-haupt.png',
      '/profiles/frau-4-sophia/02.png',
      '/profiles/frau-4-sophia/03.jpg',
    ],
    online: true,
    mood: 'Sportlich',
    bio: 'Sport, Musik, Wein. Mehr brauch ich nicht. Suche jemanden zum Quatschen oder mehr — kommt drauf an.',
    today: 'hab Bock.',
    likes: ['Sport', 'Tanzen', 'Klartext', 'Frecher Humor', 'Schlagfertige Männer'],
    looking: ['Lockeres Dating', 'Offen für ONS', 'Sexting', 'Flirten ohne Druck'],
    coinPrice: 8,
    initialMessage: 'Hey! Was geht? 💪',
    replies: [
      'Klingt gut!',
      'Machst du auch Sport?',
      'Bin gerade vom Gym zurück 😅',
      'Heute Abend frei?',
      'Klar, sag was du willst',
      'Bock dich kennenzulernen',
      'Wein und reden klingt perfekt',
    ],
  },
  {
    id: 'elena',
    name: 'Elena',
    age: 29,
    city: 'Düsseldorf',
    image: '/profiles/frau-5-elena/01-haupt.jpg',
    images: [
      '/profiles/frau-5-elena/01-haupt.jpg',
      '/profiles/frau-5-elena/02.jpg',
      '/profiles/frau-5-elena/03.jpg',
    ],
    online: false,
    mood: 'Reif',
    bio: 'Ich bin 29 und weiß was ich will. Keine Lust auf Jungs, die noch nicht wissen wer sie sind.',
    today: 'Glas Wein, gemütlicher Abend.',
    likes: ['Lange Gespräche', 'Klartext', 'Wein-Abende', 'Ehrliche Komplimente', 'Echte Männer'],
    looking: ['Kennenlernen', 'Lockeres Dating', 'Sexting', 'Lange Gespräche'],
    coinPrice: 10,
    initialMessage: 'Hallo. Schön dass du schreibst.',
    replies: [
      'Erzähl mir was über dich.',
      'Ich mag, dass du den ersten Schritt machst.',
      'Was suchst du wirklich?',
      'Klingt gut. Mehr davon.',
      'Ich hab jetzt grad ein Glas Wein in der Hand 🍷',
      'Du wirkst interessant.',
      'Erzähl mir was du heute gemacht hast.',
    ],
  },
  {
    id: 'sarah',
    name: 'Sarah',
    age: 31,
    city: 'Köln',
    image: '/profiles/frau-6-sarah/01-haupt.jpg',
    images: [
      '/profiles/frau-6-sarah/01-haupt.jpg',
      '/profiles/frau-6-sarah/02.jpg',
      '/profiles/frau-6-sarah/03.jpg',
    ],
    online: true,
    mood: 'Sophisticated',
    bio: 'Ich rede gern. Aber manchmal höre ich auch einfach nur zu. Spannend wird\'s für mich, wenn ein Gespräch nicht oberflächlich bleibt.',
    today: 'Hab Lust auf was Echtes.',
    likes: ['Lange Gespräche', 'Bücher', 'Wein', 'Klartext', 'Späte Chats'],
    looking: ['Kennenlernen', 'Lange Gespräche', 'Flirten ohne Druck', 'Sexting'],
    coinPrice: 10,
    initialMessage: 'Hallo. Erzähl mir was Echtes über dich.',
    replies: [
      'Das gefällt mir.',
      'Geh tiefer — warum machst du das?',
      'Hmm, das ist eine interessante Perspektive.',
      'Ich lese gerade was Spannendes. Magst du Bücher?',
      'Erzähl mir was über deinen Tag.',
      'Was bewegt dich gerade?',
      'Du wirkst durchdacht. Mag ich.',
    ],
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getFrauById(id: string): Frau | undefined {
  return FRAUEN.find((f) => f.id === id);
}

export function getOnlineCount(): number {
  return FRAUEN.filter((f) => f.online).length;
}
