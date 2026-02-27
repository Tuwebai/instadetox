export type PrivacySidePrimaryIcon = "home" | "search" | "controls" | "topics" | "resources";

export interface PrivacySidePrimaryItem {
  id: string;
  label: string;
  href: string;
  icon: PrivacySidePrimaryIcon;
  sectionId?: string;
}

export interface PrivacyPolicyNavItem {
  id: string;
  label: string;
  href: string;
  sectionId?: string;
}

export const PRIVACY_SIDE_PRIMARY_ITEMS: PrivacySidePrimaryItem[] = [
  {
    id: "privacy-home",
    label: "Inicio del Centro de privacidad",
    href: "/",
    icon: "home",
    sectionId: "resumen",
  },
  {
    id: "privacy-search",
    label: "Buscar",
    href: "/search/",
    icon: "search",
  },
  {
    id: "privacy-controls",
    label: "Opciones de privacidad frecuentes",
    href: "/controls/",
    icon: "controls",
    sectionId: "controles",
  },
  {
    id: "privacy-topics",
    label: "Temas sobre privacidad",
    href: "/guide/",
    icon: "topics",
    sectionId: "datos-recopilados",
  },
  {
    id: "privacy-resources",
    label: "Más recursos de privacidad",
    href: "/resources/",
    icon: "resources",
    sectionId: "contacto",
  },
];

export const PRIVACY_POLICY_ITEMS: PrivacyPolicyNavItem[] = [
  {
    id: "p-0",
    label: "¿Qué es la Política de privacidad y qué cubre?",
    href: "/policy/?section_id=0-WhatIsThePrivacy",
    sectionId: "resumen",
  },
  {
    id: "p-1",
    label: "¿Qué información recopilamos?",
    href: "/policy/?section_id=1-WhatInformationDoWe",
    sectionId: "datos-recopilados",
  },
  {
    id: "p-2",
    label: "¿Cómo usamos tu información?",
    href: "/policy/?section_id=2-HowDoWeUse",
    sectionId: "uso-de-datos",
  },
  {
    id: "p-3",
    label: "¿Cómo se comparte tu información en los Productos de Meta o con socios integrados?",
    href: "/policy/?section_id=3-HowIsYourInformation",
    sectionId: "comparticion",
  },
  {
    id: "p-4",
    label: "¿Cómo compartimos información con terceros?",
    href: "/policy/?section_id=4-HowDoWeShare",
    sectionId: "comparticion",
  },
  {
    id: "p-5",
    label: "¿Cómo trabajan en conjunto las empresas de Meta?",
    href: "/policy/?section_id=5-HowDoTheMeta",
    sectionId: "uso-de-datos",
  },
  {
    id: "p-6",
    label: "¿Cómo puedes administrar o eliminar tu información, y ejercer tus derechos?",
    href: "/policy/?section_id=6-HowCanYouManage",
    sectionId: "controles",
  },
  {
    id: "p-8",
    label: "¿Cuánto tiempo conservamos tu información?",
    href: "/policy/?section_id=8-HowLongDoWe",
    sectionId: "retencion",
  },
  {
    id: "p-9",
    label: "¿Cómo transferimos información?",
    href: "/policy/?section_id=9-HowDoWeTransfer",
    sectionId: "seguridad",
  },
  {
    id: "p-10",
    label: "¿Cómo respondemos a solicitudes legales, cumplimos con la legislación aplicable y evitamos daños?",
    href: "/policy/?section_id=10-HowDoWeRespond",
    sectionId: "seguridad",
  },
  {
    id: "p-11",
    label: "¿Cómo sabrás si la Política cambió?",
    href: "/policy/?section_id=11-HowWillYouKnow",
    sectionId: "resumen",
  },
  {
    id: "p-13",
    label: "¿Cómo puedes hacerle llegar tus dudas a Meta?",
    href: "/policy/?section_id=13-HowToContactMeta",
    sectionId: "contacto",
  },
  {
    id: "p-ar",
    label: "Aviso de privacidad de Argentina",
    href: "/policy/?section_id=2025%2F07-ArgentinaPrivacyNoticeLearn",
    sectionId: "contacto",
  },
  {
    id: "p-19",
    label: "Por qué y cómo tratamos tu información",
    href: "/policy/?section_id=19-WhyAndHowWe",
    sectionId: "uso-de-datos",
  },
];

export const PRIVACY_OTHER_LABEL = "Otras políticas y artículos";
