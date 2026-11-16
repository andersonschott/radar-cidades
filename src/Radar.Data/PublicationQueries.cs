using Microsoft.EntityFrameworkCore;
using Radar.Domain;

namespace Radar.Data;

public sealed record CityPublicationData(
    City City,
    IReadOnlyList<string> Capabilities,
    IReadOnlyList<Councilor> Councilors,
    IReadOnlyList<Proposition> Propositions,
    DateTimeOffset? LastSuccessfulScrape,
    IReadOnlyList<Session> Sessions);

public sealed class PublicationQueries(RadarDbContext db)
{
    // shortcut: carrega todas as proposições da cidade em memória; trocar por agregação no SQL acima de ~100 mil linhas.
    public async Task<CityPublicationData> LoadAsync(CityConfig config, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(config);
        var city = await db.Cities.AsNoTracking().SingleAsync(c => c.Slug == config.Slug, ct).ConfigureAwait(false);
        var councilors = await db.Councilors.AsNoTracking().Include(c => c.Mandates).ThenInclude(m => m.Party)
            .Where(c => c.CityId == city.Id).OrderBy(c => c.Name).ToListAsync(ct).ConfigureAwait(false);
        var propositions = await db.Propositions.AsNoTracking().AsSplitQuery()
            .Include(p => p.Authors).Include(p => p.Locations)
            .Where(p => p.CityId == city.Id).OrderByDescending(p => p.PresentedOn).ThenByDescending(p => p.Number)
            .ToListAsync(ct).ConfigureAwait(false);
        var lastSuccess = await db.ScrapeRuns.Where(r => r.CityId == city.Id && r.Status == ScrapeStatus.Succeeded)
            .MaxAsync(r => (DateTimeOffset?)r.FinishedAt, ct).ConfigureAwait(false);
        var sessions = await db.Sessions.AsNoTracking().Include(s => s.Attendances)
            .Where(s => s.CityId == city.Id && s.HasRollCall).ToListAsync(ct).ConfigureAwait(false);
        return new CityPublicationData(city, config.Capabilities, councilors, propositions, lastSuccess, sessions);
    }
}
