package br.slz.conecta.estudante;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

/**
 * Reavaliações direcionadas registradas pelo docente. São outro instrumento e, por isso,
 * NÃO entram nas séries comparáveis da rede: aparecem separadas no perfil e nos planos.
 */
@Repository
public class ReavaliacaoDirecionadaRepository {
    private final JdbcTemplate jdbc;

    public ReavaliacaoDirecionadaRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record RegistroReavaliacao(String avaliacaoId, LocalDate data, String habilidadeId, int acertos, int itens,
                                      double percentual, String registradoPor) {}

    public List<RegistroReavaliacao> doEstudante(String estudanteId, Collection<String> habilidades) {
        return jdbc.query("""
                SELECT a.id, a.data_aplicacao, dh.habilidade_id, r.acertos, r.itens, u.nome
                  FROM resultado r
                  JOIN avaliacao a ON a.id = r.avaliacao_id
                  JOIN descritor_habilidade dh ON dh.descritor_id = r.descritor_id
                  LEFT JOIN usuario u ON u.id = r.registrado_por
                 WHERE r.estudante_id = ? AND a.tipo = 'REAVALIACAO_DIRECIONADA'
                 ORDER BY a.data_aplicacao, a.id""",
                (rs, i) -> new RegistroReavaliacao(rs.getString(1), rs.getDate(2).toLocalDate(), rs.getString(3),
                        rs.getInt(4), rs.getInt(5), Math.round(1000.0 * rs.getInt(4) / rs.getInt(5)) / 10.0, rs.getString(6)),
                estudanteId).stream().filter(r -> habilidades == null || habilidades.contains(r.habilidadeId())).toList();
    }

    public String inserir(String estudanteId, String turmaId, String descritorId, LocalDate data, int acertos, int itens,
                          String usuarioId, LocalDateTime agora) {
        Integer seq = jdbc.queryForObject("SELECT COUNT(*) FROM avaliacao WHERE tipo = 'REAVALIACAO_DIRECIONADA'", Integer.class);
        String id = "RD-" + String.format("%05d", (seq == null ? 0 : seq) + 1);
        jdbc.update("""
                INSERT INTO avaliacao (id, sigla, nome, tipo, data_aplicacao, ano_letivo, matriz, grupo_comparabilidade)
                VALUES (?, 'RD', 'Reavaliação direcionada (registro docente)', 'REAVALIACAO_DIRECIONADA', ?, ?, 'INSTRUMENTO-DOCENTE', NULL)""",
                id, Date.valueOf(data), data.getYear());
        jdbc.update("""
                INSERT INTO resultado (avaliacao_id, estudante_id, turma_id, descritor_id, acertos, itens, registrado_por, registrado_em)
                VALUES (?,?,?,?,?,?,?,?)""", id, estudanteId, turmaId, descritorId, acertos, itens, usuarioId, Timestamp.valueOf(agora));
        return id;
    }

    public String descritorDaHabilidade(String habilidadeId) {
        return jdbc.queryForList("SELECT descritor_id FROM descritor_habilidade WHERE habilidade_id = ? ORDER BY descritor_id",
                String.class, habilidadeId).stream().findFirst().orElse(null);
    }
}
