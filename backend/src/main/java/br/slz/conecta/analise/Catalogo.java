package br.slz.conecta.analise;

import br.slz.conecta.analise.Refs.*;
import br.slz.conecta.common.ApiException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Catálogo de referência (territórios, escolas, turmas, habilidades, avaliações, vínculos docentes)
 * carregado do banco e mantido em memória. Volume pequeno; recarregado sob demanda.
 */
@Service
public class Catalogo {
    public static final String GRUPO_REDE = "REDE-2026";

    private final JdbcTemplate jdbc;
    private volatile Dados dados;

    public Catalogo(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    record Dados(
            Map<String, TerritorioRef> territorios,
            Map<String, EscolaRef> escolas,
            Map<String, TurmaRef> turmas,
            Map<String, ComponenteRef> componentes,
            Map<String, HabilidadeRef> habilidades,
            List<AvaliacaoRef> avaliacoesRede,
            Map<String, ProfessorRef> professores,
            List<Vinculo> vinculos) {}

    private Dados d() {
        Dados local = dados;
        if (local == null) {
            synchronized (this) {
                if (dados == null) dados = carregar();
                local = dados;
            }
        }
        return local;
    }

    public synchronized void recarregar() {
        dados = carregar();
    }

    private Dados carregar() {
        Map<String, TerritorioRef> territorios = new LinkedHashMap<>();
        jdbc.query("SELECT id, nome, descricao, bairros FROM territorio ORDER BY nome", rs -> {
            territorios.put(rs.getString(1), new TerritorioRef(rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4)));
        });
        Map<String, EscolaRef> escolas = new LinkedHashMap<>();
        jdbc.query("SELECT id, nome, territorio_id, bairro, lat, lng, etapas FROM escola ORDER BY nome", rs -> {
            escolas.put(rs.getString(1), new EscolaRef(rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4),
                    rs.getDouble(5), rs.getDouble(6), rs.getString(7)));
        });
        Map<String, TurmaRef> turmas = new LinkedHashMap<>();
        jdbc.query("""
                SELECT t.id, t.escola_id, t.ano_escolar, t.nome, t.turno,
                       (SELECT COUNT(*) FROM estudante s WHERE s.turma_id = t.id) AS matriculados
                  FROM turma t ORDER BY t.escola_id, t.ano_escolar, t.nome""", rs -> {
            turmas.put(rs.getString(1), new TurmaRef(rs.getString(1), rs.getString(2), rs.getInt(3), rs.getString(4),
                    rs.getString(5), rs.getInt(6)));
        });
        Map<String, ComponenteRef> componentes = new LinkedHashMap<>();
        jdbc.query("SELECT id, nome FROM componente ORDER BY id DESC", rs -> {
            componentes.put(rs.getString(1), new ComponenteRef(rs.getString(1), rs.getString(2)));
        });
        Map<String, HabilidadeRef> habilidades = new LinkedHashMap<>();
        jdbc.query("""
                SELECT id, componente_id, ano_escolar, anos_bncc, descricao, unidade_tematica, grupo, fonte
                  FROM habilidade ORDER BY ano_escolar, componente_id DESC, id""", rs -> {
            habilidades.put(rs.getString(1), new HabilidadeRef(rs.getString(1), rs.getString(2), rs.getInt(3), rs.getString(4),
                    rs.getString(5), rs.getString(6), rs.getString(7), rs.getString(8)));
        });
        List<AvaliacaoRef> avaliacoes = jdbc.query("""
                SELECT id, sigla, nome, tipo, data_aplicacao, grupo_comparabilidade FROM avaliacao
                 WHERE grupo_comparabilidade = ? ORDER BY data_aplicacao""",
                (rs, i) -> new AvaliacaoRef(rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4),
                        rs.getDate(5).toLocalDate(), rs.getString(6)), GRUPO_REDE);
        Map<String, ProfessorRef> professores = new LinkedHashMap<>();
        jdbc.query("SELECT id, nome, escola_id FROM professor ORDER BY nome", rs -> {
            professores.put(rs.getString(1), new ProfessorRef(rs.getString(1), rs.getString(2), rs.getString(3)));
        });
        List<Vinculo> vinculos = jdbc.query("SELECT professor_id, turma_id, componente_id FROM professor_turma",
                (rs, i) -> new Vinculo(rs.getString(1), rs.getString(2), rs.getString(3)));
        return new Dados(territorios, escolas, turmas, componentes, habilidades, avaliacoes, professores, vinculos);
    }

    // ---------------- consultas -----------------

    public Collection<TerritorioRef> territorios() { return d().territorios().values(); }
    public Collection<EscolaRef> escolas() { return d().escolas().values(); }
    public Collection<TurmaRef> turmas() { return d().turmas().values(); }
    public Collection<ComponenteRef> componentes() { return d().componentes().values(); }
    public Collection<HabilidadeRef> habilidades() { return d().habilidades().values(); }
    public List<AvaliacaoRef> avaliacoesRede() { return d().avaliacoesRede(); }
    public List<Vinculo> vinculos() { return d().vinculos(); }

    public TerritorioRef territorio(String id) {
        TerritorioRef t = d().territorios().get(id);
        if (t == null) throw ApiException.naoEncontrado("Território");
        return t;
    }

    public EscolaRef escola(String id) {
        EscolaRef e = d().escolas().get(id);
        if (e == null) throw ApiException.naoEncontrado("Escola");
        return e;
    }

    public TurmaRef turma(String id) {
        TurmaRef t = d().turmas().get(id);
        if (t == null) throw ApiException.naoEncontrado("Turma");
        return t;
    }

    public Optional<TurmaRef> turmaOpt(String id) { return Optional.ofNullable(d().turmas().get(id)); }

    public HabilidadeRef habilidade(String id) {
        HabilidadeRef h = d().habilidades().get(id);
        if (h == null) throw ApiException.naoEncontrado("Habilidade " + id);
        return h;
    }

    public Optional<HabilidadeRef> habilidadeOpt(String id) { return Optional.ofNullable(d().habilidades().get(id)); }

    public ComponenteRef componente(String id) {
        ComponenteRef c = d().componentes().get(id);
        if (c == null) throw ApiException.naoEncontrado("Componente");
        return c;
    }

    public ProfessorRef professor(String id) { return d().professores().get(id); }

    public AvaliacaoRef avaliacao(String id) {
        return d().avaliacoesRede().stream().filter(a -> a.id().equals(id)).findFirst()
                .orElseThrow(() -> ApiException.naoEncontrado("Avaliação"));
    }

    /** Avaliação selecionada ou, por padrão, a mais recente da rede. */
    public AvaliacaoRef avaliacaoOuAtual(String id) {
        if (id != null && !id.isBlank()) return avaliacao(id);
        List<AvaliacaoRef> l = d().avaliacoesRede();
        return l.get(l.size() - 1);
    }

    /** Avaliação imediatamente anterior no MESMO grupo de comparabilidade. */
    public Optional<AvaliacaoRef> anteriorComparavel(AvaliacaoRef av) {
        List<AvaliacaoRef> l = d().avaliacoesRede();
        AvaliacaoRef anterior = null;
        for (AvaliacaoRef a : l) {
            if (a.id().equals(av.id())) break;
            if (Objects.equals(a.grupoComparabilidade(), av.grupoComparabilidade())) anterior = a;
        }
        return Optional.ofNullable(anterior);
    }

    public List<EscolaRef> escolasDoTerritorio(String territorioId) {
        return escolas().stream().filter(e -> e.territorioId().equals(territorioId)).toList();
    }

    public List<TurmaRef> turmasDaEscola(String escolaId) {
        return turmas().stream().filter(t -> t.escolaId().equals(escolaId)).toList();
    }

    public List<HabilidadeRef> habilidadesDe(Integer ano, String componenteId) {
        return habilidades().stream()
                .filter(h -> ano == null || h.anoEscolar() == ano)
                .filter(h -> componenteId == null || h.componenteId().equals(componenteId))
                .toList();
    }

    public Set<String> turmasDoProfessor(String professorId) {
        if (professorId == null) return Set.of();
        return d().vinculos().stream().filter(v -> v.professorId().equals(professorId))
                .map(Vinculo::turmaId).collect(Collectors.toCollection(LinkedHashSet::new));
    }

    public List<ProfessorRef> professoresDaTurma(String turmaId, String componenteId) {
        return d().vinculos().stream()
                .filter(v -> v.turmaId().equals(turmaId) && (componenteId == null || v.componenteId().equals(componenteId)))
                .map(v -> d().professores().get(v.professorId()))
                .filter(Objects::nonNull).distinct().toList();
    }

    public List<ProfessorRef> professoresDaEscola(String escolaId) {
        return d().professores().values().stream().filter(p -> p.escolaId().equals(escolaId)).toList();
    }

    public Collection<ProfessorRef> professores() { return d().professores().values(); }

    public String rotuloAno(int ano) {
        return ano + "º ano";
    }
}
