import { useState, useEffect } from "react";
import { Brain, Sparkles, Clock, Target, Heart, Zap, MessageCircle, Play, Pause, RotateCcw } from "lucide-react";
import { Glass } from "@/components/ui/glass";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/AuthContext";

interface AuraMessage {
  id: string;
  type: 'advice' | 'meditation' | 'reminder' | 'analysis';
  content: string;
  timestamp: string;
  category: string;
}

interface WellnessStats {
  detoxScore: number;
  productiveHours: number;
  socialMediaBlocked: number;
  meditationMinutes: number;
  goalsCompleted: number;
}

const Aura = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AuraMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [wellnessStats, setWellnessStats] = useState<WellnessStats>({
    detoxScore: 75,
    productiveHours: 6.5,
    socialMediaBlocked: 12,
    meditationMinutes: 15,
    goalsCompleted: 3
  });
  const [isMeditationPlaying, setIsMeditationPlaying] = useState(false);
  const [meditationTime, setMeditationTime] = useState(0);

  // Mensajes iniciales de AURA
  useEffect(() => {
    const initialMessages: AuraMessage[] = [
      {
        id: '1',
        type: 'advice',
        content: '¡Hola! Soy AURA, tu asistente de bienestar digital. Estoy aquí para ayudarte a crear hábitos más saludables con la tecnología.',
        timestamp: new Date().toISOString(),
        category: 'Bienvenida'
      },
      {
        id: '2',
        type: 'advice',
        content: '¿Sabías que el 70% de las personas revisan su teléfono en los primeros 15 minutos después de despertarse? Te ayudo a cambiar esto.',
        timestamp: new Date().toISOString(),
        category: 'Consejo'
      }
    ];
    setMessages(initialMessages);
  }, []);

  // Simular meditación
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isMeditationPlaying) {
      interval = setInterval(() => {
        setMeditationTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isMeditationPlaying]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: AuraMessage = {
      id: Date.now().toString(),
      type: 'advice',
      content: inputMessage,
      timestamp: new Date().toISOString(),
      category: 'Usuario'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      // Simular respuesta de AURA (aquí integraríamos con Gemini)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: inputMessage }]
        })
      });

      const data = await response.json();
      
      const auraResponse: AuraMessage = {
        id: (Date.now() + 1).toString(),
        type: 'advice',
        content: data.content || 'Lo siento, no pude procesar tu mensaje en este momento.',
        timestamp: new Date().toISOString(),
        category: 'AURA'
      };

      setMessages(prev => [...prev, auraResponse]);
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      const errorResponse: AuraMessage = {
        id: (Date.now() + 1).toString(),
        type: 'advice',
        content: 'Lo siento, hay un problema de conexión. Intenta de nuevo más tarde.',
        timestamp: new Date().toISOString(),
        category: 'Error'
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'advice': return <Brain className="h-5 w-5" />;
      case 'meditation': return <Heart className="h-5 w-5" />;
      case 'reminder': return <Clock className="h-5 w-5" />;
      case 'analysis': return <Target className="h-5 w-5" />;
      default: return <MessageCircle className="h-5 w-5" />;
    }
  };

  const getMessageColor = (category: string) => {
    switch (category) {
      case 'AURA': return 'bg-blue-600/20 text-blue-200 border-blue-500/30';
      case 'Usuario': return 'bg-purple-600/20 text-purple-200 border-purple-500/30';
      case 'Error': return 'bg-red-600/20 text-red-200 border-red-500/30';
      default: return 'bg-gray-600/20 text-gray-200 border-gray-500/30';
    }
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      {/* Header con estadísticas */}
      <Glass className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">AURA</h1>
              <p className="text-gray-300">Tu Asistente de Bienestar Digital</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-green-500/20 text-green-200 border-green-500/30">
            En línea
          </Badge>
        </div>

        {/* Estadísticas de bienestar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-gray-800/40 border-gray-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{wellnessStats.detoxScore}%</div>
              <div className="text-xs text-gray-400">Puntuación Detox</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800/40 border-gray-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{wellnessStats.productiveHours}h</div>
              <div className="text-xs text-gray-400">Horas Productivas</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800/40 border-gray-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-400">{wellnessStats.socialMediaBlocked}</div>
              <div className="text-xs text-gray-400">Apps Bloqueadas</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800/40 border-gray-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-pink-400">{wellnessStats.meditationMinutes}m</div>
              <div className="text-xs text-gray-400">Meditación</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800/40 border-gray-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400">{wellnessStats.goalsCompleted}</div>
              <div className="text-xs text-gray-400">Metas Completadas</div>
            </CardContent>
          </Card>
        </div>
      </Glass>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat con AURA */}
        <div className="lg:col-span-2">
          <Glass className="p-0 overflow-hidden h-[600px] flex flex-col">
            <div className="p-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">Conversa con AURA</h2>
              <p className="text-sm text-gray-400">Pregúntame sobre bienestar digital, productividad o meditación</p>
            </div>
            
            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.category === 'Usuario' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-2xl p-4 border ${getMessageColor(message.category)}`}>
                    <div className="flex items-center space-x-2 mb-2">
                      {getMessageIcon(message.type)}
                      <span className="text-xs font-medium">{message.category}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-blue-600/20 text-blue-200 border-blue-500/30 rounded-2xl p-4 border">
                    <div className="flex items-center space-x-2">
                      <Brain className="h-5 w-5" />
                      <span className="text-xs font-medium">AURA</span>
                    </div>
                    <div className="flex items-center space-x-1 mt-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input de mensaje */}
            <div className="p-4 border-t border-gray-800">
              <div className="flex space-x-2">
                <Textarea
                  placeholder="Escribe tu mensaje a AURA..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  className="flex-1 bg-gray-800/60 border-gray-700 text-white placeholder-gray-400"
                  rows={2}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Zap className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Glass>
        </div>

        {/* Panel de herramientas */}
        <div className="space-y-6">
          {/* Meditación guiada */}
          <Glass className="p-6">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-white flex items-center space-x-2">
                <Heart className="h-5 w-5 text-pink-400" />
                <span>Meditación Guiada</span>
              </CardTitle>
              <CardDescription className="text-gray-400">
                Relájate con una sesión de meditación
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-pink-400 mb-2">
                  {formatTime(meditationTime)}
                </div>
                <Progress value={(meditationTime / 300) * 100} className="mb-4" />
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() => setIsMeditationPlaying(!isMeditationPlaying)}
                  className="flex-1 bg-pink-600 hover:bg-pink-700 text-white"
                >
                  {isMeditationPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {isMeditationPlaying ? 'Pausar' : 'Iniciar'}
                </Button>
                <Button
                  onClick={() => {
                    setMeditationTime(0);
                    setIsMeditationPlaying(false);
                  }}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Glass>

          {/* Consejos rápidos */}
          <Glass className="p-6">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-white flex items-center space-x-2">
                <Target className="h-5 w-5 text-green-400" />
                <span>Consejos Rápidos</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-3">
              <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-3">
                <p className="text-sm text-green-200">
                  💡 Desactiva las notificaciones de redes sociales durante el trabajo
                </p>
              </div>
              <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-3">
                <p className="text-sm text-blue-200">
                  🧘‍♀️ Toma 5 minutos cada hora para respirar profundamente
                </p>
              </div>
              <div className="bg-purple-600/20 border border-purple-500/30 rounded-lg p-3">
                <p className="text-sm text-purple-200">
                  📱 Usa el modo nocturno para reducir la fatiga visual
                </p>
              </div>
            </CardContent>
          </Glass>

          {/* Recordatorios */}
          <Glass className="p-6">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-white flex items-center space-x-2">
                <Clock className="h-5 w-5 text-orange-400" />
                <span>Recordatorios</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-2">
              <div className="flex items-center justify-between p-2 bg-orange-600/20 border border-orange-500/30 rounded">
                <span className="text-sm text-orange-200">Descanso de pantalla</span>
                <Badge variant="secondary" className="bg-orange-500/20 text-orange-200">
                  En 15 min
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-blue-600/20 border border-blue-500/30 rounded">
                <span className="text-sm text-blue-200">Meditación diaria</span>
                <Badge variant="secondary" className="bg-blue-500/20 text-blue-200">
                  Pendiente
                </Badge>
              </div>
            </CardContent>
          </Glass>
        </div>
      </div>
    </div>
  );
};

export default Aura;
