
import React, { useState } from 'react';
import { Search, Sparkles, ExternalLink, Star, Truck, ShoppingBag, ChevronLeft } from 'lucide-react';
import { searchMedicinePrice, analyzePrescription } from '../services/geminiService';

interface PharmacyHubProps {
  onBack?: () => void;
  lastPrescription?: string[];
}

const PharmacyHub: React.FC<PharmacyHubProps> = ({ onBack, lastPrescription }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchResult, setSearchResult] = useState<{text: string, links: any[]} | null>(null);

  const hasPrescription = lastPrescription && lastPrescription.length > 0;

  const handleSearch = async (term: string) => {
    if (!term) return;
    setIsAnalyzing(true);
    const result = await searchMedicinePrice(term);
    setSearchResult(result);
    setIsAnalyzing(false);
  };

  const handlePrescriptionSync = async () => {
    if (!hasPrescription) return;
    setIsAnalyzing(true);
    const prescriptionText = lastPrescription.join(', ');
    const meds = await analyzePrescription(prescriptionText);
    const firstMed = meds?.split(',')[0].trim() || lastPrescription[0];
    setSearchTerm(firstMed);
    await handleSearch(firstMed);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-4">
          {onBack && (
            <button 
              onClick={(e) => { e.preventDefault(); onBack(); }} 
              className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors text-xs font-black uppercase tracking-widest outline-none group"
            >
              <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Voltar ao Início
            </button>
          )}
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Farmácia Digital</h1>
            <p className="text-slate-500 font-medium">Economia exclusiva nas maiores redes do país.</p>
          </div>
        </div>
        
        <button
          onClick={handlePrescriptionSync}
          disabled={isAnalyzing || !hasPrescription}
          className="flex items-center gap-3 px-8 py-5 bg-[#FF6B00] text-white rounded-[2rem] font-black hover:bg-orange-600 transition-all shadow-xl shadow-orange-100 active:scale-95 disabled:opacity-50"
          title={!hasPrescription ? 'Nenhuma receita disponivel. Realize uma consulta primeiro.' : ''}
        >
          {isAnalyzing ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Sparkles size={20} />
          )}
          {hasPrescription ? 'Sincronizar minha Receita' : 'Sem Receita Disponivel'}
        </button>
      </div>

      <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm transition-all hover:shadow-lg">
        <div className="relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchTerm)}
            placeholder="Qual medicamento você procura agora?"
            className="w-full pl-16 pr-40 py-6 bg-slate-50 border-transparent focus:bg-white focus:ring-4 focus:ring-blue-500/5 rounded-[2.5rem] text-lg font-bold outline-none transition-all"
          />
          <button 
            onClick={() => handleSearch(searchTerm)}
            disabled={isAnalyzing}
            className="absolute right-3 top-2.5 bottom-2.5 px-10 bg-slate-900 text-white font-black rounded-[2rem] hover:bg-blue-600 transition-all active:scale-95"
          >
            Buscar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
           <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <h3 className="font-black text-slate-800 mb-6 text-xs uppercase tracking-widest">Redes Parceiras</h3>
              <div className="space-y-4">
                 {['Drogasil', 'Droga Raia', 'Pague Menos', 'Ultrafarma'].map(rede => (
                    <label key={rede} className="flex items-center gap-3 cursor-pointer group">
                       <input type="checkbox" defaultChecked className="w-6 h-6 rounded-lg border-slate-200 text-blue-600 focus:ring-blue-500" />
                       <span className="text-sm font-bold text-slate-600 group-hover:text-blue-600 transition-colors">{rede}</span>
                    </label>
                 ))}
              </div>
           </div>

           <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-xl">
              <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-2">Checkout Seguro</p>
              <h4 className="font-black text-xl mb-4 leading-tight">Remédio em Casa</h4>
              <p className="text-xs text-blue-100 mb-8 leading-relaxed">Assine o programa de recorrência e garanta descontos de até 25% mensais.</p>
              <button className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">Saber mais</button>
           </div>
        </div>

        <div className="lg:col-span-3">
          {isAnalyzing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3].map(i => (
                <div key={i} className="bg-white rounded-[2.5rem] border border-slate-100 p-6 space-y-4 animate-pulse">
                  <div className="aspect-square bg-slate-50 rounded-3xl w-full"></div>
                  <div className="h-4 bg-slate-100 rounded-full w-3/4 mx-auto"></div>
                  <div className="h-10 bg-slate-100 rounded-2xl w-full"></div>
                </div>
              ))}
            </div>
          ) : searchResult ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResult.links.map((chunk: any, idx: number) => (
                  chunk.web && (
                    <div key={idx} className="bg-white rounded-[2.5rem] border border-slate-100 p-6 shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between h-full hover:-translate-y-1">
                       <div>
                          <div className="aspect-square bg-slate-50 rounded-[2rem] overflow-hidden mb-6 relative transition-transform duration-500 group-hover:scale-95">
                             <img 
                                src={`https://picsum.photos/seed/${idx + 888}/300`} 
                                alt="Medicine" 
                                className="w-full h-full object-cover mix-blend-multiply opacity-80"
                             />
                          </div>
                          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Drogasil Partner</p>
                          <h4 className="font-black text-slate-800 text-sm leading-snug line-clamp-2">
                             {chunk.web.title}
                          </h4>
                       </div>

                       <div className="mt-8 pt-6 border-t border-slate-50 space-y-5">
                          <div className="flex items-baseline gap-2">
                             <span className="text-2xl font-black text-slate-900">R$ 34,90</span>
                             <span className="text-xs text-slate-400 line-through">R$ 48,00</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-[10px] text-emerald-600 font-black uppercase tracking-widest">
                             <Truck size={14} />
                             Entrega Expressa
                          </div>

                          <a 
                             href={chunk.web.uri}
                             target="_blank"
                             rel="noopener noreferrer"
                             className="w-full py-4 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-lg active:scale-95"
                          >
                             Ir para Loja <ExternalLink size={14} />
                          </a>
                       </div>
                    </div>
                  )
                ))}
              </div>

              <div className="bg-indigo-50 border border-indigo-100 p-8 rounded-[3rem] flex gap-6">
                 <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                    <Sparkles size={28} />
                 </div>
                 <div>
                    <h4 className="font-black text-indigo-900 uppercase tracking-tighter text-lg">Resumo da IA Vivemus</h4>
                    <p className="text-sm text-indigo-800/80 mt-1 leading-relaxed font-medium">
                       {searchResult.text}
                    </p>
                 </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 text-center px-10">
               <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6 shadow-inner">
                  <ShoppingBag size={48} />
               </div>
               <h3 className="text-slate-800 font-black text-xl">Sua Farmácia Inteligente</h3>
               <p className="text-slate-500 text-sm max-w-xs mt-2 leading-relaxed font-medium">
                  Pesquise por nome do remédio ou carregue sua última receita digital para encontrar as melhores ofertas.
               </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PharmacyHub;
