import { useState, useEffect } from "react";
import { Glass } from "@/components/ui/glass";
import { BookOpen, Bookmark, RefreshCw, Check, Share2, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Libros recomendados con colores de marca predefinidos para las portadas
const RECOMMENDED_BOOKS = [
  {
    id: "digitalmin",
    title: "Digital Minimalism",
    author: "Cal Newport",
    description: "Digital Minimalism es un enfoque respaldado por la filosofía para ayudarte a cuestionar qué herramientas digitales (y comportamientos relacionados) aportan valor a tu vida. Es motivado por la creencia de que la desordenada naturaleza de nuestras vidas en línea ha llevado a una existencia estresante y distraída.",
    color: "from-blue-600 to-indigo-900",
    rating: 4.5
  },
  {
    id: "deepwork",
    title: "Deep Work",
    author: "Cal Newport",
    description: "Deep Work explora cómo la concentración profunda se está convirtiendo en una habilidad rara y valiosa en nuestra economía, y por qué las personas que cultivan esta habilidad prosperarán. El libro proporciona reglas para transformar tu mente y hábitos para apoyar este tipo de trabajo profundo.",
    color: "from-amber-600 to-orange-900",
    rating: 4.7
  },
  {
    id: "indistractable",
    title: "Indistractable",
    author: "Nir Eyal",
    description: "Indistractable proporciona un marco práctico para controlar tu atención y elegir tu vida. El libro identifica las causas raíz de la distracción y ofrece una serie de técnicas para ayudarte a manejar las distracciones internas y externas.",
    color: "from-emerald-600 to-teal-900",
    rating: 4.3
  },
  {
    id: "howtodo",
    title: "How to Do Nothing",
    author: "Jenny Odell",
    description: "How to Do Nothing es un replanteamiento de la noción de productividad que pone de relieve nuestras relaciones más básicas y los placeres de la atención. La autora critica la idea actual de que el tiempo debe estar optimizado para la productividad y nos invita a reconectar con nuestro entorno inmediato.",
    color: "from-purple-600 to-fuchsia-900",
    rating: 4.1
  },
  {
    id: "atomic-habits",
    title: "Atomic Habits",
    author: "James Clear",
    description: "Una guía definitiva para romper malos hábitos y adoptar buenos comportamientos mediante pequeños cambios incrementales que generan resultados masivos a largo plazo.",
    color: "from-red-600 to-rose-900",
    rating: 4.9
  },
  {
    id: "essentialism",
    title: "Essentialism",
    author: "Greg McKeown",
    description: "El arte de discernir lo que es absolutamente esencial y eliminar todo lo demás, para que podamos hacer la mayor contribución posible a las cosas que realmente importan.",
    color: "from-slate-600 to-slate-900",
    rating: 4.6
  },
  {
    id: "stolen-focus",
    title: "Stolen Focus",
    author: "Johann Hari",
    description: "Una investigación profunda sobre por qué hemos perdido nuestra capacidad de concentración y cómo podemos recuperarla de las garras de la economía de la atención.",
    color: "from-indigo-600 to-violet-900",
    rating: 4.8
  },
  {
    id: "dopamine-nation",
    title: "Dopamine Nation",
    author: "Anna Lembke",
    description: "Explora la neurociencia de la adicción en una era de gratificación instantánea y cómo encontrar el equilibrio entre el placer y el dolor.",
    color: "from-pink-600 to-pink-900",
    rating: 4.7
  },
  {
    id: "the-shallows",
    title: "The Shallows",
    author: "Nicholas Carr",
    description: "Un análisis revelador sobre cómo el uso constante de Internet está reestructurando físicamente nuestros cerebros y afectando nuestra capacidad de pensamiento profundo.",
    color: "from-cyan-600 to-blue-900",
    rating: 4.4
  },
  {
    id: "hooked",
    title: "Hooked",
    author: "Nir Eyal",
    description: "Entiende cómo se diseñan los productos tecnológicos para crear hábitos y cómo puedes usar esa misma psicología para recuperar el control de tu tiempo.",
    color: "from-orange-600 to-red-900",
    rating: 4.5
  },
  {
    id: "make-time",
    title: "Make Time",
    author: "Jake Knapp",
    description: "Un sistema práctico para diseñar tus días de manera que puedas enfocarte en lo que realmente te importa hoy, sin distracciones externas.",
    color: "from-yellow-600 to-yellow-900",
    rating: 4.3
  },
  {
    id: "digital-detox-book",
    title: "Digital Detox",
    author: "Damon Zahariades",
    description: "Una guía paso a paso para desconectarte del mundo digital y reconectar con la vida real, mejorando tu salud mental y productividad.",
    color: "from-green-600 to-emerald-900",
    rating: 4.2
  },
  {
    id: "quiet-book",
    title: "Quiet",
    author: "Susan Cain",
    description: "El poder de los introvertidos en un mundo que no puede dejar de hablar. Una oda a la reflexión profunda y al silencio.",
    color: "from-sky-600 to-sky-900",
    rating: 4.8
  },
  {
    id: "flow-book",
    title: "Flow",
    author: "Mihaly Csikszentmihalyi",
    description: "La psicología de la experiencia óptima. Cómo alcanzar el estado de 'fluidez' donde el tiempo desaparece y la concentración es total.",
    color: "from-lime-600 to-lime-900",
    rating: 4.7
  },
  {
    id: "thinking-fast-slow",
    title: "Thinking, Fast and Slow",
    author: "Daniel Kahneman",
    description: "Un viaje por los dos sistemas que dirigen nuestra mente: el rápido e impulsivo, y el lento y lógico. Clave para entender nuestras decisiones.",
    color: "from-zinc-600 to-zinc-900",
    rating: 4.6
  },
  {
    id: "goodbye-things",
    title: "Goodbye, Things",
    author: "Fumio Sasaki",
    description: "Sobre cómo el minimalismo extremo puede transformar tu vida, dándote más libertad, más tiempo y más gratitud.",
    color: "from-gray-400 to-gray-700",
    rating: 4.4
  },
  {
    id: "alone-together",
    title: "Alone Together",
    author: "Sherry Turkle",
    description: "Por qué esperamos más de la tecnología y menos de los demás. Un análisis sobre la soledad conectada en redes sociales.",
    color: "from-fuchsia-600 to-purple-900",
    rating: 4.3
  },
  {
    id: "ten-arguments",
    title: "Ten Arguments",
    author: "Jaron Lanier",
    description: "Diez razones urgentes para borrar tus redes sociales ahora mismo y recuperar tu autonomía mental.",
    color: "from-red-700 to-red-950",
    rating: 4.5
  },
  {
    id: "meditations",
    title: "Meditations",
    author: "Marcus Aurelius",
    description: "Sabiduría estoica atemporal sobre cómo mantener la calma en medio del caos y enfocarse únicamente en lo que podemos controlar.",
    color: "from-stone-600 to-stone-900",
    rating: 4.9
  },
  {
    id: "dopamine-nation-2",
    title: "Dopamine Nation",
    author: "Anna Lembke",
    description: "Cómo encontrar el equilibrio en la era de la gratificación instantánea a través de la moderación y la conciencia.",
    color: "from-rose-500 to-rose-800",
    rating: 4.8
  },
  {
    id: "stolen-focus-2",
    title: "Focus",
    author: "Daniel Goleman",
    description: "Un manual para cultivar la atención intencional en un mundo diseñado para distraernos constantemente.",
    color: "from-blue-500 to-blue-800",
    rating: 4.5
  },
  {
    id: "the-4hour-workweek",
    title: "The 4-Hour Workweek",
    author: "Tim Ferriss",
    description: "Escapa de la rutina 9-5, vive en cualquier lugar y únete a los nuevos ricos optimizando tu tiempo y tecnología.",
    color: "from-cyan-500 to-cyan-800",
    rating: 4.4
  },
  {
    id: "sapiens-hist",
    title: "Sapiens",
    author: "Yuval Harari",
    description: "Una breve historia de la humanidad que nos ayuda a entender nuestras construcciones sociales y hábitos modernos.",
    color: "from-orange-500 to-orange-800",
    rating: 4.9
  },
  {
    id: "power-habit",
    title: "The Power of Habit",
    author: "Charles Duhigg",
    description: "Por qué hacemos lo que hacemos en la vida y en el trabajo, y cómo podemos transformar nuestras rutinas diarias.",
    color: "from-green-500 to-green-800",
    rating: 4.7
  }
];

interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  color: string;
  rating: number;
}

// Nuevo componente ModernBookUI que genera la portada con CSS
const ModernBookUI = ({ title, author, color, className, mini = false }: { title: string, author: string, color: string, className?: string, mini?: boolean }) => {
  return (
    <div className={`${className} bg-gradient-to-br ${color} flex flex-col justify-between p-4 relative overflow-hidden shadow-xl border border-white/20 select-none`}>
      {/* Texture & Shine */}
      <div className="absolute inset-0 bg-white/5 mix-blend-overlay opacity-50" />
      <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-white/10 blur-3xl transform rotate-45 pointer-events-none" />
      
      {/* Book Spine Detail */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-black/20" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        <div className="mb-1">
          <BookOpen className={`${mini ? 'w-4 h-4' : 'w-6 h-6'} text-white/40`} />
        </div>
        
        <div className="flex-1 flex flex-col justify-center">
          <h4 className={`${mini ? 'text-[8px]' : 'text-sm'} font-black text-white uppercase tracking-tight leading-none drop-shadow-md break-words italic`}>
            {title}
          </h4>
          {!mini && (
            <div className="h-0.5 w-8 bg-primary/60 mt-2" />
          )}
        </div>
        
        <div className="mt-auto">
          <p className={`${mini ? 'text-[7px]' : 'text-[10px]'} font-medium text-white/70 uppercase tracking-widest truncate`}>
            {author}
          </p>
        </div>
      </div>

      {/* Modern Badge */}
      {!mini && (
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/30 backdrop-blur-md border border-white/10 rounded-sm">
          <span className="text-[6px] text-white/50 font-bold tracking-tighter uppercase">Premium Content</span>
        </div>
      )}
    </div>
  );
};

const DailyBook = () => {
  const [currentBook, setCurrentBook] = useState<Book>(() => {
    const saved = localStorage.getItem('lastBook');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Verificar que el libro existe en nuestra lista actual (por si cambiamos la estructura)
        const exists = RECOMMENDED_BOOKS.find(b => b.id === parsed.id);
        return exists ? (exists as Book) : RECOMMENDED_BOOKS[0];
      } catch (e) {
        return RECOMMENDED_BOOKS[0];
      }
    }
    return RECOMMENDED_BOOKS[0];
  });
  
  const [savedBooks, setSavedBooks] = useState<Book[]>(() => {
    const saved = localStorage.getItem('savedBooks');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    const bookIsSaved = savedBooks.some(b => b.id === currentBook.id);
    setIsSaved(bookIsSaved);
  }, [currentBook, savedBooks]);

  useEffect(() => {
    localStorage.setItem('savedBooks', JSON.stringify(savedBooks));
  }, [savedBooks]);

  useEffect(() => {
    localStorage.setItem('lastBook', JSON.stringify(currentBook));
  }, [currentBook]);

  const handleSaveBook = () => {
    if (isSaved) {
      setSavedBooks(prev => prev.filter(b => b.id !== currentBook.id));
      toast({
        title: "Libro eliminado",
        description: "Se ha quitado el libro de tu lista",
        duration: 3000,
      });
      setIsSaved(false);
    } else {
      setSavedBooks(prev => [...prev, currentBook]);
      toast({
        title: "Libro guardado",
        description: "Añadido a tu lista de lectura",
        duration: 3000,
      });
      setIsSaved(true);
    }
  };

  const handleShareBook = () => {
    const bookInfo = `📚 Recomendación: "${currentBook.title}" de ${currentBook.author} - Una obra clave sobre el bienestar digital en Instadetox.`;
    navigator.clipboard.writeText(bookInfo).then(() => {
      setIsSharing(true);
      toast({
        title: "¡Copiado!",
        description: "Información del libro lista para compartir",
        duration: 2000,
      });
      setTimeout(() => setIsSharing(false), 2000);
    }).catch(() => {
      toast({
        title: "Error",
        description: "No se pudo copiar",
        variant: "destructive",
      });
    });
  };

  const changeBook = () => {
    const filteredBooks = RECOMMENDED_BOOKS.filter(b => b.id !== currentBook.id);
    const randomIndex = Math.floor(Math.random() * filteredBooks.length);
    setCurrentBook(filteredBooks[randomIndex]);
    toast({
      title: "Nueva recomendación",
      description: "Explora un enfoque diferente del minimalismo",
      duration: 2000,
    });
  };

  const renderRatingStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, index) => {
          if (index < fullStars) {
            return <Star key={index} className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />;
          } else if (index === fullStars && hasHalfStar) {
            return (
              <div key={index} className="relative">
                <Star className="w-3.5 h-3.5 text-gray-500" />
                <div className="absolute top-0 left-0 w-1/2 overflow-hidden">
                  <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                </div>
              </div>
            );
          } else {
            return <Star key={index} className="w-3.5 h-3.5 text-gray-500" />;
          }
        })}
        <span className="ml-1.5 text-[10px] font-bold text-gray-400">{rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <Glass className="p-6 relative overflow-hidden group">
      {/* Background Accent */}
      <div className={`absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br ${currentBook.color} opacity-10 blur-3xl group-hover:opacity-20 transition-opacity`} />
      
      <div className="relative z-20 flex justify-between items-center mb-6">
        <h2 className="text-md font-bold text-white uppercase tracking-wider flex items-center">
          <BookOpen className="w-4 h-4 mr-2 text-primary" />
          Libro del día
        </h2>
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            changeBook();
          }}
          className="p-1.5 hover:bg-white/20 rounded-full transition-all text-gray-400 hover:text-white bg-white/5 border border-white/10 active:scale-95"
          title="Ver otro"
        >
          <RefreshCw className="w-4 h-4 pointer-events-none" />
        </button>
      </div>
      
      <div className="flex flex-col gap-6">
        {/* Modern Book UI Preview */}
        <div className="flex justify-center perspective-[1000px]">
          <ModernBookUI 
            title={currentBook.title} 
            author={currentBook.author} 
            color={currentBook.color}
            className="w-36 h-52 rounded-md shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform -rotate-2 hover:rotate-0 hover:scale-105 transition-all duration-500 ease-out"
          />
        </div>

        {/* Info del libro */}
        <div className="space-y-4">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-black text-white leading-tight break-words Lato">{currentBook.title}</h3>
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-widest mt-1">
                De <span className="text-primary/80">{currentBook.author}</span>
              </p>
            </div>
            <div className="bg-black/20 p-1.5 rounded-lg border border-white/5">
              {renderRatingStars(currentBook.rating)}
            </div>
          </div>
          
          <p className="text-[11px] text-gray-400 line-clamp-4 leading-relaxed font-medium italic">
            "{currentBook.description}"
          </p>
          
          <div className="flex gap-2 pt-2">
            <button 
              onClick={handleSaveBook}
              className={`flex-1 py-2.5 rounded-xl inline-flex items-center justify-center text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${
                isSaved 
                ? 'bg-primary/20 text-primary border border-primary/30' 
                : 'bg-primary hover:bg-primary/80 text-white shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]'
              }`}
            >
              {isSaved ? <Check className="w-3.5 h-3.5 mr-2" /> : <Bookmark className="w-3.5 h-3.5 mr-2" />}
              {isSaved ? 'En mi lista' : 'Guardar lectura'}
            </button>
            
            <button 
              onClick={handleShareBook}
              className={`p-2.5 border border-white/10 hover:border-white/20 rounded-xl inline-flex items-center justify-center transition-all hover:bg-white/5 ${
                isSharing ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-gray-400'
              }`}
              title="Compartir"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
          
          {/* Tu lista - Mini Portadas UI */}
          {savedBooks.length > 0 && (
            <div className="pt-4 border-t border-white/5">
              <h4 className="text-[9px] uppercase tracking-[0.2em] font-black text-gray-600 mb-3 flex items-center">
                Mi Biblioteca <span className="ml-2 h-px flex-1 bg-white/5" />
              </h4>
              <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
                {savedBooks.map((book) => (
                  <button 
                    key={book.id} 
                    className={`flex-shrink-0 w-11 h-16 transition-all duration-300 ${
                      book.id === currentBook.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-black scale-105' : 'opacity-40 hover:opacity-100'
                    }`}
                    onClick={() => setCurrentBook(book)}
                  >
                    <ModernBookUI 
                      title={book.title} 
                      author={book.author} 
                      color={book.color} 
                      mini 
                      className="w-full h-full rounded-sm"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Glass>
  );
};

export default DailyBook;
