/** The shift: one incident per station. Only built stations link anywhere. */
export const STATIONS = [
  { slug: 'payments', time: '09:30', ready: true },
  { slug: 'kyc', time: '11:00', ready: false },
  { slug: 'deposits', time: '13:00', ready: false },
  { slug: 'ai', time: '15:00', ready: false },
  { slug: 'books', time: '17:30', ready: false },
] as const
