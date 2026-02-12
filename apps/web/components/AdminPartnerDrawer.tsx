
import React, { useRef } from 'react';
import { X, Image as ImageIcon, Info, Tag, ShieldCheck, Save, Upload, Loader2, Power } from 'lucide-react';
import { Partner } from '../types';

interface AdminPartnerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  partner: Partner | null;
  setPartner: (partner: Partner) => void;
  onSave: (e: React.FormEvent) => void;
  isSaving?: boolean;
}

const AdminPartnerDrawer: React.FC<AdminPartnerDrawerProps> = ({ isOpen, onClose, partner, setPartner, onSave, isSaving }) => {
  const partnerLogoRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !partner) return null;

  const handlePartnerImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPartner({ ...partner, image: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white h-full shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-2xl font-black text-slate-900">{partner.id ? 'Editar Parceiro' : 'Novo Parceiro'}</h3>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 transition-all"><X size={24}/></button>
        </div>

        <form id="partner-form" onSubmit={onSave} className="flex-1 overflow-y-auto p-10 space-y-8 no-scrollbar">
          
          {/* Status Toggle */}
          <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${partner.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                <Power size={20} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-800">Status de Exibição</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Aparecer na lista para pacientes</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => setPartner({...partner, is_active: !partner.is_active})}
              className={`w-14 h-8 rounded-full transition-all relative p-1 ${partner.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-all transform ${partner.is_active ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest">
              <ImageIcon size={14}/> Identidade Visual
            </div>
            <div 
              onClick={() => partnerLogoRef.current?.click()} 
              className="relative aspect-video w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] overflow-hidden cursor-pointer hover:border-slate-900 transition-all flex items-center justify-center"
            >
              {partner.image ? (
                <img src={partner.image} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center text-slate-300">
                  <Upload size={32} />
                  <span className="text-xs mt-2">Upload de Imagem</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white font-bold text-xs">
                Clique para alterar a imagem
              </div>
              <input type="file" ref={partnerLogoRef} onChange={handlePartnerImageUpload} className="hidden" accept="image/*" />
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest">
              <Info size={14}/> Informações da Unidade
            </div>
            <div className="space-y-4">
              <input 
                type="text" 
                value={partner.name} 
                onChange={e => setPartner({...partner, name: e.target.value})} 
                placeholder="Nome Fantasia" 
                className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-2xl outline-none text-sm font-bold focus:bg-white focus:ring-2 focus:ring-slate-100 transition-all" 
                required 
              />
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="text" 
                  value={partner.category} 
                  onChange={e => setPartner({...partner, category: e.target.value})} 
                  placeholder="Categoria (Ex: Odonto)" 
                  className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-2xl outline-none text-sm font-bold" 
                  required 
                />
                <input 
                  type="text" 
                  value={partner.whatsapp} 
                  onChange={e => setPartner({...partner, whatsapp: e.target.value})} 
                  placeholder="WhatsApp (5511...)" 
                  className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-2xl outline-none text-sm font-bold" 
                  required 
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest">
              <Tag size={14}/> Oferta Comercial
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input 
                type="text" 
                value={partner.coupon} 
                onChange={e => setPartner({...partner, coupon: e.target.value.toUpperCase()})} 
                placeholder="Código do Cupom" 
                className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-2xl outline-none text-sm font-mono font-bold" 
                required 
              />
              <input 
                type="text" 
                value={partner.discount} 
                onChange={e => setPartner({...partner, discount: e.target.value})} 
                placeholder="Desconto (Ex: 20%)" 
                className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-2xl outline-none text-sm font-black" 
                required 
              />
            </div>
            <textarea 
              value={partner.description} 
              onChange={e => setPartner({...partner, description: e.target.value})} 
              placeholder="Descrição dos serviços oferecidos aos pacientes Vivemus..." 
              className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-2xl outline-none text-sm min-h-[120px] font-medium" 
              required
            ></textarea>
          </div>
        </form>

        <div className="p-8 border-t border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-500 font-bold text-xs">
            <ShieldCheck size={16}/>
            Aprovação Imediata
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="px-6 py-4 bg-white text-slate-500 font-bold rounded-2xl border border-slate-200 active:scale-95">Cancelar</button>
            <button 
              form="partner-form" 
              type="submit" 
              disabled={isSaving}
              className="px-10 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20}/>}
              Confirmar Alterações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPartnerDrawer;
