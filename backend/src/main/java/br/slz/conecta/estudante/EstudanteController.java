package br.slz.conecta.estudante;

import br.slz.conecta.security.UsuarioAtual;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class EstudanteController {
    private final EstudanteService service;

    public EstudanteController(EstudanteService service) {
        this.service = service;
    }

    @GetMapping("/estudantes/{id}")
    public EstudanteService.Perfil perfil(@PathVariable String id) {
        return service.perfil(UsuarioAtual.get(), id);
    }

    @PostMapping("/estudantes/{id}/reavaliacoes")
    public Map<String, Object> reavaliacao(@PathVariable String id, @Valid @RequestBody EstudanteService.ReavaliacaoInput in) {
        return service.registrarReavaliacao(UsuarioAtual.get(), id, in);
    }

    @GetMapping("/assistente/turmas/{turmaId}")
    public List<EstudanteService.AlunoAssistente> assistente(@PathVariable String turmaId,
                                                            @RequestParam(required = false) String componenteId) {
        return service.assistenteTurma(UsuarioAtual.get(), turmaId, componenteId == null || componenteId.isBlank() ? null : componenteId);
    }
}
