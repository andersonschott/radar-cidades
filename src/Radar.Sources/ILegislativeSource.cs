using Radar.Domain;

namespace Radar.Sources;

/// <summary>Adaptador de um sistema legislativo (SDD §8.1). Votos entram depois.</summary>
public interface ILegislativeSource
{
    SourceSystem System { get; }

    Task<IReadOnlyList<SourceCouncilor>> GetCouncilorsAsync(CityConfig city, CancellationToken ct);

    /// <summary><paramref name="types"/> nulo = todos os tipos coletados.</summary>
    IAsyncEnumerable<SourceProposition> GetPropositionsAsync(CityConfig city, DateOnly since, IReadOnlyCollection<PropositionType>? types, CancellationToken ct);

    Task<IReadOnlyList<SourceSessionRef>> ListSessionsAsync(CityConfig city, DateOnly since, CancellationToken ct);

    /// <summary>Uma requisição por sessão: quem chamar decide quais buscar (só as novas ou recentes).</summary>
    Task<SourceSession> GetSessionAsync(CityConfig city, SourceSessionRef session, CancellationToken ct);
}
