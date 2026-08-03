// ---------------------------------------------------------------------------
// Single source of truth for external links, provenance, and TBD facts.
// Swap the PLACEHOLDER values here once the owner confirms them — nothing else
// in the app hard-codes a URL, meetup detail, or run size.
// ---------------------------------------------------------------------------

export const site = {
  name: 'J++Device',
  os: 'JPPDOS',
  domain: 'jppdevice.by.m4l3vi.ch',
  url: 'https://jppdevice.by.m4l3vi.ch',
  tagline: 'A pocket computer you actually own the software of.',
  makers: 'Claude & m4l3vich',
  firmwareVersion: 'v1.0-RTM',

  // Limited run — TBD; firmware references 20 in examples. PLACEHOLDER.
  run: {
    size: 20,
    exampleUnit: '07 / 20',
    confirmed: false, // flip once the owner confirms the real number
  },

  // J++Meetup 2026 — details PLACEHOLDER until confirmed.
  meetup: {
    name: 'J++Meetup 2026',
    city: 'Moscow',
    year: 2026,
    date: 'TBA', // PLACEHOLDER
    confirmed: false,
  },

  // External links — all PLACEHOLDER GitHub URLs until the owner provides real ones.
  links: {
    firmware: 'https://github.com/jppteam/jppdos',
    appDocs: 'https://github.com/jppteam/jppdos/tree/master/docs',
    cad: 'https://github.com/jppteam/jppdevice-cad',
    webFlasher: '#/manager', // J++Device Manager (Beta)
    webUi: '#/manager', // J++Device Manager (Beta)
    manager: '#/manager', // J++Device Manager (Beta)
    verify: '#', // Limited Run verification page — ships later (roadmap)
  },
}

export default site
