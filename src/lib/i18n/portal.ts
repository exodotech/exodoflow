// Traduções do portal público de marcação (PT / EN / ES).
// Adicionar nova língua: criar objecto com o mesmo tipo e incluir em PORTAL_STRINGS.
export type PortalLang = 'pt' | 'en' | 'es'

export interface PortalStrings {
  bookingPortal: string
  secureBooking: string
  unavailable: string
  stepService: string
  stepDateTime: string
  stepDetails: string
  stepConfirmed: string
  chooseService: string
  noServices: string
  min: string
  from: string
  selectService: string
  chooseDate: string
  chooseTime: string
  loadingSlots: string
  noSlots: string
  noSlotsHint: string
  changeDate: string
  yourDetails: string
  bookingSummary: string
  nameLabel: string
  namePlaceholder: string
  phoneLabel: string
  phonePlaceholder: string
  nameRequired: string
  confirmButton: string
  sending: string
  requestSent: string
  successDetail: string
  confirmationNote: string
  makeAnother: string
  connectionError: string
  back: string
}

const pt: PortalStrings = {
  bookingPortal:   'Marcação online',
  secureBooking:   'Marcação rápida e segura',
  unavailable:     'Este portal de marcações não está disponível de momento.',
  stepService:     'Serviço',
  stepDateTime:    'Data e Hora',
  stepDetails:     'Os seus dados',
  stepConfirmed:   'Confirmado',
  chooseService:   'Escolha o serviço',
  noServices:      'Sem serviços disponíveis de momento.',
  min:             'min',
  from:            'desde',
  selectService:   'Selecionar',
  chooseDate:      'Escolha o dia',
  chooseTime:      'Horários disponíveis',
  loadingSlots:    'A procurar horários...',
  noSlots:         'Sem horários disponíveis',
  noSlotsHint:     'Tente outra data para ver horários disponíveis.',
  changeDate:      'Mudar data',
  yourDetails:     'Os seus dados',
  bookingSummary:  'Resumo da marcação',
  nameLabel:       'Nome completo',
  namePlaceholder: 'O seu nome',
  phoneLabel:      'Telefone (opcional)',
  phonePlaceholder:'+351 000 000 000',
  nameRequired:    'Por favor introduza o seu nome.',
  confirmButton:   'Confirmar marcação',
  sending:         'A confirmar...',
  requestSent:     'Pedido enviado!',
  successDetail:   'A sua marcação foi registada com sucesso.',
  confirmationNote:'irá confirmar em breve por mensagem.',
  makeAnother:     'Fazer outra marcação',
  connectionError: 'Erro de ligação. Tente novamente.',
  back:            'Voltar',
}

const en: PortalStrings = {
  bookingPortal:   'Online booking',
  secureBooking:   'Fast and secure booking',
  unavailable:     'This booking portal is currently unavailable.',
  stepService:     'Service',
  stepDateTime:    'Date & Time',
  stepDetails:     'Your details',
  stepConfirmed:   'Confirmed',
  chooseService:   'Choose a service',
  noServices:      'No services available at the moment.',
  min:             'min',
  from:            'from',
  selectService:   'Select',
  chooseDate:      'Choose a date',
  chooseTime:      'Available times',
  loadingSlots:    'Looking for available times...',
  noSlots:         'No times available',
  noSlotsHint:     'Try a different date to see available times.',
  changeDate:      'Change date',
  yourDetails:     'Your details',
  bookingSummary:  'Booking summary',
  nameLabel:       'Full name',
  namePlaceholder: 'Your name',
  phoneLabel:      'Phone (optional)',
  phonePlaceholder:'+44 000 000 0000',
  nameRequired:    'Please enter your name.',
  confirmButton:   'Confirm booking',
  sending:         'Confirming...',
  requestSent:     'Request sent!',
  successDetail:   'Your booking has been successfully registered.',
  confirmationNote:'will confirm shortly via message.',
  makeAnother:     'Make another booking',
  connectionError: 'Connection error. Please try again.',
  back:            'Back',
}

const es: PortalStrings = {
  bookingPortal:   'Reserva online',
  secureBooking:   'Reserva rápida y segura',
  unavailable:     'Este portal de reservas no está disponible en este momento.',
  stepService:     'Servicio',
  stepDateTime:    'Fecha y hora',
  stepDetails:     'Sus datos',
  stepConfirmed:   'Confirmado',
  chooseService:   'Elige el servicio',
  noServices:      'Sin servicios disponibles en este momento.',
  min:             'min',
  from:            'desde',
  selectService:   'Seleccionar',
  chooseDate:      'Elige una fecha',
  chooseTime:      'Horarios disponibles',
  loadingSlots:    'Buscando horarios...',
  noSlots:         'Sin horarios disponibles',
  noSlotsHint:     'Prueba otra fecha para ver horarios disponibles.',
  changeDate:      'Cambiar fecha',
  yourDetails:     'Sus datos',
  bookingSummary:  'Resumen de la reserva',
  nameLabel:       'Nombre completo',
  namePlaceholder: 'Su nombre',
  phoneLabel:      'Teléfono (opcional)',
  phonePlaceholder:'+34 000 000 000',
  nameRequired:    'Por favor introduzca su nombre.',
  confirmButton:   'Confirmar reserva',
  sending:         'Confirmando...',
  requestSent:     '¡Solicitud enviada!',
  successDetail:   'Su reserva ha sido registrada con éxito.',
  confirmationNote:'confirmará pronto por mensaje.',
  makeAnother:     'Hacer otra reserva',
  connectionError: 'Error de conexión. Inténtelo de nuevo.',
  back:            'Volver',
}

export const PORTAL_STRINGS: Record<PortalLang, PortalStrings> = { pt, en, es }

export function detectPortalLang(param?: string | null): PortalLang {
  const v = param?.toLowerCase()
  if (v === 'en' || v === 'es' || v === 'pt') return v
  if (typeof navigator !== 'undefined') {
    const nav = navigator.language.toLowerCase()
    if (nav.startsWith('en')) return 'en'
    if (nav.startsWith('es')) return 'es'
  }
  return 'pt'
}
