using Microsoft.Extensions.DependencyInjection;
using Radar.Domain;
using Radar.Sources.Siscam;

namespace Radar.Sources;

public static class SourcesServiceCollectionExtensions
{
    /// <summary>Registra os adaptadores com a etiqueta de coleta (SDD §8.2).</summary>
    public static IServiceCollection AddLegislativeSources(this IServiceCollection services, Uri siteUrl)
    {
        ArgumentNullException.ThrowIfNull(siteUrl);
        services.AddTransient<PoliteHandler>();
        services.AddHttpClient(SiscamSource.HttpClientName, c =>
            {
                c.DefaultRequestHeaders.UserAgent.ParseAdd($"{SiscamSource.AgentToken}/1.0 (+{new Uri(siteUrl, "metodologia")})");
                c.Timeout = TimeSpan.FromMinutes(2);
            })
            .AddHttpMessageHandler<PoliteHandler>()
            .AddStandardResilienceHandler(o =>
            {
                o.Retry.MaxRetryAttempts = 3;
                // 4xx não se repete (SDD §8.2): só 5xx, 408 e falhas de rede.
                o.Retry.ShouldHandle = args => ValueTask.FromResult(
                    args.Outcome.Exception is HttpRequestException or TimeoutException
                    || args.Outcome.Result is { } r && ((int)r.StatusCode >= 500 || (int)r.StatusCode == 408));
                o.AttemptTimeout.Timeout = TimeSpan.FromSeconds(90);
                o.TotalRequestTimeout.Timeout = TimeSpan.FromMinutes(6);
                o.CircuitBreaker.SamplingDuration = TimeSpan.FromMinutes(3);
            });
        services.AddKeyedScoped<ILegislativeSource, SiscamSource>(SourceSystem.Siscam);
        services.AddSingleton(TimeProvider.System);
        return services;
    }
}
