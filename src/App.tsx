import React, { useRef, useState } from "react";
import "./App.css";

import produce from "immer";

import { Footer } from "./Footer";
import { shuffle } from "./utils";
import OnDeck from "./OnDeck";
import AddPerson from "./AddPerson";

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
  if (people.length === 0) {
    timerState = "Waiting";
  } else if (state.inProgress) {
    timerState = "Playing";
  } else if (state.onDeck.length === 0) {
    timerState = "Done";
  }

  const handleDelete = (name: string, index: number) => {
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
    <div style={{ maxWidth: "500px", margin: "auto" }}>
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
          <div>
            <AddPerson
              onAdd={handleAdd}
              placeholder={
                timerState === "Playing" || timerState === "Done"
                  ? "Late arrival"
                  : "Enter a name"
              }
            />
          </div>
        </samp>
        <p></p>
      </div>
      {totalTime !== undefined && (
        <samp>
          {formatTime(totalTime) + ` total`}
          <br />
          {formatTime(
            Math.floor(
              totalTime / (state.done.length + (state.inProgress ? 1 : 0))
            )
          ) + ` average`}
        </samp>
      )}
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
