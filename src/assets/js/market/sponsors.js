/*
 * PAID PLACEMENTS (sponsors) — edit this file to add or change a sponsor.
 * Sponsors appear on the walking ad carriers (sign juggler, balloon kid), on
 * the hanging sign at the first lamp post, and in the SPONSOR line under the
 * street. Every placement is labeled SPONSOR and links out with
 * rel="sponsored". Business listings themselves stay free and unranked.
 * Images (supplied by the sponsor) live in assets/img/sponsors/.
 */
(function () {
  'use strict';
  const TH = (window.TH = window.TH || {});
  const root = (document.documentElement.dataset.root || '');
  TH.SPONSORS = [
    {
      id: 'meringuesuisse',
      name: 'Meringue Suisse',
      label: 'MeringueSuisse.com',
      tagline: 'Swiss meringues, made in Temecula',
      url: 'https://meringuesuisse.com',
      colors: { brand: '#5F6D52', cream: '#FBF9F3' },
      images: {
        sign: root + 'assets/img/sponsors/meringuesuisse-sign.jpg',
        balloon: root + 'assets/img/sponsors/meringuesuisse-balloon.jpg'
      }
    }
  ];
})();
