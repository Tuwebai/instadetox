import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const QUOTES = [
  {
    text: "La tecnología puede ser nuestra mejor aliada, pero también es importante saber cuándo desconectar y disfrutar del mundo real.",
    author: "Cal Newport"
  },
  {
    text: "Vivimos en la era digital, pero nuestras mentes y cuerpos siguen perteneciendo al mundo analógico.",
    author: "Nicholas Carr"
  },
  {
    text: "La simplicidad es la sofisticación suprema.",
    author: "Leonardo da Vinci"
  },
  {
    text: "Menos, pero mejor.",
    author: "Dieter Rams"
  },
  {
    text: "La atención es el recurso más escaso y valioso que tenemos.",
    author: "Adam Gazzaley"
  },
  {
    text: "Desconéctate para reconectar contigo mismo.",
    author: "Tuwebai"
  },
  {
    text: "Tu atención es tu activo más valioso. No la regales a las notificaciones.",
    author: "Tuwebai"
  },
  {
    text: "La tecnología es un excelente siervo, pero un amo terrible.",
    author: "Tuwebai"
  },
  {
    text: "Respira. El mundo digital seguirá ahí cuando regreses.",
    author: "Tuwebai"
  },
  {
    text: "Calidad de vida es cuando el tiempo en pantalla no supera el tiempo de vida.",
    author: "Tuwebai"
  },
  {
    text: "El descanso no es pereza, es la recarga necesaria de tu mente.",
    author: "Tuwebai"
  },
  {
    text: "Apaga el ruido para escuchar tu propia voz.",
    author: "Tuwebai"
  },
  {
    text: "La vida real sucede cuando la pantalla está en negro.",
    author: "Tuwebai"
  },
  {
    text: "Menos 'me gusta', más momentos vividos.",
    author: "Tuwebai"
  },
  {
    text: "La verdadera desconexión es un lujo moderno.",
    author: "Tuwebai"
  },
  {
    text: "No dejes que la urgencia de lo digital opaque lo importante de lo humano.",
    author: "Tuwebai"
  },
  {
    text: "El enfoque es la nueva inteligencia.",
    author: "Tuwebai"
  },
  {
    text: "Revisa tus redes con propósito, no por hábito.",
    author: "Tuwebai"
  },
  {
    text: "La multitarea es el arte de distraerse eficientemente.",
    author: "Tuwebai"
  },
  {
    text: "Una mente despejada es más creativa que una conectada.",
    author: "Tuwebai"
  },
  {
    text: "Elige la concentración sobre la distracción.",
    author: "Tuwebai"
  },
  {
    text: "Tu valor no se mide en seguidores.",
    author: "Tuwebai"
  },
  {
    text: "La información no es conocimiento; la sabiduría es saber cuándo ignorarla.",
    author: "Tuwebai"
  },
  {
    text: "Sé el dueño de tu tecnología, no su esclavo.",
    author: "Tuwebai"
  },
  {
    text: "La presencia es el mejor regalo que puedes dar a los demás.",
    author: "Tuwebai"
  },
  {
    text: "Desconecta el Wi-Fi, conecta con tu entorno.",
    author: "Tuwebai"
  },
  {
    text: "El silencio mental es el mayor lujo de la era digital.",
    author: "Tuwebai"
  },
  {
    text: "La comparación es la ladrona de la alegría; especialmente en redes.",
    author: "Tuwebai"
  },
  {
    text: "Disfruta el momento sin necesidad de compartirlo.",
    author: "Tuwebai"
  },
  {
    text: "Tu salud mental es más importante que estar actualizado.",
    author: "Tuwebai"
  },
  {
    text: "La tecnología debe mejorar tu vida, no reemplazarla.",
    author: "Tuwebai"
  },
  {
    text: "Mirar a los ojos es mejor que mirar a la pantalla.",
    author: "Tuwebai"
  },
  {
    text: "Haz una desintoxicación digital para renovar tu perspectiva.",
    author: "Tuwebai"
  },
  {
    text: "La calma se encuentra fuera de la red.",
    author: "Tuwebai"
  },
  {
    text: "Prioriza la realidad sobre la representación.",
    author: "Tuwebai"
  }
];


export function getRandomQuote() {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

export const NAVIGATION_ITEMS = [
  { name: "Inicio", icon: "home", path: "/inicio" },
  { name: "Búsqueda", icon: "search", path: "/busqueda" },
  { name: "Mensajes", icon: "message-circle", path: "/direct/inbox" },
  { name: "Notificaciones", icon: "bell", path: "/notificaciones" },
  { name: "Crear", icon: "plus-circle", path: "/crear" },
  { name: "Perfil", icon: "user", path: "/perfil" },
  { name: "Más", icon: "more-horizontal", path: "/mas" }
];

