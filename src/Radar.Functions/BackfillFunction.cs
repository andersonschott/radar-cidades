using System.Globalization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Radar.Domain;

namespace Radar.Functions;

/// <summary>Carga inicial manual (SDD §8.4). Protegida por function key. O SDD dizia admin/, prefixo reservado pelo host.</summary>
public sealed class BackfillFunction(IReadOnlyList<CityConfig> cities)
{
    [Function("Backfill")]
    public BackfillOutput Run(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "ops/backfill/{city}")] HttpRequest request, string city)
    {
        ArgumentNullException.ThrowIfNull(request);
        var config = cities.SingleOrDefault(c => c.Slug == city);
        if (config is null)
        {
            return new BackfillOutput(new NotFoundResult(), null);
        }

        var since = DateOnly.TryParseExact(request.Query["since"], "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var d) ? d : config.TermStart;
        var message = new ScrapeCityMessage(config.Slug, since);
        return new BackfillOutput(new AcceptedResult((string?)null, message), message);
    }
}

public sealed record BackfillOutput(
    [property: HttpResult] IActionResult Result,
    [property: QueueOutput(QueueNames.Scrape)] ScrapeCityMessage? Message);
