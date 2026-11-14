package br.slz.conecta.security;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class UsuarioRepository {
    private final JdbcTemplate jdbc;

    private static final String SELECT = """
            SELECT u.id, u.email, u.nome, u.papel, u.cargo, u.escola_id, e.nome AS escola_nome,
                   e.territorio_id, u.professor_id, u.senha_hash
              FROM usuario u LEFT JOIN escola e ON e.id = u.escola_id
            """;

    private static final RowMapper<Usuario> MAPPER = (rs, i) -> new Usuario(
            rs.getString("id"), rs.getString("email"), rs.getString("nome"),
            Papel.valueOf(rs.getString("papel")), rs.getString("cargo"),
            rs.getString("escola_id"), rs.getString("escola_nome"), rs.getString("territorio_id"),
            rs.getString("professor_id"));

    public UsuarioRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<Usuario> porId(String id) {
        return jdbc.query(SELECT + " WHERE u.id = ? AND u.ativo = TRUE", MAPPER, id).stream().findFirst();
    }

    public record Credencial(Usuario usuario, String senhaHash) {}

    public Optional<Credencial> credencialPorEmail(String email) {
        return jdbc.query(SELECT + " WHERE LOWER(u.email) = LOWER(?) AND u.ativo = TRUE",
                (rs, i) -> new Credencial(MAPPER.mapRow(rs, i), rs.getString("senha_hash")), email).stream().findFirst();
    }

    public List<Usuario> perfisDestaque() {
        return jdbc.query(SELECT + " WHERE u.ativo = TRUE AND u.destaque = TRUE ORDER BY CASE u.papel WHEN 'GESTOR_REDE' THEN 0 WHEN 'COORDENADOR' THEN 1 ELSE 2 END, u.nome", MAPPER);
    }
}
