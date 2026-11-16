using System.Runtime.CompilerServices;
using System.Text;
using Radar.Data;
using Radar.Domain;
using Radar.Publishing;

namespace Radar.Publishing.Tests;

public sealed class PublicationBuilderTests
{
    private static readonly DateTimeOffset GeneratedAt = new(2026, 11, 16, 9, 12, 0, TimeSpan.Zero);

    private static CityPublicationData SampleCity()
    {
        var city = new City
        {
            Id = 1, Slug = "santa-barbara-doeste", Name = "Santa Bárbara d'Oeste", Uf = "SP", Seats = 19,
            BaseUrl = new Uri("https://santabarbara.siscam.com.br/"), SalarySourceUrl = new Uri("https://transparencia.example/"),
            TermStart = new DateOnly(2025, 1, 1),
        };
        var ana = new Councilor { Id = 10, CityId = 1, SourceId = "v1", Name = "Ana Souza", Slug = "ana-souza", ProfileUrl = new Uri("https://camara.example/v/1") };
        ana.Mandates.Add(new Mandate { Party = new Party { Acronym = "PSD" }, Start = city.TermStart });
        var joao = new Councilor { Id = 11, CityId = 1, SourceId = "v2", Name = "João Lima", Slug = "joao-lima", ProfileUrl = new Uri("https://camara.example/v/2") };

        var indicacao = Proposition("100", PropositionType.Indicacao, PropositionCategory.PedidoBairro, "Indica tapa-buraco na Rua do Algodão, no bairro Jardim Primavera <urgente>", ana, joao);
        indicacao.Locations.Add(new PropositionLocation { StreetRaw = "Rua do Algodão", StreetNormalized = "rua do algodao", NeighborhoodRaw = "Jardim Primavera", NeighborhoodNormalized = "jardim primavera" });
        var mocao = Proposition("200", PropositionType.Mocao, PropositionCategory.Outro, "Moção de congratulação", ana);
        return new CityPublicationData(city, ["councilors", "propositions"], [ana, joao], [indicacao, mocao], GeneratedAt.AddHours(-1));
    }

    private static Proposition Proposition(string id, PropositionType type, PropositionCategory category, string summary, params Councilor[] authors)
    {
        var p = new Proposition
        {
            SourceId = id, Type = type, RawType = type.ToString(), Number = int.Parse(id, System.Globalization.CultureInfo.InvariantCulture), Year = 2025,
            PresentedOn = new DateOnly(2025, 3, 10), Summary = summary, Category = category, OfficialUrl = new Uri($"https://camara.example/p/{id}"), ContentHash = "x",
        };
        foreach (var a in authors)
        {
            p.Authors.Add(a);
        }

        return p;
    }

    [Fact]
    public void CityFiles_ProducesExpectedSet()
    {
        var files = PublicationBuilder.CityFiles(SampleCity(), GeneratedAt);

        files.Keys.ShouldBe(["meta.json", "councilors.json", "requests.json", "councilors/ana-souza.json", "councilors/joao-lima.json"], ignoreOrder: true);
    }

    [Theory]
    [InlineData("meta.json")]
    [InlineData("councilors.json")]
    [InlineData("requests.json")]
    [InlineData("councilors/ana-souza.json")]
    public void CityFiles_MatchSnapshot(string path) =>
        AssertSnapshot(path, PublicationBuilder.CityFiles(SampleCity(), GeneratedAt)[path]);

    [Fact]
    public void CitiesIndex_MatchSnapshot() =>
        AssertSnapshot("cities.json", PublicationBuilder.CitiesIndex(
            [new CitySummaryDto("santa-barbara-doeste", "Santa Bárbara d'Oeste", "SP", ["councilors", "propositions"], GeneratedAt)], GeneratedAt));

    // Snapshot sem biblioteca (SDD §9): arquivo esperado versionado; se faltar, é gerado para revisão e o teste falha.
    private static void AssertSnapshot(string path, byte[] actual, [CallerFilePath] string testFile = "")
    {
        var expectedPath = Path.Combine(Path.GetDirectoryName(testFile)!, "Expected", path);
        var actualText = Encoding.UTF8.GetString(actual).ReplaceLineEndings("\n");
        if (!File.Exists(expectedPath))
        {
            Directory.CreateDirectory(Path.GetDirectoryName(expectedPath)!);
            File.WriteAllText(expectedPath, actualText);
            Assert.Fail($"Snapshot criado em {expectedPath}; revise e rode de novo.");
        }

        actualText.ShouldBe(File.ReadAllText(expectedPath).ReplaceLineEndings("\n"));
    }
}
