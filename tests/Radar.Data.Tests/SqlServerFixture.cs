using Microsoft.EntityFrameworkCore;
using Testcontainers.MsSql;

namespace Radar.Data.Tests;

public sealed class SqlServerFixture : IAsyncLifetime
{
    private readonly MsSqlContainer container = new MsSqlBuilder("mcr.microsoft.com/mssql/server:2022-latest").Build();

    public async Task InitializeAsync()
    {
        await container.StartAsync();
        await using var db = CreateContext();
        await db.Database.MigrateAsync();
    }

    public Task DisposeAsync() => container.DisposeAsync().AsTask();

    public RadarDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<RadarDbContext>().UseSqlServer(container.GetConnectionString()).Options);
}

[CollectionDefinition(nameof(SqlServerCollection))]
public sealed class SqlServerCollection : ICollectionFixture<SqlServerFixture>;
