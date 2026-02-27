export interface PrivacySection {
  id: string;
  title: string;
  summary: string;
  points: string[];
}

export interface PrivacyFaqItem {
  id: string;
  question: string;
  answer: string;
}

export const PRIVACY_LAST_UPDATED = "27 de febrero de 2026";

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    id: "resumen",
    title: "Resumen de la política",
    summary: "Esta política explica cómo Instadetox trata tus datos para operar la app de forma segura y transparente.",
    points: [
      "Procesamos únicamente datos necesarios para funcionalidades reales de la plataforma.",
      "Aplicamos minimización: menos datos, menos exposición.",
      "No vendemos datos personales a terceros.",
    ],
  },
  {
    id: "datos-recopilados",
    title: "Datos que recopilamos",
    summary: "Recopilamos datos que ingresás y eventos técnicos de uso para seguridad, rendimiento y personalización básica.",
    points: [
      "Perfil: nombre, username, bio, avatar y enlaces que publicás voluntariamente.",
      "Contenido: publicaciones, comentarios, likes, guardados, follows y mensajes.",
      "Telemetría funcional: eventos de uso, errores y métricas de rendimiento.",
    ],
  },
  {
    id: "uso-de-datos",
    title: "Cómo usamos tus datos",
    summary: "Usamos los datos para proveer funciones centrales, moderación y mejora continua del servicio.",
    points: [
      "Mostrar feed, perfiles, notificaciones y relaciones entre cuentas.",
      "Prevenir abuso, spam y actividades fraudulentas.",
      "Resolver incidentes, depurar errores y optimizar tiempos de respuesta.",
    ],
  },
  {
    id: "comparticion",
    title: "Cuándo compartimos información",
    summary: "La compartición se limita a proveedores operativos y requerimientos legales válidos.",
    points: [
      "Proveedores de infraestructura (hosting, almacenamiento, monitoreo) bajo contrato.",
      "Autoridades competentes solo cuando la ley lo exige.",
      "Nunca compartimos por motivos comerciales de venta de datos.",
    ],
  },
  {
    id: "controles",
    title: "Controles disponibles para vos",
    summary: "Tenés herramientas para editar, descargar y solicitar eliminación de datos dentro del alcance legal aplicable.",
    points: [
      "Editar perfil, gestionar contenido y revisar actividad en la cuenta.",
      "Controlar notificaciones y visibilidad de determinadas interacciones.",
      "Solicitar baja o eliminación de cuenta desde soporte.",
    ],
  },
  {
    id: "retencion",
    title: "Retención y eliminación",
    summary: "Conservamos información el tiempo necesario para operar el servicio, cumplir obligaciones y proteger la seguridad.",
    points: [
      "Los datos activos se conservan mientras la cuenta esté operativa.",
      "Registros técnicos críticos pueden mantenerse por periodos acotados para auditoría y seguridad.",
      "Cuando aplica eliminación, se ejecuta por etapas con controles de integridad.",
    ],
  },
  {
    id: "seguridad",
    title: "Seguridad y protección",
    summary: "Aplicamos medidas técnicas y organizativas para reducir riesgo de acceso no autorizado o pérdida de datos.",
    points: [
      "Controles de acceso por rol y políticas de mínimo privilegio.",
      "Monitoreo de eventos sensibles y trazabilidad de acciones críticas.",
      "Mecanismos de resiliencia, respaldo y recuperación operativa.",
    ],
  },
  {
    id: "contacto",
    title: "Contacto de privacidad",
    summary: "Si tenés dudas o querés ejercer derechos sobre tus datos, podés contactarnos por canales oficiales.",
    points: [
      "Email: privacidad@instadetox.app",
      "Panel de ayuda dentro de la app en la sección Más.",
      "Tiempo de respuesta sujeto a complejidad y normativa aplicable.",
    ],
  },
];

export const PRIVACY_FAQ: PrivacyFaqItem[] = [
  {
    id: "faq-1",
    question: "¿Instadetox vende mis datos?",
    answer: "No. Instadetox no comercializa datos personales de usuarios.",
  },
  {
    id: "faq-2",
    question: "¿Puedo pedir eliminación de mi cuenta?",
    answer: "Sí. Podés solicitarla desde soporte y se procesa con controles de seguridad y validación.",
  },
  {
    id: "faq-3",
    question: "¿Qué pasa con logs técnicos?",
    answer: "Se conservan por plazos limitados para seguridad, auditoría y diagnóstico de incidentes.",
  },
];
