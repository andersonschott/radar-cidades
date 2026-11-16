namespace Radar.Domain;

/// <summary>Configuração de uma cidade, lida de <c>cities/{slug}.json</c> (fonte da verdade).
/// <c>RobotsOverride</c>: referência à ADR que autoriza coletar apesar do robots.txt; nulo = respeitar.
/// <c>SalaryFrom</c>: início da vigência de <c>MonthlySalary</c> (pode ser depois da posse).
/// <c>AccentColor</c>: cor de destaque da cidade ("#rrggbb"), tirada da bandeira ou do brasão; nulo = neutro.</summary>
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
    IReadOnlyList<string> Capabilities,
    string? RobotsOverride = null,
    DateOnly? SalaryFrom = null,
    string? AccentColor = null);
