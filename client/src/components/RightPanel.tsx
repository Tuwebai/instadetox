import { useState, useEffect } from "react";
import { Glass } from "@/components/ui/glass";
import { Quote, Calendar, AlertCircle, Users, RefreshCw } from "lucide-react";
import { QUOTES, UPCOMING_UPDATES } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

interface DetoxFriend {
  id: string;
  name: string;
  avatar: string;
  days: number;
}

const RightPanel = () => {
  const { user } = useAuth();

  // State for quotes
  const [quotes, setQuotes] = useState(QUOTES.slice(0, 3));
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [autoRotate, setAutoRotate] = useState(false);

  // State for detox days counter
  const [detoxDays, setDetoxDays] = useState(() => {
    const saved = localStorage.getItem("detoxDays");
    return saved !== null ? parseInt(saved, 10) : 78;
  });

  // State for detox friends (Supabase)
  const [detoxFriends, setDetoxFriends] = useState<DetoxFriend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);

  // Toast notifications
  const { toast } = useToast();

  // Effect to save detox days to localStorage
  useEffect(() => {
    localStorage.setItem("detoxDays", detoxDays.toString());
  }, [detoxDays]);

  // Effect for auto-rotating quotes
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (autoRotate) {
      interval = setInterval(() => {
        rotateQuotes();
      }, 7000); // rotate every 7 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRotate, currentQuoteIndex]);

  // Load detox friends from Supabase (no hardcoded mock data)
  useEffect(() => {
    const loadDetoxFriends = async () => {
      if (!supabase || !user?.id) {
        setDetoxFriends([]);
        setFriendsLoading(false);
        return;
      }

      setFriendsLoading(true);

      const { data: followsData, error: followsError } = await supabase
        .from("follows")
        .select("following_id, created_at")
        .eq("follower_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8);

      if (followsError || !followsData?.length) {
        setDetoxFriends([]);
        setFriendsLoading(false);
        return;
      }

      const followingIds = followsData.map((row) => row.following_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", followingIds);

      if (profilesError || !profilesData?.length) {
        setDetoxFriends([]);
        setFriendsLoading(false);
        return;
      }

      const profileById = new Map(profilesData.map((profile) => [profile.id, profile]));
      const now = Date.now();

      const friends = followsData
        .map((follow) => {
          const profile = profileById.get(follow.following_id);
          if (!profile) return null;

          const followedAt = new Date(follow.created_at).getTime();
          const days = Math.max(0, Math.floor((now - followedAt) / (1000 * 60 * 60 * 24)));

          return {
            id: profile.id,
            name: profile.full_name || profile.username,
            avatar: profile.avatar_url || "",
            days,
          };
        })
        .filter((friend): friend is DetoxFriend => friend !== null);

      setDetoxFriends(friends);
      setFriendsLoading(false);
    };

    void loadDetoxFriends();
  }, [user?.id]);

  const resetCounter = () => {
    setDetoxDays(0);
    toast({
      title: "Contador reiniciado",
      description: "Comienza tu detox digital desde cero.",
      duration: 3000,
    });
  };

  const incrementCounter = () => {
    setDetoxDays((prev) => prev + 1);
    toast({
      title: "Felicidades",
      description: "Has sumado un dia mas a tu detox digital.",
      duration: 3000,
    });
  };

  const rotateQuotes = () => {
    // Get new random quote indexes that are not currently shown
    const allIndexes = Array.from({ length: QUOTES.length }, (_, i) => i);
    const currentIndexes = quotes.map((q) => QUOTES.findIndex((quote) => quote.text === q.text));
    const availableIndexes = allIndexes.filter((i) => !currentIndexes.includes(i));

    // Replace one quote with a new one
    setCurrentQuoteIndex((prev) => (prev + 1) % 3);

    if (availableIndexes.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableIndexes.length);
      const newQuoteIndex = availableIndexes[randomIndex];

      const newQuotes = [...quotes];
      newQuotes[currentQuoteIndex] = QUOTES[newQuoteIndex];
      setQuotes(newQuotes);

      toast({
        title: "Nueva cita",
        description: "Se ha actualizado una cita inspiradora",
        duration: 2000,
      });
    }
  };

  const toggleAutoRotate = () => {
    setAutoRotate((prev) => !prev);
    toast({
      title: autoRotate ? "Rotacion automatica desactivada" : "Rotacion automatica activada",
      description: autoRotate
        ? "Las citas ya no cambiaran automaticamente"
        : "Las citas cambiaran cada 7 segundos",
      duration: 3000,
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Quotes section */}
      <Glass className="p-6 relative">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-medium flex items-center">
            <Quote className="w-5 h-5 mr-2 text-primary" />
            Citas inspiradoras
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={rotateQuotes}
              className="p-1 hover:bg-gray-700 rounded-full transition-colors"
              title="Cambiar citas"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={toggleAutoRotate}
              className={`p-1 ${autoRotate ? "bg-primary/30" : "hover:bg-gray-700"} rounded-full transition-colors`}
              title={autoRotate ? "Desactivar rotacion automatica" : "Activar rotacion automatica"}
            >
              <div className="w-4 h-4 flex items-center justify-center">{autoRotate ? "A" : "M"}</div>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {quotes.map((quote, index) => (
            <div
              key={index}
              className="quote-card p-3 border border-gray-800 rounded-lg transition-all duration-300 hover:border-gray-700"
            >
              <div className="flex">
                <div className="w-12 h-12 rounded overflow-hidden mr-3 flex-shrink-0">
                  <img
                    src={quote.image}
                    alt={`Imagen relacionada a la cita de ${quote.author}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-gray-200 italic text-sm">"{quote.text}"</p>
                  <p className="text-right text-xs text-gray-400 mt-1">- {quote.author}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Glass>

      {/* Days counter */}
      <Glass className="p-6">
        <h3 className="text-lg font-medium mb-3 flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-primary" />
          InstaDetox
        </h3>
        <div className="flex flex-col items-center py-4">
          <div className="text-5xl font-bold text-center bg-gradient-text transition-all duration-300 transform hover:scale-110">
            {detoxDays}
          </div>
          <p className="text-gray-300 mt-2">dias sin Instagram</p>
          <div className="flex space-x-3 mt-4">
            <button
              onClick={resetCounter}
              className="border border-gray-600 hover:border-gray-400 px-3 py-1 rounded-lg text-sm transition-colors duration-200"
            >
              Reiniciar
            </button>
            <button
              onClick={incrementCounter}
              className="bg-primary/80 hover:bg-primary px-3 py-1 rounded-lg text-sm transition-colors duration-200"
            >
              +1 dia
            </button>
          </div>
        </div>
      </Glass>

      {/* Updates */}
      <Glass className="p-6">
        <h3 className="text-lg font-medium mb-3 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2 text-primary" />
          Proximas actualizaciones
        </h3>
        <ul className="space-y-3">
          {UPCOMING_UPDATES.map((update, index) => (
            <li key={index} className="flex items-start">
              <span className={`w-2 h-2 rounded-full bg-${update.status}-500 mt-2 mr-2 animate-pulse`}></span>
              <span className="text-gray-300">{update.text}</span>
            </li>
          ))}
        </ul>
      </Glass>

      {/* Friend activity */}
      <Glass className="p-6">
        <h3 className="text-lg font-medium mb-3 flex items-center">
          <Users className="w-5 h-5 mr-2 text-primary" />
          Amigos en detox
        </h3>
        <div className="space-y-3">
          {friendsLoading && <p className="text-sm text-gray-400">Cargando amigos...</p>}
          {!friendsLoading && detoxFriends.length === 0 && (
            <p className="text-sm text-gray-400">Todavia no sigues a nadie en detox.</p>
          )}
          {!friendsLoading &&
            detoxFriends.map((friend) => (
              <div key={friend.id} className="flex items-center p-2 hover:bg-black/20 rounded-lg transition-colors">
                <div className="w-10 h-10 rounded-full overflow-hidden mr-3 bg-black/20 flex items-center justify-center">
                  {friend.avatar ? (
                    <img src={friend.avatar} alt={`Avatar de ${friend.name}`} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-gray-300">{friend.name.slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <p className="font-medium">{friend.name}</p>
                  <p className="text-sm text-gray-400">{friend.days} dias</p>
                </div>
              </div>
            ))}
        </div>
      </Glass>
    </div>
  );
};

export default RightPanel;
