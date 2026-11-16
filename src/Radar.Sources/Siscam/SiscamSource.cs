using System.Globalization;
using System.Runtime.CompilerServices;
using Microsoft.Extensions.Logging;
using Radar.Domain;

namespace Radar.Sources.Siscam;

/// <summary>Coleta do SISCAM pela versão de impressão, em janelas mensais (docs/sources/siscam.md).</summary>
public sealed partial class SiscamSource(IHttpClientFactory httpFactory, TimeProvider clock, ILogger<SiscamSource> logger) : ILegislativeSource
{
    public const string HttpClientName = "siscam";
    public const string AgentToken = "RadarCidades";

    // Código "Documento" do SISCAM (índice 74, módulo 8).
    private static readonly int[] DocumentTypes = [123, 122, 124, 117, 118, 119, 120, 121];

    private bool robotsChecked;
    private Dictionary<string, string>? aliases;

    public SourceSystem System => SourceSystem.Siscam;

    public async Task<IReadOnlyList<SourceCouncilor>> GetCouncilorsAsync(CityConfig city, CancellationToken ct) =>
        [.. (await GetCouncilorsWithAliasesAsync(city, ct).ConfigureAwait(false)).Select(c => c.Councilor)];

    public async IAsyncEnumerable<SourceProposition> GetPropositionsAsync(CityConfig city, DateOnly since, [EnumeratorCancellation] CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(city);
        // shortcut: autoria casada por nome (parlamentar ou civil); trocar pela 2ª passada por AutoriaId (docs/sources/siscam.md §3) se UnknownAuthors crescer.
        var aliases = await AliasesAsync(city, ct).ConfigureAwait(false);
        var http = httpFactory.CreateClient(HttpClientName);
        var today = DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);

        foreach (var (from, to) in MonthlyWindows(since, today))
        {
            foreach (var type in DocumentTypes)
            {
                var url = new Uri(city.BaseUrl,
                    $"Documentos/Exportar?tipo=0&Pesquisa=Avancada&id=74&Modulo=8&pagina=1&Documento={type}&DataInicial={Format(from)}&DataFinal={Format(to)}");
                var html = await http.GetStringAsync(url, ct).ConfigureAwait(false);
                var export = SiscamParser.ParseExport(html, city.BaseUrl);
                if (export.DeclaredCount is { } declared && declared != export.Items.Count)
                {
                    LogCountMismatch(logger, url, declared, export.Items.Count);
                }

                foreach (var item in export.Items)
                {
                    var authors = new List<string>();
                    foreach (var name in item.Authors)
                    {
                        if (aliases.TryGetValue(TextFolding.Fold(name), out var id))
                        {
                            authors.Add(id);
                        }
                        else
                        {
                            LogUnknownAuthor(logger, name, item.SourceId);
                        }
                    }

                    yield return new SourceProposition(item.SourceId, item.RawType, item.Number, item.Year, item.Date,
                        item.Summary, item.OfficialUrl, authors, item.Status);
                }
            }
        }
    }

    public async Task<IReadOnlyList<SourceSessionRef>> ListSessionsAsync(CityConfig city, DateOnly since, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(city);
        var http = httpFactory.CreateClient(HttpClientName);
        await CheckRobotsAsync(http, city, ct).ConfigureAwait(false);
        var to = DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);
        var sessions = new List<SourceSessionRef>();
        for (var page = 1; ; page++)
        {
            var url = new Uri(city.BaseUrl, $"Sessoes/Pesquisa?Classe=Sessao&pagina={page}&tipo=0&dataInicial={Format(since)}&dataFinal={Format(to)}");
            var list = SiscamParser.ParseSessionList(await http.GetStringAsync(url, ct).ConfigureAwait(false), city.BaseUrl);
            sessions.AddRange(list.Items);
            if (list.Items.Count == 0 || sessions.Count >= (list.DeclaredCount ?? 0))
            {
                if (list.DeclaredCount is { } declared && declared != sessions.Count)
                {
                    LogCountMismatch(logger, url, declared, sessions.Count);
                }

                return [.. sessions.DistinctBy(s => s.SourceId)];
            }
        }
    }

    public async Task<SourceSession> GetSessionAsync(CityConfig city, SourceSessionRef session, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(city);
        ArgumentNullException.ThrowIfNull(session);
        var aliases = await AliasesAsync(city, ct).ConfigureAwait(false);
        var html = await httpFactory.CreateClient(HttpClientName).GetStringAsync(session.OfficialUrl, ct).ConfigureAwait(false);
        var call = SiscamParser.ParseRollCall(html);
        if (call.CountMismatch)
        {
            LogRollCallMismatch(logger, session.OfficialUrl);
        }

        return new SourceSession(session, call.Calls > 0, Ids(call.Present), Ids(call.Absent));

        // Nome sem vereador correspondente (suplente fora da lista atual) fica de fora e vai para o log.
        List<string> Ids(IEnumerable<string> names) => [.. names.Select(n =>
        {
            if (!aliases.TryGetValue(n, out var id))
            {
                LogUnknownAttendee(logger, n, session.SourceId);
            }

            return id;
        }).OfType<string>().Distinct(StringComparer.Ordinal)];
    }

    /// <summary>Janelas de mês civil; a última vai até 31/12/2099 porque há registros com data futura.</summary>
    public static IEnumerable<(DateOnly From, DateOnly To)> MonthlyWindows(DateOnly since, DateOnly today)
    {
        for (var start = since; start <= today; start = new DateOnly(start.Year, start.Month, 1).AddMonths(1))
        {
            var monthEnd = new DateOnly(start.Year, start.Month, 1).AddMonths(1).AddDays(-1);
            yield return (start, monthEnd >= today ? new DateOnly(2099, 12, 31) : monthEnd);
        }
    }

    private async Task<Dictionary<string, string>> AliasesAsync(CityConfig city, CancellationToken ct) =>
        aliases ??= (await GetCouncilorsWithAliasesAsync(city, ct).ConfigureAwait(false))
            .SelectMany(c => c.Aliases.Select(a => (Alias: a, c.Councilor.SourceId)))
            .DistinctBy(a => a.Alias).ToDictionary(a => a.Alias, a => a.SourceId, StringComparer.Ordinal);

    private async Task CheckRobotsAsync(HttpClient http, CityConfig city, CancellationToken ct)
    {
        if (city.RobotsOverride is null)
        {
            await EnsureRobotsAllowAsync(http, city.BaseUrl, ct).ConfigureAwait(false);
        }
        else if (!robotsChecked)
        {
            LogRobotsOverride(logger, city.Slug, city.RobotsOverride);
            robotsChecked = true;
        }
    }

    private async Task<IReadOnlyList<SiscamCouncilor>> GetCouncilorsWithAliasesAsync(CityConfig city, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(city);
        var http = httpFactory.CreateClient(HttpClientName);
        await CheckRobotsAsync(http, city, ct).ConfigureAwait(false);

        var html = await http.GetStringAsync(new Uri(city.BaseUrl, "vereadores"), ct).ConfigureAwait(false);
        return SiscamParser.ParseCouncilors(html, city.BaseUrl);
    }

    private async Task EnsureRobotsAllowAsync(HttpClient http, Uri baseUrl, CancellationToken ct)
    {
        if (robotsChecked)
        {
            return;
        }

        using var response = await http.GetAsync(new Uri(baseUrl, "robots.txt"), ct).ConfigureAwait(false);
        var robots = response.IsSuccessStatusCode ? await response.Content.ReadAsStringAsync(ct).ConfigureAwait(false) : string.Empty;
        foreach (var path in new[] { "/vereadores", "/Documentos/Exportar", "/Sessoes/Pesquisa", "/Sessoes/Sessao/1" })
        {
            if (!RobotsTxt.IsAllowed(robots, AgentToken, path))
            {
                throw new InvalidOperationException($"robots.txt de {baseUrl} proíbe {path}; coleta abortada.");
            }
        }

        robotsChecked = true;
    }

    private static string Format(DateOnly date) => date.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Contagem divergente em {Url}: cabeçalho {Declared}, itens {Parsed}")]
    private static partial void LogCountMismatch(ILogger logger, Uri url, int declared, int parsed);

    [LoggerMessage(Level = LogLevel.Warning, Message = "robots.txt ignorado para {City} por decisão registrada em {Decision}")]
    private static partial void LogRobotsOverride(ILogger logger, string city, string decision);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Chamada com contagem divergente dos nomes em {Url}")]
    private static partial void LogRollCallMismatch(ILogger logger, Uri url);

    [LoggerMessage(Level = LogLevel.Information, Message = "Nome na chamada sem vereador correspondente: {Name} (sessão {SourceId})")]
    private static partial void LogUnknownAttendee(ILogger logger, string name, string sourceId);

    [LoggerMessage(Level = LogLevel.Information, Message = "Autor sem vereador correspondente: {Name} (documento {SourceId})")]
    private static partial void LogUnknownAuthor(ILogger logger, string name, string sourceId);
}
