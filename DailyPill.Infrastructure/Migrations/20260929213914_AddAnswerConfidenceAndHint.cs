using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DailyPill.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAnswerConfidenceAndHint : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Confidence",
                table: "user_answers",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "HintUsed",
                table: "user_answers",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Confidence",
                table: "user_answers");

            migrationBuilder.DropColumn(
                name: "HintUsed",
                table: "user_answers");
        }
    }
}
