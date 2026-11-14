package br.slz.conecta.api;

import br.slz.conecta.analise.AnaliseService;
import br.slz.conecta.analise.Filtro;
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
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Testes de ponta a ponta sobre a API com a carga demonstrativa (H2 em memória). */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local")
class ApiIntegracaoTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired AnaliseService analise;

    private Cookie login(String email) throws Exception {
        MvcResult r = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"senha\":\"demo123\"}")).andExpect(status().isOk()).andReturn();
        return r.getResponse().getCookie("conecta_token");
    }

    private JsonNode get(Cookie c, String url) throws Exception {
        return json.readTree(mvc.perform(MockMvcRequestBuilders_get(url).cookie(c)).andExpect(status().isOk()).andReturn()
                .getResponse().getContentAsString());
    }

    private static org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder MockMvcRequestBuilders_get(String url) {
        return org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get(url);
    }

    private String davi() {
        return jdbc.queryForObject("SELECT id FROM estudante WHERE nome = 'Davi S.' AND turma_id = 'E04-5A'", String.class);
    }

    // ------------------------------------------------------------- autenticação e permissões

    @Test
    void semAutenticacaoRetorna401() throws Exception {
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/rede/mapa")).andExpect(status().isUnauthorized());
    }

    @Test
    void senhaErradaRetorna401() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"semed@conecta.demo\",\"senha\":\"errada\"}")).andExpect(status().isUnauthorized());
    }

    @Test
    void gestaoDaRedeNaoAcessaDadosIndividuais() throws Exception {
        Cookie semed = login("semed@conecta.demo");
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/estudantes/" + davi()).cookie(semed))
                .andExpect(status().isForbidden());
        JsonNode turma = get(semed, "/api/turmas/E04-5A");
        assertThat(turma.get("acessoIndividual").asBoolean()).isFalse();
        assertThat(turma.has("estudantes")).isFalse(); // lista omitida na resposta
        Integer negados = jdbc.queryForObject("SELECT COUNT(*) FROM auditoria WHERE usuario_id = 'U-SEMED' AND permitido = FALSE", Integer.class);
        assertThat(negados).isGreaterThan(0);
    }

    @Test
    void professorAcessaApenasEstudantesDasSuasTurmas() throws Exception {
        Cookie helena = login("professora.helena@conecta.demo");
        Cookie paulo = login("professor.paulo@conecta.demo");
        String id = davi();
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/estudantes/" + id).cookie(helena)).andExpect(status().isOk());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/estudantes/" + id).cookie(paulo)).andExpect(status().isForbidden());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/turmas/E04-5A").cookie(paulo)).andExpect(status().isForbidden());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/escolas/E04").cookie(paulo)).andExpect(status().isForbidden());
        // acesso individual é auditado
        Integer acessos = jdbc.queryForObject("SELECT COUNT(*) FROM auditoria WHERE acao = 'VER_PERFIL_ESTUDANTE' AND recurso_id = ?", Integer.class, id);
        assertThat(acessos).isGreaterThan(0);
    }

    @Test
    void coordenacaoAcessaSomenteAPropriaEscola() throws Exception {
        Cookie coord = login("coordenacao.manguevivo@conecta.demo");
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/estudantes/" + davi()).cookie(coord)).andExpect(status().isOk());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/escolas/E10").cookie(coord)).andExpect(status().isForbidden());
    }

    // ------------------------------------------------------------- indicadores

    @Test
    void indicadorDaEscolaReflete_osRegistrosIndividuais() throws Exception {
        Map<String, Object> m = jdbc.queryForMap("""
                SELECT SUM(r.acertos) AS a, SUM(r.itens) AS i FROM resultado r JOIN turma t ON t.id = r.turma_id
                  JOIN descritor d ON d.id = r.descritor_id
                 WHERE t.escola_id = 'E04' AND r.avaliacao_id = 'AV3-2026' AND d.componente_id = 'MAT'""");
        double esperado = Math.round(1000.0 * ((Number) m.get("a")).doubleValue() / ((Number) m.get("i")).doubleValue()) / 10.0;
        Cookie semed = login("semed@conecta.demo");
        JsonNode mapa = get(semed, "/api/rede/mapa?componenteId=MAT&avaliacaoId=AV3-2026");
        JsonNode e04 = null;
        for (JsonNode e : mapa.get("escolas")) if (e.get("id").asText().equals("E04")) e04 = e;
        assertThat(e04).isNotNull();
        assertThat(e04.get("indicador").get("percentualAcerto").asDouble()).isEqualTo(esperado);
        // o mesmo número aparece no diagnóstico da escola
        JsonNode diag = get(semed, "/api/escolas/E04?avaliacaoId=AV3-2026");
        JsonNode mat = null;
        for (JsonNode c : diag.get("componentes")) if (c.get("componenteId").asText().equals("MAT")) mat = c;
        assertThat(mat.get("indicador").get("percentualAcerto").asDouble()).isEqualTo(esperado);
    }

    @Test
    void territorioAgregaExatamenteAsSuasEscolas() {
        var t = analise.indicador(Filtro.vazio().comTerritorio("TER-ITB").comComponente("MAT"), "AV3-2026");
        long acertos = 0, itens = 0;
        for (String e : new String[]{"E04", "E05", "E06"}) {
            for (var f : analise.fatos(Filtro.vazio().comEscola(e).comComponente("MAT"), "AV3-2026")) {
                acertos += f.acertos();
                itens += f.itens();
            }
        }
        assertThat(t.percentualAcerto()).isEqualTo(Math.round(1000.0 * acertos / itens) / 10.0);
    }

    // ------------------------------------------------------------- recomendações

    @Test
    void recomendacoesTrazemEvidenciaPrioridadeJustificadaEAviso() throws Exception {
        Cookie helena = login("professora.helena@conecta.demo");
        JsonNode recs = get(helena, "/api/recomendacoes/estudantes/" + davi());
        assertThat(recs.size()).isGreaterThan(0);
        JsonNode r = recs.get(0);
        assertThat(r.get("evidencias").size()).isGreaterThan(0);
        assertThat(r.get("justificativaPrioridade").asText()).isNotBlank();
        assertThat(r.get("aviso").asText()).contains("Não é uma decisão obrigatória");
        assertThat(r.get("contextoTemporal").asText()).contains("AV3");
        boolean temFracoes = false;
        for (JsonNode x : recs) if (x.get("grupo").asText().equals("Frações")) temFracoes = true;
        assertThat(temFracoes).isTrue();
        JsonNode est = r.get("estrategias").get(0);
        assertThat(est.get("passos").size()).isGreaterThan(0);
        assertThat(est.get("comoAcompanhar").asText()).isNotBlank();
        assertThat(est.get("quandoReavaliar").asText()).isNotBlank();
    }

    // ------------------------------------------------------------- ciclo do plano

    @Test
    void cicloCompletoDoPlanoIndividual() throws Exception {
        Cookie helena = login("professora.helena@conecta.demo");
        String body = """
                {"escopo":"ESTUDANTE","estudanteId":"%s","componenteId":"MAT","titulo":"Teste — frações","problema":"p","evidencias":"e",
                 "objetivo":"o","publicoAlvo":"Davi","estrategia":"tiras","estrategiaId":"EST-FR1","responsavel":"Helena",
                 "dataInicio":"2026-11-10","prazo":"2026-12-10","indicadorAcompanhamento":"i","criterioConclusao":"c",
                 "resultadoEsperado":"r","habilidades":["EF05MA03"]}""".formatted(davi());
        JsonNode criado = json.readTree(mvc.perform(post("/api/planos").cookie(helena).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        long id = criado.get("id").asLong();
        assertThat(criado.get("status").asText()).isEqualTo("PLANEJADO");

        // transição inválida
        mvc.perform(post("/api/planos/" + id + "/status").cookie(helena).contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"CONCLUIDO\"}")).andExpect(status().isUnprocessableEntity());
        mvc.perform(post("/api/planos/" + id + "/status").cookie(helena).contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"EM_ANDAMENTO\"}")).andExpect(status().isOk());
        // revisão sem justificativa
        mvc.perform(post("/api/planos/" + id + "/status").cookie(helena).contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"PLANEJADO\"}")).andExpect(status().isUnprocessableEntity());
        // edição em execução exige justificativa
        mvc.perform(put("/api/planos/" + id).cookie(helena).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnprocessableEntity());
        mvc.perform(post("/api/planos/" + id + "/registros").cookie(helena).contentType(MediaType.APPLICATION_JSON)
                .content("{\"tipo\":\"EXECUCAO\",\"data\":\"2026-11-12\",\"descricao\":\"Atividade 1\",\"percepcao\":\"AVANCO\"}"))
                .andExpect(status().isOk());
        // reavaliação antes da conclusão é rejeitada
        mvc.perform(post("/api/planos/" + id + "/reavaliacao").cookie(helena).contentType(MediaType.APPLICATION_JSON)
                .content("{\"resultadoObservado\":\"x\",\"decisao\":\"FUNCIONOU\"}")).andExpect(status().isUnprocessableEntity());
        mvc.perform(post("/api/planos/" + id + "/status").cookie(helena).contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"CONCLUIDO\"}")).andExpect(status().isOk());
        JsonNode reav = json.readTree(mvc.perform(post("/api/planos/" + id + "/reavaliacao").cookie(helena).contentType(MediaType.APPLICATION_JSON)
                .content("{\"resultadoObservado\":\"Avançou em representação\",\"decisao\":\"AJUSTAR\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(reav.get("status").asText()).isEqualTo("REAVALIADO");
        assertThat(reav.get("historico").size()).isGreaterThanOrEqualTo(4);

        // gestão da rede não vê o plano individual
        Cookie semed = login("semed@conecta.demo");
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/planos/" + id).cookie(semed)).andExpect(status().isForbidden());
        // e não pode criar planos individuais
        mvc.perform(post("/api/planos").cookie(semed).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
    }

    @Test
    void planoComHabilidadeDeOutroAnoEhRejeitado() throws Exception {
        Cookie helena = login("professora.helena@conecta.demo");
        String body = """
                {"escopo":"TURMA","turmaId":"E04-5A","componenteId":"MAT","titulo":"t","problema":"p","evidencias":"e","objetivo":"o",
                 "publicoAlvo":"x","estrategia":"s","responsavel":"r","dataInicio":"2026-11-10","prazo":"2026-12-10",
                 "indicadorAcompanhamento":"i","criterioConclusao":"c","resultadoEsperado":"r","habilidades":["EF09MA05"]}""";
        mvc.perform(post("/api/planos").cookie(helena).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnprocessableEntity());
    }
}
