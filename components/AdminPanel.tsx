
import React, { useState, useEffect } from 'react';
import { ShieldAlert, Crown, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { BrandSettings, UserData } from '../App';
import { Partner } from '../types';
import { supabase } from '../lib/supabase';
import AdminSidebar from './AdminSidebar';
import AdminPartnersList from './AdminPartnersList';
import AdminBrandingForm from './AdminBrandingForm';
import AdminPartnerDrawer from './AdminPartnerDrawer';
import { OverviewModule, APIModule, AIModule, LogsModule, UsersModule, AsaasConfigModule, ImportUsersModule, CompaniesManagementModule, WhatsAppConfigModule, PatientManagementModule, PatientSectionsModule } from './AdminModules';
import { importarUsuarios } from '../services/importService';
import { gerarLinksWhatsAppMassa } from '../services/whatsappService';

interface AdminPanelProps {
  user: UserData;
  onUpdateBranding: (settings: BrandSettings) => void;
  currentBranding: BrandSettings;
  partners: Partner[];
  onRefresh: () => void;
}

export type AdminTab = 'overview' | 'partners' | 'branding' | 'logs' | 'users' | 'database' | 'api' | 'ai_training' | 'asaas' | 'import' | 'contracts' | 'whatsapp' | 'patients' | 'patient_sections';

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  user,
  onUpdateBranding, 
  currentBranding, 
  partners,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // --- Background Import State ---
  const [bgImporting, setBgImporting] = useState(false);
  const [bgImportProgress, setBgImportProgress] = useState({ current: 0, total: 0, email: '' });
  const [bgImportResult, setBgImportResult] = useState<any>(null);
  const [bgImportError, setBgImportError] = useState<string | null>(null);
  const [bgImportWhatsappLinks, setBgImportWhatsappLinks] = useState<string[]>([]);
  const [bgImportUsuarios, setBgImportUsuarios] = useState<any[]>([]);
  const [bgFloatingDismissed, setBgFloatingDismissed] = useState(false);

  const isMaster = user.type === 'MASTER';

  const startBackgroundImport = async (
    usuarios: any[],
    opcoes: { sincronizarProvedor: boolean; atualizarExistentes: boolean; enviarWhatsApp: boolean }
  ) => {
    if (bgImporting) return;
    setBgImporting(true);
    setBgImportResult(null);
    setBgImportError(null);
    setBgImportWhatsappLinks([]);
    setBgImportUsuarios(usuarios);
    setBgImportProgress({ current: 0, total: usuarios.length, email: '' });
    setBgFloatingDismissed(false);

    try {
      const result = await importarUsuarios(usuarios, {
        sincronizarProvedor: opcoes.sincronizarProvedor,
        atualizarExistentes: opcoes.atualizarExistentes,
        onProgress: (processados, total, emailAtual) => {
          setBgImportProgress({ current: processados, total, email: emailAtual });
        }
      });

      setBgImportResult(result);

      if (opcoes.enviarWhatsApp && result.sucesso > 0) {
        try {
          const usuariosSucesso = result.detalhes
            .filter((d: any) => d.status === 'success')
            .map((d: any) => usuarios.find((u: any) => u.email === d.email))
            .filter(Boolean);
          const links = await gerarLinksWhatsAppMassa(usuariosSucesso as any);
          setBgImportWhatsappLinks(links);
        } catch (whatsappErr) {
          console.warn('Erro ao gerar links WhatsApp:', whatsappErr);
        }
      }
    } catch (err: any) {
      setBgImportError(err.message || 'Erro durante importacao');
    } finally {
      setBgImporting(false);
    }
  };

  const resetBackgroundImport = () => {
    setBgImportResult(null);
    setBgImportError(null);
    setBgImportWhatsappLinks([]);
    setBgImportUsuarios([]);
    setBgImportProgress({ current: 0, total: 0, email: '' });
    setBgFloatingDismissed(false);
  };

  const handleUpdateBrandingDB = async (settings: BrandSettings) => {
    if (!isMaster) return alert("Permissão negada: Apenas MASTER pode alterar o Branding Global.");
    try {
      const { error } = await supabase.from('system_settings').upsert({
        key: 'branding',
        value: settings,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      onUpdateBranding(settings);
      localStorage.setItem('vivemus_brand', JSON.stringify(settings));
      alert("Identidade Visual atualizada com sucesso!");
    } catch (err: any) {
      alert("Erro ao salvar branding: " + err.message);
    }
  };

  const handleOpenDrawer = (partner?: Partner) => {
    if (partner) {
      setEditingPartner({ ...partner });
    } else {
      setEditingPartner({
        id: '', name: '', category: '', whatsapp: '', coupon: '', discount: '',
        image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=800',
        description: '', rating: 5.0,
        is_active: true 
      });
    }
    setIsDrawerOpen(true);
  };

  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPartner) return;
    setIsSaving(true);
    try {
      const { id, ...partnerData } = editingPartner;
      if (id && id.length > 5) {
        const { error } = await supabase.from('partners').update(partnerData).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('partners').insert([partnerData]);
        if (error) throw error;
      }
      onRefresh(); 
      setIsDrawerOpen(false);
      setEditingPartner(null);
    } catch (err: any) {
      alert("Erro ao persistir: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePartner = async (id: string) => {
    if (!window.confirm("Esta ação é irreversível. Remover este parceiro permanentemente?")) return;
    try {
      const { error } = await supabase.from('partners').delete().eq('id', id);
      if (error) throw error;
      onRefresh();
    } catch (err: any) {
      alert("Erro ao excluir: Falha na conexão com o banco.");
    }
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'overview': return <OverviewModule partners={partners} onNavigate={setActiveTab} />;
      case 'partners': return <AdminPartnersList partners={partners} onAdd={() => handleOpenDrawer()} onEdit={handleOpenDrawer} onDelete={handleDeletePartner} onRefresh={onRefresh} />;
      case 'contracts': return <CompaniesManagementModule />;
      case 'api': return <APIModule />;
      case 'asaas': return <AsaasConfigModule />;
      case 'whatsapp': return <WhatsAppConfigModule />;
      case 'ai_training': return <AIModule />;
      case 'import': return <ImportUsersModule
        isImporting={bgImporting}
        importProgress={bgImportProgress}
        importResult={bgImportResult}
        importError={bgImportError}
        importWhatsappLinks={bgImportWhatsappLinks}
        importUsuarios={bgImportUsuarios}
        onStartImport={startBackgroundImport}
        onResetImport={resetBackgroundImport}
      />;
      case 'patients': return <PatientManagementModule />;
      case 'patient_sections': return <PatientSectionsModule />;
      case 'branding': return <AdminBrandingForm currentBranding={currentBranding} onApplyBranding={handleUpdateBrandingDB} />;
      case 'users': return <UsersModule isMaster={isMaster} />;
      case 'logs': return <LogsModule />;
      default: return <OverviewModule partners={partners} onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-3xl flex items-center justify-center shadow-2xl border transition-all ${
            isMaster ? 'bg-amber-500 text-white border-amber-600' : 'bg-slate-900 text-blue-400 border-blue-500/20'
          }`}>
            {isMaster ? <Crown size={28} /> : <ShieldAlert size={28} />}
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Vivemus OS Console</h1>
            <p className="text-slate-500 font-medium text-sm">
              {isMaster ? 'Modo System Owner Ativo' : 'Modo Platform Management'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <AdminSidebar user={user} activeTab={activeTab} setActiveTab={setActiveTab} partnersCount={partners.length} isImporting={bgImporting} />
        <div className="lg:col-span-3">
           {renderContent()}
        </div>
      </div>

      {isDrawerOpen && (
        <AdminPartnerDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          partner={editingPartner}
          setPartner={setEditingPartner}
          onSave={handleSavePartner}
          isSaving={isSaving}
        />
      )}

      {/* Floating Import Progress - visivel de qualquer aba */}
      {!bgFloatingDismissed && (bgImporting || bgImportError || (bgImportResult && activeTab !== 'import')) && (
        <div className="fixed bottom-6 right-6 z-50" style={{ maxWidth: '340px' }}>
          <div className={`bg-white rounded-2xl shadow-2xl border p-4 ${
            bgImportError ? 'border-red-200' :
            bgImportResult
              ? bgImportResult.erros === 0 ? 'border-emerald-200' : 'border-amber-200'
              : 'border-blue-200'
          }`}>
            {bgImporting ? (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <Loader2 size={20} className="text-blue-600 animate-spin flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-800">Importando Usuarios</p>
                    <p className="text-xs text-slate-500 truncate">
                      {bgImportProgress.current}/{bgImportProgress.total} - {bgImportProgress.email}
                    </p>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${bgImportProgress.total > 0 ? Math.round((bgImportProgress.current / bgImportProgress.total) * 100) : 0}%` }}
                  />
                </div>
                {activeTab !== 'import' && (
                  <button
                    onClick={() => setActiveTab('import')}
                    className="mt-2 text-xs text-blue-600 font-bold hover:underline"
                  >
                    Ver detalhes
                  </button>
                )}
              </>
            ) : bgImportError ? (
              <div className="flex items-center gap-3">
                <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-800">Erro na Importacao</p>
                  <p className="text-xs text-red-600 truncate">{bgImportError}</p>
                </div>
                <button onClick={() => { setBgImportError(null); setBgFloatingDismissed(true); }} className="p-1 hover:bg-slate-100 rounded-lg">
                  <X size={14} className="text-slate-400" />
                </button>
              </div>
            ) : bgImportResult ? (
              <div className="flex items-center gap-3">
                {bgImportResult.erros === 0 ? (
                  <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle size={20} className="text-amber-600 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-800">
                    Importacao {bgImportResult.erros === 0 ? 'Concluida' : 'Parcial'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {bgImportResult.sucesso} criados, {bgImportResult.erros} erros
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveTab('import')}
                    className="px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-100"
                  >
                    Ver
                  </button>
                  <button onClick={() => setBgFloatingDismissed(true)} className="p-1 hover:bg-slate-100 rounded-lg">
                    <X size={14} className="text-slate-400" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
