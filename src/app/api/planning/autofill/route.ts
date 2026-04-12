import { NextResponse } from "next/server";
import { buildPlanningPrompt } from "@/lib/planning-ai";
import type { DayType, TeachingPayload, TeachingSubject } from "@/types/diary";

type AutofillRequest = {
  entryDate: string;
  teaching: TeachingPayload;
};

type AutofillResponse = {
  dayType: DayType;
  medSchoolFocus: string;
  academyWork: string;
  pokePrompt: string;
  aiDraftSummary: string;
  subjects: {
    id: string;
    label: string;
    checked: boolean;
    note: string;
  }[];
  planner: {
    time: string;
    title: string;
    note: string;
  }[];
  todo: {
    text: string;
    checked: boolean;
  }[];
};

function isSubjectArray(value: unknown): value is TeachingSubject[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.label === "string" &&
        typeof item.checked === "boolean" &&
        typeof item.note === "string"
    )
  );
}

function getApiKey() {
  return process.env.OPENAI_API_KEY ?? "";
}

function getModel() {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

function jsonSchema() {
  return {
    name: "nayoungnotes_plan",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        dayType: {
          type: "string",
          enum: ["school", "teaching", "prep", "reset"]
        },
        medSchoolFocus: {
          type: "string"
        },
        academyWork: {
          type: "string"
        },
        pokePrompt: {
          type: "string"
        },
        aiDraftSummary: {
          type: "string"
        },
        subjects: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "string" },
              label: { type: "string" },
              checked: { type: "boolean" },
              note: { type: "string" }
            },
            required: ["id", "label", "checked", "note"]
          }
        },
        planner: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              time: { type: "string" },
              title: { type: "string" },
              note: { type: "string" }
            },
            required: ["time", "title", "note"]
          }
        },
        todo: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              text: { type: "string" },
              checked: { type: "boolean" }
            },
            required: ["text", "checked"]
          }
        }
      },
      required: [
        "dayType",
        "medSchoolFocus",
        "academyWork",
        "pokePrompt",
        "aiDraftSummary",
        "subjects",
        "planner",
        "todo"
      ]
    }
  } as const;
}

function normalizeAutofill(parsed: AutofillResponse, teaching: TeachingPayload): AutofillResponse {
  const allowedSubjects = new Map(teaching.subjects.map((subject) => [subject.id, subject]));
  const nextSubjects = teaching.subjects.map((subject) => {
    const fromModel = parsed.subjects.find((item) => item.id === subject.id);
    if (!fromModel) return subject;
    return {
      id: subject.id,
      label: subject.label,
      checked: Boolean(fromModel.checked),
      note: fromModel.note || ""
    };
  });

  return {
    ...parsed,
    subjects: nextSubjects.filter((subject) => allowedSubjects.has(subject.id)),
    planner: parsed.planner.slice(0, 8).map((block) => ({
      time: block.time,
      title: block.title,
      note: block.note
    })),
    todo: parsed.todo.slice(0, 8).map((item) => ({
      text: item.text,
      checked: Boolean(item.checked)
    }))
  };
}

export async function POST(request: Request) {
  if (!getApiKey()) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is missing. Add it in .env.local to enable AI autofill." },
      { status: 503 }
    );
  }

  let body: AutofillRequest;
  try {
    body = (await request.json()) as AutofillRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body?.entryDate || !body.teaching || !isSubjectArray(body.teaching.subjects)) {
    return NextResponse.json({ error: "Missing entry date or teaching data." }, { status: 400 });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey()}`
      },
      body: JSON.stringify({
        model: getModel(),
        input: [
          {
            role: "developer",
            content:
              "You help fill one personal diary page for one user. Make the plan realistic, flexible, and not over-professional. Respect weekly changes over default routine. Keep time blocks short and human, and avoid over-scheduling."
          },
          {
            role: "user",
            content: buildPlanningPrompt(body.entryDate, body.teaching, "json")
          }
        ],
        text: {
          format: {
            type: "json_schema",
            ...jsonSchema()
          }
        },
        max_output_tokens: 900
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: "OpenAI request failed.",
          detail: errorText
        },
        { status: 502 }
      );
    }

    const json = (await response.json()) as { output_text?: string };
    const outputText = json.output_text;
    if (!outputText) {
      return NextResponse.json({ error: "AI returned an empty response." }, { status: 502 });
    }

    const parsed = JSON.parse(outputText) as AutofillResponse;
    return NextResponse.json(normalizeAutofill(parsed, body.teaching));
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to generate AI autofill.",
        detail: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
