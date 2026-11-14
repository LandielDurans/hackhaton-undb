package br.slz.conecta.rede;

import br.slz.conecta.analise.AnaliseService;
import br.slz.conecta.analise.Catalogo;
import br.slz.conecta.analise.Fato;
import br.slz.conecta.analise.Filtro;
import br.slz.conecta.analise.Refs.*;
import br.slz.conecta.common.ConectaProperties;
import br.slz.conecta.domain.CalculadoraIndicadores;
import br.slz.conecta.domain.Indicador;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Painel de análises por escola usado no mapa: evasão, desempenho por notas, desempenho por matéria,
 * escassez de profissionais e educação especial — e as notificações geradas por regras sobre esses dados.
 * Somente dados agregados por escola.
 */
@Service
public class PainelEscolasService {
    private static final Set<String> BAIRROS_FEMININOS = Set.of("Vila Embratel", "Cidade Operária", "Cohab Anil", "Liberdade",
            "Madre Deus", "Cidade Olímpica");

    /** Limiares das regras de notificação (demonstrativos). */
    static final double EVASAO_ALERTA = 15, EVASAO_CRITICA = 20, DESEMPENHO_ABAIXO_PP = 4, AEE_ALERTA = 70, AEE_CRITICA = 50;

    private final AnaliseService analise;
    private final Catalogo catalogo;
    private final JdbcTemplate jdbc;
    private final int minimo;

    public PainelEscolasService(AnaliseService analise, Catalogo catalogo, JdbcTemplate jdbc, ConectaProperties props) {
        this.analise = analise;
        this.catalogo = catalogo;
        this.jdbc = jdbc;
        this.minimo = props.privacidade().minimoAgregacao();
    }

    public record Evasao(int matriculados, int abandonos, Double taxa) {}

    public record Deficit(String funcao, int necessarios, int lotados, int faltam) {}

    public record Escassez(int necessarios, int lotados, int faltam, List<Deficit> funcoes) {}

    /** Contagens suprimidas (nulas) quando o grupo é menor que o mínimo de agregação. */
    public record Inclusao(int matriculasEscola, Integer estudantesAee, Integer atendidosAee, Double cobertura,
                           int profissionaisApoio, boolean salaRecursos, boolean suprimido) {}

    public record Desempenho(Indicador indicador, Double nota, Double variacao) {}

    public record EscolaAnalise(String id, String nome, String bairro, String territorioId, String territorioNome, double lat,
                                double lng, String etapas, Evasao evasao, Desempenho notas, Map<String, Desempenho> porMateria,
                                Escassez escassez, Inclusao inclusao) {}

    public record Notificacao(String id, String tipo, String severidade, String titulo, String detalhe, String escolaId,
                              String escolaNome, String bairro) {}

    public record Painel(String avaliacao, String avaliacaoNome, Map<String, Double> rede, List<EscolaAnalise> escolas,
                         List<Notificacao> notificacoes, String aviso) {}

    public Painel painel(Integer ano, String avaliacaoId) {
        AvaliacaoRef av = catalogo.avaliacaoOuAtual(avaliacaoId);
        AvaliacaoRef ant = catalogo.anteriorComparavel(av).orElse(null);
        var calc = analise.calculadora();
        Filtro base = Filtro.vazio().comAno(ano);

        Map<String, List<Fato>> atual = new HashMap<>(), anterior = new HashMap<>();
        for (Fato f : analise.fatos(base, null)) {
            if (f.avaliacaoId().equals(av.id())) {
                atual.computeIfAbsent(f.escolaId(), k -> new ArrayList<>()).add(f);
                atual.computeIfAbsent(f.escolaId() + "|" + f.componenteId(), k -> new ArrayList<>()).add(f);
            } else if (ant != null && f.avaliacaoId().equals(ant.id())) {
                anterior.computeIfAbsent(f.escolaId(), k -> new ArrayList<>()).add(f);
                anterior.computeIfAbsent(f.escolaId() + "|" + f.componenteId(), k -> new ArrayList<>()).add(f);
            }
        }

        Map<String, int[]> evasao = new HashMap<>();
        String sqlEvasao = """
                SELECT t.escola_id, COUNT(*), SUM(CASE WHEN s.situacao = 'ABANDONO' THEN 1 ELSE 0 END)
                  FROM estudante s JOIN turma t ON t.id = s.turma_id
                """ + (ano == null ? "" : " WHERE t.ano_escolar = " + ano.intValue()) + " GROUP BY t.escola_id";
        jdbc.query(sqlEvasao, rs -> { evasao.put(rs.getString(1), new int[]{rs.getInt(2), rs.getInt(3)}); });

        Map<String, List<Deficit>> quadro = new HashMap<>();
        jdbc.query("SELECT escola_id, funcao, necessarios, lotados FROM quadro_docente ORDER BY escola_id, funcao", rs -> {
            int n = rs.getInt(3), l = rs.getInt(4);
            quadro.computeIfAbsent(rs.getString(1), k -> new ArrayList<>()).add(new Deficit(rs.getString(2), n, l, Math.max(0, n - l)));
        });

        Map<String, Inclusao> inclusao = new HashMap<>();
        jdbc.query("SELECT escola_id, matriculas_escola, estudantes_aee, atendidos_aee, profissionais_apoio, sala_recursos FROM inclusao_escola", rs -> {
            int aee = rs.getInt(3), at = rs.getInt(4);
            boolean sup = aee < minimo;
            inclusao.put(rs.getString(1), new Inclusao(rs.getInt(2), sup ? null : aee, sup ? null : at,
                    sup || aee == 0 ? null : CalculadoraIndicadores.arred(100.0 * at / aee), rs.getInt(5), rs.getBoolean(6), sup));
        });

        List<EscolaAnalise> escolas = new ArrayList<>();
        for (EscolaRef e : catalogo.escolas()) {
            Desempenho notas = desempenho(calc.calcular(atual.getOrDefault(e.id(), List.of())), calc.calcular(anterior.getOrDefault(e.id(), List.of())));
            Map<String, Desempenho> porMateria = new LinkedHashMap<>();
            for (ComponenteRef c : catalogo.componentes()) {
                porMateria.put(c.id(), desempenho(calc.calcular(atual.getOrDefault(e.id() + "|" + c.id(), List.of())),
                        calc.calcular(anterior.getOrDefault(e.id() + "|" + c.id(), List.of()))));
            }
            int[] ev = evasao.getOrDefault(e.id(), new int[2]);
            List<Deficit> defs = quadro.getOrDefault(e.id(), List.of());
            Escassez esc = new Escassez(defs.stream().mapToInt(Deficit::necessarios).sum(), defs.stream().mapToInt(Deficit::lotados).sum(),
                    defs.stream().mapToInt(Deficit::faltam).sum(), defs.stream().filter(d -> d.faltam() > 0).toList());
            escolas.add(new EscolaAnalise(e.id(), e.nome(), e.bairro(), e.territorioId(), catalogo.territorio(e.territorioId()).nome(),
                    e.lat(), e.lng(), e.etapas(),
                    new Evasao(ev[0], ev[1], ev[0] == 0 ? null : CalculadoraIndicadores.arred(100.0 * ev[1] / ev[0])),
                    notas, porMateria, esc, inclusao.get(e.id())));
        }

        // médias da rede (referência para as regras)
        Map<String, Double> rede = new LinkedHashMap<>();
        Indicador ir = calc.calcular(analise.fatos(base, av.id()));
        rede.put("percentualAcerto", ir.temValor() ? ir.percentualAcerto() : null);
        int mat = evasao.values().stream().mapToInt(x -> x[0]).sum(), ab = evasao.values().stream().mapToInt(x -> x[1]).sum();
        rede.put("evasao", mat == 0 ? null : CalculadoraIndicadores.arred(100.0 * ab / mat));
        rede.put("profissionaisFaltando", (double) escolas.stream().mapToInt(x -> x.escassez().faltam()).sum());
        int aee = inclusao.values().stream().filter(i -> !i.suprimido()).mapToInt(Inclusao::estudantesAee).sum();
        int at = inclusao.values().stream().filter(i -> !i.suprimido()).mapToInt(Inclusao::atendidosAee).sum();
        rede.put("coberturaAee", aee == 0 ? null : CalculadoraIndicadores.arred(100.0 * at / aee));

        return new Painel(av.sigla(), av.nome(), rede, escolas, notificacoes(escolas, rede.get("percentualAcerto"), av),
                "Dados FICTÍCIOS. Evasão calculada nas turmas acompanhadas; quadro de profissionais e educação especial referem-se à "
                        + "escola inteira e são apenas contagens agregadas.");
    }

    private Desempenho desempenho(Indicador atual, Indicador ant) {
        Double nota = atual.temValor() ? Math.round(atual.percentualAcerto()) / 10.0 : null;
        return new Desempenho(atual, nota, CalculadoraIndicadores.delta(ant, atual));
    }

    /** Regras transparentes que geram os avisos do painel. */
    List<Notificacao> notificacoes(List<EscolaAnalise> escolas, Double mediaRede, AvaliacaoRef av) {
        List<Notificacao> out = new ArrayList<>();
        var crit = analise.criterios();
        for (EscolaAnalise e : escolas) {
            Double tx = e.evasao().taxa();
            if (tx != null && tx >= EVASAO_ALERTA) {
                out.add(new Notificacao("EV:" + e.id(), "EVASAO", tx >= EVASAO_CRITICA ? "ALTA" : "MEDIA",
                        "Escola " + de(e.bairro()) + " está com " + Math.round(tx) + "% de evasão!",
                        e.evasao().abandonos() + " de " + e.evasao().matriculados() + " estudantes deixaram de frequentar em 2026.",
                        e.id(), e.nome(), e.bairro()));
            }
            if (e.escassez().faltam() >= 1) {
                String falta = e.escassez().funcoes().stream().map(d -> d.faltam() + " " + funcaoTexto(d.funcao(), d.faltam()))
                        .collect(Collectors.joining(" e "));
                out.add(new Notificacao("ES:" + e.id(), "ESCASSEZ", e.escassez().faltam() >= 3 ? "ALTA" : e.escassez().faltam() == 2 ? "MEDIA" : "BAIXA",
                        "A escola " + de(e.bairro()) + " precisa de profissionais!", (e.escassez().faltam() == 1 ? "Falta " : "Faltam ") + falta + ".", e.id(), e.nome(), e.bairro()));
            }
            Inclusao in = e.inclusao();
            if (in != null && in.cobertura() != null && in.cobertura() < AEE_ALERTA) {
                out.add(new Notificacao("AEE:" + e.id(), "INCLUSAO", in.cobertura() < AEE_CRITICA ? "ALTA" : "MEDIA",
                        "Educação especial sem atendimento completo " + em(e.bairro()),
                        Math.round(in.cobertura()) + "% dos estudantes da educação especial são atendidos"
                                + (in.salaRecursos() ? "." : "; a escola não tem sala de recursos."), e.id(), e.nome(), e.bairro()));
            }
        }
        // Desempenho por bairro abaixo da média da rede
        if (mediaRede != null) {
            Map<String, List<EscolaAnalise>> porBairro = escolas.stream().collect(Collectors.groupingBy(EscolaAnalise::bairro, LinkedHashMap::new, Collectors.toList()));
            porBairro.forEach((bairro, lista) -> {
                long ac = 0, it = 0;
                for (EscolaAnalise e : lista) {
                    Indicador i = e.notas().indicador();
                    if (!i.temValor()) continue;
                    ac += Math.round(i.percentualAcerto() * i.estudantes());
                    it += i.estudantes();
                }
                if (it == 0) return;
                double pct = CalculadoraIndicadores.arred((double) ac / it);
                if (mediaRede - pct >= DESEMPENHO_ABAIXO_PP) {
                    EscolaAnalise ref = lista.get(0);
                    out.add(new Notificacao("DE:" + bairro, "DESEMPENHO", pct < crit.atencao() ? "ALTA" : "MEDIA",
                            "O desempenho dos alunos " + em(bairro) + " está abaixo da média.",
                            String.format(Locale.forLanguageTag("pt-BR"), "%.1f%% de acerto na %s, contra %.1f%% na rede.", pct, av.sigla(), mediaRede),
                            ref.id(), lista.stream().map(EscolaAnalise::nome).collect(Collectors.joining(", ")), bairro));
                }
            });
        }
        Map<String, Integer> sev = Map.of("ALTA", 0, "MEDIA", 1, "BAIXA", 2);
        Map<String, Integer> ordemTipo = Map.of("EVASAO", 0, "DESEMPENHO", 1, "ESCASSEZ", 2, "INCLUSAO", 3);
        out.sort(Comparator.comparing((Notificacao n) -> sev.get(n.severidade())).thenComparing(n -> ordemTipo.get(n.tipo())).thenComparing(Notificacao::titulo));
        return out;
    }

    static String funcaoTexto(String funcao, int n) {
        boolean pl = n > 1;
        if (funcao.startsWith("Professor(a) ")) return (pl ? "professores " : "professor(a) ") + funcao.substring("Professor(a) ".length());
        if (funcao.startsWith("Profissional de apoio")) return pl ? "profissionais de apoio da educação especial" : "profissional de apoio da educação especial";
        if (funcao.startsWith("Coordenação")) return pl ? "coordenadores pedagógicos" : "coordenador(a) pedagógico(a)";
        return funcao.toLowerCase();
    }

    static String de(String bairro) {
        return (BAIRROS_FEMININOS.contains(bairro) ? "da " : "do ") + bairro;
    }

    static String em(String bairro) {
        return (BAIRROS_FEMININOS.contains(bairro) ? "na " : "no ") + bairro;
    }
}
