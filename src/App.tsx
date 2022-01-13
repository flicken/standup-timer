import React, { useState, useEffect } from "react";
import "./App.css";

import TextareaAutosize from "react-textarea-autosize";

import { Footer } from "./Footer";
import { shuffle } from "./utils";
import OnDeck from "./OnDeck";

import useInterval from "react-use/lib/useInterval";
import { People } from "./People";

import { observeDeep } from "@syncedstore/core";
import { useSyncedStore } from "@syncedstore/react";
import { store, ReservePerson, Person, useSync } from "./store";

type TimerState = "Waiting" | "Ready" | "Playing" | "Done";

type State = {
  people: ReservePerson[];
  onDeck: string[];
  inProgress: Person;
  done: Person[];
};

const currentURL = window.location.href; // returns the absolute URL of a page
const pathname = window.location.pathname || "default-room"; //returns the current url minus the domain name

function App() {
  const state = useSyncedStore(store);
  const synced = useSync(currentURL);

  const now = Date.now();
  const timeElapsed = now - (state.inProgress.time || now);
  const [timer, setTimer] = useState<number>(Math.round(timeElapsed));

  var timerState: TimerState = "Ready";
  if (state.inProgress.name) {
    timerState = "Playing";
  } else if (state.onDeck.length === 0 && state.done.length === 0) {
    timerState = "Waiting";
  } else if (state.onDeck.length === 0) {
    timerState = "Done";
  } else {
    timerState = "Ready";
  }

  useEffect(() => {
    observeDeep(state.inProgress, () => {
      setTimer(0);
    });
  }, []);

  useInterval(
    () => setTimer((t) => Math.round(Math.max(t + 1, timeElapsed / 1000))),
    1000
  );

  const handleDelete = (name: string, index: number) => {
    toggleActive({ name: name, active: true });
  };

  const handleAdd = (name: string) => {
    pushUnless(state.people, (e) => e.name === name, {
      name: name,
      active: true,
    });

    pushUnless(state.onDeck, (n: string) => n === name, name);
  };

  function removeIf<A>(array: A[], f: (a: A) => boolean) {
    const index = array.findIndex(f);
    array.splice(index);
  }

  function pushUnless<A>(array: A[], f: (a: A) => boolean, item: A) {
    if (!array.find(f)) {
      array.push(item);
    }
  }

  function replaceAll<A>(array: A[], newValues: A[]) {
    array.splice(0, array.length);
    array.push(...newValues);
  }

  const deletePerson = (person: ReservePerson) => {
    removeIf(state.people, (p) => p.name === person.name);
    removeIf(state.onDeck, (p) => p === person.name);
  };

  const handleReset = () => {
    replaceAll(state.done, []);
    const onDeck: string[] = [];
    state.people.forEach((p) => {
      if (p.active) {
        onDeck.push(p.name);
      }
    });
    replaceAll(state.onDeck, onDeck);
    state.inProgress.name = undefined;
    state.inProgress.time = undefined;
  };

  const handleNext = () => {
    if (state.inProgress.name) {
      const done = { ...state.inProgress } as Person;
      done.time = Math.round(Math.max(timer, timeElapsed / 1000));
      state.done.push(done);
    }

    if (state.onDeck.length > 0) {
      state.inProgress.name = state.onDeck[0];
      state.inProgress.time = Date.now();
      state.onDeck.splice(0);
    } else {
      state.inProgress.name = undefined;
    }
  };

  const toggleActive = (person: ReservePerson) => {
    const shouldActivate = !person.active;

    person.active = !person.active;

    if (shouldActivate) {
      state.onDeck.push(person.name);
    } else {
      removeIf(state.onDeck, (name) => name === person.name);
    }
  };

  const onDeckCount = state.onDeck.length;
  const doneCount = state.done.length;
  const inProgressOrDoneCount = doneCount + (state.inProgress.name ? 1 : 0);
  const totalCount = onDeckCount + inProgressOrDoneCount;

  const timerButton = {
    Ready: <button onClick={handleNext}>Start {onDeckCount}</button>,
    Playing: <button onClick={handleNext}>Next {onDeckCount}</button>,
    Done: <button onClick={handleReset}>Reset</button>,
    Waiting: <>Please enter at least one name.</>,
  };

  var totalTime = state.inProgress?.time;
  if (state.done.length > 0) {
    totalTime = totalTime || 0;
    totalTime += Array.from(state.done).reduce(
      (accumulator, currentValue) => accumulator + currentValue.time,
      0
    );
  }

  if (!synced) {
    return <div>Loading...</div>;
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
          {state.inProgress.name
            ? `${timer}s ${state.inProgress.name}`
            : timerState}
        </samp>
        <p></p>
        <div>
          {timerButton[timerState]}{" "}
          {onDeckCount > 1 && (
            <button
              onClick={() => {
                replaceAll(state.onDeck, shuffle([...state.onDeck]));
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
          {state.inProgress.name && (
            <div key="in-progress">
              <b>
                {timer}s {state.inProgress.name}
              </b>
            </div>
          )}
          <p></p>
          <OnDeck
            names={state.onDeck}
            setNames={(names) => replaceAll(state.onDeck, names)}
            handleDelete={handleDelete}
          />
        </samp>
        {totalTime !== undefined && (
          <samp>
            {formatTime(totalTime) +
              ` total ${inProgressOrDoneCount} / ${totalCount}`}
            <br />
            {formatTime(
              Math.floor(
                totalTime / (doneCount + (state.inProgress.name ? 1 : 0))
              )
            ) + ` average`}
          </samp>
        )}

        <TextareaAutosize name="next" minRows={4} placeholder="Blockers" />
      </div>
      <div>
        <div>
          <div>
            <People
              people={state.people || []}
              isDisabled={(person) =>
                Boolean(
                  state.inProgress.name === person.name ||
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
