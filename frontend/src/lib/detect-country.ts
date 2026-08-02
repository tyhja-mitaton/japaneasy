const GEO_SERVICES: { url: string; parse: (data: Record<string, unknown>) => string | null }[] = [
  {
    url: 'https://ipwho.is/',
    parse: (data) => (typeof data.country_code === 'string' ? data.country_code : null),
  },
  {
    url: 'https://ipapi.co/json/',
    parse: (data) => (typeof data.country_code === 'string' ? data.country_code : null),
  },
];

export async function detectCountry(): Promise<string | null> {
  for (const service of GEO_SERVICES) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(service.url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) continue;
      const data = await res.json();
      const code = service.parse(data);
      if (code && /^[A-Za-z]{2}$/.test(code)) {
        return code.toUpperCase();
      }
    } catch {
      continue;
    }
  }
  return null;
}
