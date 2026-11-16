namespace Radar.Domain;

/// <summary>Configuração de uma cidade, lida de <c>cities/{slug}.json</c> (fonte da verdade).</summary>
public sealed record CityConfig(
    string Slug,
    string Name,
    string Uf,
    int IbgeCode,
    SourceSystem Source,
    Uri BaseUrl,
    int Seats,
    decimal MonthlySalary,
    Uri SalarySourceUrl,
    DateOnly TermStart,
    bool Active,
    IReadOnlyList<string> Capabilities);
