package br.slz.conecta.recomendacao;

import br.slz.conecta.common.Datas;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/** Validação humana das recomendações: aceitas (viraram plano) ou descartadas com justificativa. */
@Repository
public class DecisaoRepository {
    private final JdbcTemplate jdbc;
    private final Datas datas;

    public record Decisao(String chave, String decisao, String justificativa, Long planoId, String usuario, LocalDateTime dataHora) {}

    public DecisaoRepository(JdbcTemplate jdbc, Datas datas) {
        this.jdbc = jdbc;
        this.datas = datas;
    }

    public void registrar(String chave, String decisao, String justificativa, Long planoId, String usuarioId) {
        jdbc.update("INSERT INTO recomendacao_decisao (chave, decisao, justificativa, plano_id, usuario_id, data_hora) VALUES (?,?,?,?,?,?)",
                chave, decisao, justificativa, planoId, usuarioId, Timestamp.valueOf(datas.agora()));
    }

    /** Última decisão por chave. */
    public Map<String, Decisao> ultimas(Set<String> chaves) {
        Map<String, Decisao> m = new HashMap<>();
        if (chaves.isEmpty()) return m;
        jdbc.query("""
                SELECT d.chave, d.decisao, d.justificativa, d.plano_id, u.nome, d.data_hora
                  FROM recomendacao_decisao d JOIN usuario u ON u.id = d.usuario_id ORDER BY d.id""", rs -> {
            String chave = rs.getString(1);
            if (chaves.contains(chave)) {
                m.put(chave, new Decisao(chave, rs.getString(2), rs.getString(3), (Long) rs.getObject(4, Long.class),
                        rs.getString(5), rs.getTimestamp(6).toLocalDateTime()));
            }
        });
        return m;
    }
}
