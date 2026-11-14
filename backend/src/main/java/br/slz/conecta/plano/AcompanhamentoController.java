package br.slz.conecta.plano;

import br.slz.conecta.domain.DecisaoReavaliacao;
import br.slz.conecta.domain.EscopoPlano;
import br.slz.conecta.domain.StatusPlano;
import br.slz.conecta.plano.PlanoDtos.PlanoResumo;
import br.slz.conecta.security.AccessPolicy;
import br.slz.conecta.security.Usuario;
import br.slz.conecta.security.UsuarioAtual;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;

/**
 * Acompanhamento de resultados: execução dos planos, atrasos, reavaliações e evidências antes/depois.
 * Contagens incluem planos individuais apenas como números agregados.
 */
@RestController
@RequestMapping("/api/acompanhamento")
public class AcompanhamentoController {
    private final PlanoService planos;
    private final PlanoEvidenciaService evidencias;
    private final AccessPolicy acesso;

    public AcompanhamentoController(PlanoService planos, PlanoEvidenciaService evidencias, AccessPolicy acesso) {
        this.planos = planos;
        this.evidencias = evidencias;
        this.acesso = acesso;
    }

    public record Resultado(PlanoResumo plano, Double antes, Double depois, Double variacao, String avaliacaoBase,
                            String avaliacaoPosterior, boolean aguardandoAvaliacao) {}

    public record Painel(Map<EscopoPlano, Map<StatusPlano, Integer>> contagem, int total, int ativos, int atrasados,
                         Map<DecisaoReavaliacao, Integer> decisoes, List<PlanoResumo> listaAtrasados,
                         List<Resultado> resultados, String aviso) {}

    @GetMapping
    public Painel painel(@RequestParam(required = false) String territorioId, @RequestParam(required = false) String escolaId) {
        Usuario u = UsuarioAtual.get();
        String esc = escolaId == null || escolaId.isBlank() ? (u.gestor() ? null : u.escolaId()) : escolaId;
        if (esc != null) acesso.exigirEscola(u, esc);
        String ter = territorioId == null || territorioId.isBlank() ? null : territorioId;

        // contagem agregada (inclui planos individuais apenas como números)
        Map<EscopoPlano, Map<StatusPlano, Integer>> cont = new EnumMap<>(EscopoPlano.class);
        for (EscopoPlano e : EscopoPlano.values()) {
            Map<StatusPlano, Integer> m = new EnumMap<>(StatusPlano.class);
            for (StatusPlano s : StatusPlano.values()) m.put(s, 0);
            cont.put(e, m);
        }
        Map<DecisaoReavaliacao, Integer> dec = new EnumMap<>(DecisaoReavaliacao.class);
        for (DecisaoReavaliacao d : DecisaoReavaliacao.values()) dec.put(d, 0);
        int total = 0, ativos = 0, atrasados = 0;
        var hoje = java.time.LocalDate.now();
        for (PlanoRow p : planos.todosRows()) {
            if (esc != null && !esc.equals(p.escolaId()) && !(p.escopo() == EscopoPlano.TERRITORIO && Objects.equals(p.territorioId(), u.territorioId()))) continue;
            if (ter != null && !ter.equals(planos.territorioDe(p))) continue;
            cont.get(p.escopo()).merge(p.status(), 1, Integer::sum);
            total++;
            if (p.status().ativo()) ativos++;
            if (p.decisaoReavaliacao() != null) dec.merge(p.decisaoReavaliacao(), 1, Integer::sum);
        }
        var filtro = new PlanoService.FiltroPlanos(null, null, ter, esc, null, null, null, null, null);
        List<PlanoResumo> visiveis = planos.listar(u, filtro);
        List<PlanoResumo> listaAtrasados = visiveis.stream().filter(PlanoResumo::atrasado).toList();
        atrasados = listaAtrasados.size();
        List<Resultado> resultados = new ArrayList<>();
        for (PlanoResumo p : visiveis) {
            if (p.status() != StatusPlano.REAVALIADO && p.status() != StatusPlano.CONCLUIDO) continue;
            var ev = evidencias.calcular(u, p.id());
            resultados.add(new Resultado(p, ev.percentualAntes(), ev.percentualDepois(), ev.variacao(), ev.avaliacaoBase(),
                    ev.avaliacaoPosterior(), ev.aguardandoAvaliacao()));
        }
        return new Painel(cont, total, ativos, atrasados, dec, listaAtrasados, resultados, PlanoEvidenciaService.AVISO);
    }
}
