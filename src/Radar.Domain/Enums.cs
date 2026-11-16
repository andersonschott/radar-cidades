namespace Radar.Domain;

public enum SourceSystem
{
    Siscam,
}

public enum PropositionType
{
    Outro,
    ProjetoLei,
    ProjetoLeiComplementar,
    ProjetoResolucao,
    ProjetoDecretoLegislativo,
    Indicacao,
    Requerimento,
    Mocao,
    Emenda,
}

public enum PropositionCategory
{
    Outro,
    Homenagem,
    PedidoBairro,
    Fiscalizacao,
    Legislacao,
    DataComemorativa,
}

public enum ScrapeStatus
{
    Running,
    Succeeded,
    Failed,
}
