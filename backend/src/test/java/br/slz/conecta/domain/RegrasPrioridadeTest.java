package br.slz.conecta.domain;

import br.slz.conecta.recomendacao.RegrasPrioridade;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RegrasPrioridadeTest {
    private final CriteriosPedagogicos c = new CriteriosPedagogicos(70, 50, 5);

    @Test
    void dificuldadeRecorrenteMuitoBaixaEhAlta() {
        var r = RegrasPrioridade.avaliar(c, 35.0, 38.0, false, false);
        assertThat(r.prioridade()).isEqualTo(Prioridade.ALTA);
        assertThat(r.pontos()).isEqualTo(3);
        assertThat(r.justificativa()).contains("recorrente").contains("[+2]");
    }

    @Test
    void planoAtivoEMelhoraReduzemPrioridadeDeFormaExplicita() {
        var r = RegrasPrioridade.avaliar(c, 45.0, 38.0, false, true);
        // +1 abaixo do limiar, +1 recorrente, -1 melhora, -1 plano ativo
        assertThat(r.pontos()).isEqualTo(0);
        assertThat(r.prioridade()).isEqualTo(Prioridade.BAIXA);
        assertThat(r.fatores()).anyMatch(f -> f.contains("plano ativo"));
        assertThat(r.fatores()).anyMatch(f -> f.contains("melhora"));
    }

    @Test
    void quedaEAbrangenciaAumentamPrioridade() {
        var r = RegrasPrioridade.avaliar(c, 48.0, 60.0, true, false);
        // +1 abaixo do limiar, +1 queda, +1 abrangência
        assertThat(r.prioridade()).isEqualTo(Prioridade.ALTA);
    }
}
