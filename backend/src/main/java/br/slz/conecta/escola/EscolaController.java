package br.slz.conecta.escola;

import br.slz.conecta.security.UsuarioAtual;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class EscolaController {
    private final EscolaService service;

    public EscolaController(EscolaService service) {
        this.service = service;
    }

    @GetMapping("/escolas/{id}")
    public EscolaService.Diagnostico escola(@PathVariable String id, @RequestParam(required = false) String componenteId,
                                            @RequestParam(required = false) String avaliacaoId) {
        return service.escola(UsuarioAtual.get(), id, b(componenteId), b(avaliacaoId));
    }

    @GetMapping("/turmas/{id}")
    public EscolaService.DiagnosticoTurma turma(@PathVariable String id, @RequestParam(required = false) String componenteId,
                                                @RequestParam(required = false) String avaliacaoId) {
        return service.turma(UsuarioAtual.get(), id, b(componenteId), b(avaliacaoId));
    }

    @GetMapping("/minhas-turmas")
    public List<EscolaService.MinhaTurma> minhasTurmas() {
        return service.minhasTurmas(UsuarioAtual.get());
    }

    private static String b(String s) {
        return s == null || s.isBlank() ? null : s;
    }
}
