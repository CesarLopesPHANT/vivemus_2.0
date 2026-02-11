
import React, { useState } from 'react';
import { Search, Plus, Star, Edit3, Trash2, Power, PowerOff, RefreshCw } from 'lucide-react';
import { Partner } from '../types';
import { supabase } from '../lib/supabase';

interface AdminPartnersListProps {
  partners: Partner[];
  onAdd: () => void;
  onEdit: (partner: Partner) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

const AdminPartnersList: React.FC<AdminPartnersListProps> = ({ partners, onAdd, onEdit, onDelete, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const togglePartnerStatus = async (partner: Partner) => {
    setIsUpdating(partner.id);
    try {
      const { error } = await supabase
        .from('partners')
        .update({ is_active: !partner.is_active })
        .eq('id', partner.id);
      
      if (error) throw error;
      onRefresh(); 
    } catch (err: any) {
      alert("Erro ao alterar status: " + err.message);
    } finally {
      setIsUpdating(null);
    }
  };

  const filteredPartners = (partners || []).filter(p => {
    const term = searchTerm.toLowerCase();
    const name = (p.name || '').toLowerCase();
    const category = (p.category || '').toLowerCase();
    return name.includes(term) || category.includes(term);
  });

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Pesquisar na base de dados..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-transparent rounded-2xl outline-none text-sm font-bold focus:bg-white focus:ring-2 focus:ring-slate-200 transition-all"
          />
        </div>
        <button 
          type="button"
          onClick={onAdd}
          className="w-full md:w-fit px-8 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <Plus size={20}/> Novo Parceiro
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredPartners.map(partner => (
          <div key={partner.id} className={`bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col hover:shadow-lg transition-all group ${!partner.is_active ? 'opacity-60 grayscale-[0.5]' : ''}`}>
            <div className="h-40 relative">
              <img src={partner.image || 'https://picsum.photos/400/300'} alt={partner.name} className="w-full h-full object-cover" />
              
              <div className="absolute top-4 left-4 flex gap-2">
                <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg backdrop-blur-md ${
                  partner.is_active ? 'bg-emerald-500/90 text-white' : 'bg-slate-500/90 text-white'
                }`}>
                  {partner.is_active ? 'Ativo' : 'Desativado'}
                </span>
              </div>

              <div className="absolute top-4 right-4 bg-white/95 px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm text-[10px] font-black">
                <Star size={12} className="text-amber-400 fill-amber-400" />
                {partner.rating || '5.0'}
              </div>
            </div>

            <div className="p-6">
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{partner.category || 'Sem Categoria'}</span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">{partner.name || 'Parceiro sem nome'}</h3>
              
              <div className="mt-6 flex items-center justify-between">
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => onEdit(partner)} 
                    className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-900 hover:text-white transition-all"
                  >
                    <Edit3 size={18}/>
                  </button>
                  
                  <button 
                    type="button"
                    disabled={isUpdating === partner.id}
                    onClick={() => togglePartnerStatus(partner)}
                    className={`p-2.5 rounded-xl transition-all ${
                      partner.is_active 
                      ? 'bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white' 
                      : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'
                    }`}
                  >
                    {isUpdating === partner.id ? <RefreshCw className="animate-spin" size={18}/> : partner.is_active ? <PowerOff size={18}/> : <Power size={18}/>}
                  </button>

                  <button 
                    type="button"
                    onClick={() => onDelete(partner.id)} 
                    className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                  >
                    <Trash2 size={18}/>
                  </button>
                </div>
                <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase">{partner.discount || 'Desc. Consultar'}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPartnersList;
