using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DailyPill.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTutorStyleSetting : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "settings",
                columns: new[] { "Code", "Description", "LastUpdateDate", "Value" },
                values: new object[] { "TutorStyle", "Tone of the AI tutor: friendly, professional, strict, socratic or interviewer", null, "friendly" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "settings",
                keyColumn: "Code",
                keyValue: "TutorStyle");
        }
    }
}
