// Conteúdo da landing page pública (rota /). Centralizado aqui para manter os
// componentes de apresentação limpos e o texto fácil de rever/editar.
//
// ⚠️ PREÇOS: espelham o seed de planos em `supabase/seed.sql` (tabela `plans`).
// Se alterares os preços/limites na BD, atualiza também aqui (fonte única de
// verdade comercial para o site). São valores de marketing — a cobrança real
// usa os planos da BD + Stripe.

import {
  Calendar, Globe, Users, Bell, Bot, Wallet, ShieldCheck, UserCog,
  type LucideIcon,
} from 'lucide-react'

// ── Funcionalidades (grelha principal) ───────────────────────────────────────
export interface Feature {
  icon:        LucideIcon
  title:       string
  description: string
}

export const FEATURES: Feature[] = [
  {
    icon: Calendar,
    title: 'Agenda inteligente',
    description: 'Marcações por profissional, sala ou equipamento, com proteção anti-duplo-agendamento e lista de espera.',
  },
  {
    icon: Globe,
    title: 'Portal de marcações 24/7',
    description: 'Um link público para os seus clientes marcarem sozinhos, a qualquer hora, sem telefonemas.',
  },
  {
    icon: Users,
    title: 'Clientes e fichas',
    description: 'Histórico, fichas de tratamento, pacotes e avaliações. Tudo organizado e só visível para a sua equipa.',
  },
  {
    icon: Bell,
    title: 'Lembretes automáticos',
    description: 'Lembretes por WhatsApp que reduzem as faltas e mantêm a sua agenda cheia — sem trabalho manual.',
  },
  {
    icon: Bot,
    title: 'Assistente com IA',
    description: 'Responde a dúvidas e direciona os clientes para o portal. A IA informa e encaminha — nunca marca sozinha.',
  },
  {
    icon: Wallet,
    title: 'Finanças e relatórios',
    description: 'Receitas, métodos de pagamento e relatórios do negócio, com exportação para folha de cálculo.',
  },
  {
    icon: ShieldCheck,
    title: 'Dados isolados e seguros',
    description: 'Cada empresa só vê os seus dados (isolamento multi-tenant), em conformidade com a LGPD e o RGPD.',
  },
  {
    icon: UserCog,
    title: 'Equipa e permissões',
    description: 'Papéis para gestor e colaboradores, com registo de auditoria das ações sensíveis.',
  },
]

// ── Como funciona (3 passos) ──────────────────────────────────────────────────
export interface Step {
  number:      string
  title:       string
  description: string
}

export const STEPS: Step[] = [
  {
    number: '1',
    title: 'Configure em minutos',
    description: 'Um onboarding guiado por tipo de negócio sugere já os seus serviços e a sua equipa.',
  },
  {
    number: '2',
    title: 'Partilhe o seu link',
    description: 'Divulgue o portal de marcações e deixe os clientes reservarem sozinhos, 24 horas por dia.',
  },
  {
    number: '3',
    title: 'Automatize o resto',
    description: 'Lembretes e assistente com IA reduzem faltas e tarefas repetitivas. Você foca-se nos clientes.',
  },
]

// ── Planos (espelham `supabase/seed.sql`) ─────────────────────────────────────
export interface Plan {
  name:         string
  priceMonthly: number   // EUR/mês
  priceYearly:  number   // EUR/ano
  tagline:      string
  features:     string[]
  highlighted?: boolean  // destaque visual ("mais popular")
  badge?:       string
}

export const PLANS: Plan[] = [
  {
    name: 'Gratuito',
    priceMonthly: 0,
    priceYearly: 0,
    tagline: 'Para começar e experimentar.',
    features: [
      'Até 2 recursos (ex.: 1 profissional + 1 sala)',
      'Até 50 clientes',
      'Portal de marcações 24/7',
      'Agenda, serviços e clientes',
    ],
  },
  {
    name: 'Starter',
    priceMonthly: 29,
    priceYearly: 290,
    tagline: 'Para negócios em crescimento.',
    highlighted: true,
    badge: 'Mais popular',
    features: [
      'Até 5 recursos',
      'Até 500 clientes',
      'Lembretes por WhatsApp',
      'Finanças e relatórios',
      'Tudo o que tem o plano Gratuito',
    ],
  },
  {
    name: 'Pro',
    priceMonthly: 79,
    priceYearly: 790,
    tagline: 'Para automatizar com IA.',
    features: [
      'Recursos e clientes ilimitados',
      'Assistente com IA',
      'WhatsApp e automações',
      'Suporte prioritário',
      'Tudo o que tem o plano Starter',
    ],
  },
]

// ── FAQ (respostas honestas, alinhadas ao produto real) ───────────────────────
export interface FaqItem {
  question: string
  answer:   string
}

export const FAQ: FaqItem[] = [
  {
    question: 'Como obtenho acesso?',
    answer: 'O ExodoFlow Pro está em acesso controlado. Contacte-nos e a nossa equipa cria a sua conta — não há registo automático.',
  },
  {
    question: 'Existe um plano gratuito?',
    answer: 'Sim. O plano Gratuito permite começar sem custos, com a agenda, os serviços, os clientes e o portal de marcações.',
  },
  {
    question: 'Funciona em Portugal e no Brasil?',
    answer: 'Sim. A interface adapta-se a português de Portugal e do Brasil, com a moeda e o documento fiscal corretos (NIF ou CPF/CNPJ).',
  },
  {
    question: 'O assistente de IA marca sozinho?',
    answer: 'Não. O assistente informa e direciona o cliente para o portal ou para a sua equipa. As marcações ficam sempre sob o seu controlo.',
  },
  {
    question: 'Os meus dados estão seguros?',
    answer: 'Sim. Cada empresa tem os dados totalmente isolados dos restantes, em conformidade com a LGPD e o RGPD. Não vendemos dados nem usamos rastreio não essencial.',
  },
  {
    question: 'Preciso de instalar alguma coisa?',
    answer: 'Não. É 100% web e funciona no telemóvel e no computador, sem instalação.',
  },
]
