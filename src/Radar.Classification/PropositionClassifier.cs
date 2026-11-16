using Radar.Domain;

namespace Radar.Classification;

/// <summary>Categoria da proposição (SDD §7.1). No M1 só separa pedidos para bairros do resto.</summary>
public static class PropositionClassifier
{
    public static PropositionCategory Classify(PropositionType type, bool hasAddress) => type switch
    {
        PropositionType.Indicacao => PropositionCategory.PedidoBairro,
        PropositionType.Requerimento when hasAddress => PropositionCategory.PedidoBairro,
        _ => PropositionCategory.Outro,
    };

    /// <summary>Tipo bruto da fonte → enum. Desconhecido vira <see cref="PropositionType.Outro"/>; quem chama loga.</summary>
    public static PropositionType MapType(string rawType) => TextNormalizer.Fold(rawType) switch
    {
        "indicacao" => PropositionType.Indicacao,
        "requerimento" => PropositionType.Requerimento,
        "mocao" => PropositionType.Mocao,
        "projeto de lei" => PropositionType.ProjetoLei,
        "projeto de lei complementar" => PropositionType.ProjetoLeiComplementar,
        "projeto de resolucao" or "projeto de resolucao municipal" => PropositionType.ProjetoResolucao,
        "projeto de decreto legislativo" => PropositionType.ProjetoDecretoLegislativo,
        "emenda" => PropositionType.Emenda,
        _ => PropositionType.Outro,
    };
}
