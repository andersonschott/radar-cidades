using Radar.Classification;
using Radar.Domain;

namespace Radar.Classification.Tests;

public sealed class PropositionClassifierTests
{
    [Theory]
    [InlineData(PropositionType.Indicacao, false, PropositionCategory.PedidoBairro)]
    [InlineData(PropositionType.Indicacao, true, PropositionCategory.PedidoBairro)]
    [InlineData(PropositionType.Requerimento, true, PropositionCategory.PedidoBairro)]
    [InlineData(PropositionType.Requerimento, false, PropositionCategory.Outro)]
    [InlineData(PropositionType.ProjetoLei, true, PropositionCategory.Outro)]
    [InlineData(PropositionType.Mocao, false, PropositionCategory.Outro)]
    public void Classify_SeparatesNeighborhoodRequests(PropositionType type, bool hasAddress, PropositionCategory expected) =>
        PropositionClassifier.Classify(type, hasAddress).ShouldBe(expected);

    [Theory]
    [InlineData("Indicação", PropositionType.Indicacao)]
    [InlineData("INDICAÇÃO", PropositionType.Indicacao)]
    [InlineData("Requerimento", PropositionType.Requerimento)]
    [InlineData("Moção", PropositionType.Mocao)]
    [InlineData("Projeto de Lei", PropositionType.ProjetoLei)]
    [InlineData("Projeto de Lei Complementar", PropositionType.ProjetoLeiComplementar)]
    [InlineData("Projeto de Resolução", PropositionType.ProjetoResolucao)]
    [InlineData("Projeto de Resolução Municipal", PropositionType.ProjetoResolucao)]
    [InlineData("Projeto de Decreto Legislativo", PropositionType.ProjetoDecretoLegislativo)]
    [InlineData("Emenda", PropositionType.Emenda)]
    [InlineData("Ofício", PropositionType.Outro)]
    public void MapType_MapsRawSourceType(string raw, PropositionType expected) =>
        PropositionClassifier.MapType(raw).ShouldBe(expected);
}
