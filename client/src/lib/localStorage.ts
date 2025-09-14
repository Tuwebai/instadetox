// Servicio para manejar datos locales sin base de datos
export interface LocalUser {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  online: boolean;
  last_seen: string;
}

export interface LocalMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
}

export interface LocalStats {
  total_messages: number;
  unread_messages: number;
  days_active: number;
  detox_score: number;
}

// Claves para localStorage
const STORAGE_KEYS = {
  USERS: 'instadetox_users',
  MESSAGES: 'instadetox_messages',
  STATS: 'instadetox_stats'
};

// Datos por defecto
const DEFAULT_USERS: LocalUser[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    username: 'usuario_ejemplo',
    full_name: 'Usuario Ejemplo',
    avatar_url: 'https://i.pravatar.cc/150?img=1',
    online: true,
    last_seen: new Date().toISOString()
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    username: 'maria_garcia',
    full_name: 'María García',
    avatar_url: 'https://i.pravatar.cc/150?img=2',
    online: false,
    last_seen: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    username: 'carlos_rodriguez',
    full_name: 'Carlos Rodríguez',
    avatar_url: 'https://i.pravatar.cc/150?img=3',
    online: true,
    last_seen: new Date().toISOString()
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    username: 'ana_martinez',
    full_name: 'Ana Martínez',
    avatar_url: 'https://i.pravatar.cc/150?img=4',
    online: false,
    last_seen: new Date(Date.now() - 7200000).toISOString()
  }
];

const DEFAULT_MESSAGES: LocalMessage[] = [
  {
    id: '1',
    sender_id: '00000000-0000-0000-0000-000000000001',
    receiver_id: '00000000-0000-0000-0000-000000000002',
    content: '¡Hola! ¿Cómo va tu proceso de desintoxicación digital?',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    read: true
  },
  {
    id: '2',
    sender_id: '00000000-0000-0000-0000-000000000002',
    receiver_id: '00000000-0000-0000-0000-000000000001',
    content: '¡Muy bien! He reducido mi tiempo en redes sociales a 1 hora al día.',
    created_at: new Date(Date.now() - 82800000).toISOString(),
    read: true
  },
  {
    id: '3',
    sender_id: '00000000-0000-0000-0000-000000000001',
    receiver_id: '00000000-0000-0000-0000-000000000003',
    content: '¿Te gustaría que compartamos algunas estrategias para mejorar la concentración?',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    read: false
  }
];

// Función para inicializar datos por defecto si no existen
function initializeDefaultData() {
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
  }
  
  if (!localStorage.getItem(STORAGE_KEYS.MESSAGES)) {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(DEFAULT_MESSAGES));
  }
}

// Función para obtener usuarios
export function getUsers(): LocalUser[] {
  initializeDefaultData();
  try {
    const users = localStorage.getItem(STORAGE_KEYS.USERS);
    return users ? JSON.parse(users) : DEFAULT_USERS;
  } catch (error) {
    console.error('Error al obtener usuarios del localStorage:', error);
    return DEFAULT_USERS;
  }
}

// Función para obtener mensajes entre dos usuarios
export function getMessages(userId1: string, userId2: string): LocalMessage[] {
  initializeDefaultData();
  try {
    const messages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    const allMessages: LocalMessage[] = messages ? JSON.parse(messages) : DEFAULT_MESSAGES;
    
    return allMessages.filter(msg => 
      (msg.sender_id === userId1 && msg.receiver_id === userId2) ||
      (msg.sender_id === userId2 && msg.receiver_id === userId1)
    );
  } catch (error) {
    console.error('Error al obtener mensajes del localStorage:', error);
    return DEFAULT_MESSAGES.filter(msg => 
      (msg.sender_id === userId1 && msg.receiver_id === userId2) ||
      (msg.sender_id === userId2 && msg.receiver_id === userId1)
    );
  }
}

// Función para agregar un nuevo mensaje
export function addMessage(message: Omit<LocalMessage, 'id' | 'created_at'>): LocalMessage {
  initializeDefaultData();
  try {
    const messages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    const allMessages: LocalMessage[] = messages ? JSON.parse(messages) : DEFAULT_MESSAGES;
    
    const newMessage: LocalMessage = {
      ...message,
      id: Date.now().toString(),
      created_at: new Date().toISOString()
    };
    
    allMessages.push(newMessage);
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(allMessages));
    
    return newMessage;
  } catch (error) {
    console.error('Error al agregar mensaje al localStorage:', error);
    return {
      ...message,
      id: Date.now().toString(),
      created_at: new Date().toISOString()
    };
  }
}

// Función para marcar mensaje como leído
export function markMessageAsRead(messageId: string): boolean {
  try {
    const messages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    if (!messages) return false;
    
    const allMessages: LocalMessage[] = JSON.parse(messages);
    const messageIndex = allMessages.findIndex(msg => msg.id === messageId);
    
    if (messageIndex !== -1) {
      allMessages[messageIndex].read = true;
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(allMessages));
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error al marcar mensaje como leído:', error);
    return false;
  }
}

// Función para obtener estadísticas de un usuario
export function getUserStats(userId: string): LocalStats {
  try {
    const messages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    const allMessages: LocalMessage[] = messages ? JSON.parse(messages) : DEFAULT_MESSAGES;
    
    const userMessages = allMessages.filter(msg => 
      msg.sender_id === userId || msg.receiver_id === userId
    );
    
    const unreadMessages = allMessages.filter(msg => 
      msg.receiver_id === userId && !msg.read
    );
    
    return {
      total_messages: userMessages.length,
      unread_messages: unreadMessages.length,
      days_active: Math.floor(Math.random() * 30) + 1,
      detox_score: Math.floor(Math.random() * 100) + 50
    };
  } catch (error) {
    console.error('Error al obtener estadísticas del usuario:', error);
    return {
      total_messages: 0,
      unread_messages: 0,
      days_active: 1,
      detox_score: 75
    };
  }
}

// Función para limpiar todos los datos
export function clearAllData() {
  localStorage.removeItem(STORAGE_KEYS.USERS);
  localStorage.removeItem(STORAGE_KEYS.MESSAGES);
  localStorage.removeItem(STORAGE_KEYS.STATS);
}

// Función para exportar datos (útil para debugging)
export function exportData() {
  return {
    users: getUsers(),
    messages: localStorage.getItem(STORAGE_KEYS.MESSAGES) ? 
      JSON.parse(localStorage.getItem(STORAGE_KEYS.MESSAGES)!) : DEFAULT_MESSAGES
  };
}
