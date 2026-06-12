// Consentimento RGPD/LGPD — definições partilhadas pelo frontend.
//
// IMPORTANTE: MARKETING_CONSENT_VERSION tem de ficar sincronizada com a função
// current_marketing_consent_version() na migração 0014. Sempre que o texto de
// consentimento apresentado ao cliente mudar, incrementar AMBOS (aqui e na BD)
// — assim cada registo em legal_consents fica ligado à versão exacta do texto
// que o cliente viu.
export const MARKETING_CONSENT_VERSION = 'marketing-v1'

// Texto único de consentimento de marketing (fonte de verdade da UI).
export const MARKETING_CONSENT_TEXT =
  'Aceito receber comunicações de marketing, promoções e novidades por WhatsApp, SMS ou email.'

// Nota operacional — comunicações de serviço não dependem do consentimento de marketing.
export const OPERATIONAL_COMMS_NOTE =
  'Lembretes e confirmações de marcação podem ser enviados para execução do serviço, ' +
  'mesmo sem consentimento de marketing, conforme configuração legal do tenant.'
