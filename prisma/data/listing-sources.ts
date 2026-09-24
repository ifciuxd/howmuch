/**
 * Starting points for `npm run import:listings`.
 *
 * Public search-result pages; the importer reads the homes shown on each page
 * (one polite request per page) and respects robots.txt and rate limits.
 * Edit freely — add cities by adding URLs, no code changes needed.
 */
export const LISTING_SOURCES: Array<{ city: string; urls: string[] }> = [
  { city: "Gdańsk", urls: ["https://www.otodom.pl/pl/wyniki/sprzedaz/mieszkanie/pomorskie/gdansk/gdansk/gdansk"] },
  { city: "Gdynia", urls: ["https://www.otodom.pl/pl/wyniki/sprzedaz/mieszkanie/pomorskie/gdynia/gdynia/gdynia"] },
  { city: "Sopot", urls: ["https://www.otodom.pl/pl/wyniki/sprzedaz/mieszkanie/pomorskie/sopot/sopot/sopot"] },
  { city: "Warszawa", urls: ["https://www.otodom.pl/pl/wyniki/sprzedaz/mieszkanie/mazowieckie/warszawa/warszawa/warszawa"] },
  { city: "Kraków", urls: ["https://www.otodom.pl/pl/wyniki/sprzedaz/mieszkanie/malopolskie/krakow/krakow/krakow"] },
  { city: "Wrocław", urls: ["https://www.otodom.pl/pl/wyniki/sprzedaz/mieszkanie/dolnoslaskie/wroclaw/wroclaw/wroclaw"] },
  { city: "Poznań", urls: ["https://www.otodom.pl/pl/wyniki/sprzedaz/mieszkanie/wielkopolskie/poznan/poznan/poznan"] },
  { city: "Łódź", urls: ["https://www.otodom.pl/pl/wyniki/sprzedaz/mieszkanie/lodzkie/lodz/lodz/lodz"] },
  { city: "Zakopane", urls: ["https://www.otodom.pl/pl/wyniki/sprzedaz/dom/malopolskie/tatrzanski/zakopane/zakopane"] },
  { city: "Gdańsk (OLX)", urls: ["https://www.olx.pl/nieruchomosci/mieszkania/sprzedaz/gdansk/"] },
];
