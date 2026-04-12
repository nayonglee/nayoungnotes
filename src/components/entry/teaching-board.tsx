"use client";

import { useMemo, useState, useTransition } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { buildPlanningPrompt, applyPlanningDraft } from "@/lib/planning-ai";
import {
  createPlannerBlock,
  createPlannerTemplate,
  createTeachingPayload,
  createTodoCard,
  createTodoTemplate
} from "@/lib/entry";
import type { DayType, PlannerBlock, TeachingPayload, TodoCard } from "@/types/diary";
import styles from "@/styles/entry.module.css";

const dayTypeLabels: Record<DayType, string> = {
  school: "School",
  teaching: "Teaching",
  prep: "Prep",
  reset: "Reset"
};

export function TeachingBoard({
  entryDate,
  payload,
  onChange,
  onApplyTemplate,
  onApplyPlan
}: {
  entryDate: string;
  payload: TeachingPayload;
  onChange: (payload: TeachingPayload) => void;
  onApplyTemplate: (template: {
    teaching: TeachingPayload;
    planner: PlannerBlock[];
    todo: TodoCard[];
  }) => void;
  onApplyPlan: (template: {
    teaching: TeachingPayload;
    planner?: PlannerBlock[];
    todo?: TodoCard[];
  }) => void;
}) {
  const [helperText, setHelperText] = useState("");
  const [isPending, startTransition] = useTransition();
  const update = (patch: Partial<TeachingPayload>) => onChange({ ...payload, ...patch });
  const promptText = useMemo(() => buildPlanningPrompt(entryDate, payload), [entryDate, payload]);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(promptText);
      setHelperText("Prompt copied. Paste it into Poke, then paste the reply back here.");
    } catch {
      setHelperText("Clipboard was blocked. You can still copy the prompt from the text area.");
    }
  };

  const handleApplyDraft = () => {
    if (!payload.aiDraft.trim()) {
      setHelperText("Paste an AI plan first, then apply it.");
      return;
    }

    const parsed = applyPlanningDraft(payload, payload.aiDraft);
    onApplyPlan(parsed);
    setHelperText("AI plan applied to this page.");
  };

  const handleAutofill = () => {
    startTransition(() => {
      void (async () => {
      setHelperText("Asking AI to build today's plan...");

      try {
        const response = await fetch("/api/planning/autofill", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            entryDate,
            teaching: payload
          })
        });

        const data = (await response.json()) as
          | {
              error?: string;
              detail?: string;
            }
          | {
              dayType: DayType;
              medSchoolFocus: string;
              academyWork: string;
              pokePrompt: string;
              aiDraftSummary: string;
              subjects: TeachingPayload["subjects"];
              planner: { time: string; title: string; note: string }[];
              todo: { text: string; checked: boolean }[];
            };

        if (!response.ok || !("planner" in data)) {
          const message =
            "error" in data && data.error
              ? `${data.error}${data.detail ? ` ${data.detail}` : ""}`
              : "AI autofill failed.";
          setHelperText(message);
          return;
        }

        onApplyPlan({
          teaching: {
            ...payload,
            dayType: data.dayType,
            medSchoolFocus: data.medSchoolFocus,
            academyWork: data.academyWork,
            pokePrompt: data.pokePrompt,
            aiDraft: data.aiDraftSummary,
            subjects: data.subjects
          },
          planner: data.planner.map((block) => ({
            ...createPlannerBlock(block.time),
            time: block.time,
            title: block.title,
            note: block.note
          })),
          todo: data.todo.map((item) => ({
            ...createTodoCard(item.text),
            text: item.text,
            checked: item.checked
          }))
        });

        setHelperText("AI filled this page from your weekly changes.");
      } catch (error) {
        setHelperText(error instanceof Error ? error.message : "AI autofill failed.");
      }
      })();
    });
  };

  return (
    <div className={styles.teachingBoard}>
      <div className={styles.teachingHeader}>
        <div className={styles.inlineButtons}>
          {(Object.keys(dayTypeLabels) as DayType[]).map((dayType) => (
            <button
              key={dayType}
              type="button"
              className={payload.dayType === dayType ? styles.secondaryActive : styles.secondaryButton}
              onClick={() => update({ dayType })}
            >
              {dayTypeLabels[dayType]}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() =>
            onApplyTemplate({
              teaching: createTeachingPayload(entryDate, "baseline"),
              planner: createPlannerTemplate(entryDate, "baseline"),
              todo: createTodoTemplate(entryDate, "baseline")
            })
          }
        >
          Reset baseline
        </button>
      </div>

      <label className={styles.baseballField}>
        <span className={styles.baseballLabel}>Week changes</span>
        <TextareaAutosize
          className={styles.baseballTextarea}
          minRows={3}
          value={payload.weekContext}
          onChange={(event) => update({ weekContext: event.target.value })}
          placeholder="This week OSCE is close, Sunday class moved later, academy mock on Friday, AP student wants extra FRQ..."
        />
      </label>

      <div className={styles.teachingMiniGrid}>
        {payload.subjects.map((subject) => (
          <label key={subject.id} className={styles.subjectCard}>
            <div className={styles.subjectTop}>
              <button
                type="button"
                className={styles.todoCheck}
                data-checked={subject.checked}
                onClick={() =>
                  update({
                    subjects: payload.subjects.map((item) =>
                      item.id === subject.id ? { ...item, checked: !item.checked } : item
                    )
                  })
                }
              />
              <span>{subject.label}</span>
            </div>
            <TextareaAutosize
              className={styles.subjectNoteInput}
              minRows={1}
              value={subject.note}
              onChange={(event) =>
                update({
                  subjects: payload.subjects.map((item) =>
                    item.id === subject.id ? { ...item, note: event.target.value } : item
                  )
                })
              }
              placeholder="What matters this week"
            />
          </label>
        ))}
      </div>

      <div className={styles.teachingSplitGrid}>
        <label className={styles.baseballField}>
          <span className={styles.baseballLabel}>Med focus</span>
          <TextareaAutosize
            className={styles.baseballTextarea}
            minRows={2}
            value={payload.medSchoolFocus}
            onChange={(event) => update({ medSchoolFocus: event.target.value })}
            placeholder="What absolutely has to stay protected for med school"
          />
        </label>

        <label className={styles.baseballField}>
          <span className={styles.baseballLabel}>Academy focus</span>
          <TextareaAutosize
            className={styles.baseballTextarea}
            minRows={2}
            value={payload.academyWork}
            onChange={(event) => update({ academyWork: event.target.value })}
            placeholder="Only the prep, feedback, or admin that really matters this week"
          />
        </label>
      </div>

      <div className={styles.aiPlannerCard}>
        <div className={styles.sectionHeader}>
          <h4>AI planning</h4>
        </div>

        <label className={styles.baseballField}>
          <span className={styles.baseballLabel}>AI note</span>
          <TextareaAutosize
            className={styles.baseballTextarea}
            minRows={2}
            value={payload.pokePrompt}
            onChange={(event) => update({ pokePrompt: event.target.value })}
            placeholder="Anything extra the AI should respect for this day"
          />
        </label>

        <label className={styles.baseballField}>
          <span className={styles.baseballLabel}>Prompt</span>
          <TextareaAutosize className={styles.aiPromptPreview} minRows={7} value={promptText} readOnly />
        </label>

        <label className={styles.baseballField}>
          <span className={styles.baseballLabel}>Paste AI reply</span>
          <TextareaAutosize
            className={styles.baseballTextarea}
            minRows={7}
            value={payload.aiDraft}
            onChange={(event) => update({ aiDraft: event.target.value })}
            placeholder="Paste the AI plan here, then apply it to this page."
          />
        </label>

        <div className={styles.teachingActionRow}>
          <button type="button" className={styles.primaryButton} onClick={handleAutofill} disabled={isPending}>
            {isPending ? "Filling..." : "Autofill with AI"}
          </button>
          <button type="button" className={styles.secondaryButton} onClick={handleCopyPrompt}>
            Copy prompt
          </button>
          <button type="button" className={styles.primaryButton} onClick={handleApplyDraft}>
            Apply AI plan
          </button>
        </div>

        {helperText ? <p className={styles.sectionHint}>{helperText}</p> : null}
      </div>
    </div>
  );
}
