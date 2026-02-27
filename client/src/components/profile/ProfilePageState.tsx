import { Glass } from "@/components/ui/glass";

interface ProfilePageStateProps {
  mode: "loading" | "not-found";
  isPostRouteMatch?: boolean;
}

const ProfilePageState = ({ mode, isPostRouteMatch = false }: ProfilePageStateProps) => {
  if (mode === "loading") {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-6 pb-8 animate-in fade-in duration-500">
        <Glass className="p-6">
          <p className="text-gray-300">
            {isPostRouteMatch ? "Cargando publicación..." : "Cargando perfil..."}
          </p>
        </Glass>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-8 animate-in fade-in duration-500">
      <Glass className="p-6">
        <h2 className="text-xl font-semibold text-white">Perfil no encontrado</h2>
        <p className="text-gray-300 mt-2">No existe un usuario con ese nombre.</p>
      </Glass>
    </div>
  );
};

export default ProfilePageState;

