import { Switch, Route, Router } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { Background } from "@/components/ui/background";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import Footer from "@/components/Footer";
import Home from "@/pages/Home";
import Search from "@/pages/Search";
import Messages from "@/pages/Messages";
import Notifications from "@/pages/Notifications";
import Create from "@/pages/Create";
import Profile from "@/pages/Profile";
import More from "@/pages/More";
import Aura from "@/pages/Aura";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";
import { useState } from "react";
import { AuthProvider, useAuth } from "@/lib/AuthContext";

function AppRoutes() {
  const { user, loading } = useAuth();

  // Mostrar loading mientras se carga la autenticación
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  // Si no hay usuario autenticado, mostrar login
  if (!user) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route component={Login} />
      </Switch>
    );
  }

  // Si hay usuario autenticado, mostrar la aplicación
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/inicio" component={Home} />
      <Route path="/busqueda" component={Search} />
      <Route path="/mensajes" component={Messages} />
      <Route path="/notificaciones" component={Notifications} />
      <Route path="/crear" component={Create} />
      <Route path="/aura" component={Aura} />
      <Route path="/perfil" component={Profile} />
      <Route path="/mas" component={More} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <AuthProvider>
      <Background />
      <div className="flex flex-col min-h-screen">
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <MobileNav 
            isOpen={mobileMenuOpen} 
            onOpen={() => setMobileMenuOpen(true)} 
            onClose={() => setMobileMenuOpen(false)} 
          />
          
          <main className="flex-1 md:ml-64 pt-16 md:pt-0 px-4 md:px-8 py-6">
            <AppRoutes />
          </main>
        </div>
        <Footer />
      </div>
      <Toaster />
    </AuthProvider>
  );
}

export default App;
