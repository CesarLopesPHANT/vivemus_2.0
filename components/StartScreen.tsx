
import React, { useState, useEffect } from 'react';
import { 
  Video, 
  Calendar, 
  FileText, 
  ShoppingBag, 
  ChevronRight,
  Activity,
  Sparkles,
  Zap,
  Clock,
  Search,
  Stethoscope,
  ShieldCheck,
  TrendingUp,
  MapPin,
  ArrowRight,
  Plus,
  Briefcase
} from 'lucide-react';
import { UserData, View } from '../App';
import { Partner } from '../types';
import { PatientSectionsConfig } from './AdminPatientSections';

interface StartScreenProps {
  user: UserData;
  onSelect: (view: View) => void;
  onPartnerSelect: (partnerData: Partner) => void;
  partners: Partner[];
  sectionConfig?: PatientSectionsConfig;
}

const StartScreen: React.FC<StartScreenProps> = ({ user, onSelect, onPartnerSelect, partners, sectionConfig }) => {
  const [greeting, setGreeting] = useState('');
  const [currentBanner, setCurrentBanner] = useState(0);

  const allBanners = [
    {
      title: "Exames com 20% OFF",
      desc: "Use o cupom VIVEMUS20 em nossa rede de laboratórios parceiros.",
      btn: "Ver Parceiros",
      color: "from-[#00A3FF] to-[#00D1B2]",
      icon: ShieldCheck,
      action: () => onSelect('partners_list'),
      sectionKey: 'partners' as keyof PatientSectionsConfig
    },
    {
      title: "Farmácia Digital",
      desc: "Sincronize sua receita e encontre o menor preço na Drogasil.",
      btn: "Buscar Remédio",
      color: "from-[#00C7B7] to-[#00D8FF]",
      icon: ShoppingBag,
      action: () => onSelect('pharmacy'),
      sectionKey: 'pharmacy' as keyof PatientSectionsConfig
    }
  ];

  const banners = allBanners.filter(b => sectionConfig?.[b.sectionKey] !== false);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Bom dia');
    else if (hour < 18) setGreeting('Boa tarde');
    else setGreeting('Boa noite');
  }, []);

  useEffect(() => {
    if (banners.length === 0) return;
    const timer = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  // Filtra apenas parceiros ativos para a home
  const activePartners = (partners || []).filter(p => p.is_active !== false);

  return (
    <div className="space-y-6 pb-8">
      {/* Header de Boas-vindas Mobile */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {greeting}, <span className="text-[#00A3FF]">{user.name.split(' ')[0]}</span>
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm font-medium">Como podemos cuidar de você?</p>
        </div>
        <div className="flex items-center gap-2 bg-[#E6FFFD] px-2.5 py-1.5 rounded-full border border-[#00D1B2]/20">
          <Activity size={12} className="text-[#00D1B2] animate-pulse" />
          <span className="text-[9px] font-bold text-[#00D1B2] uppercase tracking-wider">Protegido</span>
        </div>
      </div>

      {/* Seção de Banners Rotativos (Hero) - Mobile Optimized */}
      {banners.length > 0 && <section className="relative h-40 sm:h-48 md:h-64 w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg group">
        {banners.map((banner, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 bg-gradient-to-br ${banner.color} p-5 sm:p-8 flex flex-col justify-center transition-all duration-700 transform ${
              idx === currentBanner ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
            }`}
          >
            <div className="relative z-10 max-w-xs sm:max-w-lg space-y-2 sm:space-y-3">
              <h2 className="text-lg sm:text-2xl md:text-4xl font-black text-white leading-tight">{banner.title}</h2>
              <p className="text-white/80 text-[11px] sm:text-sm leading-relaxed line-clamp-2">{banner.desc}</p>
              <button
                onClick={banner.action}
                className="w-fit px-4 sm:px-6 py-2.5 sm:py-3 bg-white text-slate-900 text-[11px] sm:text-sm font-black rounded-xl active:scale-95 transition-all flex items-center gap-1.5"
              >
                {banner.btn}
                <ChevronRight size={14} />
              </button>
            </div>
            <div className="absolute right-2 sm:right-6 bottom-0 top-0 flex items-center opacity-10">
               <banner.icon size={120} className="text-white sm:w-[160px] sm:h-[160px]" />
            </div>
          </div>
        ))}
        {/* Indicadores do Banner */}
        <div className="absolute bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
          {banners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentBanner(idx)}
              className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentBanner ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`}
            />
          ))}
        </div>
      </section>}

      {/* Botao Pronto Atendimento - Destaque */}
      {sectionConfig?.consultation !== false && (
        <button
          onClick={() => onSelect('consultation')}
          className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3 active:scale-95 group"
        >
          <Video size={22} />
          Pronto Atendimento
          <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
        </button>
      )}

      {/* Grade de Serviços Principais - Mobile Touch Optimized */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { id: 'schedule', title: 'Agendamentos', desc: 'Exames e Clínicas', icon: Calendar, color: 'bg-[#00D1B2]' },
          { id: 'records', title: 'Prontuário', desc: 'Histórico Completo', icon: FileText, color: 'bg-[#00A3FF]' },
          { id: 'pharmacy', title: 'Farmácia', desc: 'Receitas e Preços', icon: ShoppingBag, color: 'bg-slate-800' },
        ].filter(item => sectionConfig?.[item.id as keyof PatientSectionsConfig] !== false).map(item => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id as View)}
            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm active:scale-95 active:bg-slate-50 transition-all text-left flex flex-col min-h-[100px]"
          >
            <div className={`${item.color} w-10 h-10 rounded-xl flex items-center justify-center text-white mb-3`}>
              <item.icon size={20} />
            </div>
            <h3 className="text-sm font-bold text-slate-800">{item.title}</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">{item.desc}</p>
          </button>
        ))}
      </div>

      {/* Recurso: Triagem com IA - Mobile Card */}
      {sectionConfig?.aichat !== false && (
        <section className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-2 text-[#00D8FF] font-black text-[9px] uppercase tracking-widest">
              <Sparkles size={12} className="fill-[#00D8FF]" />
              IA Vivemus
            </div>
            <h3 className="text-lg font-black text-white leading-tight">Dúvida sobre algum sintoma?</h3>
            <p className="text-slate-400 text-xs leading-relaxed">Triagem inteligente em segundos.</p>
            <button
              onClick={() => onSelect('aichat')}
              className="px-5 py-3 bg-[#00D8FF] text-slate-900 text-xs font-black rounded-xl active:scale-95 transition-all flex items-center gap-2 w-full justify-center"
            >
              Iniciar Triagem
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-10">
             <Zap size={100} className="text-[#00D8FF]" />
          </div>
        </section>
      )}

      {/* Recurso: Status de Saude - Mobile */}
      {sectionConfig?.health !== false && (
        <section className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
               <TrendingUp size={16} className="text-[#00D1B2]" />
               Seu Progresso
            </h3>
            <button onClick={() => onSelect('health')} className="text-[#00A3FF] text-[9px] font-black uppercase">Ver tudo</button>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => onSelect('health')}
              className="w-full p-4 bg-slate-50 rounded-xl text-center active:scale-95 transition-all"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp size={18} className="text-[#00D1B2]" />
                <span className="text-sm font-bold text-slate-700">Configure suas metas de saude</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Acompanhe hidratacao, atividade fisica e mais na aba Saude.
              </p>
            </button>
          </div>
        </section>
      )}

      {/* Rede de Parceiros - Mobile Horizontal Scroll */}
      {sectionConfig?.partners !== false && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
             <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <MapPin size={16} className="text-red-500" />
                Parceiros
             </h3>
             <button onClick={() => onSelect('partners_list')} className="text-[#00A3FF] text-[9px] font-black uppercase flex items-center gap-1">
                Ver todos <ChevronRight size={12}/>
             </button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
             {activePartners.length === 0 ? (
               <div className="w-full py-8 bg-white rounded-xl border border-slate-100 flex items-center justify-center text-slate-400 font-bold text-sm">
                  Nenhum parceiro cadastrado.
               </div>
             ) : activePartners.slice(0, 5).map((p) => (
               <button
                 key={p.id}
                 onClick={() => onPartnerSelect(p)}
                 className="min-w-[150px] bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex-shrink-0 text-left snap-start active:scale-95 transition-all"
               >
                  <div className="h-20 overflow-hidden">
                     <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-3">
                     <p className="text-[9px] font-bold text-[#00D1B2] uppercase">{p.category}</p>
                     <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{p.name}</h4>
                  </div>
               </button>
             ))}
             {activePartners.length > 5 && (
               <button
                 onClick={() => onSelect('partners_list')}
                 className="min-w-[100px] bg-slate-100 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1.5 text-slate-400 snap-start active:scale-95 transition-all"
               >
                  <Plus size={20}/>
                  <span className="text-[10px] font-bold">Ver mais</span>
               </button>
             )}
          </div>
        </section>
      )}

      {/* Banner de Suporte - Mobile */}
      <div className="bg-slate-900 rounded-xl p-4 text-white flex items-center justify-between">
         <div>
            <h4 className="font-bold text-sm mb-0.5">Precisa de ajuda?</h4>
            <p className="text-slate-400 text-[10px]">Suporte 24h via chat</p>
         </div>
         <button className="p-3 bg-white/10 rounded-xl active:bg-white/20 transition-all">
            <Clock size={18} className="text-[#00D8FF]" />
         </button>
      </div>
    </div>
  );
};

export default StartScreen;
