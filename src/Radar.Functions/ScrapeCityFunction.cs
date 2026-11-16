using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Radar.Classification;
using Radar.Data;
using Radar.Domain;
using Radar.Sources;

namespace Radar.Functions;

public sealed partial class ScrapeCityFunction(
    IReadOnlyList<CityConfig> cities,
    IServiceProvider services,
    RadarDbContext db,
    RadarStore store,
    ILogger<ScrapeCityFunction> logger)
{
    private const int BatchSize = 500;
    private const int RecentSessionDays = 14;

    [Function("ScrapeCity")]
    [QueueOutput(QueueNames.Publish)]
    public async Task<string?> Run([QueueTrigger(QueueNames.Scrape)] ScrapeCityMessage message, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(message);
        var config = cities.Single(c => c.Slug == message.City);
        // shortcut: migration aplicada pela própria Function (precisa de db_ddladmin); passar para bundle no deploy se houver mais de um app no banco.
        await db.Database.MigrateAsync(ct).ConfigureAwait(false);
        var city = await store.EnsureCityAsync(config, ct).ConfigureAwait(false);

        var since = message.Since;
        if (since is null)
        {
            var last = await store.LastSuccessfulRunAsync(city, ct).ConfigureAwait(false);
            if (last is null)
            {
                // Primeira carga é manual (SDD §8.4): POST /api/ops/backfill/{city}.
                LogNoBaseline(logger, config.Slug);
                return null;
            }

            since = DateOnly.FromDateTime(last.Value.UtcDateTime.AddDays(-7));
        }

        var run = await store.StartRunAsync(city, ct).ConfigureAwait(false);
        try
        {
            var source = services.GetRequiredKeyedService<ILegislativeSource>(config.Source);
            var councilors = await store.UpsertCouncilorsAsync(city, await source.GetCouncilorsAsync(config, ct).ConfigureAwait(false), ct).ConfigureAwait(false);
            var totals = new UpsertStats(0, 0, 0, 0);
            var batch = new List<ClassifiedProposition>(BatchSize);
            await foreach (var p in source.GetPropositionsAsync(config, since.Value, ct).ConfigureAwait(false))
            {
                batch.Add(Classify(p));
                if (batch.Count == BatchSize)
                {
                    totals = Add(totals, await store.UpsertPropositionsAsync(city, batch, ct).ConfigureAwait(false));
                    batch.Clear();
                }
            }

            totals = Add(totals, await store.UpsertPropositionsAsync(city, batch, ct).ConfigureAwait(false));
            var sessions = await CollectSessionsAsync(source, config, city, ct).ConfigureAwait(false);
            var stats = JsonSerializer.Serialize(new { since, councilors, propositions = totals, sessions });
            await store.FinishRunAsync(run, ScrapeStatus.Succeeded, stats, null, ct).ConfigureAwait(false);
            LogDone(logger, config.Slug, stats);
            return config.Slug;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            await store.FinishRunAsync(run, ScrapeStatus.Failed, null, ex.Message, CancellationToken.None).ConfigureAwait(false);
            throw;
        }
    }

    // Lista desde a posse (poucas páginas) e busca o detalhe só do que é novo ou recente: a presença pode sair dias depois.
    private async Task<object> CollectSessionsAsync(ILegislativeSource source, CityConfig config, City city, CancellationToken ct)
    {
        var known = await store.KnownSessionsAsync(city, ct).ConfigureAwait(false);
        var recent = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-RecentSessionDays);
        var listed = await source.ListSessionsAsync(config, config.TermStart, ct).ConfigureAwait(false);
        int fetched = 0, unknownAttendees = 0;
        foreach (var session in listed.Where(s => !known.ContainsKey(s.SourceId) || s.Date >= recent))
        {
            unknownAttendees += await store.UpsertSessionAsync(city, await source.GetSessionAsync(config, session, ct).ConfigureAwait(false), ct).ConfigureAwait(false);
            fetched++;
        }

        return new { listed = listed.Count, fetched, unknownAttendees };
    }

    private static ClassifiedProposition Classify(SourceProposition p)
    {
        var type = PropositionClassifier.MapType(p.RawType);
        var locations = AddressExtractor.Extract(p.Summary).Select(l => new PropositionLocation
        {
            StreetRaw = l.StreetRaw,
            StreetNormalized = l.StreetNormalized,
            NeighborhoodRaw = l.NeighborhoodRaw,
            NeighborhoodNormalized = l.NeighborhoodNormalized,
        }).ToList();
        return new ClassifiedProposition(p, type, PropositionClassifier.Classify(type, locations.Count > 0), locations);
    }

    private static UpsertStats Add(UpsertStats a, UpsertStats b) =>
        new(a.Inserted + b.Inserted, a.Updated + b.Updated, a.Unchanged + b.Unchanged, a.UnknownAuthors + b.UnknownAuthors);

    [LoggerMessage(Level = LogLevel.Warning, Message = "{City} sem coleta bem-sucedida; rode o backfill.")]
    private static partial void LogNoBaseline(ILogger logger, string city);

    [LoggerMessage(Level = LogLevel.Information, Message = "Coleta de {City} concluída: {Stats}")]
    private static partial void LogDone(ILogger logger, string city, string stats);
}
