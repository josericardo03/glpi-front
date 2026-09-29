import type {
  Aprovacao,
  AtivoDetalhe,
  AuditLog,
  Branding,
  Categoria,
  ChamadoDetalhe,
  Cliente,
  Departamento,
  GrupoSuporte,
  HorarioComercial,
  Integracao,
  KbArtigo,
  KbCategoria,
  Notificacao,
  PoliticaSla,
  Prioridade,
  StatusChamado,
  Tecnico,
  Usuario,
} from '@/types';
import { calcularPrioridade, SLA_SOLUCAO_MIN } from '@/features/chamados/utils/prioridade';

const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
const ahead = (min: number) => new Date(Date.now() + min * 60_000).toISOString();

export const usuarios: Usuario[] = [
  { id: 1, tenantId: 1, nome: 'Ricardo Andrade', email: 'ricardo.andrade@portal-itsm.com.br', cargo: 'Administrador de Sistemas Sênior', departamentoId: 1, departamentoNome: 'TI - Infraestrutura', papeis: ['ADMIN', 'TECNICO'], status: 'ATIVO', ultimoAcesso: ago(5), criadoEm: ago(90000) },
  { id: 2, tenantId: 1, nome: 'Mariana Souza', email: 'mariana.souza@empresa.com.br', cargo: 'Gestora de Gente', departamentoId: 2, departamentoNome: 'RH', papeis: ['GESTOR'], status: 'ATIVO', ultimoAcesso: ago(60), criadoEm: ago(80000) },
  { id: 3, tenantId: 1, nome: 'Carlos Mendes', email: 'carlos.mendes@empresa.com.br', cargo: 'Analista de Suporte N1', departamentoId: 1, departamentoNome: 'TI - Suporte', papeis: ['TECNICO'], status: 'ATIVO', ultimoAcesso: ago(15), criadoEm: ago(70000) },
  { id: 4, tenantId: 1, nome: 'Eliana Rocha', email: 'eliana.rocha@empresa.com.br', cargo: 'Assistente Contábil', departamentoId: 3, departamentoNome: 'Financeiro', papeis: ['SOLICITANTE'], status: 'DESATIVADO', ultimoAcesso: ago(40000), criadoEm: ago(60000) },
  { id: 5, tenantId: 1, nome: 'Ana Paula Silva', email: 'ana.paula@itsm.corp', cargo: 'Analista de Suporte Sr.', departamentoId: 1, departamentoNome: 'TI - Suporte', papeis: ['TECNICO'], status: 'ATIVO', ultimoAcesso: ago(2), criadoEm: ago(50000) },
  { id: 6, tenantId: 1, nome: 'Beto Oliveira', email: 'beto.o@itsm.corp', cargo: 'Analista de Suporte Jr.', departamentoId: 1, departamentoNome: 'TI - Suporte', papeis: ['TECNICO'], status: 'ATIVO', ultimoAcesso: ago(30), criadoEm: ago(40000) },
  { id: 7, tenantId: 1, nome: 'Juliana Costa', email: 'juliana.costa@empresa.com.br', cargo: 'Coordenadora de Marketing', departamentoId: 4, departamentoNome: 'Marketing', papeis: ['GESTOR'], status: 'ATIVO', ultimoAcesso: ago(300), criadoEm: ago(30000) },
  { id: 8, tenantId: 1, nome: 'Marcos Vinícius', email: 'marcos.vinicius@empresa.com.br', cargo: 'Controller', departamentoId: 3, departamentoNome: 'Financeiro', papeis: ['GESTOR'], status: 'ATIVO', ultimoAcesso: ago(120), criadoEm: ago(20000) },
  { id: 9, tenantId: 1, nome: 'João Silva', email: 'joao.silva@empresa.com.br', cargo: 'Analista Financeiro', departamentoId: 3, departamentoNome: 'Financeiro', papeis: ['SOLICITANTE'], status: 'ATIVO', ultimoAcesso: ago(45), criadoEm: ago(10000) },
  { id: 10, tenantId: 1, nome: 'Jorge Santos', email: 'jorge.s@itsm.corp', cargo: 'Analista de Suporte Pleno', departamentoId: 1, departamentoNome: 'TI - Suporte', papeis: ['TECNICO'], status: 'ATIVO', ultimoAcesso: ago(8), criadoEm: ago(9000) },
];

export const departamentos: Departamento[] = [
  { id: 1, sigla: 'TI-CORP', nome: 'Departamento de Tecnologia', descricao: 'Infraestrutura, Redes e Suporte', gestorId: 1, gestorNome: 'Ricardo Andrade', departamentoPaiId: null, totalUsuarios: 42, status: 'ATIVO' },
  { id: 2, sigla: 'RH-ORG', nome: 'Recursos Humanos', descricao: 'Gestão de Pessoas e Talentos', gestorId: 2, gestorNome: 'Mariana Souza', departamentoPaiId: null, totalUsuarios: 12, status: 'ATIVO' },
  { id: 3, sigla: 'FIN-ADM', nome: 'Financeiro e Administrativo', descricao: 'Contabilidade, Faturamento e Compras', gestorId: 8, gestorNome: 'Marcos Vinícius', departamentoPaiId: null, totalUsuarios: 28, status: 'REVISAO' },
  { id: 4, sigla: 'MKT-COM', nome: 'Marketing e Comunicação', descricao: 'Criação, Social Media e Branding', gestorId: 7, gestorNome: 'Juliana Costa', departamentoPaiId: null, totalUsuarios: 8, status: 'ATIVO' },
  { id: 5, sigla: 'TI-SUP', nome: 'Suporte ao Usuário', descricao: 'Service Desk e atendimento N1/N2', gestorId: 5, gestorNome: 'Ana Paula Silva', departamentoPaiId: 1, totalUsuarios: 18, status: 'ATIVO' },
];

export const categorias: Categoria[] = [
  { id: 1, nome: 'Infraestrutura', categoriaPaiId: null, aplicacao: 'AMBOS', status: 'ATIVO' },
  { id: 2, nome: 'Redes & Conectividade', categoriaPaiId: 1, aplicacao: 'INCIDENTE', status: 'ATIVO' },
  { id: 3, nome: 'Servidores Windows', categoriaPaiId: 1, aplicacao: 'AMBOS', status: 'ATIVO' },
  { id: 4, nome: 'Sistemas de Gestão', categoriaPaiId: null, aplicacao: 'REQUISICAO', status: 'ATIVO' },
  { id: 5, nome: 'ERP Totvs', categoriaPaiId: 4, aplicacao: 'AMBOS', status: 'ATIVO' },
  { id: 6, nome: 'BI & Relatórios', categoriaPaiId: 4, aplicacao: 'REQUISICAO', status: 'ATIVO' },
  { id: 7, nome: 'Segurança', categoriaPaiId: null, aplicacao: 'AMBOS', status: 'ATIVO' },
  { id: 8, nome: 'Acessos & Senhas', categoriaPaiId: 7, aplicacao: 'REQUISICAO', status: 'ATIVO' },
  { id: 9, nome: 'Hardware', categoriaPaiId: null, aplicacao: 'AMBOS', status: 'ATIVO' },
  { id: 10, nome: 'Periféricos', categoriaPaiId: 9, aplicacao: 'AMBOS', status: 'ATIVO' },
  { id: 11, nome: 'Legado - SAP v4', categoriaPaiId: null, aplicacao: 'AMBOS', status: 'INATIVO' },
];

export const tecnicos: Tecnico[] = [
  { id: 1, nome: 'Ricardo Andrade', nivel: 'Nível 3 - Infraestrutura', grupoId: 2 },
  { id: 3, nome: 'Carlos Mendes', nivel: 'Nível 1 - Suporte', grupoId: 1 },
  { id: 5, nome: 'Ana Paula Silva', nivel: 'Nível 2 - Suporte', grupoId: 1 },
  { id: 6, nome: 'Beto Oliveira', nivel: 'Nível 1 - Suporte', grupoId: 1 },
  { id: 10, nome: 'Jorge Santos', nivel: 'Nível 2 - Sistemas', grupoId: 3 },
];

export const grupos: GrupoSuporte[] = [
  {
    id: 1, nome: 'Suporte Nível 1', status: 'ATIVO',
    descricao: 'Responsável pelo primeiro contato com o usuário final, execução de scripts de solução conhecidos e triagem de incidentes complexos para níveis superiores.',
    membros: [
      { id: 1, grupoId: 1, usuarioId: 5, nome: 'Ana Paula Silva', email: 'ana.paula@itsm.corp', cargo: 'Analista de Suporte Sr.', cargaTrabalho: 65 },
      { id: 2, grupoId: 1, usuarioId: 6, nome: 'Beto Oliveira', email: 'beto.o@itsm.corp', cargo: 'Analista de Suporte Jr.', cargaTrabalho: 40 },
      { id: 3, grupoId: 1, usuarioId: 3, nome: 'Carlos Mendes', email: 'carlos.mendes@empresa.com.br', cargo: 'Atendente Service Desk', cargaTrabalho: 90 },
      { id: 4, grupoId: 1, usuarioId: 10, nome: 'Jorge Santos', email: 'jorge.s@itsm.corp', cargo: 'Analista de Suporte Pleno', cargaTrabalho: 25 },
    ],
  },
  {
    id: 2, nome: 'Infraestrutura', status: 'ATIVO', descricao: 'Gestão de servidores, redes e data centers.',
    membros: [{ id: 5, grupoId: 2, usuarioId: 1, nome: 'Ricardo Andrade', email: 'ricardo.andrade@portal-itsm.com.br', cargo: 'Administrador de Sistemas', cargaTrabalho: 72 }],
  },
  {
    id: 3, nome: 'Sistemas (DevOps)', status: 'ATIVO', descricao: 'Manutenção de aplicações e CI/CD pipelines.',
    membros: [{ id: 6, grupoId: 3, usuarioId: 10, nome: 'Jorge Santos', email: 'jorge.s@itsm.corp', cargo: 'Engenheiro DevOps', cargaTrabalho: 55 }],
  },
  { id: 4, nome: 'Projetos Temporários', status: 'INATIVO', descricao: 'Equipe sazonal para migração de Office.', membros: [] },
];

const seedChamados: [string, number, 'INCIDENTE' | 'REQUISICAO', 'ALTO' | 'MEDIO' | 'BAIXO', 'ALTO' | 'MEDIO' | 'BAIXO', StatusChamado, number, number | null, number][] = [
  // titulo, categoriaId, tipo, impacto, urgencia, status, solicitanteId, tecnicoId, abertoHaMin
  ['Falha Crítica no Banco de Dados de Produção', 3, 'INCIDENTE', 'ALTO', 'ALTO', 'EM_ATENDIMENTO', 9, 1, 150],
  ['Erro Crítico no ERP Totvs', 5, 'INCIDENTE', 'ALTO', 'ALTO', 'NOVO', 2, null, 380],
  ['Solicitação de Acesso VPN - Novo Colaborador', 8, 'REQUISICAO', 'MEDIO', 'ALTO', 'NOVO', 7, null, 460],
  ['Troca de Toner - Impressora RH', 10, 'REQUISICAO', 'BAIXO', 'MEDIO', 'NOVO', 2, null, 60],
  ['Ajuste de Relatório de Vendas', 6, 'REQUISICAO', 'MEDIO', 'MEDIO', 'NOVO', 8, null, 1200],
  ['Falha de conexão VPN - Escritório Central', 2, 'INCIDENTE', 'ALTO', 'ALTO', 'NOVO', 9, null, 30],
  ['Solicitação de Software: Adobe Creative Cloud', 8, 'REQUISICAO', 'MEDIO', 'MEDIO', 'EM_ATENDIMENTO', 7, 5, 600],
  ['Erro na Impressora - Financeiro', 10, 'INCIDENTE', 'BAIXO', 'MEDIO', 'PENDENTE', 4, 6, 900],
  ['Acesso pasta compartilhada - Marketing', 8, 'REQUISICAO', 'MEDIO', 'BAIXO', 'EM_ATENDIMENTO', 7, 3, 700],
  ['Troca de Mouse com defeito', 10, 'REQUISICAO', 'BAIXO', 'BAIXO', 'CONCLUIDO', 9, 6, 3000],
  ['Erro no acesso ao SAP', 11, 'INCIDENTE', 'ALTO', 'MEDIO', 'NOVO', 9, 1, 620],
  ['Redefinição de Senha AD', 8, 'REQUISICAO', 'BAIXO', 'ALTO', 'CONCLUIDO', 4, null, 2000],
  ['Notebook não liga (Setor Vendas)', 9, 'INCIDENTE', 'MEDIO', 'ALTO', 'EM_ATENDIMENTO', 8, 10, 200],
  ['Lentidão no Wi-Fi do 3º andar', 2, 'INCIDENTE', 'MEDIO', 'MEDIO', 'PENDENTE', 2, 3, 1500],
  ['Instalação de software AutoCAD', 8, 'REQUISICAO', 'BAIXO', 'BAIXO', 'RESOLVIDO', 7, 5, 4000],
  ['Erro de sincronização Outlook', 3, 'INCIDENTE', 'MEDIO', 'BAIXO', 'RESOLVIDO', 9, 3, 2600],
  ['Solicitação de novo hardware (Monitor)', 10, 'REQUISICAO', 'BAIXO', 'MEDIO', 'EM_ATENDIMENTO', 8, 6, 800],
  ['Certificado SSL expirando no portal', 3, 'INCIDENTE', 'ALTO', 'MEDIO', 'EM_ATENDIMENTO', 1, 10, 100],
  ['Criação de usuário no ERP', 5, 'REQUISICAO', 'MEDIO', 'MEDIO', 'NOVO', 2, null, 90],
  ['Backup noturno falhou', 3, 'INCIDENTE', 'ALTO', 'ALTO', 'PENDENTE', 1, 1, 260],
  ['Dashboard de BI sem atualização', 6, 'INCIDENTE', 'MEDIO', 'MEDIO', 'CONCLUIDO', 8, 10, 5000],
  ['Headset sem áudio', 10, 'INCIDENTE', 'BAIXO', 'BAIXO', 'NOVO', 4, null, 45],
];

const nomeUsuario = (id: number | null) => usuarios.find((u) => u.id === id)?.nome ?? null;
const nomeCategoria = (id: number) => {
  const c = categorias.find((x) => x.id === id)!;
  const pai = categorias.find((x) => x.id === c.categoriaPaiId);
  return pai ? `${pai.nome} / ${c.nome}` : c.nome;
};
const grupoDoTecnico = (id: number | null) => tecnicos.find((t) => t.id === id)?.grupoId ?? null;

export const chamados: ChamadoDetalhe[] = seedChamados.map(
  ([titulo, categoriaId, tipo, impacto, urgencia, status, solicitanteId, tecnicoId, abertoHa], i) => {
    const id = 10240 + i;
    const prioridade = calcularPrioridade(impacto, urgencia);
    const slaTotalMin = SLA_SOLUCAO_MIN[prioridade];
    const finalizado = status === 'RESOLVIDO' || status === 'CONCLUIDO';
    const grupoId = grupoDoTecnico(tecnicoId);
    return {
      id,
      titulo,
      descricao:
        'Vários usuários do setor não estão conseguindo processar as operações. O sistema apresenta "Erro 503 Service Unavailable" de forma intermitente desde o início do expediente.',
      tipo,
      origem: (['PORTAL', 'EMAIL', 'TELEFONE', 'CHAT'] as const)[i % 4],
      status,
      prioridade,
      impacto,
      urgencia,
      categoriaId,
      categoriaNome: nomeCategoria(categoriaId),
      solicitanteId,
      solicitanteNome: nomeUsuario(solicitanteId)!,
      grupoId,
      grupoNome: grupos.find((g) => g.id === grupoId)?.nome ?? null,
      tecnicoId,
      tecnicoNome: nomeUsuario(tecnicoId),
      abertoEm: ago(abertoHa),
      atualizadoEm: ago(Math.floor(abertoHa / 3)),
      prazoSla: ahead(slaTotalMin - abertoHa),
      slaRestanteMin: finalizado ? slaTotalMin : slaTotalMin - abertoHa,
      slaTotalMin,
      slaPausado: status === 'PENDENTE',
      itensConfiguracao:
        i === 0
          ? [
              { id: 2, nome: 'SRV-PROD-SQL-01', detalhe: 'IP: 192.168.10.45' },
              { id: 7, nome: 'Azure Stack - West Brazil', detalhe: 'Status: Operacional' },
            ]
          : [],
      comentarios: [
        { id: id * 10 + 1, chamadoId: id, autorId: solicitanteId, autorNome: nomeUsuario(solicitanteId)!, autorPapel: 'Solicitante', conteudo: 'Vários usuários do setor não estão conseguindo processar as notas fiscais. O sistema apresenta "Erro 503 Service Unavailable".', interno: false, criadoEm: ago(abertoHa - 5) },
        ...(tecnicoId
          ? [{ id: id * 10 + 2, chamadoId: id, autorId: tecnicoId, autorNome: nomeUsuario(tecnicoId)!, autorPapel: 'Técnico', conteudo: 'Estamos reiniciando os clusters de réplica para verificar se a inconsistência persiste. O log de erro aponta para um timeout no storage principal.', interno: true, criadoEm: ago(Math.max(abertoHa - 60, 10)) }]
          : []),
      ],
      worklogs: tecnicoId
        ? [{ id: id * 10 + 3, chamadoId: id, tecnicoNome: nomeUsuario(tecnicoId)!, descricao: 'Análise inicial de logs e diagnóstico', minutos: 35, realizadoEm: ago(Math.max(abertoHa - 40, 5)) }]
        : [],
      pausas: status === 'PENDENTE' ? [{ id: id * 10 + 4, chamadoId: id, motivo: 'Aguardando retorno do fornecedor', iniciadaEm: ago(120), finalizadaEm: null }] : [],
      anexos: i % 3 === 0 ? [{ id: id * 10 + 5, chamadoId: id, nomeArquivo: 'log-erro-503.txt', tamanhoBytes: 48_213, mimeType: 'text/plain', enviadoPor: nomeUsuario(solicitanteId)!, criadoEm: ago(abertoHa - 2) }] : [],
      historico: [
        { id: 1, descricao: 'Chamado aberto via portal', autor: nomeUsuario(solicitanteId)!, criadoEm: ago(abertoHa) },
        ...(tecnicoId ? [{ id: 2, descricao: `Atribuído a ${nomeUsuario(tecnicoId)}`, autor: 'Sistema (Auto)', criadoEm: ago(abertoHa - 10) }] : []),
      ],
    };
  },
);

export const ativos: AtivoDetalhe[] = [
  ['ASSET-4829', 'MacBook Pro 14" M2', 'NOTEBOOK', 'C02FX4JHMD6M', 'Ricardo Andrade', 'EM_USO', 'Sede - São Paulo', 'Apple', 'MacBook Pro 14', 96],
  ['SRV-0012', 'Dell PowerEdge R750', 'SERVIDOR', 'BR-7Y2X-S1', 'Equipe Infra', 'MANUTENCAO', 'Data Center 01', 'Dell', 'PowerEdge R750', 71],
  ['SW-9901', 'Adobe Creative Cloud', 'LICENCA', 'AD-CC-2024-X-01', 'Ana Paula Silva', 'EM_USO', 'Remoto', 'Adobe', 'Creative Cloud Teams', 100],
  ['ASSET-5512', 'ThinkPad X1 Carbon', 'NOTEBOOK', 'PF-3E9R22', 'Marcos Vinícius', 'EM_USO', 'Filial - RJ', 'Lenovo', 'X1 Carbon Gen 11', 88],
  ['SRV-PROD-SQL-01', 'Servidor SQL Produção', 'SERVIDOR', 'HP-DL380-9921', 'Equipe Infra', 'EM_USO', 'Data Center 01', 'HPE', 'ProLiant DL380', 64],
  ['NET-0031', 'Switch Core Cisco 9300', 'REDE', 'FOC2231X0AB', 'Equipe Infra', 'EM_USO', 'Data Center 01', 'Cisco', 'Catalyst 9300', 93],
  ['SW-1002', 'Microsoft 365 E3', 'LICENCA', 'MS-E3-2025-88', 'TI Corporativo', 'EM_USO', 'Nuvem', 'Microsoft', 'M365 E3', 100],
  ['ASSET-6120', 'Dell Latitude 5440', 'NOTEBOOK', 'DL-5440-ZZ1', 'Estoque TI', 'ESTOQUE', 'Sede - São Paulo', 'Dell', 'Latitude 5440', 100],
  ['DSK-0402', 'Desktop OptiPlex 7010', 'OUTRO', 'OPX-7010-332', 'Joana Dark', 'DESCARTADO', 'Sede - São Paulo', 'Dell', 'OptiPlex 7010', 12],
].map(([codigo, nome, tipo, numeroSerie, responsavelNome, status, localizacao, fabricante, modelo, saude], i) => ({
  id: i + 1,
  codigo: codigo as string,
  nome: nome as string,
  tipo: tipo as AtivoDetalhe['tipo'],
  numeroSerie: numeroSerie as string,
  responsavelId: null,
  responsavelNome: responsavelNome as string,
  status: status as AtivoDetalhe['status'],
  localizacao: localizacao as string,
  fabricante: fabricante as string,
  modelo: modelo as string,
  saude: saude as number,
  dataAquisicao: ago(525600 - i * 20000),
  garantiaAte: ahead(200000 + i * 10000),
  especificacoes: [
    { id: 1, chave: 'Processador', valor: tipo === 'SERVIDOR' ? '2x Intel Xeon Gold 6338' : 'Apple M2 Pro / Intel i7' },
    { id: 2, chave: 'Memória RAM', valor: tipo === 'SERVIDOR' ? '256 GB DDR4 ECC' : '16 GB' },
    { id: 3, chave: 'Armazenamento', valor: tipo === 'SERVIDOR' ? '8x 1.92TB SSD RAID 10' : '512 GB SSD' },
    { id: 4, chave: 'Sistema Operacional', valor: tipo === 'SERVIDOR' ? 'Windows Server 2022' : 'macOS / Windows 11' },
  ],
  manutencoes: [
    { id: 1, descricao: 'Limpeza preventiva e atualização de firmware', tipo: 'PREVENTIVA', custo: 350, realizadaEm: ago(43200), responsavel: 'Ricardo Andrade' },
    { id: 2, descricao: 'Substituição de fonte redundante', tipo: 'CORRETIVA', custo: 1890, realizadaEm: ago(129600), responsavel: 'Fornecedor Dell' },
  ],
  dependencias:
    tipo === 'SERVIDOR'
      ? [
          { id: 6, codigo: 'NET-0031', nome: 'Switch Core Cisco 9300', tipo: 'REDE', relacao: 'DEPENDE_DE' },
          { id: 7, codigo: 'SW-1002', nome: 'Microsoft 365 E3', tipo: 'LICENCA', relacao: 'SUPORTA' },
        ]
      : [{ id: 6, codigo: 'NET-0031', nome: 'Switch Core Cisco 9300', tipo: 'REDE', relacao: 'DEPENDE_DE' }],
  chamadosVinculados: i === 4 ? [{ id: 10240, titulo: 'Falha Crítica no Banco de Dados de Produção', status: 'EM_ATENDIMENTO' }] : [],
}));

export const aprovacoes: Aprovacao[] = [
  { id: 4402, titulo: 'Upgrade de Hardware - Memória RAM', descricao: 'Substituição de Memória RAM para a estação de trabalho do Depto. Financeiro.', origem: 'CHAMADO', chamadoId: 10256, mudancaId: null, solicitanteNome: 'Marcos Vinícius', prioridade: 'MEDIA', risco: 'BAIXO', custoEstimado: 1200, solicitadoEm: ago(120), status: 'PENDENTE' },
  { id: 4403, titulo: 'Janela de manutenção - Cluster SQL', descricao: 'Aplicação de patch cumulativo no cluster SQL de produção durante a madrugada de sábado.', origem: 'MUDANCA', chamadoId: null, mudancaId: 881, solicitanteNome: 'Ricardo Andrade', prioridade: 'ALTA', risco: 'ALTO', custoEstimado: null, solicitadoEm: ago(300), status: 'PENDENTE' },
  { id: 4404, titulo: 'Licença Adobe Creative Cloud', descricao: 'Aquisição de 3 licenças adicionais para a equipe de Marketing.', origem: 'CHAMADO', chamadoId: 10246, mudancaId: null, solicitanteNome: 'Juliana Costa', prioridade: 'MEDIA', risco: 'BAIXO', custoEstimado: 4500, solicitadoEm: ago(1440), status: 'PENDENTE' },
  { id: 4405, titulo: 'Migração do firewall de borda', descricao: 'Substituição do firewall legado por appliance de nova geração com HA.', origem: 'MUDANCA', chamadoId: null, mudancaId: 882, solicitanteNome: 'Jorge Santos', prioridade: 'CRITICA', risco: 'ALTO', custoEstimado: 85000, solicitadoEm: ago(2880), status: 'PENDENTE' },
];

export const notificacoes: Notificacao[] = [
  { id: 1, tipo: 'CHAMADO', titulo: 'Novo Chamado: Incidente de Rede Crítico', mensagem: 'O servidor principal da filial Norte reportou queda de conexão. SLA de resposta expira em 15 minutos.', link: '/chamados/10245', urgente: false, lida: false, criadaEm: ago(5) },
  { id: 2, tipo: 'APROVACAO', titulo: 'Aprovação Pendente: Upgrade de Hardware', mensagem: 'Solicitação #4402 - Substituição de Memória RAM para a estação de trabalho do Depto. Financeiro.', link: '/aprovacoes', urgente: false, lida: false, criadaEm: ago(120) },
  { id: 3, tipo: 'ATUALIZACAO', titulo: 'Chamado #10248: Status Atualizado', mensagem: 'O chamado "Acesso pasta compartilhada" foi movido para EM ATENDIMENTO por Carlos Mendes.', link: '/chamados/10248', urgente: false, lida: true, criadaEm: ago(240) },
  { id: 4, tipo: 'SISTEMA', titulo: 'Manutenção Programada do Sistema', mensagem: 'O Portal ITSM passará por manutenção corretiva hoje às 22:00. O tempo estimado de indisponibilidade é de 30 minutos.', link: null, urgente: true, lida: false, criadaEm: ago(300) },
  { id: 5, tipo: 'COMENTARIO', titulo: 'Novo Comentário no Chamado #10240', mensagem: 'João Silva: "As credenciais enviadas não estão funcionando no ambiente de homologação."', link: '/chamados/10240', urgente: false, lida: false, criadaEm: ago(360) },
  { id: 6, tipo: 'ATUALIZACAO', titulo: 'Chamado #10249 concluído', mensagem: 'O chamado "Troca de Mouse com defeito" foi encerrado com CSAT 5/5.', link: '/chamados/10249', urgente: false, lida: true, criadaEm: ago(1500) },
];

export const kbCategorias: KbCategoria[] = [
  { id: 1, nome: 'Redes', descricao: 'Configuração de VPN, Wi-Fi, DNS e acesso remoto institucional.', icone: 'rede', totalArtigos: 12 },
  { id: 2, nome: 'Software', descricao: 'Instalação de aplicativos, licenciamento Office 365 e sistemas internos.', icone: 'software', totalArtigos: 45 },
  { id: 3, nome: 'Recursos Humanos', descricao: 'Políticas de reembolso, benefícios, férias e onboarding de novos talentos.', icone: 'rh', totalArtigos: 28 },
  { id: 4, nome: 'Hardware', descricao: 'Periféricos, notebooks, impressoras e solicitações de novos equipamentos.', icone: 'hardware', totalArtigos: 15 },
  { id: 5, nome: 'Segurança', descricao: 'MFA, senhas, políticas de segurança da informação e LGPD.', icone: 'seguranca', totalArtigos: 9 },
];

const mfaMarkdown = `Este guia detalha os passos necessários para habilitar e configurar a segurança adicional em sua conta corporativa para proteger o acesso a dados sensíveis.

## Pré-requisitos

- Acesso à sua conta institucional do Portal de Serviços.
- Smartphone com aplicativo autenticador instalado (**Microsoft Authenticator** ou **Google Authenticator**).
- Acesso à internet estável.

## Passo a Passo da Configuração

1. **Acesse as configurações do seu perfil.** No canto superior direito da tela principal, clique no seu avatar e selecione a opção **"Minha Conta"**.
2. **Habilite a Autenticação Multi-fator.** Na seção de **Segurança**, localize o interruptor "Autenticação em Duas Etapas" e clique para ativar. Um código QR será gerado.
3. **Valide seu Aplicativo.** Escaneie o código QR com seu aplicativo autenticador e insira o código de 6 dígitos gerado no campo de confirmação.

> **Atenção:** Nunca compartilhe seus códigos de autenticação ou chaves de segurança com terceiros, inclusive com a equipe de TI.

## Solução de problemas

Se o código for rejeitado, verifique se o relógio do seu smartphone está sincronizado automaticamente. Persistindo o erro, abra um chamado na categoria \`Segurança / Acessos\`.`;

export const kbArtigos: KbArtigo[] = [
  ['Como configurar o acesso à VPN corporativa (GlobalProtect)', 'Passo a passo completo para instalação do cliente e primeiro acesso.', 1, 1200, 120],
  ['Redefinição de senha do portal de RH', 'O que fazer quando você esquece sua senha ou sua conta é bloqueada.', 3, 943, 1440],
  ['Guia de boas práticas para segurança da informação', 'Recomendações fundamentais para manter seus dados protegidos.', 5, 812, 4320],
  ['Como configurar a Autenticação de Dois Fatores (MFA) no seu Portal ITSM', 'Habilite o MFA e proteja sua conta corporativa.', 5, 640, 120],
  ['Novo processo de solicitação de licença Adobe CC', 'Atualização do fluxo de aprovação para designers e marketing.', 2, 210, 60],
  ['Configuração de monitores ultra-wide no Windows 11', 'Resolução de problemas de proporção e taxa de atualização.', 4, 180, 1440],
  ['Integração do Slack com Calendário Outlook', 'Mantenha seu status sincronizado automaticamente com suas reuniões.', 2, 150, 2880],
].map(([titulo, resumo, categoriaId, visualizacoes, publicadoHa], i) => ({
  id: i + 1,
  titulo: titulo as string,
  resumo: resumo as string,
  conteudoMarkdown: mfaMarkdown,
  categoriaId: categoriaId as number,
  categoriaNome: kbCategorias.find((c) => c.id === categoriaId)!.nome,
  autorNome: 'Marcos Oliveira',
  autorCargo: 'Especialista de Segurança TI',
  visualizacoes: visualizacoes as number,
  votosUteis: 40 + i * 7,
  votosNaoUteis: 3 + i,
  tempoLeituraMin: 3 + (i % 4) * 2,
  meuVoto: null,
  publicadoEm: ago(publicadoHa as number),
  atualizadoEm: ago((publicadoHa as number) / 2),
}));

export const politicasSla: PoliticaSla[] = (
  [
    ['CRITICA', 'Crítica - Impacto Total ao Negócio', 'Regra ativa para serviços essenciais', 15, 240, '24X7', true, 50],
    ['ALTA', 'Alta - Degradação de Serviço Importante', 'Serviços importantes com degradação', 60, 480, '24X7', false, 75],
    ['MEDIA', 'Média - Incidentes Rotineiros', 'Incidentes do dia a dia', 240, 4320, 'COMERCIAL', false, null],
    ['BAIXA', 'Baixa - Consultas e Pequenos Ajustes', 'Dúvidas e ajustes simples', 480, 7200, 'COMERCIAL', false, null],
  ] as [Prioridade, string, string, number, number, '24X7' | 'COMERCIAL', boolean, number | null][]
).map(([prioridade, nome, descricao, tempoRespostaMin, tempoSolucaoMin, calendario, notificarGestor, alertaPercentual], i) => ({
  id: i + 1, prioridade, nome, descricao, tempoRespostaMin, tempoSolucaoMin, calendario,
  horarioComercialId: calendario === 'COMERCIAL' ? 1 : null, notificarGestor, alertaPercentual,
}));

export const horariosComerciais: HorarioComercial[] = [
  {
    id: 1,
    nome: 'Horário Comercial Padrão',
    turnos: [
      { dias: 'Segunda à Sexta', inicio: '08:00', fim: '18:00' },
      { dias: 'Sábados', inicio: '09:00', fim: '13:00' },
    ],
    feriados: [
      { data: '2026-11-02', descricao: 'Finados' },
      { data: '2026-11-15', descricao: 'Proclamação da República' },
      { data: '2026-12-25', descricao: 'Natal' },
    ],
  },
];

export const branding: Branding = {
  nomePortal: 'Portal de Serviços TI',
  fusoHorario: 'America/Sao_Paulo',
  logoUrl: null,
  corPrimaria: '#0056B3',
  corSecundaria: '#0F172A',
  corDestaque: '#3B82F6',
  corFundo: '#F4F6F9',
};

export const integracoes: Integracao[] = [
  { id: 1, nome: 'Active Directory Corporativo', tipo: 'LDAP', host: 'ldap.corp.local', porta: 636, ativo: true, ultimoTeste: ago(60), ultimoResultado: 'SUCESSO', latenciaMs: 18 },
  { id: 2, nome: 'Servidor de E-mail (Exchange)', tipo: 'SMTP', host: 'smtp.office365.com', porta: 587, ativo: true, ultimoTeste: ago(300), ultimoResultado: 'SUCESSO', latenciaMs: 64 },
  { id: 3, nome: 'Webhook Slack #incidentes', tipo: 'WEBHOOK', host: 'hooks.slack.com', porta: 443, ativo: false, ultimoTeste: ago(2880), ultimoResultado: 'FALHA', latenciaMs: null },
];

export const clientes: Cliente[] = [
  { id: 1, razaoSocial: 'Empresa Matriz S.A.', nomeFantasia: 'Matriz Corp', cnpj: '12.345.678/0001-90', totalUsuarios: 1284, status: 'ATIVO', criadoEm: ago(525600) },
  { id: 2, razaoSocial: 'Logística Rápida Ltda.', nomeFantasia: 'LogRápida', cnpj: '98.765.432/0001-10', totalUsuarios: 312, status: 'ATIVO', criadoEm: ago(262800) },
  { id: 3, razaoSocial: 'Clínica Vida Saudável ME', nomeFantasia: 'Vida Saudável', cnpj: '11.222.333/0001-44', totalUsuarios: 45, status: 'INATIVO', criadoEm: ago(20160) },
  { id: 4, razaoSocial: 'Construtora Horizonte S.A.', nomeFantasia: 'Horizonte', cnpj: '55.666.777/0001-88', totalUsuarios: 190, status: 'BLOQUEADO', criadoEm: ago(400000) },
];

export const auditLogs: AuditLog[] = [
  { id: 1, criadoEm: ago(12), usuarioNome: 'Ricardo Oliveira', acao: 'UPDATE', entidade: 'Chamado', entidadeId: '#10240', valorAntigo: { status: 'NOVO' }, valorNovo: { status: 'EM_ATENDIMENTO' }, ip: '10.0.4.21' },
  { id: 2, criadoEm: ago(19), usuarioNome: 'Ana Paula Silva', acao: 'CONFIG', entidade: 'Política SLA', entidadeId: 'Global', valorAntigo: { tempoRespostaMin: 240 }, valorNovo: { tempoRespostaMin: 120 }, ip: '10.0.4.33' },
  { id: 3, criadoEm: ago(35), usuarioNome: 'Sistema (Auto)', acao: 'DELETE', entidade: 'Integração LDAP', entidadeId: 'AD Link', valorAntigo: { baseDn: 'CN=Users,DC=corp,DC=local' }, valorNovo: null, ip: '127.0.0.1' },
  { id: 4, criadoEm: ago(54), usuarioNome: 'Carlos Eduardo', acao: 'CREATE', entidade: 'Usuário', entidadeId: 'marcos_ti', valorAntigo: null, valorNovo: { id: 'marcos_ti', papeis: ['ADMIN'] }, ip: '10.0.4.18' },
  { id: 5, criadoEm: ago(71), usuarioNome: 'Ricardo Oliveira', acao: 'UPDATE', entidade: 'Chamado', entidadeId: '#10244', valorAntigo: { prioridade: 'BAIXA' }, valorNovo: { prioridade: 'CRITICA' }, ip: '10.0.4.21' },
  { id: 6, criadoEm: ago(95), usuarioNome: 'Mariana Souza', acao: 'LOGIN', entidade: 'Sessão', entidadeId: 'web', valorAntigo: null, valorNovo: { mfa: true, navegador: 'Chrome 131' }, ip: '189.44.10.2' },
  { id: 7, criadoEm: ago(130), usuarioNome: 'Jorge Santos', acao: 'UPDATE', entidade: 'Ativo', entidadeId: 'SRV-0012', valorAntigo: { status: 'EM_USO' }, valorNovo: { status: 'MANUTENCAO' }, ip: '10.0.4.40' },
  { id: 8, criadoEm: ago(180), usuarioNome: 'Ricardo Andrade', acao: 'CONFIG', entidade: 'Branding', entidadeId: 'Tenant 1', valorAntigo: { corPrimaria: '#000000' }, valorNovo: { corPrimaria: '#0056B3' }, ip: '10.0.4.10' },
];
