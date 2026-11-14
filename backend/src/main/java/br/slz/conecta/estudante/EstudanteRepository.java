package br.slz.conecta.estudante;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class EstudanteRepository {
    private final JdbcTemplate jdbc;

    public record EstudanteRow(String id, String codigo, String nome, String turmaId) {}

    private static final RowMapper<EstudanteRow> MAPPER =
            (rs, i) -> new EstudanteRow(rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4));

    public EstudanteRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<EstudanteRow> porId(String id) {
        return jdbc.query("SELECT id, codigo, nome, turma_id FROM estudante WHERE id = ?", MAPPER, id).stream().findFirst();
    }

    public List<EstudanteRow> daTurma(String turmaId) {
        return jdbc.query("SELECT id, codigo, nome, turma_id FROM estudante WHERE turma_id = ? ORDER BY nome", MAPPER, turmaId);
    }
}
