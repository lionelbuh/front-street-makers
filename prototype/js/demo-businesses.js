/*
 * DEMO CONTENT ONLY.
 * Every record below is a fictional placeholder used to demonstrate the stall
 * component. Names deliberately start with "Sample" so they can never be
 * mistaken for real Temecula businesses. No real photos are used: the profile
 * shows labeled placeholder frames where a business's own photos will go.
 *
 * In Phase 2 these records come from the approved-business database. The shape
 * below is the contract between the data and the stall component.
 */
(function () {
  'use strict';
  const TH = (window.TH = window.TH || {});

  // category: 'home'  = Home-Based Business
  //           'micro' = Independent Micro-Business
  // display:  which illustrated goods the stall shows (bakery, candles, ...)
  // roof:     'awning' (striped canvas) or 'gable' (wooden roof)
  // colors:   [awning stripe A, awning stripe B, counter cloth]
  TH.DEMO_BUSINESSES = [
    {
      id: 'demo-sourdough', valance: 'scallop', flowers: ['#f2c14e','#f4efe4','#d9415a'],
      name: 'Sample Sourdough Co.',
      category: 'home',
      type: 'Home bakery · Cottage Food',
      display: 'bakery',
      roof: 'awning',
      colors: ['#C8902E', '#F2E6CC', '#7C4A2A'],
      chalk: 'Fresh loaves',
      summary: 'Naturally leavened loaves, focaccia and seasonal bakes from a home kitchen.',
      description:
        'This is a demonstration listing. A real home bakery would describe its breads, how ordering works, and its Cottage Food registration in its own words here.',
      area: 'Temecula · porch pickup by arrangement',
      links: { website: true, instagram: true, facebook: false, email: true }
    },
    {
      id: 'demo-candles', flowers: ['#f4efe4','#b9c9b2','#e7c9c2'],
      name: 'Sample Candle Studio',
      category: 'home',
      type: 'Candles & home fragrance',
      display: 'candles',
      roof: 'gable',
      colors: ['#6F8A6A', '#EDE6D2', '#55704F'],
      chalk: 'Hand-poured',
      summary: 'Small-batch soy candles poured in a spare-room studio.',
      description:
        'This is a demonstration listing showing how a home-based maker could present scents, materials and where to order.',
      area: 'Murrieta · ships within the valley',
      links: { website: true, instagram: true, facebook: true, email: false }
    },
    {
      id: 'demo-jewelry', valance: 'fringe', flowers: ['#9a7fc4','#f4efe4','#e86f8a'],
      name: 'Sample Silver Jewelry',
      category: 'micro',
      type: 'Independent artisan · by appointment',
      display: 'jewelry',
      roof: 'awning',
      colors: ['#6B2D45', '#E9D9DC', '#3E2430'],
      chalk: 'Studio visits',
      summary: 'Hand-forged rings and pendants from a one-person bench studio.',
      description:
        'This is a demonstration listing for an owner-operated studio without a retail storefront. Visits would be by appointment only.',
      area: 'Old Town Temecula area · appointments only',
      links: { website: true, instagram: true, facebook: false, email: true }
    },
    {
      id: 'demo-honey', flowers: ['#f2c14e','#f4efe4','#e98a6a'],
      name: 'Sample Honey & Jam',
      category: 'home',
      type: 'Cottage Food · preserves',
      display: 'honey',
      roof: 'gable',
      colors: ['#D9A23A', '#F4EAD0', '#9B6A1E'],
      chalk: 'Local honey',
      summary: 'Wildflower honey and small-batch fruit preserves.',
      description:
        'This is a demonstration listing. A real producer would explain its products, seasons and how to buy.',
      area: 'De Luz & Temecula · market pickup',
      links: { website: false, instagram: true, facebook: true, email: true }
    },
    {
      id: 'demo-ceramics', valance: 'points', flowers: ['#4e6e7e','#f4efe4','#f2c14e'],
      name: 'Sample Ceramics Studio',
      category: 'micro',
      type: 'Small workshop · classes',
      display: 'ceramics',
      roof: 'awning',
      colors: ['#4E6E7E', '#E4E7E1', '#2F4954'],
      chalk: 'Wheel classes',
      summary: 'Functional stoneware and small wheel-throwing classes.',
      description:
        'This is a demonstration listing for a small independent workshop that sells pieces and teaches classes.',
      area: 'Temecula · studio address shared on booking',
      links: { website: true, instagram: true, facebook: true, email: true }
    },
    {
      id: 'demo-soap', flowers: ['#9a7fc4','#e7c9c2','#f4efe4'],
      name: 'Sample Soap Works',
      category: 'home',
      type: 'Handmade soaps',
      display: 'soap',
      roof: 'gable',
      colors: ['#A9798B', '#F1E6E6', '#7D5263'],
      chalk: 'Cold-process',
      summary: 'Cold-process soaps cured for six weeks in a home workshop.',
      description:
        'This is a demonstration listing showing how a handmade-products business could describe its ingredients and ordering.',
      area: 'Menifee & Temecula · local delivery',
      links: { website: true, instagram: true, facebook: false, email: false }
    },
    {
      id: 'demo-succulents', valance: 'scallop', flowers: ['#e98a6a','#f4efe4','#f2c14e'],
      name: 'Sample Succulent Garden',
      category: 'home',
      type: 'Home-based grower',
      display: 'plants',
      roof: 'awning',
      colors: ['#5C7F48', '#EEF0DE', '#3F5B33'],
      chalk: 'Drought-wise',
      summary: 'Propagated succulents and drought-tolerant arrangements.',
      description:
        'This is a demonstration listing for a small home-based producer growing plants in a backyard nursery.',
      area: 'Wildomar · pickup by arrangement',
      links: { website: false, instagram: true, facebook: true, email: true }
    },
    {
      id: 'demo-leather', flowers: ['#d9415a','#f2c14e','#f4efe4'],
      name: 'Sample Leather Workshop',
      category: 'micro',
      type: 'Maker · custom orders',
      display: 'leather',
      roof: 'gable',
      colors: ['#8A5A3B', '#EADCC8', '#5E3B26'],
      chalk: 'Made to order',
      summary: 'Hand-stitched wallets, belts and bags made to order.',
      description:
        'This is a demonstration listing for an independent maker who works from a small shared workshop.',
      area: 'Temecula Valley · custom orders',
      links: { website: true, instagram: true, facebook: false, email: true }
    },
    {
      id: 'demo-quilts', valance: 'points', flowers: ['#d9415a','#f2c14e','#f4efe4'],
      name: 'Sample Quilt Corner',
      category: 'home',
      type: 'Handmade textiles & gifts',
      display: 'textiles',
      roof: 'awning',
      colors: ['#B5563F', '#F3E5D2', '#7E3A2A'],
      chalk: 'Personalized',
      summary: 'Patchwork quilts, table runners and personalized baby gifts.',
      description:
        'This is a demonstration listing for a home-based business making personalized handmade gifts.',
      area: 'Murrieta · ships locally',
      links: { website: true, instagram: false, facebook: true, email: true }
    },
    {
      id: 'demo-watercolor', flowers: ['#4e7ecb','#f4efe4','#f2c14e'],
      name: 'Sample Watercolor Studio',
      category: 'micro',
      type: 'Artist · pop-up',
      display: 'art',
      roof: 'gable',
      colors: ['#3F5E8C', '#E6E8EE', '#2C4266'],
      chalk: 'Valley prints',
      summary: 'Original watercolors and prints of valley landscapes.',
      description:
        'This is a demonstration listing for an independent artist who sells at pop-ups and online.',
      area: 'Temecula & Fallbrook · pop-up events',
      links: { website: true, instagram: true, facebook: true, email: false }
    }
  ];

  TH.CATEGORY = {
    home: { label: 'Home-Based Business', short: 'Home-based' },
    micro: { label: 'Independent Micro-Business', short: 'Micro-business' }
  };
})();
