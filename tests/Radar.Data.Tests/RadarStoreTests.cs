using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Time.Testing;
using Radar.Domain;

namespace Radar.Data.Tests;

[Collection(nameof(SqlServerCollection))]
public sealed class RadarStoreTests(SqlServerFixture sql)
{
    private readonly FakeTimeProvider clock = new(new DateTimeOffset(2026, 11, 16, 9, 0, 0, TimeSpan.Zero));

    private static CityConfig Config(string slug) => new(
        slug, "Cidade Teste", "SP", 1, SourceSystem.Siscam, new Uri("https://camara.example/"), 19, 0m,
        new Uri("https://transparencia.example/"), new DateOnly(2025, 1, 1), true, ["councilors", "propositions"]);

    private static SourceProposition Indicacao(string id, string summary, params string[] authors) =>
        new(id, "Indicação", int.Parse(id, System.Globalization.CultureInfo.InvariantCulture), 2025, new DateOnly(2025, 3, 10), summary,
            new Uri($"https://camara.example/p/{id}"), authors);

    private static ClassifiedProposition Classified(SourceProposition source, string? street = null) =>
        new(source, PropositionType.Indicacao, PropositionCategory.PedidoBairro,
            street is null ? [] : [new PropositionLocation { StreetRaw = street, StreetNormalized = street.ToLowerInvariant() }]);

    private async Task<(RadarStore Store, City City, RadarDbContext Db)> SeedAsync(string slug)
    {
        var db = sql.CreateContext();
        var store = new RadarStore(db, clock);
        var city = await store.EnsureCityAsync(Config(slug), default);
        await store.UpsertCouncilorsAsync(city,
        [
            new SourceCouncilor("v1", "Ana Souza", "PSD", null, new Uri("https://camara.example/v/1")),
            new SourceCouncilor("v2", "João Lima", "PT", null, new Uri("https://camara.example/v/2")),
        ], default);
        return (store, city, db);
    }

    [Fact]
    public async Task UpsertPropositions_Twice_DoesNotDuplicate()
    {
        var (store, city, db) = await SeedAsync("idempotente");
        await using var _ = db;
        ClassifiedProposition[] batch = [Classified(Indicacao("1", "Tapa-buraco na Rua A", "v1"), "Rua A"), Classified(Indicacao("2", "Poda", "v2"))];

        var first = await store.UpsertPropositionsAsync(city, batch, default);
        clock.Advance(TimeSpan.FromDays(1));
        var second = await store.UpsertPropositionsAsync(city, batch, default);

        first.ShouldBe(new UpsertStats(2, 0, 0, 0));
        second.ShouldBe(new UpsertStats(0, 0, 2, 0));
        await using var check = sql.CreateContext();
        var stored = await check.Propositions.Include(p => p.Locations).Where(p => p.CityId == city.Id).ToListAsync();
        stored.Count.ShouldBe(2);
        stored.Single(p => p.SourceId == "1").Locations.Count.ShouldBe(1);
        stored.ShouldAllBe(p => p.LastSeenAt == clock.GetUtcNow() && p.FirstSeenAt < p.LastSeenAt);
    }

    [Fact]
    public async Task UpsertPropositions_ChangedContent_UpdatesAndReplacesChildren()
    {
        var (store, city, db) = await SeedAsync("alterado");
        await using var _ = db;
        await store.UpsertPropositionsAsync(city, [Classified(Indicacao("1", "Tapa-buraco na Rua A", "v1"), "Rua A")], default);

        var stats = await store.UpsertPropositionsAsync(city, [Classified(Indicacao("1", "Tapa-buraco na Rua B", "v1", "v2"), "Rua B")], default);

        stats.ShouldBe(new UpsertStats(0, 1, 0, 0));
        await using var check = sql.CreateContext();
        var stored = await check.Propositions.Include(p => p.Locations).Include(p => p.Authors).SingleAsync(p => p.CityId == city.Id);
        stored.Summary.ShouldBe("Tapa-buraco na Rua B");
        stored.Locations.Select(l => l.StreetRaw).ShouldBe(["Rua B"]);
        stored.Authors.Select(a => a.SourceId).ShouldBe(["v1", "v2"], ignoreOrder: true);
        (await check.Set<PropositionLocation>().CountAsync(l => l.PropositionId == stored.Id)).ShouldBe(1);
    }

    [Fact]
    public async Task UpsertPropositions_SameContentNewLocations_Reclassifies()
    {
        var (store, city, db) = await SeedAsync("reclassifica");
        await using var _ = db;
        var source = Indicacao("1", "Tapa-buraco na Rua A", "v1");
        await store.UpsertPropositionsAsync(city, [Classified(source)], default);

        var stats = await store.UpsertPropositionsAsync(city, [Classified(source, "Rua A")], default);

        stats.ShouldBe(new UpsertStats(0, 1, 0, 0));
        await using var check = sql.CreateContext();
        (await check.Propositions.Include(p => p.Locations).SingleAsync(p => p.CityId == city.Id)).Locations.Count.ShouldBe(1);
    }

    [Fact]
    public async Task UpsertPropositions_UnknownAuthor_IsCountedNotFailed()
    {
        var (store, city, db) = await SeedAsync("autor-desconhecido");
        await using var _ = db;

        var stats = await store.UpsertPropositionsAsync(city, [Classified(Indicacao("1", "Poda", "v1", "v99"))], default);

        stats.ShouldBe(new UpsertStats(1, 0, 0, 1));
    }

    [Fact]
    public async Task UpsertCouncilors_PartyChange_UpdatesCurrentMandate()
    {
        var (store, city, db) = await SeedAsync("partido");
        await using var _ = db;

        var stats = await store.UpsertCouncilorsAsync(city,
        [
            new SourceCouncilor("v1", "Ana Souza", "MDB", null, new Uri("https://camara.example/v/1")),
            new SourceCouncilor("v2", "João Lima", "PT", null, new Uri("https://camara.example/v/2")),
        ], default);

        stats.ShouldBe(new UpsertStats(0, 1, 1, 0));
        await using var check = sql.CreateContext();
        var ana = await check.Councilors.Include(c => c.Mandates).ThenInclude(m => m.Party).SingleAsync(c => c.CityId == city.Id && c.SourceId == "v1");
        ana.Mandates.ShouldHaveSingleItem().Party!.Acronym.ShouldBe("MDB");
        ana.Slug.ShouldBe("ana-souza");
    }

    [Fact]
    public async Task ScrapeRuns_LastSuccessfulRun_IgnoresFailures()
    {
        var (store, city, db) = await SeedAsync("runs");
        await using var _ = db;
        var ok = await store.StartRunAsync(city, default);
        await store.FinishRunAsync(ok, ScrapeStatus.Succeeded, "{}", null, default);
        clock.Advance(TimeSpan.FromDays(1));
        var failed = await store.StartRunAsync(city, default);
        await store.FinishRunAsync(failed, ScrapeStatus.Failed, null, "boom", default);

        (await store.LastSuccessfulRunAsync(city, default)).ShouldBe(ok.StartedAt);
    }

    [Fact]
    public async Task PublicationQueries_LoadsCouncilorsAndPropositions()
    {
        var (store, city, db) = await SeedAsync("publicacao");
        await using var _ = db;
        await store.UpsertPropositionsAsync(city, [Classified(Indicacao("1", "Tapa-buraco na Rua A", "v1"), "Rua A")], default);
        var run = await store.StartRunAsync(city, default);
        await store.FinishRunAsync(run, ScrapeStatus.Succeeded, null, null, default);

        await using var read = sql.CreateContext();
        // Salário mudado só na config (sem nova coleta) já sai na publicação.
        var data = await new PublicationQueries(read).LoadAsync(Config("publicacao") with { MonthlySalary = 14158.92m, PresidentSalary = 15921.41m }, default);

        data.City.MonthlySalary.ShouldBe(14158.92m);
        data.PresidentSalary.ShouldBe(15921.41m);

        data.Councilors.Select(c => c.Name).ShouldBe(["Ana Souza", "João Lima"]);
        data.Councilors[0].Mandates.Single().Party!.Acronym.ShouldBe("PSD");
        data.Propositions.ShouldHaveSingleItem().Authors.ShouldHaveSingleItem().Name.ShouldBe("Ana Souza");
        data.LastSuccessfulScrape.ShouldBe(clock.GetUtcNow());
        var index = await new PublicationQueries(read).LastSuccessBySlugAsync(default);
        index["publicacao"].ShouldBe(clock.GetUtcNow());
    }

    [Fact]
    public async Task UpsertSession_Twice_ReplacesAttendanceAndCountsUnknown()
    {
        var (store, city, db) = await SeedAsync("sessoes");
        var reference = new SourceSessionRef("840", "16ª Sessão Ordinária de 2025", new DateOnly(2025, 5, 6), new Uri("https://camara.example/s/840"));

        (await store.UpsertSessionAsync(city, new SourceSession(reference, true, ["v1"], ["v2", "suplente"]), default)).ShouldBe(1);
        await store.UpsertSessionAsync(city, new SourceSession(reference, true, ["v1", "v2"], []), default);

        var session = await db.Sessions.Include(s => s.Attendances).AsNoTracking().SingleAsync(s => s.CityId == city.Id);
        session.Attendances.Count.ShouldBe(2);
        session.Attendances.ShouldAllBe(a => a.Present);
        (await store.KnownSessionsAsync(city, default)).ShouldBe(new Dictionary<string, bool> { ["840"] = true });
    }
}
