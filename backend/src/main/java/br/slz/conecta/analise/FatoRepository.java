package br.slz.conecta.analise;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Carrega os resultados das avaliações COMPARÁVEIS da rede como fatos analíticos.
 * Reavaliações direcionadas (registros docentes, outro instrumento) ficam fora deste conjunto
 * e são tratadas separadamente no perfil do estudante.
 */
@Repository
public class FatoRepository {
    private final JdbcTemplate jdbc;
    private volatile List<Fato> cache;

    public FatoRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Fato> todos() {
        List<Fato> local = cache;
        if (local == null) {
            synchronized (this) {
                if (cache == null) cache = carregar();
                local = cache;
            }
        }
        return local;
    }

    public synchronized void invalidar() {
        cache = null;
    }

    private List<Fato> carregar() {
        return List.copyOf(jdbc.query("""
                SELECT r.avaliacao_id, r.estudante_id, r.turma_id, t.escola_id, e.territorio_id, t.ano_escolar,
                       d.componente_id, dh.habilidade_id, r.acertos, r.itens
                  FROM resultado r
                  JOIN avaliacao a ON a.id = r.avaliacao_id
                  JOIN turma t ON t.id = r.turma_id
                  JOIN escola e ON e.id = t.escola_id
                  JOIN descritor d ON d.id = r.descritor_id
                  JOIN descritor_habilidade dh ON dh.descritor_id = r.descritor_id
                 WHERE a.grupo_comparabilidade = ?""",
                (rs, i) -> new Fato(rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5),
                        rs.getInt(6), rs.getString(7), rs.getString(8), rs.getInt(9), rs.getInt(10)),
                Catalogo.GRUPO_REDE));
    }
}
