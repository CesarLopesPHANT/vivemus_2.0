
import React, { useState } from 'react';
import { Search, Filter, Star, MapPin, ChevronRight, Tag, Info } from 'lucide-react';
import { Partner } from '../types';

interface PartnersListProps {
  onPartnerSelect: (partner: Partner) => void;
  partners: Partner[];
}

const PartnersList: React.FC<PartnersListProps> = ({ onPartnerSelect, partners }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  const categories = ['Todos', ...Array.from(new Set(partners.map(p => p.category)))];

  const filteredPartners = (partners || []).filter(partner => {
    // Apenas parceiros ativos são mostrados para o paciente
    if (partner.is_active === false) return false;

    const matchesSearch = partner.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         partner.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || partner.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Nossa Rede de Parceiros</h1>
          <p className="text-slate-500">Encontre clínicas, laboratórios e profissionais com benefícios exclusivos Vivemus.</p>
        </div>
      </div>

      {/* Busca e Filtros */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder="Buscar por nome ou especialidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-transparent focus:bg-white focus:ring-4 focus:ring-blue-500/10 rounded-2xl outline-none transition-all"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                selectedCategory === cat 
                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100' 
                : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Parceiros */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredPartners.map(partner => (
          <div 
            key={partner.id}
            onClick={() => onPartnerSelect(partner)}
            className="group bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer overflow-hidden flex flex-col h-full"
          >
            <div className="h-48 w-full overflow-hidden relative">
              <img src={partner.image} alt={partner.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                <Star size={14} className="text-amber-400 fill-amber-400" />
                <span className="text-xs font-black text-slate-800">{partner.rating}</span>
              </div>
              <div className="absolute bottom-4 left-4 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg">
                {partner.discount}
              </div>
            </div>

            <div className="p-8 flex flex-col flex-1">
              <div className="flex-1">
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">{partner.category}</p>
                <h3 className="text-xl font-bold text-slate-800 mb-2">{partner.name}</h3>
                <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed">
                  {partner.description}
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <MapPin size={14} />
                  <span className="text-xs font-medium">Presencial</span>
                </div>
                <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                  Ver Benefícios
                  <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredPartners.length === 0 && (
        <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
            <Search size={40} />
          </div>
          <h3 className="text-slate-500 font-bold text-lg">Nenhum parceiro encontrado</h3>
          <p className="text-slate-400 text-sm mt-1">Tente ajustar seus filtros ou busca.</p>
        </div>
      )}

      {/* Banner de Info */}
      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
        <div className="relative z-10 space-y-4 max-w-xl">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-widest">
            <Info size={16} />
            Seja um parceiro Vivemus
          </div>
          <h2 className="text-3xl font-black">Sua clínica ou laboratório aqui?</h2>
          <p className="text-slate-400 text-lg leading-relaxed">
            Ofereça seus serviços para milhares de pacientes Vivemus e aumente seu alcance.
          </p>
          <button className="px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all flex items-center gap-2 shadow-xl shadow-blue-900/20">
            Quero fazer parte
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="relative z-10 hidden lg:block">
           <Tag size={120} className="text-white/10 -rotate-12" />
        </div>
        {/* Decorativo */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -mr-48 -mt-48"></div>
      </div>
    </div>
  );
};

export default PartnersList;
