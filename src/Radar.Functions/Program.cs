using Azure.Identity;
using Azure.Storage.Blobs;
using Microsoft.Azure.Functions.Worker.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Radar.Data;
using Radar.Domain;
using Radar.Functions;
using Radar.Sources;

var builder = FunctionsApplication.CreateBuilder(args);
builder.ConfigureFunctionsWebApplication();

var config = builder.Configuration;
builder.Services.AddDbContext<RadarDbContext>(o => o.UseSqlServer(
    config["SqlConnectionString"] ?? throw new InvalidOperationException("SqlConnectionString não configurada."),
    sql => sql.EnableRetryOnFailure()));
builder.Services.AddScoped<RadarStore>();
builder.Services.AddScoped<PublicationQueries>();
builder.Services.AddSingleton<IReadOnlyList<CityConfig>>(_ => CityConfigLoader.LoadAll(Path.Combine(AppContext.BaseDirectory, "cities")));
builder.Services.AddLegislativeSources(new Uri(config["SiteUrl"] ?? "https://github.com/andersonschott/radar-cidades/"));
builder.Services.AddSingleton(_ => DataContainer.Create(config));

await builder.Build().RunAsync().ConfigureAwait(false);
