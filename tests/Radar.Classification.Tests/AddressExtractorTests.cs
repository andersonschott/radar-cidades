using Radar.Classification;

namespace Radar.Classification.Tests;

public sealed class AddressExtractorTests
{
    public static TheoryData<string, string?, string?> SingleLocationCases => new()
    {
        // texto, rua normalizada, bairro normalizado
        { "Indica ao Poder Executivo a operação tapa-buraco na Rua do Algodão, no bairro Jardim Primavera.", "rua do algodao", "jardim primavera" },
        { "Indica a limpeza de terreno na Av. Monte Castelo, Jd. São Fernando", "avenida monte castelo", "jardim sao fernando" },
        { "Solicita poda de árvore na R. Dona Margarida, 123, Vila Grego", "rua dona margarida", "vila grego" },
        { "Indica sinalização de solo na Travessa Rio Branco no Parque Residencial Rochelle", "travessa rio branco", "parque residencial rochelle" },
        { "Indica recapeamento da Estrada Municipal SBO-020.", "estrada municipal sbo-020", null },
        { "Indica melhorias na iluminação da Praça Coronel Luiz Alves", "praca coronel luiz alves", null },
        { "Indica a instalação de lombada no bairro Cidade Nova", null, "cidade nova" },
        { "Indica   a   troca de lâmpadas na RUA  SANTA   BÁRBARA , centro", "rua santa barbara", null },
        // Casos reais do SISCAM de SBO (backfill de 16/11/2026): abreviação com ponto e inicial no nome.
        { "Indica ao Poder Executivo Municipal a realização de serviço de tapa-buracos na Rua Aparecido G. de Faria, n° 32, no bairro Jd. Dona Regina.", "rua aparecido g de faria", "jardim dona regina" },
        { "Indica ao Poder Executivo serviço de tapa-buraco rua México 77, bairro Jd. Sartori.", "rua mexico 77", "jardim sartori" },
        { "Indica tapa-buracos na Rua Espanha, n° 890, no bairro Jd. Europa 1.", "rua espanha", "jardim europa 1" },
        // "Praça localizada na Rua X": a palavra genérica não é nome; a rua de referência vale.
        { "Indica limpeza geral na praça localizada na Rua Holanda, defronte ao n° 2479, no bairro Jardim Europa.", "rua holanda", "jardim europa" },
        { "Indica a revitalização da praça pública do bairro Cidade Nova", null, "cidade nova" },
    };

    [Theory]
    [MemberData(nameof(SingleLocationCases))]
    public void Extract_FindsStreetAndNeighborhood(string text, string? street, string? neighborhood)
    {
        var location = AddressExtractor.Extract(text).ShouldHaveSingleItem();

        location.StreetNormalized.ShouldBe(street);
        location.NeighborhoodNormalized.ShouldBe(neighborhood);
    }

    [Fact]
    public void Extract_KeepsRawText()
    {
        var location = AddressExtractor.Extract("Indica tapa-buraco na Av. Monte Castelo, no Jd. São Fernando").ShouldHaveSingleItem();

        location.StreetRaw.ShouldBe("Av. Monte Castelo");
        location.NeighborhoodRaw.ShouldBe("Jd. São Fernando");
    }

    [Fact]
    public void Extract_FindsSeveralStreets()
    {
        var streets = AddressExtractor.Extract("Indica tapa-buraco na Rua Tupis e na Rua Tamoios, Jardim Esmeralda")
            .Select(l => l.StreetNormalized);

        streets.ShouldBe(["rua tupis", "rua tamoios"]);
    }

    [Theory]
    [InlineData("Moção de congratulação ao atleta pela conquista do campeonato.")]
    [InlineData("Requer informações sobre o contrato de coleta de lixo.")]
    [InlineData("")]
    public void Extract_NoAddress_ReturnsEmpty(string text) =>
        AddressExtractor.Extract(text).ShouldBeEmpty();
}
