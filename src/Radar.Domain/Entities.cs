namespace Radar.Domain;

// Entidades persistidas (SDD §6). Votos entram depois.

public sealed class City
{
    public int Id { get; set; }
    public required string Slug { get; set; }
    public required string Name { get; set; }
    public required string Uf { get; set; }
    public int IbgeCode { get; set; }
    public SourceSystem SourceSystem { get; set; }
    public required Uri BaseUrl { get; set; }
    public int Seats { get; set; }
    public decimal MonthlySalary { get; set; }
    public required Uri SalarySourceUrl { get; set; }
    public DateOnly? SalaryFrom { get; set; }
    public DateOnly TermStart { get; set; }
    public bool Active { get; set; }
}

public sealed class Party
{
    public int Id { get; set; }
    public required string Acronym { get; set; }
    public string? Name { get; set; }
}

public sealed class Councilor
{
    public int Id { get; set; }
    public int CityId { get; set; }
    public required string SourceId { get; set; }
    public required string Name { get; set; }
    public required string Slug { get; set; }
    public Uri? PhotoUrl { get; set; }
    public required Uri ProfileUrl { get; set; }
    public ICollection<Mandate> Mandates { get; } = [];
}

public sealed class Mandate
{
    public int Id { get; set; }
    public int CouncilorId { get; set; }
    public int? PartyId { get; set; }
    public Party? Party { get; set; }
    public DateOnly Start { get; set; }
    public DateOnly? End { get; set; }
    public bool IsSubstitute { get; set; }
}

public sealed class Proposition
{
    public int Id { get; set; }
    public int CityId { get; set; }
    public required string SourceId { get; set; }
    public PropositionType Type { get; set; }
    public required string RawType { get; set; }
    public int Number { get; set; }
    public int Year { get; set; }
    public DateOnly PresentedOn { get; set; }
    public required string Summary { get; set; }
    public string? Status { get; set; }
    public required Uri OfficialUrl { get; set; }
    public PropositionCategory Category { get; set; }
    public required string ContentHash { get; set; }
    public DateTimeOffset FirstSeenAt { get; set; }
    public DateTimeOffset LastSeenAt { get; set; }
    public ICollection<Councilor> Authors { get; } = [];
    public ICollection<PropositionLocation> Locations { get; } = [];
}

public sealed class PropositionLocation
{
    public int Id { get; set; }
    public int PropositionId { get; set; }
    public string? StreetRaw { get; set; }
    public string? StreetNormalized { get; set; }
    public string? NeighborhoodRaw { get; set; }
    public string? NeighborhoodNormalized { get; set; }
}

public sealed class ScrapeRun
{
    public int Id { get; set; }
    public int CityId { get; set; }
    public DateTimeOffset StartedAt { get; set; }
    public DateTimeOffset? FinishedAt { get; set; }
    public ScrapeStatus Status { get; set; }
    public string? Stats { get; set; }
    public string? Error { get; set; }
}

public sealed class Session
{
    public int Id { get; set; }
    public int CityId { get; set; }
    public required string SourceId { get; set; }
    public required string Name { get; set; }
    public DateOnly Date { get; set; }
    public required Uri OfficialUrl { get; set; }

    /// <summary>Falso quando a fonte não publicou chamada (sessão solene, audiência): fica fora da conta de presença.</summary>
    public bool HasRollCall { get; set; }

    public ICollection<Attendance> Attendances { get; } = [];
}

/// <summary>Uma linha por vereador chamado. A fonte não marca ausência justificada (docs/sources/siscam.md §4).</summary>
public sealed class Attendance
{
    public int SessionId { get; set; }
    public int CouncilorId { get; set; }
    public bool Present { get; set; }
}
