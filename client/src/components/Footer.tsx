import React from 'react';

const Footer = () => {
  return (
    <footer className="glass-dark mt-auto py-4 px-4 sm:px-6 lg:ml-64">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="mb-4 md:mb-0">
          <span className="text-sm text-gray-400">© 2023 InstaDetox. Todos los derechos reservados.</span>
        </div>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
          <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Términos</a>
          <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Privacidad</a>
          <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Contacto</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
