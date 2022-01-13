import React, { useState } from "react";
import "./App.css";

import produce from "immer";

import TextareaAutosize from "react-textarea-autosize";

import { Footer } from "./Footer";
import { shuffle } from "./utils";
import OnDeck from "./OnDeck";

import useHarmonicIntervalFn from "react-use/lib/useHarmonicIntervalFn";
import { People, ReservePerson } from "./People";
import useLocalStorage from "./useLocalStorage";

type Person = {
  name: string;
  time: number;
};

type TimerState = "Waiting" | "Ready" | "Playing" | "Done";

type State = {
  onDeck: string[];
  inProgress?: Person;
  done: Person[];
};

function App() {
  const [people, setPeople] = useLocalStorage<ReservePerson[]>("people", [
    { name: "Andrew", active: true },
    { name: "Brian" },
    { name: "Greg" },
  ]);
  const [state, setState] = useState<State>({
    onDeck: shuffle(
      (people || [])
        .filter((p: ReservePerson) => p.active)
        .map((p: ReservePerson) => p.name)
    ),
    done: [],
  });
  const [timer, setTimer] = useState<number>(0);

  var timerState: TimerState = "Ready";
  if (state.inProgress) {
    timerState = "Playing";
  } else if (state.onDeck.length === 0 && state.done.length === 0) {
    timerState = "Waiting";
  } else if (state.onDeck.length === 0) {
    timerState = "Done";
  }

  useHarmonicIntervalFn(
    () => setTimer((t) => t + 1),
    timerState === "Playing" ? 1000 : null
  );

  const handleDelete = (name: string, index: number) => {
    toggleActive({ name: name, active: true });
  };

  const handleAdd = (name: string) => {
    setPeople((p) => {
      if (p?.find((e) => e.name === name)) {
        return p;
      }
      return [...(p || []), { name: name, active: true }];
    });
    setState(
      produce((draft) => {
        if (!draft.onDeck.find((n: string) => n === name)) {
          draft.onDeck.push(name);
        }
      })
    );
  };
  const deletePerson = (person: ReservePerson) => {
    setPeople((pp) => {
      return (pp || []).filter((p) => p.name !== person.name);
    });
    setState(
      produce((draft) => {
        draft.onDeck = draft.onDeck.filter(
          (name: string) => name !== person.name
        );
        return;
      })
    );
  };

  const handleNext = () => {
    setState(
      produce((draft) => {
        setTimer(0);
        if (draft.inProgress) {
          draft.done = [...draft.done, draft.inProgress];
        }
        const nextName = draft.onDeck.shift();
        if (nextName !== undefined) {
          draft.inProgress = {
            name: nextName,
            time: 0,
          };
        } else {
          draft.inProgress = undefined;
        }
        return;
      })
    );
  };

  const toggleActive = (person: ReservePerson) => {
    const shouldActivate = !person.active;

    setPeople((pp) =>
      (pp || []).map((p: ReservePerson) => {
        if (p.name === person.name) {
          p.active = shouldActivate;
        }
        return p;
      })
    );

    setState(
      produce((draft) => {
        if (shouldActivate) {
          draft.onDeck.push(person.name);
        } else {
          draft.onDeck = draft.onDeck.filter(
            (name: string) => name !== person.name
          );
        }
      })
    );
  };

  const onDeckCount = state.onDeck.length;
  const doneCount = state.done.length;
  const inProgressOrDoneCount = doneCount + (state.inProgress ? 1 : 0);
  const totalCount = onDeckCount + inProgressOrDoneCount;

  const timerButton = {
    Ready: <button onClick={handleNext}>Start {onDeckCount}</button>,
    Playing: <button onClick={handleNext}>Next {onDeckCount}</button>,
    Done: <>All done!</>,
    Waiting: <>Please enter at least one name.</>,
  };

  var totalTime = state.inProgress?.time;
  if (state.done.length > 0) {
    totalTime = totalTime || 0;
    totalTime += state.done.reduce(
      (accumulator, currentValue) => accumulator + currentValue.time,
      0
    );
  }

  return (
    <div
      style={{
        padding: "20px",
        margin: "auto",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridGap: "10px",
      }}
    >
      <div>
        <samp style={{ fontSize: 50 }}>
          {state.inProgress ? timer + `s` : timerState}{" "}
          {state.inProgress && state.inProgress.name}
        </samp>
        <p></p>
        <div>
          {timerButton[timerState]}{" "}
          {onDeckCount > 1 && (
            <button
              onClick={() => {
                setState(
                  produce((state) => {
                    state.onDeck = shuffle(state.onDeck);
                  })
                );
              }}
            >
              Shuffle
            </button>
          )}
        </div>
        <p></p>
        <samp style={{ fontSize: 20 }}>
          {state.done.map((person, i) => (
            <div key={`done-${i}`}>
              {person.time}s {person.name}{" "}
            </div>
          ))}
          {state.inProgress && (
            <div key="in-progress">
              <b>
                {timer}s {state.inProgress.name}
              </b>
            </div>
          )}
          <p></p>
          <OnDeck
            names={state.onDeck}
            setNames={(names) =>
              setState(
                produce((state) => {
                  state.onDeck = names;
                })
              )
            }
            handleDelete={handleDelete}
          />
        </samp>
        {totalTime !== undefined && (
          <samp>
            {formatTime(totalTime) +
              ` total ${inProgressOrDoneCount} / ${totalCount}`}
            <br />
            {formatTime(
              Math.floor(totalTime / (doneCount + (state.inProgress ? 1 : 0)))
            ) + ` average`}
          </samp>
        )}

        <TextareaAutosize name="next" minRows={4} placeholder="Blockers" />
      </div>
      <div>
        <div>
          <div>
            <People
              people={people || []}
              isDisabled={(person) =>
                Boolean(
                  state.inProgress?.name === person.name ||
                    state.done.find((p) => p.name === person.name)
                )
              }
              toggleActive={toggleActive}
              addPerson={handleAdd}
              deletePerson={deletePerson}
            />
          </div>
        </div>

        <p></p>
      </div>
      <Footer />
    </div>
  );
}

export default App;

function formatTime(seconds: number): string {
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);

  return [m > 9 ? m : "0" + m || "0", s > 9 ? s : "0" + s].join(":");
}
