"use client";

import TextareaAutosize from "react-textarea-autosize";
import type { BaseballPayload } from "@/types/diary";
import styles from "@/styles/entry.module.css";

export function BaseballNote({
  payload,
  onChange
}: {
  payload: BaseballPayload;
  onChange: (payload: BaseballPayload) => void;
}) {
  const update = (patch: Partial<BaseballPayload>) => onChange({ ...payload, ...patch });

  return (
    <div className={styles.baseballCard}>
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
            placeholder="Jamsil, Incheon..."
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
          placeholder="What you tracked, the flow of the game, the crowd, the uniform, anything."
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
