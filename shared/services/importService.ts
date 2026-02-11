
import * as XLSX from 'xlsx';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { syncPatientToProvider, sincronizarPermissoesAposIntegracao } from './draovivoService';
import { trackApiAction } from './logService';

// --- Rate Limit Helpers ---

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Intervalo entre cada usuario para evitar rate limit do Supabase Auth
const DELAY_ENTRE_USUARIOS_MS = 800;

// Retry com backoff exponencial para erros de rate limit
async function retryComBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 2000
): Promise<T> {
  for (let tentativa = 0; tentativa <= maxRetries; tentativa++) {
    try {
      return await fn();
    } catch (error: any) {
      const isRateLimit =
        error?.status === 429 ||
        error?.message?.toLowerCase()?.includes('rate limit') ||
        error?.message?.toLowerCase()?.includes('too many requests');

      if (!isRateLimit || tentativa === maxRetries) {
        throw error;
      }

      const waitTime = baseDelay * Math.pow(2, tentativa); // 2s, 4s, 8s
      console.warn(`[Import] Rate limit atingido. Aguardando ${waitTime}ms antes de tentar novamente (tentativa ${tentativa + 1}/${maxRetries})...`);
      await delay(waitTime);
    }
  }
  throw new Error('Maximo de tentativas excedido');
}

// Mapeamento de colunas do Excel para campos do sistema
interface MapeamentoColunas {
  nome: string;
  email: string;
  cpf: string;
  celular: string;
  dataNascimento: string;
  plano?: string;
  empresa?: string;
  statusPlano?: string;
  tipoUsuario?: string;
  ddi?: string;
  sexo?: string;
  responsavel?: string;
  registro?: string;
  grupo?: string;
  id?: string;
}

// Configuracao padrao de mapeamento
const MAPEAMENTO_PADRAO: MapeamentoColunas = {
  nome: 'Nome',
  email: 'Email',
  cpf: 'CPF',
  celular: 'Celular',
  dataNascimento: 'Data Nascimento',
  plano: 'Plano',
  empresa: 'Empresa',
  statusPlano: 'Status',
  tipoUsuario: 'Tipo'
};

// Mapeamento Dr. ao Vivo (formato exportado pela plataforma)
const MAPEAMENTO_DRAOVIVO: MapeamentoColunas = {
  id: 'ID',
  nome: 'Nome',
  dataNascimento: 'Data de Nascimento',
  cpf: 'CPF',
  ddi: 'DDI',
  celular: 'Celular',
  registro: 'Registro',
  sexo: 'Sexo',
  responsavel: 'Responsável',
  email: 'E-mail',
  statusPlano: 'Status do Plano',
  plano: 'Plano',
  grupo: 'Grupo',
  empresa: 'Grupo'
};

interface UsuarioImportado {
  nome: string;
  email: string;
  cpf: string;
  celular: string;
  dataNascimento: string;
  plano: string;
  empresa: string;
  statusPlano: 'ACTIVE' | 'BLOCKED';
  tipoUsuario: 'PF' | 'PJ' | 'ADM';
  senha?: string;
  // Campos extras Dr. ao Vivo
  ddi?: string;
  sexo?: string;
  responsavel?: string;
  registro?: string;
  idDrAoVivo?: string;
}

interface ResultadoImportacao {
  total: number;
  sucesso: number;
  erros: number;
  detalhes: {
    linha: number;
    email: string;
    status: 'success' | 'error' | 'skipped';
    mensagem: string;
  }[];
}

/**
 * Formata CPF removendo caracteres especiais
 */
const formatarCPF = (cpf: string): string => {
  if (!cpf) return '';
  return String(cpf).replace(/\D/g, '').padStart(11, '0');
};

/**
 * Formata telefone removendo caracteres especiais
 */
const formatarTelefone = (telefone: string): string => {
  if (!telefone) return '';
  return String(telefone).replace(/\D/g, '');
};

/**
 * Formata data para o padrao YYYY-MM-DD
 */
const formatarData = (data: any): string => {
  if (!data) return '';

  // Se for numero (serial do Excel)
  if (typeof data === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + data * 86400000);
    return date.toISOString().split('T')[0];
  }

  // Se for string
  const dataStr = String(data);

  // Tenta DD/MM/YYYY
  if (dataStr.includes('/')) {
    const [dia, mes, ano] = dataStr.split('/');
    return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
  }

  // Tenta YYYY-MM-DD
  if (dataStr.includes('-')) {
    return dataStr.split('T')[0];
  }

  return dataStr;
};

// Senha padrão para todos os novos usuários
const SENHA_PADRAO = 'Saude@123';

/**
 * Gera plan_id a partir do nome da empresa
 * Mesmo formato usado no CompaniesManagementModule
 */
const gerarPlanId = (empresaNome: string): string => {
  return `plano_${empresaNome.toLowerCase().replace(/\s+/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`;
};

/**
 * Cria automaticamente registros de empresas na tabela `companies`
 * para todas as empresas presentes na lista de importacao que ainda nao existem.
 * Chamada internamente antes do loop principal de importacao.
 */
const criarEmpresasAutomaticamente = async (usuarios: UsuarioImportado[]): Promise<{
  criadas: string[];
  existentes: string[];
  erros: string[];
}> => {
  const resultado = { criadas: [] as string[], existentes: [] as string[], erros: [] as string[] };

  // Extrai nomes de empresa unicos (ignora vazios)
  const empresasUnicas = [...new Set(
    usuarios
      .map(u => u.empresa?.trim())
      .filter((e): e is string => !!e && e.length > 0)
  )];

  if (empresasUnicas.length === 0) return resultado;

  // Gera plan_ids correspondentes
  const planIds = empresasUnicas.map(gerarPlanId);

  // Busca empresas ja existentes por plan_id
  const { data: existentes } = await supabase
    .from('companies')
    .select('plan_id')
    .in('plan_id', planIds);

  const planIdsExistentes = new Set((existentes || []).map(e => e.plan_id));

  for (const empresaNome of empresasUnicas) {
    const planId = gerarPlanId(empresaNome);

    if (planIdsExistentes.has(planId)) {
      resultado.existentes.push(empresaNome);
      continue;
    }

    try {
      const { error } = await supabase.from('companies').insert([{
        name: empresaNome,
        plan_id: planId,
        rh_email: '',
        contracted_lives: 0,
        value_per_life: 0,
        is_active: true
      }]);

      if (error) throw error;

      resultado.criadas.push(empresaNome);
      console.log(`[Import] Empresa criada automaticamente: ${empresaNome} (${planId})`);
    } catch (err: any) {
      resultado.erros.push(`${empresaNome}: ${err.message}`);
      console.warn(`[Import] Erro ao criar empresa ${empresaNome}:`, err.message);
    }
  }

  return resultado;
};

// ============================================================================
// FLAG GLOBAL PARA CONTROLE DE SESSÃO DURANTE IMPORTAÇÃO
// ============================================================================
// Esta flag evita que o sistema mostre o modal de troca de senha durante
// operações de importação em massa. O modal só deve aparecer quando o
// próprio usuário PF fizer login com suas credenciais.
// ============================================================================

let isImportingUsers = false;

/**
 * Verifica se está em modo de importação em massa
 * Usado pelo App.tsx para evitar mostrar modal de troca de senha durante import
 */
export const isInBulkImportMode = (): boolean => {
  return isImportingUsers;
};

/**
 * Define o modo de importação (uso interno)
 */
const setImportMode = (mode: boolean): void => {
  isImportingUsers = mode;
  console.log(`[ImportService] Modo de importação: ${mode ? 'ATIVADO' : 'DESATIVADO'}`);
};

/**
 * Retorna a senha padrão do sistema
 * Todos os usuários devem trocar no primeiro acesso
 */
const getSenhaPadrao = (): string => {
  return SENHA_PADRAO;
};

/**
 * Detecta o formato do arquivo baseado nas colunas
 */
const detectarFormato = (colunas: string[]): 'padrao' | 'draovivo' => {
  const colunasLower = colunas.map(c => String(c).toLowerCase().trim());

  // Verifica se tem colunas específicas do Dr. ao Vivo
  const colunasdrAoVivo = ['e-mail', 'status do plano', 'data de nascimento', 'responsável'];
  const matchDrAoVivo = colunasdrAoVivo.filter(c => colunasLower.includes(c)).length;

  if (matchDrAoVivo >= 2) {
    return 'draovivo';
  }

  return 'padrao';
};

/**
 * Formata o telefone com DDI
 */
const formatarTelefoneComDDI = (ddi: string, celular: string): string => {
  const ddiClean = String(ddi || '55').replace(/\D/g, '');
  const celularClean = String(celular || '').replace(/\D/g, '');
  return `${ddiClean}${celularClean}`;
};

/**
 * Le arquivo Excel e retorna array de dados
 * Detecta automaticamente se é formato padrão ou Dr. ao Vivo
 */
export const lerArquivoExcel = async (
  file: File,
  mapeamento: Partial<MapeamentoColunas> = {},
  formatoForced?: 'padrao' | 'draovivo'
): Promise<UsuarioImportado[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Pega a primeira aba
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Converte para JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (jsonData.length === 0) {
          resolve([]);
          return;
        }

        // Detecta formato baseado nas colunas
        const colunas = Object.keys(jsonData[0] as object);
        const formato = formatoForced || detectarFormato(colunas);

        // Seleciona mapeamento correto
        const map = formato === 'draovivo'
          ? { ...MAPEAMENTO_DRAOVIVO, ...mapeamento }
          : { ...MAPEAMENTO_PADRAO, ...mapeamento };

        console.log(`Formato detectado: ${formato}`, { colunas, map });

        // Mapeia os dados
        const usuarios: UsuarioImportado[] = jsonData.map((row: any) => {
          // Determina tipo de usuario
          let tipoUsuario: 'PF' | 'PJ' | 'ADM' = 'PF';

          // No formato Dr. ao Vivo, se tem Grupo = PJ (beneficiário corporativo)
          if (formato === 'draovivo') {
            const grupo = String(row[map.grupo!] || row['Grupo'] || '').trim();
            if (grupo) {
              tipoUsuario = 'PJ';
            }
          } else {
            const tipoRaw = String(row[map.tipoUsuario!] || '').toUpperCase();
            if (tipoRaw.includes('PJ') || tipoRaw.includes('EMPRESA') || tipoRaw.includes('BENEFICIARIO')) {
              tipoUsuario = 'PJ';
            } else if (tipoRaw.includes('ADM') || tipoRaw.includes('GESTOR') || tipoRaw.includes('RH')) {
              tipoUsuario = 'ADM';
            }
          }

          // Determina status do plano
          let statusPlano: 'ACTIVE' | 'BLOCKED' = 'ACTIVE';
          const statusRaw = String(row[map.statusPlano!] || '').toUpperCase();
          if (statusRaw.includes('BLOQ') || statusRaw.includes('INATIV') || statusRaw.includes('PEND') || statusRaw.includes('BLOCKED')) {
            statusPlano = 'BLOCKED';
          }

          // Monta celular com DDI (para formato Dr. ao Vivo)
          let celular = '';
          if (formato === 'draovivo') {
            const ddi = row[map.ddi!] || row['DDI'] || '55';
            const cel = row[map.celular] || row['Celular'] || '';
            celular = formatarTelefoneComDDI(ddi, cel);
          } else {
            celular = formatarTelefone(row[map.celular]);
          }

          // Monta o objeto do usuario
          return {
            nome: String(row[map.nome] || '').trim(),
            email: String(row[map.email] || row['E-mail'] || '').toLowerCase().trim(),
            cpf: formatarCPF(row[map.cpf] || row['CPF']),
            celular,
            dataNascimento: formatarData(row[map.dataNascimento] || row['Data de Nascimento']),
            plano: String(row[map.plano!] || row['Plano'] || 'plano_padrao').trim(),
            empresa: String(row[map.empresa!] || row['Grupo'] || '').trim(),
            statusPlano,
            tipoUsuario,
            senha: getSenhaPadrao(),
            // Campos extras Dr. ao Vivo
            ddi: formato === 'draovivo' ? String(row[map.ddi!] || row['DDI'] || '55') : undefined,
            sexo: formato === 'draovivo' ? String(row[map.sexo!] || row['Sexo'] || '') : undefined,
            responsavel: formato === 'draovivo' ? String(row[map.responsavel!] || row['Responsável'] || '') : undefined,
            registro: formato === 'draovivo' ? String(row[map.registro!] || row['Registro'] || '') : undefined,
            idDrAoVivo: formato === 'draovivo' ? String(row[map.id!] || row['ID'] || '') : undefined
          };
        });

        // Filtra registros invalidos
        const usuariosValidos = usuarios.filter(u => u.email && u.nome && u.cpf);

        resolve(usuariosValidos);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Importa usuarios para o Supabase e sincroniza com Dr. ao Vivo
 * IMPORTANTE: Preserva a sessão do admin durante toda a importação
 */
export const importarUsuarios = async (
  usuarios: UsuarioImportado[],
  opcoes: {
    sincronizarProvedor?: boolean;
    atualizarExistentes?: boolean;
    enviarEmailBoasVindas?: boolean;
    onProgress?: (processados: number, total: number, emailAtual: string) => void;
  } = {}
): Promise<ResultadoImportacao> => {
  const {
    sincronizarProvedor = true,
    atualizarExistentes = false,
    onProgress
  } = opcoes;

  const resultado: ResultadoImportacao = {
    total: usuarios.length,
    sucesso: 0,
    erros: 0,
    detalhes: []
  };

  // IMPORTANTE: Salva a sessão do admin ANTES de iniciar a importação
  // Isso evita que o sistema troque para a sessão do usuário recém-criado
  const { data: { session: masterSession } } = await supabase.auth.getSession();

  if (!masterSession) {
    throw new Error('Sessão de administrador não encontrada. Faça login novamente.');
  }

  // ATIVA O MODO DE IMPORTAÇÃO - Isso impede que o modal de troca de senha apareça
  // O App.tsx verifica esta flag e ignora eventos de auth durante a importação
  setImportMode(true);

  try {
  // Auto-cria empresas que ainda nao existem na tabela companies
  const empresasResult = await criarEmpresasAutomaticamente(usuarios);
  if (empresasResult.criadas.length > 0) {
    console.log(`[Import] Empresas criadas: ${empresasResult.criadas.join(', ')}`);
  }

  for (let i = 0; i < usuarios.length; i++) {
    const usuario = usuarios[i];
    const linha = i + 2; // +2 porque linha 1 e cabecalho e indice comeca em 0

    // Notifica progresso para a UI
    if (onProgress) {
      onProgress(i, usuarios.length, usuario.email);
    }

    // Delay entre usuarios para evitar rate limit do Supabase Auth
    if (i > 0) {
      await delay(DELAY_ENTRE_USUARIOS_MS);
    }

    try {
      // Verifica duplicidade por EMAIL
      const { data: existentePorEmail } = await supabase
        .from('profiles')
        .select('id, email, cpf')
        .eq('email', usuario.email)
        .maybeSingle();

      // Verifica duplicidade por CPF
      const { data: existentePorCPF } = await supabase
        .from('profiles')
        .select('id, email, cpf')
        .eq('cpf', usuario.cpf)
        .maybeSingle();

      // Se existe por CPF mas com email diferente, é conflito
      if (existentePorCPF && existentePorCPF.email !== usuario.email) {
        resultado.detalhes.push({
          linha,
          email: usuario.email,
          status: 'error',
          mensagem: `CPF ${usuario.cpf} ja cadastrado com outro email: ${existentePorCPF.email}`
        });
        resultado.erros++;
        continue;
      }

      const existente = existentePorEmail || existentePorCPF;

      if (existente && !atualizarExistentes) {
        resultado.detalhes.push({
          linha,
          email: usuario.email,
          status: 'skipped',
          mensagem: 'Usuario ja existe no sistema (email ou CPF duplicado)'
        });
        continue;
      }

      let userId = existente?.id;

      if (!existente) {
        // Cria usuario no Supabase Auth (com retry para rate limit)
        const authResult = await retryComBackoff(async () => {
          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: usuario.email,
            password: usuario.senha!,
            email_confirm: true,
            user_metadata: {
              full_name: usuario.nome,
              user_type: usuario.tipoUsuario,
              plan_status: usuario.statusPlano,
              cpf: usuario.cpf,
              cell_phone: usuario.celular,
              birth_date: usuario.dataNascimento
            }
          });

          if (authError) {
            // Se admin.createUser falhou por rate limit, propaga para retry
            const isRateLimit =
              authError.status === 429 ||
              authError.message?.toLowerCase()?.includes('rate limit') ||
              authError.message?.toLowerCase()?.includes('too many requests');
            if (isRateLimit) throw authError;

            // Se admin.createUser nao funcionar por outro motivo, tenta signUp normal
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email: usuario.email,
              password: usuario.senha!,
              options: {
                data: {
                  full_name: usuario.nome,
                  user_type: usuario.tipoUsuario,
                  plan_status: usuario.statusPlano,
                  cpf: usuario.cpf,
                  cell_phone: usuario.celular,
                  birth_date: usuario.dataNascimento
                }
              }
            });

            if (signUpError) {
              // Ambos falharam - usuario provavelmente ja existe no Auth mas nao no profiles
              // Tenta recuperar o ID fazendo login com a senha padrao
              const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email: usuario.email,
                password: usuario.senha!
              });

              // Restaura sessao do admin IMEDIATAMENTE
              if (masterSession) {
                await supabase.auth.setSession({
                  access_token: masterSession.access_token,
                  refresh_token: masterSession.refresh_token
                });
              }

              if (!signInError && signInData.user?.id) {
                console.log(`[Import] Usuario ${usuario.email} recuperado do Auth (existia sem profile)`);
                return signInData.user.id;
              }

              // Se login tambem falhou, tenta com a senha padrao caso a senha do CSV seja diferente
              if (usuario.senha !== SENHA_PADRAO) {
                const { data: signInDefault, error: signInDefaultError } = await supabase.auth.signInWithPassword({
                  email: usuario.email,
                  password: SENHA_PADRAO
                });

                if (masterSession) {
                  await supabase.auth.setSession({
                    access_token: masterSession.access_token,
                    refresh_token: masterSession.refresh_token
                  });
                }

                if (!signInDefaultError && signInDefault.user?.id) {
                  console.log(`[Import] Usuario ${usuario.email} recuperado do Auth com senha padrao`);
                  return signInDefault.user.id;
                }
              }

              throw new Error(`Usuario existe no Auth mas nao foi possivel recuperar o ID. Erro original: ${authError.message}`);
            }

            // signUp deu certo - restaura sessao do admin
            if (masterSession) {
              await supabase.auth.setSession({
                access_token: masterSession.access_token,
                refresh_token: masterSession.refresh_token
              });
            }

            return signUpData.user?.id;
          }

          return authData.user?.id;
        });

        userId = authResult;
      }

      if (!userId) throw new Error('Falha ao obter ID do usuario');

      // Monta o plan_id (usa mesma funcao que cria empresas para garantir consistencia)
      const planId = usuario.empresa
        ? gerarPlanId(usuario.empresa)
        : usuario.plano || 'plano_individual';

      // Insere/atualiza profile
      const profileData = {
        id: userId,
        email: usuario.email,
        full_name: usuario.nome,
        cpf: usuario.cpf,
        cell_phone: usuario.celular,
        birth_date: usuario.dataNascimento,
        user_type: usuario.tipoUsuario,
        plan_status: usuario.statusPlano,
        plan_id: planId,
        timezone: 'America/Cuiaba',
        must_change_password: true,
        is_validated: false
      };

      // Usa upsert para cobrir tanto usuarios novos quanto recuperados do Auth
      await supabase.from('profiles').upsert([profileData], { onConflict: 'id' });

      // Se for PJ, adiciona ao patient_registry
      if (usuario.tipoUsuario === 'PJ' && usuario.empresa) {
        await supabase.from('patient_registry').upsert([{
          email: usuario.email,
          empresa: usuario.empresa,
          plan_status: usuario.statusPlano
        }], { onConflict: 'email' });
      }

      // Sincroniza com provedor de telemedicina
      if (sincronizarProvedor && (usuario.tipoUsuario === 'PF' || usuario.tipoUsuario === 'PJ')) {
        try {
          const syncResult = await syncPatientToProvider({
            id: userId,
            name: usuario.nome,
            email: usuario.email,
            cpf: usuario.cpf,
            cell_phone: usuario.celular,
            birth_date: usuario.dataNascimento,
            plan_id: planId,
            plan_status: usuario.statusPlano,
            timezone: 'America/Cuiaba',
            password: usuario.senha
          });

          // Configura permissoes se a sincronizacao retornou personId
          if (syncResult.data?.personId) {
            await sincronizarPermissoesAposIntegracao(syncResult.data.personId, planId);
          }
        } catch (syncErr) {
          console.warn(`Aviso: Falha ao sincronizar ${usuario.email} com provedor:`, syncErr);
        }
      }

      resultado.sucesso++;
      resultado.detalhes.push({
        linha,
        email: usuario.email,
        status: 'success',
        mensagem: existente ? 'Usuario atualizado' : `Usuario criado. Senha padrao: ${SENHA_PADRAO} (trocar no 1o acesso)`
      });

    } catch (error: any) {
      resultado.erros++;
      resultado.detalhes.push({
        linha,
        email: usuario.email,
        status: 'error',
        mensagem: error.message || 'Erro desconhecido'
      });
    }
  }

  // Notifica progresso final (100%)
  if (onProgress) {
    onProgress(usuarios.length, usuarios.length, 'Concluido');
  }

  // GARANTIA FINAL: Restaura sessão do admin após toda a importação
  // Mesmo que algo tenha falhado, a sessão do admin será preservada
  if (masterSession) {
    try {
      await supabase.auth.setSession({
        access_token: masterSession.access_token,
        refresh_token: masterSession.refresh_token
      });
    } catch (sessionError) {
      console.error('Erro ao restaurar sessão do admin:', sessionError);
    }
  }

  // Log da importacao
  await trackApiAction({
    userId: 'system',
    userName: 'Importacao em Massa',
    actionType: 'BULK_IMPORT_USERS',
    provider: 'Supabase',
    payload: {
      total: resultado.total,
      sucesso: resultado.sucesso,
      erros: resultado.erros
    },
    status: resultado.erros === 0 ? 'SUCCESS' : 'PARTIAL'
  });

  return resultado;

  } finally {
    // DESATIVA O MODO DE IMPORTAÇÃO - SEMPRE, mesmo em caso de erro
    // Isso permite que o sistema volte a funcionar normalmente
    setImportMode(false);
  }
};

/**
 * Exporta relatorio de importacao para Excel
 */
export const exportarRelatorioImportacao = (resultado: ResultadoImportacao): void => {
  const dados = resultado.detalhes.map(d => ({
    'Linha': d.linha,
    'Email': d.email,
    'Status': d.status === 'success' ? 'Sucesso' : d.status === 'error' ? 'Erro' : 'Ignorado',
    'Mensagem': d.mensagem
  }));

  const ws = XLSX.utils.json_to_sheet(dados);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Resultado Importacao');

  XLSX.writeFile(wb, `importacao_${new Date().toISOString().split('T')[0]}.xlsx`);
};

/**
 * Gera template Excel para importacao (formato padrão)
 */
export const gerarTemplateExcel = (): void => {
  const templateData = [
    {
      'Nome': 'Joao da Silva',
      'Email': 'joao@email.com',
      'CPF': '123.456.789-00',
      'Celular': '(11) 99999-9999',
      'Data Nascimento': '01/01/1990',
      'Plano': 'plano_basico',
      'Empresa': 'Empresa XYZ',
      'Status': 'ATIVO',
      'Tipo': 'PJ'
    },
    {
      'Nome': 'Maria Santos',
      'Email': 'maria@email.com',
      'CPF': '987.654.321-00',
      'Celular': '(11) 88888-8888',
      'Data Nascimento': '15/06/1985',
      'Plano': 'plano_premium',
      'Empresa': '',
      'Status': 'ATIVO',
      'Tipo': 'PF'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);

  // Define largura das colunas
  ws['!cols'] = [
    { wch: 25 }, // Nome
    { wch: 30 }, // Email
    { wch: 15 }, // CPF
    { wch: 18 }, // Celular
    { wch: 15 }, // Data Nascimento
    { wch: 20 }, // Plano
    { wch: 20 }, // Empresa
    { wch: 10 }, // Status
    { wch: 10 }  // Tipo
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template Usuarios');

  XLSX.writeFile(wb, 'template_importacao_usuarios.xlsx');
};

/**
 * Gera template Excel no formato Dr. ao Vivo
 */
export const gerarTemplateDrAoVivo = (): void => {
  const templateData = [
    {
      'ID': '',
      'Nome': 'Joao da Silva',
      'Data de Nascimento': '01/01/1990',
      'CPF': '123.456.789-00',
      'DDI': '55',
      'Celular': '11999999999',
      'Registro': '',
      'Sexo': 'M',
      'Responsável': '',
      'E-mail': 'joao@email.com',
      'Status do Plano': 'ACTIVE',
      'Plano': 'plano_corporativo',
      'Grupo': 'Empresa ABC',
      'Data de criação': ''
    },
    {
      'ID': '',
      'Nome': 'Maria Santos',
      'Data de Nascimento': '15/06/1985',
      'CPF': '987.654.321-00',
      'DDI': '55',
      'Celular': '11888888888',
      'Registro': '',
      'Sexo': 'F',
      'Responsável': '',
      'E-mail': 'maria@email.com',
      'Status do Plano': 'ACTIVE',
      'Plano': 'plano_individual',
      'Grupo': '',
      'Data de criação': ''
    }
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);

  // Define largura das colunas
  ws['!cols'] = [
    { wch: 10 }, // ID
    { wch: 25 }, // Nome
    { wch: 18 }, // Data de Nascimento
    { wch: 15 }, // CPF
    { wch: 6 },  // DDI
    { wch: 15 }, // Celular
    { wch: 12 }, // Registro
    { wch: 6 },  // Sexo
    { wch: 25 }, // Responsável
    { wch: 30 }, // E-mail
    { wch: 15 }, // Status do Plano
    { wch: 20 }, // Plano
    { wch: 20 }, // Grupo
    { wch: 15 }  // Data de criação
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template DrAoVivo');

  XLSX.writeFile(wb, 'template_draovivo_importacao.xlsx');
};

/**
 * Exporta pacientes existentes para formato Dr. ao Vivo
 * Útil para migração e sincronização em massa
 */
export const exportarParaFormatoDrAoVivo = async (): Promise<void> => {
  try {
    // Busca todos os pacientes (PF e PJ) do sistema
    const { data: pacientes, error } = await supabase
      .from('profiles')
      .select('*')
      .in('user_type', ['PF', 'PJ'])
      .order('full_name');

    if (error) throw error;

    if (!pacientes || pacientes.length === 0) {
      throw new Error('Nenhum paciente encontrado para exportar');
    }

    // Mapeia para formato Dr. ao Vivo
    const dadosExportacao = pacientes.map(p => ({
      'ID': '',
      'Nome': p.full_name || '',
      'Data de Nascimento': p.birth_date ? formatarDataParaExibicao(p.birth_date) : '',
      'CPF': formatarCPFParaExibicao(p.cpf || ''),
      'DDI': '55',
      'Celular': (p.cell_phone || '').replace(/^55/, ''),
      'Registro': '',
      'Sexo': '',
      'Responsável': '',
      'E-mail': p.email || '',
      'Status do Plano': p.plan_status || 'ACTIVE',
      'Plano': p.plan_id || 'plano_padrao',
      'Grupo': p.user_type === 'PJ' ? (p.company_name || 'Corporativo') : '',
      'Data de criação': p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : ''
    }));

    const ws = XLSX.utils.json_to_sheet(dadosExportacao);

    ws['!cols'] = [
      { wch: 10 }, { wch: 25 }, { wch: 18 }, { wch: 15 },
      { wch: 6 }, { wch: 15 }, { wch: 12 }, { wch: 6 },
      { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 20 },
      { wch: 20 }, { wch: 15 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pacientes Vivemus');

    const dataAtual = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `pacientes_vivemus_${dataAtual}.xlsx`);
  } catch (error: any) {
    console.error('Erro ao exportar pacientes:', error);
    throw error;
  }
};

/**
 * Formata data para exibição DD/MM/YYYY
 */
const formatarDataParaExibicao = (data: string): string => {
  if (!data) return '';
  try {
    const [ano, mes, dia] = data.split('T')[0].split('-');
    return `${dia}/${mes}/${ano}`;
  } catch {
    return data;
  }
};

/**
 * Formata CPF para exibição XXX.XXX.XXX-XX
 */
const formatarCPFParaExibicao = (cpf: string): string => {
  const clean = String(cpf).replace(/\D/g, '').padStart(11, '0');
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
};

// ============================================================================
// GESTÃO DE PACIENTES - FUNÇÕES ADMINISTRATIVAS
// ============================================================================

export interface Paciente {
  id: string;
  email: string;
  full_name: string;
  cpf: string;
  cell_phone: string;
  user_type: 'PF' | 'PJ' | 'ADM';
  plan_status: 'ACTIVE' | 'BLOCKED';
  plan_id: string;
  must_change_password: boolean;
  created_at: string;
  company_name?: string;
}

/**
 * Busca todos os pacientes do sistema
 */
export const buscarPacientes = async (filtros?: {
  tipo?: 'PF' | 'PJ' | 'ADM' | 'todos';
  status?: 'ACTIVE' | 'BLOCKED' | 'todos';
  busca?: string;
}): Promise<Paciente[]> => {
  try {
    let query = supabase
      .from('profiles')
      .select('*')
      .order('full_name');

    // Filtro por tipo
    if (filtros?.tipo && filtros.tipo !== 'todos') {
      query = query.eq('user_type', filtros.tipo);
    } else {
      // Por padrão, busca apenas PF e PJ (pacientes)
      query = query.in('user_type', ['PF', 'PJ']);
    }

    // Filtro por status
    if (filtros?.status && filtros.status !== 'todos') {
      query = query.eq('plan_status', filtros.status);
    }

    // Filtro por busca (nome, email ou CPF)
    if (filtros?.busca) {
      const busca = filtros.busca.toLowerCase();
      query = query.or(`full_name.ilike.%${busca}%,email.ilike.%${busca}%,cpf.ilike.%${busca}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('Erro ao buscar pacientes:', error);
    throw error;
  }
};

/**
 * Reseta a senha de um paciente para o padrão (Saude@123)
 */
export const resetarSenhaPaciente = async (userId: string): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    // Atualiza a senha no Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: SENHA_PADRAO
    });

    if (authError) {
      // Se admin.updateUserById não funcionar, tenta método alternativo
      console.warn('Admin API não disponível, tentando método alternativo...');
      // Não podemos alterar a senha sem a API admin, então retornamos erro
      throw new Error('Não foi possível resetar a senha. Verifique as permissões de admin.');
    }

    // Marca que o usuário deve trocar a senha no próximo login
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ must_change_password: true })
      .eq('id', userId);

    if (profileError) throw profileError;

    // Log da ação
    await trackApiAction({
      userId: 'admin',
      userName: 'Sistema',
      actionType: 'RESET_PASSWORD',
      provider: 'Supabase',
      payload: { targetUserId: userId, newPassword: '***' },
      status: 'SUCCESS'
    });

    return { success: true };
  } catch (error: any) {
    console.error('Erro ao resetar senha:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Reseta senha de múltiplos pacientes
 */
export const resetarSenhaEmMassa = async (userIds: string[]): Promise<{
  total: number;
  sucesso: number;
  erros: number;
  detalhes: { userId: string; success: boolean; error?: string }[];
}> => {
  const resultado = {
    total: userIds.length,
    sucesso: 0,
    erros: 0,
    detalhes: [] as { userId: string; success: boolean; error?: string }[]
  };

  for (const userId of userIds) {
    const result = await resetarSenhaPaciente(userId);
    if (result.success) {
      resultado.sucesso++;
    } else {
      resultado.erros++;
    }
    resultado.detalhes.push({ userId, ...result });
  }

  return resultado;
};

/**
 * Altera o status do plano de um paciente
 */
export const alterarStatusPaciente = async (
  userId: string,
  novoStatus: 'ACTIVE' | 'BLOCKED'
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ plan_status: novoStatus })
      .eq('id', userId);

    if (error) throw error;

    // Log da ação
    await trackApiAction({
      userId: 'admin',
      userName: 'Sistema',
      actionType: novoStatus === 'ACTIVE' ? 'ACTIVATE_PATIENT' : 'BLOCK_PATIENT',
      provider: 'Supabase',
      payload: { targetUserId: userId, newStatus: novoStatus },
      status: 'SUCCESS'
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Verifica se um CPF já está cadastrado no sistema
 */
export const verificarDuplicidadeCPF = async (cpf: string): Promise<{
  existe: boolean;
  paciente?: Paciente;
}> => {
  try {
    const cpfClean = cpf.replace(/\D/g, '');
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('cpf', cpfClean)
      .maybeSingle();

    return { existe: !!data, paciente: data || undefined };
  } catch {
    return { existe: false };
  }
};

/**
 * Verifica se um email já está cadastrado no sistema
 */
export const verificarDuplicidadeEmail = async (email: string): Promise<{
  existe: boolean;
  paciente?: Paciente;
}> => {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    return { existe: !!data, paciente: data || undefined };
  } catch {
    return { existe: false };
  }
};

/**
 * Exclui um paciente do sistema (soft delete - apenas bloqueia)
 */
export const excluirPaciente = async (userId: string): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    // Ao invés de deletar, apenas bloqueia o usuário
    const { error } = await supabase
      .from('profiles')
      .update({
        plan_status: 'BLOCKED',
        email: `deleted_${Date.now()}_${userId}@deleted.local` // Invalida o email
      })
      .eq('id', userId);

    if (error) throw error;

    await trackApiAction({
      userId: 'admin',
      userName: 'Sistema',
      actionType: 'DELETE_PATIENT',
      provider: 'Supabase',
      payload: { targetUserId: userId },
      status: 'SUCCESS'
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Retorna a senha padrão do sistema (para exibição ao admin)
 */
export const obterSenhaPadrao = (): string => SENHA_PADRAO;
