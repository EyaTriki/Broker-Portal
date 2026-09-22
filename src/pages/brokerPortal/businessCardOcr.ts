/**
 * Reads a business card with tesseract.js and maps the text onto lead fields.
 * Everything runs in the browser: only the OCR engine and language data come
 * from the network, the card image never leaves the device.
 */

import { isPdfFile, renderPdfFirstPage } from './pdfToImage';

export interface ParsedBusinessCard {
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  addressLine1?: string;
  city?: string;
  postalCode?: string;
  website?: string;
  rawText: string;
}

export interface ScanProgress {
  /** Human readable stage, e.g. "Reading card". */
  status: string;
  /** 0–1. */
  progress: number;
}

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const WEBSITE_RE = /\b(?:https?:\/\/|www\.)[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/\S*)?/i;
const UK_POSTCODE_RE = /\b[a-z]{1,2}\d[a-z\d]?\s*\d[a-z]{2}\b/i;
const PHONE_CANDIDATE_RE = /\+?\d[\d\s().\-/]{7,}\d/g;
/** Same pattern without /g, so `test` can be used without carrying lastIndex over. */
const PHONE_TEST_RE = new RegExp(PHONE_CANDIDATE_RE.source);

/** Legal suffixes are a far stronger company signal than industry words like "waste". */
const LEGAL_ENTITY_HINTS = /\b(ltd|limited|llp|plc|inc|incorporated|gmbh|group|holdings|company|co)\b/i;
const INDUSTRY_HINTS =
  /\b(services|solutions|systems|consult\w*|logistics|waste|recycling|environmental|skips?|construction|properties|partners|associates|trading|enterprises?|clearance|hire|facilities)\b/i;
const COMPANY_HINTS = new RegExp(`${LEGAL_ENTITY_HINTS.source}|${INDUSTRY_HINTS.source}`, 'i');

/** Free mail providers say nothing about the company, so they must not drive the match. */
const GENERIC_EMAIL_DOMAINS = new Set([
  'gmail',
  'googlemail',
  'hotmail',
  'outlook',
  'live',
  'msn',
  'yahoo',
  'ymail',
  'aol',
  'icloud',
  'me',
  'protonmail',
  'proton',
  'btinternet',
  'sky',
  'virginmedia',
]);

const JOB_TITLE_HINTS =
  /\b(director|manager|managing|officer|executive|consultant|engineer|head of|owner|founder|co-founder|partner|president|vice president|supervisor|coordinator|specialist|administrator|technician|advisor|adviser|analyst|representative|rep|ceo|cto|cfo|coo|md|sales|account|business development|procurement|operations|estimator|surveyor|buyer)\b/i;

const STREET_HINTS =
  /\b(street|st\.?|road|rd\.?|avenue|ave\.?|lane|ln\.?|way|close|drive|dr\.?|court|ct\.?|place|square|crescent|terrace|grove|hill|park|estate|industrial|unit|suite|floor|house|building|wharf|yard|mews|gardens?)\b/i;

const HONORIFICS = /^(mr|mrs|ms|miss|dr|prof|eng|ing)\.?\s+/i;

const LABEL_MOBILE = /\b(m|mob|mobile|cell|cellular)\b\s*[:.]?/i;
const LABEL_FAX = /\b(f|fax)\b\s*[:.]?/i;
/** Splits a line ahead of each contact label so "T: … M: …" becomes two segments. */
const LABEL_SPLIT =
  /(?=\b(?:tel|telephone|phone|mobile|mob|cell|cellular|fax|office|direct|email|web)\b\s*[:.]?)|(?=\b[tpmfodew]\b\s*[:.])/i;
/** Leading label, stripped before digit repair so "tel" isn't read as a "1". */
const LABEL_PREFIX =
  /^\s*\b(?:tel|telephone|phone|mobile|mob|cell|cellular|fax|office|direct|email|web|[tpmfodew])\b\s*[:.]?\s*/i;

/** Digits-only form, keeping a leading +, so numbers can be compared and classified. */
function normalisePhone(raw: string) {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/[^\d]/g, '');
  return trimmed.startsWith('+') ? `+${digits}` : digits;
}

/** OCR reads O/o as zero and l/I as one inside numbers more often than not. */
function repairDigits(raw: string) {
  return raw.replace(/[Oo]/g, '0').replace(/[lI]/g, '1');
}

function isUkMobile(phone: string) {
  const digits = phone.replace(/[^\d]/g, '');
  return digits.startsWith('07') || digits.startsWith('447');
}

function titleCaseName(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((part) =>
      part
        .split('-')
        .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
        .join('-'),
    )
    .join(' ');
}

const squash = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

function commonPrefixLength(a: string, b: string) {
  const limit = Math.min(a.length, b.length);
  let length = 0;
  while (length < limit && a[length] === b[length]) length += 1;
  return length;
}

/**
 * Filters out logo gibberish and decorative lines, so they can't be mistaken
 * for a company name.
 */
function looksLikeCompanyLine(line: string) {
  if (line.length < 3 || line.length > 60) return false;
  const letters = (line.match(/[a-z]/gi) || []).length;
  const symbols = (line.match(/[^a-z0-9\s&.,'()\-/]/gi) || []).length;
  return letters >= Math.max(3, line.length * 0.6) && symbols <= 1;
}

/** A card line that plausibly holds a person's name rather than a company or contact detail. */
function looksLikePersonName(line: string) {
  if (EMAIL_RE.test(line) || WEBSITE_RE.test(line) || /\d/.test(line)) return false;
  if (COMPANY_HINTS.test(line) || JOB_TITLE_HINTS.test(line)) return false;

  const words = line.replace(HONORIFICS, '').trim().split(/\s+/);
  if (words.length < 2 || words.length > 4) return false;
  return words.every((word) => /^[A-Za-z][A-Za-z'’.-]*$/.test(word));
}

export function parseBusinessCardText(rawText: string): ParsedBusinessCard {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/\s{2,}/g, ' ').trim())
    .filter(Boolean);

  const result: ParsedBusinessCard = { rawText };

  const email = rawText.match(EMAIL_RE)?.[0];
  if (email) result.email = email.toLowerCase();

  const website = rawText.match(WEBSITE_RE)?.[0];
  // A URL and an email often share a domain; only keep a genuinely separate site.
  if (website && (!result.email || !result.email.endsWith(website.replace(/^(https?:\/\/|www\.)/i, '')))) {
    result.website = website.replace(/[.,;]$/, '');
  }

  const postcode = rawText.match(UK_POSTCODE_RE)?.[0];
  if (postcode) result.postalCode = postcode.toUpperCase().replace(/\s+/g, ' ');

  // Phones: split on the labels first, so "Tel: … Fax: …" on one line keeps the
  // Tel number and a labelled mobile lands in the mobile slot rather than the phone one.
  for (const line of lines) {
    for (const segment of line.split(LABEL_SPLIT)) {
      if (LABEL_FAX.test(segment)) continue;

      const candidates = repairDigits(segment.replace(LABEL_PREFIX, '')).match(PHONE_CANDIDATE_RE) || [];
      for (const candidate of candidates) {
        const phone = normalisePhone(candidate);
        const digitCount = phone.replace(/[^\d]/g, '').length;
        if (digitCount < 10 || digitCount > 13) continue;

        if ((LABEL_MOBILE.test(segment) || isUkMobile(phone)) && !result.mobile) result.mobile = phone;
        else if (!result.phone) result.phone = phone;
      }
    }
  }

  const jobTitleIndex = lines.findIndex(
    (line) =>
      JOB_TITLE_HINTS.test(line) &&
      !LEGAL_ENTITY_HINTS.test(line) &&
      !EMAIL_RE.test(line) &&
      !PHONE_TEST_RE.test(line),
  );
  if (jobTitleIndex >= 0) result.jobTitle = lines[jobTitleIndex];

  // Names usually sit directly above the job title, otherwise take the first name-shaped line.
  const nameLine =
    (jobTitleIndex > 0
      ? [...lines.slice(0, jobTitleIndex)].reverse().find(looksLikePersonName)
      : undefined) || lines.find(looksLikePersonName);

  if (nameLine) {
    const cleaned = titleCaseName(nameLine.replace(HONORIFICS, '').trim());
    const [first, ...rest] = cleaned.split(/\s+/);
    result.firstName = first;
    if (rest.length) result.lastName = rest.join(' ');
  }

  const companyCandidates = lines.filter(
    (line, index) =>
      index !== jobTitleIndex &&
      line !== nameLine &&
      looksLikeCompanyLine(line) &&
      !EMAIL_RE.test(line) &&
      !WEBSITE_RE.test(line) &&
      !UK_POSTCODE_RE.test(line) &&
      !PHONE_TEST_RE.test(line),
  );

  // The email domain is the strongest signal: "northgatefm" and "Northgate Facilities"
  // share a prefix even though neither contains the other.
  const emailDomain = result.email?.split('@')[1]?.split('.')[0]?.toLowerCase();
  const usableDomain =
    emailDomain && emailDomain.length > 2 && !GENERIC_EMAIL_DOMAINS.has(emailDomain)
      ? emailDomain
      : undefined;

  const companyLine =
    (usableDomain &&
      companyCandidates.find((line) => commonPrefixLength(squash(line), usableDomain) >= 5)) ||
    companyCandidates.find((line) => LEGAL_ENTITY_HINTS.test(line)) ||
    (jobTitleIndex >= 0 ? companyCandidates.find((line) => line === lines[jobTitleIndex + 1]) : undefined) ||
    companyCandidates.find((line) => INDUSTRY_HINTS.test(line)) ||
    companyCandidates[0];

  if (companyLine) result.companyName = companyLine;

  const addressLine = lines.find(
    (line) => STREET_HINTS.test(line) && /\d/.test(line) && !EMAIL_RE.test(line) && !PHONE_TEST_RE.test(line),
  );
  if (addressLine) result.addressLine1 = addressLine;

  if (postcode) {
    // "12 High Street, London SW1A 1AA" -> city sits just before the postcode.
    const beforePostcode = rawText.slice(0, rawText.indexOf(postcode));
    const cityCandidate = beforePostcode.split(/[,\n]/).pop()?.trim();
    if (cityCandidate && /^[A-Za-z][A-Za-z\s'-]{2,30}$/.test(cityCandidate)) {
      result.city = titleCaseName(cityCandidate);
    }
  }

  return result;
}

/**
 * Grayscale, stretch contrast and upscale small images — Tesseract is markedly
 * more accurate on ~1600px wide, high contrast input than on a raw photo.
 */
const OCR_IMAGE_WIDTH = 1600;
const MAX_UPSCALE = 3;

interface DecodedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
}

/**
 * `createImageBitmap` is fast, but older mobile Safari versions either do not
 * expose it or fail to decode some camera JPEGs. An HTML image is a reliable
 * fallback and also honours the photo's EXIF orientation.
 */
async function decodeImage(source: Blob): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(source);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch {
      // Fall through to the mobile Safari-compatible decoder.
    }
  }

  const url = URL.createObjectURL(source);
  const image = new Image();
  image.decoding = 'async';

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('The selected image format could not be decoded.'));
      image.src = url;
    });

    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      close: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

async function preprocessImage(source: Blob): Promise<Blob> {
  const decoded = await decodeImage(source);
  // Camera photos are commonly 4000px+ wide. Downscaling before getImageData
  // avoids 50–150 MB allocations that mobile browsers often terminate.
  const scale = Math.min(MAX_UPSCALE, OCR_IMAGE_WIDTH / decoded.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(decoded.width * scale));
  canvas.height = Math.max(1, Math.round(decoded.height * scale));

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    decoded.close();
    return source;
  }
  ctx.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);
  decoded.close();

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = image.data;
  const luminance = new Uint8ClampedArray(pixels.length / 4);

  let min = 255;
  let max = 0;
  for (let i = 0; i < luminance.length; i += 1) {
    const grey = Math.round(
      0.299 * pixels[i * 4] + 0.587 * pixels[i * 4 + 1] + 0.114 * pixels[i * 4 + 2],
    );
    luminance[i] = grey;
    if (grey < min) min = grey;
    if (grey > max) max = grey;
  }

  const range = Math.max(1, max - min);
  for (let i = 0; i < luminance.length; i += 1) {
    const stretched = ((luminance[i] - min) / range) * 255;
    pixels[i * 4] = stretched;
    pixels[i * 4 + 1] = stretched;
    pixels[i * 4 + 2] = stretched;
    pixels[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);

  return new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob || source), 'image/png');
  });
}

/** True for the formats the scanner can actually read: raster images and PDFs. */
export function canScanFile(file: File) {
  return file.type.startsWith('image/') || /\.(jpe?g|png)$/i.test(file.name) || isPdfFile(file);
}

export async function scanBusinessCard(
  file: File,
  onProgress?: (progress: ScanProgress) => void,
): Promise<ParsedBusinessCard> {
  // Load the worker from our own origin. The package default points at a CDN
  // and wraps it in a blob worker, which is commonly blocked by mobile browser
  // privacy settings and stricter production CSP rules.
  const [{ createWorker }, workerUrl] = await Promise.all([
    import('tesseract.js'),
    import('tesseract.js/dist/worker.min.js?url'),
  ]);

  let source: Blob = file;
  if (isPdfFile(file)) {
    onProgress?.({ status: 'Opening PDF', progress: 0 });
    source = await renderPdfFirstPage(file);
  }

  onProgress?.({ status: 'Preparing image', progress: 0 });
  const prepared = await preprocessImage(source);
  const worker = await createWorker('eng', 1, {
    workerPath: workerUrl.default,
    workerBlobURL: false,
    logger: (message) => {
      if (message.status === 'recognizing text') {
        onProgress?.({ status: 'Reading card', progress: message.progress });
      } else {
        onProgress?.({ status: 'Loading scanner', progress: message.progress });
      }
    },
  });

  try {
    await worker.setParameters({ preserve_interword_spaces: '1' });
    const { data } = await worker.recognize(prepared);
    return parseBusinessCardText(data.text);
  } finally {
    await worker.terminate();
  }
}

export function countExtractedFields(card: ParsedBusinessCard) {
  const fields = [
    card.firstName,
    card.lastName,
    card.jobTitle,
    card.companyName,
    card.email,
    card.phone,
    card.mobile,
    card.addressLine1,
    card.city,
    card.postalCode,
  ];
  return fields.filter((value) => Boolean(value && value.trim())).length;
}
