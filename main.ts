// Two Lines to Your Past Self.
//
// A program that writes TWO lines of text, 1 to 280 characters in total, to
// $MAKEFUN_OUTPUT_DIR/entry.txt (fallback: /output/entry.txt): line one warns
// the writer's past self about one specific moment in a single sentence, and
// line two says in one sentence why that moment mattered and what changed
// because of it.
//
// The program holds fourteen hand-written candidate pairs, ranks them with a
// small deterministic scorer built on the judge's own brief, and writes the
// winner. The judge weighs, most important first:
//   1. The first line warns a past self about one specific moment and the
//      second says why that moment mattered; a general life lesson with no
//      moment loses to any warning that names a real moment and its
//      consequence.
//   2. The moment is concrete enough to picture: a time, a place, a decision,
//      or a sentence said out loud, not a vague phase of life.
//   3. The second line shows real cause and effect, tracing what changed
//      because of that moment instead of restating the warning or repeating
//      the first line.
//   4. The two lines work as one, the warning setting up the moment and the
//      reason landing the consequence, with no wasted words.
//   5. The voice sounds like it was written to one specific person rather
//      than to an audience, plain and vivid rather than clever for its own
//      sake.
//
// A twist is welcome when it sharpens the moment. Cleverness for its own
// sake does not count.
//
// Node 22+, standard library only, no network, fully deterministic: the same
// output on every run. The winning pair is chosen by score alone, with ties
// broken toward the shorter text and then the earliest candidate, so the pick
// cannot change between runs.
//
// The gate: UTF-8 text of 1 to 280 characters, not only white space, exactly
// two lines, each line exactly one sentence, no trailing newline.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Limits and output
// ---------------------------------------------------------------------------

const MAX_CHARS = 280;
const MIN_CHARS = 1;

const OUTPUT_DIR =
  process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const OUTPUT_FILE = join(OUTPUT_DIR, "entry.txt");

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------
//
// Every pair is written by hand for this bounty. Each one tries to name one
// moment you can point at on a calendar or a map -- a date, a room, a
// sentence somebody actually said -- and then to trace, in the second line,
// what that moment cost or bought, in terms a reader can count. No general
// life lessons, no "cherish every moment", no advice addressed to a crowd.
// The warning always speaks to one person: you, then.
//
// A note on the craft: the strongest warnings turn on something SAID OUT
// LOUD (a doctor's shrug, a recruiter's question, a joke at a wedding) or on
// a small physical decision (a match, a signature, a train). The second line
// then has to do new work: name a consequence the first line never mentions,
// with a number or a span of years in it, so the cause and effect is
// something you can check, not a feeling you are asked to take on trust.
//

interface Candidate {
  id: string;
  line1: string;
  line2: string;
}

const CANDIDATES: Candidate[] = [
  {
    // The doctor's shrug. A date, a spoken sentence, a refused nod, and a
    // second line that counts the difference in years and in outcomes.
    id: "doctor-scan",
    line1:
      "On March 3rd, when the doctor shrugs and says 'it's probably nothing,' don't nod — ask for the scan.",
    line2:
      "That scan finds it a year early, and a year early is the difference between treatment and a funeral.",
  },
  {
    // The salary call. A time, a number said out loud, and a second line
    // that prices the sentence in dollars and in a lesson learned.
    id: "salary-number",
    line1:
      "When the recruiter calls at nine on Tuesday morning, say the number out loud — eighty-four thousand — instead of saying 'whatever's fair.'",
    line2:
      "That one sentence is worth forty thousand dollars over the next four years, and it teaches you your work has a price.",
  },
  {
    // The last bus. A small choice -- walk instead of run -- and a meeting
    // on the walk that decides where a life is lived.
    id: "last-bus",
    line1:
      "Don't run for the last bus home after the school dance — let it go and walk the long way through the park.",
    line2:
      "On that walk you meet the girl with the broken umbrella, and she is why you never leave this town.",
  },
  {
    // The stranger's email. Answering before midnight turns a message from
    // a stranger into the route out of home.
    id: "berlin-email",
    line1:
      "Don't delete the email from the stranger in Berlin — answer it before midnight, even though the English feels wrong.",
    line2:
      "That reply becomes the internship, the internship becomes the job, and the job is how you leave home for good.",
  },
  {
    // The wedding joke. The warning is about a sentence NOT said: the
    // second line prices the silence in years nobody forgets.
    id: "wedding-joke",
    line1:
      "At your brother's wedding, when the microphone comes to you, don't make the joke about the girl he left behind.",
    line2:
      "The silence after that joke would have lasted eleven years, and nobody at the table would ever have forgotten it.",
  },
  {
    // The ladder. A Saturday-morning no that saves a father's hip, his
    // winter, and three months of learning to walk again.
    id: "ladder-no",
    line1:
      "On Saturday morning, when Dad asks you to hold the ladder while he clears the gutters, say no and call the roofer instead.",
    line2:
      "That no saves his hip, his winter, and the three months he would have spent learning to walk again.",
  },
  {
    // The exam hall. Eyes on your own desk: one honest paper becomes the
    // only grade ever trusted, and the end of cutting corners.
    id: "exam-paper",
    line1:
      "In the exam hall at half past two, when the boy beside you slides his paper toward you, keep your eyes on your own desk.",
    line2:
      "That one honest paper is the only grade you ever trust, and it is the reason you stop cutting corners for good.",
  },
  {
    // The two-in-the-morning text. A phone in a drawer, a night slept on,
    // and a friendship that survives because a message stayed unsent.
    id: "unsent-text",
    line1:
      "Don't send the text at two in the morning — put the phone in the kitchen drawer and sleep on the words you want to say.",
    line2:
      "By morning the anger has cooled, the message stays unsent, and the friendship survives the night.",
  },
  {
    // The audition. Saying yes to a piece barely practised puts a player on
    // a stage, in an orchestra, for a lifetime.
    id: "audition-yes",
    line1:
      "When the audition panel asks if you can play the second piece, say yes, even though you have only practised it twice.",
    line2:
      "That yes puts you on the stage, the stage puts you in the orchestra, and the orchestra is where you spend your life.",
  },
  {
    // The second match. A pocketed match instead of a struck one: the field,
    // the fence, and a summer spent free.
    id: "second-match",
    line1:
      "Don't strike the second match in the dry field behind the school — pocket it and go home while the grass is still standing.",
    line2:
      "That one match would have taken the field, the fence, and the summer you were supposed to spend free.",
  },
  {
    // The letter to a mother. Three lines, no excuses, written before the
    // hospital calls -- and kept beside a bed ever after.
    id: "mother-letter",
    line1:
      "Write the letter to your mother tonight, before the hospital calls — three lines, no excuses, just the words you're sorry.",
    line2:
      "She reads it twice, folds it into her bible, and it is the last thing of yours she ever keeps beside her bed.",
  },
  {
    // The unsigned loan. A signature refused at a kitchen table saves a
    // house, a credit record, and five years of paying for bad numbers.
    id: "unsigned-loan",
    line1:
      "When your cousin slides the loan papers across the kitchen table, don't sign — tell him to come back when the numbers are real.",
    line2:
      "That unsigned page saves your house, your credit, and the five years you would have spent paying for his bad idea.",
  },
  {
    // The early train. Forty minutes between two departures is the whole
    // interview, the job, and a flat with a blue door.
    id: "early-train",
    line1:
      "Take the 6:40 train on the morning of the interview, not the 7:20 — the later one breaks down outside the city.",
    line2:
      "Those forty minutes are the whole interview, the job, and the flat with the blue door you live in now.",
  },
  {
    // The photograph. One asked-for look at a camera becomes the only
    // smiling picture of a grandfather, kept above a desk for thirty years.
    id: "grandfather-photo",
    line1:
      "Take the photograph of your grandfather on the porch that Sunday — ask him to look at the camera, just once.",
    line2:
      "It becomes the only picture you have of him smiling, and it hangs above your desk for the next thirty years.",
  },
];

// ---------------------------------------------------------------------------
// Marker lists
// ---------------------------------------------------------------------------
//
// The scorer does not judge literature; it counts evidence. Each list is a
// small, hand-picked vocabulary for one of the judge's criteria. A pair
// scores by showing the evidence, not by naming the criterion.
//
// Dates and clock times pin the moment to a point a reader can find on a
// calendar: criterion 2's "a time" slot. Months, weekdays and named days all
// count, as do clock times written out in words or digits.
const DATE_TIME_MARKERS = [
  "march",
  "january",
  "february",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
  "morning",
  "afternoon",
  "evening",
  "night",
  "midnight",
  "tonight",
  "half past",
  "nine on",
  "two in the morning",
  "6:40",
  "7:20",
  "3rd",
];

// Places pin the moment to a room, a building or a stretch of ground: the
// "a place" slot of criterion 2. A named city counts double in spirit --
// Berlin is not "somewhere" -- but the scorer keeps it simple and counts
// each distinct place once.
const PLACE_MARKERS = [
  "berlin",
  "kitchen",
  "exam hall",
  "park",
  "school",
  "field",
  "porch",
  "hospital",
  "stage",
  "orchestra",
  "city",
  "desk",
  "drawer",
  "table",
  "bed",
  "flat",
  "home",
  "town",
];

// People and roles pin the moment to somebody specific: the "written to one
// specific person" of criterion 5 starts with the warning naming who is in
// the room. Family roles count because they are one person, not a crowd.
const PERSON_MARKERS = [
  "doctor",
  "dad",
  "mother",
  "brother",
  "cousin",
  "grandfather",
  "recruiter",
  "girl",
  "boy",
  "stranger",
  "panel",
  "friendship",
];

// Small physical things a reader can hold, see or hear: the objects that
// make a scene visible instead of summarised. A ladder, a match, a phone in
// a drawer -- each one is a picture, not an abstraction.
const OBJECT_MARKERS = [
  "ladder",
  "scan",
  "match",
  "phone",
  "text",
  "email",
  "letter",
  "photograph",
  "picture",
  "camera",
  "paper",
  "microphone",
  "bus",
  "train",
  "ticket",
  "bike",
  "umbrella",
  "bible",
  "gutters",
  "roofer",
  "loan papers",
  "joke",
];

// Numbers make a consequence checkable: a price, a count, a span of years.
// Criterion 3 turns on cause and effect you can count, so a second line
// carrying a number outscores one that only feels like a consequence.
const NUMBER_MARKERS = [
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "forty",
  "eighty-four",
  "6:40",
  "7:20",
  "3rd",
  "second",
  "first",
  "thirty",
  "thousand",
  "dollars",
  "years",
  "months",
  "minutes",
];

// Decision verbs: the moment is a CHOICE, not a mood. "Don't nod", "say
// no", "keep your eyes", "take the train" -- each one is a fork in a day,
// and the second line is what lies down the road not taken.
const DECISION_VERBS = [
  "don't nod",
  "don't run",
  "don't delete",
  "don't make",
  "don't sign",
  "don't strike",
  "don't send",
  "say no",
  "say yes",
  "say the number",
  "ask for",
  "answer it",
  "keep your eyes",
  "take the",
  "write the",
  "put the phone",
  "pocket it",
  "call the",
];

// Causal connectors and consequence verbs: the vocabulary of the second
// line doing its job. "Finds", "saves", "becomes", "teaches", "is the
// difference", "is why" -- each one links the moment to what followed it,
// instead of restating the warning. Mere state verbs do not count here:
// "hangs", "keeps" and "stays" describe a scene standing still, not a
// consequence arriving, so they are left out of this list on purpose.
const CAUSAL_MARKERS = [
  "finds",
  "saves",
  "becomes",
  "teaches",
  "is the difference",
  "difference",
  "is why",
  "is the reason",
  "would have",
  "puts you",
  "survives",
  "spent",
  "worth",
  "because",
  "so",
];

// Words of change and of time passing: the second line has to show that
// something is different AFTER the moment. A span of years, a season, a
// "next" -- without one, the reason is only a restatement in new clothes.
const CHANGE_MARKERS = [
  "early",
  "next",
  "after",
  "before",
  "over the next",
  "for good",
  "for the next",
  "again",
  "now",
  "lasted",
  "ever",
  "never",
  "a year",
  "eleven years",
  "thirty years",
  "five years",
  "four years",
  "three months",
  "forty minutes",
];

// Padding and throat-clearing: words that spend characters without adding a
// picture or a consequence. Criterion 4 punishes wasted words, so each one
// costs the pair a little of its economy score.
const FILLER_MARKERS = [
  "very",
  "really",
  "just",
  "actually",
  "basically",
  "in fact",
  "of course",
  "remember",
  "always",
  "never forget",
  "cherish",
  "every moment",
  "life is short",
];

// Words that address a crowd instead of one person: criterion 5 fails when
// the warning starts sounding like a poster. A warning to a past self has
// one reader; "everyone", "we all" or "people" gives it an audience.
const AUDIENCE_MARKERS = [
  "everyone",
  "everybody",
  "we all",
  "people say",
  "you all",
  "dear reader",
  "ladies and gentlemen",
];

// Words that break the spell outright: text aimed at the judge, at the
// contest, or at cleverness for its own sake. The brief allows text
// addressed to the judge, but this entry wins on the moment, not on a wink
// at the scoring -- so any of these zeroes the voice score.
const BANNED_MARKERS = [
  "dear judge",
  "judge",
  "as an ai",
  "as a language model",
  "this entry",
  "pick me",
  "vote for",
  "five stars",
  "rate me",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Count how many distinct markers from a list appear in the text (case
// insensitive), each matched as a whole word or phrase: "ten" must not
// count inside "sentence", "eight" must not count inside "eighty-four",
// "four" must not count inside "forty". Distinct, not total: repeating one
// good word three times is not three pieces of evidence.
function countDistinct(text: string, markers: string[]): number {
  const lower = text.toLowerCase();
  let found = 0;
  for (const marker of markers) {
    const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escaped}\\b`).test(lower)) found += 1;
  }
  return found;
}

// Does the text carry a sentence somebody says out loud, in single quotes?
// A spoken sentence is criterion 2's sharpest evidence: it is a moment you
// can hear, with a voice attached.
function hasQuotedSpeech(text: string): boolean {
  return /'[^']{3,}'/.test(text);
}

// Count sentence-ending marks. A well-formed line has exactly one: the
// brief demands one sentence per line, and the gate enforces it. Abbreviated
// clock times are written without periods in this entry ("two in the
// morning", "6:40"), so a plain count is honest here.
function countSentenceEnds(line: string): number {
  const hits = line.match(/[.!?]/g);
  return hits === null ? 0 : hits.length;
}

// Split a line into lower-case content words (no stop words, no punctuation)
// for the overlap check between the two lines.
const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "of", "to", "in", "on", "at",
  "by", "for", "with", "from", "that", "this", "it", "is", "are", "was",
  "were", "you", "your", "yours", "he", "she", "his", "her", "its", "they",
  "them", "their", "don't", "dont", "not", "no", "so", "as", "if", "when",
  "then", "than", "would", "have", "has", "had", "be", "been", "do", "does",
  "did", "can", "could", "will", "just", "only", "one", "two", "after",
  "before", "out", "up", "down", "over", "into", "isn", "t",
]);

function contentWords(line: string): Set<string> {
  const words = line
    .toLowerCase()
    .replace(/[^a-z0-9: ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
  return new Set(words);
}

// Jaccard overlap of the two lines' content words. A second line that
// repeats the first line's words is restating the warning, not tracing what
// changed; criterion 3 wants the overlap low.
function wordOverlap(line1: string, line2: string): number {
  const a = contentWords(line1);
  const b = contentWords(line2);
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const w of a) if (b.has(w)) shared += 1;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : shared / union;
}

// Does the final clause of the second line -- its last six words -- carry
// the payoff, a consequence word? Criterion 4 wants the reason to land on
// the last words, not to leak away in a trailing aside.
function payoffInFinalClause(line2: string): boolean {
  const words = line2.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  const tail = words.slice(-6).join(" ");
  return CAUSAL_MARKERS.some((m) => tail.includes(m)) ||
    CHANGE_MARKERS.some((m) => tail.includes(m));
}

// ---------------------------------------------------------------------------
// Scorer
// ---------------------------------------------------------------------------
//
// Five criteria, weighted in the judge's own order, each scored 0..1:
//   1. Moment + reason present ............ 0.35
//   2. Concrete enough to picture ......... 0.25
//   3. Real cause and effect .............. 0.20
//   4. Two lines working as one ........... 0.12
//   5. Voice: one person, plain, vivid .... 0.08
// A +0.03 landing bonus rewards a payoff sitting in the final clause. The
// total is capped at 1.00.

const WEIGHTS = [0.35, 0.25, 0.2, 0.12, 0.08];

interface Breakdown {
  c1: number;
  c2: number;
  c3: number;
  c4: number;
  c5: number;
  bonus: number;
  total: number;
}

function scoreCandidate(c: Candidate): Breakdown {
  const text = `${c.line1}\n${c.line2}`;
  const lower = text.toLowerCase();

  // -- Criterion 1: a specific moment warned about, and a reason given. --
  // Five moment slots in line one: a time, a place, a person, a spoken
  // sentence or a decision verb, a concrete object or number. The brief
  // lists time, place, decision and spoken sentence as alternatives -- a
  // moment needs ONE of them, not all -- so four slots hit is full marks.
  // The reason slot in line two needs both a causal marker and a change
  // word: a consequence you can point at, not a moral.
  const momentSlots = [
    countDistinct(c.line1, DATE_TIME_MARKERS) > 0,
    countDistinct(c.line1, PLACE_MARKERS) > 0,
    countDistinct(c.line1, PERSON_MARKERS) > 0,
    hasQuotedSpeech(c.line1) || countDistinct(c.line1, DECISION_VERBS) > 0,
    countDistinct(c.line1, OBJECT_MARKERS) > 0 ||
      countDistinct(c.line1, NUMBER_MARKERS) > 0,
  ];
  const momentScore = Math.min(
    1,
    momentSlots.filter(Boolean).length / 4,
  );
  const reasonScore =
    countDistinct(c.line2, CAUSAL_MARKERS) > 0 &&
    countDistinct(c.line2, CHANGE_MARKERS) > 0
      ? 1
      : countDistinct(c.line2, CAUSAL_MARKERS) > 0 ||
          countDistinct(c.line2, CHANGE_MARKERS) > 0
        ? 0.5
        : 0;
  const c1 = 0.6 * momentScore + 0.4 * reasonScore;

  // -- Criterion 2: concrete enough to picture. --
  // Distinct concrete evidence across the whole pair, capped at eight
  // pieces. Each kind of evidence -- dates, places, people, objects,
  // numbers -- contributes at most two, because five number-words are not
  // five kinds of concreteness; they are one number said five ways. A
  // quoted sentence said out loud is worth two pieces on its own, because
  // it is the one detail a reader hears rather than reads, and the brief
  // names it as a concreteness slot in its own right.
  const concretePieces =
    Math.min(2, countDistinct(text, DATE_TIME_MARKERS)) +
    Math.min(2, countDistinct(text, PLACE_MARKERS)) +
    Math.min(2, countDistinct(text, PERSON_MARKERS)) +
    Math.min(2, countDistinct(text, OBJECT_MARKERS)) +
    Math.min(2, countDistinct(text, NUMBER_MARKERS)) +
    (hasQuotedSpeech(text) ? 2 : 0);
  const c2 = Math.min(1, concretePieces / 8);

  // -- Criterion 3: real cause and effect in line two. --
  // Three parts: the second line carries causal language (a third of the
  // score), it carries a change or time-passage word (a third), and it
  // does not merely repeat the first line (the last third, from the word
  // overlap: an overlap under 0.25 is full marks, over 0.6 is none).
  // A pair whose second line only rephrases the warning can never win.
  const causalPart = Math.min(1, countDistinct(c.line2, CAUSAL_MARKERS) / 2);
  const changePart = Math.min(1, countDistinct(c.line2, CHANGE_MARKERS) / 2);
  const overlap = wordOverlap(c.line1, c.line2);
  const freshPart =
    overlap <= 0.25 ? 1 : overlap >= 0.6 ? 0 : (0.6 - overlap) / 0.35;
  const c3 = (causalPart + changePart + freshPart) / 3;

  // -- Criterion 4: two lines working as one, no wasted words. --
  // Half length: the sweet spot is 150 to 250 characters -- long enough to
  // hold a date, a place and a consequence, short enough that every word
  // earns its place. Below 120 or above 265 the score tapers away.
  // A quarter for balance: the two lines should be near kin in length, so
  // neither reads as a setup that never lands or a punchline with no setup.
  // A quarter for cleanliness: every filler phrase costs a quarter of it.
  const chars = text.length;
  const lengthPart =
    chars >= 150 && chars <= 250
      ? 1
      : chars < 120
        ? Math.max(0, chars / 120)
        : chars > 265
          ? Math.max(0, (MAX_CHARS - chars) / 15)
          : 0.8;
  const ratio =
    Math.min(c.line1.length, c.line2.length) /
    Math.max(c.line1.length, c.line2.length);
  const balancePart = ratio >= 0.5 ? 1 : ratio / 0.5;
  const fillerCount = countDistinct(text, FILLER_MARKERS);
  const cleanPart = Math.max(0, 1 - 0.25 * fillerCount);
  const c4 = 0.5 * lengthPart + 0.25 * balancePart + 0.25 * cleanPart;

  // -- Criterion 5: voice -- one specific person, plain and vivid. --
  // Half for the second person: the warning must speak to "you", because
  // a past self is one person, not an audience. An imperative addressed to
  // the reader -- "don't nod", "take the train", "write the letter" -- is
  // second person too, even with no literal "you" in the line: the verb
  // itself is the address. A quarter for no crowd words, a quarter for no
  // banned meta-cleverness. Any banned marker zeroes the whole criterion:
  // a wink at the judge is cleverness for its own sake, and the brief says
  // it does not count.
  let c5: number;
  if (countDistinct(lower, BANNED_MARKERS) > 0) {
    c5 = 0;
  } else {
    const secondPerson =
      /\byou\b|\byour\b/.test(lower) ||
      /\b(don't|take|write|say|ask|keep|put|answer|call|pocket)\b/.test(
        c.line1.toLowerCase(),
      )
        ? 0.5
        : 0;
    const noAudience = countDistinct(lower, AUDIENCE_MARKERS) === 0 ? 0.25 : 0;
    const plainVoice = 0.25;
    c5 = secondPerson + noAudience + plainVoice;
  }

  // Landing bonus: the payoff sits in the final clause of line two.
  const bonus = payoffInFinalClause(c.line2) ? 0.03 : 0;

  const total = Math.min(
    1,
    WEIGHTS[0] * c1 +
      WEIGHTS[1] * c2 +
      WEIGHTS[2] * c3 +
      WEIGHTS[3] * c4 +
      WEIGHTS[4] * c5 +
      bonus,
  );

  return { c1, c2, c3, c4, c5, bonus, total };
}

// ---------------------------------------------------------------------------
// Gate
// ---------------------------------------------------------------------------
//
// The sealed scorer's gate, as the bounty publishes it: /output/entry.txt
// must be UTF-8 text of 1 to 280 characters, not only white space. The
// brief adds the shape the judge expects -- exactly two lines, each exactly
// one sentence -- so the program enforces that shape too, and refuses to
// write a pair that fails any part of it.

interface GateResult {
  ok: boolean;
  reasons: string[];
}

function checkGate(c: Candidate): GateResult {
  const reasons: string[] = [];
  const text = `${c.line1}\n${c.line2}`;

  if (text.length < MIN_CHARS || text.length > MAX_CHARS) {
    reasons.push(
      `length ${text.length} chars is outside ${MIN_CHARS}-${MAX_CHARS}`,
    );
  }
  if (text.trim().length === 0) {
    reasons.push("text is only white space");
  }
  const lines = text.split("\n");
  if (lines.length !== 2) {
    reasons.push(`expected exactly 2 lines, got ${lines.length}`);
  }
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line !== line.trim()) {
      reasons.push(`line ${i + 1} has leading or trailing white space`);
    }
    if (line.length === 0) {
      reasons.push(`line ${i + 1} is empty`);
    }
    if (countSentenceEnds(line) !== 1) {
      reasons.push(
        `line ${i + 1} has ${countSentenceEnds(line)} sentence ends, expected 1`,
      );
    }
  }
  return { ok: reasons.length === 0, reasons };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function formatScore(n: number): string {
  return n.toFixed(3);
}

function main(): void {
  // Score every candidate, then keep only the pairs that pass the gate.
  // A pair that cannot be judged is never written, however well it scores.
  const scored = CANDIDATES.map((c, index) => ({
    candidate: c,
    index,
    breakdown: scoreCandidate(c),
    gate: checkGate(c),
    chars: `${c.line1}\n${c.line2}`.length,
  }));

  const valid = scored.filter((s) => s.gate.ok);
  if (valid.length === 0) {
    for (const s of scored) {
      console.error(
        `candidate ${s.candidate.id} fails the gate: ${s.gate.reasons.join("; ")}`,
      );
    }
    throw new Error("no candidate passes the gate");
  }

  // Rank: highest total first; ties go to the shorter text, then to the
  // earliest candidate. No randomness, no clock, no environment read beyond
  // the output directory: the same input always picks the same pair.
  valid.sort((a, b) => {
    if (b.breakdown.total !== a.breakdown.total) {
      return b.breakdown.total - a.breakdown.total;
    }
    if (a.chars !== b.chars) return a.chars - b.chars;
    return a.index - b.index;
  });

  const winner = valid[0];
  const entry = `${winner.candidate.line1}\n${winner.candidate.line2}`;

  // Write with no trailing newline: the gate counts characters, and a
  // trailing newline would be a third, empty line to the judge.
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, entry, "utf8");

  // Read it back and verify byte-for-byte: what the grader will read must
  // be exactly what was chosen, inside the gate.
  const readBack = readFileSync(OUTPUT_FILE, "utf8");
  if (readBack !== entry) {
    throw new Error("read-back mismatch: entry.txt is not the chosen pair");
  }
  const recheck = checkGate(winner.candidate);
  if (!recheck.ok) {
    throw new Error(`winner fails the gate on recheck: ${recheck.reasons.join("; ")}`);
  }

  // Report: the full ranking, so a reader can see why this pair won and
  // how close the field was. Deterministic order, fixed precision.
  console.log("Two Lines to Your Past Self — ranking");
  console.log("=====================================");
  for (const s of valid) {
    const mark = s === winner ? " <-- winner" : "";
    console.log(
      `${s.candidate.id.padEnd(18)} total=${formatScore(s.breakdown.total)} ` +
        `c1=${formatScore(s.breakdown.c1)} c2=${formatScore(s.breakdown.c2)} ` +
        `c3=${formatScore(s.breakdown.c3)} c4=${formatScore(s.breakdown.c4)} ` +
        `c5=${formatScore(s.breakdown.c5)} bonus=${formatScore(s.breakdown.bonus)} ` +
        `chars=${s.chars}${mark}`,
    );
  }
  const rejected = scored.filter((s) => !s.gate.ok);
  for (const s of rejected) {
    console.log(
      `${s.candidate.id.padEnd(18)} REJECTED: ${s.gate.reasons.join("; ")}`,
    );
  }
  console.log("=====================================");
  console.log(`winner: ${winner.candidate.id} (${winner.chars} characters)`);
  console.log(`wrote: ${OUTPUT_FILE}`);
  console.log("--- entry ---");
  console.log(entry);
}

main();
