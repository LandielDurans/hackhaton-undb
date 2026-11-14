package br.slz.conecta.domain;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CalculadoraIndicadoresTest {
    record R(String estudanteId, int acertos, int itens) implements CalculadoraIndicadores.Registro {}

    private final CriteriosPedagogicos criterios = new CriteriosPedagogicos(70, 50, 5);
    private final CalculadoraIndicadores calc = new CalculadoraIndicadores(criterios, 5);

    @Test
    void percentualDoGrupoEhSomaDeAcertosSobreSomaDeItens() {
        // 5 estudantes; cada um com 2 habilidades de 5 itens
        List<R> rs = List.of(
                new R("a", 5, 5), new R("a", 4, 5),   // 90% -> adequado
                new R("b", 3, 5), new R("b", 4, 5),   // 70% -> adequado (limiar inclusivo)
                new R("c", 3, 5), new R("c", 2, 5),   // 50% -> em desenvolvimento
                new R("d", 1, 5), new R("d", 2, 5),   // 30% -> requer atenção
                new R("e", 0, 5), new R("e", 1, 5));  // 10% -> requer atenção
        Indicador i = calc.calcular(rs);
        assertThat(i.estudantes()).isEqualTo(5);
        assertThat(i.percentualAcerto()).isEqualTo(50.0); // 25 / 50
        assertThat(i.adequados()).isEqualTo(2);
        assertThat(i.emDesenvolvimento()).isEqualTo(1);
        assertThat(i.requerAtencao()).isEqualTo(2);
        assertThat(i.percentualAdequado()).isEqualTo(40.0);
        assertThat(i.nivel()).isEqualTo(NivelDesempenho.EM_DESENVOLVIMENTO);
        assertThat(i.suprimido()).isFalse();
    }

    @Test
    void gruposPequenosSaoSuprimidosParaEvitarReidentificacao() {
        List<R> rs = List.of(new R("a", 5, 5), new R("b", 1, 5), new R("c", 3, 5), new R("d", 2, 5));
        Indicador i = calc.calcular(rs);
        assertThat(i.suprimido()).isTrue();
        assertThat(i.percentualAcerto()).isNull();
        assertThat(i.adequados()).isNull();
        assertThat(i.estudantes()).isEqualTo(4);
    }

    @Test
    void visaoIndividualAutorizadaNaoAplicaSupressao() {
        Indicador i = calc.calcular(List.of(new R("a", 2, 5)), false);
        assertThat(i.suprimido()).isFalse();
        assertThat(i.percentualAcerto()).isEqualTo(40.0);
        assertThat(i.nivel()).isEqualTo(NivelDesempenho.REQUER_ATENCAO);
    }

    @Test
    void semRegistrosRetornaIndicadorVazio() {
        assertThat(calc.calcular(new ArrayList<R>()).temValor()).isFalse();
    }

    @Test
    void deltaSoExisteQuandoAmbosTemValor() {
        Indicador a = calc.calcular(List.of(new R("a", 2, 5), new R("b", 2, 5), new R("c", 2, 5), new R("d", 2, 5), new R("e", 2, 5)));
        Indicador b = calc.calcular(List.of(new R("a", 3, 5), new R("b", 3, 5), new R("c", 3, 5), new R("d", 3, 5), new R("e", 3, 5)));
        assertThat(CalculadoraIndicadores.delta(a, b)).isEqualTo(20.0);
        assertThat(CalculadoraIndicadores.delta(a, calc.calcular(List.of(new R("a", 1, 5))))).isNull();
    }

    @Test
    void tendenciaUsaVariacaoRelevanteConfigurada() {
        assertThat(criterios.tendencia(40.0, 45.0)).isEqualTo(Tendencia.MELHORA);
        assertThat(criterios.tendencia(40.0, 44.9)).isEqualTo(Tendencia.ESTAVEL);
        assertThat(criterios.tendencia(40.0, 35.0)).isEqualTo(Tendencia.QUEDA);
        assertThat(criterios.tendencia(null, 35.0)).isEqualTo(Tendencia.SEM_COMPARACAO);
    }

    @Test
    void criteriosInconsistentesSaoRejeitados() {
        assertThatThrownBy(() -> new CriteriosPedagogicos(50, 70, 5)).isInstanceOf(IllegalArgumentException.class);
    }
}
