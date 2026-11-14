package br.slz.conecta.rede;

import br.slz.conecta.analise.AnaliseService;
import br.slz.conecta.analise.Catalogo;
import br.slz.conecta.analise.Fato;
import br.slz.conecta.analise.Filtro;
import br.slz.conecta.analise.Refs.*;
import br.slz.conecta.domain.*;
import br.slz.conecta.formacao.FormacaoService;
import br.slz.conecta.plano.PlanoRow;
import br.slz.conecta.plano.PlanoService;
import br.slz.conecta.common.Datas;
import br.slz.conecta.security.Usuario;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/** Inteligência regional: indicadores agregados por escola e território para o mapa e o painel. */
@Service
public class RedeService {
    private static final DateTimeFormatter BR = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    public static final String AVISO_MAPA = "Escolas e coordenadas FICTÍCIAS, posicionadas de forma demonstrativa nos bairros de São Luís. "
            + "Territórios são agrupamentos demonstrativos de bairros, sem limites oficiais. Os marcadores de território "
            + "representam o centro das escolas do agrupamento, não uma área.";

    private final AnaliseService analise;
    private final Catalogo catalogo;
    private final PlanoService planos;
    private final FormacaoService formacoes;
    private final Datas datas;

    public RedeService(AnaliseService analise, Catalogo catalogo, PlanoService planos, FormacaoService formacoes, Datas datas) {
        this.analise = analise;
        this.catalogo = catalogo;
        this.planos = planos;
        this.formacoes = formacoes;
        this.datas = datas;
    }

    public record FiltroRede(String territorioId, String escolaId, Integer ano, String componenteId, String habilidadeId,
                             String avaliacaoId, StatusPlano statusPlano) {
        Filtro filtro() {
            return Filtro.de(territorioId, escolaId, ano, componenteId, habilidadeId);
        }
    }

    public record AvRef(String id, String sigla, String nome, String data) {
        public static AvRef de(AvaliacaoRef a) {
            return a == null ? null : new AvRef(a.id(), a.sigla(), a.nome(), a.data().toString());
        }
    }

    public record HabilidadeCritica(String id, String grupo, double percentual, int estudantes) {}

    public record Formacao(int professoresComDemanda, int participacoes, int concluidas, int aplicaram) {}

    public record EscolaMapa(String id, String nome, String bairro, String territorioId, String territorioNome, double lat, double lng,
                             String etapas, long matriculados, long avaliados, Double cobertura, Indicador indicador,
                             Indicador anterior, Double variacao, Tendencia tendencia, int habilidadesAtencao,
                             int habilidadesAnalisadas, HabilidadeCritica habilidadeCritica, Map<StatusPlano, Integer> intervencoes,
                             int intervencoesTotal, Formacao formacao) {}

    public record TerritorioMapa(String id, String nome, String bairros, double lat, double lng, int escolas, long matriculados,
                                 long avaliados, Double cobertura, Indicador indicador, Indicador anterior, Double variacao,
                                 Tendencia tendencia, Map<StatusPlano, Integer> intervencoes, int professoresComDemanda) {}

    public record Mapa(AvRef avaliacao, AvRef avaliacaoAnterior, List<EscolaMapa> escolas, List<TerritorioMapa> territorios,
                       String aviso) {}

    public Mapa mapa(FiltroRede fr) {
        AvaliacaoRef av = catalogo.avaliacaoOuAtual(fr.avaliacaoId());
        AvaliacaoRef ant = catalogo.anteriorComparavel(av).orElse(null);
        Filtro f = fr.filtro();
        var calc = analise.calculadora();
        var crit = analise.criterios();

        Map<String, List<Fato>> atualEsc = new HashMap<>(), antEsc = new HashMap<>(), atualEscHab = new HashMap<>();
        Map<String, List<Fato>> atualTer = new HashMap<>(), antTer = new HashMap<>();
        for (Fato x : analise.fatos(f, null)) {
            if (x.avaliacaoId().equals(av.id())) {
                atualEsc.computeIfAbsent(x.escolaId(), k -> new ArrayList<>()).add(x);
                atualTer.computeIfAbsent(x.territorioId(), k -> new ArrayList<>()).add(x);
                atualEscHab.computeIfAbsent(x.escolaId() + "|" + x.habilidadeId(), k -> new ArrayList<>()).add(x);
            } else if (ant != null && x.avaliacaoId().equals(ant.id())) {
                antEsc.computeIfAbsent(x.escolaId(), k -> new ArrayList<>()).add(x);
                antTer.computeIfAbsent(x.territorioId(), k -> new ArrayList<>()).add(x);
            }
        }
        Set<String> habsFiltro = fr.habilidadeId() != null ? Set.of(fr.habilidadeId())
                : catalogo.habilidadesDe(fr.ano(), fr.componenteId()).stream().map(HabilidadeRef::id).collect(Collectors.toSet());
        Map<String, Map<StatusPlano, Integer>> planosEsc = planos.contagemPorEscola(fr.componenteId(),
                fr.habilidadeId() == null && fr.ano() == null ? null : habsFiltro);
        Map<String, Integer> demanda = formacoes.demandaPorEscola(f, av.id());
        Map<String, int[]> parts = formacoes.participacoesPorEscola();

        List<EscolaMapa> escolas = new ArrayList<>();
        for (EscolaRef e : catalogo.escolas()) {
            if (fr.territorioId() != null && !fr.territorioId().equals(e.territorioId())) continue;
            if (fr.escolaId() != null && !fr.escolaId().equals(e.id())) continue;
            Map<StatusPlano, Integer> interv = completar(planosEsc.get(e.id()));
            if (fr.statusPlano() != null && interv.get(fr.statusPlano()) == 0) continue;
            Indicador ind = calc.calcular(atualEsc.getOrDefault(e.id(), List.of()));
            Indicador indAnt = calc.calcular(antEsc.getOrDefault(e.id(), List.of()));
            long matric = analise.matriculados(f.comEscola(e.id()));
            long aval = atualEsc.getOrDefault(e.id(), List.of()).stream().map(Fato::estudanteId).distinct().count();
            int emAtencao = 0, analisadas = 0;
            HabilidadeCritica critica = null;
            for (String h : habsFiltro) {
                Indicador ih = calc.calcular(atualEscHab.getOrDefault(e.id() + "|" + h, List.of()));
                if (!ih.temValor()) continue;
                analisadas++;
                if (ih.percentualAcerto() < crit.atencao()) emAtencao++;
                if (critica == null || ih.percentualAcerto() < critica.percentual()) {
                    critica = new HabilidadeCritica(h, catalogo.habilidade(h).grupo(), ih.percentualAcerto(), ih.estudantes());
                }
            }
            int[] p = parts.getOrDefault(e.id(), new int[3]);
            escolas.add(new EscolaMapa(e.id(), e.nome(), e.bairro(), e.territorioId(), catalogo.territorio(e.territorioId()).nome(),
                    e.lat(), e.lng(), e.etapas(), matric, aval, cobertura(aval, matric), ind, indAnt,
                    CalculadoraIndicadores.delta(indAnt, ind), tendencia(indAnt, ind), emAtencao, analisadas, critica, interv,
                    interv.values().stream().mapToInt(Integer::intValue).sum(),
                    new Formacao(demanda.getOrDefault(e.id(), 0), p[0], p[1], p[2])));
        }

        List<TerritorioMapa> territorios = new ArrayList<>();
        for (TerritorioRef t : catalogo.territorios()) {
            if (fr.territorioId() != null && !fr.territorioId().equals(t.id())) continue;
            List<EscolaMapa> doT = escolas.stream().filter(e -> e.territorioId().equals(t.id())).toList();
            List<EscolaRef> todasT = catalogo.escolasDoTerritorio(t.id());
            double lat = todasT.stream().mapToDouble(EscolaRef::lat).average().orElse(0);
            double lng = todasT.stream().mapToDouble(EscolaRef::lng).average().orElse(0);
            Indicador ind = calc.calcular(atualTer.getOrDefault(t.id(), List.of()));
            Indicador indAnt = calc.calcular(antTer.getOrDefault(t.id(), List.of()));
            Map<StatusPlano, Integer> interv = new EnumMap<>(StatusPlano.class);
            for (StatusPlano s : StatusPlano.values()) interv.put(s, doT.stream().mapToInt(e -> e.intervencoes().get(s)).sum());
            // planos territoriais também contam
            for (PlanoRow p : planos.todosRows()) {
                if (p.escopo() == EscopoPlano.TERRITORIO && t.id().equals(p.territorioId())
                        && (fr.componenteId() == null || fr.componenteId().equals(p.componenteId()))) interv.merge(p.status(), 1, Integer::sum);
            }
            long matric = analise.matriculados(f.comTerritorio(t.id()));
            long aval = atualTer.getOrDefault(t.id(), List.of()).stream().map(Fato::estudanteId).distinct().count();
            territorios.add(new TerritorioMapa(t.id(), t.nome(), t.bairros(), lat, lng, todasT.size(), matric, aval,
                    cobertura(aval, matric), ind, indAnt, CalculadoraIndicadores.delta(indAnt, ind), tendencia(indAnt, ind), interv,
                    doT.stream().mapToInt(e -> e.formacao().professoresComDemanda()).sum()));
        }
        return new Mapa(AvRef.de(av), AvRef.de(ant), escolas, territorios, AVISO_MAPA);
    }

    // ------------------------------------------------------------------ painel

    public record HabilidadePainel(String id, String grupo, String descricao, String componenteId, int anoEscolar,
                                   Indicador indicador, Indicador anterior, Double variacao, Tendencia tendencia,
                                   int escolasEmAtencao, int escolasComDados) {}

    public record EscolaApoio(String id, String nome, String territorioNome, List<String> motivos, int habilidadesAtencao,
                              int planosAtivos) {}

    public record Painel(AvRef avaliacao, AvRef avaliacaoAnterior, String periodo, int totalEscolas, int totalTurmas,
                         long matriculados, long avaliados, Double cobertura, Indicador indicador, Indicador anterior,
                         Double variacao, Tendencia tendencia, List<AnaliseService.PontoSerie> serie,
                         List<HabilidadePainel> habilidades, List<EscolaApoio> escolasApoio,
                         Map<StatusPlano, Integer> intervencoes, int intervencoesAtrasadas,
                         List<FormacaoService.DemandaFormacao> demandasFormacao, int lacunasFormacao, String notaRanking) {}

    public Painel painel(Usuario u, FiltroRede fr) {
        AvaliacaoRef av = catalogo.avaliacaoOuAtual(fr.avaliacaoId());
        AvaliacaoRef ant = catalogo.anteriorComparavel(av).orElse(null);
        Filtro f = fr.filtro();
        var calc = analise.calculadora();
        var crit = analise.criterios();
        Mapa mapa = mapa(fr);

        Indicador ind = analise.indicador(f, av.id());
        Indicador indAnt = ant == null ? Indicador.vazio() : analise.indicador(f, ant.id());
        long matric = mapa.escolas().stream().mapToLong(EscolaMapa::matriculados).sum();
        long aval = mapa.escolas().stream().mapToLong(EscolaMapa::avaliados).sum();
        Set<String> escolasIds = mapa.escolas().stream().map(EscolaMapa::id).collect(Collectors.toSet());
        int turmas = (int) catalogo.turmas().stream().filter(t -> escolasIds.contains(t.escolaId()))
                .filter(t -> fr.ano() == null || t.anoEscolar() == fr.ano()).count();

        // habilidades
        Map<String, List<Fato>> porHab = new HashMap<>(), porHabAnt = new HashMap<>(), porHabEsc = new HashMap<>();
        for (Fato x : analise.fatos(f, null)) {
            if (!escolasIds.contains(x.escolaId())) continue;
            if (x.avaliacaoId().equals(av.id())) {
                porHab.computeIfAbsent(x.habilidadeId(), k -> new ArrayList<>()).add(x);
                porHabEsc.computeIfAbsent(x.habilidadeId() + "|" + x.escolaId(), k -> new ArrayList<>()).add(x);
            } else if (ant != null && x.avaliacaoId().equals(ant.id())) {
                porHabAnt.computeIfAbsent(x.habilidadeId(), k -> new ArrayList<>()).add(x);
            }
        }
        List<HabilidadePainel> habs = new ArrayList<>();
        Map<String, List<String>> habsAtencaoPorEscola = new HashMap<>();
        for (HabilidadeRef h : catalogo.habilidadesDe(fr.ano(), fr.componenteId())) {
            if (fr.habilidadeId() != null && !fr.habilidadeId().equals(h.id())) continue;
            Indicador ih = calc.calcular(porHab.getOrDefault(h.id(), List.of()));
            if (!ih.temValor()) continue;
            Indicador iha = calc.calcular(porHabAnt.getOrDefault(h.id(), List.of()));
            int emAt = 0, comDados = 0;
            for (String e : escolasIds) {
                Indicador ie = calc.calcular(porHabEsc.getOrDefault(h.id() + "|" + e, List.of()));
                if (!ie.temValor()) continue;
                comDados++;
                if (ie.percentualAcerto() < crit.atencao()) {
                    emAt++;
                    habsAtencaoPorEscola.computeIfAbsent(e, k -> new ArrayList<>()).add(h.id());
                }
            }
            habs.add(new HabilidadePainel(h.id(), h.grupo(), h.descricao(), h.componenteId(), h.anoEscolar(), ih, iha,
                    CalculadoraIndicadores.delta(iha, ih), tendencia(iha, ih), emAt, comDados));
        }
        habs.sort(Comparator.comparing((HabilidadePainel h) -> h.indicador().percentualAcerto()));

        // escolas que necessitam de apoio: critérios explícitos, listadas em ordem alfabética (não é ranking)
        List<EscolaApoio> apoio = new ArrayList<>();
        for (EscolaMapa e : mapa.escolas()) {
            List<String> motivos = new ArrayList<>();
            List<String> ha = habsAtencaoPorEscola.getOrDefault(e.id(), List.of());
            if (e.indicador().temValor() && e.indicador().nivel() == NivelDesempenho.REQUER_ATENCAO) {
                motivos.add("resultado geral abaixo do limiar de atenção (" + fmt(e.indicador().percentualAcerto()) + ")");
            }
            if (ha.size() >= 2) {
                motivos.add(ha.size() + " habilidades abaixo do limiar de atenção (" + String.join(", ", ha.stream().sorted().limit(4).toList())
                        + (ha.size() > 4 ? "…" : "") + ")");
            }
            if (e.tendencia() == Tendencia.QUEDA) motivos.add("queda de " + fmt(Math.abs(e.variacao())).replace("%", " p.p.") + " em relação a " + (ant == null ? "" : ant.sigla()));
            if (motivos.isEmpty()) continue;
            int ativos = e.intervencoes().get(StatusPlano.PLANEJADO) + e.intervencoes().get(StatusPlano.EM_ANDAMENTO);
            apoio.add(new EscolaApoio(e.id(), e.nome(), e.territorioNome(), motivos, ha.size(), ativos));
        }
        apoio.sort(Comparator.comparing(EscolaApoio::territorioNome).thenComparing(EscolaApoio::nome));

        Map<StatusPlano, Integer> interv = new EnumMap<>(StatusPlano.class);
        for (StatusPlano s : StatusPlano.values()) interv.put(s, mapa.territorios().stream().mapToInt(t -> t.intervencoes().get(s)).sum());
        int atrasadas = (int) planos.todosRows().stream()
                .filter(p -> p.status().ativo() && p.prazo().isBefore(datas.hoje()))
                .filter(p -> fr.territorioId() == null || fr.territorioId().equals(p.territorioId())
                        || (p.escolaId() != null && escolasIds.contains(p.escolaId())))
                .count();

        var dem = formacoes.demandas(u, fr.territorioId(), fr.ano(), fr.componenteId(), av.id());
        List<AvaliacaoRef> avs = catalogo.avaliacoesRede();
        String periodo = avs.get(0).sigla() + " (" + avs.get(0).data().format(BR) + ") a " + avs.get(avs.size() - 1).sigla()
                + " (" + avs.get(avs.size() - 1).data().format(BR) + ")";
        return new Painel(AvRef.de(av), AvRef.de(ant), periodo, mapa.escolas().size(), turmas, matric, aval, cobertura(aval, matric),
                ind, indAnt, CalculadoraIndicadores.delta(indAnt, ind), tendencia(indAnt, ind), analise.serie(f), habs, apoio,
                interv, atrasadas, dem.porFormacao(), dem.lacunas().size(),
                "Escolas listadas por critérios explícitos, em ordem alfabética por território. Não se trata de ranking.");
    }

    // ------------------------------------------------------------------ territórios

    public record CelulaMatriz(String territorioId, String habilidadeId, Indicador indicador) {}

    public record TerritorioSerie(String id, String nome, String bairros, int escolas, Indicador indicador,
                                  List<AnaliseService.PontoSerie> serie) {}

    public record Comparativo(AvRef avaliacao, List<TerritorioSerie> territorios, List<HabilidadeRef> habilidades,
                              List<CelulaMatriz> matriz) {}

    public Comparativo territorios(Integer ano, String componenteId, String avaliacaoId) {
        AvaliacaoRef av = catalogo.avaliacaoOuAtual(avaliacaoId);
        Filtro base = Filtro.de(null, null, ano, componenteId, null);
        var calc = analise.calculadora();
        Map<String, List<Fato>> porTH = analise.fatos(base, av.id()).stream()
                .collect(Collectors.groupingBy(x -> x.territorioId() + "|" + x.habilidadeId()));
        List<HabilidadeRef> habs = catalogo.habilidadesDe(ano, componenteId);
        List<TerritorioSerie> ts = new ArrayList<>();
        List<CelulaMatriz> matriz = new ArrayList<>();
        for (TerritorioRef t : catalogo.territorios()) {
            ts.add(new TerritorioSerie(t.id(), t.nome(), t.bairros(), catalogo.escolasDoTerritorio(t.id()).size(),
                    analise.indicador(base.comTerritorio(t.id()), av.id()), analise.serie(base.comTerritorio(t.id()))));
            for (HabilidadeRef h : habs) {
                matriz.add(new CelulaMatriz(t.id(), h.id(), calc.calcular(porTH.getOrDefault(t.id() + "|" + h.id(), List.of()))));
            }
        }
        return new Comparativo(AvRef.de(av), ts, habs, matriz);
    }

    // ------------------------------------------------------------------ util

    private Tendencia tendencia(Indicador a, Indicador b) {
        return analise.criterios().tendencia(a.temValor() ? a.percentualAcerto() : null, b.temValor() ? b.percentualAcerto() : null);
    }

    private static Map<StatusPlano, Integer> completar(Map<StatusPlano, Integer> m) {
        Map<StatusPlano, Integer> out = new EnumMap<>(StatusPlano.class);
        for (StatusPlano s : StatusPlano.values()) out.put(s, m == null ? 0 : m.getOrDefault(s, 0));
        return out;
    }

    static Double cobertura(long avaliados, long matriculados) {
        return matriculados == 0 ? null : CalculadoraIndicadores.arred(100.0 * avaliados / matriculados);
    }

    static String fmt(double v) {
        return String.format(Locale.forLanguageTag("pt-BR"), "%.1f%%", v);
    }
}
