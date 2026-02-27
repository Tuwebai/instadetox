import { MoreHorizontal, FileText, Info, Shield, Mail } from "lucide-react";
import { Glass } from "@/components/ui/glass";

const More = () => {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-8 animate-in fade-in duration-500">
      <Glass className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <MoreHorizontal className="w-5 h-5 mr-2 text-primary" />
          Más opciones
        </h2>
        <p className="text-gray-300 mb-4">Opciones adicionales y recursos disponibles en InstaDetox.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-black/30 p-4 rounded-lg border border-gray-700 flex items-center">
            <FileText className="w-6 h-6 mr-3 text-primary" />
            <span>Documentación y guías</span>
          </div>

          <div className="bg-black/30 p-4 rounded-lg border border-gray-700 flex items-center">
            <Info className="w-6 h-6 mr-3 text-primary" />
            <span>Acerca de InstaDetox</span>
          </div>

          <a
            href="/privacidad"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-black/30 p-4 rounded-lg border border-gray-700 flex items-center hover:bg-black/45 transition-colors"
          >
            <Shield className="w-6 h-6 mr-3 text-primary" />
            <span>Política de privacidad</span>
          </a>

          <a href="mailto:soporte@instadetox.app" className="bg-black/30 p-4 rounded-lg border border-gray-700 flex items-center hover:bg-black/45 transition-colors">
            <Mail className="w-6 h-6 mr-3 text-primary" />
            <span>Contáctanos</span>
          </a>
        </div>
      </Glass>

      <Glass className="p-6">
        <h3 className="text-lg font-medium mb-3">Estadísticas globales</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
          <div className="bg-black/30 p-4 rounded-lg border border-gray-700">
            <p className="text-2xl font-bold bg-gradient-text">1,254</p>
            <p className="text-sm text-gray-400">Usuarios activos</p>
          </div>
          <div className="bg-black/30 p-4 rounded-lg border border-gray-700">
            <p className="text-2xl font-bold bg-gradient-text">45</p>
            <p className="text-sm text-gray-400">Días promedio</p>
          </div>
          <div className="bg-black/30 p-4 rounded-lg border border-gray-700">
            <p className="text-2xl font-bold bg-gradient-text">312</p>
            <p className="text-sm text-gray-400">Metas completadas</p>
          </div>
        </div>
      </Glass>
    </div>
  );
};

export default More;
