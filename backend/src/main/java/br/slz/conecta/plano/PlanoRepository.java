package br.slz.conecta.plano;

import br.slz.conecta.domain.DecisaoReavaliacao;
import br.slz.conecta.domain.EscopoPlano;
import br.slz.conecta.domain.StatusPlano;
import br.slz.conecta.plano.PlanoDtos.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Repository
public class PlanoRepository {
    private final JdbcTemplate jdbc;

    public PlanoRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static final String COLS = """
            id, escopo, territorio_id, escola_id, turma_id, estudante_id, plano_pai_id, componente_id, titulo, problema,
            evidencias, objetivo, publico_alvo, estrategia, estrategia_id, formacao_id, responsavel, data_inicio, prazo,
            indicador_acompanhamento, criterio_conclusao, resultado_esperado, status, resultado_observado,
            decisao_reavaliacao, avaliacao_base_id, recomendacao_chave, criado_por, criado_em, atualizado_em, versao""";

    private static final RowMapper<PlanoRow> MAPPER = (rs, i) -> new PlanoRow(
            rs.getLong("id"), EscopoPlano.valueOf(rs.getString("escopo")), rs.getString("territorio_id"),
            rs.getString("escola_id"), rs.getString("turma_id"), rs.getString("estudante_id"),
            (Long) rs.getObject("plano_pai_id", Long.class), rs.getString("componente_id"), rs.getString("titulo"),
            rs.getString("problema"), rs.getString("evidencias"), rs.getString("objetivo"), rs.getString("publico_alvo"),
            rs.getString("estrategia"), rs.getString("estrategia_id"), rs.getString("formacao_id"), rs.getString("responsavel"),
            rs.getDate("data_inicio").toLocalDate(), rs.getDate("prazo").toLocalDate(),
            rs.getString("indicador_acompanhamento"), rs.getString("criterio_conclusao"), rs.getString("resultado_esperado"),
            StatusPlano.valueOf(rs.getString("status")), rs.getString("resultado_observado"),
            rs.getString("decisao_reavaliacao") == null ? null : DecisaoReavaliacao.valueOf(rs.getString("decisao_reavaliacao")),
            rs.getString("avaliacao_base_id"), rs.getString("recomendacao_chave"), rs.getString("criado_por"),
            rs.getTimestamp("criado_em").toLocalDateTime(), rs.getTimestamp("atualizado_em").toLocalDateTime(), rs.getInt("versao"));

    public List<PlanoRow> todos() {
        return jdbc.query("SELECT " + COLS + " FROM plano ORDER BY atualizado_em DESC, id DESC", MAPPER);
    }

    public Optional<PlanoRow> porId(long id) {
        return jdbc.query("SELECT " + COLS + " FROM plano WHERE id = ?", MAPPER, id).stream().findFirst();
    }

    public Map<Long, List<String>> habilidadesPorPlano() {
        Map<Long, List<String>> m = new HashMap<>();
        jdbc.query("SELECT plano_id, habilidade_id FROM plano_habilidade ORDER BY habilidade_id",
                rs -> { m.computeIfAbsent(rs.getLong(1), k -> new ArrayList<>()).add(rs.getString(2)); });
        return m;
    }

    public List<String> habilidades(long planoId) {
        return jdbc.queryForList("SELECT habilidade_id FROM plano_habilidade WHERE plano_id = ? ORDER BY habilidade_id", String.class, planoId);
    }

    public Map<Long, int[]> contagemAcoes() {
        Map<Long, int[]> m = new HashMap<>();
        jdbc.query("SELECT plano_id, COUNT(*), SUM(CASE WHEN status = 'CONCLUIDA' THEN 1 ELSE 0 END) FROM plano_acao GROUP BY plano_id",
                rs -> { m.put(rs.getLong(1), new int[]{rs.getInt(2), rs.getInt(3)}); });
        return m;
    }

    public long inserir(PlanoInput in, String territorioId, String escolaId, String turmaId, String estudanteId,
                        String usuarioId, LocalDateTime agora) {
        var kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement("""
                    INSERT INTO plano (escopo, territorio_id, escola_id, turma_id, estudante_id, plano_pai_id, componente_id,
                      titulo, problema, evidencias, objetivo, publico_alvo, estrategia, estrategia_id, formacao_id, responsavel,
                      data_inicio, prazo, indicador_acompanhamento, criterio_conclusao, resultado_esperado, status,
                      avaliacao_base_id, recomendacao_chave, criado_por, criado_em, atualizado_em, versao)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)""", new String[]{"id"});
            int i = 1;
            ps.setString(i++, in.escopo().name());
            ps.setString(i++, territorioId);
            ps.setString(i++, escolaId);
            ps.setString(i++, turmaId);
            ps.setString(i++, estudanteId);
            ps.setObject(i++, in.planoPaiId(), Types.BIGINT);
            ps.setString(i++, in.componenteId());
            ps.setString(i++, in.titulo().trim());
            ps.setString(i++, in.problema().trim());
            ps.setString(i++, in.evidencias().trim());
            ps.setString(i++, in.objetivo().trim());
            ps.setString(i++, in.publicoAlvo().trim());
            ps.setString(i++, in.estrategia().trim());
            ps.setString(i++, emptyToNull(in.estrategiaId()));
            ps.setString(i++, emptyToNull(in.formacaoId()));
            ps.setString(i++, in.responsavel().trim());
            ps.setDate(i++, Date.valueOf(in.dataInicio()));
            ps.setDate(i++, Date.valueOf(in.prazo()));
            ps.setString(i++, in.indicadorAcompanhamento().trim());
            ps.setString(i++, in.criterioConclusao().trim());
            ps.setString(i++, in.resultadoEsperado().trim());
            ps.setString(i++, StatusPlano.PLANEJADO.name());
            ps.setString(i++, emptyToNull(in.avaliacaoBaseId()));
            ps.setString(i++, emptyToNull(in.recomendacaoChave()));
            ps.setString(i++, usuarioId);
            ps.setTimestamp(i++, Timestamp.valueOf(agora));
            ps.setTimestamp(i, Timestamp.valueOf(agora));
            return ps;
        }, kh);
        return Objects.requireNonNull(kh.getKey()).longValue();
    }

    public int atualizar(long id, PlanoInput in, int versaoEsperada, LocalDateTime agora) {
        return jdbc.update("""
                UPDATE plano SET plano_pai_id = ?, titulo = ?, problema = ?, evidencias = ?, objetivo = ?, publico_alvo = ?,
                  estrategia = ?, estrategia_id = ?, formacao_id = ?, responsavel = ?, data_inicio = ?, prazo = ?,
                  indicador_acompanhamento = ?, criterio_conclusao = ?, resultado_esperado = ?, avaliacao_base_id = ?,
                  atualizado_em = ?, versao = versao + 1
                 WHERE id = ? AND versao = ?""",
                in.planoPaiId(), in.titulo().trim(), in.problema().trim(), in.evidencias().trim(), in.objetivo().trim(),
                in.publicoAlvo().trim(), in.estrategia().trim(), emptyToNull(in.estrategiaId()), emptyToNull(in.formacaoId()),
                in.responsavel().trim(), Date.valueOf(in.dataInicio()), Date.valueOf(in.prazo()),
                in.indicadorAcompanhamento().trim(), in.criterioConclusao().trim(), in.resultadoEsperado().trim(),
                emptyToNull(in.avaliacaoBaseId()), Timestamp.valueOf(agora), id, versaoEsperada);
    }

    public void substituirHabilidades(long planoId, Collection<String> habilidades) {
        jdbc.update("DELETE FROM plano_habilidade WHERE plano_id = ?", planoId);
        for (String h : new LinkedHashSet<>(habilidades)) {
            jdbc.update("INSERT INTO plano_habilidade (plano_id, habilidade_id) VALUES (?, ?)", planoId, h);
        }
    }

    public void atualizarStatus(long id, StatusPlano status, LocalDateTime agora) {
        jdbc.update("UPDATE plano SET status = ?, atualizado_em = ?, versao = versao + 1 WHERE id = ?",
                status.name(), Timestamp.valueOf(agora), id);
    }

    public void registrarReavaliacao(long id, String resultado, DecisaoReavaliacao decisao, LocalDateTime agora) {
        jdbc.update("""
                UPDATE plano SET status = 'REAVALIADO', resultado_observado = ?, decisao_reavaliacao = ?,
                       atualizado_em = ?, versao = versao + 1 WHERE id = ?""",
                resultado, decisao.name(), Timestamp.valueOf(agora), id);
    }

    public void tocar(long id, LocalDateTime agora) {
        jdbc.update("UPDATE plano SET atualizado_em = ? WHERE id = ?", Timestamp.valueOf(agora), id);
    }

    // ---------- ações ----------
    public List<Acao> acoes(long planoId) {
        return jdbc.query("SELECT id, descricao, responsavel, data_prevista, status, concluida_em FROM plano_acao WHERE plano_id = ? ORDER BY data_prevista, id",
                (rs, i) -> new Acao(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getDate(4).toLocalDate(),
                        rs.getString(5), rs.getDate(6) == null ? null : rs.getDate(6).toLocalDate()), planoId);
    }

    public void inserirAcao(long planoId, AcaoInput a) {
        jdbc.update("INSERT INTO plano_acao (plano_id, descricao, responsavel, data_prevista, status) VALUES (?,?,?,?, 'PENDENTE')",
                planoId, a.descricao().trim(), a.responsavel().trim(), Date.valueOf(a.dataPrevista()));
    }

    public int atualizarAcao(long planoId, long acaoId, String status, LocalDate hoje) {
        return jdbc.update("UPDATE plano_acao SET status = ?, concluida_em = ? WHERE id = ? AND plano_id = ?",
                status, "CONCLUIDA".equals(status) ? Date.valueOf(hoje) : null, acaoId, planoId);
    }

    // ---------- registros ----------
    public List<Registro> registros(long planoId) {
        return jdbc.query("""
                SELECT r.id, r.tipo, r.data, r.descricao, r.percepcao, u.nome, r.criado_em
                  FROM plano_registro r JOIN usuario u ON u.id = r.autor_id
                 WHERE r.plano_id = ? ORDER BY r.data DESC, r.id DESC""",
                (rs, i) -> new Registro(rs.getLong(1), rs.getString(2), rs.getDate(3).toLocalDate(), rs.getString(4),
                        rs.getString(5), rs.getString(6), rs.getTimestamp(7).toLocalDateTime()), planoId);
    }

    public void inserirRegistro(long planoId, String tipo, LocalDate data, String descricao, String percepcao,
                                String autorId, LocalDateTime agora) {
        jdbc.update("INSERT INTO plano_registro (plano_id, tipo, data, descricao, percepcao, autor_id, criado_em) VALUES (?,?,?,?,?,?,?)",
                planoId, tipo, Date.valueOf(data), descricao.trim(), percepcao, autorId, Timestamp.valueOf(agora));
    }

    // ---------- histórico ----------
    public List<Historico> historico(long planoId) {
        return jdbc.query("""
                SELECT h.id, h.data_hora, u.nome, h.tipo, h.status_de, h.status_para, h.justificativa, h.alteracoes
                  FROM plano_historico h JOIN usuario u ON u.id = h.usuario_id
                 WHERE h.plano_id = ? ORDER BY h.data_hora DESC, h.id DESC""",
                (rs, i) -> new Historico(rs.getLong(1), rs.getTimestamp(2).toLocalDateTime(), rs.getString(3), rs.getString(4),
                        rs.getString(5) == null ? null : StatusPlano.valueOf(rs.getString(5)),
                        rs.getString(6) == null ? null : StatusPlano.valueOf(rs.getString(6)),
                        rs.getString(7), rs.getString(8)), planoId);
    }

    public void inserirHistorico(long planoId, LocalDateTime quando, String usuarioId, String tipo,
                                 StatusPlano de, StatusPlano para, String justificativa, String alteracoes) {
        jdbc.update("""
                INSERT INTO plano_historico (plano_id, data_hora, usuario_id, tipo, status_de, status_para, justificativa, alteracoes)
                VALUES (?,?,?,?,?,?,?,?)""",
                planoId, Timestamp.valueOf(quando), usuarioId, tipo, de == null ? null : de.name(),
                para == null ? null : para.name(), justificativa, alteracoes);
    }

    public String nomeUsuario(String id) {
        return jdbc.query("SELECT nome FROM usuario WHERE id = ?", (rs, i) -> rs.getString(1), id).stream().findFirst().orElse(id);
    }

    public Optional<String> tituloFormacao(String id) {
        if (id == null) return Optional.empty();
        return jdbc.query("SELECT titulo FROM formacao WHERE id = ?", (rs, i) -> rs.getString(1), id).stream().findFirst();
    }

    public boolean existeEstrategia(String id) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM estrategia WHERE id = ?", Integer.class, id) > 0;
    }

    public boolean existeFormacao(String id) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM formacao WHERE id = ?", Integer.class, id) > 0;
    }

    private static String emptyToNull(String s) {
        return s == null || s.isBlank() ? null : s;
    }
}
