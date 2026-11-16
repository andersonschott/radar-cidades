using Radar.Domain;

namespace Radar.Sources;

/// <summary>Adaptador de um sistema legislativo (SDD §8.1). Sessões, presença e votos entram no M2.</summary>
public interface ILegislativeSource
{
    SourceSystem System { get; }

    Task<IReadOnlyList<SourceCouncilor>> GetCouncilorsAsync(CityConfig city, CancellationToken ct);

    IAsyncEnumerable<SourceProposition> GetPropositionsAsync(CityConfig city, DateOnly since, CancellationToken ct);
}
