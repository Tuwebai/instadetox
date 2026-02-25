import { useEffect, useState } from "react";
import { Bell, RefreshCw } from "lucide-react";
import { Glass } from "@/components/ui/glass";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";

interface NotificationItem {
  id: string;
  type: "like" | "comment" | "follow" | "message" | "system" | "goal_reminder";
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
}

const Notifications = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    if (!supabase || !user?.id) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("id, type, title, body, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    setItems((data ?? []) as NotificationItem[]);
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    if (!supabase) return;
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  useEffect(() => {
    void loadNotifications();
  }, [user?.id]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-8 animate-in fade-in duration-500">
        <Glass className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center text-white">
              <Bell className="w-5 h-5 mr-2 text-primary" />
              Notificaciones
            </h2>
            <Button variant="outline" size="sm" onClick={() => void loadNotifications()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
          </div>

          {loading ? (
            <p className="text-gray-300">Cargando notificaciones...</p>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center h-60 border border-dashed border-gray-700 rounded-lg">
              <p className="text-gray-300">No hay notificaciones nuevas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => void markAsRead(n.id)}
                  className={`w-full text-left p-4 rounded-xl border transition ${
                    n.is_read
                      ? "frosted border-white/15"
                      : "bg-cyan-500/15 border-cyan-300/30 hover:bg-cyan-500/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-white font-medium">{n.title}</p>
                      {n.body ? <p className="text-sm text-gray-200 mt-1">{n.body}</p> : null}
                    </div>
                    <span className="text-xs text-gray-300">{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Glass>
    </div>
  );
};

export default Notifications;
