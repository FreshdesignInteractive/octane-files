// Sample car for development — import this to seed your Supabase table
export const sampleCar = {
  slug: 'chevrolet-corvette-c1',
  make: 'Chevrolet',
  model: 'Corvette',
  generation: 'C1',
  year_start: 1953,
  year_end: 1962,
  class: 'Sports',
  country: 'USA',
  body_styles: ['Roadster', 'Convertible'],
  drivetrain: 'RWD',
  engine_layout: 'Front-engine',
  units_produced: 69015,
  overview: `The C1 Corvette was Chevrolet's first attempt at an American sports car and the first production vehicle to use a fiberglass body. Unveiled at the 1953 GM Motorama show at the Waldorf Astoria in New York, the car caused a sensation. Early cars were powered by a 235 cu in inline-six — a modest start that belied what the nameplate would become.\n\nThe real turning point came in 1955 when Zora Arkus-Duntov shoehorned a small-block V8 into the engine bay, transforming the Corvette from a styling exercise into a genuine performance machine. By 1957, Rochester fuel injection was available, producing one horsepower per cubic inch — a benchmark that defined the era.\n\nToday the C1 is among the most collected of all American cars, particularly the rare 1953 and 1954 models, and fuel-injected examples from 1957–1962.`,
  hero_image: null,
  gallery_images: [],
  specs: [
    {
      group: 'Engine',
      specs: [
        { label: 'Configuration', value: 'V8, OHV' },
        { label: 'Displacement', value: '283 cu in (4.6 L)' },
        { label: 'Fuel system', value: 'Rochester fuel injection (optional)' },
        { label: 'Output', value: 'Up to 290 hp (216 kW)' },
      ],
    },
    {
      group: 'Performance',
      specs: [
        { label: '0–60 mph', value: '5.7 sec (283 fuelie)' },
        { label: 'Top speed', value: '132 mph (212 km/h)' },
      ],
    },
    {
      group: 'Dimensions',
      specs: [
        { label: 'Wheelbase', value: '102 in (2,591 mm)' },
        { label: 'Length', value: '168 in (4,267 mm)' },
        { label: 'Weight', value: '2,849 lb (1,292 kg)' },
      ],
    },
  ],
  market_data: {
    low: 45000,
    mid: 85000,
    high: 250000,
    currency: 'USD',
    as_of: '2024-01-01',
    notes: 'Fuel-injected 1957–1962 cars command significant premiums. 1953 examples in concours condition exceed $500k.',
  },
  maintenance: `C1 Corvettes are generally straightforward to maintain thanks to a large enthusiast community and excellent parts availability.\n\n**Common issues:** Early fiberglass bodies can develop stress cracks around door frames and windshield pillars. Inspect carefully before purchase. The Rochester fuel injection units on 1957–1962 cars are complex — find a specialist who works on these specifically.\n\n**Parts supply:** Eckler's, Mid America Motorworks, and Corvette Central are the main suppliers. Reproduction parts are widely available for most components.\n\n**Registry:** The National Corvette Restorers Society (NCRS) maintains a comprehensive registry and offers documented judging for restoration authenticity.`,
  resources: [
    { title: 'National Corvette Museum', url: 'https://www.corvettemuseum.org', type: 'archive' },
    { title: 'National Corvette Restorers Society', url: 'https://www.ncrs.org', type: 'club' },
    { title: 'Corvette Central', url: 'https://www.corvettecentral.com', type: 'other' },
  ],
}
