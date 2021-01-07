import React, { useState } from "react";
import "./App.css";

import produce from "immer";

import { Footer } from "./Footer";
import { shuffle } from "./utils";
import OnDeck from "./OnDeck";
import AddPerson from "./AddPerson";

import useLocalStorage from "react-use/lib/useLocalStorage";
import useHarmonicIntervalFn from "react-use/lib/useHarmonicIntervalFn";
import { People, ReservePerson } from "./People";

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
    { name: "Andrew" },
    { name: "Brian" },
    { name: "Greg" },
  ]);
  const [state, setState] = useState<State>({
    onDeck: (people || []).filter((p) => p.active).map((p) => p.name),
    done: [],
  });

  var timerState: TimerState = "Ready";
  if (state.inProgress) {
    timerState = "Playing";
  } else if (state.onDeck.length === 0 && state.done.length == 0) {
    timerState = "Waiting";
  } else if (state.onDeck.length === 0) {
    timerState = "Done";
  }

  useHarmonicIntervalFn(
    () => {
      setState(
        produce((draft) => {
          draft.timer += 1;

          if (draft.inProgress) {
            draft.inProgress.time = draft.timer;
          }
          return;
        })
      );
    },
    timerState === "Done" ? null : 1000
  );

  const handleDelete = (name: string, index: number) => {
    toggleActive({ name: name, active: true });
  };

  const handleAdd = (name: string) => {
    if (!people?.some((e) => e.name === name)) {
      setPeople((p) => [...(p || []), { name: name, active: true }]);
      setState(
        produce((draft) => {
          draft.onDeck.push(name);
        })
      );
    }
  };

  const handleNext = () => {
    setState(
      produce((draft) => {
        draft.timer = 0;
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

    setPeople(
      (people || []).map((p: ReservePerson) => {
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
          {state.inProgress ? state.inProgress.time + `s` : timerState}{" "}
          {state.inProgress && state.inProgress.name}
        </samp>
        <p></p>
        <div>{timerButton[timerState]}</div>
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
                {state.inProgress.time}s {state.inProgress.name}
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
      </div>
      <div>
        <div>
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
          <div>
            <AddPerson onAdd={handleAdd} placeholder={"Enter a name"} />
            <People
              people={people || []}
              isDisabled={(person) =>
                Boolean(
                  state.inProgress?.name == person.name ||
                    state.done.find((p) => p.name === person.name)
                )
              }
              toggleActive={toggleActive}
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

const deleteIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    height="20"
    viewBox="0 0 24 24"
    width="20"
  >
    <path d="M0 0h24v24H0z" fill="none" />
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
  </svg>
);
