using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Radar.Domain;

namespace Radar.Data;

public sealed class RadarDbContext(DbContextOptions<RadarDbContext> options) : DbContext(options)
{
    public DbSet<City> Cities => Set<City>();
    public DbSet<Party> Parties => Set<Party>();
    public DbSet<Councilor> Councilors => Set<Councilor>();
    public DbSet<Proposition> Propositions => Set<Proposition>();
    public DbSet<ScrapeRun> ScrapeRuns => Set<ScrapeRun>();

    // Nada é deletado (SDD §6): FKs para City são Restrict, o que também evita múltiplos caminhos de cascade no SQL Server.
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        ArgumentNullException.ThrowIfNull(modelBuilder);

        modelBuilder.Entity<City>(e =>
        {
            e.HasIndex(c => c.Slug).IsUnique();
            e.Property(c => c.Slug).HasMaxLength(80);
            e.Property(c => c.Name).HasMaxLength(120);
            e.Property(c => c.Uf).HasMaxLength(2);
            e.Property(c => c.SourceSystem).HasConversion<string>().HasMaxLength(20);
            e.Property(c => c.MonthlySalary).HasPrecision(12, 2);
        });

        modelBuilder.Entity<Party>(e =>
        {
            e.HasIndex(p => p.Acronym).IsUnique();
            e.Property(p => p.Acronym).HasMaxLength(30);
            e.Property(p => p.Name).HasMaxLength(120);
        });

        modelBuilder.Entity<Councilor>(e =>
        {
            e.HasIndex(c => new { c.CityId, c.SourceId }).IsUnique();
            e.Property(c => c.SourceId).HasMaxLength(64);
            e.Property(c => c.Name).HasMaxLength(200);
            e.Property(c => c.Slug).HasMaxLength(200);
            e.HasOne<City>().WithMany().HasForeignKey(c => c.CityId).OnDelete(DeleteBehavior.Restrict);
            e.HasMany(c => c.Mandates).WithOne().HasForeignKey(m => m.CouncilorId);
        });

        modelBuilder.Entity<Proposition>(e =>
        {
            e.HasIndex(p => new { p.CityId, p.SourceId }).IsUnique();
            e.HasIndex(p => new { p.CityId, p.Category, p.PresentedOn });
            e.Property(p => p.SourceId).HasMaxLength(64);
            e.Property(p => p.RawType).HasMaxLength(120);
            e.Property(p => p.Type).HasConversion<string>().HasMaxLength(40);
            e.Property(p => p.Category).HasConversion<string>().HasMaxLength(40);
            e.Property(p => p.Status).HasMaxLength(200);
            e.Property(p => p.ContentHash).HasMaxLength(64).IsFixedLength();
            e.HasOne<City>().WithMany().HasForeignKey(p => p.CityId).OnDelete(DeleteBehavior.Restrict);
            e.HasMany(p => p.Authors).WithMany().UsingEntity("PropositionAuthor");
            e.HasMany(p => p.Locations).WithOne().HasForeignKey(l => l.PropositionId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PropositionLocation>(e =>
        {
            e.Property(l => l.StreetRaw).HasMaxLength(300);
            e.Property(l => l.StreetNormalized).HasMaxLength(300);
            e.Property(l => l.NeighborhoodRaw).HasMaxLength(300);
            e.Property(l => l.NeighborhoodNormalized).HasMaxLength(300);
            e.HasIndex(l => l.StreetNormalized);
        });

        modelBuilder.Entity<ScrapeRun>(e =>
        {
            e.Property(r => r.Status).HasConversion<string>().HasMaxLength(20);
            e.HasOne<City>().WithMany().HasForeignKey(r => r.CityId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(r => new { r.CityId, r.Status, r.StartedAt });
        });
    }
}

/// <summary>Usado só por <c>dotnet ef</c> para gerar migrations.</summary>
public sealed class DesignTimeFactory : IDesignTimeDbContextFactory<RadarDbContext>
{
    public RadarDbContext CreateDbContext(string[] args) =>
        new(new DbContextOptionsBuilder<RadarDbContext>()
            .UseSqlServer("Server=localhost;Database=radar;Integrated Security=true;TrustServerCertificate=true")
            .Options);
}
