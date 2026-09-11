using System.Text.Json;
using DailyPill.Common.Enums;
using DailyPill.Common.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace DailyPill.Infrastructure.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Topic> Topics => Set<Topic>();
    public DbSet<TopicSchedule> TopicSchedules => Set<TopicSchedule>();
    public DbSet<Question> Questions => Set<Question>();
    public DbSet<QuizSession> QuizSessions => Set<QuizSession>();
    public DbSet<UserAnswer> UserAnswers => Set<UserAnswer>();
    public DbSet<InfoFact> InfoFacts => Set<InfoFact>();
    public DbSet<TopicContextDocument> TopicContextDocument => Set<TopicContextDocument>();
    public DbSet<Settings> Settings => Set<Settings>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Question>()
            .Property(q => q.Type)
            .HasConversion(t => QuestionTypeStrings.ToWireString(t), s => QuestionTypeStrings.FromWireString(s));

        modelBuilder.Entity<Question>()
            .Property(q => q.Options)
            .HasConversion(
                v => v == null ? null : JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => v == null ? null : JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null))
            .Metadata.SetValueComparer(new ValueComparer<List<string>?>(
                (a, b) => (a ?? new List<string>()).SequenceEqual(b ?? new List<string>()),
                v => v == null ? 0 : v.Aggregate(0, (hash, s) => HashCode.Combine(hash, s.GetHashCode())),
                v => v == null ? null : v.ToList()));

        modelBuilder.Entity<Question>()
            .ToTable(t => t.HasCheckConstraint("CK_Question_Difficulty", "\"Difficulty\" >= 1 AND \"Difficulty\" <= 5"));

        modelBuilder.Entity<TopicSchedule>()
            .HasOne(s => s.Topic)
            .WithMany(t => t.Schedules)
            .HasForeignKey(s => s.TopicId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Question>()
            .HasOne(q => q.Topic)
            .WithMany(t => t.Questions)
            .HasForeignKey(q => q.TopicId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<UserAnswer>()
            .HasOne(a => a.QuizSession)
            .WithMany(s => s.Answers)
            .HasForeignKey(a => a.QuizSessionId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<UserAnswer>()
            .HasOne(a => a.Question)
            .WithMany(q => q.Answers)
            .HasForeignKey(a => a.QuestionId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<QuizSession>()
            .HasOne(s => s.Topic)
            .WithMany()
            .HasForeignKey(s => s.TopicId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<InfoFact>()
            .HasOne(f => f.Topic)
            .WithMany()
            .HasForeignKey(f => f.TopicId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Settings>().HasData(
            new Settings
            {
                Code = "QuestionCount",
                Value = "5",
                Description = "Question count per quiz",
                LastUpdateDate = null
            }
        );
    }
}
