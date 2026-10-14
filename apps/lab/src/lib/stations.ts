/** The shift: one incident per station. Only built stations link anywhere. */
export const STATIONS = [
  { slug: 'payments', time: '09:30', name: 'Payments', ready: true },
  { slug: 'kyc', time: '11:00', name: 'New customers', ready: false },
  { slug: 'deposits', time: '13:00', name: 'Deposits', ready: false },
  { slug: 'ai', time: '15:00', name: 'AI support', ready: false },
  { slug: 'books', time: '17:30', name: 'End of shift', ready: false },
] as const
