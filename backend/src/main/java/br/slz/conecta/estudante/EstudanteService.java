package br.slz.conecta.estudante;

import br.slz.conecta.analise.AnaliseService;
import br.slz.conecta.analise.Catalogo;
import br.slz.conecta.analise.Fato;
import br.slz.conecta.analise.FatoRepository;
import br.slz.conecta.analise.Filtro;
import br.slz.conecta.analise.Refs.*;
import br.slz.conecta.common.ApiException;
import br.slz.conecta.common.Datas;
import br.slz.conecta.domain.*;
import br.slz.conecta.plano.PlanoDtos.PlanoResumo;
import br.slz.conecta.plano.PlanoRepository;
import br.slz.conecta.plano.PlanoService;
import br.slz.conecta.recomendacao.RecomendacaoService;
import br.slz.conecta.security.AccessPolicy;
import br.slz.conecta.security.Usuario;
import jakarta.validation.constraints.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/** Inteligência individual: perfil pedagógico, mapa de habilidades, evolução e reavaliações direcionadas. */
@Service
public class EstudanteService {
    private final AccessPolicy acesso;
    private final AnaliseService analise;
    private final Catalogo catalogo;
    private final PlanoService planos;
    private final PlanoRepository planoRepo;
    private final ReavaliacaoDirecionadaRepository reavaliacoes;
    private final RecomendacaoService recomendacoes;
    private final EstudanteRepository estudantes;
    private final FatoRepository fatoRepo;
    private final Datas datas;

    public EstudanteService(AccessPolicy acesso, AnaliseService analise, Catalogo catalogo, PlanoService planos,
                            PlanoRepository planoRepo, ReavaliacaoDirecionadaRepository reavaliacoes,
                            RecomendacaoService recomendacoes, EstudanteRepository estudantes, FatoRepository fatoRepo, Datas datas) {
        this.acesso = acesso;
        this.analise = analise;
        this.catalogo = catalogo;
        this.planos = planos;
        this.planoRepo = planoRepo;
        this.reavaliacoes = reavaliacoes;
        this.recomendacoes = recomendacoes;
        this.estudantes = estudantes;
        this.fatoRepo = fatoRepo;
        this.datas = datas;
    }

    public record Resultado(String avaliacaoId, String sigla, String data, Integer acertos, Integer itens, Double percentual,
                            NivelDesempenho nivel) {}

    public record AvaliacaoEstudante(String id, String sigla, String nome, String data, boolean avaliado,
                                     Map<String, Resultado> porComponente) {}

    public record HabilidadeEstudante(HabilidadeRef habilidade, List<Resultado> resultados, NivelDesempenho nivelAtual,
                                      Double variacao, Tendencia tendencia, Double percentualTurma,
                                      List<ReavaliacaoDirecionadaRepository.RegistroReavaliacao> reavaliacoesDirecionadas,
                                      List<Long> planos) {}

    public record Perfil(EstudanteRepository.EstudanteRow estudante, TurmaRef turma, EscolaRef escola, List<String> professores,
                         List<AvaliacaoEstudante> avaliacoes, List<HabilidadeEstudante> habilidades,
                         Map<NivelDesempenho, Integer> resumoAtual, List<PlanoResumo> planos, List<PlanoResumo> intervencoesAnteriores,
                         Map<String, Object> criterios, String notaEtica) {}

    public Perfil perfil(Usuario u, String estudanteId) {
        var est = acesso.exigirEstudante(u, estudanteId, "VER_PERFIL_ESTUDANTE");
        TurmaRef t = catalogo.turma(est.turmaId());
        EscolaRef e = catalogo.escola(t.escolaId());
        var calc = analise.calculadora();
        var crit = analise.criterios();
        List<Fato> fatos = analise.fatos(Filtro.vazio().comEstudante(estudanteId), null);
        List<AvaliacaoRef> avs = catalogo.avaliacoesRede();
        AvaliacaoRef atual = avs.get(avs.size() - 1);

        List<AvaliacaoEstudante> avaliacoes = new ArrayList<>();
        for (AvaliacaoRef a : avs) {
            Map<String, Resultado> porComp = new LinkedHashMap<>();
            for (ComponenteRef c : catalogo.componentes()) {
                List<Fato> fc = fatos.stream().filter(f -> f.avaliacaoId().equals(a.id()) && f.componenteId().equals(c.id())).toList();
                if (fc.isEmpty()) continue;
                int ac = fc.stream().mapToInt(Fato::acertos).sum(), it = fc.stream().mapToInt(Fato::itens).sum();
                double p = CalculadoraIndicadores.arred(100.0 * ac / it);
                porComp.put(c.id(), new Resultado(a.id(), a.sigla(), a.data().toString(), ac, it, p, crit.classificar(p)));
            }
            avaliacoes.add(new AvaliacaoEstudante(a.id(), a.sigla(), a.nome(), a.data().toString(), !porComp.isEmpty(), porComp));
        }

        List<br.slz.conecta.plano.PlanoRow> rows = planos.todosRows().stream().filter(p -> estudanteId.equals(p.estudanteId())).toList();
        Map<Long, List<String>> habsPlano = planoRepo.habilidadesPorPlano();
        Map<String, List<Fato>> turmaAtual = analise.fatos(Filtro.vazio().comTurma(t.id()), atual.id()).stream()
                .collect(Collectors.groupingBy(Fato::habilidadeId));
        List<HabilidadeEstudante> habs = new ArrayList<>();
        Map<NivelDesempenho, Integer> resumo = new EnumMap<>(NivelDesempenho.class);
        for (NivelDesempenho n : NivelDesempenho.values()) resumo.put(n, 0);
        for (HabilidadeRef h : catalogo.habilidadesDe(t.anoEscolar(), null)) {
            List<Resultado> res = new ArrayList<>();
            for (AvaliacaoRef a : avs) {
                Optional<Fato> f = fatos.stream().filter(x -> x.avaliacaoId().equals(a.id()) && x.habilidadeId().equals(h.id())).findFirst();
                if (f.isPresent()) {
                    double p = CalculadoraIndicadores.arred(100.0 * f.get().acertos() / f.get().itens());
                    res.add(new Resultado(a.id(), a.sigla(), a.data().toString(), f.get().acertos(), f.get().itens(), p, crit.classificar(p)));
                } else {
                    res.add(new Resultado(a.id(), a.sigla(), a.data().toString(), null, null, null, null));
                }
            }
            List<Resultado> comValor = res.stream().filter(r -> r.percentual() != null).toList();
            Resultado ult = comValor.isEmpty() ? null : comValor.get(comValor.size() - 1);
            Resultado penult = comValor.size() < 2 ? null : comValor.get(comValor.size() - 2);
            if (ult != null && ult.avaliacaoId().equals(atual.id())) resumo.merge(ult.nivel(), 1, Integer::sum);
            Indicador it = calc.calcular(turmaAtual.getOrDefault(h.id(), List.of()));
            // Só se compara com a avaliação comparável imediatamente anterior
            Double delta = null;
            Tendencia tend = Tendencia.SEM_COMPARACAO;
            if (ult != null && penult != null && catalogo.anteriorComparavel(catalogo.avaliacao(ult.avaliacaoId()))
                    .map(a -> a.id().equals(penult.avaliacaoId())).orElse(false)) {
                delta = CalculadoraIndicadores.arred(ult.percentual() - penult.percentual());
                tend = crit.tendencia(penult.percentual(), ult.percentual());
            }
            habs.add(new HabilidadeEstudante(h, res, ult == null ? null : ult.nivel(), delta, tend,
                    it.temValor() ? it.percentualAcerto() : null,
                    reavaliacoes.doEstudante(estudanteId, List.of(h.id())),
                    rows.stream().filter(p -> habsPlano.getOrDefault(p.id(), List.of()).contains(h.id())).map(br.slz.conecta.plano.PlanoRow::id).toList()));
        }

        List<PlanoResumo> lista = planos.listar(u, new PlanoService.FiltroPlanos(null, null, null, null, null, estudanteId, null, null, null));
        return new Perfil(est, t, e, catalogo.professoresDaTurma(t.id(), null).stream().map(ProfessorRef::nome).toList(),
                avaliacoes, habs, resumo,
                lista.stream().filter(p -> p.status().ativo()).toList(),
                lista.stream().filter(p -> !p.status().ativo()).toList(),
                Map.of("adequado", crit.adequado(), "atencao", crit.atencao()),
                "As faixas descrevem resultados em avaliações específicas e mudam com a aprendizagem. Não são rótulos do "
                        + "estudante nem indicam capacidade intelectual, deficiência ou qualquer condição clínica.");
    }

    public record ReavaliacaoInput(@NotBlank String habilidadeId, @NotNull LocalDate data,
                                   @NotNull @Min(0) Integer acertos, @NotNull @Min(1) @Max(50) Integer itens,
                                   Long planoId, @Size(max = 600) String observacao) {}

    @Transactional
    public Map<String, Object> registrarReavaliacao(Usuario u, String estudanteId, ReavaliacaoInput in) {
        if (u.gestor()) throw ApiException.proibido("Reavaliações direcionadas são registradas pela escola.");
        var est = acesso.exigirEstudante(u, estudanteId, "REGISTRAR_REAVALIACAO");
        TurmaRef t = catalogo.turma(est.turmaId());
        HabilidadeRef h = catalogo.habilidadeOpt(in.habilidadeId()).orElseThrow(() -> ApiException.invalido("Habilidade inválida."));
        if (h.anoEscolar() != t.anoEscolar()) throw ApiException.invalido("A habilidade não corresponde ao ano escolar do estudante.");
        if (in.acertos() > in.itens()) throw ApiException.invalido("O número de acertos não pode ser maior que o de itens.");
        if (in.data().isAfter(datas.hoje())) throw ApiException.invalido("A data não pode estar no futuro.");
        String desc = reavaliacoes.descritorDaHabilidade(h.id());
        if (desc == null) throw ApiException.invalido("Não há descritor mapeado para esta habilidade.");
        String avId = reavaliacoes.inserir(estudanteId, t.id(), desc, in.data(), in.acertos(), in.itens(), u.id(), datas.agora());
        if (in.planoId() != null) {
            var plano = planoRepo.porId(in.planoId()).orElseThrow(() -> ApiException.invalido("Plano não encontrado."));
            if (!estudanteId.equals(plano.estudanteId())) throw ApiException.invalido("O plano informado não é deste estudante.");
            double pct = Math.round(1000.0 * in.acertos() / in.itens()) / 10.0;
            planoRepo.inserirRegistro(in.planoId(), "ACOMPANHAMENTO", in.data(),
                    "Reavaliação direcionada em " + h.id() + ": " + in.acertos() + " de " + in.itens() + " itens (" + pct + "%)."
                            + (in.observacao() == null || in.observacao().isBlank() ? "" : " " + in.observacao().trim()),
                    pct >= analise.criterios().adequado() ? "AVANCO" : pct >= analise.criterios().atencao() ? "ESTAVEL" : "DIFICULDADE",
                    u.id(), datas.agora());
            planoRepo.tocar(in.planoId(), datas.agora());
        }
        fatoRepo.invalidar();
        return Map.of("avaliacaoId", avId, "mensagem", "Reavaliação direcionada registrada. Ela é exibida separadamente, pois usa outro instrumento.");
    }

    // ---------- assistente: visão da turma ----------

    public record AlunoAssistente(String id, String nome, String codigo, int alta, int media, int baixa, List<String> habilidades,
                                  int planosAtivos) {}

    public List<AlunoAssistente> assistenteTurma(Usuario u, String turmaId, String componenteId) {
        acesso.exigirTurma(u, turmaId);
        if (!acesso.podeVerIndividuaisDaTurma(u, turmaId)) {
            acesso.negar(u, "TURMA", turmaId, "O assistente individual é restrito à escola e ao professor responsável.");
        }
        List<AlunoAssistente> out = new ArrayList<>();
        for (var est : estudantes.daTurma(turmaId)) {
            var recs = recomendacoes.individuais(est.id(), turmaId, componenteId);
            int a = 0, m = 0, b = 0;
            for (var r : recs) switch (r.prioridade()) { case ALTA -> a++; case MEDIA -> m++; default -> b++; }
            long ativos = planos.todosRows().stream().filter(p -> est.id().equals(p.estudanteId()) && p.status().ativo()).count();
            out.add(new AlunoAssistente(est.id(), est.nome(), est.codigo(), a, m, b,
                    recs.stream().map(r -> r.habilidades().get(0)).toList(), (int) ativos));
        }
        out.sort(Comparator.comparingInt(AlunoAssistente::alta).reversed().thenComparing(Comparator.comparingInt(AlunoAssistente::media).reversed())
                .thenComparing(AlunoAssistente::nome));
        return out;
    }
}
