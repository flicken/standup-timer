import React, { useEffect, useState } from "react";
import "./App.css";

import produce from "immer";

import { Footer } from "./Footer";
import { shuffle } from "./utils";
import OnDeck from "./OnDeck";

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
    { name: "Andrew", active: true },
    { name: "Brian" },
    { name: "Greg" },
  ]);
  const [state, setState] = useState<State>({
    onDeck: shuffle((people || [])
      .filter((p: ReservePerson) => p.active)
      .map((p: ReservePerson) => p.name)),
    done: [],
  });

  var timerState: TimerState = "Ready";
  if (state.inProgress) {
    timerState = "Playing";
  } else if (state.onDeck.length === 0 && state.done.length === 0) {
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
          {state.inProgress ? state.inProgress.time + `s` : timerState}{" "}
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

// https://usehooks-typescript.com/react-hook/use-local-storage
function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (f: (value: T) => T) => void] {
  // Get from local storage then
  // parse stored json or return initialValue
  const readValue = () => {
    // Prevent build error "window is undefined" but keep keep working
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key “${key}”:`, error);
      return initialValue;
    }
  };
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState(readValue);
  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = (f: (value: T) => T) => {
    // Prevent build error "window is undefined" but keep keep working
    if (typeof window == "undefined") {
      console.warn(
        `Tried setting localStorage key “${key}” even though environment is not a client`
      );
    }
    try {
      // Allow value to be a function so we have the same API as useState
      const newValue = f(storedValue);
      // Save to local storage
      window.localStorage.setItem(key, JSON.stringify(newValue));
      // Save state
      setStoredValue(newValue);
      // We dispatch a custom event so every useLocalStorage hook are notified
      window.dispatchEvent(new Event("local-storage"));
    } catch (error) {
      console.warn(`Error setting localStorage key “${key}”:`, error);
    }
  };
  useEffect(() => {
    setStoredValue(readValue());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const handleStorageChange = () => {
      setStoredValue(readValue());
    };
    // this only works for other documents, not the current one
    window.addEventListener("storage", handleStorageChange);
    // this is a custom event, triggered in writeValueToLocalStorage
    window.addEventListener("local-storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("local-storage", handleStorageChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [storedValue, setValue];
}
