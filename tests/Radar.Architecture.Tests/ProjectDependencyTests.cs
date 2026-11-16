using System.Xml.Linq;

namespace Radar.Architecture.Tests;

// Regras de dependência do SDD §5, checadas nas ProjectReference dos .csproj
// (vale mesmo antes de os projetos terem tipos, quando NetArchTest não enxerga nada).
public sealed class ProjectDependencyTests
{
    private static readonly Dictionary<string, string[]> Allowed = new(StringComparer.Ordinal)
    {
        ["Radar.Domain"] = [],
        ["Radar.Classification"] = ["Radar.Domain"],
        ["Radar.Sources"] = ["Radar.Domain"],
        ["Radar.Data"] = ["Radar.Domain"],
        ["Radar.Publishing"] = ["Radar.Domain", "Radar.Data"],
    };

    public static TheoryData<string> SourceProjects => [.. Allowed.Keys];

    [Theory]
    [MemberData(nameof(SourceProjects))]
    public void Project_ReferencesOnlyAllowedProjects(string project)
    {
        var references = ProjectReferences(Path.Combine(RepoRoot, "src", project, $"{project}.csproj"));

        references.ShouldBeSubsetOf(Allowed[project]);
    }

    [Fact]
    public void NoProject_ReferencesFunctions()
    {
        var offenders = Directory.EnumerateFiles(RepoRoot, "*.csproj", SearchOption.AllDirectories)
            .Where(csproj => ProjectReferences(csproj).Contains("Radar.Functions"))
            .Select(Path.GetFileNameWithoutExtension);

        offenders.ShouldBeEmpty();
    }

    [Fact]
    public void AllSourceProjects_AreCovered()
    {
        var projects = Directory.GetDirectories(Path.Combine(RepoRoot, "src")).Select(Path.GetFileName);

        projects.Where(p => p != "Radar.Functions").ShouldBe(Allowed.Keys, ignoreOrder: true);
    }

    private static string[] ProjectReferences(string csproj) =>
        [.. XDocument.Load(csproj).Descendants("ProjectReference")
            .Select(r => Path.GetFileNameWithoutExtension(r.Attribute("Include")!.Value.Replace('\\', '/')))];

    private static string RepoRoot { get; } = FindRepoRoot();

    private static string FindRepoRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null && !File.Exists(Path.Combine(dir.FullName, "Radar.slnx")))
        {
            dir = dir.Parent;
        }

        return dir?.FullName ?? throw new InvalidOperationException("Radar.slnx não encontrado acima de " + AppContext.BaseDirectory);
    }
}
