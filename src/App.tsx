import React, { useState, useEffect } from "react";
import "./App.css";

import TextareaAutosize from "react-textarea-autosize";

import { Footer } from "./Footer";
import { shuffle } from "./utils";
import OnDeck from "./OnDeck";

import useHarmonicIntervalFn from "react-use/lib/useHarmonicIntervalFn";
import { People, ReservePerson } from "./People";

import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { WebrtcProvider } from "y-webrtc";

type Person = {
  name: string;
  active?: boolean;
  time: number;
};

type TimerState = "Waiting" | "Ready" | "Playing" | "Done";

type State = {
  onDeck: string[];
  inProgress?: Person;
  done: Person[];
  timer: number;
};

const ydoc = new Y.Doc();

const yPeople = ydoc.getMap("people");
const yState = ydoc.getMap("state");

if (!yState.has("onDeck")) {
  yState.set("onDeck", new Y.Array());
}
if (!yState.has("done")) {
  yState.set("done", new Y.Array());
}

function getOnDeck(yState: Y.Map<any>): Y.Array<string> {
  return yState.get("onDeck");
}

function getDone(yState: Y.Map<any>): Y.Array<any> {
  return yState.get("done");
}

function stateFromDocs(
  yState: Y.Map<any>,
  yPeople: Y.Map<any>,
  shouldShuffle: boolean = false
): State {
  const inProgressName = yState.get("inProgress");
  const done = (getDone(yState).toArray() || [])
    .flatMap((name) => {
      const person = yPeople.get(name) as Y.Map<any>;
      return person?.toJSON();
    })
    .filter((k) => k);
  const onDeck = getOnDeck(yState).toArray();
  const state = {
    onDeck: shouldShuffle ? shuffle(onDeck) : onDeck,
    inProgress: (yPeople.get(inProgressName) as Y.Map<any>)?.toJSON(),
    done: done,
    timer: yState.get("timer") as number,
  };
  return state;
}

function peopleFromDocs(yState: Y.Map<any>, yPeople: Y.Map<any>): Person[] {
  const people: Person[] = [];
  yPeople.forEach((value, key) => {
    const person = (value as Y.Map<any>)?.toJSON() as Person;
    if (person) {
      people.push(person);
    }
  });
  return people;
}

function App() {
  const [people, setPeople] = useState<Person[]>(() =>
    peopleFromDocs(yState, yPeople)
  );
  const [state, setState] = useState<State>(() =>
    stateFromDocs(yState, yPeople, true)
  );
  const [timer, setTimer] = useState<number | undefined>(() => {
    const start = yState.get("start") as number;
    if (start) {
      return Date.now() - start;
    } else {
      return 0;
    }
  });
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    const observer = (allEvents: any) => {
      if (allEvents.find((e: Y.YEvent) => e.changes.keys.has("start"))) {
        setTimer(0);
      }
      setState(() => stateFromDocs(yState, yPeople));
    };
    yState.observeDeep(observer);
    return () => {
      yState.unobserveDeep(observer);
    };
  }, []);

  useEffect(() => {
    const observer = (event: any) => {
      setPeople(() => peopleFromDocs(yState, yPeople));
    };
    yPeople.observeDeep(observer);

    return () => {
      yPeople.unobserveDeep(observer);
    };
  }, []);

  useEffect(() => {
    try {
      const webrtc = new WebrtcProvider("standup.flicken.net", ydoc, {
        password: "standup.flicken.net",
      } as any);
      return () => {
        webrtc.disconnect();
      };
    } catch {
      /* */
    }
  }, []);

  useEffect(() => {
    const provider = new IndexeddbPersistence("standup", ydoc);

    provider.on("synced", () => {
      setSynced(true);
    });
  }, []);

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
      if (timerState === "Playing") {
        setTimer((timer) => (timer || 0) + 1);
      }
    },
    timerState === "Done" ? null : 1000
  );

  const handleDelete = (name: string, index: number) => {
    toggleActive({ name: name, active: true });
  };

  const handleSetNames = (names: string[]) => {
    const onDeck = getOnDeck(yState);
    onDeck.delete(0, onDeck.length);
    onDeck.push(names);
  };

  const handleAdd = (name: string) => {
    ydoc.transact(() => {
      if (!yPeople.has(name)) {
        const person = new Y.Map();
        person.set("name", name);
        person.set("active", true);
        yPeople.set(name, person);
      }

      const onDeck = getOnDeck(yState);
      if (!onDeck.toArray().find((n: string) => n === name)) {
        onDeck.push([name]);
      }
    });
  };
  const deletePerson = (person: ReservePerson) => {
    ydoc.transact(() => {
      yPeople.delete(person.name);
      // TODO Refactor onDeck to be hash to allow easier removing, with priority rank
      const onDeck = getOnDeck(yState);
      const index = onDeck.toArray().findIndex((name) => name === person.name);
      if (index !== -1) {
        onDeck.delete(index, 1);
      }
    });
  };

  const handleReset = () => {
    ydoc.transact(() => {
      const done = getDone(yState);
      const allNames = done.toArray();
      done.delete(0, done.length);
      const onDeck = getOnDeck(yState);
      allNames.push(onDeck.toArray());
      onDeck.delete(0, onDeck.length);
      onDeck.push(allNames.filter((i) => i && i.length));
      yState.set("timer", 0);
      yState.delete("inProgress");
      yState.delete("start");
      yPeople.forEach((person: any, name: string) => {
        person.set("time", 0);
      });
    });
  };

  const updateTime = (
    inProgressName: string | null | undefined,
    previousStart: number | null | undefined,
    now: number
  ) => {
    if (previousStart && inProgressName) {
      const inProgress = yPeople.get(inProgressName) as Y.Map<any>;
      inProgress?.set(
        "time",
        Math.round((now - (previousStart as number)) / 1000)
      );
    }
  };

  const handleNext = () => {
    ydoc.transact(() => {
      const now = Date.now();

      if (yState.has("inProgress")) {
        const inProgressName = yState.get("inProgress") as string;
        const previousStart = yState.get("start") as number;
        updateTime(inProgressName, previousStart, now);
        if (typeof inProgressName === "string") {
          const done = getDone(yState);
          done.push([inProgressName]);
        }
      }
      yState.set("start", now);

      const onDeck = getOnDeck(yState);
      if (onDeck.length > 0) {
        const inProgressName = onDeck.get(0);
        yState.set("inProgress", inProgressName);
        const inProgress = yPeople.get(inProgressName) as Y.Map<any>;
        inProgress?.set("time", 0);
        onDeck.delete(0, 1);
      } else {
        yState.delete("inProgress");
      }
    });
  };

  const toggleActive = (person: ReservePerson) => {
    const shouldActivate = !person.active;

    ydoc.transact(() => {
      const yPerson = yPeople.get(person.name) as Y.Map<any>;
      if (yPerson) {
        yPerson.set("active", !yPerson.get("active"));
      }
      if (shouldActivate) {
        getOnDeck(yState).push([person.name]);
      } else {
        const onDeck = getOnDeck(yState);
        const index = onDeck
          .toArray()
          .findIndex((name) => name === person.name);
        if (index !== -1) {
          onDeck.delete(index, 1);
        }
      }
    });
  };

  const onDeckCount = state.onDeck.length;
  const doneCount = state.done.length;
  const inProgressOrDoneCount = doneCount + (state.inProgress ? 1 : 0);
  const totalCount = onDeckCount + inProgressOrDoneCount;

  const timerButton = {
    Ready: <button onClick={handleNext}>Start {onDeckCount}</button>,
    Playing: <button onClick={handleNext}>Next {onDeckCount}</button>,
    Done: <button onClick={handleReset}>Reset</button>,
    Waiting: <>Please enter at least one name.</>,
  };

  var totalTime = timer;
  if (state.done.length > 0) {
    totalTime = totalTime || 0;
    totalTime += state.done.reduce(
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
          {state.inProgress ? timer + `s` : timerState}{" "}
          {state.inProgress && state.inProgress.name}
        </samp>
        <p></p>
        <div>
          {timerButton[timerState]}{" "}
          {onDeckCount > 1 && (
            <button
              onClick={() => {
                const onDeck = getOnDeck(yState);

                handleSetNames(shuffle(onDeck.toArray()));
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
            setNames={handleSetNames}
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
