// Sistema de autenticación local para desarrollo
export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url: string;
  full_name: string;
  created_at: string;
  last_seen: string;
  online: boolean;
  password?: string; // Solo para desarrollo local
}

// Usuario real para desarrollo
export const REAL_USER: User = {
  id: 'tuwebai-user-001',
  email: 'tuwebai@gmail.com',
  username: 'tuwebai',
  avatar_url: 'https://i.pravatar.cc/150?img=1',
  full_name: 'TuWebAI Developer',
  created_at: new Date().toISOString(),
  last_seen: new Date().toISOString(),
  online: true,
  password: 'hola123' // Solo para desarrollo
};

// Simular base de datos local
const USERS_DB: User[] = [REAL_USER];

export class LocalAuthService {
  private static instance: LocalAuthService;
  private currentUser: User | null = null;

  static getInstance(): LocalAuthService {
    if (!LocalAuthService.instance) {
      LocalAuthService.instance = new LocalAuthService();
    }
    return LocalAuthService.instance;
  }

  // Iniciar sesión con email y contraseña
  async signIn(email: string, password: string): Promise<{ user: User | null; error?: string }> {
    try {
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 500));

      const user = USERS_DB.find(u => u.email === email && u.password === password);
      
      if (!user) {
        return { user: null, error: 'Credenciales incorrectas' };
      }

      // Actualizar last_seen
      user.last_seen = new Date().toISOString();
      user.online = true;
      
      this.currentUser = { ...user };
      delete this.currentUser.password; // No devolver la contraseña

      // Guardar en localStorage
      localStorage.setItem('instadetox_user', JSON.stringify(this.currentUser));
      localStorage.setItem('instadetox_auth', 'true');

      console.log('Usuario autenticado:', this.currentUser.email);
      return { user: this.currentUser };
    } catch (error) {
      console.error('Error en signIn:', error);
      return { user: null, error: 'Error interno del servidor' };
    }
  }

  // Cerrar sesión
  async signOut(): Promise<void> {
    try {
      if (this.currentUser) {
        // Actualizar estado offline
        const user = USERS_DB.find(u => u.id === this.currentUser!.id);
        if (user) {
          user.online = false;
          user.last_seen = new Date().toISOString();
        }
      }

      this.currentUser = null;
      localStorage.removeItem('instadetox_user');
      localStorage.removeItem('instadetox_auth');
      
      console.log('Usuario desautenticado');
    } catch (error) {
      console.error('Error en signOut:', error);
    }
  }

  // Obtener usuario actual
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Cargar usuario desde localStorage
  async loadUser(): Promise<User | null> {
    try {
      const storedUser = localStorage.getItem('instadetox_user');
      const isAuthenticated = localStorage.getItem('instadetox_auth') === 'true';

      if (storedUser && isAuthenticated) {
        this.currentUser = JSON.parse(storedUser);
        
        // Actualizar last_seen
        if (this.currentUser) {
          const user = USERS_DB.find(u => u.id === this.currentUser!.id);
          if (user) {
            user.last_seen = new Date().toISOString();
            user.online = true;
          }
        }

        console.log('Usuario cargado desde localStorage:', this.currentUser?.email);
        return this.currentUser;
      }

      return null;
    } catch (error) {
      console.error('Error al cargar usuario:', error);
      return null;
    }
  }

  // Verificar si está autenticado
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  // Actualizar perfil de usuario
  async updateProfile(updates: Partial<User>): Promise<{ user: User | null; error?: string }> {
    try {
      if (!this.currentUser) {
        return { user: null, error: 'No hay usuario autenticado' };
      }

      // Actualizar en la base de datos local
      const user = USERS_DB.find(u => u.id === this.currentUser!.id);
      if (user) {
        Object.assign(user, updates);
        this.currentUser = { ...user };
        delete this.currentUser.password;

        // Actualizar localStorage
        localStorage.setItem('instadetox_user', JSON.stringify(this.currentUser));
      }

      return { user: this.currentUser };
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      return { user: null, error: 'Error al actualizar perfil' };
    }
  }
}

// Instancia singleton
export const localAuthService = LocalAuthService.getInstance();
