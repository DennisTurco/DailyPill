using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DailyPill.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAnswerFollowUp : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FollowUpAnswer",
                table: "user_answers",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FollowUpFeedback",
                table: "user_answers",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FollowUpQuestion",
                table: "user_answers",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "ScoreBeforeFollowUp",
                table: "user_answers",
                type: "REAL",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FollowUpAnswer",
                table: "user_answers");

            migrationBuilder.DropColumn(
                name: "FollowUpFeedback",
                table: "user_answers");

            migrationBuilder.DropColumn(
                name: "FollowUpQuestion",
                table: "user_answers");

            migrationBuilder.DropColumn(
                name: "ScoreBeforeFollowUp",
                table: "user_answers");
        }
    }
}
