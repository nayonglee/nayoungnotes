"use client";

import { useQuery } from "@tanstack/react-query";
import TextareaAutosize from "react-textarea-autosize";
import type { BaseballPayload } from "@/types/diary";
import styles from "@/styles/entry.module.css";

type SamsungLionsResponse = {
  team: string;
  targetDate: string;
  sourceUrl?: string;
  game: {
    date: string;
    time: string;
    venue: string;
    opponent: string;
    status: string;
  } | null;
};

export function BaseballNote({
  entryDate,
  payload,
  onChange
}: {
  entryDate: string;
  payload: BaseballPayload;
  onChange: (payload: BaseballPayload) => void;
}) {
  const update = (patch: Partial<BaseballPayload>) => onChange({ ...payload, ...patch });
  const scheduleQuery = useQuery({
    queryKey: ["samsung-lions", entryDate],
    queryFn: async () => {
      const response = await fetch(`/api/baseball/samsung-lions?date=${entryDate}`);
      if (!response.ok) throw new Error("Failed to load Samsung Lions schedule");
      return (await response.json()) as SamsungLionsResponse;
    }
  });

  const autoGame = scheduleQuery.data?.game ?? null;

  const applyAutoGame = () => {
    if (!autoGame) return;
    update({
      matchup: payload.matchup || `Samsung Lions vs ${autoGame.opponent}`,
      ballpark: payload.ballpark || autoGame.venue,
      note:
        payload.note ||
        `${autoGame.date} ${autoGame.time} · Samsung Lions vs ${autoGame.opponent} · ${autoGame.status}`,
      moment: payload.moment
    });
  };

  return (
    <div className={styles.baseballCard}>
      <div className={styles.baseballAutoCard}>
        <div className={styles.baseballAutoHeader}>
          <span className={styles.baseballChip}>Samsung Lions</span>
          <button type="button" className={styles.secondaryButton} onClick={applyAutoGame} disabled={!autoGame}>
            Use game info
          </button>
        </div>
        {autoGame ? (
          <div className={styles.baseballAutoBody}>
            <strong>{`Samsung Lions vs ${autoGame.opponent}`}</strong>
            <small>{`${autoGame.date} · ${autoGame.time} · ${autoGame.venue}`}</small>
            <small>{autoGame.status}</small>
          </div>
        ) : (
          <div className={styles.baseballAutoBody}>
            <strong>{scheduleQuery.isLoading ? "Loading Lions schedule..." : "No game found nearby"}</strong>
            <small>Official schedule will show here when it can be read.</small>
          </div>
        )}
      </div>

      <div className={styles.baseballMiniGrid}>
        <label className={styles.baseballField}>
          <span className={styles.baseballLabel}>Matchup</span>
          <input
            className={styles.baseballInput}
            value={payload.matchup}
            onChange={(event) => update({ matchup: event.target.value })}
            placeholder="Bears vs Twins"
          />
        </label>

        <label className={styles.baseballField}>
          <span className={styles.baseballLabel}>Ballpark</span>
          <input
            className={styles.baseballInput}
            value={payload.ballpark}
            onChange={(event) => update({ ballpark: event.target.value })}
            placeholder="Daegu, Jamsil..."
          />
        </label>

        <label className={styles.baseballField}>
          <span className={styles.baseballLabel}>Player</span>
          <input
            className={styles.baseballInput}
            value={payload.player}
            onChange={(event) => update({ player: event.target.value })}
            placeholder="Player, pitcher, rookie..."
          />
        </label>
      </div>

      <label className={styles.baseballField}>
        <span className={styles.baseballLabel}>Game notes</span>
        <TextareaAutosize
          className={styles.baseballTextarea}
          minRows={3}
          value={payload.note}
          onChange={(event) => update({ note: event.target.value })}
          placeholder="What you tracked, the flow, the crowd, the uniform, anything."
        />
      </label>

      <label className={styles.baseballField}>
        <span className={styles.baseballLabel}>Best moment</span>
        <TextareaAutosize
          className={styles.baseballTextarea}
          minRows={2}
          value={payload.moment}
          onChange={(event) => update({ moment: event.target.value })}
          placeholder="Home run, strikeout, chant, merch, weather..."
        />
      </label>
    </div>
  );
}
