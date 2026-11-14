package br.slz.conecta.domain;

import org.junit.jupiter.api.Test;

import static br.slz.conecta.domain.StatusPlano.*;
import static org.assertj.core.api.Assertions.assertThat;

class StatusPlanoTest {
    @Test
    void cicloPrincipalAvancaUmPassoPorVez() {
        assertThat(PLANEJADO.podeIrPara(EM_ANDAMENTO)).isTrue();
        assertThat(EM_ANDAMENTO.podeIrPara(CONCLUIDO)).isTrue();
        assertThat(CONCLUIDO.podeIrPara(REAVALIADO)).isTrue();
        assertThat(PLANEJADO.podeIrPara(CONCLUIDO)).isFalse();
        assertThat(PLANEJADO.podeIrPara(REAVALIADO)).isFalse();
        assertThat(EM_ANDAMENTO.podeIrPara(REAVALIADO)).isFalse();
    }

    @Test
    void revisoesSaoPermitidasMasExigemJustificativa() {
        assertThat(EM_ANDAMENTO.podeIrPara(PLANEJADO)).isTrue();
        assertThat(EM_ANDAMENTO.exigeJustificativa(PLANEJADO)).isTrue();
        assertThat(REAVALIADO.podeIrPara(EM_ANDAMENTO)).isTrue();
        assertThat(REAVALIADO.exigeJustificativa(EM_ANDAMENTO)).isTrue();
        assertThat(PLANEJADO.exigeJustificativa(EM_ANDAMENTO)).isFalse();
    }

    @Test
    void reavaliacaoSoPorRegistroProprio() {
        assertThat(StatusPlano.exigeRegistroDeReavaliacao(REAVALIADO)).isTrue();
        assertThat(StatusPlano.exigeRegistroDeReavaliacao(CONCLUIDO)).isFalse();
    }
}
