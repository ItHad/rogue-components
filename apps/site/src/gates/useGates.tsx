import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { GameState } from "../gacha/state";
import { useI18n } from "../i18n";
import { Modal } from "../ui/Modal";
import { GATES, type Action, type Gate, type GateRequest } from ".";

type Result = Partial<GameState> | false;

interface Active {
  gate: Gate;
  request: GateRequest;
  resolve: (result: Result) => void;
}

/**
 * 操作の前に必要な関門を順番に出す。
 * `runGates(action, request)` はすべて突破したら true、途中でやめたら false を返す。
 */
export function useGates(state: GameState, setState: Dispatch<SetStateAction<GameState>>) {
  const { t } = useI18n();
  const [active, setActive] = useState<Active | null>(null);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const runGates = useCallback(
    async (action: Action, request: GateRequest = {}) => {
      for (const gate of GATES) {
        if (!gate.actions.includes(action) || !gate.isNeeded(stateRef.current)) continue;
        const result = await new Promise<Result>((resolve) => setActive({ gate, request, resolve }));
        setActive(null);
        if (result === false) return false;
        const next = { ...stateRef.current, ...result };
        stateRef.current = next;
        setState(next);
      }
      return true;
    },
    [setState],
  );

  let gateView = null;
  if (active) {
    const { gate, request, resolve } = active;
    const body = <gate.Component key={gate.id} state={state} request={request} onPass={(patch) => resolve(patch ?? {})} />;
    gateView =
      gate.layout === "banner" ? (
        <div className="gate-banner-backdrop">
          <section className="gate-banner" aria-label={gate.title(t)}>
            {body}
          </section>
        </div>
      ) : (
        <Modal title={gate.title(t)} onClose={() => resolve(false)}>
          {body}
        </Modal>
      );
  }

  return { runGates, gateView };
}
