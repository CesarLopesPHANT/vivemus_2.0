
import React, { useState } from 'react';
import { MessageCircle, Copy, Check, MapPin, Clock, ShieldCheck, ChevronLeft } from 'lucide-react';

interface PartnerDetailsProps {
  partner: {
    id: string;
    name: string;
    category: string;
    whatsapp: string;
    coupon: string;
    discount: string;
    image: string;
    description: string;
  } | null;
  onBack?: () => void;
}

const PartnerDetails: React.FC<PartnerDetailsProps> = ({ partner, onBack }) => {
  const [copied, setCopied] = useState(false);

  if (!partner) return null;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(partner.coupon);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openWhatsApp = () => {
    const text = encodeURIComponent(`Olá, sou paciente Vivemus e gostaria de agendar um serviço utilizando o cupom ${partner.coupon}.`);
    window.open(`https://wa.me/${partner.whatsapp}?text=${text}`, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20 animate-in fade-in duration-500">
      {onBack && (
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors text-xs font-black uppercase tracking-widest outline-none"
        >
          <ChevronLeft size={16} />
          Voltar para Lista
        </button>
      )}

      {/* Hero Section */}
      <div className="relative h-64 md:h-80 w-full rounded-[3rem] overflow-hidden shadow-2xl">
        <img src={partner.image} alt={partner.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8 md:p-12">
          <span className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full w-fit mb-4">
            Parceiro Certificado
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-white">{partner.name}</h1>
          <p className="text-blue-200 font-bold mt-2 flex items-center gap-2">
            <MapPin size={18} />
            {partner.category} • Atendimento Presencial
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Sobre o Parceiro</h2>
            <p className="text-slate-600 leading-relaxed text-lg">
              {partner.description}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
               <div className="flex gap-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 shrink-0">
                     <Clock size={24} />
                  </div>
                  <div>
                     <h4 className="font-bold text-slate-800 text-sm">Horário de Atendimento</h4>
                     <p className="text-slate-500 text-sm">Seg - Sex: 08:00 às 18:00</p>
                     <p className="text-slate-500 text-sm">Sáb: 08:00 às 12:00</p>
                  </div>
               </div>
               <div className="flex gap-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 shrink-0">
                     <ShieldCheck size={24} />
                  </div>
                  <div>
                     <h4 className="font-bold text-slate-800 text-sm">Benefício Vivemus</h4>
                     <p className="text-slate-500 text-sm">Atendimento prioritário e descontos aplicados na hora via cupom.</p>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Sidebar de Ação */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
             <div className="relative z-10">
                <h3 className="text-xl font-bold mb-2">Resgate seu Cupom</h3>
                <p className="text-slate-400 text-xs mb-8">Copie o código abaixo e apresente no momento do pagamento ou agendamento.</p>
                
                <div className="bg-white/10 border-2 border-dashed border-white/20 p-5 rounded-2xl flex items-center justify-between group mb-8">
                   <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Código</span>
                      <span className="text-xl font-black font-mono tracking-tighter">{partner.coupon}</span>
                   </div>
                   <button 
                      onClick={copyToClipboard}
                      className="p-3 bg-white text-slate-900 rounded-xl hover:scale-110 transition-all shadow-lg active:scale-95"
                   >
                      {copied ? <Check size={20} className="text-emerald-500" /> : <Copy size={20} />}
                   </button>
                </div>

                <div className="text-center mb-4">
                   <span className="text-3xl font-black text-blue-400">{partner.discount}</span>
                   <p className="text-[10px] uppercase font-bold text-slate-500 mt-1">Economia exclusiva</p>
                </div>
             </div>
             <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl"></div>
          </div>

          <button 
             onClick={openWhatsApp}
             className="w-full py-5 bg-emerald-600 text-white font-black rounded-[2rem] shadow-lg shadow-emerald-100 hover:bg-emerald-700 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 outline-none"
          >
             <MessageCircle size={24} />
             Agendar via WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
};

export default PartnerDetails;
