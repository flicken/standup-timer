import React, { useRef, useState } from "react";
import "./App.css";

import produce from "immer";

type Person = {
  name: string;
  time: number;
};

type TimerState = "Ready" | "Playing" | "Done";

type State = {
  onDeck: string[];
  inProgress?: Person;
  done: Person[];
};

function App() {
  const timeoutRef = useRef<any>();

  const [people, setPeople] = useState<string[]>(
    shuffle(
      JSON.parse(
        localStorage.getItem("people") || `["Brian", "Andrew", "Greg"]`
      )
    )
  );
  const [state, setState] = useState<State>({
    onDeck: people,
    done: [],
  });

  var timerState: TimerState = "Ready";
  if (state.inProgress) {
    timerState = "Playing";
  } else if (state.onDeck.length === 0) {
    timerState = "Done";
  }

  const handleAdd = (name: string) => {
    if (people.indexOf(name) === -1) {
      setPeople((p) => {
        const newPeople = [...p, name];
        localStorage.setItem("people", JSON.stringify(newPeople));
        return newPeople;
      });
      setState(
        produce((draft) => {
          draft.onDeck.push(name);
        })
      );
    }
  };

  const handleDelete = (name: string) => {
    if (people.indexOf(name) !== -1) {
      setPeople((p) => {
        const newPeople = p.filter((n: string) => n !== name);
        localStorage.setItem("people", JSON.stringify(newPeople));
        return newPeople;
      });
      setState(
        produce((draft) => {
          draft.onDeck = draft.onDeck.filter((n: string) => n !== name);
        })
      );
    }
  };

  const handleNext = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
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

    if (timerState !== "Done") {
      timeoutRef.current = setInterval(() => {
        setState(
          produce((draft) => {
            draft.timer += 1;

            if (draft.inProgress) {
              draft.inProgress.time = draft.timer;
            }
            return;
          })
        );
      }, 1000);
    }
  };

  const timerButton = {
    Ready: <button onClick={handleNext}>Start</button>,
    Playing: <button onClick={handleNext}>Next</button>,
    Done: <>All done!</>,
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
    <div>
      <h3>Standup Timer</h3>
      <div>
        <samp>
          {state.inProgress ? state.inProgress.time + `s` : timerState}
        </samp>
        <p></p>
        <div>{timerButton[timerState]}</div>
        <p></p>
        <samp style={{ fontSize: 14 }}>
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
          {state.onDeck.map((name, i) => (
            <div key={`on-deck-${i}`}>
              <span onClick={(e) => handleDelete(name)}>{deleteIcon}</span>
              {name}
            </div>
          ))}
          <p></p>
          <div>
            <AddPerson onAdd={handleAdd} />
          </div>
        </samp>
        <p></p>
      </div>
      {totalTime !== undefined && (
        <samp>{formatTime(totalTime) + ` total`}</samp>
      )}
    </div>
  );
}

export default App;

function formatTime(seconds: number): string {
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);

  return [m > 9 ? m : "0" + m || "0", s > 9 ? s : "0" + s].join(":");
}

function AddPerson({ onAdd }: { onAdd: (a: string) => any }) {
  const [value, setValue] = useState<string>("");

  return (
    <form
      id="person-form"
      onSubmit={(e) => {
        e.preventDefault();

        if (value) {
          onAdd(value);
          setValue("");
        }
      }}
    >
      <input
        type="text"
        placeholder="Late arrival"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      ></input>
      <button type="submit">Add</button>
    </form>
  );
}

const deleteIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    height="14"
    viewBox="0 0 24 24"
    width="14"
  >
    <path d="M0 0h24v24H0z" fill="none" />
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
  </svg>
);

function shuffle<T>(unshuffled: T[]): T[] {
  return unshuffled
    .map((a) => ({ sort: Math.random(), value: a }))
    .sort((a, b) => a.sort - b.sort)
    .map((a) => a.value);
}
