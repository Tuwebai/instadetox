import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Glass } from "@/components/ui/glass";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Link } from "wouter";

const Login = () => {
  const { signIn, loading, error } = useAuth();
  const [email, setEmail] = useState("tuwebai@gmail.com");
  const [password, setPassword] = useState("hola123");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await signIn(email, password);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">InstaDetox</h1>
          <p className="text-gray-400">Tu bienestar digital</p>
        </div>

        {/* Formulario de login */}
        <Glass className="p-0 overflow-hidden">
          <Card className="bg-transparent border-0">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-white text-xl">Iniciar Sesión</CardTitle>
              <CardDescription className="text-gray-400">
                Accede a tu cuenta de desarrollo
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-300">
                    Correo electrónico
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-gray-800/60 border-gray-700 text-white placeholder-gray-400"
                      placeholder="tuwebai@gmail.com"
                      required
                    />
                  </div>
                </div>

                {/* Contraseña */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-300">
                    Contraseña
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 bg-gray-800/60 border-gray-700 text-white placeholder-gray-400"
                      placeholder="hola123"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <Alert className="bg-red-600/20 border-red-500/30">
                    <AlertDescription className="text-red-200">
                      {error.message}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Botón de login */}
                <Button
                  type="submit"
                  disabled={isSubmitting || loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  {isSubmitting || loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Iniciando sesión...</span>
                    </div>
                  ) : (
                    "Iniciar Sesión"
                  )}
                </Button>
              </form>

              {/* Información de desarrollo */}
              <div className="mt-6 p-4 bg-blue-600/20 border border-blue-500/30 rounded-lg">
                <h3 className="text-sm font-medium text-blue-200 mb-2">Modo Desarrollo</h3>
                <p className="text-xs text-blue-300">
                  Usuario: <strong>tuwebai@gmail.com</strong><br />
                  Contraseña: <strong>hola123</strong>
                </p>
              </div>
            </CardContent>
          </Card>
        </Glass>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-400 text-sm">
            Desarrollado con ❤️ para el bienestar digital
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
