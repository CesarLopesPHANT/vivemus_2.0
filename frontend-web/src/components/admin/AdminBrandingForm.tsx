
import React, { useState, useRef, useEffect } from 'react';
import { Palette, Upload, Save, Trash2 } from 'lucide-react';
import { BrandSettings } from '../App';

interface AdminBrandingFormProps {
  currentBranding: BrandSettings;
  onApplyBranding: (settings: BrandSettings) => void;
}

const AdminBrandingForm: React.FC<AdminBrandingFormProps> = ({ currentBranding, onApplyBranding }) => {
  const [localBranding, setLocalBranding] = useState<BrandSettings>(currentBranding);
  const brandLogoRef = useRef<HTMLInputElement>(null);

  // Sincroniza o estado local quando o branding atual do sistema mudar
  useEffect(() => {
    setLocalBranding(currentBranding);
  }, [currentBranding]);

  const handleBrandLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLocalBranding(prev => ({ ...prev, logoUrl: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const clearLogo = () => {
    setLocalBranding(prev => ({ ...prev, logoUrl: null }));
  };

  return (
    <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-10 animate-in slide-in-from-right duration-300">
      <section className="space-y-8">
        <div className="flex items-center gap-3">
          <Palette size={24} className="text-slate-900" />
          <h3 className="text-2xl font-black text-slate-900">Identidade Visual White Label</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-6">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Esquema de Cores</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                   <span className="text-sm font-bold text-slate-700 block">Cor Primária</span>
                   <span className="text-[10px] text-slate-400 font-mono">{localBranding.primaryColor}</span>
                </div>
                <input 
                  type="color" 
                  value={localBranding.primaryColor} 
                  onChange={e => setLocalBranding({...localBranding, primaryColor: e.target.value})} 
                  className="w-12 h-12 border-none bg-transparent cursor-pointer rounded-xl overflow-hidden shadow-sm" 
                />
              </div>
              <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                   <span className="text-sm font-bold text-slate-700 block">Cor de Acento</span>
                   <span className="text-[10px] text-slate-400 font-mono">{localBranding.accentColor}</span>
                </div>
                <input 
                  type="color" 
                  value={localBranding.accentColor} 
                  onChange={e => setLocalBranding({...localBranding, accentColor: e.target.value})} 
                  className="w-12 h-12 border-none bg-transparent cursor-pointer rounded-xl overflow-hidden shadow-sm" 
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logotipo da Plataforma</h4>
              {localBranding.logoUrl && (
                <button onClick={clearLogo} className="text-red-500 hover:text-red-700 p-1">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            
            <div 
              onClick={() => brandLogoRef.current?.click()}
              className="h-44 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-slate-900 hover:bg-slate-100 transition-all group overflow-hidden"
            >
              {localBranding.logoUrl ? (
                <img src={localBranding.logoUrl} alt="Preview Logo" className="h-16 w-auto object-contain transition-transform group-hover:scale-105" />
              ) : (
                <>
                  <Upload size={32} className="text-slate-300 group-hover:text-slate-900" />
                  <span className="text-[10px] font-black text-slate-400 uppercase group-hover:text-slate-900">Subir Logo (SVG/PNG)</span>
                </>
              )}
              <input type="file" ref={brandLogoRef} onChange={handleBrandLogoUpload} className="hidden" accept="image/*" />
            </div>
            <p className="text-[10px] text-slate-400 text-center italic">Recomendado: SVG ou PNG com fundo transparente</p>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg shadow-sm" style={{ backgroundColor: localBranding.primaryColor }}></div>
             <div className="w-8 h-8 rounded-lg shadow-sm" style={{ backgroundColor: localBranding.accentColor }}></div>
             <span className="text-xs font-bold text-slate-400">Preview das Cores</span>
          </div>
          <button 
            onClick={() => onApplyBranding(localBranding)}
            className="px-12 py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-blue-600 transition-all flex items-center gap-2 active:scale-95"
          >
            <Save size={20} />
            Aplicar Identidade Visual
          </button>
        </div>
      </section>
    </div>
  );
};

export default AdminBrandingForm;
