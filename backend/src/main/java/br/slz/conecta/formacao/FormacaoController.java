package br.slz.conecta.formacao;

import br.slz.conecta.security.UsuarioAtual;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/formacoes")
public class FormacaoController {
    private final FormacaoService service;

    public FormacaoController(FormacaoService service) {
        this.service = service;
    }

    @GetMapping
    public List<FormacaoService.FormacaoView> catalogo() {
        return service.catalogo(UsuarioAtual.get());
    }

    @GetMapping("/demandas")
    public FormacaoService.Demandas demandas(@RequestParam(required = false) String territorioId,
                                             @RequestParam(required = false) Integer ano,
                                             @RequestParam(required = false) String componenteId,
                                             @RequestParam(required = false) String avaliacaoId) {
        return service.demandas(UsuarioAtual.get(), blank(territorioId), ano, blank(componenteId), blank(avaliacaoId));
    }

    @GetMapping("/participacoes")
    public List<FormacaoService.ParticipacaoView> participacoes(@RequestParam(required = false) String escolaId) {
        return service.participacoes(UsuarioAtual.get(), blank(escolaId));
    }

    @PostMapping("/{id}/inscricoes")
    public FormacaoService.ParticipacaoView inscrever(@PathVariable String id) {
        return service.inscrever(UsuarioAtual.get(), id);
    }

    @PatchMapping("/participacoes/{id}")
    public FormacaoService.ParticipacaoView atualizar(@PathVariable long id, @RequestBody FormacaoService.AtualizacaoParticipacao in) {
        return service.atualizar(UsuarioAtual.get(), id, in);
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s;
    }
}
