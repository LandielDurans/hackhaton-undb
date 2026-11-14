package br.slz.conecta.formacao;

import br.slz.conecta.analise.AnaliseService;
import br.slz.conecta.analise.Catalogo;
import br.slz.conecta.analise.Fato;
import br.slz.conecta.analise.Filtro;
import br.slz.conecta.analise.Refs.*;
import br.slz.conecta.auditoria.AuditoriaService;
import br.slz.conecta.common.ApiException;
import br.slz.conecta.common.Datas;
import br.slz.conecta.domain.Indicador;
import br.slz.conecta.formacao.FormacaoRepository.Formacao;
import br.slz.conecta.formacao.FormacaoRepository.Participacao;
import br.slz.conecta.security.Usuario;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Formação continuada conectada aos diagnósticos.
 * Demanda de formação = professor que atua em turma cujo resultado na habilidade está abaixo do limiar de atenção
 * e que ainda não concluiu formação relacionada. Trata-se de oferta de apoio profissional — NÃO é avaliação docente.
 */
@Service
public class FormacaoService {
    public static final String NOTA = "A demanda indica professores que atuam em turmas com resultado abaixo do limiar de atenção "
            + "em uma habilidade e que não concluíram nem estão cursando formação relacionada. É um instrumento para planejar apoio "
            + "profissional; os resultados dos estudantes não são usados para avaliar professores.";

    private final FormacaoRepository repo;
    private final AnaliseService analise;
    private final Catalogo catalogo;
    private final Datas datas;
    private final AuditoriaService auditoria;

    public FormacaoService(FormacaoRepository repo, AnaliseService analise, Catalogo catalogo, Datas datas, AuditoriaService auditoria) {
        this.repo = repo;
        this.analise = analise;
        this.catalogo = catalogo;
        this.datas = datas;
        this.auditoria = auditoria;
    }

    /** Uma necessidade identificada: turma × habilidade abaixo do limiar, com o(s) professor(es) do componente. */
    public record Necessidade(String territorioId, String escolaId, String turmaId, int anoEscolar, String habilidadeId,
                              String componenteId, double percentual, List<String> professoresSemFormacao,
                              List<String> professoresEmFormacao, List<String> professoresComFormacao, List<String> formacoes) {}

    public List<Necessidade> necessidades(Filtro escopo, String avaliacaoId) {
        AvaliacaoRef av = catalogo.avaliacaoOuAtual(avaliacaoId);
        var calc = analise.calculadora();
        double limiar = analise.criterios().atencao();
        List<Formacao> forms = repo.todas();
        Map<String, Set<String>> concluidasPorProfessor = new HashMap<>(), inscricoesPorProfessor = new HashMap<>();
        for (Participacao p : repo.participacoes()) {
            if ("CONCLUIDO".equals(p.status())) concluidasPorProfessor.computeIfAbsent(p.professorId(), k -> new HashSet<>()).add(p.formacaoId());
            else inscricoesPorProfessor.computeIfAbsent(p.professorId(), k -> new HashSet<>()).add(p.formacaoId());
        }
        Set<String> formacoesAbertas = forms.stream().filter(f -> !"CONCLUIDA".equals(f.status())).map(Formacao::id).collect(Collectors.toSet());
        Map<String, List<Fato>> porTurmaHab = analise.fatos(escopo, av.id()).stream()
                .collect(Collectors.groupingBy(f -> f.turmaId() + "|" + f.habilidadeId(), LinkedHashMap::new, Collectors.toList()));
        List<Necessidade> out = new ArrayList<>();
        porTurmaHab.forEach((k, fatos) -> {
            Indicador ind = calc.calcular(fatos);
            if (!ind.temValor() || ind.percentualAcerto() >= limiar) return;
            Fato f0 = fatos.get(0);
            List<String> formsHab = forms.stream().filter(f -> f.habilidades().contains(f0.habilidadeId())).map(Formacao::id).toList();
            List<String> sem = new ArrayList<>(), em = new ArrayList<>(), com = new ArrayList<>();
            for (ProfessorRef p : catalogo.professoresDaTurma(f0.turmaId(), f0.componenteId())) {
                Set<String> concl = concluidasPorProfessor.getOrDefault(p.id(), Set.of());
                Set<String> insc = inscricoesPorProfessor.getOrDefault(p.id(), Set.of());
                if (formsHab.stream().anyMatch(concl::contains)) com.add(p.id());
                else if (formsHab.stream().anyMatch(f -> insc.contains(f) && formacoesAbertas.contains(f))) em.add(p.id());
                else sem.add(p.id());
            }
            out.add(new Necessidade(f0.territorioId(), f0.escolaId(), f0.turmaId(), f0.anoEscolar(), f0.habilidadeId(),
                    f0.componenteId(), ind.percentualAcerto(), sem, em, com, formsHab));
        });
        return out;
    }

    // ---------------- catálogo ----------------

    public record HabRef(String id, String grupo, int anoEscolar, String componenteId) {}

    public record ParticipacaoView(long id, String formacaoId, String formacaoTitulo, String professorId, String professorNome,
                                   String escolaId, String escolaNome, String status, Boolean aplicouEstrategia,
                                   String registroAplicacao, String atualizadoEm) {}

    public record FormacaoView(String id, String titulo, String descricao, String objetivos, String modalidade, int cargaHoraria,
                               String publico, String dataInicio, String dataFim, int vagas, String status, List<HabRef> habilidades,
                               int inscritos, int concluidos, int aplicaram, Double taxaAplicacao, int professoresComDemanda,
                               int escolasComDemanda, ParticipacaoView minhaParticipacao, boolean recomendadaParaMim) {}

    public List<FormacaoView> catalogo(Usuario u) {
        List<Participacao> parts = repo.participacoes();
        List<Necessidade> nec = necessidades(Filtro.vazio(), null);
        Set<String> minhasNecessidadesHab = u.professorId() == null ? Set.of() : nec.stream()
                .filter(n -> n.professoresSemFormacao().contains(u.professorId())).map(Necessidade::habilidadeId).collect(Collectors.toSet());
        return repo.todas().stream().map(f -> {
            List<Participacao> pf = parts.stream().filter(p -> p.formacaoId().equals(f.id())).toList();
            int concl = (int) pf.stream().filter(p -> "CONCLUIDO".equals(p.status())).count();
            int apl = (int) pf.stream().filter(p -> Boolean.TRUE.equals(p.aplicouEstrategia())).count();
            Set<String> profs = new HashSet<>(), escolas = new HashSet<>();
            nec.stream().filter(n -> n.formacoes().contains(f.id())).forEach(n -> {
                profs.addAll(n.professoresSemFormacao());
                if (!n.professoresSemFormacao().isEmpty()) escolas.add(n.escolaId());
            });
            ParticipacaoView minha = u.professorId() == null ? null : pf.stream()
                    .filter(p -> p.professorId().equals(u.professorId())).findFirst().map(this::view).orElse(null);
            return new FormacaoView(f.id(), f.titulo(), f.descricao(), f.objetivos(), f.modalidade(), f.cargaHoraria(), f.publico(),
                    f.dataInicio().toString(), f.dataFim().toString(), f.vagas(), f.status(),
                    f.habilidades().stream().map(catalogo::habilidade).map(h -> new HabRef(h.id(), h.grupo(), h.anoEscolar(), h.componenteId())).toList(),
                    pf.size(), concl, apl, concl == 0 ? null : Math.round(1000.0 * apl / concl) / 10.0,
                    profs.size(), escolas.size(), minha, !Collections.disjoint(minhasNecessidadesHab, f.habilidades()));
        }).toList();
    }

    // ---------------- demandas ----------------

    public record DemandaHabilidade(String habilidadeId, String grupo, int anoEscolar, String componenteId, int turmas,
                                    int professoresSemFormacao, int professoresEmFormacao, int professoresComFormacao,
                                    List<String> formacoes) {}

    public record DemandaRecorte(String id, String nome, int escolas, int turmas, int professoresSemFormacao,
                                 int professoresEmFormacao, List<DemandaHabilidade> habilidades) {}

    public record DemandaFormacao(String formacaoId, String titulo, String status, int professoresSemFormacao,
                                  int professoresEmFormacao, int escolas, int territorios, int jaConcluiram) {}

    public record Demandas(List<DemandaRecorte> porTerritorio, List<DemandaRecorte> porEscola, List<DemandaFormacao> porFormacao,
                           List<DemandaHabilidade> lacunas, String avaliacao, String nota) {}

    public Demandas demandas(Usuario u, String territorioId, Integer ano, String componenteId, String avaliacaoId) {
        Filtro f = Filtro.de(territorioId, null, ano, componenteId, null);
        if (!u.gestor()) f = f.comEscola(u.escolaId());
        List<Necessidade> nec = necessidades(f, avaliacaoId);
        if (u.professor()) {
            Set<String> minhas = catalogo.turmasDoProfessor(u.professorId());
            nec = nec.stream().filter(n -> minhas.contains(n.turmaId())).toList();
        }
        List<DemandaRecorte> porTer = new ArrayList<>();
        if (u.gestor()) {
            for (TerritorioRef t : catalogo.territorios()) {
                List<Necessidade> nt = nec.stream().filter(n -> n.territorioId().equals(t.id())).toList();
                if (!nt.isEmpty()) porTer.add(recorte(t.id(), t.nome(), nt));
            }
        }
        List<DemandaRecorte> porEsc = new ArrayList<>();
        for (EscolaRef e : catalogo.escolas()) {
            List<Necessidade> ne = nec.stream().filter(n -> n.escolaId().equals(e.id())).toList();
            if (!ne.isEmpty()) porEsc.add(recorte(e.id(), e.nome(), ne));
        }
        List<Participacao> parts = repo.participacoes();
        List<DemandaFormacao> porForm = new ArrayList<>();
        for (Formacao fo : repo.todas()) {
            List<Necessidade> nf = nec.stream().filter(n -> n.formacoes().contains(fo.id())).toList();
            Set<String> profs = nf.stream().flatMap(n -> n.professoresSemFormacao().stream()).collect(Collectors.toSet());
            Set<String> esc = nf.stream().filter(n -> !n.professoresSemFormacao().isEmpty()).map(Necessidade::escolaId).collect(Collectors.toSet());
            Set<String> ter = nf.stream().filter(n -> !n.professoresSemFormacao().isEmpty()).map(Necessidade::territorioId).collect(Collectors.toSet());
            Set<String> emForm = nf.stream().flatMap(n -> n.professoresEmFormacao().stream()).collect(Collectors.toSet());
            int concl = (int) parts.stream().filter(p -> p.formacaoId().equals(fo.id()) && "CONCLUIDO".equals(p.status())).count();
            if (!nf.isEmpty()) porForm.add(new DemandaFormacao(fo.id(), fo.titulo(), fo.status(), profs.size(), emForm.size(), esc.size(), ter.size(), concl));
        }
        porForm.sort(Comparator.comparingInt(DemandaFormacao::professoresSemFormacao).reversed());
        List<DemandaHabilidade> lacunas = agruparHabilidades(nec.stream().filter(n -> n.formacoes().isEmpty()).toList());
        return new Demandas(porTer, porEsc, porForm, lacunas, catalogo.avaliacaoOuAtual(avaliacaoId).sigla(), NOTA);
    }

    private DemandaRecorte recorte(String id, String nome, List<Necessidade> ns) {
        return new DemandaRecorte(id, nome,
                (int) ns.stream().map(Necessidade::escolaId).distinct().count(),
                (int) ns.stream().map(Necessidade::turmaId).distinct().count(),
                (int) ns.stream().flatMap(n -> n.professoresSemFormacao().stream()).distinct().count(),
                (int) ns.stream().flatMap(n -> n.professoresEmFormacao().stream()).distinct().count(),
                agruparHabilidades(ns));
    }

    private List<DemandaHabilidade> agruparHabilidades(List<Necessidade> ns) {
        Map<String, List<Necessidade>> porHab = ns.stream().collect(Collectors.groupingBy(Necessidade::habilidadeId, LinkedHashMap::new, Collectors.toList()));
        List<DemandaHabilidade> out = new ArrayList<>();
        porHab.forEach((h, l) -> {
            HabilidadeRef hr = catalogo.habilidade(h);
            out.add(new DemandaHabilidade(h, hr.grupo(), hr.anoEscolar(), hr.componenteId(),
                    (int) l.stream().map(Necessidade::turmaId).distinct().count(),
                    (int) l.stream().flatMap(n -> n.professoresSemFormacao().stream()).distinct().count(),
                    (int) l.stream().flatMap(n -> n.professoresEmFormacao().stream()).distinct().count(),
                    (int) l.stream().flatMap(n -> n.professoresComFormacao().stream()).distinct().count(),
                    l.get(0).formacoes()));
        });
        out.sort(Comparator.comparingInt(DemandaHabilidade::turmas).reversed().thenComparing(DemandaHabilidade::habilidadeId));
        return out;
    }

    /** Professores com demanda por escola (apenas contagem), usado na camada de formação do mapa. */
    public Map<String, Integer> demandaPorEscola(Filtro f, String avaliacaoId) {
        Map<String, Set<String>> m = new HashMap<>();
        for (Necessidade n : necessidades(f, avaliacaoId)) {
            m.computeIfAbsent(n.escolaId(), k -> new HashSet<>()).addAll(n.professoresSemFormacao());
        }
        Map<String, Integer> out = new HashMap<>();
        m.forEach((k, v) -> out.put(k, v.size()));
        return out;
    }

    public Map<String, int[]> participacoesPorEscola() {
        Map<String, int[]> m = new HashMap<>();
        for (Participacao p : repo.participacoes()) {
            ProfessorRef pr = catalogo.professor(p.professorId());
            if (pr == null) continue;
            int[] acc = m.computeIfAbsent(pr.escolaId(), k -> new int[3]);
            acc[0]++;
            if ("CONCLUIDO".equals(p.status())) acc[1]++;
            if (Boolean.TRUE.equals(p.aplicouEstrategia())) acc[2]++;
        }
        return m;
    }

    // ---------------- participações ----------------

    public List<ParticipacaoView> participacoes(Usuario u, String escolaId) {
        return repo.participacoes().stream().map(this::view)
                .filter(p -> switch (u.papel()) {
                    case GESTOR_REDE -> escolaId == null || escolaId.equals(p.escolaId());
                    case COORDENADOR -> u.escolaId().equals(p.escolaId());
                    case PROFESSOR -> p.professorId().equals(u.professorId());
                })
                .toList();
    }

    @Transactional
    public ParticipacaoView inscrever(Usuario u, String formacaoId) {
        if (!u.professor()) throw ApiException.proibido("A inscrição é feita pelo próprio professor.");
        Formacao f = repo.porId(formacaoId).orElseThrow(() -> ApiException.naoEncontrado("Formação"));
        if ("CONCLUIDA".equals(f.status())) throw ApiException.invalido("Esta formação já foi concluída.");
        if (repo.participacoes().stream().anyMatch(p -> p.formacaoId().equals(formacaoId) && p.professorId().equals(u.professorId()))) {
            throw ApiException.conflito("Você já está inscrito(a) nesta formação.");
        }
        long ocupadas = repo.participacoes().stream().filter(p -> p.formacaoId().equals(formacaoId)).count();
        if (ocupadas >= f.vagas()) throw ApiException.conflito("Não há vagas disponíveis.");
        repo.inscrever(formacaoId, u.professorId(), datas.agora());
        auditoria.registrar(u, "INSCRICAO_FORMACAO", "FORMACAO", formacaoId, true, null);
        return repo.participacoes().stream().filter(p -> p.formacaoId().equals(formacaoId) && p.professorId().equals(u.professorId()))
                .findFirst().map(this::view).orElseThrow();
    }

    public record AtualizacaoParticipacao(String status, Boolean aplicouEstrategia, String registroAplicacao) {}

    @Transactional
    public ParticipacaoView atualizar(Usuario u, long id, AtualizacaoParticipacao in) {
        Participacao p = repo.participacao(id).orElseThrow(() -> ApiException.naoEncontrado("Participação"));
        if (!u.professor() || !p.professorId().equals(u.professorId())) {
            throw ApiException.proibido("Somente o(a) próprio(a) professor(a) registra sua participação e aplicação.");
        }
        String status = in.status() == null ? p.status() : in.status();
        if (!Set.of("INSCRITO", "CONCLUIDO").contains(status)) throw ApiException.invalido("Situação inválida.");
        if (in.aplicouEstrategia() != null && !"CONCLUIDO".equals(status)) {
            throw ApiException.invalido("A aplicação das estratégias é registrada após a conclusão da formação.");
        }
        String registro = in.registroAplicacao() == null ? p.registroAplicacao() : in.registroAplicacao().trim();
        if (registro != null && registro.length() > 1000) throw ApiException.invalido("Registro muito longo (máx. 1000 caracteres).");
        repo.atualizarParticipacao(id, status, in.aplicouEstrategia() == null ? p.aplicouEstrategia() : in.aplicouEstrategia(), registro, datas.agora());
        return view(repo.participacao(id).orElseThrow());
    }

    private ParticipacaoView view(Participacao p) {
        ProfessorRef pr = catalogo.professor(p.professorId());
        String escolaId = pr == null ? null : pr.escolaId();
        return new ParticipacaoView(p.id(), p.formacaoId(), repo.porId(p.formacaoId()).map(Formacao::titulo).orElse(p.formacaoId()),
                p.professorId(), pr == null ? p.professorId() : pr.nome(), escolaId,
                escolaId == null ? null : catalogo.escola(escolaId).nome(), p.status(), p.aplicouEstrategia(),
                p.registroAplicacao(), p.atualizadoEm().toString());
    }
}
