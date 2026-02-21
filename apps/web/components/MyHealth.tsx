
import React, { useState, useMemo } from 'react';
import { 
  Droplets, 
  Footprints, 
  Dumbbell, 
  Pill, 
  Plus, 
  Zap, 
  Sparkles, 
  Target, 
  CheckCircle2, 
  Bell, 
  BellOff, 
  Trash2, 
  HeartPulse, 
  Brain,
  Settings2,
  X,
  ChevronRight,
  ClipboardList,
  FileSearch,
  Upload,
  User,
  Activity,
  Weight,
  Ruler,
  Dna,
  Loader2,
  Download
} from 'lucide-react';
import { UserData } from '../App';
import { HealthProfile, UserExam, Notification } from '../types';

interface Habit {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  icon: any;
  color: string;
  streak: number;
  isActive: boolean;
}

interface MyHealthProps {
  user: UserData;
  onUpdateHealth: (data: HealthProfile) => void;
  onAddNotif: (notif: Omit<Notification, 'id' | 'read' | 'time'>) => void;
  exams?: UserExam[];
}

const GOAL_LIBRARY = [
  { id: 'lib1', title: 'Beber Água', target: 2000, unit: 'ml', icon: Droplets, color: 'text-blue-500 bg-blue-50' },
  { id: 'lib2', title: 'Caminhada Diária', target: 5000, unit: 'passos', icon: Footprints, color: 'text-emerald-500 bg-emerald-50' },
  { id: 'lib3', title: 'Ir na Academia', target: 1, unit: 'vezes', icon: Dumbbell, color: 'text-orange-500 bg-orange-50' },
  { id: 'lib4', title: 'Suplementação', target: 1, unit: 'dose', icon: Pill, color: 'text-purple-500 bg-purple-50' },
];

const MyHealth: React.FC<MyHealthProps> = ({ user, onUpdateHealth, onAddNotif, exams: examsFromProps }) => {
  const [activeTab, setActiveTab] = useState<'habits' | 'profile' | 'exams'>('habits');
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [pushPermission, setPushPermission] = useState<boolean>(false);
  const [habits, setHabits] = useState<Habit[]>([]);
  
  const [exams, setExams] = useState<UserExam[]>(examsFromProps || []);

  const activeHabits = habits.filter(h => h.isActive);

  const imc = useMemo(() => {
    if (!user.healthProfile?.weight || !user.healthProfile?.height) return 0;
    return parseFloat((user.healthProfile.weight / (user.healthProfile.height * user.healthProfile.height)).toFixed(1));
  }, [user.healthProfile]);

  const imcStatus = useMemo(() => {
    if (imc < 18.5) return { label: 'Abaixo do peso', color: 'text-amber-500' };
    if (imc < 25) return { label: 'Peso ideal', color: 'text-emerald-500' };
    if (imc < 30) return { label: 'Sobrepeso', color: 'text-orange-500' };
    return { label: 'Obesidade', color: 'text-red-500' };
  }, [imc]);

  const handleHealthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    setTimeout(() => {
      onUpdateHealth({
        bloodType: formData.get('bloodType') as string,
        age: parseInt(formData.get('age') as string),
        height: parseFloat(formData.get('height') as string),
        weight: parseFloat(formData.get('weight') as string),
        medicalHistory: formData.get('medicalHistory') as string,
        allergies: formData.get('allergies') as string,
      });
      setIsSaving(false);
    }, 1000);
  };

  const registerProgress = (id: string) => {
    setHabits(prev => prev.map(h => {
      if (h.id === id) {
        const inc = h.unit === 'ml' ? 250 : (h.unit === 'passos' ? 500 : 1);
        const next = Math.min(h.current + inc, h.target);
        if (next >= h.target && h.current < h.target) {
          onAddNotif({ title: 'Meta Batida! 🏆', message: `Você completou o objetivo ${h.title}!`, type: 'health' });
        }
        return { ...h, current: next, streak: next >= h.target ? h.streak + 1 : h.streak };
      }
      return h;
    }));
  };

  const saveHabit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const title = (form.elements.namedItem('title') as HTMLInputElement).value;
    const target = parseInt((form.elements.namedItem('target') as HTMLInputElement).value);
    const unit = (form.elements.namedItem('unit') as HTMLSelectElement).value;

    if (editingHabit) {
      setHabits(prev => prev.map(h => h.id === editingHabit.id ? { ...h, title, target, unit } : h));
    } else {
      setHabits(prev => [...prev, {
        id: Date.now().toString(),
        title, target, unit, icon: Target, color: 'text-slate-600 bg-slate-100',
        current: 0, streak: 0, isActive: true
      }]);
    }
    setShowModal(false);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Tabs Mobile Compact */}
      <div className="flex p-1 bg-slate-100 rounded-xl overflow-x-auto no-scrollbar">
        {[
          { id: 'habits', label: 'Metas', icon: Zap },
          { id: 'profile', label: 'Ficha', icon: ClipboardList },
          { id: 'exams', label: 'Exames', icon: FileSearch }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-black transition-all active:scale-95 whitespace-nowrap ${
              activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'habits' && (
        <div className="animate-in fade-in duration-300 space-y-5">
          {/* Push Notification Card - Mobile */}
          <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
               <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pushPermission ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                  <Bell size={20} />
               </div>
               <div>
                  <h3 className="text-sm font-black text-slate-800">Lembretes</h3>
                  <p className="text-[10px] text-slate-500">Notificações push</p>
               </div>
            </div>
            <button
              onClick={() => setPushPermission(!pushPermission)}
              className={`px-4 py-2.5 text-xs font-black rounded-xl transition-all active:scale-95 ${
                pushPermission ? 'bg-slate-100 text-slate-600' : 'bg-blue-600 text-white'
              }`}
            >
              {pushPermission ? 'Off' : 'Ativar'}
            </button>
          </div>

          {/* Metas Header */}
          <div className="flex items-center justify-between">
             <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                <Target size={18} className="text-blue-600" />
                Metas de Hoje
             </h2>
             <button onClick={() => { setEditingHabit(null); setShowModal(true); }} className="p-2.5 bg-white border border-slate-200 rounded-xl active:scale-90 shadow-sm"><Plus size={18}/></button>
          </div>

          {/* Habits Grid - Mobile Single Column */}
          <div className="space-y-4">
             {activeHabits.map(habit => (
               <div key={habit.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm relative">
                  <div className="absolute top-3 right-3 flex items-center gap-1">
                    <button onClick={() => { setEditingHabit(habit); setShowModal(true); }} className="p-1.5 text-slate-300 active:text-blue-600 rounded-lg"><Settings2 size={14} /></button>
                    <button onClick={() => setHabits(habits.filter(h => h.id !== habit.id))} className="p-1.5 text-slate-300 active:text-red-500 rounded-lg"><Trash2 size={14} /></button>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${habit.color}`}><habit.icon size={20} /></div>
                     <div className="flex-1">
                        <h3 className="text-sm font-bold text-slate-800">{habit.title}</h3>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1"><Zap size={10} className="text-yellow-500 fill-yellow-500" /> {habit.streak} dias</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="flex-1">
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-1">
                           <div className={`h-full ${habit.current >= habit.target ? 'bg-emerald-500' : 'bg-blue-600'} transition-all duration-500`} style={{ width: `${Math.min((habit.current/habit.target)*100, 100)}%` }}></div>
                        </div>
                        <p className="text-[10px] text-slate-400">{habit.current} / {habit.target} {habit.unit}</p>
                     </div>
                     <button onClick={() => registerProgress(habit.id)} className={`px-4 py-2.5 text-xs font-black rounded-xl transition-all active:scale-95 ${habit.current >= habit.target ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-900 text-white'}`}>
                        {habit.current >= habit.target ? 'Feito!' : '+'}
                     </button>
                  </div>
               </div>
             ))}
             {activeHabits.length === 0 && (
               <button onClick={() => setShowModal(true)} className="w-full py-12 bg-white border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm font-bold active:border-blue-400 active:text-blue-600 transition-all">
                  + Adicionar meta
               </button>
             )}
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="animate-in slide-in-from-right duration-500 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm text-center">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                 <HeartPulse size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Status Vital</h3>
              <p className="text-slate-500 text-sm mt-1">Baseado nos seus dados informados.</p>
              
              <div className="mt-8 space-y-4 text-left">
                <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                   <div className="flex items-center gap-3"><Weight size={18} className="text-slate-400"/><span className="text-sm font-bold text-slate-600">IMC</span></div>
                   <div className="text-right"><p className="font-black text-slate-800">{imc}</p><p className={`text-[10px] font-bold uppercase ${imcStatus.color}`}>{imcStatus.label}</p></div>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                   <div className="flex items-center gap-3"><Dna size={18} className="text-slate-400"/><span className="text-sm font-bold text-slate-600">Sanguíneo</span></div>
                   <span className="font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">{user.healthProfile?.bloodType || '--'}</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl">
               <h4 className="font-black text-lg mb-4 flex items-center gap-2"><Activity size={20} className="text-emerald-400"/> Saúde Vivemus</h4>
               <p className="text-slate-400 text-sm leading-relaxed">Estes dados auxiliam nossos médicos a realizarem diagnósticos mais precisos durante as teleconsultas.</p>
            </div>
          </div>

          <div className="lg:col-span-2">
            <form onSubmit={handleHealthSubmit} className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
              <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3"><User size={24} className="text-blue-600"/> Meus Dados Vitais</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo Sanguíneo</label>
                  <select name="bloodType" defaultValue={user.healthProfile?.bloodType} className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-2xl font-bold text-slate-700 outline-none">
                     <option value="O+">O+</option><option value="O-">O-</option>
                     <option value="A+">A+</option><option value="A-">A-</option>
                     <option value="B+">B+</option><option value="B-">B-</option>
                     <option value="AB+">AB+</option><option value="AB-">AB-</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Idade</label>
                  <input name="age" type="number" defaultValue={user.healthProfile?.age} className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-2xl font-bold text-slate-700 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Altura (m)</label>
                  <input name="height" type="number" step="0.01" defaultValue={user.healthProfile?.height} className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-2xl font-bold text-slate-700 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Peso (kg)</label>
                  <input name="weight" type="number" step="0.1" defaultValue={user.healthProfile?.weight} className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-2xl font-bold text-slate-700 outline-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Alergias Conhecidas</label>
                <textarea name="allergies" defaultValue={user.healthProfile?.allergies} placeholder="Descreva alergias a medicamentos ou alimentos..." className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-2xl font-bold text-slate-700 outline-none min-h-[100px]"></textarea>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Histórico de Doenças e Cirurgias</label>
                <textarea name="medicalHistory" defaultValue={user.healthProfile?.medicalHistory} placeholder="Ex: Hipertensão, cirurgias passadas, uso contínuo de remédios..." className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-2xl font-bold text-slate-700 outline-none min-h-[150px]"></textarea>
              </div>

              <div className="pt-6 border-t border-slate-50">
                <button type="submit" disabled={isSaving} className="px-12 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2">
                   {isSaving ? <Loader2 className="animate-spin" size={20}/> : 'Salvar Ficha Médica'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'exams' && (
        <div className="animate-in slide-in-from-left duration-500 space-y-8">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                 <h2 className="text-2xl font-black text-slate-800">Repositório de Exames</h2>
                 <p className="text-slate-500 font-medium">Histórico de resultados anexados por você ou parceiros.</p>
              </div>
              <button className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl shadow-black/10 hover:bg-blue-600 active:scale-95 transition-all">
                 <Upload size={20}/>
                 Anexar Novo Resultado
              </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exams.map(exam => (
                <div key={exam.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                   <div className="flex items-start justify-between mb-6">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                         <FileSearch size={24}/>
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded">{exam.category}</span>
                   </div>
                   <h4 className="font-bold text-slate-800 mb-1">{exam.name}</h4>
                   <p className="text-xs text-slate-500 mb-6">{exam.laboratory} • {exam.date}</p>
                   <button className="w-full py-3 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-blue-600 hover:text-white transition-all active:scale-95">
                      <Download size={14}/>
                      Baixar PDF
                   </button>
                </div>
              ))}
              <div className="border-2 border-dashed border-slate-200 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
                 <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4"><Plus className="text-slate-300"/></div>
                 <p className="text-sm font-bold text-slate-400">Arraste seus arquivos aqui</p>
              </div>
           </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">
              <div className="flex items-center justify-between mb-5">
                 <h3 className="text-lg font-black text-slate-800">{editingHabit ? 'Configurar' : 'Nova Meta'}</h3>
                 <button onClick={() => setShowModal(false)} className="p-2 bg-slate-100 rounded-lg active:scale-90"><X size={18}/></button>
              </div>
              <form onSubmit={saveHabit} className="space-y-4">
                 <input name="title" type="text" defaultValue={editingHabit?.title} placeholder="Nome do Objetivo" className="w-full px-4 py-3.5 bg-slate-50 rounded-xl text-sm text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20" required />
                 <div className="grid grid-cols-2 gap-3">
                    <input name="target" type="number" defaultValue={editingHabit?.target} placeholder="Meta" className="w-full px-4 py-3.5 bg-slate-50 rounded-xl text-sm outline-none" required />
                    <select name="unit" defaultValue={editingHabit?.unit || 'unidade'} className="w-full px-4 py-3.5 bg-slate-50 rounded-xl text-sm outline-none">
                       <option value="ml">ml</option>
                       <option value="minutos">minutos</option>
                       <option value="passos">passos</option>
                       <option value="dose">dose</option>
                    </select>
                 </div>
                 <div className="pt-3 flex gap-3">
                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3.5 bg-slate-100 text-slate-500 text-sm font-bold rounded-xl active:scale-95">Cancelar</button>
                    <button type="submit" className="flex-1 py-3.5 bg-blue-600 text-white text-sm font-black rounded-xl active:scale-95">Salvar</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default MyHealth;
