import type { Catalog, Company } from './types';

// 3 cidades em linha: alfa (100 mil hab.), beta (100 mil), gama (25 mil)
// rodovias: alfa-beta 60 km, beta-gama 30 km, alfa-gama 90 km (2 pontos cada)
// modelo único 'mini': shape 'micro', 10 lugares, conforto 1.0, 3 km/l, 2_000_000 centavos
export const testCatalog: Catalog = {
  cities: [
    { id: 'alfa', name: 'Alfa', population: 100_000, lat: -27.0, lng: -49.6, difficulty: 'medio' },
    { id: 'beta', name: 'Beta', population: 100_000, lat: -27.0, lng: -49.0, difficulty: 'facil' },
    { id: 'gama', name: 'Gama', population: 25_000, lat: -27.0, lng: -48.7, difficulty: 'dificil' },
  ],
  models: [
    { id: 'mini', name: 'Mini', shape: 'micro', seats: 10, comfort: 1.0, kmPerLiter: 3, priceCents: 2_000_000 },
  ],
  roads: [
    { id: 'alfa-beta', a: 'alfa', b: 'beta', distanceKm: 60, coords: [[-27.0, -49.6], [-27.0, -49.0]] },
    { id: 'beta-gama', a: 'beta', b: 'gama', distanceKm: 30, coords: [[-27.0, -49.0], [-27.0, -48.7]] },
    { id: 'alfa-gama', a: 'alfa', b: 'gama', distanceKm: 90, coords: [[-27.0, -49.6], [-27.0, -48.7]] },
  ],
};

export const testCompany: Company = {
  name: 'Expresso Teste',
  hqCityId: 'alfa',
  primaryColor: '#ff7a00',
  secondaryColor: '#ffffff',
  logo: { kind: 'icon', iconId: 'bus' },
  defaultLivery: 'diagonal',
};
