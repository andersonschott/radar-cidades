namespace Radar.Functions;

/// <summary>Mensagem da fila <c>scrape-city</c>. <c>Since</c> só vem no backfill.</summary>
public sealed record ScrapeCityMessage(string City, DateOnly? Since = null);

public static class QueueNames
{
    public const string Scrape = "scrape-city";
    public const string Publish = "publish-city";
}
