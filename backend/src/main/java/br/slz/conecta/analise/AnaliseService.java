package br.slz.conecta.analise;

import br.slz.conecta.analise.Refs.AvaliacaoRef;
import br.slz.conecta.common.ConectaProperties;
import br.slz.conecta.domain.CalculadoraIndicadores;
import br.slz.conecta.domain.CriteriosPedagogicos;
import br.slz.conecta.domain.Indicador;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Cálculo de indicadores agregados a partir dos fatos. Todos os números exibidos derivam daqui. */
@Service
public class AnaliseService {
    private final FatoRepository fatos;
    private final Catalogo catalogo;
    private final CalculadoraIndicadores calc;

    public AnaliseService(FatoRepository fatos, Catalogo catalogo, ConectaProperties props) {
        this.fatos = fatos;
        this.catalogo = catalogo;
        var c = props.criterios();
        this.calc = new CalculadoraIndicadores(
                new CriteriosPedagogicos(c.adequado(), c.atencao(), c.variacaoRelevante()),
                props.privacidade().minimoAgregacao());
    }

    public CalculadoraIndicadores calculadora() {
        return calc;
    }

    public CriteriosPedagogicos criterios() {
        return calc.criterios();
    }

    public List<Fato> fatos(Filtro f, String avaliacaoId) {
        return fatos.todos().stream()
                .filter(x -> avaliacaoId == null || x.avaliacaoId().equals(avaliacaoId))
                .filter(f)
                .toList();
    }

    public Indicador indicador(Filtro f, String avaliacaoId) {
        return calc.calcular(fatos(f, avaliacaoId));
    }

    public Indicador indicadorSemSupressao(Filtro f, String avaliacaoId) {
        return calc.calcular(fatos(f, avaliacaoId), false);
    }

    /** Indicadores agrupados por uma chave (escola, território, turma, habilidade...). */
    public Map<String, Indicador> agrupar(Filtro f, String avaliacaoId, Function<Fato, String> chave) {
        Map<String, List<Fato>> grupos = fatos(f, avaliacaoId).stream()
                .collect(Collectors.groupingBy(chave, LinkedHashMap::new, Collectors.toList()));
        Map<String, Indicador> out = new LinkedHashMap<>();
        grupos.forEach((k, v) -> out.put(k, calc.calcular(v)));
        return out;
    }

    public record PontoSerie(String avaliacaoId, String sigla, String nome, String data, Indicador indicador, Double variacao) {}

    /** Série temporal nas avaliações comparáveis da rede. */
    public List<PontoSerie> serie(Filtro f) {
        List<PontoSerie> out = new ArrayList<>();
        Indicador anterior = null;
        Map<String, List<Fato>> porAv = fatos(f, null).stream().collect(Collectors.groupingBy(Fato::avaliacaoId));
        for (AvaliacaoRef av : catalogo.avaliacoesRede()) {
            Indicador ind = calc.calcular(porAv.getOrDefault(av.id(), List.of()));
            out.add(new PontoSerie(av.id(), av.sigla(), av.nome(), av.data().toString(), ind, CalculadoraIndicadores.delta(anterior, ind)));
            anterior = ind;
        }
        return out;
    }

    /** Estudantes distintos com resultado no recorte. */
    public long avaliados(Filtro f, String avaliacaoId) {
        return fatos(f, avaliacaoId).stream().map(Fato::estudanteId).distinct().count();
    }

    /** Matrículas (estudantes cadastrados) nas turmas do recorte territorial/escolar/ano. */
    public long matriculados(Filtro f) {
        return catalogo.turmas().stream()
                .filter(t -> f.turmaId() == null || t.id().equals(f.turmaId()))
                .filter(t -> f.escolaId() == null || t.escolaId().equals(f.escolaId()))
                .filter(t -> f.anoEscolar() == null || t.anoEscolar() == f.anoEscolar())
                .filter(t -> f.territorioId() == null || catalogo.escola(t.escolaId()).territorioId().equals(f.territorioId()))
                .mapToLong(Refs.TurmaRef::matriculados).sum();
    }
}
