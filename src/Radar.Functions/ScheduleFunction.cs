using Microsoft.Azure.Functions.Worker;
using Radar.Domain;

namespace Radar.Functions;

/// <summary>Timer diário (SDD §8.4): uma mensagem por cidade ativa.</summary>
public sealed class ScheduleFunction(IReadOnlyList<CityConfig> cities)
{
    [Function("ScheduleScrape")]
    [QueueOutput(QueueNames.Scrape)]
    public IReadOnlyList<ScrapeCityMessage> Run([TimerTrigger("0 0 9 * * *")] TimerInfo timer) =>
        [.. cities.Where(c => c.Active && !c.LocalCollection).Select(c => new ScrapeCityMessage(c.Slug))];
}
