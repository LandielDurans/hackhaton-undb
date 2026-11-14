package br.slz.conecta.auditoria;

import br.slz.conecta.common.Datas;
import br.slz.conecta.security.Usuario;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.util.List;
import java.util.Map;

/** Registro de acessos a dados individuais e de alterações relevantes (LGPD). */
@Service
public class AuditoriaService {
    private final JdbcTemplate jdbc;
    private final Datas datas;

    public AuditoriaService(JdbcTemplate jdbc, Datas datas) {
        this.jdbc = jdbc;
        this.datas = datas;
    }

    public void registrar(Usuario u, String acao, String recurso, String recursoId, boolean permitido, String detalhe) {
        jdbc.update("""
                INSERT INTO auditoria (data_hora, usuario_id, papel, acao, recurso, recurso_id, permitido, detalhe)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                Timestamp.valueOf(datas.agora()), u.id(), u.papel().name(), acao, recurso, recursoId, permitido,
                detalhe == null ? null : detalhe.substring(0, Math.min(500, detalhe.length())));
    }

    public List<Map<String, Object>> recentes(int limite) {
        return jdbc.queryForList("""
                SELECT a.id, a.data_hora AS "dataHora", a.usuario_id AS "usuarioId", u.nome AS "usuarioNome", a.papel,
                       a.acao, a.recurso, a.recurso_id AS "recursoId", a.permitido, a.detalhe
                  FROM auditoria a LEFT JOIN usuario u ON u.id = a.usuario_id
                 ORDER BY a.id DESC LIMIT ?""", limite);
    }
}
