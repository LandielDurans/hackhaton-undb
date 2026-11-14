package br.slz.conecta.formacao;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Repository
public class FormacaoRepository {
    private final JdbcTemplate jdbc;

    public record Formacao(String id, String titulo, String descricao, String objetivos, String modalidade, int cargaHoraria,
                           String publico, LocalDate dataInicio, LocalDate dataFim, int vagas, String status,
                           List<String> habilidades) {}

    public record Participacao(long id, String formacaoId, String professorId, String status, Boolean aplicouEstrategia,
                               String registroAplicacao, LocalDateTime atualizadoEm) {}

    public FormacaoRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Formacao> todas() {
        Map<String, List<String>> habs = new HashMap<>();
        jdbc.query("SELECT formacao_id, habilidade_id FROM formacao_habilidade ORDER BY habilidade_id",
                rs -> { habs.computeIfAbsent(rs.getString(1), k -> new ArrayList<>()).add(rs.getString(2)); });
        return jdbc.query("""
                SELECT id, titulo, descricao, objetivos, modalidade, carga_horaria, publico, data_inicio, data_fim, vagas, status
                  FROM formacao ORDER BY data_inicio DESC, id""",
                (rs, i) -> new Formacao(rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5),
                        rs.getInt(6), rs.getString(7), rs.getDate(8).toLocalDate(), rs.getDate(9).toLocalDate(), rs.getInt(10),
                        rs.getString(11), habs.getOrDefault(rs.getString(1), List.of())));
    }

    public Optional<Formacao> porId(String id) {
        return todas().stream().filter(f -> f.id().equals(id)).findFirst();
    }

    public List<Formacao> paraHabilidade(String habilidadeId) {
        return todas().stream().filter(f -> f.habilidades().contains(habilidadeId)).toList();
    }

    public List<Participacao> participacoes() {
        return jdbc.query("""
                SELECT id, formacao_id, professor_id, status, aplicou_estrategia, registro_aplicacao, atualizado_em
                  FROM participacao ORDER BY id""",
                (rs, i) -> new Participacao(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4),
                        (Boolean) rs.getObject(5, Boolean.class), rs.getString(6), rs.getTimestamp(7).toLocalDateTime()));
    }

    public Optional<Participacao> participacao(long id) {
        return participacoes().stream().filter(p -> p.id() == id).findFirst();
    }

    public void inscrever(String formacaoId, String professorId, LocalDateTime agora) {
        jdbc.update("INSERT INTO participacao (formacao_id, professor_id, status, atualizado_em) VALUES (?, ?, 'INSCRITO', ?)",
                formacaoId, professorId, Timestamp.valueOf(agora));
    }

    public void atualizarParticipacao(long id, String status, Boolean aplicou, String registro, LocalDateTime agora) {
        jdbc.update("UPDATE participacao SET status = ?, aplicou_estrategia = ?, registro_aplicacao = ?, atualizado_em = ? WHERE id = ?",
                status, aplicou, registro, Timestamp.valueOf(agora), id);
    }
}
