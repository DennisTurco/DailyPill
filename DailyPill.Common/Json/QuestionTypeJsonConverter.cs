using System.Text.Json;
using System.Text.Json.Serialization;
using DailyPill.Common.Enums;

namespace DailyPill.Common.Json;

public class QuestionTypeJsonConverter : JsonConverter<QuestionType>
{
    public override QuestionType Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var value = reader.GetString() ?? throw new JsonException("Expected a string for QuestionType");
        return QuestionTypeStrings.FromWireString(value);
    }

    public override void Write(Utf8JsonWriter writer, QuestionType value, JsonSerializerOptions options)
    {
        writer.WriteStringValue(QuestionTypeStrings.ToWireString(value));
    }
}
