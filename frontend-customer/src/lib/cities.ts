// ============================================================================
// Deutsche Städte mit Geo-Koordinaten
// 
// Wird für Stadt-Autocomplete und Umkreis-Suche verwendet.
// Top 80 DACH-Städte (Deutschland, Österreich, Schweiz).
// ============================================================================

export interface CityEntry {
  name: string;
  lat: number;
  lng: number;
  country: 'DE' | 'AT' | 'CH';
}

export const CITIES: CityEntry[] = [
  // Deutschland — Top 50
  { name: 'Berlin', lat: 52.520008, lng: 13.404954, country: 'DE' },
  { name: 'Hamburg', lat: 53.551086, lng: 9.993682, country: 'DE' },
  { name: 'München', lat: 48.137154, lng: 11.576124, country: 'DE' },
  { name: 'Köln', lat: 50.937531, lng: 6.960279, country: 'DE' },
  { name: 'Frankfurt', lat: 50.110924, lng: 8.682127, country: 'DE' },
  { name: 'Stuttgart', lat: 48.775845, lng: 9.182932, country: 'DE' },
  { name: 'Düsseldorf', lat: 51.227741, lng: 6.773456, country: 'DE' },
  { name: 'Leipzig', lat: 51.339695, lng: 12.373075, country: 'DE' },
  { name: 'Dortmund', lat: 51.513587, lng: 7.465298, country: 'DE' },
  { name: 'Essen', lat: 51.455643, lng: 7.011555, country: 'DE' },
  { name: 'Bremen', lat: 53.079296, lng: 8.801694, country: 'DE' },
  { name: 'Dresden', lat: 51.050409, lng: 13.737262, country: 'DE' },
  { name: 'Hannover', lat: 52.375892, lng: 9.732010, country: 'DE' },
  { name: 'Nürnberg', lat: 49.452102, lng: 11.076665, country: 'DE' },
  { name: 'Duisburg', lat: 51.434407, lng: 6.762329, country: 'DE' },
  { name: 'Bochum', lat: 51.481846, lng: 7.216236, country: 'DE' },
  { name: 'Wuppertal', lat: 51.256213, lng: 7.150764, country: 'DE' },
  { name: 'Bielefeld', lat: 52.030228, lng: 8.532471, country: 'DE' },
  { name: 'Bonn', lat: 50.737430, lng: 7.098207, country: 'DE' },
  { name: 'Münster', lat: 51.960665, lng: 7.626135, country: 'DE' },
  { name: 'Karlsruhe', lat: 49.006890, lng: 8.403653, country: 'DE' },
  { name: 'Mannheim', lat: 49.487459, lng: 8.466040, country: 'DE' },
  { name: 'Augsburg', lat: 48.370545, lng: 10.897790, country: 'DE' },
  { name: 'Wiesbaden', lat: 50.082497, lng: 8.249050, country: 'DE' },
  { name: 'Gelsenkirchen', lat: 51.517744, lng: 7.085717, country: 'DE' },
  { name: 'Mönchengladbach', lat: 51.180519, lng: 6.442233, country: 'DE' },
  { name: 'Braunschweig', lat: 52.268874, lng: 10.526770, country: 'DE' },
  { name: 'Chemnitz', lat: 50.827847, lng: 12.921370, country: 'DE' },
  { name: 'Kiel', lat: 54.323293, lng: 10.122765, country: 'DE' },
  { name: 'Aachen', lat: 50.775346, lng: 6.083887, country: 'DE' },
  { name: 'Halle (Saale)', lat: 51.482777, lng: 11.969721, country: 'DE' },
  { name: 'Magdeburg', lat: 52.120533, lng: 11.627624, country: 'DE' },
  { name: 'Freiburg', lat: 47.999008, lng: 7.842104, country: 'DE' },
  { name: 'Krefeld', lat: 51.339695, lng: 6.585120, country: 'DE' },
  { name: 'Lübeck', lat: 53.865467, lng: 10.686559, country: 'DE' },
  { name: 'Oberhausen', lat: 51.496530, lng: 6.851216, country: 'DE' },
  { name: 'Erfurt', lat: 50.984770, lng: 11.029880, country: 'DE' },
  { name: 'Mainz', lat: 49.992862, lng: 8.247253, country: 'DE' },
  { name: 'Rostock', lat: 54.092442, lng: 12.099147, country: 'DE' },
  { name: 'Kassel', lat: 51.317152, lng: 9.491720, country: 'DE' },
  { name: 'Hagen', lat: 51.367840, lng: 7.463056, country: 'DE' },
  { name: 'Saarbrücken', lat: 49.240386, lng: 6.996932, country: 'DE' },
  { name: 'Hamm', lat: 51.679720, lng: 7.815830, country: 'DE' },
  { name: 'Mülheim an der Ruhr', lat: 51.430629, lng: 6.879894, country: 'DE' },
  { name: 'Potsdam', lat: 52.390568, lng: 13.064473, country: 'DE' },
  { name: 'Ludwigshafen', lat: 49.473442, lng: 8.434822, country: 'DE' },
  { name: 'Oldenburg', lat: 53.143890, lng: 8.213831, country: 'DE' },
  { name: 'Leverkusen', lat: 51.030319, lng: 6.984877, country: 'DE' },
  { name: 'Osnabrück', lat: 52.279911, lng: 8.047179, country: 'DE' },
  { name: 'Solingen', lat: 51.165691, lng: 7.067256, country: 'DE' },
  { name: 'Heidelberg', lat: 49.398750, lng: 8.672434, country: 'DE' },

  // Mittlere Städte (häufig im DACH-Raum nachgefragt)
  { name: 'Darmstadt', lat: 49.872825, lng: 8.651193, country: 'DE' },
  { name: 'Herne', lat: 51.538189, lng: 7.219603, country: 'DE' },
  { name: 'Regensburg', lat: 49.013431, lng: 12.101624, country: 'DE' },
  { name: 'Würzburg', lat: 49.791304, lng: 9.953354, country: 'DE' },
  { name: 'Ingolstadt', lat: 48.765835, lng: 11.423564, country: 'DE' },
  { name: 'Ulm', lat: 48.401820, lng: 9.987608, country: 'DE' },
  { name: 'Heilbronn', lat: 49.142910, lng: 9.218300, country: 'DE' },
  { name: 'Pforzheim', lat: 48.892126, lng: 8.694726, country: 'DE' },
  { name: 'Wolfsburg', lat: 52.422653, lng: 10.786127, country: 'DE' },
  { name: 'Göttingen', lat: 51.541260, lng: 9.915803, country: 'DE' },
  { name: 'Bottrop', lat: 51.523782, lng: 6.929558, country: 'DE' },
  { name: 'Trier', lat: 49.749992, lng: 6.637143, country: 'DE' },
  { name: 'Recklinghausen', lat: 51.614520, lng: 7.197540, country: 'DE' },
  { name: 'Reutlingen', lat: 48.491508, lng: 9.211051, country: 'DE' },
  { name: 'Tübingen', lat: 48.521637, lng: 9.057645, country: 'DE' },
  { name: 'Koblenz', lat: 50.356943, lng: 7.598884, country: 'DE' },
  { name: 'Erlangen', lat: 49.589435, lng: 11.004775, country: 'DE' },
  { name: 'Jena', lat: 50.927054, lng: 11.589237, country: 'DE' },

  // Österreich — Top 6
  { name: 'Wien', lat: 48.208174, lng: 16.373819, country: 'AT' },
  { name: 'Graz', lat: 47.070714, lng: 15.439504, country: 'AT' },
  { name: 'Linz', lat: 48.306938, lng: 14.285830, country: 'AT' },
  { name: 'Salzburg', lat: 47.809490, lng: 13.055010, country: 'AT' },
  { name: 'Innsbruck', lat: 47.269212, lng: 11.404102, country: 'AT' },
  { name: 'Klagenfurt', lat: 46.624399, lng: 14.305843, country: 'AT' },

  // Schweiz — Top 6
  { name: 'Zürich', lat: 47.376886, lng: 8.541694, country: 'CH' },
  { name: 'Genf', lat: 46.204391, lng: 6.143158, country: 'CH' },
  { name: 'Basel', lat: 47.559599, lng: 7.588576, country: 'CH' },
  { name: 'Bern', lat: 46.947975, lng: 7.447447, country: 'CH' },
  { name: 'Lausanne', lat: 46.519962, lng: 6.633597, country: 'CH' },
  { name: 'Luzern', lat: 47.050168, lng: 8.309307, country: 'CH' },
];

// Hilfsfunktion: Stadt-Lookup
export function findCity(name: string): CityEntry | undefined {
  const normalized = name.trim().toLowerCase();
  return CITIES.find((c) => c.name.toLowerCase() === normalized);
}

// Hilfsfunktion: Autocomplete-Filter
export function filterCities(query: string, limit = 8): CityEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return CITIES.slice(0, limit);
  return CITIES.filter((c) => c.name.toLowerCase().includes(q)).slice(0, limit);
}
