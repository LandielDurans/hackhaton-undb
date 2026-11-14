-- =====================================================================
-- Evasão, quadro docente e educação especial (dados DEMONSTRATIVOS)
-- =====================================================================

-- Situação do estudante no ano letivo. Abandono registrado com data de saída.
ALTER TABLE estudante ADD COLUMN situacao VARCHAR(20) DEFAULT 'ATIVO' NOT NULL;
ALTER TABLE estudante ADD COLUMN data_saida DATE;

-- Quadro de profissionais por escola: necessidade x lotação (escola inteira).
CREATE TABLE quadro_docente (
    escola_id   VARCHAR(20) NOT NULL REFERENCES escola(id),
    funcao      VARCHAR(80) NOT NULL,
    necessarios INTEGER     NOT NULL,
    lotados     INTEGER     NOT NULL,
    PRIMARY KEY (escola_id, funcao),
    CONSTRAINT ck_quadro CHECK (necessarios >= 0 AND lotados >= 0)
);

-- Educação especial: somente contagens agregadas da escola inteira (dado sensível,
-- nenhuma marcação individual de estudante é armazenada nesta demonstração).
CREATE TABLE inclusao_escola (
    escola_id           VARCHAR(20) PRIMARY KEY REFERENCES escola(id),
    matriculas_escola   INTEGER NOT NULL,
    estudantes_aee      INTEGER NOT NULL,
    atendidos_aee       INTEGER NOT NULL,
    profissionais_apoio INTEGER NOT NULL,
    sala_recursos       BOOLEAN NOT NULL,
    CONSTRAINT ck_inclusao CHECK (atendidos_aee >= 0 AND atendidos_aee <= estudantes_aee)
);

-- A EM Sabiá passa a ficar no Bequimão (coordenadas demonstrativas).
UPDATE escola SET bairro = 'Bequimão', lat = -2.5296, lng = -44.2455 WHERE id = 'E09';
UPDATE territorio SET bairros = 'Anil, Cohab Anil, Bequimão' WHERE id = 'TER-ANI';
