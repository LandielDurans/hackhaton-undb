package br.slz.conecta.plano;

import br.slz.conecta.domain.EscopoPlano;
import br.slz.conecta.domain.StatusPlano;
import br.slz.conecta.plano.PlanoDtos.*;
import br.slz.conecta.security.UsuarioAtual;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/planos")
public class PlanoController {
    private final PlanoService service;
    private final PlanoEvidenciaService evidencias;

    public PlanoController(PlanoService service, PlanoEvidenciaService evidencias) {
        this.service = service;
        this.evidencias = evidencias;
    }

    @GetMapping
    public List<PlanoResumo> listar(@RequestParam(required = false) EscopoPlano escopo,
                                    @RequestParam(required = false) StatusPlano status,
                                    @RequestParam(required = false) String territorioId,
                                    @RequestParam(required = false) String escolaId,
                                    @RequestParam(required = false) String turmaId,
                                    @RequestParam(required = false) String estudanteId,
                                    @RequestParam(required = false) String habilidadeId,
                                    @RequestParam(required = false) String componenteId,
                                    @RequestParam(required = false) Boolean atrasados) {
        return service.listar(UsuarioAtual.get(), new PlanoService.FiltroPlanos(escopo, status, blank(territorioId), blank(escolaId),
                blank(turmaId), blank(estudanteId), blank(habilidadeId), blank(componenteId), atrasados));
    }

    @GetMapping("/{id}")
    public PlanoDetalhe detalhe(@PathVariable long id) {
        return service.detalhe(UsuarioAtual.get(), id);
    }

    @GetMapping("/{id}/evidencia")
    public PlanoEvidenciaService.Evidencia evidencia(@PathVariable long id) {
        return evidencias.calcular(UsuarioAtual.get(), id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PlanoDetalhe criar(@Valid @RequestBody PlanoInput in) {
        return service.criar(UsuarioAtual.get(), in);
    }

    @PutMapping("/{id}")
    public PlanoDetalhe atualizar(@PathVariable long id, @Valid @RequestBody PlanoInput in) {
        return service.atualizar(UsuarioAtual.get(), id, in);
    }

    @PostMapping("/{id}/status")
    public PlanoDetalhe status(@PathVariable long id, @Valid @RequestBody StatusInput in) {
        return service.mudarStatus(UsuarioAtual.get(), id, in);
    }

    @PostMapping("/{id}/reavaliacao")
    public PlanoDetalhe reavaliar(@PathVariable long id, @Valid @RequestBody ReavaliacaoInput in) {
        return service.reavaliar(UsuarioAtual.get(), id, in);
    }

    @PostMapping("/{id}/acoes")
    public PlanoDetalhe acao(@PathVariable long id, @Valid @RequestBody AcaoInput in) {
        return service.adicionarAcao(UsuarioAtual.get(), id, in);
    }

    @PatchMapping("/{id}/acoes/{acaoId}")
    public PlanoDetalhe acaoStatus(@PathVariable long id, @PathVariable long acaoId, @Valid @RequestBody AcaoStatusInput in) {
        return service.atualizarAcao(UsuarioAtual.get(), id, acaoId, in);
    }

    @PostMapping("/{id}/registros")
    public PlanoDetalhe registro(@PathVariable long id, @Valid @RequestBody RegistroInput in) {
        return service.registrar(UsuarioAtual.get(), id, in);
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s;
    }
}
