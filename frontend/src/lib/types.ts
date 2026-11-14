// Tipos espelhando os contratos da API (Spring Boot).

export type Papel = "GESTOR_REDE" | "COORDENADOR" | "PROFESSOR";
export type Nivel = "ADEQUADO" | "EM_DESENVOLVIMENTO" | "REQUER_ATENCAO";
export type Tendencia = "MELHORA" | "ESTAVEL" | "QUEDA" | "SEM_COMPARACAO";
export type StatusPlano = "PLANEJADO" | "EM_ANDAMENTO" | "CONCLUIDO" | "REAVALIADO";
export type EscopoPlano = "TERRITORIO" | "ESCOLA" | "TURMA" | "ESTUDANTE";
export type Prioridade = "ALTA" | "MEDIA" | "BAIXA";
export type Decisao = "FUNCIONOU" | "AJUSTAR" | "SUBSTITUIR";

export interface Usuario {
  id: string;
  email: string;
  nome: string;
  papel: Papel;
  cargo: string;
  escolaId?: string;
  escolaNome?: string;
  territorioId?: string;
  professorId?: string;
}

export interface Indicador {
  estudantes: number;
  percentualAcerto?: number;
  percentualAdequado?: number;
  adequados?: number;
  emDesenvolvimento?: number;
  requerAtencao?: number;
  nivel?: Nivel;
  suprimido: boolean;
}

export interface AvRef { id: string; sigla: string; nome: string; data: string }

export interface PontoSerie {
  avaliacaoId: string;
  sigla: string;
  nome: string;
  data: string;
  indicador: Indicador;
  variacao?: number;
}

export interface Territorio { id: string; nome: string; descricao: string; bairros: string }
export interface Escola { id: string; nome: string; territorioId: string; bairro: string; lat: number; lng: number; etapas: string }
export interface Turma { id: string; escolaId: string; anoEscolar: number; nome: string; turno: string; matriculados: number }
export interface Componente { id: string; nome: string }
export interface Habilidade {
  id: string; componenteId: string; anoEscolar: number; anosBncc: string; descricao: string;
  unidadeTematica: string; grupo: string; fonte: string;
}
export interface Avaliacao { id: string; sigla: string; nome: string; tipo: string; data: string; grupoComparabilidade: string }

export interface Meta {
  territorios: Territorio[];
  escolas: Escola[];
  anos: number[];
  componentes: Componente[];
  habilidades: Habilidade[];
  avaliacoes: Avaliacao[];
  criterios: { adequado: number; atencao: number; variacaoRelevante: number };
  minimoAgregacao: number;
  dataReferencia: string;
  minhasTurmas: Turma[];
  aviso: string;
}

// ---------------- rede ----------------
export interface EscolaMapa {
  id: string; nome: string; bairro: string; territorioId: string; territorioNome: string; lat: number; lng: number;
  etapas: string; matriculados: number; avaliados: number; cobertura?: number; indicador: Indicador; anterior: Indicador;
  variacao?: number; tendencia: Tendencia; habilidadesAtencao: number; habilidadesAnalisadas: number;
  habilidadeCritica?: { id: string; grupo: string; percentual: number; estudantes: number };
  intervencoes: Record<StatusPlano, number>; intervencoesTotal: number;
  formacao: { professoresComDemanda: number; participacoes: number; concluidas: number; aplicaram: number };
}
export interface TerritorioMapa {
  id: string; nome: string; bairros: string; lat: number; lng: number; escolas: number; matriculados: number; avaliados: number;
  cobertura?: number; indicador: Indicador; anterior: Indicador; variacao?: number; tendencia: Tendencia;
  intervencoes: Record<StatusPlano, number>; professoresComDemanda: number;
}
export interface Mapa { avaliacao: AvRef; avaliacaoAnterior?: AvRef; escolas: EscolaMapa[]; territorios: TerritorioMapa[]; aviso: string }

export interface HabilidadePainel {
  id: string; grupo: string; descricao: string; componenteId: string; anoEscolar: number; indicador: Indicador;
  anterior: Indicador; variacao?: number; tendencia: Tendencia; escolasEmAtencao: number; escolasComDados: number;
}
export interface DemandaFormacao {
  formacaoId: string; titulo: string; status: string; professoresSemFormacao: number; professoresEmFormacao: number;
  escolas: number; territorios: number; jaConcluiram: number;
}
export interface Painel {
  avaliacao: AvRef; avaliacaoAnterior?: AvRef; periodo: string; totalEscolas: number; totalTurmas: number;
  matriculados: number; avaliados: number; cobertura?: number; indicador: Indicador; anterior: Indicador; variacao?: number;
  tendencia: Tendencia; serie: PontoSerie[]; habilidades: HabilidadePainel[];
  escolasApoio: { id: string; nome: string; territorioNome: string; motivos: string[]; habilidadesAtencao: number; planosAtivos: number }[];
  intervencoes: Record<StatusPlano, number>; intervencoesAtrasadas: number; demandasFormacao: DemandaFormacao[];
  lacunasFormacao: number; notaRanking: string;
}
export interface Comparativo {
  avaliacao: AvRef;
  territorios: { id: string; nome: string; bairros: string; escolas: number; indicador: Indicador; serie: PontoSerie[] }[];
  habilidades: Habilidade[];
  matriz: { territorioId: string; habilidadeId: string; indicador: Indicador }[];
}

// ---------------- recomendações ----------------
export interface EstrategiaSugerida {
  id: string; titulo: string; tipo: string; objetivo: string; passos: string[]; materiais?: string; comoAcompanhar: string;
  quandoReavaliar: string; duracaoSemanas: number; motivo: string;
}
export interface Recomendacao {
  chave: string; nivel: "REGIONAL" | "ESCOLAR" | "TURMA" | "INDIVIDUAL"; tipo: string; titulo: string; explicacao: string;
  evidencias: { rotulo: string; valor: string; detalhe?: string }[]; contextoTemporal: string; acaoSugerida: string;
  publicoResponsavel: string; prioridade: Prioridade; justificativaPrioridade: string; habilidades: string[]; grupo: string;
  componenteId: string; anoEscolar?: number;
  alvo: { territorioId?: string; escolaId?: string; turmaId?: string; estudanteId?: string };
  estrategias: EstrategiaSugerida[];
  formacoes: { id: string; titulo: string; status: string; modalidade: string; cargaHoraria: number }[];
  planoRelacionadoId?: number; planoRelacionadoTitulo?: string;
  decisao?: { chave: string; decisao: "ACEITA" | "DESCARTADA"; justificativa?: string; planoId?: number; usuario: string; dataHora: string };
  observacao?: string; aviso: string;
}

// ---------------- escola / turma ----------------
export interface Ref { id: string; nome: string }
export interface PlanoResumo {
  id: number; escopo: EscopoPlano; titulo: string; status: StatusPlano; territorio?: Ref; escola?: Ref; turma?: Ref;
  estudante?: Ref; componenteId: string; habilidades: string[]; responsavel: string; dataInicio: string; prazo: string;
  atrasado: boolean; planoPaiId?: number; acoesTotal: number; acoesConcluidas: number; decisaoReavaliacao?: Decisao;
  atualizadoEm: string;
}
export interface Historico {
  id: number; dataHora: string; usuario: string; tipo: string; statusDe?: StatusPlano; statusPara?: StatusPlano;
  justificativa?: string; alteracoes?: string;
}
export interface DiagnosticoEscola {
  escola: Escola; territorioNome: string; avaliacao: AvRef; avaliacaoAnterior?: AvRef; totalTurmas: number;
  matriculados: number; avaliados: number; cobertura?: number;
  componentes: { componenteId: string; nome: string; indicador: Indicador; anterior: Indicador; variacao?: number; tendencia: Tendencia; serie: PontoSerie[] }[];
  turmas: {
    id: string; nome: string; anoEscolar: number; turno: string; matriculados: number; avaliados: number; professores: string[];
    indicadores: Record<string, Indicador>; variacoes: Record<string, number | null>; habilidadesAtencao: number;
    planosAtivos: number; acessoTurma: boolean; acessoIndividual: boolean;
  }[];
  habilidades: {
    id: string; grupo: string; descricao: string; componenteId: string; anoEscolar: number; indicador: Indicador;
    anterior: Indicador; variacao?: number; tendencia: Tendencia; turmasEmAtencao: number; turmasComDados: number; planosAtivos: number;
  }[];
  planosPorStatus: Record<StatusPlano, number>; planosAtivos: PlanoResumo[]; planosPendentes: number;
  historico: { planoId: number; planoTitulo: string; evento: Historico }[]; mostraProfessores: boolean;
}
export interface LinhaMatriz {
  habilidade: Habilidade; descritores: { id: string; descricao: string; statusValidacao: string }[];
  pontos: { avaliacaoId: string; sigla: string; indicador: Indicador }[]; nivelAtual?: Nivel; variacao?: number;
  tendencia: Tendencia; planos: PlanoResumo[]; estrategiasDisponiveis: number; formacoes: string[];
}
export interface DiagnosticoTurma {
  turma: Turma; escola: Escola; territorioNome: string; professores: string[]; avaliacao: AvRef; avaliacaoAnterior?: AvRef;
  avaliados: number; cobertura?: number;
  componentes: {
    componenteId: string; nome: string; indicador: Indicador; anterior: Indicador; variacao?: number; tendencia: Tendencia;
    serie: PontoSerie[]; distribuicao: { faixa: string; estudantes: number }[];
  }[];
  matriz: LinhaMatriz[]; acessoIndividual: boolean; motivoRestricao?: string;
  estudantes?: {
    id: string; nome: string; codigo: string; avaliado: boolean; percentuais: Record<string, number>; niveis: Record<string, Nivel>;
    habilidadesAtencao: number; habilidadesAtencaoIds: string[]; planosAtivos: number;
  }[];
  planos: PlanoResumo[]; notaInterpretacao: string;
}
export interface MinhaTurma {
  id: string; nome: string; anoEscolar: number; escolaId: string; escolaNome: string; matriculados: number;
  indicadores: Record<string, Indicador>; estudantesComAtencao: number; planosAtivos: number; componentes: string[];
}

// ---------------- estudante ----------------
export interface ResultadoEst {
  avaliacaoId: string; sigla: string; data: string; acertos?: number; itens?: number; percentual?: number; nivel?: Nivel;
}
export interface ReavDirecionada {
  avaliacaoId: string; data: string; habilidadeId: string; acertos: number; itens: number; percentual: number; registradoPor?: string;
}
export interface PerfilEstudante {
  estudante: { id: string; codigo: string; nome: string; turmaId: string };
  turma: Turma; escola: Escola; professores: string[];
  avaliacoes: { id: string; sigla: string; nome: string; data: string; avaliado: boolean; porComponente: Record<string, ResultadoEst> }[];
  habilidades: {
    habilidade: Habilidade; resultados: ResultadoEst[]; nivelAtual?: Nivel; variacao?: number; tendencia: Tendencia;
    percentualTurma?: number; reavaliacoesDirecionadas: ReavDirecionada[]; planos: number[];
  }[];
  resumoAtual: Record<Nivel, number>; planos: PlanoResumo[]; intervencoesAnteriores: PlanoResumo[];
  criterios: { adequado: number; atencao: number }; notaEtica: string;
}
export interface AlunoAssistente {
  id: string; nome: string; codigo: string; alta: number; media: number; baixa: number; habilidades: string[]; planosAtivos: number;
}

// ---------------- planos ----------------
export interface PlanoDetalhe {
  id: number; escopo: EscopoPlano; territorio?: Ref; escola?: Ref; turma?: Ref; estudante?: Ref; componenteId: string;
  titulo: string; problema: string; evidencias: string; objetivo: string; publicoAlvo: string; estrategia: string;
  estrategiaId?: string; formacao?: Ref; responsavel: string; dataInicio: string; prazo: string; indicadorAcompanhamento: string;
  criterioConclusao: string; resultadoEsperado: string; status: StatusPlano; resultadoObservado?: string;
  decisaoReavaliacao?: Decisao; avaliacaoBaseId?: string; recomendacaoChave?: string; criadoPor: string; criadoEm: string;
  atualizadoEm: string; versao: number; habilidades: string[]; atrasado: boolean; podeEditar: boolean;
  proximosStatus: StatusPlano[]; planoPai?: PlanoResumo; planosVinculados: PlanoResumo[]; planosVinculadosOcultos: number;
  acoes: { id: number; descricao: string; responsavel: string; dataPrevista: string; status: "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDA"; concluidaEm?: string }[];
  registros: { id: number; tipo: string; data: string; descricao: string; percepcao?: string; autor: string; criadoEm: string }[];
  historico: Historico[];
}
export interface Evidencia {
  planoId: number; recorte: string; avaliacaoBase?: string; avaliacaoPosterior?: string; percentualAntes?: number;
  percentualDepois?: number; variacao?: number; tendencia: Tendencia;
  combinado: { avaliacaoId: string; sigla: string; data: string; momento: string; indicador: Indicador }[];
  porHabilidade: { habilidadeId: string; grupo: string; pontos: { avaliacaoId: string; sigla: string; momento: string; indicador: Indicador }[] }[];
  reavaliacoesDirecionadas: ReavDirecionada[]; aguardandoAvaliacao: boolean; aviso: string;
}
export interface PlanoInput {
  escopo: EscopoPlano; territorioId?: string; escolaId?: string; turmaId?: string; estudanteId?: string; planoPaiId?: number | null;
  componenteId: string; titulo: string; problema: string; evidencias: string; objetivo: string; publicoAlvo: string;
  estrategia: string; estrategiaId?: string; formacaoId?: string; responsavel: string; dataInicio: string; prazo: string;
  indicadorAcompanhamento: string; criterioConclusao: string; resultadoEsperado: string; habilidades: string[];
  avaliacaoBaseId?: string; recomendacaoChave?: string;
  acoes?: { descricao: string; responsavel: string; dataPrevista: string }[]; justificativa?: string; versao?: number;
}
export interface Estrategia {
  id: string; titulo: string; tipo: string; nivel: string; objetivo: string; passos: string[]; materiais?: string;
  comoAcompanhar: string; quandoReavaliar: string; duracaoSemanas: number; perfilIndicado: string; habilidades: string[];
}

export interface Acompanhamento {
  contagem: Record<EscopoPlano, Record<StatusPlano, number>>; total: number; ativos: number; atrasados: number;
  decisoes: Record<Decisao, number>; listaAtrasados: PlanoResumo[];
  resultados: { plano: PlanoResumo; antes?: number; depois?: number; variacao?: number; avaliacaoBase?: string; avaliacaoPosterior?: string; aguardandoAvaliacao: boolean }[];
  aviso: string;
}

// ---------------- formação ----------------
export interface ParticipacaoView {
  id: number; formacaoId: string; formacaoTitulo: string; professorId: string; professorNome: string; escolaId?: string;
  escolaNome?: string; status: "INSCRITO" | "CONCLUIDO"; aplicouEstrategia?: boolean; registroAplicacao?: string; atualizadoEm: string;
}
export interface FormacaoView {
  id: string; titulo: string; descricao: string; objetivos: string; modalidade: string; cargaHoraria: number; publico: string;
  dataInicio: string; dataFim: string; vagas: number; status: "INSCRICOES" | "EM_CURSO" | "CONCLUIDA";
  habilidades: { id: string; grupo: string; anoEscolar: number; componenteId: string }[];
  inscritos: number; concluidos: number; aplicaram: number; taxaAplicacao?: number; professoresComDemanda: number;
  escolasComDemanda: number; minhaParticipacao?: ParticipacaoView; recomendadaParaMim: boolean;
}
export interface DemandaHab {
  habilidadeId: string; grupo: string; anoEscolar: number; componenteId: string; turmas: number; professoresSemFormacao: number;
  professoresEmFormacao: number; professoresComFormacao: number; formacoes: string[];
}
export interface DemandaRecorte {
  id: string; nome: string; escolas: number; turmas: number; professoresSemFormacao: number; professoresEmFormacao: number;
  habilidades: DemandaHab[];
}
export interface Demandas {
  porTerritorio: DemandaRecorte[]; porEscola: DemandaRecorte[]; porFormacao: DemandaFormacao[]; lacunas: DemandaHab[];
  avaliacao: string; nota: string;
}

export interface Curriculo {
  habilidades: {
    habilidade: Habilidade;
    descritores: { id: string; descricao: string; matriz: string; statusValidacao: string; observacao?: string }[];
    estrategias: { id: string; titulo: string; tipo: string }[];
    formacoes: { id: string; titulo: string; status: string }[];
  }[];
  fonte: string;
  aviso: string;
}

// ---------------- painel de escolas (mapa) ----------------
export interface DesempenhoEscola { indicador: Indicador; nota?: number; variacao?: number }
export interface EscolaAnalise {
  id: string; nome: string; bairro: string; territorioId: string; territorioNome: string; lat: number; lng: number; etapas: string;
  evasao: { matriculados: number; abandonos: number; taxa?: number };
  notas: DesempenhoEscola;
  porMateria: Record<string, DesempenhoEscola>;
  escassez: { necessarios: number; lotados: number; faltam: number; funcoes: { funcao: string; necessarios: number; lotados: number; faltam: number }[] };
  inclusao?: { matriculasEscola: number; estudantesAee?: number; atendidosAee?: number; cobertura?: number; profissionaisApoio: number; salaRecursos: boolean; suprimido: boolean };
}
export interface Notificacao {
  id: string; tipo: "EVASAO" | "DESEMPENHO" | "ESCASSEZ" | "INCLUSAO"; severidade: "ALTA" | "MEDIA" | "BAIXA";
  titulo: string; detalhe: string; escolaId: string; escolaNome: string; bairro: string;
}
export interface PainelEscolas {
  avaliacao: string; avaliacaoNome: string; rede: Record<string, number | null>; escolas: EscolaAnalise[]; notificacoes: Notificacao[]; aviso: string;
}
