package br.slz.conecta.recomendacao;

import br.slz.conecta.analise.AnaliseService;
import br.slz.conecta.analise.Catalogo;
import br.slz.conecta.analise.Fato;
import br.slz.conecta.analise.Filtro;
import br.slz.conecta.analise.Refs.*;
import br.slz.conecta.domain.*;
import br.slz.conecta.formacao.FormacaoRepository;
import br.slz.conecta.plano.PlanoRow;
import br.slz.conecta.plano.PlanoService;
import br.slz.conecta.recomendacao.EstrategiaRepository.Estrategia;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Motor de recomendações pedagógicas baseado em REGRAS EXPLÍCITAS (sem IA).
 * Toda recomendação traz evidências, contexto temporal, explicação, ação possível,
 * público responsável e prioridade justificada. Nenhuma recomendação cria obrigações:
 * o usuário decide aceitar (criando um plano) ou descartar (com justificativa).
 */
@Service
public class RecomendacaoService {
    public static final String AVISO = "Sugestão gerada por regras transparentes a partir dos dados disponíveis. "
            + "Não é uma decisão obrigatória: cabe aos profissionais avaliar o contexto antes de agir.";
    private static final DateTimeFormatter BR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final AnaliseService analise;
    private final Catalogo catalogo;
    private final EstrategiaRepository estrategias;
    private final FormacaoRepository formacoes;
    private final PlanoService planos;
    private final DecisaoRepository decisoes;

    public RecomendacaoService(AnaliseService analise, Catalogo catalogo, EstrategiaRepository estrategias,
                               FormacaoRepository formacoes, PlanoService planos, DecisaoRepository decisoes) {
        this.analise = analise;
        this.catalogo = catalogo;
        this.estrategias = estrategias;
        this.formacoes = formacoes;
        this.planos = planos;
        this.decisoes = decisoes;
    }

    // ============================== DTOs ==============================

    public record Evidencia(String rotulo, String valor, String detalhe) {}

    public record Alvo(String territorioId, String escolaId, String turmaId, String estudanteId) {}

    public record FormacaoSugerida(String id, String titulo, String status, String modalidade, int cargaHoraria) {}

    public record EstrategiaSugerida(String id, String titulo, String tipo, String objetivo, List<String> passos,
                                     String materiais, String comoAcompanhar, String quandoReavaliar, int duracaoSemanas,
                                     String motivo) {}

    public record Recomendacao(
            String chave, String nivel, String tipo, String titulo, String explicacao,
            List<Evidencia> evidencias, String contextoTemporal, String acaoSugerida, String publicoResponsavel,
            Prioridade prioridade, String justificativaPrioridade, List<String> habilidades, String grupo,
            String componenteId, Integer anoEscolar, Alvo alvo, List<EstrategiaSugerida> estrategias,
            List<FormacaoSugerida> formacoes, Long planoRelacionadoId, String planoRelacionadoTitulo,
            DecisaoRepository.Decisao decisao, String observacao, String aviso) {}

    // ============================== REGIONAL ==============================

    /** Recomendações por território × habilidade. */
    public List<Recomendacao> regionais(String territorioFiltro, String componenteId, Integer ano, String avaliacaoId) {
        AvaliacaoRef av = catalogo.avaliacaoOuAtual(avaliacaoId);
        Optional<AvaliacaoRef> ant = catalogo.anteriorComparavel(av);
        CriteriosPedagogicos c = analise.criterios();
        var calc = analise.calculadora();
        List<PlanoRow> todosPlanos = planos.todosRows();
        Map<Long, List<String>> habsPlano = planos.habilidadesPorPlano();

        Map<String, List<Fato>> porTerHabEsc = new HashMap<>();
        Map<String, List<Fato>> porTerHab = new HashMap<>();
        Map<String, List<Fato>> porTerHabAnt = new HashMap<>();
        for (Fato f : analise.fatos(Filtro.vazio(), null)) {
            if (componenteId != null && !componenteId.equals(f.componenteId())) continue;
            if (ano != null && ano != f.anoEscolar()) continue;
            if (territorioFiltro != null && !territorioFiltro.equals(f.territorioId())) continue;
            String th = f.territorioId() + "|" + f.habilidadeId();
            if (f.avaliacaoId().equals(av.id())) {
                porTerHab.computeIfAbsent(th, k -> new ArrayList<>()).add(f);
                porTerHabEsc.computeIfAbsent(th + "|" + f.escolaId(), k -> new ArrayList<>()).add(f);
            } else if (ant.isPresent() && f.avaliacaoId().equals(ant.get().id())) {
                porTerHabAnt.computeIfAbsent(th, k -> new ArrayList<>()).add(f);
            }
        }

        List<Recomendacao> out = new ArrayList<>();
        for (TerritorioRef t : catalogo.territorios()) {
            if (territorioFiltro != null && !territorioFiltro.equals(t.id())) continue;
            List<EscolaRef> escolas = catalogo.escolasDoTerritorio(t.id());
            for (HabilidadeRef h : catalogo.habilidadesDe(ano, componenteId)) {
                String th = t.id() + "|" + h.id();
                Indicador indT = calc.calcular(porTerHab.getOrDefault(th, List.of()));
                if (!indT.temValor()) continue;
                Indicador indAnt = calc.calcular(porTerHabAnt.getOrDefault(th, List.of()));
                Double pctAnt = indAnt.temValor() ? indAnt.percentualAcerto() : null;

                List<Evidencia> ev = new ArrayList<>();
                int comDados = 0, emAtencao = 0;
                List<String> escolasAtencao = new ArrayList<>();
                for (EscolaRef e : escolas) {
                    Indicador ie = calc.calcular(porTerHabEsc.getOrDefault(th + "|" + e.id(), List.of()));
                    if (ie.suprimido()) {
                        ev.add(new Evidencia(e.nome(), "dado suprimido", "menos de " + calc.minimoAgregacao() + " estudantes avaliados"));
                        continue;
                    }
                    if (!ie.temValor()) continue;
                    comDados++;
                    boolean at = ie.percentualAcerto() < c.atencao();
                    if (at) { emAtencao++; escolasAtencao.add(e.id()); }
                    ev.add(new Evidencia(e.nome(), fmt(ie.percentualAcerto()) + " de acerto",
                            ie.estudantes() + " estudantes avaliados · " + ie.nivel().rotulo()));
                }
                if (comDados < 2) continue;
                boolean recorrenteEscolas = emAtencao >= 2 && emAtencao * 2 >= comDados;
                Tendencia tend = c.tendencia(pctAnt, indT.percentualAcerto());
                boolean quedaForte = pctAnt != null && indT.percentualAcerto() - pctAnt <= -Math.max(8, c.variacaoRelevante())
                        && indT.percentualAcerto() < c.adequado();
                if (!recorrenteEscolas && !quedaForte) continue;

                Optional<PlanoRow> planoAtivo = todosPlanos.stream()
                        .filter(p -> p.escopo() == EscopoPlano.TERRITORIO && t.id().equals(p.territorioId()) && p.status().ativo())
                        .filter(p -> habsPlano.getOrDefault(p.id(), List.of()).contains(h.id())).findFirst();
                var prio = RegrasPrioridade.avaliar(c, indT.percentualAcerto(), pctAnt,
                        emAtencao * 3 >= comDados * 2, planoAtivo.isPresent());

                ev.add(0, new Evidencia("Território " + t.nome() + " — " + h.id(), fmt(indT.percentualAcerto()) + " de acerto",
                        indT.estudantes() + " estudantes avaliados em " + comDados + " escolas"
                                + (pctAnt != null ? " · " + ant.get().sigla() + ": " + fmt(pctAnt) : "")));

                List<FormacaoSugerida> forms = formacoesPara(List.of(h.id()));
                String acao = recorrenteEscolas
                        ? "Apoiar as " + emAtencao + " escolas abaixo do limiar"
                        : "Conversar com as escolas sobre a queda";
                acao += forms.isEmpty()
                        ? ". Não há formação no catálogo para isso."
                        : " e oferecer a formação “" + forms.get(0).titulo() + "”.";
                String tipo = recorrenteEscolas ? "DIFICULDADE_RECORRENTE" : "QUEDA";
                String titulo = (recorrenteEscolas ? h.grupo() : "Queda em " + h.grupo().toLowerCase()) + " · " + t.nome() + " (" + h.id() + ")";
                String explic = recorrenteEscolas
                        ? emAtencao + " de " + comDados + " escolas do território com dados apresentam percentual de acerto abaixo de "
                          + fmt(c.atencao()) + " nesta habilidade do " + h.anoEscolar() + "º ano. Recomenda-se avaliar a necessidade de apoio pedagógico e formação específica."
                        : "O percentual de acerto do território caiu de " + fmt(pctAnt) + " para " + fmt(indT.percentualAcerto())
                          + " entre avaliações comparáveis. A queda merece investigação antes de qualquer conclusão.";
                out.add(new Recomendacao(
                        "TER:" + t.id() + ":" + h.id() + ":" + av.id(), "REGIONAL", tipo, titulo, explic, ev,
                        contexto(av, ant), acao,
                        "SEMED — equipe de ensino fundamental e de formação continuada, com as coordenações das escolas",
                        prio.prioridade(), prio.justificativa(), List.of(h.id()), h.grupo(), h.componenteId(), h.anoEscolar(),
                        new Alvo(t.id(), null, null, null), List.of(), forms,
                        planoAtivo.map(PlanoRow::id).orElse(null), planoAtivo.map(PlanoRow::titulo).orElse(null),
                        null, null, AVISO));
            }
        }
        return comDecisoes(ordenar(out));
    }

    // ============================== ESCOLA / TURMA ==============================

    /** Recomendações de uma escola: por turma × habilidade e, quando há padrão entre turmas do mesmo ano, no nível da escola. */
    public List<Recomendacao> escolares(String escolaId, String componenteId, String avaliacaoId) {
        AvaliacaoRef av = catalogo.avaliacaoOuAtual(avaliacaoId);
        Optional<AvaliacaoRef> ant = catalogo.anteriorComparavel(av);
        CriteriosPedagogicos c = analise.criterios();
        var calc = analise.calculadora();
        EscolaRef escola = catalogo.escola(escolaId);
        List<PlanoRow> planosEscola = planos.todosRows().stream().filter(p -> escolaId.equals(p.escolaId())).toList();
        Map<Long, List<String>> habsPlano = planos.habilidadesPorPlano();

        Map<String, List<Fato>> atual = new HashMap<>(), anterior = new HashMap<>();
        for (Fato f : analise.fatos(Filtro.vazio().comEscola(escolaId), null)) {
            if (componenteId != null && !componenteId.equals(f.componenteId())) continue;
            String k = f.turmaId() + "|" + f.habilidadeId();
            if (f.avaliacaoId().equals(av.id())) atual.computeIfAbsent(k, x -> new ArrayList<>()).add(f);
            else if (ant.isPresent() && f.avaliacaoId().equals(ant.get().id())) anterior.computeIfAbsent(k, x -> new ArrayList<>()).add(f);
        }

        List<Recomendacao> out = new ArrayList<>();
        // turmas em atenção por (ano, habilidade) para detectar padrão da escola
        Map<String, List<String[]>> padrao = new LinkedHashMap<>();

        for (TurmaRef t : catalogo.turmasDaEscola(escolaId)) {
            for (HabilidadeRef h : catalogo.habilidadesDe(t.anoEscolar(), componenteId)) {
                Indicador ind = calc.calcular(atual.getOrDefault(t.id() + "|" + h.id(), List.of()));
                if (!ind.temValor()) continue;
                Indicador indA = calc.calcular(anterior.getOrDefault(t.id() + "|" + h.id(), List.of()));
                Double pa = indA.temValor() ? indA.percentualAcerto() : null;
                double p = ind.percentualAcerto();
                boolean atencao = p < c.atencao();
                boolean queda = pa != null && p - pa <= -2 * c.variacaoRelevante() && p < c.adequado();
                if (!atencao && !queda) continue;
                if (atencao) padrao.computeIfAbsent(t.anoEscolar() + "|" + h.id(), k -> new ArrayList<>())
                        .add(new String[]{t.id(), t.nome(), fmt(p), String.valueOf(ind.estudantes())});

                Optional<PlanoRow> planoAtivo = planosEscola.stream()
                        .filter(pl -> pl.status().ativo() && (t.id().equals(pl.turmaId()) || pl.escopo() == EscopoPlano.ESCOLA))
                        .filter(pl -> pl.escopo() != EscopoPlano.ESTUDANTE)
                        .filter(pl -> habsPlano.getOrDefault(pl.id(), List.of()).contains(h.id())).findFirst();
                var prio = RegrasPrioridade.avaliar(c, p, pa, false, planoAtivo.isPresent());
                boolean recorrente = atencao && pa != null && pa < c.atencao();
                String tipo = recorrente ? "DIFICULDADE_RECORRENTE" : atencao ? "DIFICULDADE_IDENTIFICADA" : "QUEDA";
                List<Evidencia> ev = new ArrayList<>();
                ev.add(new Evidencia(t.nome() + " — " + h.id() + " (" + av.sigla() + ")", fmt(p) + " de acerto",
                        ind.estudantes() + " estudantes avaliados · " + ind.requerAtencao() + " com resultado que requer atenção"));
                if (pa != null) ev.add(new Evidencia(t.nome() + " — " + h.id() + " (" + ant.get().sigla() + ")", fmt(pa) + " de acerto",
                        indA.estudantes() + " estudantes avaliados"));
                Indicador rede = analise.indicador(Filtro.vazio().comHabilidade(h.id()), av.id());
                if (rede.temValor()) ev.add(new Evidencia("Referência da rede (" + h.id() + ")", fmt(rede.percentualAcerto()) + " de acerto",
                        "contexto, não ranking"));
                List<EstrategiaSugerida> ests = estrategiasPara(h.id(), Set.of("TURMA", "AMBOS"),
                        atencao ? NivelDesempenho.REQUER_ATENCAO : NivelDesempenho.EM_DESENVOLVIMENTO, Set.of(), 2);
                String titulo = switch (tipo) {
                    case "DIFICULDADE_RECORRENTE", "DIFICULDADE_IDENTIFICADA" -> h.grupo() + " · " + t.nome() + " (" + h.id() + ")";
                    default -> "Queda em " + h.grupo().toLowerCase() + " · " + t.nome() + " (" + h.id() + ")";
                };
                String explic = switch (tipo) {
                    case "DIFICULDADE_RECORRENTE" -> "Os resultados da turma indicam dificuldade recorrente na habilidade " + h.id()
                            + " (abaixo de " + fmt(c.atencao()) + " em duas avaliações comparáveis). Considere desenvolver atividades direcionadas e realizar uma reavaliação após o período de intervenção.";
                    case "DIFICULDADE_IDENTIFICADA" -> "Na avaliação mais recente, a turma ficou abaixo de " + fmt(c.atencao())
                            + " de acerto na habilidade " + h.id() + ". Vale observar se o padrão se confirma e considerar atividades direcionadas.";
                    default -> "O percentual de acerto da turma caiu " + fmt(pa - p).replace("%", " p.p.")
                            + " em relação à avaliação anterior. Investigue possíveis causas antes de concluir; o dado indica onde olhar, não o porquê.";
                };
                String acao = ests.isEmpty() ? "Planejar atividades direcionadas e reavaliar."
                        : "Experimente “" + ests.get(0).titulo() + "” e reavalie no fim.";
                out.add(new Recomendacao("TUR:" + t.id() + ":" + h.id() + ":" + av.id(), "TURMA", tipo, titulo, explic, ev,
                        contexto(av, ant), acao, "Professor(a) da turma, com apoio da coordenação pedagógica",
                        prio.prioridade(), prio.justificativa(), List.of(h.id()), h.grupo(), h.componenteId(), h.anoEscolar(),
                        new Alvo(escola.territorioId(), escolaId, t.id(), null), ests, formacoesPara(List.of(h.id())),
                        planoAtivo.map(PlanoRow::id).orElse(null), planoAtivo.map(PlanoRow::titulo).orElse(null), null,
                        null, AVISO));
            }
        }

        // Padrão entre turmas do mesmo ano → recomendação no nível da escola
        padrao.forEach((k, turmas) -> {
            if (turmas.size() < 2) return;
            String[] parts = k.split("\\|");
            int ano = Integer.parseInt(parts[0]);
            HabilidadeRef h = catalogo.habilidade(parts[1]);
            Indicador indAno = analise.indicador(Filtro.vazio().comEscola(escolaId).comAno(ano).comHabilidade(h.id()), av.id());
            Indicador indAnoAnt = ant.map(a -> analise.indicador(Filtro.vazio().comEscola(escolaId).comAno(ano).comHabilidade(h.id()), a.id()))
                    .orElse(Indicador.vazio());
            if (!indAno.temValor()) return;
            Optional<PlanoRow> planoAtivo = planosEscola.stream()
                    .filter(pl -> pl.status().ativo() && pl.escopo() == EscopoPlano.ESCOLA)
                    .filter(pl -> habsPlano.getOrDefault(pl.id(), List.of()).contains(h.id())).findFirst();
            var prio = RegrasPrioridade.avaliar(c, indAno.percentualAcerto(), indAnoAnt.temValor() ? indAnoAnt.percentualAcerto() : null,
                    true, planoAtivo.isPresent());
            List<Evidencia> ev = turmas.stream().map(tt -> new Evidencia(tt[1] + " — " + h.id(), tt[2] + " de acerto", tt[3] + " estudantes avaliados")).collect(Collectors.toList());
            ev.add(0, new Evidencia(ano + "º ano (todas as turmas) — " + h.id(), fmt(indAno.percentualAcerto()) + " de acerto",
                    indAno.estudantes() + " estudantes avaliados"));
            out.add(0, new Recomendacao("ESC:" + escolaId + ":" + ano + ":" + h.id() + ":" + av.id(), "ESCOLAR", "DIFICULDADE_COMPARTILHADA",
                    h.grupo() + " · todas as turmas do " + ano + "º ano (" + h.id() + ")",
                    turmas.size() + " turmas do " + ano + "º ano estão abaixo do limiar de atenção nesta habilidade. Uma estratégia coordenada entre as turmas, "
                            + "com acompanhamento da coordenação, tende a ser mais eficiente do que ações isoladas.",
                    ev, contexto(av, ant),
                    "Combinar com os professores do " + ano + "º ano uma estratégia comum e uma data de reavaliação.",
                    "Coordenação pedagógica e professores do " + ano + "º ano", prio.prioridade(), prio.justificativa(),
                    List.of(h.id()), h.grupo(), h.componenteId(), ano, new Alvo(escola.territorioId(), escolaId, null, null),
                    estrategiasPara(h.id(), Set.of("TURMA", "AMBOS"), NivelDesempenho.REQUER_ATENCAO, Set.of(), 2),
                    formacoesPara(List.of(h.id())), planoAtivo.map(PlanoRow::id).orElse(null),
                    planoAtivo.map(PlanoRow::titulo).orElse(null), null, null, AVISO));
        });
        return comDecisoes(ordenar(out));
    }

    public List<Recomendacao> daTurma(String turmaId, String componenteId, String avaliacaoId) {
        TurmaRef t = catalogo.turma(turmaId);
        return escolares(t.escolaId(), componenteId, avaliacaoId).stream()
                .filter(r -> turmaId.equals(r.alvo().turmaId())
                        || ("ESCOLAR".equals(r.nivel()) && Objects.equals(r.anoEscolar(), t.anoEscolar())))
                .toList();
    }

    // ============================== INDIVIDUAL ==============================

    /**
     * Assistente de posicionamento docente: para cada habilidade do estudante fora da faixa adequada,
     * explica a dificuldade, as evidências e sugere estratégias aplicáveis.
     */
    public List<Recomendacao> individuais(String estudanteId, String turmaId, String componenteId) {
        AvaliacaoRef av = catalogo.avaliacaoOuAtual(null);
        Optional<AvaliacaoRef> ant = catalogo.anteriorComparavel(av);
        CriteriosPedagogicos c = analise.criterios();
        var calc = analise.calculadora();
        TurmaRef turma = catalogo.turma(turmaId);
        EscolaRef escola = catalogo.escola(turma.escolaId());

        List<Fato> doEstudante = analise.fatos(Filtro.vazio().comEstudante(estudanteId), null);
        List<Fato> daTurma = analise.fatos(Filtro.vazio().comTurma(turmaId), av.id());
        List<PlanoRow> planosEst = planos.todosRows().stream().filter(p -> estudanteId.equals(p.estudanteId())).toList();
        List<PlanoRow> planosTurma = planos.todosRows().stream()
                .filter(p -> turmaId.equals(p.turmaId()) && p.escopo() == EscopoPlano.TURMA
                        || (p.escopo() == EscopoPlano.ESCOLA && turma.escolaId().equals(p.escolaId()))).toList();
        Map<Long, List<String>> habsPlano = planos.habilidadesPorPlano();

        List<Recomendacao> out = new ArrayList<>();
        for (HabilidadeRef h : catalogo.habilidadesDe(turma.anoEscolar(), componenteId)) {
            List<Fato> fa = doEstudante.stream().filter(f -> f.habilidadeId().equals(h.id()) && f.avaliacaoId().equals(av.id())).toList();
            if (fa.isEmpty()) continue;
            Indicador ind = calc.calcular(fa, false);
            NivelDesempenho nivel = ind.nivel();
            if (nivel == NivelDesempenho.ADEQUADO) continue;
            Double pa = ant.map(a -> calc.calcular(doEstudante.stream()
                            .filter(f -> f.habilidadeId().equals(h.id()) && f.avaliacaoId().equals(a.id())).toList(), false))
                    .filter(Indicador::temValor).map(Indicador::percentualAcerto).orElse(null);

            List<PlanoRow> planosHab = planosEst.stream().filter(p -> habsPlano.getOrDefault(p.id(), List.of()).contains(h.id())).toList();
            Optional<PlanoRow> ativo = planosHab.stream().filter(p -> p.status().ativo()).findFirst();
            Set<String> substituir = planosHab.stream().filter(p -> p.decisaoReavaliacao() == DecisaoReavaliacao.SUBSTITUIR && p.estrategiaId() != null)
                    .map(PlanoRow::estrategiaId).collect(Collectors.toSet());
            var prio = RegrasPrioridade.avaliar(c, ind.percentualAcerto(), pa, false, ativo.isPresent());

            List<Evidencia> ev = new ArrayList<>();
            for (AvaliacaoRef a : catalogo.avaliacoesRede()) {
                doEstudante.stream().filter(f -> f.habilidadeId().equals(h.id()) && f.avaliacaoId().equals(a.id())).findFirst()
                        .ifPresentOrElse(
                                f -> ev.add(new Evidencia(a.sigla() + " · " + a.data().format(BR), f.acertos() + " de " + f.itens() + " itens",
                                        fmt(100.0 * f.acertos() / f.itens()) + " · " + c.classificar(100.0 * f.acertos() / f.itens()).rotulo())),
                                () -> ev.add(new Evidencia(a.sigla() + " · " + a.data().format(BR), "sem resultado", "estudante não avaliado nesta aplicação")));
            }
            Indicador indTurma = calc.calcular(daTurma.stream().filter(f -> f.habilidadeId().equals(h.id())).toList());
            boolean compartilhada = indTurma.temValor() && indTurma.percentualAcerto() < c.atencao();
            if (indTurma.temValor()) {
                ev.add(new Evidencia("Turma " + turma.nome() + " (" + av.sigla() + ")", fmt(indTurma.percentualAcerto()) + " de acerto",
                        compartilhada ? "a dificuldade é compartilhada por boa parte da turma" : "a turma, em geral, está acima do limiar de atenção"));
            }
            List<EstrategiaSugerida> ests = estrategiasPara(h.id(), Set.of("INDIVIDUAL", "AMBOS"), nivel, substituir, 3);
            String observacao = null;
            if (compartilhada) {
                Optional<PlanoRow> pt = planosTurma.stream().filter(p -> p.status().ativo() && habsPlano.getOrDefault(p.id(), List.of()).contains(h.id())).findFirst();
                observacao = pt.map(p -> "Há um plano coletivo ativo para esta habilidade (“" + p.titulo() + "”). Considere articular a ação individual a ele.")
                        .orElse("Como a dificuldade é compartilhada pela turma, uma estratégia coletiva pode ser mais eficiente, complementada por apoio individual.");
            }
            if (!substituir.isEmpty()) {
                String obs2 = "Estratégias registradas como “substituir” em reavaliações anteriores foram excluídas das sugestões.";
                observacao = observacao == null ? obs2 : observacao + " " + obs2;
            }
            planosHab.stream().filter(p -> p.decisaoReavaliacao() == DecisaoReavaliacao.FUNCIONOU).findFirst().ifPresent(p ->
                    ev.add(new Evidencia("Intervenção anterior", "“" + p.titulo() + "”", "registrada como: a estratégia funcionou")));
            boolean recorrente = nivel == NivelDesempenho.REQUER_ATENCAO && pa != null && pa < c.atencao();
            String dificuldade = nivel == NivelDesempenho.REQUER_ATENCAO
                    ? (recorrente ? "Resultado abaixo do esperado em duas avaliações seguidas" : "Resultado abaixo do esperado na última avaliação")
                    : "Habilidade em desenvolvimento";
            String explic = dificuldade + " em " + h.grupo().toLowerCase() + " (" + h.id() + "): " + h.descricao()
                    + " O resultado descreve a evidência desta avaliação — não é um rótulo do estudante nem um diagnóstico.";
            out.add(new Recomendacao("EST:" + estudanteId + ":" + h.id() + ":" + av.id(), "INDIVIDUAL",
                    nivel == NivelDesempenho.REQUER_ATENCAO ? (recorrente ? "DIFICULDADE_RECORRENTE" : "DIFICULDADE_IDENTIFICADA") : "EM_DESENVOLVIMENTO",
                    dificuldade + " — " + h.grupo() + " (" + h.id() + ")", explic, ev, contexto(av, ant),
                    ests.isEmpty() ? "Planejar atividades direcionadas e reavaliar." : "Experimentar “" + ests.get(0).titulo() + "” e reavaliar ao fim do período.",
                    "Professor(a) responsável pela turma", prio.prioridade(), prio.justificativa(), List.of(h.id()), h.grupo(),
                    h.componenteId(), h.anoEscolar(), new Alvo(escola.territorioId(), escola.id(), turmaId, estudanteId),
                    ests, formacoesPara(List.of(h.id())), ativo.map(PlanoRow::id).orElse(null),
                    ativo.map(PlanoRow::titulo).orElse(null), null, observacao, AVISO));
        }
        return comDecisoes(ordenar(out));
    }

    // ============================== auxiliares ==============================

    List<EstrategiaSugerida> estrategiasPara(String habilidadeId, Set<String> niveis, NivelDesempenho nivel,
                                             Set<String> excluir, int limite) {
        List<String> ordemPerfil = nivel == NivelDesempenho.REQUER_ATENCAO
                ? List.of("ATENCAO", "TODOS", "DESENVOLVIMENTO") : List.of("DESENVOLVIMENTO", "TODOS", "ATENCAO");
        return estrategias.paraHabilidade(habilidadeId).stream()
                .filter(e -> niveis.contains(e.nivel()) && !"REAVALIACAO".equals(e.tipo()) && !excluir.contains(e.id()))
                .sorted(Comparator.comparingInt((Estrategia e) -> ordemPerfil.indexOf(e.perfilIndicado())).thenComparing(Estrategia::id))
                .limit(limite)
                .map(e -> new EstrategiaSugerida(e.id(), e.titulo(), e.tipo(), e.objetivo(), e.passos(), e.materiais(),
                        e.comoAcompanhar(), e.quandoReavaliar(), e.duracaoSemanas(), motivo(e, nivel)))
                .toList();
    }

    private static String motivo(Estrategia e, NivelDesempenho nivel) {
        String perfil = switch (e.perfilIndicado()) {
            case "ATENCAO" -> "indicada quando o resultado requer atenção, pois parte do concreto antes da representação formal";
            case "DESENVOLVIMENTO" -> "indicada para consolidar uma habilidade já em desenvolvimento";
            default -> "aplicável a diferentes níveis de desenvolvimento";
        };
        return "Cadastrada para esta habilidade no catálogo de estratégias; " + perfil + ".";
    }

    List<FormacaoSugerida> formacoesPara(List<String> habilidades) {
        return formacoes.todas().stream()
                .filter(f -> !Collections.disjoint(f.habilidades(), habilidades))
                .sorted(Comparator.comparingInt(f -> switch (f.status()) { case "EM_CURSO" -> 0; case "INSCRICOES" -> 1; default -> 2; }))
                .map(f -> new FormacaoSugerida(f.id(), f.titulo(), f.status(), f.modalidade(), f.cargaHoraria()))
                .toList();
    }

    private static String contexto(AvaliacaoRef av, Optional<AvaliacaoRef> ant) {
        return av.sigla() + " (" + av.data().format(BR) + ")" + ant.map(a -> ", comparada com " + a.sigla() + " ("
                + a.data().format(BR) + ") — mesma matriz de referência").orElse(" — sem avaliação comparável anterior");
    }

    private static List<Recomendacao> ordenar(List<Recomendacao> l) {
        List<Recomendacao> c = new ArrayList<>(l);
        c.sort(Comparator.comparing(Recomendacao::prioridade).thenComparing(Recomendacao::titulo));
        return c;
    }

    private List<Recomendacao> comDecisoes(List<Recomendacao> l) {
        var d = decisoes.ultimas(l.stream().map(Recomendacao::chave).collect(Collectors.toSet()));
        if (d.isEmpty()) return l;
        return l.stream().map(r -> d.containsKey(r.chave()) ? new Recomendacao(r.chave(), r.nivel(), r.tipo(), r.titulo(), r.explicacao(),
                r.evidencias(), r.contextoTemporal(), r.acaoSugerida(), r.publicoResponsavel(), r.prioridade(),
                r.justificativaPrioridade(), r.habilidades(), r.grupo(), r.componenteId(), r.anoEscolar(), r.alvo(),
                r.estrategias(), r.formacoes(), r.planoRelacionadoId(), r.planoRelacionadoTitulo(), d.get(r.chave()),
                r.observacao(), r.aviso()) : r).toList();
    }

    static String fmt(Double v) {
        if (v == null) return "—";
        return String.format(Locale.forLanguageTag("pt-BR"), "%.1f%%", v);
    }
}
