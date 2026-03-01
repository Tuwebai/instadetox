import { useState, useEffect } from "react";
import { Glass } from "@/components/ui/glass";
import { Quote, Calendar, Users, RefreshCw } from "lucide-react";
import { QUOTES } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import BrandLogo from "@/components/BrandLogo";
import DailyBook from "@/components/DailyBook";
import { useDailyAppOpenCounter } from "@/hooks/useDailyAppOpenCounter";

interface DetoxFriend {
  id: string;
  name: string;
  avatar: string;
  days: number;
}

const RightPanel = () => {
  const { user } = useAuth();

  // Function to get deterministic random quotes for the day
  const getDailyQuotes = () => {
    const today = new Date().toDateString();
    // Simple hash function for the date string as seed
    let seed = Array.from(today).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Simple LCG (Linear Congruential Generator) for deterministic randomness
    const random = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    const allIndexes = Array.from({ length: QUOTES.length }, (_, i) => i);
    // Fisher-Yates shuffle with our seeded random
    for (let i = allIndexes.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [allIndexes[i], allIndexes[j]] = [allIndexes[j], allIndexes[i]];
    }
    
    return allIndexes.slice(0, 3).map(index => QUOTES[index]);
  };

  // State for quotes - initialized with daily deterministic quotes
  const [quotes, setQuotes] = useState(getDailyQuotes);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [autoRotate, setAutoRotate] = useState(false);

  // Daily app-open counter (persisted in DB)
  const detoxDays = useDailyAppOpenCounter(user?.id ?? null);

  // State for detox friends (Supabase)
  const [detoxFriends, setDetoxFriends] = useState<DetoxFriend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);

  // Toast notifications
  const { toast } = useToast();

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

  const rotateQuotes = () => {
    // Get all available indexes
    const allIndexes = Array.from({ length: QUOTES.length }, (_, i) => i);
    
    // Shuffle and pick 3 unique random indexes
    const shuffled = [...allIndexes].sort(() => 0.5 - Math.random());
    const selectedIndexes = shuffled.slice(0, 3);
    
    const newQuotes = selectedIndexes.map(index => QUOTES[index]);
    setQuotes(newQuotes);

    toast({
      title: "Citas actualizadas",
      description: "Se han renovado las citas inspiradoras",
      duration: 2000,
    });
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
      {/* Days counter */}
      <Glass className="p-6">
        <h3 className="text-lg font-medium mb-3 flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-primary" />
          <BrandLogo className="h-12" />
        </h3>
        <div className="flex flex-col items-center py-4">
          <div className="text-5xl font-bold text-center bg-gradient-text transition-all duration-300 transform hover:scale-110">
            {detoxDays}
          </div>
          <p className="text-gray-300 mt-2">dias en Instadetox 🌿</p>
        </div>
      </Glass>

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
                <div className="flex-1">
                  <p className="text-gray-200 italic text-sm">"{quote.text}"</p>
                  <p className="text-right text-xs text-gray-400 mt-1">- {quote.author}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Glass>

      {/* Daily Book Recommendation */}
      <DailyBook />

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
                    <img 
                      src={friend.avatar} 
                      alt={`Avatar de ${friend.name}`} 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src !== friend.avatar) {
                          target.src = friend.avatar;
                        }
                      }}
                    />
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
