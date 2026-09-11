using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DailyPill.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "settings",
                columns: table => new
                {
                    Code = table.Column<string>(type: "TEXT", nullable: false),
                    Value = table.Column<string>(type: "TEXT", nullable: true),
                    Description = table.Column<string>(type: "TEXT", maxLength: 455, nullable: true),
                    LastUpdateDate = table.Column<DateTimeOffset>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_settings", x => x.Code);
                });

            migrationBuilder.InsertData(
                table: "settings",
                columns: new[] { "Code", "Description", "LastUpdateDate", "Value" },
                values: new object[] { "QuestionCount", "Question count per quiz", null, "5" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "settings");
        }
    }
}
