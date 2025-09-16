import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { localAuthService, User } from './localAuth';

interface AuthContextProps {
  user: User | null;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

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
        
        console.log('Cargando usuario desde autenticación local...');
        const user = await localAuthService.loadUser();
        
        if (user) {
          setUser(user);
          console.log('Usuario cargado:', user.email);
        } else {
          console.log('No hay usuario autenticado');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error al cargar el usuario:', err);
        setError(err as Error);
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  // Iniciar sesión con correo electrónico y contraseña
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Iniciando sesión con:', email);
      const result = await localAuthService.signIn(email, password);
      
      if (result.user) {
        setUser(result.user);
        console.log('Sesión iniciada exitosamente');
      } else {
        setError(new Error(result.error || 'Error al iniciar sesión'));
        console.error('Error al iniciar sesión:', result.error);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error al iniciar sesión:', err);
      setError(err as Error);
      setLoading(false);
    }
  };

  // Cerrar sesión
  const signOut = async () => {
    try {
      setLoading(true);
      
      console.log('Cerrando sesión...');
      await localAuthService.signOut();
      setUser(null);
      setError(null);
      
      console.log('Sesión cerrada exitosamente');
      setLoading(false);
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
