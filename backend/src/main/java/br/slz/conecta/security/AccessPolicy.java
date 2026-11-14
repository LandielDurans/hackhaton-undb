package br.slz.conecta.security;

import br.slz.conecta.analise.Catalogo;
import br.slz.conecta.analise.Refs.TurmaRef;
import br.slz.conecta.auditoria.AuditoriaService;
import br.slz.conecta.common.ApiException;
import br.slz.conecta.domain.EscopoPlano;
import br.slz.conecta.estudante.EstudanteRepository;
import org.springframework.stereotype.Service;

/**
 * Regras de autorização por papel e escopo, aplicadas no back-end.
 *
 * <ul>
 *   <li>GESTOR_REDE: toda a rede, somente agregados. Sem acesso a dados individuais de estudantes.</li>
 *   <li>COORDENADOR: a própria escola, incluindo dados individuais dos estudantes da escola.</li>
 *   <li>PROFESSOR: agregados da própria escola; dados de turma e individuais apenas das suas turmas.</li>
 * </ul>
 */
@Service
public class AccessPolicy {
    private final Catalogo catalogo;
    private final EstudanteRepository estudantes;
    private final AuditoriaService auditoria;

    public AccessPolicy(Catalogo catalogo, EstudanteRepository estudantes, AuditoriaService auditoria) {
        this.catalogo = catalogo;
        this.estudantes = estudantes;
        this.auditoria = auditoria;
    }

    // ------------- consultas -------------

    public boolean podeVerEscola(Usuario u, String escolaId) {
        return u.gestor() || escolaId.equals(u.escolaId());
    }

    public boolean podeVerTurma(Usuario u, String turmaId) {
        TurmaRef t = catalogo.turma(turmaId);
        return switch (u.papel()) {
            case GESTOR_REDE -> true;
            case COORDENADOR -> t.escolaId().equals(u.escolaId());
            case PROFESSOR -> catalogo.turmasDoProfessor(u.professorId()).contains(turmaId);
        };
    }

    /** Dados individuais (lista de estudantes, perfis, planos individuais) de uma turma. */
    public boolean podeVerIndividuaisDaTurma(Usuario u, String turmaId) {
        TurmaRef t = catalogo.turma(turmaId);
        return switch (u.papel()) {
            case GESTOR_REDE -> false;
            case COORDENADOR -> t.escolaId().equals(u.escolaId());
            case PROFESSOR -> catalogo.turmasDoProfessor(u.professorId()).contains(turmaId);
        };
    }

    public boolean podeVerTerritorio(Usuario u, String territorioId) {
        return u.gestor() || territorioId.equals(u.territorioId());
    }

    // ------------- exigências (lançam 403 e auditam a negativa) -------------

    public void exigirEscola(Usuario u, String escolaId) {
        catalogo.escola(escolaId);
        if (!podeVerEscola(u, escolaId)) negar(u, "ESCOLA", escolaId, "Seu perfil não tem acesso ao diagnóstico desta escola.");
    }

    public void exigirTurma(Usuario u, String turmaId) {
        if (!podeVerTurma(u, turmaId)) negar(u, "TURMA", turmaId, "Seu perfil não tem acesso a esta turma.");
    }

    /** Retorna a turma do estudante, se o acesso for permitido. Registra o acesso na auditoria. */
    public EstudanteRepository.EstudanteRow exigirEstudante(Usuario u, String estudanteId, String acao) {
        var est = estudantes.porId(estudanteId).orElseThrow(() -> ApiException.naoEncontrado("Estudante"));
        if (!podeVerIndividuaisDaTurma(u, est.turmaId())) {
            negar(u, "ESTUDANTE", estudanteId, u.gestor()
                    ? "A gestão da rede visualiza apenas dados agregados. Dados individuais são restritos à escola e ao professor responsável."
                    : "Dados individuais são restritos aos profissionais responsáveis por este estudante.");
        }
        auditoria.registrar(u, acao, "ESTUDANTE", estudanteId, true, null);
        return est;
    }

    public void negar(Usuario u, String recurso, String id, String mensagem) {
        auditoria.registrar(u, "ACESSO_NEGADO", recurso, id, false, mensagem);
        throw ApiException.proibido(mensagem);
    }

    // ------------- planos -------------

    public record AlvoPlano(EscopoPlano escopo, String territorioId, String escolaId, String turmaId, String estudanteId) {}

    public boolean podeVerPlano(Usuario u, AlvoPlano p) {
        return switch (p.escopo()) {
            case TERRITORIO -> podeVerTerritorio(u, p.territorioId());
            case ESCOLA -> podeVerEscola(u, p.escolaId());
            case TURMA -> podeVerTurma(u, p.turmaId());
            case ESTUDANTE -> podeVerIndividuaisDaTurma(u, p.turmaId());
        };
    }

    public boolean podeEditarPlano(Usuario u, AlvoPlano p) {
        return switch (p.escopo()) {
            case TERRITORIO -> u.gestor();
            case ESCOLA -> u.gestor() || (u.coordenador() && p.escolaId().equals(u.escolaId()));
            case TURMA, ESTUDANTE -> !u.gestor() && podeVerIndividuaisDaTurma(u, p.turmaId());
        };
    }
}
