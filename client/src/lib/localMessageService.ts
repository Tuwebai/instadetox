import { getUsers, getMessages, addMessage, markMessageAsRead } from './localStorage';

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

export interface Contact {
  id: string;
  name: string;
  avatar: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  online: boolean;
}

export interface ChatMessage {
  id: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
  read: boolean;
}

// Servicio local para mensajes
export const localMessageService = {
  // Obtener lista de contactos
  async getContacts(): Promise<Contact[]> {
    const users = getUsers();
    const currentUserId = users[0]?.id || '00000000-0000-0000-0000-000000000001';
    
    return users
      .filter(user => user.id !== currentUserId)
      .map(user => ({
        id: user.id,
        name: user.full_name,
        avatar: user.avatar_url,
        lastMessage: '',
        lastMessageTime: user.last_seen,
        unreadCount: 0,
        online: user.online
      }));
  },

  // Obtener mensajes entre dos usuarios
  async getMessages(userId1: string, userId2: string): Promise<ChatMessage[]> {
    const messages = getMessages(userId1, userId2);
    const currentUserId = userId1;
    
    return messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      timestamp: msg.created_at,
      isOwn: msg.sender_id === currentUserId,
      read: msg.read
    }));
  },

  // Enviar mensaje
  async sendMessage(receiverId: string, content: string): Promise<LocalMessage> {
    const currentUserId = '00000000-0000-0000-0000-000000000001';
    
    return addMessage({
      sender_id: currentUserId,
      receiver_id: receiverId,
      content,
      read: false
    });
  },

  // Marcar mensaje como leído
  async markAsRead(messageId: string): Promise<boolean> {
    return markMessageAsRead(messageId);
  },

  // Suscribirse a mensajes (simulado)
  subscribeToMessages(callback: (message: LocalMessage) => void) {
    // Simular suscripción en tiempo real
    const interval = setInterval(() => {
      // No hacer nada por ahora, solo mantener la suscripción activa
    }, 30000);
    
    return {
      unsubscribe: () => clearInterval(interval)
    };
  }
};

// Servicio local para usuarios
export const localUserService = {
  // Obtener usuario actual
  async getCurrentUser(): Promise<LocalUser | null> {
    const users = getUsers();
    return users[0] || null;
  },

  // Obtener usuario por ID
  async getUserById(id: string): Promise<LocalUser | null> {
    const users = getUsers();
    return users.find(user => user.id === id) || null;
  }
};
