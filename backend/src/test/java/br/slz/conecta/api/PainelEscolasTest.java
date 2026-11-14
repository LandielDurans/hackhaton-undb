package br.slz.conecta.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Evasão, quadro de profissionais, educação especial e notificações do painel do mapa. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local")
class PainelEscolasTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;

    private JsonNode painel() throws Exception {
        Cookie c = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"semed@conecta.demo\",\"senha\":\"demo123\"}")).andReturn().getResponse().getCookie("conecta_token");
        return json.readTree(mvc.perform(get("/api/rede/escolas").cookie(c)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    private JsonNode escola(JsonNode p, String id) {
        for (JsonNode e : p.get("escolas")) if (e.get("id").asText().equals(id)) return e;
        throw new AssertionError(id);
    }

    @Test
    void evasaoEhCalculadaDosRegistrosDeEstudantes() throws Exception {
        JsonNode e01 = escola(painel(), "E01");
        Integer total = jdbc.queryForObject("SELECT COUNT(*) FROM estudante s JOIN turma t ON t.id = s.turma_id WHERE t.escola_id = 'E01'", Integer.class);
        Integer ab = jdbc.queryForObject("SELECT COUNT(*) FROM estudante s JOIN turma t ON t.id = s.turma_id WHERE t.escola_id = 'E01' AND s.situacao = 'ABANDONO'", Integer.class);
        assertThat(e01.get("evasao").get("matriculados").asInt()).isEqualTo(total);
        assertThat(e01.get("evasao").get("abandonos").asInt()).isEqualTo(ab);
        assertThat(e01.get("evasao").get("taxa").asDouble()).isEqualTo(Math.round(1000.0 * ab / total) / 10.0);
    }

    @Test
    void estudanteQueAbandonouNaoTemResultadoDepoisDaSaida() {
        Integer depois = jdbc.queryForObject("""
                SELECT COUNT(*) FROM resultado r JOIN estudante s ON s.id = r.estudante_id JOIN avaliacao a ON a.id = r.avaliacao_id
                 WHERE s.situacao = 'ABANDONO' AND a.data_aplicacao >= s.data_saida""", Integer.class);
        assertThat(depois).isZero();
    }

    @Test
    void escassezSomaVagasNaoPreenchidas() throws Exception {
        JsonNode e16 = escola(painel(), "E16");
        Integer faltam = jdbc.queryForObject("SELECT SUM(CASE WHEN necessarios > lotados THEN necessarios - lotados ELSE 0 END) FROM quadro_docente WHERE escola_id = 'E16'", Integer.class);
        assertThat(e16.get("escassez").get("faltam").asInt()).isEqualTo(faltam).isGreaterThanOrEqualTo(3);
    }

    @Test
    void notificacoesSaoGeradasPorRegrasSobreOsDados() throws Exception {
        List<String> titulos = new ArrayList<>();
        painel().get("notificacoes").forEach(n -> titulos.add(n.get("titulo").asText()));
        assertThat(titulos).anyMatch(t -> t.startsWith("Escola do Centro está com") && t.endsWith("% de evasão!"));
        assertThat(titulos).contains("A escola do Turu precisa de profissionais!");
        assertThat(titulos).contains("O desempenho dos alunos no Bequimão está abaixo da média.");
    }
}
