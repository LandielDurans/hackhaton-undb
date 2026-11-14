package br.slz.conecta.recomendacao;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.*;

@Repository
public class EstrategiaRepository {
    private final JdbcTemplate jdbc;
    private volatile List<Estrategia> cache;

    public record Estrategia(String id, String titulo, String tipo, String nivel, String objetivo, List<String> passos,
                             String materiais, String comoAcompanhar, String quandoReavaliar, int duracaoSemanas,
                             String perfilIndicado, List<String> habilidades) {}

    public EstrategiaRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Estrategia> todas() {
        if (cache == null) {
            Map<String, List<String>> habs = new HashMap<>();
            jdbc.query("SELECT estrategia_id, habilidade_id FROM estrategia_habilidade ORDER BY habilidade_id",
                    rs -> { habs.computeIfAbsent(rs.getString(1), k -> new ArrayList<>()).add(rs.getString(2)); });
            cache = jdbc.query("""
                    SELECT id, titulo, tipo, nivel, objetivo, como_aplicar, materiais, como_acompanhar, quando_reavaliar,
                           duracao_semanas, perfil_indicado FROM estrategia ORDER BY id""",
                    (rs, i) -> new Estrategia(rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5),
                            Arrays.stream(rs.getString(6).split("\\|")).map(String::trim).toList(), rs.getString(7), rs.getString(8),
                            rs.getString(9), rs.getInt(10), rs.getString(11), habs.getOrDefault(rs.getString(1), List.of())));
        }
        return cache;
    }

    public Optional<Estrategia> porId(String id) {
        return todas().stream().filter(e -> e.id().equals(id)).findFirst();
    }

    public List<Estrategia> paraHabilidade(String habilidadeId) {
        return todas().stream().filter(e -> e.habilidades().contains(habilidadeId)).toList();
    }
}
