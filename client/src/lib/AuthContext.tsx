import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Definir el tipo User localmente
export interface User {
  id: string;
  email?: string;
  username?: string;
  avatar_url?: string;
  full_name?: string;
  created_at?: string;
  last_seen?: string;
  online?: boolean;
}

interface AuthContextProps {
  user: User | null;
  loading: boolean;
  error: Error | null;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

// Usuario ficticio para desarrollo
const DEV_USER: User = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'usuario@ejemplo.com',
  username: 'usuario_ejemplo',
  avatar_url: 'https://i.pravatar.cc/150?img=1',
  full_name: 'Usuario Ejemplo',
  created_at: new Date().toISOString(),
  last_seen: new Date().toISOString(),
  online: true,
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Cargar el usuario al iniciar
  useEffect(() => {
    async function loadUser() {
      try {
        setLoading(true);
        
        console.log('Modo desarrollo activado, usando usuario ficticio');
        // Simular un pequeño retraso
        setTimeout(() => {
          setUser(DEV_USER);
          setLoading(false);
        }, 500);
      } catch (err) {
        console.error('Error al cargar el usuario:', err);
        setError(err as Error);
        setUser(DEV_USER);
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  // Iniciar sesión con correo electrónico
  const signIn = async (email: string) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Modo desarrollo activado, iniciando sesión con usuario ficticio');
      // Simular un pequeño retraso
      setTimeout(() => {
        setUser(DEV_USER);
        setLoading(false);
      }, 500);
    } catch (err) {
      console.error('Error al iniciar sesión:', err);
      setError(err as Error);
      setUser(DEV_USER);
      setLoading(false);
    }
  };

  // Cerrar sesión
  const signOut = async () => {
    try {
      setLoading(true);
      
      console.log('Modo desarrollo activado, cerrando sesión ficticia');
      // Simular un pequeño retraso
      setTimeout(() => {
        setUser(null);
        setLoading(false);
      }, 500);
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
      setError(err as Error);
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    error,
    signIn,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
