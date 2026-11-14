package br.slz.conecta.plano;

import br.slz.conecta.analise.Catalogo;
import br.slz.conecta.analise.Refs.*;
import br.slz.conecta.auditoria.AuditoriaService;
import br.slz.conecta.common.ApiException;
import br.slz.conecta.common.Datas;
import br.slz.conecta.domain.EscopoPlano;
import br.slz.conecta.domain.StatusPlano;
import br.slz.conecta.estudante.EstudanteRepository;
import br.slz.conecta.plano.PlanoDtos.*;
import br.slz.conecta.recomendacao.DecisaoRepository;
import br.slz.conecta.security.AccessPolicy;
import br.slz.conecta.security.Usuario;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/** Regras do Plano de Ação Pedagógica: escopo, validações, permissões, ciclo de vida e histórico. */
@Service
public class PlanoService {
    private final PlanoRepository repo;
    private final Catalogo catalogo;
    private final EstudanteRepository estudantes;
    private final AccessPolicy acesso;
    private final AuditoriaService auditoria;
    private final DecisaoRepository decisoes;
    private final Datas datas;

    public PlanoService(PlanoRepository repo, Catalogo catalogo, EstudanteRepository estudantes, AccessPolicy acesso,
                        AuditoriaService auditoria, DecisaoRepository decisoes, Datas datas) {
        this.repo = repo;
        this.catalogo = catalogo;
        this.estudantes = estudantes;
        this.acesso = acesso;
        this.auditoria = auditoria;
        this.decisoes = decisoes;
        this.datas = datas;
    }

    public record FiltroPlanos(EscopoPlano escopo, StatusPlano status, String territorioId, String escolaId, String turmaId,
                               String estudanteId, String habilidadeId, String componenteId, Boolean atrasados) {}

    // ======================= leitura =======================

    public List<PlanoResumo> listar(Usuario u, FiltroPlanos f) {
        Map<Long, List<String>> habs = repo.habilidadesPorPlano();
        Map<Long, int[]> acoes = repo.contagemAcoes();
        LocalDate hoje = datas.hoje();
        return repo.todos().stream()
                .filter(p -> acesso.podeVerPlano(u, p.alvo()))
                .filter(p -> f.escopo() == null || p.escopo() == f.escopo())
                .filter(p -> f.status() == null || p.status() == f.status())
                .filter(p -> f.territorioId() == null || f.territorioId().equals(territorioDe(p)))
                .filter(p -> f.escolaId() == null || f.escolaId().equals(p.escolaId()))
                .filter(p -> f.turmaId() == null || f.turmaId().equals(p.turmaId()))
                .filter(p -> f.estudanteId() == null || f.estudanteId().equals(p.estudanteId()))
                .filter(p -> f.componenteId() == null || f.componenteId().equals(p.componenteId()))
                .filter(p -> f.habilidadeId() == null || habs.getOrDefault(p.id(), List.of()).contains(f.habilidadeId()))
                .filter(p -> f.atrasados() == null || !f.atrasados() || atrasado(p, hoje))
                .map(p -> resumo(p, habs.getOrDefault(p.id(), List.of()), acoes.get(p.id()), hoje))
                .toList();
    }

    /**
     * Contagem agregada de planos por situação, inclusive planos individuais — apenas números, sem identificação.
     * Usada nas camadas do mapa e no acompanhamento da rede.
     */
    public Map<String, Map<StatusPlano, Integer>> contagemPorEscola(String componenteId, Set<String> habilidadesFiltro) {
        Map<Long, List<String>> habs = repo.habilidadesPorPlano();
        Map<String, Map<StatusPlano, Integer>> out = new HashMap<>();
        for (PlanoRow p : repo.todos()) {
            if (p.escolaId() == null) continue;
            if (componenteId != null && !componenteId.equals(p.componenteId())) continue;
            if (habilidadesFiltro != null && Collections.disjoint(habilidadesFiltro, habs.getOrDefault(p.id(), List.of()))) continue;
            out.computeIfAbsent(p.escolaId(), k -> new EnumMap<>(StatusPlano.class)).merge(p.status(), 1, Integer::sum);
        }
        return out;
    }

    public List<PlanoRow> todosRows() {
        return repo.todos();
    }

    public Map<Long, List<String>> habilidadesPorPlano() {
        return repo.habilidadesPorPlano();
    }

    public PlanoDetalhe detalhe(Usuario u, long id) {
        PlanoRow p = carregarVisivel(u, id);
        if (p.escopo() == EscopoPlano.ESTUDANTE) auditoria.registrar(u, "VER_PLANO_INDIVIDUAL", "PLANO", String.valueOf(id), true, null);
        return montarDetalhe(u, p);
    }

    PlanoRow carregarVisivel(Usuario u, long id) {
        PlanoRow p = repo.porId(id).orElseThrow(() -> ApiException.naoEncontrado("Plano"));
        if (!acesso.podeVerPlano(u, p.alvo())) {
            acesso.negar(u, "PLANO", String.valueOf(id), p.escopo() == EscopoPlano.ESTUDANTE && u.gestor()
                    ? "Planos individuais são visíveis apenas para a escola e o professor responsável."
                    : "Seu perfil não tem acesso a este plano.");
        }
        return p;
    }

    private PlanoRow carregarEditavel(Usuario u, long id) {
        PlanoRow p = carregarVisivel(u, id);
        if (!acesso.podeEditarPlano(u, p.alvo())) {
            acesso.negar(u, "PLANO", String.valueOf(id), "Seu perfil pode visualizar, mas não alterar este plano.");
        }
        return p;
    }

    private PlanoDetalhe montarDetalhe(Usuario u, PlanoRow p) {
        LocalDate hoje = datas.hoje();
        Map<Long, List<String>> habs = repo.habilidadesPorPlano();
        Map<Long, int[]> acoesCount = repo.contagemAcoes();
        PlanoResumo pai = null;
        if (p.planoPaiId() != null) {
            pai = repo.porId(p.planoPaiId())
                    .filter(pp -> acesso.podeVerPlano(u, pp.alvo()))
                    .map(pp -> resumo(pp, habs.getOrDefault(pp.id(), List.of()), acoesCount.get(pp.id()), hoje))
                    .orElse(null);
        }
        List<PlanoRow> filhos = repo.todos().stream().filter(x -> Objects.equals(x.planoPaiId(), p.id())).toList();
        List<PlanoResumo> filhosVisiveis = filhos.stream().filter(x -> acesso.podeVerPlano(u, x.alvo()))
                .map(x -> resumo(x, habs.getOrDefault(x.id(), List.of()), acoesCount.get(x.id()), hoje)).toList();
        boolean podeEditar = acesso.podeEditarPlano(u, p.alvo());
        List<StatusPlano> proximos = !podeEditar ? List.of() : Arrays.stream(StatusPlano.values())
                .filter(s -> p.status().podeIrPara(s)).toList();
        return new PlanoDetalhe(
                p.id(), p.escopo(), refTerritorio(territorioDe(p)), refEscola(p.escolaId()), refTurma(p.turmaId()),
                refEstudante(u, p), p.componenteId(), p.titulo(), p.problema(), p.evidencias(), p.objetivo(), p.publicoAlvo(),
                p.estrategia(), p.estrategiaId(),
                p.formacaoId() == null ? null : new Ref(p.formacaoId(), repo.tituloFormacao(p.formacaoId()).orElse(p.formacaoId())),
                p.responsavel(), p.dataInicio(), p.prazo(), p.indicadorAcompanhamento(), p.criterioConclusao(),
                p.resultadoEsperado(), p.status(), p.resultadoObservado(), p.decisaoReavaliacao(), p.avaliacaoBaseId(),
                p.recomendacaoChave(), repo.nomeUsuario(p.criadoPor()), p.criadoEm(), p.atualizadoEm(), p.versao(),
                repo.habilidades(p.id()), atrasado(p, hoje), podeEditar, proximos,
                pai, filhosVisiveis, filhos.size() - filhosVisiveis.size(),
                repo.acoes(p.id()), repo.registros(p.id()), repo.historico(p.id()));
    }

    // ======================= escrita =======================

    @Transactional
    public PlanoDetalhe criar(Usuario u, PlanoInput in) {
        Alvo alvo = resolverAlvo(in);
        var alvoPlano = new AccessPolicy.AlvoPlano(in.escopo(), alvo.territorioId, alvo.escolaId, alvo.turmaId, alvo.estudanteId);
        if (!acesso.podeEditarPlano(u, alvoPlano)) {
            acesso.negar(u, "PLANO", null, mensagemCriacaoNegada(u, in.escopo()));
        }
        validar(in, alvo);
        if (in.planoPaiId() != null) {
            PlanoRow pai = repo.porId(in.planoPaiId()).orElseThrow(() -> ApiException.invalido("Plano vinculado não encontrado."));
            if (!acesso.podeVerPlano(u, pai.alvo())) throw ApiException.invalido("Plano vinculado não está acessível.");
        }
        var agora = datas.agora();
        long id = repo.inserir(in, alvo.territorioId, alvo.escolaId, alvo.turmaId, alvo.estudanteId, u.id(), agora);
        repo.substituirHabilidades(id, in.habilidades());
        if (in.acoes() != null) in.acoes().forEach(a -> repo.inserirAcao(id, a));
        repo.inserirHistorico(id, agora, u.id(), "CRIACAO", null, StatusPlano.PLANEJADO,
                in.recomendacaoChave() != null ? "Plano criado a partir de recomendação validada pelo usuário." : null, null);
        if (in.recomendacaoChave() != null && !in.recomendacaoChave().isBlank()) {
            decisoes.registrar(in.recomendacaoChave(), "ACEITA", "Recomendação convertida em plano.", id, u.id());
        }
        auditoria.registrar(u, "CRIAR_PLANO", "PLANO", String.valueOf(id), true, in.escopo().name());
        return montarDetalhe(u, repo.porId(id).orElseThrow());
    }

    @Transactional
    public PlanoDetalhe atualizar(Usuario u, long id, PlanoInput in) {
        PlanoRow atual = carregarEditavel(u, id);
        if (atual.status() == StatusPlano.REAVALIADO) {
            throw ApiException.invalido("Planos reavaliados não podem ser editados. Retome o plano (ajustar) ou crie um novo plano.");
        }
        if (in.escopo() != atual.escopo()) throw ApiException.invalido("O escopo de um plano não pode ser alterado.");
        Alvo alvo = new Alvo(atual.territorioId(), atual.escolaId(), atual.turmaId(), atual.estudanteId(), anoDoAlvo(atual));
        validar(in, alvo);
        if (atual.status() != StatusPlano.PLANEJADO && blank(in.justificativa())) {
            throw ApiException.invalido("Informe a justificativa para alterar um plano em execução.");
        }
        if (in.planoPaiId() != null && in.planoPaiId() == id) throw ApiException.invalido("Um plano não pode ser vinculado a si mesmo.");
        int versao = in.versao() != null ? in.versao() : atual.versao();
        String alteracoes = diff(atual, in, repo.habilidades(id));
        var agora = datas.agora();
        if (repo.atualizar(id, in, versao, agora) == 0) {
            throw ApiException.conflito("O plano foi alterado por outra pessoa. Recarregue a página para ver a versão atual.");
        }
        repo.substituirHabilidades(id, in.habilidades());
        repo.inserirHistorico(id, agora, u.id(), "EDICAO", null, null, blankToNull(in.justificativa()), alteracoes);
        auditoria.registrar(u, "EDITAR_PLANO", "PLANO", String.valueOf(id), true, alteracoes);
        return montarDetalhe(u, repo.porId(id).orElseThrow());
    }

    @Transactional
    public PlanoDetalhe mudarStatus(Usuario u, long id, StatusInput in) {
        PlanoRow p = carregarEditavel(u, id);
        StatusPlano de = p.status(), para = in.status();
        if (de == para) throw ApiException.invalido("O plano já está nesta situação.");
        if (!de.podeIrPara(para)) {
            throw ApiException.invalido("Transição não permitida: " + de.rotulo() + " → " + para.rotulo() + ".");
        }
        if (StatusPlano.exigeRegistroDeReavaliacao(para)) {
            throw ApiException.invalido("Para reavaliar, registre o resultado observado e a decisão sobre a estratégia.");
        }
        if (de.exigeJustificativa(para) && blank(in.justificativa())) {
            throw ApiException.invalido("Informe a justificativa para esta revisão de situação.");
        }
        var agora = datas.agora();
        repo.atualizarStatus(id, para, agora);
        repo.inserirHistorico(id, agora, u.id(), "STATUS", de, para, blankToNull(in.justificativa()), null);
        auditoria.registrar(u, "STATUS_PLANO", "PLANO", String.valueOf(id), true, de + "->" + para);
        return montarDetalhe(u, repo.porId(id).orElseThrow());
    }

    @Transactional
    public PlanoDetalhe reavaliar(Usuario u, long id, ReavaliacaoInput in) {
        PlanoRow p = carregarEditavel(u, id);
        if (p.status() != StatusPlano.CONCLUIDO) {
            throw ApiException.invalido("A reavaliação é registrada após a conclusão do plano (situação atual: " + p.status().rotulo() + ").");
        }
        var agora = datas.agora();
        repo.registrarReavaliacao(id, in.resultadoObservado().trim(), in.decisao(), agora);
        repo.inserirRegistro(id, "REAVALIACAO", datas.hoje(), in.resultadoObservado(), null, u.id(), agora);
        repo.inserirHistorico(id, agora, u.id(), "REAVALIACAO", StatusPlano.CONCLUIDO, StatusPlano.REAVALIADO,
                blankToNull(in.justificativa()), "Decisão: " + in.decisao().rotulo());
        auditoria.registrar(u, "REAVALIAR_PLANO", "PLANO", String.valueOf(id), true, in.decisao().name());
        return montarDetalhe(u, repo.porId(id).orElseThrow());
    }

    @Transactional
    public PlanoDetalhe adicionarAcao(Usuario u, long id, AcaoInput in) {
        PlanoRow p = carregarEditavel(u, id);
        if (p.status() == StatusPlano.REAVALIADO) throw ApiException.invalido("Plano reavaliado não recebe novas ações.");
        repo.inserirAcao(id, in);
        var agora = datas.agora();
        repo.tocar(id, agora);
        repo.inserirHistorico(id, agora, u.id(), "EDICAO", null, null, null, "Ação adicionada: " + in.descricao());
        return montarDetalhe(u, repo.porId(id).orElseThrow());
    }

    @Transactional
    public PlanoDetalhe atualizarAcao(Usuario u, long id, long acaoId, AcaoStatusInput in) {
        carregarEditavel(u, id);
        if (repo.atualizarAcao(id, acaoId, in.status(), datas.hoje()) == 0) throw ApiException.naoEncontrado("Ação");
        repo.tocar(id, datas.agora());
        return montarDetalhe(u, repo.porId(id).orElseThrow());
    }

    @Transactional
    public PlanoDetalhe registrar(Usuario u, long id, RegistroInput in) {
        PlanoRow p = carregarEditavel(u, id);
        if (p.status() == StatusPlano.PLANEJADO) {
            throw ApiException.invalido("Inicie o plano (Em andamento) antes de registrar a execução.");
        }
        LocalDate minimo = p.dataInicio().isBefore(p.criadoEm().toLocalDate()) ? p.dataInicio() : p.criadoEm().toLocalDate();
        if (in.data().isBefore(minimo)) throw ApiException.invalido("A data do registro é anterior à criação do plano.");
        if (in.data().isAfter(datas.hoje())) throw ApiException.invalido("A data do registro não pode estar no futuro.");
        var agora = datas.agora();
        repo.inserirRegistro(id, in.tipo(), in.data(), in.descricao(), in.percepcao(), u.id(), agora);
        repo.tocar(id, agora);
        auditoria.registrar(u, "REGISTRO_PLANO", "PLANO", String.valueOf(id), true, in.tipo());
        return montarDetalhe(u, repo.porId(id).orElseThrow());
    }

    // ======================= regras auxiliares =======================

    private record Alvo(String territorioId, String escolaId, String turmaId, String estudanteId, Integer ano) {}

    private Alvo resolverAlvo(PlanoInput in) {
        return switch (in.escopo()) {
            case TERRITORIO -> {
                if (blank(in.territorioId())) throw ApiException.invalido("Planos territoriais exigem o território.");
                catalogo.territorio(in.territorioId());
                yield new Alvo(in.territorioId(), null, null, null, null);
            }
            case ESCOLA -> {
                if (blank(in.escolaId())) throw ApiException.invalido("Planos escolares exigem a escola.");
                EscolaRef e = catalogo.escola(in.escolaId());
                yield new Alvo(e.territorioId(), e.id(), null, null, null);
            }
            case TURMA -> {
                if (blank(in.turmaId())) throw ApiException.invalido("Planos de turma exigem a turma.");
                TurmaRef t = catalogo.turma(in.turmaId());
                yield new Alvo(catalogo.escola(t.escolaId()).territorioId(), t.escolaId(), t.id(), null, t.anoEscolar());
            }
            case ESTUDANTE -> {
                if (blank(in.estudanteId())) throw ApiException.invalido("Planos individuais exigem o estudante.");
                var est = estudantes.porId(in.estudanteId()).orElseThrow(() -> ApiException.invalido("Estudante não encontrado."));
                TurmaRef t = catalogo.turma(est.turmaId());
                yield new Alvo(catalogo.escola(t.escolaId()).territorioId(), t.escolaId(), t.id(), est.id(), t.anoEscolar());
            }
        };
    }

    private Integer anoDoAlvo(PlanoRow p) {
        return p.turmaId() == null ? null : catalogo.turma(p.turmaId()).anoEscolar();
    }

    private void validar(PlanoInput in, Alvo alvo) {
        catalogo.componente(in.componenteId());
        if (in.prazo().isBefore(in.dataInicio())) throw ApiException.invalido("O prazo deve ser igual ou posterior à data de início.");
        for (String h : in.habilidades()) {
            HabilidadeRef hab = catalogo.habilidadeOpt(h).orElseThrow(() -> ApiException.invalido("Habilidade inválida: " + h));
            if (!hab.componenteId().equals(in.componenteId())) {
                throw ApiException.invalido("A habilidade " + h + " não pertence ao componente selecionado.");
            }
            if (alvo.ano() != null && hab.anoEscolar() != alvo.ano()) {
                throw ApiException.invalido("A habilidade " + h + " não corresponde ao ano escolar da turma (" + alvo.ano() + "º ano).");
            }
        }
        if (!blank(in.estrategiaId()) && !repo.existeEstrategia(in.estrategiaId())) throw ApiException.invalido("Estratégia não encontrada.");
        if (!blank(in.formacaoId()) && !repo.existeFormacao(in.formacaoId())) throw ApiException.invalido("Formação não encontrada.");
        if (in.acoes() != null) {
            for (AcaoInput a : in.acoes()) {
                if (a.dataPrevista().isBefore(in.dataInicio())) throw ApiException.invalido("Há ação prevista antes do início do plano.");
            }
        }
    }

    private String mensagemCriacaoNegada(Usuario u, EscopoPlano escopo) {
        return switch (u.papel()) {
            case GESTOR_REDE -> "A gestão da rede cria planos territoriais e escolares; planos de turma e individuais são criados pela escola.";
            case COORDENADOR -> "A coordenação cria planos apenas para a própria escola.";
            case PROFESSOR -> "O professor cria planos apenas para as suas turmas e seus estudantes.";
        };
    }

    private String diff(PlanoRow a, PlanoInput b, List<String> habsAntes) {
        List<String> campos = new ArrayList<>();
        cmp(campos, "título", a.titulo(), b.titulo());
        cmp(campos, "problema", a.problema(), b.problema());
        cmp(campos, "evidências", a.evidencias(), b.evidencias());
        cmp(campos, "objetivo", a.objetivo(), b.objetivo());
        cmp(campos, "público", a.publicoAlvo(), b.publicoAlvo());
        cmp(campos, "estratégia", a.estrategia(), b.estrategia());
        cmp(campos, "responsável", a.responsavel(), b.responsavel());
        cmp(campos, "início", a.dataInicio().toString(), b.dataInicio().toString());
        cmp(campos, "prazo", a.prazo().toString(), b.prazo().toString());
        cmp(campos, "indicador", a.indicadorAcompanhamento(), b.indicadorAcompanhamento());
        cmp(campos, "critério de conclusão", a.criterioConclusao(), b.criterioConclusao());
        cmp(campos, "resultado esperado", a.resultadoEsperado(), b.resultadoEsperado());
        cmp(campos, "formação", a.formacaoId(), blankToNull(b.formacaoId()));
        if (!new TreeSet<>(habsAntes).equals(new TreeSet<>(b.habilidades()))) campos.add("habilidades");
        return campos.isEmpty() ? "Sem alteração de conteúdo" : "Campos alterados: " + String.join(", ", campos);
    }

    private static void cmp(List<String> out, String nome, String a, String b) {
        if (!Objects.equals(a == null ? null : a.trim(), b == null ? null : b.trim())) out.add(nome);
    }

    String territorioDe(PlanoRow p) {
        return p.territorioId() != null ? p.territorioId() : (p.escolaId() != null ? catalogo.escola(p.escolaId()).territorioId() : null);
    }

    static boolean atrasado(PlanoRow p, LocalDate hoje) {
        return p.status().ativo() && p.prazo().isBefore(hoje);
    }

    PlanoResumo resumo(PlanoRow p, List<String> habs, int[] acoes, LocalDate hoje) {
        return new PlanoResumo(p.id(), p.escopo(), p.titulo(), p.status(),
                refTerritorio(territorioDe(p)), refEscola(p.escolaId()), refTurma(p.turmaId()),
                p.estudanteId() == null ? null : new Ref(p.estudanteId(), estudantes.porId(p.estudanteId()).map(EstudanteRepository.EstudanteRow::nome).orElse("")),
                p.componenteId(), habs, p.responsavel(), p.dataInicio(), p.prazo(), atrasado(p, hoje), p.planoPaiId(),
                acoes == null ? 0 : acoes[0], acoes == null ? 0 : acoes[1], p.decisaoReavaliacao(), p.atualizadoEm());
    }

    private Ref refTerritorio(String id) { return id == null ? null : new Ref(id, catalogo.territorio(id).nome()); }
    private Ref refEscola(String id) { return id == null ? null : new Ref(id, catalogo.escola(id).nome()); }
    private Ref refTurma(String id) { return id == null ? null : new Ref(id, catalogo.turma(id).nome()); }

    private Ref refEstudante(Usuario u, PlanoRow p) {
        if (p.estudanteId() == null) return null;
        return estudantes.porId(p.estudanteId()).map(e -> new Ref(e.id(), e.nome())).orElse(null);
    }

    static boolean blank(String s) { return s == null || s.isBlank(); }
    static String blankToNull(String s) { return blank(s) ? null : s.trim(); }

    public Set<String> habilidadesComPlanoAtivo(Collection<PlanoRow> planos, Map<Long, List<String>> habs) {
        return planos.stream().filter(p -> p.status().ativo())
                .flatMap(p -> habs.getOrDefault(p.id(), List.of()).stream()).collect(Collectors.toSet());
    }
}
