using Microsoft.EntityFrameworkCore;
using Radar.Domain;

namespace Radar.Data;

public sealed record UpsertStats(int Inserted, int Updated, int Unchanged, int UnknownAuthors);

/// <summary>Escrita idempotente (SDD §6): upsert por (CityId, SourceId), nunca deleta.</summary>
public sealed class RadarStore(RadarDbContext db, TimeProvider clock)
{
    public async Task<City> EnsureCityAsync(CityConfig config, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(config);
        var city = await db.Cities.SingleOrDefaultAsync(c => c.Slug == config.Slug, ct).ConfigureAwait(false);
        if (city is null)
        {
            city = new City { Slug = config.Slug, Name = config.Name, Uf = config.Uf, BaseUrl = config.BaseUrl, SalarySourceUrl = config.SalarySourceUrl };
            db.Cities.Add(city);
        }

        ApplyConfig(city, config);
        await db.SaveChangesAsync(ct).ConfigureAwait(false);
        return city;
    }

    /// <summary>Copia a config (fonte da verdade) para a entidade. A publicação também usa, para não depender da última coleta.</summary>
    internal static void ApplyConfig(City city, CityConfig config)
    {
        city.Name = config.Name;
        city.Uf = config.Uf;
        city.IbgeCode = config.IbgeCode;
        city.SourceSystem = config.Source;
        city.BaseUrl = config.BaseUrl;
        city.Seats = config.Seats;
        city.MonthlySalary = config.MonthlySalary;
        city.SalarySourceUrl = config.SalarySourceUrl;
        city.SalaryFrom = config.SalaryFrom;
        city.TermStart = config.TermStart;
        city.Active = config.Active;
    }

    public async Task<UpsertStats> UpsertCouncilorsAsync(City city, IEnumerable<SourceCouncilor> councilors, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(city);
        ArgumentNullException.ThrowIfNull(councilors);
        var existing = await db.Councilors.Include(c => c.Mandates).ThenInclude(m => m.Party)
            .Where(c => c.CityId == city.Id).ToDictionaryAsync(c => c.SourceId, StringComparer.Ordinal, ct).ConfigureAwait(false);
        var parties = await db.Parties.ToDictionaryAsync(p => p.Acronym, StringComparer.OrdinalIgnoreCase, ct).ConfigureAwait(false);
        int inserted = 0, updated = 0, unchanged = 0;

        foreach (var source in councilors)
        {
            var party = source.PartyAcronym is null ? null : GetOrAddParty(parties, source.PartyAcronym);
            if (!existing.TryGetValue(source.SourceId, out var councilor))
            {
                councilor = new Councilor { CityId = city.Id, SourceId = source.SourceId, Name = source.Name, Slug = TextFolding.Slug(source.Name), ProfileUrl = source.ProfileUrl, PhotoUrl = source.PhotoUrl };
                councilor.Mandates.Add(new Mandate { Party = party, Start = city.TermStart });
                db.Councilors.Add(councilor);
                existing[source.SourceId] = councilor;
                inserted++;
                continue;
            }

            // shortcut: troca de partido sobrescreve o mandato atual; abrir novo Mandate quando houver histórico de filiação na fonte.
            var mandate = councilor.Mandates.OrderByDescending(m => m.Start).FirstOrDefault();
            var changed = councilor.Name != source.Name || councilor.PhotoUrl != source.PhotoUrl
                || councilor.ProfileUrl != source.ProfileUrl || mandate?.Party?.Acronym != party?.Acronym;
            if (!changed)
            {
                unchanged++;
                continue;
            }

            councilor.Name = source.Name;
            councilor.PhotoUrl = source.PhotoUrl;
            councilor.ProfileUrl = source.ProfileUrl;
            if (mandate is null)
            {
                councilor.Mandates.Add(new Mandate { Party = party, Start = city.TermStart });
            }
            else
            {
                mandate.Party = party;
            }

            updated++;
        }

        await db.SaveChangesAsync(ct).ConfigureAwait(false);
        return new UpsertStats(inserted, updated, unchanged, 0);
    }

    public async Task<UpsertStats> UpsertPropositionsAsync(City city, IReadOnlyList<ClassifiedProposition> propositions, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(city);
        ArgumentNullException.ThrowIfNull(propositions);
        var councilors = await db.Councilors.Where(c => c.CityId == city.Id)
            .ToDictionaryAsync(c => c.SourceId, StringComparer.Ordinal, ct).ConfigureAwait(false);
        var sourceIds = propositions.Select(p => p.Source.SourceId).ToList();
        var existing = await db.Propositions.Include(p => p.Authors).Include(p => p.Locations)
            .Where(p => p.CityId == city.Id && sourceIds.Contains(p.SourceId))
            .ToDictionaryAsync(p => p.SourceId, StringComparer.Ordinal, ct).ConfigureAwait(false);
        var now = clock.GetUtcNow();
        int inserted = 0, updated = 0, unchanged = 0, unknownAuthors = 0;

        foreach (var item in propositions)
        {
            var hash = item.Source.ContentHash();
            if (existing.TryGetValue(item.Source.SourceId, out var entity))
            {
                entity.LastSeenAt = now;
                // Locais entram na comparação: melhorar o extrator reclassifica o que já foi coletado.
                if (entity.ContentHash == hash && entity.Category == item.Category && LocationKeys(entity.Locations).SequenceEqual(LocationKeys(item.Locations)))
                {
                    unchanged++;
                    continue;
                }

                entity.Authors.Clear();
                entity.Locations.Clear();
                updated++;
            }
            else
            {
                entity = new Proposition
                {
                    CityId = city.Id, SourceId = item.Source.SourceId, RawType = item.Source.RawType,
                    Summary = item.Source.Summary, OfficialUrl = item.Source.OfficialUrl, ContentHash = hash,
                    FirstSeenAt = now, LastSeenAt = now,
                };
                db.Propositions.Add(entity);
                existing[item.Source.SourceId] = entity;
                inserted++;
            }

            entity.Type = item.Type;
            entity.RawType = item.Source.RawType;
            entity.Number = item.Source.Number;
            entity.Year = item.Source.Year;
            entity.PresentedOn = item.Source.PresentedOn;
            entity.Summary = item.Source.Summary;
            entity.Status = item.Source.Status;
            entity.OfficialUrl = item.Source.OfficialUrl;
            entity.Category = item.Category;
            entity.ContentHash = hash;
            foreach (var authorId in item.Source.AuthorSourceIds.Distinct(StringComparer.Ordinal))
            {
                if (councilors.TryGetValue(authorId, out var author))
                {
                    entity.Authors.Add(author);
                }
                else
                {
                    unknownAuthors++;
                }
            }

            foreach (var location in item.Locations)
            {
                entity.Locations.Add(location);
            }
        }

        await db.SaveChangesAsync(ct).ConfigureAwait(false);
        return new UpsertStats(inserted, updated, unchanged, unknownAuthors);
    }

    /// <summary>SourceId → data das sessões já gravadas; quem coleta decide o que buscar de novo.</summary>
    /// <summary>SourceId → já tem chamada (Frequências) gravada.</summary>
    public Task<Dictionary<string, bool>> KnownSessionsAsync(City city, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(city);
        return db.Sessions.Where(s => s.CityId == city.Id).ToDictionaryAsync(s => s.SourceId, s => s.HasRollCall, StringComparer.Ordinal, ct);
    }

    /// <summary>Upsert por (CityId, SourceId); a presença é substituída inteira. Retorna nomes sem vereador gravado.</summary>
    public async Task<int> UpsertSessionAsync(City city, SourceSession source, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(city);
        ArgumentNullException.ThrowIfNull(source);
        var councilors = await db.Councilors.Where(c => c.CityId == city.Id)
            .ToDictionaryAsync(c => c.SourceId, c => c.Id, StringComparer.Ordinal, ct).ConfigureAwait(false);
        var session = await db.Sessions.Include(s => s.Attendances)
            .SingleOrDefaultAsync(s => s.CityId == city.Id && s.SourceId == source.Ref.SourceId, ct).ConfigureAwait(false);
        if (session is null)
        {
            session = new Session { CityId = city.Id, SourceId = source.Ref.SourceId, Name = source.Ref.Name, OfficialUrl = source.Ref.OfficialUrl };
            db.Sessions.Add(session);
        }

        session.Name = source.Ref.Name;
        session.Date = source.Ref.Date;
        session.OfficialUrl = source.Ref.OfficialUrl;
        session.HasRollCall = source.HasRollCall;
        session.Attendances.Clear();
        var unknown = 0;
        foreach (var (ids, present) in new[] { (source.PresentIds, true), (source.AbsentIds, false) })
        {
            foreach (var id in ids)
            {
                if (councilors.TryGetValue(id, out var councilorId))
                {
                    session.Attendances.Add(new Attendance { CouncilorId = councilorId, Present = present });
                }
                else
                {
                    unknown++;
                }
            }
        }

        await db.SaveChangesAsync(ct).ConfigureAwait(false);
        return unknown;
    }

    public async Task<ScrapeRun> StartRunAsync(City city, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(city);
        var run = new ScrapeRun { CityId = city.Id, StartedAt = clock.GetUtcNow(), Status = ScrapeStatus.Running };
        db.ScrapeRuns.Add(run);
        await db.SaveChangesAsync(ct).ConfigureAwait(false);
        return run;
    }

    public async Task FinishRunAsync(ScrapeRun run, ScrapeStatus status, string? stats, string? error, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(run);
        run.Status = status;
        run.FinishedAt = clock.GetUtcNow();
        run.Stats = stats;
        run.Error = error;
        await db.SaveChangesAsync(ct).ConfigureAwait(false);
    }

    /// <summary>Início do último run bem-sucedido; base da coleta incremental (SDD §8.2).</summary>
    public Task<DateTimeOffset?> LastSuccessfulRunAsync(City city, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(city);
        return db.ScrapeRuns.Where(r => r.CityId == city.Id && r.Status == ScrapeStatus.Succeeded)
            .MaxAsync(r => (DateTimeOffset?)r.StartedAt, ct);
    }

    private Party GetOrAddParty(Dictionary<string, Party> parties, string acronym)
    {
        if (!parties.TryGetValue(acronym, out var party))
        {
            party = new Party { Acronym = acronym };
            db.Parties.Add(party);
            parties[acronym] = party;
        }

        return party;
    }

    private static IEnumerable<string> LocationKeys(IEnumerable<PropositionLocation> locations) =>
        locations.Select(l => $"{l.StreetNormalized}|{l.NeighborhoodNormalized}").Order(StringComparer.Ordinal);
}
