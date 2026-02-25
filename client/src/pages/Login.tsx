import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Glass } from "@/components/ui/glass";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Mail, Lock, Eye, EyeOff } from "lucide-react";

const Login = () => {
  const { signIn, signUp, loading, error } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setFeedback(null);
    try {
      if (isRegisterMode) {
        await signUp({ email, password, username, fullName });
        setFeedback("Registro enviado. Si tenes confirmacion por email activa, revisa tu casilla.");
      } else {
        await signIn(email, password);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full mb-4">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">InstaDetox</h1>
          <p className="text-gray-300">Tu bienestar digital</p>
        </div>

        <Glass className="p-0 overflow-hidden">
          <Card className="bg-transparent border-0">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-white text-xl">
                {isRegisterMode ? "Crear cuenta" : "Iniciar sesion"}
              </CardTitle>
              <CardDescription className="text-gray-300">
                {isRegisterMode ? "Registrate para empezar tu detox digital" : "Accede a tu cuenta"}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="mb-4 grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={isRegisterMode ? "outline" : "default"}
                  onClick={() => setIsRegisterMode(false)}
                >
                  Ingresar
                </Button>
                <Button
                  type="button"
                  variant={isRegisterMode ? "default" : "outline"}
                  onClick={() => setIsRegisterMode(true)}
                >
                  Registrarme
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {isRegisterMode && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-gray-200">
                        Nombre
                      </Label>
                      <Input
                        id="fullName"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Tu nombre"
                        required={isRegisterMode}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-gray-200">
                        Usuario
                      </Label>
                      <Input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="instadetox_user"
                        required={isRegisterMode}
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-200">
                    Correo electronico
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 text-white placeholder-gray-400"
                      placeholder="vos@correo.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-200">
                    Contrasena
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 text-white placeholder-gray-400"
                      placeholder="********"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <Alert className="bg-red-600/20 border-red-500/30">
                    <AlertDescription className="text-red-200">{error.message}</AlertDescription>
                  </Alert>
                )}

                {feedback && (
                  <Alert className="bg-blue-600/20 border-blue-500/30">
                    <AlertDescription className="text-blue-100">{feedback}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting || loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                >
                  {isSubmitting || loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{isRegisterMode ? "Creando cuenta..." : "Iniciando sesion..."}</span>
                    </div>
                  ) : isRegisterMode ? (
                    "Crear cuenta"
                  ) : (
                    "Iniciar sesion"
                  )}
                </Button>
              </form>

            </CardContent>
          </Card>
        </Glass>

        <div className="text-center mt-6">
          <p className="text-gray-300 text-sm">Disenado para bienestar digital</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
