package br.slz.conecta.security;

public enum Papel {
    /** Gestão da rede (SEMED): visão territorial, apenas dados agregados. */
    GESTOR_REDE,
    /** Coordenação pedagógica: escopo de uma escola, inclusive dados individuais da escola. */
    COORDENADOR,
    /** Docente: dados individuais apenas dos estudantes das suas turmas. */
    PROFESSOR
}
