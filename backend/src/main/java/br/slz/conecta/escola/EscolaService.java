package br.slz.conecta.escola;

import br.slz.conecta.analise.AnaliseService;
import br.slz.conecta.analise.Catalogo;
import br.slz.conecta.analise.Fato;
import br.slz.conecta.analise.Filtro;
import br.slz.conecta.analise.Refs.*;
import br.slz.conecta.domain.*;
import br.slz.conecta.estudante.EstudanteRepository;
import br.slz.conecta.plano.PlanoDtos.Historico;
import br.slz.conecta.plano.PlanoDtos.PlanoResumo;
import br.slz.conecta.plano.PlanoRepository;
import br.slz.conecta.plano.PlanoService;
import br.slz.conecta.rede.RedeService.AvRef;
import br.slz.conecta.security.AccessPolicy;
import br.slz.conecta.security.Usuario;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/** Inteligência escolar: diagnóstico institucional e diagnóstico por turma. */
@Service
public class EscolaService {
    private final AnaliseService analise;
    private final Catalogo catalogo;
    private final AccessPolicy acesso;
    private final PlanoService planos;
    private final PlanoRepository planoRepo;
    private final EstudanteRepository estudantes;
    private final JdbcTemplate jdbc;

    public EscolaService(AnaliseService analise, Catalogo catalogo, AccessPolicy acesso, PlanoService planos,
                        PlanoRepository planoRepo, EstudanteRepository estudantes, JdbcTemplate jdbc) {
        this.analise = analise;
        this.catalogo = catalogo;
        this.acesso = acesso;
        this.planos = planos;
        this.planoRepo = planoRepo;
        this.estudantes = estudantes;
        this.jdbc = jdbc;
    }

    public record Comp(String componenteId, String nome, Indicador indicador, Indicador anterior, Double variacao,
                       Tendencia tendencia, List<AnaliseService.PontoSerie> serie) {}

    public record TurmaResumo(String id, String nome, int anoEscolar, String turno, int matriculados, long avaliados,
                              List<String> professores, Map<String, Indicador> indicadores, Map<String, Double> variacoes,
                              int habilidadesAtencao, int planosAtivos, boolean acessoTurma, boolean acessoIndividual) {}

    public record HabEscola(String id, String grupo, String descricao, String componenteId, int anoEscolar, Indicador indicador,
                            Indicador anterior, Double variacao, Tendencia tendencia, int turmasEmAtencao, int turmasComDados,
                            int planosAtivos) {}

    public record EventoHistorico(long planoId, String planoTitulo, Historico evento) {}

    public record Diagnostico(EscolaRef escola, String territorioNome, AvRef avaliacao, AvRef avaliacaoAnterior, int totalTurmas,
                              long matriculados, long avaliados, Double cobertura, List<Comp> componentes,
                              List<TurmaResumo> turmas, List<HabEscola> habilidades, Map<StatusPlano, Integer> planosPorStatus,
                              List<PlanoResumo> planosAtivos, int planosPendentes, List<EventoHistorico> historico,
                              boolean mostraProfessores) {}

    public Diagnostico escola(Usuario u, String escolaId, String componenteId, String avaliacaoId) {
        acesso.exigirEscola(u, escolaId);
        EscolaRef e = catalogo.escola(escolaId);
        AvaliacaoRef av = catalogo.avaliacaoOuAtual(avaliacaoId);
        AvaliacaoRef ant = catalogo.anteriorComparavel(av).orElse(null);
        var calc = analise.calculadora();
        var crit = analise.criterios();
        Filtro fe = Filtro.vazio().comEscola(escolaId);

        List<Comp> comps = new ArrayList<>();
        for (ComponenteRef c : catalogo.componentes()) {
            Filtro fc = fe.comComponente(c.id());
            Indicador i = analise.indicador(fc, av.id());
            Indicador ia = ant == null ? Indicador.vazio() : analise.indicador(fc, ant.id());
            comps.add(new Comp(c.id(), c.nome(), i, ia, CalculadoraIndicadores.delta(ia, i), tend(ia, i), analise.serie(fc)));
        }

        Filtro fsel = componenteId == null ? fe : fe.comComponente(componenteId);
        Map<String, List<Fato>> porTurmaHab = new HashMap<>(), porHab = new HashMap<>(), porHabAnt = new HashMap<>();
        for (Fato f : analise.fatos(fsel, null)) {
            if (f.avaliacaoId().equals(av.id())) {
                porTurmaHab.computeIfAbsent(f.turmaId() + "|" + f.habilidadeId(), k -> new ArrayList<>()).add(f);
                porHab.computeIfAbsent(f.habilidadeId(), k -> new ArrayList<>()).add(f);
            } else if (ant != null && f.avaliacaoId().equals(ant.id())) {
                porHabAnt.computeIfAbsent(f.habilidadeId(), k -> new ArrayList<>()).add(f);
            }
        }

        List<PlanoResumo> visiveis = planos.listar(u, new PlanoService.FiltroPlanos(null, null, null, escolaId, null, null, null, null, null));
        Map<Long, List<String>> habsPlano = planoRepo.habilidadesPorPlano();
        List<br.slz.conecta.plano.PlanoRow> rowsEscola = planos.todosRows().stream().filter(p -> escolaId.equals(p.escolaId())).toList();

        boolean mostraProf = !u.gestor();
        List<TurmaResumo> turmas = new ArrayList<>();
        for (TurmaRef t : catalogo.turmasDaEscola(escolaId)) {
            Map<String, Indicador> inds = new LinkedHashMap<>();
            Map<String, Double> vars = new LinkedHashMap<>();
            for (ComponenteRef c : catalogo.componentes()) {
                Filtro ft = Filtro.vazio().comTurma(t.id()).comComponente(c.id());
                Indicador i = analise.indicador(ft, av.id());
                inds.put(c.id(), i);
                if (ant != null) vars.put(c.id(), CalculadoraIndicadores.delta(analise.indicador(ft, ant.id()), i));
            }
            int hAt = 0;
            for (HabilidadeRef h : catalogo.habilidadesDe(t.anoEscolar(), componenteId)) {
                Indicador ih = calc.calcular(porTurmaHab.getOrDefault(t.id() + "|" + h.id(), List.of()));
                if (ih.temValor() && ih.percentualAcerto() < crit.atencao()) hAt++;
            }
            int ativos = (int) rowsEscola.stream().filter(p -> t.id().equals(p.turmaId()) && p.status().ativo()).count();
            long avaliados = analise.avaliados(Filtro.vazio().comTurma(t.id()), av.id());
            turmas.add(new TurmaResumo(t.id(), t.nome(), t.anoEscolar(), t.turno(), t.matriculados(), avaliados,
                    mostraProf ? catalogo.professoresDaTurma(t.id(), null).stream().map(ProfessorRef::nome).toList() : List.of(),
                    inds, vars, hAt, ativos, acesso.podeVerTurma(u, t.id()), acesso.podeVerIndividuaisDaTurma(u, t.id())));
        }

        List<HabEscola> habs = new ArrayList<>();
        Set<Integer> anosEscola = catalogo.turmasDaEscola(escolaId).stream().map(TurmaRef::anoEscolar).collect(Collectors.toSet());
        for (HabilidadeRef h : catalogo.habilidadesDe(null, componenteId)) {
            if (!anosEscola.contains(h.anoEscolar())) continue;
            Indicador i = calc.calcular(porHab.getOrDefault(h.id(), List.of()));
            if (!i.temValor() && !i.suprimido()) continue;
            Indicador ia = calc.calcular(porHabAnt.getOrDefault(h.id(), List.of()));
            int emAt = 0, comDados = 0;
            for (TurmaRef t : catalogo.turmasDaEscola(escolaId)) {
                if (t.anoEscolar() != h.anoEscolar()) continue;
                Indicador it = calc.calcular(porTurmaHab.getOrDefault(t.id() + "|" + h.id(), List.of()));
                if (!it.temValor()) continue;
                comDados++;
                if (it.percentualAcerto() < crit.atencao()) emAt++;
            }
            int ativos = (int) rowsEscola.stream().filter(p -> p.status().ativo() && habsPlano.getOrDefault(p.id(), List.of()).contains(h.id())).count();
            habs.add(new HabEscola(h.id(), h.grupo(), h.descricao(), h.componenteId(), h.anoEscolar(), i, ia,
                    CalculadoraIndicadores.delta(ia, i), tend(ia, i), emAt, comDados, ativos));
        }

        Map<StatusPlano, Integer> porStatus = new EnumMap<>(StatusPlano.class);
        for (StatusPlano s : StatusPlano.values()) porStatus.put(s, (int) rowsEscola.stream().filter(p -> p.status() == s).count());
        List<PlanoResumo> ativos = visiveis.stream().filter(p -> p.status().ativo()).toList();
        Set<Long> idsVisiveis = visiveis.stream().map(PlanoResumo::id).collect(Collectors.toSet());

        List<EventoHistorico> hist = new ArrayList<>();
        for (PlanoResumo p : visiveis) {
            for (Historico h : planoRepo.historico(p.id())) hist.add(new EventoHistorico(p.id(), p.titulo(), h));
        }
        hist.sort(Comparator.comparing((EventoHistorico x) -> x.evento().dataHora()).reversed());

        long matric = analise.matriculados(fe);
        long aval = analise.avaliados(fsel, av.id());
        return new Diagnostico(e, catalogo.territorio(e.territorioId()).nome(), AvRef.de(av), AvRef.de(ant),
                catalogo.turmasDaEscola(escolaId).size(), matric, aval, matric == 0 ? null : CalculadoraIndicadores.arred(100.0 * aval / matric),
                comps, turmas, habs, porStatus, ativos, porStatus.get(StatusPlano.PLANEJADO),
                hist.stream().limit(12).toList(), mostraProf);
    }

    // ================================================================ TURMA

    public record Ponto(String avaliacaoId, String sigla, Indicador indicador) {}

    public record DescritorRef(String id, String descricao, String statusValidacao) {}

    public record LinhaMatriz(HabilidadeRef habilidade, List<DescritorRef> descritores, List<Ponto> pontos, NivelDesempenho nivelAtual,
                              Double variacao, Tendencia tendencia, List<PlanoResumo> planos, int estrategiasDisponiveis,
                              List<String> formacoes) {}

    public record Faixa(String faixa, int estudantes) {}

    public record CompTurma(String componenteId, String nome, Indicador indicador, Indicador anterior, Double variacao,
                            Tendencia tendencia, List<AnaliseService.PontoSerie> serie, List<Faixa> distribuicao) {}

    public record EstudanteLinha(String id, String nome, String codigo, boolean avaliado, Map<String, Double> percentuais,
                                 Map<String, NivelDesempenho> niveis, int habilidadesAtencao, List<String> habilidadesAtencaoIds,
                                 int planosAtivos) {}

    public record DiagnosticoTurma(TurmaRef turma, EscolaRef escola, String territorioNome, List<String> professores,
                                   AvRef avaliacao, AvRef avaliacaoAnterior, long avaliados, Double cobertura,
                                   List<CompTurma> componentes, List<LinhaMatriz> matriz, boolean acessoIndividual,
                                   String motivoRestricao, List<EstudanteLinha> estudantes, List<PlanoResumo> planos,
                                   String notaInterpretacao) {}

    public DiagnosticoTurma turma(Usuario u, String turmaId, String componenteId, String avaliacaoId) {
        acesso.exigirTurma(u, turmaId);
        TurmaRef t = catalogo.turma(turmaId);
        EscolaRef e = catalogo.escola(t.escolaId());
        AvaliacaoRef av = catalogo.avaliacaoOuAtual(avaliacaoId);
        AvaliacaoRef ant = catalogo.anteriorComparavel(av).orElse(null);
        var calc = analise.calculadora();
        var crit = analise.criterios();
        Filtro ft = Filtro.vazio().comTurma(turmaId);
        boolean individual = acesso.podeVerIndividuaisDaTurma(u, turmaId);

        List<CompTurma> comps = new ArrayList<>();
        for (ComponenteRef c : catalogo.componentes()) {
            Filtro fc = ft.comComponente(c.id());
            List<Fato> fatos = analise.fatos(fc, av.id());
            Indicador i = calc.calcular(fatos);
            Indicador ia = ant == null ? Indicador.vazio() : analise.indicador(fc, ant.id());
            comps.add(new CompTurma(c.id(), c.nome(), i, ia, CalculadoraIndicadores.delta(ia, i), tend(ia, i), analise.serie(fc),
                    i.suprimido() ? List.of() : distribuicao(fatos)));
        }

        Map<String, List<DescritorRef>> descritores = new HashMap<>();
        jdbc.query("""
                SELECT dh.habilidade_id, d.id, d.descricao, dh.status_validacao
                  FROM descritor_habilidade dh JOIN descritor d ON d.id = dh.descritor_id""",
                rs -> { descritores.computeIfAbsent(rs.getString(1), k -> new ArrayList<>()).add(new DescritorRef(rs.getString(2), rs.getString(3), rs.getString(4))); });
        Map<String, List<String>> formsPorHab = new HashMap<>();
        jdbc.query("SELECT habilidade_id, formacao_id FROM formacao_habilidade",
                rs -> { formsPorHab.computeIfAbsent(rs.getString(1), k -> new ArrayList<>()).add(rs.getString(2)); });
        Map<String, Integer> estrategiasPorHab = new HashMap<>();
        jdbc.query("SELECT habilidade_id, COUNT(*) FROM estrategia_habilidade GROUP BY habilidade_id",
                rs -> { estrategiasPorHab.put(rs.getString(1), rs.getInt(2)); });

        List<PlanoResumo> planosTurma = planos.listar(u, new PlanoService.FiltroPlanos(null, null, null, t.escolaId(), null, null, null, null, null))
                .stream().filter(p -> turmaId.equals(p.turma() == null ? null : p.turma().id()) || p.escopo() == EscopoPlano.ESCOLA).toList();

        Map<String, List<Fato>> porHabAv = analise.fatos(ft, null).stream()
                .collect(Collectors.groupingBy(f -> f.habilidadeId() + "|" + f.avaliacaoId()));
        List<LinhaMatriz> matriz = new ArrayList<>();
        for (HabilidadeRef h : catalogo.habilidadesDe(t.anoEscolar(), componenteId)) {
            List<Ponto> pts = new ArrayList<>();
            for (AvaliacaoRef a : catalogo.avaliacoesRede()) {
                pts.add(new Ponto(a.id(), a.sigla(), calc.calcular(porHabAv.getOrDefault(h.id() + "|" + a.id(), List.of()))));
            }
            Indicador i = calc.calcular(porHabAv.getOrDefault(h.id() + "|" + av.id(), List.of()));
            Indicador ia = ant == null ? Indicador.vazio() : calc.calcular(porHabAv.getOrDefault(h.id() + "|" + ant.id(), List.of()));
            List<PlanoResumo> ph = planosTurma.stream().filter(p -> p.habilidades().contains(h.id()) && p.escopo() != EscopoPlano.ESTUDANTE).toList();
            matriz.add(new LinhaMatriz(h, descritores.getOrDefault(h.id(), List.of()), pts, i.temValor() ? i.nivel() : null,
                    CalculadoraIndicadores.delta(ia, i), tend(ia, i), ph, estrategiasPorHab.getOrDefault(h.id(), 0),
                    formsPorHab.getOrDefault(h.id(), List.of())));
        }

        List<EstudanteLinha> lista = null;
        String motivo = null;
        if (individual) {
            List<Fato> fatosAv = analise.fatos(ft, av.id());
            Map<String, List<Fato>> porEst = fatosAv.stream().collect(Collectors.groupingBy(Fato::estudanteId));
            Map<String, Long> planosAtivosPorEst = planos.todosRows().stream()
                    .filter(p -> p.estudanteId() != null && turmaId.equals(p.turmaId()) && p.status().ativo())
                    .collect(Collectors.groupingBy(br.slz.conecta.plano.PlanoRow::estudanteId, Collectors.counting()));
            lista = new ArrayList<>();
            for (var est : estudantes.daTurma(turmaId)) {
                List<Fato> fe = porEst.getOrDefault(est.id(), List.of());
                Map<String, Double> pcts = new LinkedHashMap<>();
                Map<String, NivelDesempenho> nivs = new LinkedHashMap<>();
                for (ComponenteRef c : catalogo.componentes()) {
                    Indicador ic = calc.calcular(fe.stream().filter(f -> f.componenteId().equals(c.id())).toList(), false);
                    if (ic.temValor()) { pcts.put(c.id(), ic.percentualAcerto()); nivs.put(c.id(), ic.nivel()); }
                }
                List<String> hAt = fe.stream().filter(f -> componenteId == null || f.componenteId().equals(componenteId))
                        .collect(Collectors.groupingBy(Fato::habilidadeId)).entrySet().stream()
                        .filter(en -> calc.calcular(en.getValue(), false).percentualAcerto() < crit.atencao())
                        .map(Map.Entry::getKey).sorted().toList();
                lista.add(new EstudanteLinha(est.id(), est.nome(), est.codigo(), !fe.isEmpty(), pcts, nivs, hAt.size(), hAt,
                        planosAtivosPorEst.getOrDefault(est.id(), 0L).intValue()));
            }
        } else {
            motivo = u.gestor()
                    ? "A gestão da rede visualiza apenas dados agregados. Dados individuais são restritos à coordenação da escola e ao professor responsável."
                    : "Dados individuais restritos ao professor responsável pela turma e à coordenação da escola.";
        }
        long avaliados = analise.avaliados(ft, av.id());
        return new DiagnosticoTurma(t, e, catalogo.territorio(e.territorioId()).nome(),
                u.gestor() ? List.of() : catalogo.professoresDaTurma(turmaId, null).stream().map(ProfessorRef::nome).toList(),
                AvRef.de(av), AvRef.de(ant), avaliados, t.matriculados() == 0 ? null : CalculadoraIndicadores.arred(100.0 * avaliados / t.matriculados()),
                comps, matriz, individual, motivo, lista, planosTurma,
                "Os percentuais descrevem resultados observados nas avaliações. Possíveis causas (frequência, contexto, "
                        + "abordagem didática) são hipóteses a investigar com a equipe, não conclusões do sistema.");
    }

    private List<Faixa> distribuicao(List<Fato> fatos) {
        Map<String, int[]> porEst = new HashMap<>();
        for (Fato f : fatos) {
            int[] a = porEst.computeIfAbsent(f.estudanteId(), k -> new int[2]);
            a[0] += f.acertos();
            a[1] += f.itens();
        }
        int[] faixas = new int[5];
        for (int[] a : porEst.values()) {
            double p = 100.0 * a[0] / a[1];
            faixas[Math.min(4, (int) (p / 20))]++;
        }
        String[] rot = {"0–19%", "20–39%", "40–59%", "60–79%", "80–100%"};
        List<Faixa> out = new ArrayList<>();
        for (int i = 0; i < 5; i++) out.add(new Faixa(rot[i], faixas[i]));
        return out;
    }

    private Tendencia tend(Indicador a, Indicador b) {
        return analise.criterios().tendencia(a.temValor() ? a.percentualAcerto() : null, b.temValor() ? b.percentualAcerto() : null);
    }

    // ================================================================ minhas turmas

    public record MinhaTurma(String id, String nome, int anoEscolar, String escolaId, String escolaNome, int matriculados,
                             Map<String, Indicador> indicadores, int estudantesComAtencao, int planosAtivos, List<String> componentes) {}

    public List<MinhaTurma> minhasTurmas(Usuario u) {
        List<TurmaRef> turmas = switch (u.papel()) {
            case GESTOR_REDE -> List.of();
            case COORDENADOR -> catalogo.turmasDaEscola(u.escolaId());
            case PROFESSOR -> catalogo.turmasDoProfessor(u.professorId()).stream().map(catalogo::turma).toList();
        };
        AvaliacaoRef av = catalogo.avaliacaoOuAtual(null);
        var calc = analise.calculadora();
        var crit = analise.criterios();
        List<MinhaTurma> out = new ArrayList<>();
        for (TurmaRef t : turmas) {
            Map<String, Indicador> inds = new LinkedHashMap<>();
            for (ComponenteRef c : catalogo.componentes()) inds.put(c.id(), analise.indicador(Filtro.vazio().comTurma(t.id()).comComponente(c.id()), av.id()));
            Map<String, List<Fato>> porEstHab = analise.fatos(Filtro.vazio().comTurma(t.id()), av.id()).stream()
                    .collect(Collectors.groupingBy(f -> f.estudanteId() + "|" + f.habilidadeId()));
            long comAtencao = porEstHab.entrySet().stream()
                    .filter(en -> calc.calcular(en.getValue(), false).percentualAcerto() < crit.atencao())
                    .map(en -> en.getKey().split("\\|")[0]).distinct().count();
            int ativos = (int) planos.todosRows().stream().filter(p -> t.id().equals(p.turmaId()) && p.status().ativo()).count();
            List<String> comps = u.professor()
                    ? catalogo.vinculos().stream().filter(v -> v.turmaId().equals(t.id()) && v.professorId().equals(u.professorId()))
                    .map(br.slz.conecta.analise.Refs.Vinculo::componenteId).toList()
                    : catalogo.componentes().stream().map(ComponenteRef::id).toList();
            out.add(new MinhaTurma(t.id(), t.nome(), t.anoEscolar(), t.escolaId(), catalogo.escola(t.escolaId()).nome(),
                    t.matriculados(), inds, (int) comAtencao, ativos, comps));
        }
        return out;
    }
}
