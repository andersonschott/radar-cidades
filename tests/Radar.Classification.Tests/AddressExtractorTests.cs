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
