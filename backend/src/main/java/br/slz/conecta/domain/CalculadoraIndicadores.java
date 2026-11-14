package br.slz.conecta.domain;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

/**
 * Cálculo reprodutível de indicadores a partir de registros de resultado.
 * Regras:
 *  - percentual de acerto do grupo = soma de acertos / soma de itens;
 *  - cada estudante é classificado pelo seu próprio percentual (soma dos seus acertos / itens);
 *  - grupos com menos estudantes que o mínimo de agregação são suprimidos.
 */
public final class CalculadoraIndicadores {

    private final CriteriosPedagogicos criterios;
    private final int minimoAgregacao;

    public CalculadoraIndicadores(CriteriosPedagogicos criterios, int minimoAgregacao) {
        this.criterios = criterios;
        this.minimoAgregacao = Math.max(1, minimoAgregacao);
    }

    public CriteriosPedagogicos criterios() {
        return criterios;
    }

    public int minimoAgregacao() {
        return minimoAgregacao;
    }

    /** Registro mínimo para cálculo. */
    public interface Registro {
        String estudanteId();
        int acertos();
        int itens();
    }

    public Indicador calcular(Collection<? extends Registro> registros) {
        return calcular(registros, true);
    }

    /**
     * @param aplicarSupressao falso apenas para visões individuais autorizadas (ex.: perfil do estudante).
     */
    public Indicador calcular(Collection<? extends Registro> registros, boolean aplicarSupressao) {
        if (registros == null || registros.isEmpty()) return Indicador.vazio();
        Map<String, int[]> porEstudante = new HashMap<>();
        long acertos = 0, itens = 0;
        for (Registro r : registros) {
            int[] acc = porEstudante.computeIfAbsent(r.estudanteId(), k -> new int[2]);
            acc[0] += r.acertos();
            acc[1] += r.itens();
            acertos += r.acertos();
            itens += r.itens();
        }
        int n = porEstudante.size();
        if (aplicarSupressao && n < minimoAgregacao) {
            return new Indicador(n, null, null, null, null, null, null, true);
        }
        int ad = 0, dev = 0, at = 0;
        for (int[] acc : porEstudante.values()) {
            double pct = acc[1] == 0 ? 0 : 100.0 * acc[0] / acc[1];
            switch (criterios.classificar(pct)) {
                case ADEQUADO -> ad++;
                case EM_DESENVOLVIMENTO -> dev++;
                case REQUER_ATENCAO -> at++;
            }
        }
        double pctAcerto = itens == 0 ? 0 : arred(100.0 * acertos / itens);
        double pctAdequado = arred(100.0 * ad / n);
        return new Indicador(n, pctAcerto, pctAdequado, ad, dev, at, criterios.classificar(pctAcerto), false);
    }

    public static double arred(double v) {
        return Math.round(v * 10.0) / 10.0;
    }

    public static Double delta(Indicador anterior, Indicador atual) {
        if (anterior == null || atual == null || !anterior.temValor() || !atual.temValor()) return null;
        return arred(atual.percentualAcerto() - anterior.percentualAcerto());
    }
}
