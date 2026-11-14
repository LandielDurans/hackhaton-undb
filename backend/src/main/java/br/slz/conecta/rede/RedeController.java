package br.slz.conecta.rede;

import br.slz.conecta.domain.StatusPlano;
import br.slz.conecta.security.UsuarioAtual;
import org.springframework.web.bind.annotation.*;

/** Dados agregados da rede — acessíveis a todos os perfis autenticados (nenhum dado individual). */
@RestController
@RequestMapping("/api/rede")
public class RedeController {
    private final RedeService service;
    private final PainelEscolasService painelEscolas;

    public RedeController(RedeService service, PainelEscolasService painelEscolas) {
        this.service = service;
        this.painelEscolas = painelEscolas;
    }

    /** Análises por escola (evasão, notas, matérias, quadro de profissionais, educação especial) e notificações. */
    @GetMapping("/escolas")
    public PainelEscolasService.Painel escolas(@RequestParam(required = false) Integer ano, @RequestParam(required = false) String avaliacaoId) {
        return painelEscolas.painel(ano, b(avaliacaoId));
    }

    @GetMapping("/mapa")
    public RedeService.Mapa mapa(@RequestParam(required = false) String territorioId, @RequestParam(required = false) String escolaId,
                                 @RequestParam(required = false) Integer ano, @RequestParam(required = false) String componenteId,
                                 @RequestParam(required = false) String habilidadeId, @RequestParam(required = false) String avaliacaoId,
                                 @RequestParam(required = false) StatusPlano statusPlano) {
        return service.mapa(new RedeService.FiltroRede(b(territorioId), b(escolaId), ano, b(componenteId), b(habilidadeId), b(avaliacaoId), statusPlano));
    }

    @GetMapping("/painel")
    public RedeService.Painel painel(@RequestParam(required = false) String territorioId, @RequestParam(required = false) String escolaId,
                                     @RequestParam(required = false) Integer ano, @RequestParam(required = false) String componenteId,
                                     @RequestParam(required = false) String habilidadeId, @RequestParam(required = false) String avaliacaoId,
                                     @RequestParam(required = false) StatusPlano statusPlano) {
        return service.painel(UsuarioAtual.get(),
                new RedeService.FiltroRede(b(territorioId), b(escolaId), ano, b(componenteId), b(habilidadeId), b(avaliacaoId), statusPlano));
    }

    @GetMapping("/territorios")
    public RedeService.Comparativo territorios(@RequestParam(required = false) Integer ano,
                                               @RequestParam(required = false) String componenteId,
                                               @RequestParam(required = false) String avaliacaoId) {
        return service.territorios(ano, b(componenteId), b(avaliacaoId));
    }

    private static String b(String s) {
        return s == null || s.isBlank() ? null : s;
    }
}
