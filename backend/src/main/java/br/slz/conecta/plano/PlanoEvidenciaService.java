package br.slz.conecta.plano;

import br.slz.conecta.analise.AnaliseService;
import br.slz.conecta.analise.Catalogo;
import br.slz.conecta.analise.Filtro;
import br.slz.conecta.analise.Refs.AvaliacaoRef;
import br.slz.conecta.domain.CalculadoraIndicadores;
import br.slz.conecta.domain.EscopoPlano;
import br.slz.conecta.domain.Indicador;
import br.slz.conecta.domain.Tendencia;
import br.slz.conecta.estudante.ReavaliacaoDirecionadaRepository;
import br.slz.conecta.security.Usuario;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Evidência observada antes/depois de um plano, nas avaliações comparáveis da rede.
 * Expressa apenas associação temporal — nunca causalidade.
 */
@Service
public class PlanoEvidenciaService {
    private final PlanoService planos;
    private final PlanoRepository repo;
    private final AnaliseService analise;
    private final Catalogo catalogo;
    private final ReavaliacaoDirecionadaRepository reavaliacoes;

    public static final String AVISO = "A comparação indica associação temporal: mostra o que mudou entre avaliações comparáveis, "
            + "mas não comprova que a intervenção causou a mudança. Outros fatores (frequência, outras ações, características "
            + "das turmas) podem ter influenciado.";

    public PlanoEvidenciaService(PlanoService planos, PlanoRepository repo, AnaliseService analise, Catalogo catalogo,
                                 ReavaliacaoDirecionadaRepository reavaliacoes) {
        this.planos = planos;
        this.repo = repo;
        this.analise = analise;
        this.catalogo = catalogo;
        this.reavaliacoes = reavaliacoes;
    }

    public record Ponto(String avaliacaoId, String sigla, String data, String momento, Indicador indicador) {}

    public record SerieHabilidade(String habilidadeId, String grupo, List<Ponto> pontos) {}

    public record Evidencia(
            long planoId, String recorte, String avaliacaoBase, String avaliacaoPosterior,
            Double percentualAntes, Double percentualDepois, Double variacao, Tendencia tendencia,
            List<Ponto> combinado, List<SerieHabilidade> porHabilidade,
            List<ReavaliacaoDirecionadaRepository.RegistroReavaliacao> reavaliacoesDirecionadas,
            boolean aguardandoAvaliacao, String aviso) {}

    public Evidencia calcular(Usuario u, long planoId) {
        PlanoRow p = planos.carregarVisivel(u, planoId);
        List<String> habs = repo.habilidades(planoId);
        Filtro base = switch (p.escopo()) {
            case TERRITORIO -> Filtro.vazio().comTerritorio(p.territorioId());
            case ESCOLA -> Filtro.vazio().comEscola(p.escolaId());
            case TURMA -> Filtro.vazio().comTurma(p.turmaId());
            case ESTUDANTE -> Filtro.vazio().comEstudante(p.estudanteId());
        };
        boolean individual = p.escopo() == EscopoPlano.ESTUDANTE;
        String recorte = switch (p.escopo()) {
            case TERRITORIO -> "Escolas do território " + catalogo.territorio(p.territorioId()).nome();
            case ESCOLA -> catalogo.escola(p.escolaId()).nome();
            case TURMA -> catalogo.turma(p.turmaId()).nome() + " — " + catalogo.escola(p.escolaId()).nome();
            case ESTUDANTE -> "Estudante (dados individuais)";
        };

        // Base: avaliação informada ou a última comparável aplicada até o início do plano.
        AvaliacaoRef baseAv = null, depoisAv = null;
        for (AvaliacaoRef av : catalogo.avaliacoesRede()) {
            if (!av.data().isAfter(p.dataInicio())) baseAv = av;
        }
        if (p.avaliacaoBaseId() != null) baseAv = catalogo.avaliacaoOuAtual(p.avaliacaoBaseId());
        // Avaliação posterior: a primeira aplicada após o prazo do plano; se ainda não houver,
        // a mais recente aplicada após o início (resultado parcial, durante a execução).
        for (AvaliacaoRef av : catalogo.avaliacoesRede()) {
            if (av.data().isAfter(p.prazo())) { depoisAv = av; break; }
        }
        if (depoisAv == null) {
            for (AvaliacaoRef av : catalogo.avaliacoesRede()) if (av.data().isAfter(p.dataInicio())) depoisAv = av;
        }

        List<Ponto> combinado = new ArrayList<>();
        List<SerieHabilidade> porHab = new ArrayList<>();
        Indicador antes = null, depois = null;
        for (AvaliacaoRef av : catalogo.avaliacoesRede()) {
            var fatos = analise.fatos(base, av.id()).stream().filter(f -> habs.contains(f.habilidadeId())).toList();
            Indicador ind = analise.calculadora().calcular(fatos, !individual);
            String momento = momento(av, baseAv, depoisAv, p);
            combinado.add(new Ponto(av.id(), av.sigla(), av.data().toString(), momento, ind));
            if (baseAv != null && av.id().equals(baseAv.id())) antes = ind;
            if (depoisAv != null && av.id().equals(depoisAv.id())) depois = ind;
        }
        for (String h : habs) {
            List<Ponto> pts = new ArrayList<>();
            for (AvaliacaoRef av : catalogo.avaliacoesRede()) {
                Indicador ind = analise.calculadora().calcular(analise.fatos(base.comHabilidade(h), av.id()), !individual);
                pts.add(new Ponto(av.id(), av.sigla(), av.data().toString(), momento(av, baseAv, depoisAv, p), ind));
            }
            porHab.add(new SerieHabilidade(h, catalogo.habilidade(h).grupo(), pts));
        }
        Double delta = CalculadoraIndicadores.delta(antes, depois);
        Tendencia t = analise.criterios().tendencia(
                antes != null && antes.temValor() ? antes.percentualAcerto() : null,
                depois != null && depois.temValor() ? depois.percentualAcerto() : null);
        return new Evidencia(planoId, recorte,
                baseAv == null ? null : baseAv.sigla(), depoisAv == null ? null : depoisAv.sigla(),
                antes != null && antes.temValor() ? antes.percentualAcerto() : null,
                depois != null && depois.temValor() ? depois.percentualAcerto() : null,
                delta, t, combinado, porHab,
                individual ? reavaliacoes.doEstudante(p.estudanteId(), habs) : List.of(),
                depoisAv == null, AVISO);
    }

    private static String momento(AvaliacaoRef av, AvaliacaoRef base, AvaliacaoRef depois, PlanoRow p) {
        if (base != null && av.id().equals(base.id())) return "BASE";
        if (depois != null && av.id().equals(depois.id())) return "POSTERIOR";
        return av.data().isAfter(p.dataInicio()) ? "DURANTE" : "ANTERIOR";
    }
}
