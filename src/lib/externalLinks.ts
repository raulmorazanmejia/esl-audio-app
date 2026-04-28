export type ExternalActivityLink = {
  title: string;
  url: string;
};

type ExternalActivityPayload = {
  instructions?: string;
  externalLinks?: ExternalActivityLink[];
};

const HTTP_REGEX = /^https?:\/\//i;

function normalizeLink(raw: unknown): ExternalActivityLink | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as { title?: unknown; url?: unknown };
  const title = String(row.title ?? "").trim();
  const url = String(row.url ?? "").trim();
  if (!title || !url || !HTTP_REGEX.test(url)) return null;
  return { title, url };
}

export function parseExternalActivityData(exampleText: string | null | undefined, externalUrl: string | null | undefined) {
  const fallbackUrl = String(externalUrl ?? "").trim();
  const fallbackLinks = fallbackUrl ? [{ title: "Open activity", url: fallbackUrl }] : [];
  const sourceText = String(exampleText ?? "").trim();
  if (!sourceText) {
    return { instructions: "", externalLinks: fallbackLinks };
  }
  try {
    const parsed = JSON.parse(sourceText) as ExternalActivityPayload;
    const links = Array.isArray(parsed.externalLinks)
      ? parsed.externalLinks.map((link) => normalizeLink(link)).filter((link): link is ExternalActivityLink => Boolean(link))
      : [];
    return {
      instructions: typeof parsed.instructions === "string" ? parsed.instructions : "",
      externalLinks: links.length ? links : fallbackLinks,
    };
  } catch {
    return { instructions: sourceText, externalLinks: fallbackLinks };
  }
}

export function serializeExternalActivityData(instructions: string, externalLinks: ExternalActivityLink[]) {
  return JSON.stringify({
    instructions,
    externalLinks,
  });
}

export function isValidExternalUrl(url: string) {
  return HTTP_REGEX.test(url.trim());
}
